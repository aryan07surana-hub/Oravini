/**
 * Bring-your-own-key WhatsApp reminders for Webinar Funnels.
 *
 * Each account stores its OWN WhatsApp Business Cloud API credentials (phone number ID +
 * access token). The token is encrypted at rest with server/security/tokenEncryption and is
 * never returned by any endpoint or written to logs. Works with Meta's free test number.
 *
 *   GET  /api/settings/whatsapp        { configured, enabled, displayNumber, phoneNumberId, templateName, tokenLast4? }
 *   PUT  /api/settings/whatsapp        { phoneNumberId, accessToken?, displayNumber?, templateName?, enabled }
 *   POST /api/settings/whatsapp/test   send one template message to the owner's own users.phone
 *
 * `sendWebinarWhatsApp(ownerUserId, phone)` is the best-effort hook used by
 * server/webinarFunnelEmail.ts after a successful confirmation / reminder email.
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../storage";
import { encryptToken, decryptToken } from "../security/tokenEncryption";

type RequireAuth = (req: Request, res: Response, next: Function) => any;

const GRAPH_URL = "https://graph.facebook.com/v21.0";
const DEFAULT_TEMPLATE = "hello_world";

// ── Schema bootstrap (raw SQL, no drizzle schema changes) ───────────────────
let schemaReady: Promise<void> | null = null;
export function ensureWhatsappSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS user_whatsapp_settings (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        phone_number_id TEXT,
        access_token_encrypted TEXT,
        display_number TEXT,
        template_name TEXT NOT NULL DEFAULT 'hello_world',
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `).then(() => undefined).catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

type SettingsRow = {
  phone_number_id: string | null;
  access_token_encrypted: string | null;
  display_number: string | null;
  template_name: string | null;
  enabled: boolean;
};

async function loadSettings(userId: string): Promise<SettingsRow | null> {
  await ensureWhatsappSchema();
  const { rows } = await pool.query(
    `SELECT phone_number_id, access_token_encrypted, display_number, template_name, enabled
       FROM user_whatsapp_settings WHERE user_id = $1`, [String(userId)],
  );
  return rows[0] ?? null;
}

const isConfigured = (s: SettingsRow | null): s is SettingsRow =>
  !!(s && s.phone_number_id && s.access_token_encrypted);

/**
 * Normalize to E.164 digits (no "+"), defaulting to India (+91) for bare 10-digit numbers.
 * Returns null when the input can't be a valid international number.
 */
export function normalizeWhatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  else if (!trimmed.startsWith("+")) {
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1); // 0XXXXXXXXXX (Indian trunk prefix)
    if (digits.length === 10) digits = "91" + digits;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

type SendResult = { ok: boolean; status: number; error?: string; messageId?: string };

/** One template message via the Meta Cloud API. Never logs or returns the token. */
async function sendTemplate(phoneNumberId: string, token: string, to: string, templateName: string): Promise<SendResult> {
  try {
    const resp = await fetch(`${GRAPH_URL}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: templateName, language: { code: "en_US" } },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { ok: false, status: resp.status, error: data?.error?.message || `WhatsApp API returned HTTP ${resp.status}` };
    }
    return { ok: true, status: resp.status, messageId: data?.messages?.[0]?.id };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.name === "TimeoutError" ? "WhatsApp API timed out" : (e?.message || "Network error") };
  }
}

/**
 * Best-effort webinar WhatsApp send for a funnel owner's registrant.
 * Silently no-ops when the owner hasn't configured/enabled WhatsApp or the phone is missing;
 * failures are logged (without the token) and never thrown.
 */
export async function sendWebinarWhatsApp(ownerUserId: string | null | undefined, phone: string | null | undefined, kind: string): Promise<boolean> {
  try {
    if (!ownerUserId || !phone) return false;
    const to = normalizeWhatsappNumber(phone);
    if (!to) return false;
    const s = await loadSettings(ownerUserId);
    if (!isConfigured(s) || !s.enabled) return false;
    const r = await sendTemplate(s.phone_number_id!, decryptToken(s.access_token_encrypted!), to, s.template_name || DEFAULT_TEMPLATE);
    if (!r.ok) console.error(`[webinar-whatsapp] ${kind} failed (owner ${ownerUserId}, HTTP ${r.status}): ${r.error}`);
    return r.ok;
  } catch (e: any) {
    console.error(`[webinar-whatsapp] ${kind} error:`, e?.message);
    return false;
  }
}

const putBody = z.object({
  phoneNumberId: z.string().trim().regex(/^\d{5,32}$/, "Phone number ID should be the numeric ID from Meta (not the phone number itself)"),
  accessToken: z.string().trim().max(4096).optional().nullable(),
  displayNumber: z.string().trim().max(32).optional().nullable(),
  templateName: z.string().trim().max(512).regex(/^[a-z0-9_]*$/, "Template names use lowercase letters, digits and underscores").optional().nullable(),
  enabled: z.boolean(),
});

export function registerWebinarWhatsappRoutes(app: Express, requireAuth: RequireAuth) {
  ensureWhatsappSchema().catch((e) => console.error("[webinar-whatsapp] schema bootstrap failed:", e.message));

  const view = (s: SettingsRow | null) => {
    let tokenLast4: string | undefined;
    if (s?.access_token_encrypted) {
      try { tokenLast4 = decryptToken(s.access_token_encrypted).slice(-4); } catch { /* unreadable token → no hint */ }
    }
    return {
      configured: isConfigured(s),
      enabled: !!s?.enabled,
      displayNumber: s?.display_number ?? null,
      phoneNumberId: s?.phone_number_id ?? null,
      templateName: s?.template_name || DEFAULT_TEMPLATE,
      ...(tokenLast4 ? { tokenLast4 } : {}),
    };
  };

  app.get("/api/settings/whatsapp", requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(view(await loadSettings((req.user as any).id)));
    } catch (e: any) {
      console.error("[webinar-whatsapp] get error:", e.message);
      res.status(500).json({ message: "Couldn't load WhatsApp settings" });
    }
  });

  app.put("/api/settings/whatsapp", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = String((req.user as any).id);
      const parsed = putBody.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid input" });
      const { phoneNumberId, accessToken, displayNumber, templateName, enabled } = parsed.data;
      const existing = await loadSettings(userId);
      const encrypted = accessToken ? encryptToken(accessToken) : existing?.access_token_encrypted ?? null;
      if (!encrypted) return res.status(400).json({ message: "Access token is required" });
      await pool.query(
        `INSERT INTO user_whatsapp_settings (user_id, phone_number_id, access_token_encrypted, display_number, template_name, enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           phone_number_id = EXCLUDED.phone_number_id,
           access_token_encrypted = EXCLUDED.access_token_encrypted,
           display_number = EXCLUDED.display_number,
           template_name = EXCLUDED.template_name,
           enabled = EXCLUDED.enabled,
           updated_at = NOW()`,
        [userId, phoneNumberId, encrypted, displayNumber || null, templateName || DEFAULT_TEMPLATE, enabled],
      );
      res.json(view(await loadSettings(userId)));
    } catch (e: any) {
      console.error("[webinar-whatsapp] save error:", e.message);
      res.status(500).json({ message: "Couldn't save WhatsApp settings" });
    }
  });

  app.post("/api/settings/whatsapp/test", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = String((req.user as any).id);
      const s = await loadSettings(userId);
      if (!isConfigured(s)) return res.status(400).json({ message: "Save your phone number ID and access token first" });
      const { rows } = await pool.query(`SELECT phone FROM users WHERE id = $1`, [userId]);
      const to = normalizeWhatsappNumber(rows[0]?.phone);
      if (!to) return res.status(400).json({ message: "Add a phone number to your account first — the test message goes to your own phone" });
      const r = await sendTemplate(s.phone_number_id!, decryptToken(s.access_token_encrypted!), to, s.template_name || DEFAULT_TEMPLATE);
      if (!r.ok) {
        console.error(`[webinar-whatsapp] test send failed (user ${userId}, HTTP ${r.status}): ${r.error}`);
        // Meta 4xx (bad token / phone ID / template) → 400 so the client doesn't treat a Meta 401 as a session logout.
        return res.status(r.status >= 400 && r.status < 500 ? 400 : 502).json({ message: r.error, metaStatus: r.status });
      }
      res.json({ success: true, metaStatus: r.status, to: `+${to.slice(0, -4).replace(/\d/g, "•")}${to.slice(-4)}`, messageId: r.messageId });
    } catch (e: any) {
      console.error("[webinar-whatsapp] test error:", e.message);
      res.status(500).json({ message: "Couldn't send the test message" });
    }
  });
}
