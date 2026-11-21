/**
 * Encrypt/decrypt helpers for youtube_tokens rows. Reuses the AES-256-GCM
 * encryptToken/decryptToken used for Meta tokens. decryptToken returns values
 * that aren't in iv:tag:ciphertext form unchanged, so rows written before
 * encryption was added (plaintext) keep working, and get encrypted the next
 * time the token is refreshed or reconnected.
 */
import { encryptToken, decryptToken } from "./security/tokenEncryption";

type TokenFields = { accessToken: string; refreshToken: string | null };

export function encryptYoutubeTokenFields<T extends TokenFields>(data: T): T {
  return {
    ...data,
    accessToken: encryptToken(data.accessToken),
    refreshToken: data.refreshToken ? encryptToken(data.refreshToken) : null,
  };
}

export function decryptYoutubeTokenRow<T extends TokenFields>(row: T): T {
  return {
    ...row,
    accessToken: decryptToken(row.accessToken),
    refreshToken: row.refreshToken ? decryptToken(row.refreshToken) : null,
  };
}
