// Payments credential vault.
//
// Encrypts payment-processor credentials (Stripe restricted keys, Whop API keys)
// at rest with AES-256-GCM. Stricter than the OAuth token helper in
// security/tokenEncryption.ts:
//
//  - There is NO plaintext fallback. If no key material is configured, encrypt()
//    throws and the credential is never stored.
//  - Key: PAYMENTS_VAULT_KEY (32 bytes as 64 hex chars or base64). If unset, a key
//    is derived from SESSION_SECRET with HKDF-SHA256 under a payments-specific
//    salt/info, so the derived key is not the session secret itself.
//  - Every ciphertext is bound to (userId, provider) through GCM additional
//    authenticated data. A ciphertext copied onto another user's row fails to
//    decrypt instead of leaking that user's key.
//  - Fresh random 96-bit IV per encryption.
//
// Nothing in this file logs plaintext, ciphertext or key material.

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PREFIX = "pv1:";

export class VaultNotConfiguredError extends Error {
  constructor() {
    super("Payments vault is not configured");
    this.name = "VaultNotConfiguredError";
  }
}

function parseExplicitKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  try {
    const b = Buffer.from(trimmed, "base64");
    if (b.length === 32) return b;
  } catch {
    /* fall through */
  }
  return null;
}

let cachedKey: { source: string; key: Buffer } | null = null;

function getVaultKey(): Buffer {
  const explicit = process.env.PAYMENTS_VAULT_KEY;
  const session = process.env.SESSION_SECRET;
  const source = explicit ? `explicit:${explicit}` : session ? `session:${session}` : "";
  if (cachedKey && cachedKey.source === source) return cachedKey.key;

  let key: Buffer | null = null;
  if (explicit) {
    key = parseExplicitKey(explicit);
    // A malformed explicit key is a configuration error; never silently fall back.
    if (!key) throw new VaultNotConfiguredError();
  } else if (session && session !== "change-me-to-a-long-random-secret" && session.length >= 16) {
    key = Buffer.from(
      hkdfSync("sha256", Buffer.from(session, "utf8"), Buffer.from("oravini-payments-vault-v1", "utf8"), Buffer.from("payments-credential-encryption", "utf8"), 32),
    );
  }
  if (!key) throw new VaultNotConfiguredError();
  cachedKey = { source, key };
  return key;
}

export function isVaultConfigured(): boolean {
  try {
    getVaultKey();
    return true;
  } catch {
    return false;
  }
}

function aad(userId: string, provider: string): Buffer {
  return Buffer.from(`oravini-payments:${userId}:${provider}`, "utf8");
}

/** Encrypt a credential for one user + provider. Output: "pv1:" + base64(iv | tag | ciphertext). */
export function encryptCredential(plaintext: string, userId: string, provider: string): string {
  const key = getVaultKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(aad(userId, provider));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Decrypt a credential. Throws on tampering, wrong key, or wrong user/provider binding. */
export function decryptCredential(stored: string, userId: string, provider: string): string {
  if (!stored.startsWith(PREFIX)) throw new Error("Unrecognised credential format");
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  if (raw.length <= IV_LENGTH + TAG_LENGTH) throw new Error("Unrecognised credential format");
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ct = raw.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getVaultKey(), iv, { authTagLength: TAG_LENGTH });
  decipher.setAAD(aad(userId, provider));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function last4(secret: string): string {
  return secret.slice(-4);
}
