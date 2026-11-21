/**
 * Bring-your-own-key WhatsApp (Meta Cloud API) for webinar reminders — pure service.
 *
 * No DB / network imports: storage, fetch and crypto come in through `deps`, so the
 * rules below are unit-testable with an in-memory repo and a fake fetch
 * (tests/webinarWhatsapp.test.ts). Express wiring lives in server/routes/webinar-whatsapp.ts.
 *
 * Rules enforced here:
 *  - Fail closed: no token is ever stored unless strict encryption succeeds (valid 64-hex
 *    TOKEN_ENCRYPTION_KEY). Stored values that aren't in encrypted form are never used.
 *  - The token is never returned or logged; responses only carry `configured` + last-4 hint.
 *  - Each account only ever reads/uses its own row (owner isolation).
 *  - Automatic sends need ALL of: registrant explicitly opted in to WhatsApp, a phone,
 *    owner enabled sends AND acknowledged Meta may bill their WhatsApp account.
 *    Enabled defaults to off.
 *  - Messages are a fixed, no-parameter template (language en_US). No webinar title / time /
 *    join link is sent — the template's own approved text is all the recipient sees.
 */
import { z } from "zod";

export const GRAPH_URL = "https://graph.facebook.com/v21.0";
/** Meta's pre-approved sample template. Test-only: says "Hello World", no webinar details. */
export const TEST_TEMPLATE = "hello_world";
export const TEMPLATE_LANGUAGE = "en_US";

export type SettingsRow = {
  phone_number_id: string | null;
  access_token_encrypted: string | null;
  display_number: string | null;
  template_name: string | null;
  enabled: boolean;
  cost_acknowledged_at: Date | string | null;
};

export type RegistrationForSend = { ownerUserId: string; phone: string | null; whatsappOptIn: boolean };

export interface WhatsappRepo {
  getSettings(userId: string): Promise<SettingsRow | null>;
  upsertSettings(userId: string, v: {
    phoneNumberId: string; accessTokenEncrypted: string; displayNumber: string | null;
    templateName: string; enabled: boolean; costAcknowledged: boolean;
  }): Promise<void>;
  getUserPhone(userId: string): Promise<string | null>;
  getRegistrationForSend(registrationId: string): Promise<RegistrationForSend | null>;
}

export interface WhatsappDeps {
  repo: WhatsappRepo;
  fetch: typeof fetch;
  /** Must throw rather than return plaintext (encryptTokenStrict). */
  encrypt(plaintext: string): string;
  /** Must throw on plaintext / undecryptable values (decryptTokenStrict). */
  decrypt(stored: string): string;
  encryptionReady(): boolean;
  log?: (msg: string) => void;
}

export type Result = { status: number; body: any };

export const ENCRYPTION_UNAVAILABLE_MESSAGE =
  "Token encryption isn't configured on this server (TOKEN_ENCRYPTION_KEY must be a 64-character hex key), so no WhatsApp token can be saved. Nothing was stored — ask the Oravini admin to set it.";
export const COST_ACK_MESSAGE =
  "Before turning on automatic WhatsApp sends, confirm you understand Meta may charge your own WhatsApp Business account for each template message (Oravini doesn't pay for or cap these).";

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

export const putBody = z.object({
  phoneNumberId: z.string().trim().regex(/^\d{5,32}$/, "Phone number ID should be the numeric ID from Meta (not the phone number itself)"),
  accessToken: z.string().trim().max(4096).optional().nullable(),
  displayNumber: z.string().trim().max(32).optional().nullable(),
  templateName: z.string().trim().max(512).regex(/^[a-z0-9_]*$/, "Template names use lowercase letters, digits and underscores").optional().nullable(),
  enabled: z.boolean(),
  costAcknowledged: z.boolean().optional(),
});

const ENCRYPTED_RE = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/;
const hasToken = (s: SettingsRow | null): s is SettingsRow =>
  !!(s && s.phone_number_id && s.access_token_encrypted && ENCRYPTED_RE.test(s.access_token_encrypted));

export function createWhatsappService(deps: WhatsappDeps) {
  const log = deps.log ?? ((m: string) => console.error(m));

  /** Decrypt the caller's own stored token, or null (never throws, never logs the value). */
  const tokenFor = (s: SettingsRow): string | null => {
    if (!deps.encryptionReady() || !hasToken(s)) return null;
    try { return deps.decrypt(s.access_token_encrypted!); } catch { return null; }
  };

  const view = (s: SettingsRow | null) => {
    const token = s && hasToken(s) ? tokenFor(s) : null;
    const templateName = s?.template_name || TEST_TEMPLATE;
    return {
      configured: !!token,
      enabled: !!s?.enabled,
      costAcknowledged: !!s?.cost_acknowledged_at,
      displayNumber: s?.display_number ?? null,
      phoneNumberId: s?.phone_number_id ?? null,
      templateName,
      templateLanguage: TEMPLATE_LANGUAGE,
      isTestTemplate: templateName === TEST_TEMPLATE,
      encryptionReady: deps.encryptionReady(),
      ...(token ? { tokenLast4: token.slice(-4) } : {}),
    };
  };

  async function sendTemplate(phoneNumberId: string, token: string, to: string, templateName: string) {
    try {
      const resp = await deps.fetch(`${GRAPH_URL}/${encodeURIComponent(phoneNumberId)}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: templateName, language: { code: TEMPLATE_LANGUAGE } },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const data: any = await resp.json().catch(() => ({}));
      if (!resp.ok) return { ok: false as const, status: resp.status, error: String(data?.error?.message || `WhatsApp API returned HTTP ${resp.status}`) };
      return { ok: true as const, status: resp.status, messageId: data?.messages?.[0]?.id as string | undefined };
    } catch (e: any) {
      return { ok: false as const, status: 0, error: e?.name === "TimeoutError" ? "WhatsApp API timed out" : "Network error reaching the WhatsApp API" };
    }
  }

  return {
    async getView(userId: string): Promise<Result> {
      return { status: 200, body: view(await deps.repo.getSettings(userId)) };
    },

    async save(userId: string, raw: unknown): Promise<Result> {
      const parsed = putBody.safeParse(raw ?? {});
      if (!parsed.success) return { status: 400, body: { message: parsed.error.issues[0]?.message || "Invalid input" } };
      // Fail closed before touching storage: no valid key → nothing is saved, token or not.
      if (!deps.encryptionReady()) return { status: 503, body: { message: ENCRYPTION_UNAVAILABLE_MESSAGE } };
      const { phoneNumberId, accessToken, displayNumber, templateName, enabled, costAcknowledged } = parsed.data;
      const existing = await deps.repo.getSettings(userId);

      let encrypted: string;
      if (accessToken) {
        try { encrypted = deps.encrypt(accessToken); } catch { return { status: 503, body: { message: ENCRYPTION_UNAVAILABLE_MESSAGE } }; }
        if (encrypted === accessToken || !ENCRYPTED_RE.test(encrypted)) return { status: 503, body: { message: ENCRYPTION_UNAVAILABLE_MESSAGE } };
      } else if (existing && hasToken(existing) && tokenFor(existing)) {
        encrypted = existing.access_token_encrypted!;
      } else {
        return { status: 400, body: { message: existing?.access_token_encrypted ? "Please re-enter your access token" : "Access token is required" } };
      }

      const acknowledged = costAcknowledged === true || !!existing?.cost_acknowledged_at;
      if (enabled && !acknowledged) return { status: 400, body: { message: COST_ACK_MESSAGE } };

      await deps.repo.upsertSettings(userId, {
        phoneNumberId, accessTokenEncrypted: encrypted, displayNumber: displayNumber || null,
        templateName: templateName || TEST_TEMPLATE, enabled, costAcknowledged: costAcknowledged === true,
      });
      return { status: 200, body: view(await deps.repo.getSettings(userId)) };
    },

    /** Manual owner action: one template message to the owner's own account phone. */
    async sendTest(userId: string): Promise<Result> {
      const s = await deps.repo.getSettings(userId);
      if (!deps.encryptionReady()) return { status: 503, body: { message: ENCRYPTION_UNAVAILABLE_MESSAGE } };
      const token = s ? tokenFor(s) : null;
      if (!s || !token) return { status: 400, body: { message: "Save your phone number ID and access token first" } };
      const to = normalizeWhatsappNumber(await deps.repo.getUserPhone(userId));
      if (!to) return { status: 400, body: { message: "Add a phone number to your account first — the test message goes to your own phone" } };
      const r = await sendTemplate(s.phone_number_id!, token, to, s.template_name || TEST_TEMPLATE);
      if (!r.ok) {
        log(`[webinar-whatsapp] test send failed (user ${userId}, HTTP ${r.status}): ${r.error}`);
        // Meta 4xx → 400 so the client never mistakes a bad WhatsApp token for its own session expiring.
        return { status: r.status >= 400 && r.status < 500 ? 400 : 502, body: { message: r.error, metaStatus: r.status } };
      }
      return { status: 200, body: { success: true, metaStatus: r.status, to: `+${to.slice(0, -4).replace(/\d/g, "•")}${to.slice(-4)}`, messageId: r.messageId } };
    },

    /** True when the owner's automatic sends are fully set up (used to show the opt-in box). */
    async isActiveForOwner(userId: string): Promise<boolean> {
      const s = await deps.repo.getSettings(userId);
      return !!(s && s.enabled && s.cost_acknowledged_at && tokenFor(s));
    },

    /**
     * Automatic, best-effort send for one registration. Never throws; returns why it skipped.
     * The owner is derived from the registration's funnel, so one account's credentials can
     * never be used for another account's registrants.
     */
    async sendForRegistration(registrationId: string, kind: string): Promise<{ sent: boolean; reason?: string }> {
      try {
        const reg = await deps.repo.getRegistrationForSend(registrationId);
        if (!reg) return { sent: false, reason: "no_registration" };
        if (!reg.whatsappOptIn) return { sent: false, reason: "no_opt_in" };
        const to = normalizeWhatsappNumber(reg.phone);
        if (!to) return { sent: false, reason: "no_phone" };
        const s = await deps.repo.getSettings(reg.ownerUserId);
        if (!s || !s.enabled) return { sent: false, reason: "disabled" };
        if (!s.cost_acknowledged_at) return { sent: false, reason: "cost_not_acknowledged" };
        const token = tokenFor(s);
        if (!token) return { sent: false, reason: "not_configured" };
        const r = await sendTemplate(s.phone_number_id!, token, to, s.template_name || TEST_TEMPLATE);
        if (!r.ok) {
          log(`[webinar-whatsapp] ${kind} failed (owner ${reg.ownerUserId}, HTTP ${r.status}): ${r.error}`);
          return { sent: false, reason: "meta_error" };
        }
        return { sent: true };
      } catch (e: any) {
        log(`[webinar-whatsapp] ${kind} error: ${e?.message}`);
        return { sent: false, reason: "error" };
      }
    },
  };
}
