/**
 * Webinar Funnel emails (YouTube-Live funnels at /w/:slug).
 *
 *  - Confirmation on registration, with an inline-built .ics calendar invite.
 *  - Reminder 1 hour before start (polled every minute, claimed atomically per
 *    registration so multiple app instances never double-send).
 *
 * Transport resolution (getTransport(accountId)), first match wins:
 *   1. the funnel owner's own sender (Settings → Email sending: Gmail app password or SMTP),
 *   2. the platform Gmail pair EMAIL_USER / EMAIL_PASS,
 *   3. the platform SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_SECURE,
 *   4. none → the send is skipped.
 * Every attempt (sent / failed / skipped) is written to webinar_email_sends. Registration
 * itself never fails because of email.
 */
import nodemailer from "nodemailer";
import { pool } from "./storage";
import { formatIST } from "@shared/webinarFunnel";
import type { EmailVia, WebinarEmailSendType } from "@shared/webinarEmailTemplates";
import { getAccountTransport, recordEmailSend, noteAccountSenderResult, describeSmtpError, ensureWebinarEmailSchema } from "./webinarEmailSender";

const GOLD = "#d4b461";

// ── Platform transport (env) ────────────────────────────────────────────────
/** Platform transport config from env: Gmail pair first, then generic SMTP, else null. */
export function platformConfigFromEnv(env: NodeJS.ProcessEnv): { via: EmailVia; options: any } | null {
  if (env.EMAIL_USER && env.EMAIL_PASS) {
    return { via: "platform_gmail", options: { service: "gmail", auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS } } };
  }
  if (env.SMTP_HOST && env.SMTP_USER) {
    return {
      via: "platform_smtp",
      options: {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 587),
        secure: env.SMTP_SECURE === "true",
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      },
    };
  }
  return null;
}

let cachedPlatform: { transport: nodemailer.Transporter; via: EmailVia } | null | undefined;
export function getPlatformTransport(): { transport: nodemailer.Transporter; via: EmailVia } | null {
  if (cachedPlatform !== undefined) return cachedPlatform;
  const cfg = platformConfigFromEnv(process.env);
  cachedPlatform = cfg ? { via: cfg.via, transport: nodemailer.createTransport(cfg.options) } : null;
  return cachedPlatform;
}

const platformFromEmail = () => process.env.EMAIL_USER || process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@oravini.com";
const displayName = (name: string | null | undefined) => (name || "Oravini").replace(/["<>\r\n]/g, "").trim() || "Oravini";

/** Platform From header (kept for callers that don't resolve per account). */
export function fromAddress(hostName: string | null) {
  return `"${displayName(hostName)}" <${platformFromEmail()}>`;
}

export type ResolvedTransport = {
  transport: nodemailer.Transporter;
  via: EmailVia;
  /** Address mail is sent from (the account's own address when via === "account"). */
  fromEmail: string;
  /** Builds the From header; the account's configured from-name wins over the funnel host name. */
  from: (hostName: string | null) => string;
};

/**
 * Resolves the transport for an account: its own sender first, then platform Gmail, then
 * platform SMTP, else null (skip). Account transports are cached per account (5-min TTL,
 * invalidated on save/delete).
 */
export async function getTransport(accountId: string | null | undefined): Promise<ResolvedTransport | null> {
  if (accountId) {
    const acct = await getAccountTransport(accountId);
    if (acct) {
      const { sender } = acct;
      return {
        transport: acct.transport,
        via: "account",
        fromEmail: sender.fromEmail,
        from: (hostName) => `"${displayName(sender.fromName || hostName)}" <${sender.fromEmail}>`,
      };
    }
  }
  const platform = getPlatformTransport();
  if (!platform) return null;
  return { transport: platform.transport, via: platform.via, fromEmail: platformFromEmail(), from: fromAddress };
}

/** Whether a platform (env) transport exists — accounts without their own sender rely on it. */
export const hasPlatformTransport = () => !!getPlatformTransport();

export type WebinarMail = {
  accountId: string;
  webinarId: string | null;
  registrationId: string | null;
  type: WebinarEmailSendType;
  to: string;
  subject: string;
  hostName: string | null;
  html: string;
  text: string;
  attachments?: nodemailer.SendMailOptions["attachments"];
  /** Pre-resolved transport (used when a builder needs fromEmail before sending). */
  resolved?: ResolvedTransport | null;
};

export type SendOutcome = { status: "sent" | "failed" | "skipped"; via: EmailVia; error?: string };

/**
 * Sends one webinar email through the resolved transport and records the attempt.
 * Never throws.
 */
export async function sendWebinarMail(m: WebinarMail): Promise<SendOutcome> {
  let resolved: ResolvedTransport | null;
  try {
    resolved = m.resolved !== undefined ? m.resolved : await getTransport(m.accountId);
  } catch (e: any) {
    resolved = null;
    console.error("[webinar-email] transport resolution failed:", e?.message);
  }
  const base = { userId: m.accountId, webinarId: m.webinarId, registrationId: m.registrationId, type: m.type, toEmail: m.to, subject: m.subject };
  if (!resolved) {
    const error = "No email sender connected (Settings → Email sending) and no platform sender configured";
    console.log(`[webinar-email] no mail transport — skipped ${m.type} to ${m.to}`);
    await recordEmailSend({ ...base, status: "skipped", via: "none", error });
    return { status: "skipped", via: "none", error };
  }
  try {
    await resolved.transport.sendMail({
      from: resolved.from(m.hostName),
      to: m.to,
      subject: m.subject,
      html: m.html,
      text: m.text,
      attachments: m.attachments,
    });
    await recordEmailSend({ ...base, status: "sent", via: resolved.via });
    if (resolved.via === "account") void noteAccountSenderResult(m.accountId, null);
    return { status: "sent", via: resolved.via };
  } catch (e: any) {
    const error = describeSmtpError(e);
    console.error(`[webinar-email] ${m.type} failed (${resolved.via}):`, e?.message);
    await recordEmailSend({ ...base, status: "failed", via: resolved.via, error });
    if (resolved.via === "account") void noteAccountSenderResult(m.accountId, error);
    return { status: "failed", via: resolved.via, error };
  }
}

export function appBaseUrl() {
  return (process.env.APP_URL || process.env.SITE_URL || process.env.PUBLIC_URL || "https://oravini.com").replace(/\/$/, "");
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// ── .ics (RFC 5545) built inline ────────────────────────────────────────────
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
function foldLine(line: string) {
  // RFC 5545: lines > 75 octets are folded with CRLF + single space.
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildWebinarIcs(w: { id: string; title: string; description: string | null; hostName: string | null; scheduledAt: Date; durationMinutes: number | null }, liveUrl: string, organizerEmail?: string) {
  const start = new Date(w.scheduledAt);
  const end = new Date(start.getTime() + (w.durationMinutes || 60) * 60_000);
  const desc = `Join here: ${liveUrl}${w.description ? `\n\n${w.description.slice(0, 800)}` : ""}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Oravini//Webinar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:webinar-${w.id}@oravini.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(w.title)}`,
    `DESCRIPTION:${icsText(desc)}`,
    `LOCATION:${icsText(liveUrl)}`,
    `URL:${liveUrl}`,
    ...(w.hostName ? [`ORGANIZER;CN=${icsText(w.hostName)}:mailto:${organizerEmail || platformFromEmail()}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Webinar starts in 15 minutes",
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

function shell(inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#0a0910;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e4e4e7">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0910;padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111015;border:1px solid rgba(212,180,97,0.25);border-radius:16px;padding:32px">
<tr><td>${inner}</td></tr></table>
<p style="color:#52525b;font-size:11px;margin-top:18px">Sent via Oravini</p>
</td></tr></table></body></html>`;
}

type FunnelRow = {
  id: string; user_id: string; slug: string; title: string; description: string | null; host_name: string | null;
  scheduled_at: Date; duration_minutes: number | null;
};

function liveLink(slug: string, registrationId?: string) {
  return `${appBaseUrl()}/w/${slug}/live${registrationId ? `?r=${encodeURIComponent(registrationId)}` : ""}`;
}

export async function sendWebinarConfirmation(
  w: { id: string; userId: string; slug: string; title: string; description: string | null; hostName: string | null; scheduledAt: Date; durationMinutes: number | null },
  reg: { id: string; name: string; email: string },
): Promise<boolean> {
  const link = liveLink(w.slug, reg.id);
  const when = formatIST(w.scheduledAt);
  const subject = `You're in: ${w.title} — ${when}`;
  const html = shell(`
    <p style="color:${GOLD};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px">You're registered</p>
    <h1 style="color:#fff;font-size:22px;line-height:1.3;margin:0 0 14px">${esc(w.title)}</h1>
    <p style="margin:0 0 6px;color:#a1a1aa;font-size:14px">Hi ${esc(reg.name.split(" ")[0] || "there")}, your spot is saved.</p>
    <p style="margin:0 0 22px;color:#fff;font-size:15px"><b>${esc(when)}</b>${w.hostName ? ` · with ${esc(w.hostName)}` : ""}</p>
    <a href="${link}" style="display:inline-block;background:${GOLD};color:#0a0910;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:12px;font-size:15px">Open the live room</a>
    <p style="margin:22px 0 0;color:#71717a;font-size:12px;line-height:1.6">The calendar invite is attached. The room opens on this link at start time — live chat, Q&amp;A and slides are all on the same page. We'll also remind you an hour before.</p>`);
  const resolved = await getTransport(w.userId).catch(() => null);
  const out = await sendWebinarMail({
    accountId: w.userId, webinarId: w.id, registrationId: reg.id, type: "confirmation",
    to: reg.email, subject, hostName: w.hostName, html,
    text: `You're registered for ${w.title}\n${when}\n\nJoin here: ${link}`,
    attachments: [{ filename: "webinar.ics", content: buildWebinarIcs(w, link, resolved?.fromEmail), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }],
    resolved,
  });
  return out.status === "sent";
}

async function sendReminder(w: FunnelRow, reg: { id: string; name: string; email: string }) {
  const link = liveLink(w.slug, reg.id);
  const html = shell(`
    <p style="color:#f87171;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px">Starting in 1 hour</p>
    <h1 style="color:#fff;font-size:22px;line-height:1.3;margin:0 0 14px">${esc(w.title)}</h1>
    <p style="margin:0 0 22px;color:#a1a1aa;font-size:14px">Hi ${esc(reg.name.split(" ")[0] || "there")} — we go live at <b style="color:#fff">${esc(formatIST(w.scheduled_at))}</b>. Bring your questions; there's live Q&amp;A in the room.</p>
    <a href="${link}" style="display:inline-block;background:${GOLD};color:#0a0910;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:12px;font-size:15px">Join the live room</a>`);
  const out = await sendWebinarMail({
    accountId: w.user_id, webinarId: w.id, registrationId: reg.id, type: "reminder",
    to: reg.email, subject: `Starting in 1 hour: ${w.title}`, hostName: w.host_name, html,
    text: `${w.title} starts in 1 hour (${formatIST(w.scheduled_at)}).\nJoin here: ${link}`,
  });
  return out.status === "sent";
}

/**
 * Claims and sends due 1-hour reminders. A registration is due when its published,
 * reminders-enabled webinar starts within the next 60 minutes, it hasn't been
 * reminded yet, and it registered at least 10 minutes before the reminder window
 * opened (very late sign-ups already got a fresh confirmation).
 *
 * Only funnels that can actually send are claimed: every funnel when a platform
 * sender exists, otherwise only funnels whose owner connected their own sender —
 * so reminders still go out once an account connects email before the window ends.
 */
export async function runWebinarFunnelReminders(): Promise<number> {
  await ensureWebinarEmailSchema();
  const { rows } = await pool.query(`
    UPDATE webinar_funnel_registrations r
       SET reminder_1h_sent_at = NOW()
      FROM webinar_funnels f
     WHERE r.webinar_id = f.id
       AND r.reminder_1h_sent_at IS NULL
       AND f.status = 'published'
       AND f.reminders_enabled = TRUE
       AND f.scheduled_at > NOW()
       AND f.scheduled_at <= NOW() + INTERVAL '60 minutes'
       AND r.created_at < f.scheduled_at - INTERVAL '70 minutes'
       AND ($1::boolean OR EXISTS (SELECT 1 FROM user_email_senders s WHERE s.user_id = f.user_id))
    RETURNING r.id, r.name, r.email, f.id AS f_id, f.user_id, f.slug, f.title, f.description, f.host_name, f.scheduled_at, f.duration_minutes
  `, [hasPlatformTransport()]);
  let sent = 0;
  for (const row of rows) {
    const ok = await sendReminder(
      { id: row.f_id, user_id: row.user_id, slug: row.slug, title: row.title, description: row.description, host_name: row.host_name, scheduled_at: row.scheduled_at, duration_minutes: row.duration_minutes },
      { id: row.id, name: row.name, email: row.email },
    );
    if (ok) sent++;
  }
  if (rows.length) console.log(`[webinar-email] 1h reminders: ${sent}/${rows.length} sent`);
  return sent;
}

let started = false;
export function startWebinarFunnelReminderJob() {
  if (started) return;
  started = true;
  const tick = () => runWebinarFunnelReminders().catch(e => console.error("[webinar-email] reminder job error:", e.message));
  setTimeout(tick, 15_000);
  setInterval(tick, 60_000);
}
