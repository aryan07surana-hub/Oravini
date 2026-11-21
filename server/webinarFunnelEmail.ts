/**
 * Webinar Funnel emails (YouTube-Live funnels at /w/:slug).
 *
 *  - Confirmation on registration, with an inline-built .ics calendar invite.
 *  - Reminder 1 hour before start (polled every minute, claimed atomically per
 *    registration so multiple app instances never double-send).
 *
 * Transport: the same Gmail EMAIL_USER / EMAIL_PASS pair the funnel automations
 * (`fireFunnelAutomation` in routes.ts) use; falls back to SMTP_HOST/SMTP_USER/
 * SMTP_PASS (as the LiveKit webinar scheduler does). With neither configured,
 * sends are skipped and logged — registration itself never fails because of email.
 *
 * WhatsApp (BYOK): after each successful email, if the funnel owner has connected and
 * enabled their own WhatsApp Cloud API credentials and the registrant gave a phone, the
 * same moment also goes out as a WhatsApp template message. It rides the email's claim
 * (reminder_1h_sent_at / one confirmation per new registration), so it is sent at most
 * once per registrant per funnel per message type. WhatsApp failures never affect email.
 */
import nodemailer from "nodemailer";
import { pool } from "./storage";
import { formatIST } from "@shared/webinarFunnel";
import { sendWebinarWhatsApp } from "./routes/webinar-whatsapp";

const GOLD = "#d4b461";

let cachedTransport: nodemailer.Transporter | null | undefined;
function getTransport(): nodemailer.Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport;
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    cachedTransport = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
  } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    cachedTransport = null;
  }
  return cachedTransport;
}

function fromAddress(hostName: string | null) {
  const addr = process.env.EMAIL_USER || process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@oravini.com";
  const display = (hostName || "Oravini").replace(/["<>]/g, "");
  return `"${display}" <${addr}>`;
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

export function buildWebinarIcs(w: { id: string; title: string; description: string | null; hostName: string | null; scheduledAt: Date; durationMinutes: number | null }, liveUrl: string) {
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
    ...(w.hostName ? [`ORGANIZER;CN=${icsText(w.hostName)}:mailto:${process.env.EMAIL_USER || "no-reply@oravini.com"}`] : []),
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
  id: string; user_id: string | null; slug: string; title: string; description: string | null; host_name: string | null;
  scheduled_at: Date; duration_minutes: number | null;
};

function liveLink(slug: string, registrationId?: string) {
  return `${appBaseUrl()}/w/${slug}/live${registrationId ? `?r=${encodeURIComponent(registrationId)}` : ""}`;
}

export async function sendWebinarConfirmation(
  w: { id: string; userId?: string | null; slug: string; title: string; description: string | null; hostName: string | null; scheduledAt: Date; durationMinutes: number | null },
  reg: { id: string; name: string; email: string; phone?: string | null },
): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    console.log(`[webinar-email] no mail transport configured — skipped confirmation to ${reg.email}`);
    return false;
  }
  const link = liveLink(w.slug, reg.id);
  const when = formatIST(w.scheduledAt);
  const html = shell(`
    <p style="color:${GOLD};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px">You're registered</p>
    <h1 style="color:#fff;font-size:22px;line-height:1.3;margin:0 0 14px">${esc(w.title)}</h1>
    <p style="margin:0 0 6px;color:#a1a1aa;font-size:14px">Hi ${esc(reg.name.split(" ")[0] || "there")}, your spot is saved.</p>
    <p style="margin:0 0 22px;color:#fff;font-size:15px"><b>${esc(when)}</b>${w.hostName ? ` · with ${esc(w.hostName)}` : ""}</p>
    <a href="${link}" style="display:inline-block;background:${GOLD};color:#0a0910;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:12px;font-size:15px">Open the live room</a>
    <p style="margin:22px 0 0;color:#71717a;font-size:12px;line-height:1.6">The calendar invite is attached. The room opens on this link at start time — live chat, Q&amp;A and slides are all on the same page. We'll also remind you an hour before.</p>`);
  try {
    await transport.sendMail({
      from: fromAddress(w.hostName),
      to: reg.email,
      subject: `You're in: ${w.title} — ${when}`,
      html,
      text: `You're registered for ${w.title}\n${when}\n\nJoin here: ${link}`,
      attachments: [{ filename: "webinar.ics", content: buildWebinarIcs(w, link), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }],
    });
    if (reg.phone) void sendWebinarWhatsApp(w.userId, reg.phone, "confirmation");
    return true;
  } catch (e: any) {
    console.error("[webinar-email] confirmation failed:", e.message);
    return false;
  }
}

async function sendReminder(w: FunnelRow, reg: { id: string; name: string; email: string; phone: string | null }) {
  const transport = getTransport();
  if (!transport) return false;
  const link = liveLink(w.slug, reg.id);
  const html = shell(`
    <p style="color:#f87171;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px">Starting in 1 hour</p>
    <h1 style="color:#fff;font-size:22px;line-height:1.3;margin:0 0 14px">${esc(w.title)}</h1>
    <p style="margin:0 0 22px;color:#a1a1aa;font-size:14px">Hi ${esc(reg.name.split(" ")[0] || "there")} — we go live at <b style="color:#fff">${esc(formatIST(w.scheduled_at))}</b>. Bring your questions; there's live Q&amp;A in the room.</p>
    <a href="${link}" style="display:inline-block;background:${GOLD};color:#0a0910;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:12px;font-size:15px">Join the live room</a>`);
  try {
    await transport.sendMail({
      from: fromAddress(w.host_name),
      to: reg.email,
      subject: `Starting in 1 hour: ${w.title}`,
      html,
      text: `${w.title} starts in 1 hour (${formatIST(w.scheduled_at)}).\nJoin here: ${link}`,
    });
    // Awaited (never throws) so a large reminder batch is paced instead of fanning out at once.
    if (reg.phone) await sendWebinarWhatsApp(w.user_id, reg.phone, "reminder_1h");
    return true;
  } catch (e: any) {
    console.error("[webinar-email] reminder failed:", e.message);
    return false;
  }
}

/**
 * Claims and sends due 1-hour reminders. A registration is due when its published,
 * reminders-enabled webinar starts within the next 60 minutes, it hasn't been
 * reminded yet, and it registered at least 10 minutes before the reminder window
 * opened (very late sign-ups already got a fresh confirmation).
 */
export async function runWebinarFunnelReminders(): Promise<number> {
  if (!getTransport()) return 0;
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
    RETURNING r.id, r.name, r.email, r.phone, f.id AS f_id, f.user_id, f.slug, f.title, f.description, f.host_name, f.scheduled_at, f.duration_minutes
  `);
  let sent = 0;
  for (const row of rows) {
    const ok = await sendReminder(
      { id: row.f_id, user_id: row.user_id, slug: row.slug, title: row.title, description: row.description, host_name: row.host_name, scheduled_at: row.scheduled_at, duration_minutes: row.duration_minutes },
      { id: row.id, name: row.name, email: row.email, phone: row.phone },
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
