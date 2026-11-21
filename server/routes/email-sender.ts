/**
 * Webinar Funnel email sending — per-account settings, test send, send logs and
 * per-funnel follow-up templates. Every route is scoped to the signed-in account
 * (req.user.id): an account can only see or change its own sender, logs and funnels.
 *
 *   GET    /api/settings/email-sender          sender (no secrets) + platform/encryption status + 24h usage
 *   PUT    /api/settings/email-sender          connect / update (credentials verified against the server first)
 *   DELETE /api/settings/email-sender          disconnect (falls back to the platform sender)
 *   POST   /api/settings/email-sender/test     send a test email to the account's own email
 *   GET    /api/settings/email-sender/log      latest sends across the account's funnels + 24h summary
 *
 *   GET    /api/webinar-funnels/:id/email-log        latest 100 sends for one funnel
 *   GET    /api/webinar-funnels/:id/email-templates  defaults, overrides, variables
 *   PUT    /api/webinar-funnels/:id/email-templates  set / clear overrides
 */
import type { Express, Request, Response } from "express";
import type nodemailer from "nodemailer";
import { z } from "zod";
import { pool } from "../storage";
import {
  senderInputSchema, mergeSenderInput, saveAccountSender, deleteAccountSender, loadAccountSender,
  publicSenderView, buildSenderTransport, describeSmtpError, canEncryptSecrets, ensureWebinarEmailSchema,
  SenderValidationError, recordEmailSend, type PlainSender,
} from "../webinarEmailSender";
import { getTransport, hasPlatformTransport } from "../webinarFunnelEmail";
import {
  FOLLOWUP_TEMPLATE_KEYS, FOLLOWUP_TEMPLATE_VARIABLES, WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES, GMAIL_DAILY_CAP,
  TEMPLATE_BODY_MAX, TEMPLATE_SUBJECT_MAX, sanitizeTemplateOverrides,
} from "@shared/webinarEmailTemplates";

type RequireAuth = (req: Request, res: Response, next: Function) => any;

export type EmailSenderRouteDeps = {
  /** Builds the transport used to verify credentials on save (overridable in tests). */
  buildTransport?: (s: PlainSender) => Promise<Pick<nodemailer.Transporter, "verify">>;
};

const p = (v: unknown) => String(Array.isArray(v) ? v[0] : v ?? "");
const uid = (req: Request) => String((req.user as any).id);

/** Small in-memory limiter so connect/test can't be used to hammer or probe mail servers. */
function makeLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
    if (recent.length >= max) { hits.set(key, recent); return false; }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

const templateOverrideSchema = z.object({
  subject: z.string().trim().min(1, "Subject can't be empty").max(TEMPLATE_SUBJECT_MAX),
  bodyHtml: z.string().trim().min(1, "Body can't be empty").max(TEMPLATE_BODY_MAX),
});
export const templatesPutSchema = z.object({
  // null (or omitted key) = use the default for that segment
  templates: z.object(Object.fromEntries(FOLLOWUP_TEMPLATE_KEYS.map(k => [k, templateOverrideSchema.nullable().optional()])) as Record<typeof FOLLOWUP_TEMPLATE_KEYS[number], z.ZodOptional<z.ZodNullable<typeof templateOverrideSchema>>>),
});

const sendColumns = `id, webinar_id AS "webinarId", registration_id AS "registrationId", type, to_email AS "toEmail",
  subject, status, via, error, created_at AS "createdAt"`;

export function registerEmailSenderRoutes(app: Express, requireAuth: RequireAuth, deps: EmailSenderRouteDeps = {}) {
  const buildTransport = deps.buildTransport ?? ((s: PlainSender) => buildSenderTransport(s));
  const connectLimit = makeLimiter(10, 10 * 60_000);
  const testLimit = makeLimiter(5, 10 * 60_000);

  const ownsFunnel = async (funnelId: string, userId: string) => {
    const { rows } = await pool.query(`SELECT id, email_templates FROM webinar_funnels WHERE id = $1 AND user_id = $2`, [funnelId, userId]);
    return rows[0] as { id: string; email_templates: unknown } | undefined;
  };

  app.get("/api/settings/email-sender", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const row = await loadAccountSender(userId);
      const { rows } = await pool.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
                COUNT(*) FILTER (WHERE status = 'sent' AND via = 'account')::int AS "sentViaAccount",
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped
           FROM webinar_email_sends WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`, [userId]);
      const platformAvailable = hasPlatformTransport();
      res.json({
        ...publicSenderView(row),
        platformAvailable,
        encryptionReady: canEncryptSecrets(),
        activeVia: row ? "account" : platformAvailable ? "platform" : "none",
        usage24h: rows[0] ?? { sent: 0, sentViaAccount: 0, failed: 0, skipped: 0 },
        gmailDailyCap: GMAIL_DAILY_CAP,
      });
    } catch (e: any) {
      console.error("[email-sender] get error:", e.message);
      res.status(500).json({ message: "Failed to load email settings" });
    }
  });

  app.put("/api/settings/email-sender", requireAuth, async (req: Request, res: Response) => {
    const userId = uid(req);
    const parsed = senderInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
    if (!canEncryptSecrets()) {
      return res.status(503).json({ message: "Email sending isn't available yet: the server's encryption key isn't configured" });
    }
    if (!connectLimit(userId)) return res.status(429).json({ message: "Too many attempts — wait a few minutes and try again" });
    try {
      const existing = await loadAccountSender(userId);
      const sender = mergeSenderInput(parsed.data, existing);
      // Verify the credentials against the real server before saving anything.
      let transport: Pick<nodemailer.Transporter, "verify"> & { close?: () => void };
      try {
        transport = await buildTransport(sender);
      } catch (e: any) {
        if (e instanceof SenderValidationError) return res.status(400).json({ message: e.message });
        throw e;
      }
      try {
        await transport.verify();
      } catch (e: any) {
        return res.status(400).json({ message: describeSmtpError(e) });
      } finally {
        transport.close?.();
      }
      const row = await saveAccountSender(userId, sender);
      res.json({ ...publicSenderView(row), platformAvailable: hasPlatformTransport(), encryptionReady: true, activeVia: "account" });
    } catch (e: any) {
      if (e instanceof SenderValidationError) return res.status(400).json({ message: e.message });
      console.error("[email-sender] save error:", e.message);
      res.status(500).json({ message: "Failed to save email settings" });
    }
  });

  app.delete("/api/settings/email-sender", requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteAccountSender(uid(req));
      res.json({ success: true, platformAvailable: hasPlatformTransport() });
    } catch (e: any) {
      console.error("[email-sender] delete error:", e.message);
      res.status(500).json({ message: "Failed to disconnect" });
    }
  });

  app.post("/api/settings/email-sender/test", requireAuth, async (req: Request, res: Response) => {
    const userId = uid(req);
    const to = String((req.user as any).email || "").trim();
    if (!to) return res.status(400).json({ message: "Your account has no email address to send the test to" });
    if (!testLimit(userId)) return res.status(429).json({ message: "Too many test sends — wait a few minutes and try again" });
    const subject = "Oravini test email — your webinar emails are set up";
    let resolved;
    try {
      resolved = await getTransport(userId);
    } catch (e: any) {
      resolved = null;
    }
    if (!resolved) {
      const error = "No email sender is connected and no platform sender is configured";
      await recordEmailSend({ userId, webinarId: null, registrationId: null, type: "test", toEmail: to, subject, status: "skipped", via: "none", error });
      return res.status(400).json({ ok: false, via: "none", to, message: error });
    }
    try {
      await resolved.transport.sendMail({
        from: resolved.from(null),
        to,
        subject,
        text: `This is a test from Oravini.\n\nWebinar confirmations, 1-hour reminders and follow-ups will be sent from ${resolved.fromEmail}.`,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px">
          <p style="color:#d4b461;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px">Test email</p>
          <h1 style="font-size:20px;margin:0 0 12px">Your webinar emails are set up ✅</h1>
          <p style="color:#52525b;font-size:14px;line-height:1.6">Webinar confirmations, 1-hour reminders and follow-ups will be sent from <b>${resolved.fromEmail.replace(/[<>&"]/g, "")}</b>.</p>
        </div>`,
      });
      await recordEmailSend({ userId, webinarId: null, registrationId: null, type: "test", toEmail: to, subject, status: "sent", via: resolved.via });
      res.json({ ok: true, via: resolved.via, to, from: resolved.fromEmail });
    } catch (e: any) {
      const error = describeSmtpError(e);
      await recordEmailSend({ userId, webinarId: null, registrationId: null, type: "test", toEmail: to, subject, status: "failed", via: resolved.via, error });
      res.status(502).json({ ok: false, via: resolved.via, to, message: error });
    }
  });

  app.get("/api/settings/email-sender/log", requireAuth, async (req: Request, res: Response) => {
    try {
      await ensureWebinarEmailSchema();
      const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
      const { rows } = await pool.query(
        `SELECT s.id, s.webinar_id AS "webinarId", s.registration_id AS "registrationId", s.type, s.to_email AS "toEmail",
                s.subject, s.status, s.via, s.error, s.created_at AS "createdAt", f.title AS "webinarTitle"
           FROM webinar_email_sends s LEFT JOIN webinar_funnels f ON f.id = s.webinar_id
          WHERE s.user_id = $1 ORDER BY s.created_at DESC, s.id DESC LIMIT $2`, [uid(req), limit]);
      res.json(rows);
    } catch (e: any) {
      console.error("[email-sender] log error:", e.message);
      res.status(500).json({ message: "Failed to load email log" });
    }
  });

  app.get("/api/webinar-funnels/:id/email-log", requireAuth, async (req: Request, res: Response) => {
    try {
      await ensureWebinarEmailSchema();
      const userId = uid(req);
      const funnel = await ownsFunnel(p(req.params.id), userId);
      if (!funnel) return res.status(404).json({ message: "Not found" });
      const { rows } = await pool.query(
        `SELECT ${sendColumns} FROM webinar_email_sends
          WHERE webinar_id = $1 AND user_id = $2 ORDER BY created_at DESC, id DESC LIMIT 100`, [funnel.id, userId]);
      res.json(rows);
    } catch (e: any) {
      console.error("[email-sender] funnel log error:", e.message);
      res.status(500).json({ message: "Failed to load email log" });
    }
  });

  app.get("/api/webinar-funnels/:id/email-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      await ensureWebinarEmailSchema();
      const funnel = await ownsFunnel(p(req.params.id), uid(req));
      if (!funnel) return res.status(404).json({ message: "Not found" });
      res.json({
        defaults: WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES,
        overrides: sanitizeTemplateOverrides(funnel.email_templates),
        variables: FOLLOWUP_TEMPLATE_VARIABLES,
      });
    } catch (e: any) {
      console.error("[email-sender] templates get error:", e.message);
      res.status(500).json({ message: "Failed to load templates" });
    }
  });

  app.put("/api/webinar-funnels/:id/email-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = templatesPutSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      await ensureWebinarEmailSchema();
      const userId = uid(req);
      const funnel = await ownsFunnel(p(req.params.id), userId);
      if (!funnel) return res.status(404).json({ message: "Not found" });
      const next = { ...sanitizeTemplateOverrides(funnel.email_templates) } as Record<string, { subject: string; bodyHtml: string }>;
      for (const key of FOLLOWUP_TEMPLATE_KEYS) {
        if (!(key in parsed.data.templates)) continue;
        const t = parsed.data.templates[key];
        const def = WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES[key];
        // Saving the default verbatim (or null) stores no override, so future default improvements apply.
        if (!t || (t.subject === def.subject.trim() && t.bodyHtml === def.bodyHtml.trim())) delete next[key];
        else next[key] = t;
      }
      const value = Object.keys(next).length ? JSON.stringify(next) : null;
      await pool.query(`UPDATE webinar_funnels SET email_templates = $1::jsonb WHERE id = $2 AND user_id = $3`, [value, funnel.id, userId]);
      res.json({ defaults: WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES, overrides: sanitizeTemplateOverrides(next), variables: FOLLOWUP_TEMPLATE_VARIABLES });
    } catch (e: any) {
      console.error("[email-sender] templates put error:", e.message);
      res.status(500).json({ message: "Failed to save templates" });
    }
  });
}
