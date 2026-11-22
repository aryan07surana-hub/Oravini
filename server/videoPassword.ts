/**
 * Server-side password protection for hosted videos (video_events.password_hash).
 *
 * State on main before this change:
 *   - The owner UI writes the raw password into password_hash (plaintext).
 *   - Nothing ever verified it: GET /api/video/:id/public returned videoUrl to
 *     anyone, so "protected" videos played for everyone with the link.
 *
 * Now:
 *   - New/changed passwords are stored as scrypt hashes ("scrypt$salt$hash").
 *     Legacy plaintext values still verify (constant-time compare), so videos
 *     protected before this change keep the same password.
 *   - A protected video's public payload withholds videoUrl/captionUrl and its
 *     chapters/CTAs/interactive elements until the viewer proves the password
 *     via POST /api/video/:id/unlock, which returns a short-lived access token
 *     (HMAC over video id + expiry + a fingerprint of the stored password, so
 *     changing the password revokes outstanding tokens).
 *   - Videos without a password are unaffected.
 *
 * Remaining limitation: media files themselves (/uploads/* or a CDN URL) are not
 * signed, so anyone who already has the raw media URL can still fetch it.
 */

import crypto from "crypto";

const SCRYPT_PREFIX = "scrypt$";
const KEYLEN = 32;
export const VIDEO_ACCESS_TTL_SECONDS = 6 * 60 * 60; // 6h

export function isVideoProtected(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.length > 0;
}

export function hashVideoPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEYLEN);
  return `${SCRYPT_PREFIX}${salt.toString("hex")}$${hash.toString("hex")}`;
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verify a candidate password against the stored value (scrypt hash or legacy plaintext). */
export function verifyVideoPassword(stored: string | null | undefined, candidate: unknown): boolean {
  if (!isVideoProtected(stored) || typeof candidate !== "string" || candidate.length === 0 || candidate.length > 512) {
    return false;
  }
  const value = stored as string;
  if (value.startsWith(SCRYPT_PREFIX)) {
    const [, saltHex, hashHex] = value.split("$");
    if (!saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(candidate, Buffer.from(saltHex, "hex"), expected.length || KEYLEN);
    return safeEqual(actual, expected);
  }
  // Legacy plaintext value written by the old UI: compare digests in constant time.
  const a = crypto.createHash("sha256").update(value).digest();
  const b = crypto.createHash("sha256").update(candidate).digest();
  return safeEqual(a, b);
}

let processKey: Buffer | null = null;
function accessKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) {
    return Buffer.from(crypto.hkdfSync("sha256", secret, "oravini-video-access", "video-access-token-v1", 32));
  }
  // No usable secret (dev): per-process random key; tokens expire on restart.
  if (!processKey) processKey = crypto.randomBytes(32);
  return processKey;
}

function fingerprint(stored: string): string {
  return crypto.createHash("sha256").update(stored).digest("hex").slice(0, 16);
}

function sign(videoId: string, exp: number, stored: string): string {
  return crypto.createHmac("sha256", accessKey()).update(`${videoId}.${exp}.${fingerprint(stored)}`).digest("base64url");
}

export function createVideoAccessToken(videoId: string, stored: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const exp = nowSec + VIDEO_ACCESS_TTL_SECONDS;
  return `${exp}.${sign(videoId, exp, stored)}`;
}

export function verifyVideoAccessToken(
  videoId: string,
  stored: string | null | undefined,
  token: unknown,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!isVideoProtected(stored) || typeof token !== "string" || token.length > 256) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isInteger(exp) || exp < nowSec) return false;
  const expected = Buffer.from(sign(videoId, exp, stored as string));
  return safeEqual(Buffer.from(token.slice(dot + 1)), expected);
}

/** Normalise a password value from an owner PATCH: hash new values, clear on null/"". */
export function passwordFieldForStorage(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value);
  return s.length === 0 ? null : hashVideoPassword(s);
}
