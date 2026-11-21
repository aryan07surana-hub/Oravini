/**
 * Bring-your-own-key WhatsApp reminders for Webinar Funnels — Express + Postgres wiring.
 * All rules (fail-closed encryption, owner isolation, opt-in, cost acknowledgement) live in
 * server/whatsappByok.ts.
 *
 *   GET  /api/settings/whatsapp        { configured, enabled, costAcknowledged, displayNumber, phoneNumberId,
 *                                        templateName, isTestTemplate, encryptionReady, tokenLast4? }
 *   PUT  /api/settings/whatsapp        { phoneNumberId, accessToken?, displayNumber?, templateName?, enabled, costAcknowledged? }
 *   POST /api/settings/whatsapp/test   one template message to the owner's own users.phone
 *
 * Storage (raw-SQL bootstrap, additive only):
 *   user_whatsapp_settings                       one row per account, token encrypted at rest
 *   webinar_funnel_registrations.whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE (+ whatsapp_opt_in_at)
 *     → every existing registration is NOT opted in.
 */
import type { Express, Request, Response } from "express";
import { pool } from "../storage";
import { encryptTokenStrict, decryptTokenStrict, isTokenEncryptionConfigured } from "../security/tokenEncryption";
import { createWhatsappService, type WhatsappRepo, type Result } from "../whatsappByok";

type RequireAuth = (req: Request, res: Response, next: Function) => any;

export const WHATSAPP_SETTINGS_DDL = `
  CREATE TABLE IF NOT EXISTS user_whatsapp_settings (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    phone_number_id TEXT,
    access_token_encrypted TEXT,
    display_number TEXT,
    template_name TEXT NOT NULL DEFAULT 'hello_world',
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    cost_acknowledged_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE user_whatsapp_settings ADD COLUMN IF NOT EXISTS cost_acknowledged_at TIMESTAMPTZ;
`;
/** Additive consent columns; DEFAULT FALSE means existing registrations are not opted in. */
export const WHATSAPP_OPT_IN_DDL = `
  ALTER TABLE webinar_funnel_registrations ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE webinar_funnel_registrations ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ;
`;

let schemaReady: Promise<void> | null = null;
export function ensureWhatsappSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(WHATSAPP_SETTINGS_DDL);
      await pool.query(WHATSAPP_OPT_IN_DDL);
    })().catch((e) => { schemaReady = null; throw e; }); // retry on next use (e.g. registrations table not created yet)
  }
  return schemaReady;
}

export const pgWhatsappRepo: WhatsappRepo = {
  async getSettings(userId) {
    await ensureWhatsappSchema();
    const { rows } = await pool.query(
      `SELECT phone_number_id, access_token_encrypted, display_number, template_name, enabled, cost_acknowledged_at
         FROM user_whatsapp_settings WHERE user_id = $1`, [String(userId)],
    );
    return rows[0] ?? null;
  },
  async upsertSettings(userId, v) {
    await ensureWhatsappSchema();
    await pool.query(
      `INSERT INTO user_whatsapp_settings (user_id, phone_number_id, access_token_encrypted, display_number, template_name, enabled, cost_acknowledged_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7::boolean THEN NOW() END, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         phone_number_id = EXCLUDED.phone_number_id,
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         display_number = EXCLUDED.display_number,
         template_name = EXCLUDED.template_name,
         enabled = EXCLUDED.enabled,
         cost_acknowledged_at = COALESCE(user_whatsapp_settings.cost_acknowledged_at, EXCLUDED.cost_acknowledged_at),
         updated_at = NOW()`,
      [String(userId), v.phoneNumberId, v.accessTokenEncrypted, v.displayNumber, v.templateName, v.enabled, v.costAcknowledged],
    );
  },
  async getUserPhone(userId) {
    const { rows } = await pool.query(`SELECT phone FROM users WHERE id = $1`, [String(userId)]);
    return rows[0]?.phone ?? null;
  },
  async getRegistrationForSend(registrationId) {
    await ensureWhatsappSchema();
    const { rows } = await pool.query(
      `SELECT f.user_id, r.phone, r.whatsapp_opt_in
         FROM webinar_funnel_registrations r JOIN webinar_funnels f ON f.id = r.webinar_id
        WHERE r.id = $1`, [String(registrationId)],
    );
    const r = rows[0];
    return r ? { ownerUserId: String(r.user_id), phone: r.phone ?? null, whatsappOptIn: r.whatsapp_opt_in === true } : null;
  },
};

export const whatsappService = createWhatsappService({
  repo: pgWhatsappRepo,
  fetch: (...a) => fetch(...a),
  encrypt: encryptTokenStrict,
  decrypt: decryptTokenStrict,
  encryptionReady: isTokenEncryptionConfigured,
});

/** Persist a registrant's explicit WhatsApp choice (true only with a phone on the row). */
export async function recordWhatsappOptIn(registrationId: string, optIn: boolean): Promise<void> {
  await ensureWhatsappSchema();
  await pool.query(
    `UPDATE webinar_funnel_registrations
        SET whatsapp_opt_in = ($2::boolean AND phone IS NOT NULL AND phone <> ''),
            whatsapp_opt_in_at = CASE WHEN ($2::boolean AND phone IS NOT NULL AND phone <> '') THEN NOW() END
      WHERE id = $1`, [registrationId, optIn],
  );
}

/** Whether the public registration form should offer the WhatsApp opt-in. Never throws. */
export async function isWhatsappActiveForOwner(userId: string): Promise<boolean> {
  try { return await whatsappService.isActiveForOwner(userId); } catch { return false; }
}

/** Best-effort automatic send (requires opt-in etc. — see whatsappByok.ts). Never throws. */
export async function sendWebinarWhatsApp(registrationId: string, kind: string): Promise<boolean> {
  return (await whatsappService.sendForRegistration(registrationId, kind)).sent;
}

export function registerWebinarWhatsappRoutes(app: Express, requireAuth: RequireAuth) {
  ensureWhatsappSchema().catch((e) => console.warn("[webinar-whatsapp] schema bootstrap deferred:", e.message));

  const handle = (fn: (userId: string, req: Request) => Promise<Result>, what: string) =>
    async (req: Request, res: Response) => {
      try {
        const r = await fn(String((req.user as any).id), req);
        res.status(r.status).json(r.body);
      } catch (e: any) {
        console.error(`[webinar-whatsapp] ${what} error:`, e.message);
        res.status(500).json({ message: `Couldn't ${what}` });
      }
    };

  app.get("/api/settings/whatsapp", requireAuth, handle((u) => whatsappService.getView(u), "load WhatsApp settings"));
  app.put("/api/settings/whatsapp", requireAuth, handle((u, req) => whatsappService.save(u, req.body), "save WhatsApp settings"));
  app.post("/api/settings/whatsapp/test", requireAuth, handle((u) => whatsappService.sendTest(u), "send the test message"));
}
