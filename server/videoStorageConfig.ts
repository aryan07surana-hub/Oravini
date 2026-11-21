/**
 * Per-account "bring your own key" Cloudinary storage for hosted videos.
 *
 * - One row per user (UNIQUE user_id); rows are only ever read or written for
 *   the authenticated user's own id, so credentials are never shared.
 * - The API secret is encrypted at rest with server/security/tokenEncryption
 *   (AES-256-GCM, TOKEN_ENCRYPTION_KEY). Saving is refused if encryption is not
 *   available, so a secret is never stored in plaintext.
 * - The secret is write-only: getVideoStorageStatus() never returns it.
 */

import { pool } from "./storage";
import { encryptToken, decryptToken, isEncrypted } from "./security/tokenEncryption";
import type { CloudinaryConfig } from "./mediaStorage";

let tableReady: Promise<void> | null = null;

export function ensureVideoStorageTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS video_storage_configs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL DEFAULT 'cloudinary',
        cloud_name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        api_secret_enc TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `).then(() => undefined).catch(err => {
      tableReady = null; // retry on next call
      throw err;
    });
  }
  return tableReady;
}

export function isEncryptionAvailable(): boolean {
  return isEncrypted(encryptToken("probe"));
}

export interface VideoStorageStatus {
  configured: boolean;
  provider: "cloudinary";
  cloudName: string | null;
  apiKeyHint: string | null;
  updatedAt: string | null;
  encryptionAvailable: boolean;
}

function maskKey(key: string): string {
  return key.length <= 4 ? "••••" : `••••${key.slice(-4)}`;
}

export async function getVideoStorageStatus(userId: string): Promise<VideoStorageStatus> {
  await ensureVideoStorageTable();
  const r = await pool.query(
    "SELECT cloud_name, api_key, updated_at FROM video_storage_configs WHERE user_id = $1",
    [userId],
  );
  const row = r.rows[0];
  return {
    configured: !!row,
    provider: "cloudinary",
    cloudName: row?.cloud_name ?? null,
    apiKeyHint: row ? maskKey(decryptToken(row.api_key)) : null,
    updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
    encryptionAvailable: isEncryptionAvailable(),
  };
}

/** Decrypted credentials for server-side use only (uploads). Never send to clients. */
export async function getUserCloudinaryConfig(userId: string): Promise<CloudinaryConfig | null> {
  await ensureVideoStorageTable();
  const r = await pool.query(
    "SELECT cloud_name, api_key, api_secret_enc FROM video_storage_configs WHERE user_id = $1",
    [userId],
  );
  const row = r.rows[0];
  if (!row) return null;
  const apiSecret = decryptToken(row.api_secret_enc);
  // If decryption failed (key rotated/missing) the value comes back still encrypted — don't use it.
  if (!apiSecret || isEncrypted(apiSecret)) return null;
  return { cloudName: row.cloud_name, apiKey: decryptToken(row.api_key), apiSecret };
}

export async function saveUserCloudinaryConfig(userId: string, cfg: CloudinaryConfig): Promise<void> {
  if (!isEncryptionAvailable()) throw new Error("Encryption is not configured on this server; refusing to store credentials.");
  await ensureVideoStorageTable();
  await pool.query(
    `INSERT INTO video_storage_configs (user_id, provider, cloud_name, api_key, api_secret_enc, updated_at)
     VALUES ($1, 'cloudinary', $2, $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       cloud_name = EXCLUDED.cloud_name,
       api_key = EXCLUDED.api_key,
       api_secret_enc = EXCLUDED.api_secret_enc,
       updated_at = NOW()`,
    [userId, cfg.cloudName, encryptToken(cfg.apiKey), encryptToken(cfg.apiSecret)],
  );
}

export async function deleteUserCloudinaryConfig(userId: string): Promise<void> {
  await ensureVideoStorageTable();
  await pool.query("DELETE FROM video_storage_configs WHERE user_id = $1", [userId]);
}
