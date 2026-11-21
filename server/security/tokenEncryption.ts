/**
 * OAuth Token Encryption at Rest
 * 
 * Encrypts sensitive tokens (Meta, LinkedIn, Twitter) before storing in DB
 * and decrypts them when reading. Uses AES-256-GCM for authenticated encryption.
 * 
 * Set TOKEN_ENCRYPTION_KEY in your environment (64-char hex string = 32 bytes).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("[security] TOKEN_ENCRYPTION_KEY not set! Tokens stored unencrypted.");
    }
    return null;
  }
  if (key.length !== 64) {
    console.error("[security] TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes).");
    return null;
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a plaintext token for storage.
 * Returns a string in format: iv:authTag:ciphertext (all hex-encoded)
 * If encryption key is not configured, returns the plaintext (graceful degradation).
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a stored token.
 * Expects format: iv:authTag:ciphertext (all hex-encoded)
 * If the value doesn't look encrypted (no colons), returns it as-is (backward compat).
 */
export function decryptToken(stored: string): string {
  const key = getEncryptionKey();
  if (!key) return stored;

  // Check if this looks like an encrypted value
  const parts = stored.split(":");
  if (parts.length !== 3) {
    // Not encrypted (legacy plaintext token) — return as-is
    return stored;
  }

  const [ivHex, authTagHex, ciphertext] = parts;

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("[security] Token decryption failed — may be a legacy plaintext token:", err);
    // Return as-is if decryption fails (could be legacy unencrypted token)
    return stored;
  }
}

/**
 * Check if a stored value is already encrypted.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  // Check if parts look like hex
  return /^[0-9a-f]{32}$/.test(parts[0]) && /^[0-9a-f]{32}$/.test(parts[1]);
}

// ── Strict (fail-closed) API ────────────────────────────────────────────────
// Additive: the legacy encryptToken/decryptToken above keep their graceful
// plaintext fallback for existing integrations. New integrations that must never
// store a secret in plaintext (e.g. BYOK WhatsApp) use these instead.

/** True only when TOKEN_ENCRYPTION_KEY is exactly 64 hex characters (32 bytes). */
export function isTokenEncryptionConfigured(): boolean {
  return /^[0-9a-fA-F]{64}$/.test(process.env.TOKEN_ENCRYPTION_KEY || "");
}

export class TokenEncryptionUnavailableError extends Error {
  constructor() {
    super("Token encryption is not configured (TOKEN_ENCRYPTION_KEY must be 64 hex characters)");
    this.name = "TokenEncryptionUnavailableError";
  }
}

/**
 * Encrypts or throws — never returns plaintext. Verifies the result is in the
 * iv:authTag:ciphertext format and decrypts back to the input before returning it.
 */
export function encryptTokenStrict(plaintext: string): string {
  if (!isTokenEncryptionConfigured()) throw new TokenEncryptionUnavailableError();
  const out = encryptToken(plaintext);
  if (out === plaintext || !isEncrypted(out) || decryptToken(out) !== plaintext) throw new TokenEncryptionUnavailableError();
  return out;
}

/** Decrypts or throws — refuses plaintext/legacy values and undecryptable data. */
export function decryptTokenStrict(stored: string): string {
  if (!isTokenEncryptionConfigured() || !isEncrypted(stored)) throw new TokenEncryptionUnavailableError();
  const out = decryptToken(stored);
  if (out === stored) throw new TokenEncryptionUnavailableError(); // decryptToken returns input on auth-tag failure
  return out;
}
