/**
 * Shared media storage layer.
 *
 *   saveMedia(bufferOrPath, filename) -> public URL
 *
 * - If Cloudinary credentials are present (CLOUDINARY_URL, or
 *   CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET), the file
 *   is uploaded to Cloudinary (resource_type "auto") and the secure URL is returned.
 * - Otherwise the file lives in the local uploads dir and `/uploads/<file>` is
 *   returned, exactly like the existing multer-based uploads.
 * - If a Cloudinary upload fails for any reason we log it and fall back to the
 *   local file, so an outage never breaks an upload.
 *
 * Uses Cloudinary's signed REST upload API via fetch, so no extra dependency is needed.
 *
 * NOTE: Currently used by the webinar recording upload endpoint. The video editor,
 * clip finder, video studio and screen-recording uploads still write to
 * /uploads directly and can migrate to saveMedia() later.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

export const UPLOADS_DIR = path.resolve("uploads");

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    // Format: cloudinary://<api_key>:<api_secret>@<cloud_name>
    try {
      const parsed = new URL(url);
      const apiKey = decodeURIComponent(parsed.username);
      const apiSecret = decodeURIComponent(parsed.password);
      const cloudName = parsed.hostname;
      if (apiKey && apiSecret && cloudName) return { cloudName, apiKey, apiSecret };
    } catch {
      console.warn("[mediaStorage] CLOUDINARY_URL is set but could not be parsed — using local uploads.");
    }
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
  return null;
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

function safeFilename(filename: string): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || `media-${Date.now()}`;
}

/** Ensure the file exists in the local uploads dir; returns the local filename. */
async function ensureLocal(bufferOrPath: Buffer | string, filename: string): Promise<string> {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  if (typeof bufferOrPath === "string") {
    const abs = path.resolve(bufferOrPath);
    // Already inside uploads/ (e.g. written by multer) — reuse as-is.
    if (path.dirname(abs) === UPLOADS_DIR) return path.basename(abs);
    const name = safeFilename(filename);
    await fs.promises.copyFile(abs, path.join(UPLOADS_DIR, name));
    return name;
  }

  const name = safeFilename(filename);
  await fs.promises.writeFile(path.join(UPLOADS_DIR, name), bufferOrPath);
  return name;
}

async function uploadToCloudinary(cfg: CloudinaryConfig, data: Buffer | Blob, filename: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_FOLDER || "oravini";
  const publicId = path.parse(safeFilename(filename)).name;

  // Signature: sorted params (excluding file, api_key, resource_type) + secret, SHA-1.
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${cfg.apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const form = new FormData();
  form.append("file", data instanceof Blob ? data : new Blob([new Uint8Array(data)]), safeFilename(filename));
  form.append("api_key", cfg.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/auto/upload`, {
    method: "POST",
    body: form,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json?.secure_url) {
    throw new Error(json?.error?.message || `Cloudinary upload failed with HTTP ${res.status}`);
  }
  return json.secure_url as string;
}

async function fileBlob(p: string): Promise<Blob> {
  const anyFs = fs as any;
  if (typeof anyFs.openAsBlob === "function") return anyFs.openAsBlob(p);
  return new Blob([new Uint8Array(await fs.promises.readFile(p))]);
}

export interface SaveMediaOptions {
  /** Delete the local copy after a successful Cloudinary upload (default true for paths inside uploads/). */
  removeLocalAfterUpload?: boolean;
}

/**
 * Persist a media file and return a URL that can be served to browsers.
 * Never throws because of Cloudinary — it falls back to local storage instead.
 */
export async function saveMedia(
  bufferOrPath: Buffer | string,
  filename: string,
  opts: SaveMediaOptions = {},
): Promise<string> {
  const cfg = getCloudinaryConfig();

  if (cfg) {
    try {
      // Paths are streamed from disk (file-backed Blob) so large videos are
      // never copied into memory on the 512MB free-tier instance.
      const data = typeof bufferOrPath === "string"
        ? await fileBlob(bufferOrPath)
        : bufferOrPath;
      const url = await uploadToCloudinary(cfg, data, filename);
      if (typeof bufferOrPath === "string" && opts.removeLocalAfterUpload !== false) {
        const abs = path.resolve(bufferOrPath);
        if (path.dirname(abs) === UPLOADS_DIR) {
          fs.promises.unlink(abs).catch(() => {});
        }
      }
      return url;
    } catch (err: any) {
      console.error(`[mediaStorage] Cloudinary upload failed, falling back to local uploads: ${err.message}`);
    }
  }

  const localName = await ensureLocal(bufferOrPath, filename);
  return `/uploads/${localName}`;
}
