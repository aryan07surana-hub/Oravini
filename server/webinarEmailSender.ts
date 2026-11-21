/**
 * Per-account email sender for Webinar Funnel emails (/w/:slug funnels).
 *
 * Free routes only: an account connects either
 *   - "gmail_app_password" — its own Gmail / Google Workspace address + a Google app password
 *     (smtp.gmail.com:465), or
 *   - "smtp" — any SMTP server it already has (its own domain's mailbox, Zoho, a free relay tier…).
 *
 * Security:
 *   - The SMTP password is stored only as AES-256-GCM ciphertext via server/security/tokenEncryption.
 *     Saving is refused outright when TOKEN_ENCRYPTION_KEY isn't configured, so a password is never
 *     written to the DB in plaintext. It is never returned by any endpoint or logged.
 *   - Custom SMTP hosts must resolve to public addresses and use a mail port (25/465/587/2525).
 *     The resolved IP is pinned into the transport (TLS still verifies the hostname), so the server
 *     can't be pointed at internal services, including via DNS rebinding.
 *   - Non-implicit-TLS connections require STARTTLS, so credentials never cross the wire in clear.
 */
import nodemailer from "nodemailer";
import dns from "dns/promises";
import net from "net";
import { z } from "zod";
import { pool } from "./storage";
import { encryptToken, decryptToken, isEncrypted } from "./security/tokenEncryption";
import {
  ALLOWED_SMTP_PORTS, EMAIL_SENDER_PROVIDERS,
  type EmailSenderProvider, type EmailVia, type WebinarEmailSendStatus, type WebinarEmailSendType,
} from "@shared/webinarEmailTemplates";

// ── Schema (mirrors shared/schema.ts; run by runMigrations and lazily on first use) ──
export const WEBINAR_EMAIL_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS user_email_senders (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    provider TEXT NOT NULL,
    from_name TEXT,
    from_email TEXT NOT NULL,
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
    smtp_user TEXT NOT NULL,
    smtp_pass_encrypted TEXT NOT NULL,
    pass_last4 TEXT,
    last_verified_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT user_email_senders_user_id_unique UNIQUE (user_id),
    CONSTRAINT user_email_senders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS webinar_email_sends (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    webinar_id VARCHAR,
    registration_id VARCHAR,
    type TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT,
    status TEXT NOT NULL,
    via TEXT,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT webinar_email_sends_webinar_id_webinar_funnels_id_fk FOREIGN KEY (webinar_id) REFERENCES webinar_funnels(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_webinar_email_sends_user ON webinar_email_sends(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_webinar_email_sends_webinar ON webinar_email_sends(webinar_id, created_at);
  ALTER TABLE webinar_funnels ADD COLUMN IF NOT EXISTS email_templates JSONB;
`;

let schemaReady: Promise<void> | null = null;
export function ensureWebinarEmailSchema(): Promise<void> {
  schemaReady ??= pool.query(WEBINAR_EMAIL_SCHEMA_SQL).then(() => undefined, (e) => { schemaReady = null; throw e; });
  return schemaReady;
}

// ── Encryption guard ────────────────────────────────────────────────────────
/** True only when tokenEncryption will actually encrypt (it silently passes plaintext through otherwise). */
export function canEncryptSecrets(): boolean {
  const probe = encryptToken("probe");
  return probe !== "probe" && isEncrypted(probe);
}

// ── Input validation ────────────────────────────────────────────────────────
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const optName = z.union([z.string().trim().max(80), z.null()]).optional()
  .transform(v => (v ? v.replace(/["<>\r\n]/g, "").trim() || null : null));

export const senderInputSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("gmail_app_password"),
    fromName: optName,
    gmailAddress: z.string().trim().toLowerCase().max(254).email("Enter your Gmail address"),
    // Google shows app passwords as "abcd efgh ijkl mnop"; spaces are stripped.
    appPassword: z.string().max(64).optional().transform(v => (v ? v.replace(/\s+/g, "") : undefined))
      .refine(v => v === undefined || v === "" || /^[a-zA-Z]{16}$/.test(v), "A Google app password is 16 letters (spaces are fine)"),
  }),
  z.object({
    provider: z.literal("smtp"),
    fromName: optName,
    fromEmail: z.string().trim().toLowerCase().max(254).email("Enter a valid From email"),
    host: z.string().trim().toLowerCase().max(253).refine(v => HOSTNAME_RE.test(v), "Enter an SMTP hostname like smtp.yourdomain.com"),
    port: z.coerce.number().int().refine(p => (ALLOWED_SMTP_PORTS as readonly number[]).includes(p), `Port must be one of ${ALLOWED_SMTP_PORTS.join(", ")}`),
    secure: z.boolean().optional(),
    username: z.string().trim().min(1, "SMTP username is required").max(254),
    password: z.string().max(512).optional(),
  }),
]);
export type SenderInput = z.infer<typeof senderInputSchema>;

/** Private, loopback, link-local, CGNAT, multicast, reserved — anything not on the public internet. */
export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 192 && b === 0 && ip.split(".")[2] === "0")
      || (a === 198 && (b === 18 || b === 19));
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
  }
  return true; // not an IP at all → refuse
}

export class SenderValidationError extends Error {}

/**
 * Resolves an SMTP hostname and returns a public address to pin. Throws SenderValidationError
 * when it doesn't resolve or any address is non-public. ALLOW_PRIVATE_SMTP_HOSTS=true (dev only)
 * lets a local mail catcher through.
 */
export async function resolvePublicSmtpHost(host: string, lookup: typeof dns.lookup = dns.lookup): Promise<string> {
  const allowPrivate = process.env.ALLOW_PRIVATE_SMTP_HOSTS === "true" && process.env.NODE_ENV !== "production";
  if (net.isIP(host)) throw new SenderValidationError("Use the SMTP server's hostname, not an IP address");
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true }) as any;
  } catch {
    throw new SenderValidationError(`Couldn't find an SMTP server at ${host}`);
  }
  if (!addrs.length) throw new SenderValidationError(`Couldn't find an SMTP server at ${host}`);
  if (!allowPrivate && addrs.some(a => isPrivateAddress(a.address))) {
    throw new SenderValidationError("That SMTP host points to a private network address and can't be used");
  }
  return (addrs.find(a => net.isIPv4(a.address)) ?? addrs[0]).address;
}

// ── Storage ─────────────────────────────────────────────────────────────────
export type SenderRow = {
  user_id: string;
  provider: EmailSenderProvider;
  from_name: string | null;
  from_email: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass_encrypted: string;
  pass_last4: string | null;
  last_verified_at: Date | null;
  last_error: string | null;
  updated_at: Date | null;
};

export async function loadAccountSender(userId: string): Promise<SenderRow | null> {
  await ensureWebinarEmailSchema();
  const { rows } = await pool.query(`SELECT * FROM user_email_senders WHERE user_id = $1`, [String(userId)]);
  const row = rows[0] as SenderRow | undefined;
  return row && (EMAIL_SENDER_PROVIDERS as readonly string[]).includes(row.provider) ? row : null;
}

/** What the API returns — never the password or its ciphertext. */
export function publicSenderView(row: SenderRow | null) {
  if (!row) return { configured: false as const };
  return {
    configured: true as const,
    provider: row.provider,
    fromName: row.from_name,
    fromEmail: row.from_email,
    host: row.provider === "smtp" ? row.smtp_host : null,
    port: row.provider === "smtp" ? row.smtp_port : null,
    secure: row.provider === "smtp" ? row.smtp_secure : null,
    username: row.smtp_user,
    passLast4: row.pass_last4,
    lastVerifiedAt: row.last_verified_at,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}

/** The normalized sender a save would produce (password still plaintext; encrypt before storing). */
export type PlainSender = {
  provider: EmailSenderProvider; fromName: string | null; fromEmail: string;
  host: string | null; port: number | null; secure: boolean; username: string; password: string;
};

/**
 * Merges a validated input with the existing row: the password may be omitted to keep the stored one,
 * but only while the account / username / server stay the same (so a stored password is never sent
 * to a different server or user).
 */
export function mergeSenderInput(input: SenderInput, existing: SenderRow | null): PlainSender {
  if (input.provider === "gmail_app_password") {
    const keep = existing && existing.provider === "gmail_app_password" && existing.smtp_user === input.gmailAddress;
    const password = input.appPassword || (keep ? decryptToken(existing!.smtp_pass_encrypted) : "");
    if (!password) throw new SenderValidationError("Enter the 16-letter Google app password");
    return { provider: "gmail_app_password", fromName: input.fromName ?? null, fromEmail: input.gmailAddress, host: null, port: null, secure: true, username: input.gmailAddress, password };
  }
  const secure = input.secure ?? input.port === 465;
  const keep = existing && existing.provider === "smtp" && existing.smtp_user === input.username && existing.smtp_host === input.host;
  const password = input.password || (keep ? decryptToken(existing!.smtp_pass_encrypted) : "");
  if (!password) throw new SenderValidationError("Enter the SMTP password");
  return { provider: "smtp", fromName: input.fromName ?? null, fromEmail: input.fromEmail, host: input.host, port: input.port, secure, username: input.username, password };
}

export async function saveAccountSender(userId: string, s: PlainSender): Promise<SenderRow> {
  if (!canEncryptSecrets()) throw new SenderValidationError("Email sending isn't available yet: the server's encryption key isn't configured");
  await ensureWebinarEmailSchema();
  const { rows } = await pool.query(`
    INSERT INTO user_email_senders (user_id, provider, from_name, from_email, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_encrypted, pass_last4, last_verified_at, last_error, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NULL,NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      provider = EXCLUDED.provider, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email,
      smtp_host = EXCLUDED.smtp_host, smtp_port = EXCLUDED.smtp_port, smtp_secure = EXCLUDED.smtp_secure,
      smtp_user = EXCLUDED.smtp_user, smtp_pass_encrypted = EXCLUDED.smtp_pass_encrypted, pass_last4 = EXCLUDED.pass_last4,
      last_verified_at = NOW(), last_error = NULL, updated_at = NOW()
    RETURNING *`,
    [String(userId), s.provider, s.fromName, s.fromEmail, s.host, s.port, s.secure, s.username, encryptToken(s.password), s.password.slice(-4)],
  );
  invalidateAccountTransport(userId);
  return rows[0];
}

export async function deleteAccountSender(userId: string): Promise<boolean> {
  await ensureWebinarEmailSchema();
  const { rowCount } = await pool.query(`DELETE FROM user_email_senders WHERE user_id = $1`, [String(userId)]);
  invalidateAccountTransport(userId);
  return (rowCount ?? 0) > 0;
}

/** Records the latest send outcome on the sender row (shown in Settings). Never throws. */
export async function noteAccountSenderResult(userId: string, error: string | null) {
  try {
    if (error) await pool.query(`UPDATE user_email_senders SET last_error = $2 WHERE user_id = $1`, [String(userId), error.slice(0, 500)]);
    else await pool.query(`UPDATE user_email_senders SET last_error = NULL, last_verified_at = NOW() WHERE user_id = $1 AND last_error IS NOT NULL`, [String(userId)]);
  } catch { /* best effort */ }
}

// ── Transports ──────────────────────────────────────────────────────────────
const TIMEOUTS = { connectionTimeout: 15_000, greetingTimeout: 10_000, socketTimeout: 30_000 };

/** Builds a nodemailer transport. For custom SMTP the host is resolved, checked and pinned. */
export async function buildSenderTransport(s: PlainSender, lookup?: typeof dns.lookup): Promise<nodemailer.Transporter> {
  if (s.provider === "gmail_app_password") {
    return nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: s.username, pass: s.password }, ...TIMEOUTS });
  }
  const ip = await resolvePublicSmtpHost(s.host!, lookup);
  return nodemailer.createTransport({
    host: ip,
    port: s.port!,
    secure: s.secure,
    requireTLS: !s.secure,           // STARTTLS mandatory: credentials never go out in clear
    tls: { servername: s.host! },     // certificate is still verified against the real hostname
    auth: { user: s.username, pass: s.password },
    ...TIMEOUTS,
  });
}

export function rowToPlainSender(row: SenderRow): PlainSender {
  return {
    provider: row.provider, fromName: row.from_name, fromEmail: row.from_email,
    host: row.smtp_host, port: row.smtp_port, secure: row.smtp_secure,
    username: row.smtp_user, password: decryptToken(row.smtp_pass_encrypted),
  };
}

/** Turns SMTP / nodemailer errors into something an account owner can act on. */
export function describeSmtpError(e: any): string {
  const msg = String(e?.message || e || "Unknown error");
  const code = e?.code || "";
  if (code === "EAUTH" || e?.responseCode === 535 || /535|Username and Password not accepted|authentication failed/i.test(msg)) {
    return "The mail server rejected the username/password. For Gmail, turn on 2-Step Verification and use a 16-letter app password, not your normal password.";
  }
  if (code === "ETIMEDOUT" || code === "ECONNECTION" || /timeout/i.test(msg)) return `Couldn't connect to the mail server (${msg}). Check the host and port.`;
  if (code === "ECONNREFUSED") return "The mail server refused the connection. Check the host and port.";
  if (/5\.4\.5|daily.*(limit|quota)/i.test(msg)) return "Daily sending limit reached on this mailbox (Gmail allows ~500/day). Sends resume tomorrow.";
  if (/certificate|self.signed|CERT_/i.test(msg)) return `TLS certificate problem: ${msg}`;
  return msg.slice(0, 300);
}

// ── Per-account transport cache ─────────────────────────────────────────────
type CachedAccount = { at: number; value: { transport: nodemailer.Transporter; sender: PlainSender } | null };
const ACCOUNT_TTL_MS = 5 * 60_000; // short TTL so other app instances pick up settings changes
const accountCache = new Map<string, CachedAccount>();

export function invalidateAccountTransport(userId: string) {
  const hit = accountCache.get(String(userId));
  hit?.value?.transport.close?.();
  accountCache.delete(String(userId));
}

/** The account's own transport, or null when it hasn't connected one (or it can't be built). */
export async function getAccountTransport(userId: string): Promise<CachedAccount["value"]> {
  const key = String(userId);
  const hit = accountCache.get(key);
  if (hit && Date.now() - hit.at < ACCOUNT_TTL_MS) return hit.value;
  let value: CachedAccount["value"] = null;
  try {
    const row = await loadAccountSender(key);
    if (row) {
      const sender = rowToPlainSender(row);
      value = { transport: await buildSenderTransport(sender), sender };
    }
  } catch (e: any) {
    console.error("[webinar-email] account sender unavailable:", e?.message);
    if (e instanceof SenderValidationError) await noteAccountSenderResult(key, e.message);
    value = null;
  }
  hit?.value?.transport.close?.();
  accountCache.set(key, { at: Date.now(), value });
  return value;
}

// ── Send log ────────────────────────────────────────────────────────────────
export type EmailSendRecord = {
  userId: string;
  webinarId: string | null;
  registrationId: string | null;
  type: WebinarEmailSendType;
  toEmail: string;
  subject: string | null;
  status: WebinarEmailSendStatus;
  via: EmailVia;
  error?: string | null;
};

/** Appends to webinar_email_sends. Never throws — logging must never break a send or a registration. */
export async function recordEmailSend(r: EmailSendRecord): Promise<void> {
  try {
    await ensureWebinarEmailSchema();
    await pool.query(
      `INSERT INTO webinar_email_sends (user_id, webinar_id, registration_id, type, to_email, subject, status, via, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [String(r.userId), r.webinarId, r.registrationId, r.type, r.toEmail.slice(0, 254), r.subject?.slice(0, 300) ?? null, r.status, r.via, r.error ? r.error.slice(0, 500) : null],
    );
  } catch (e: any) {
    console.error("[webinar-email] send log write failed:", e?.message);
  }
}
