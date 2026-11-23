import { createHash, createHmac } from "node:crypto";
import { UnifiedConfig, UnifiedError } from "./instagramUnifiedCore";
export type PublishAsset = { url: string; kind: "IMAGE" | "VIDEO"; sha256?: string };
export type PublishDraft = { type: "IMAGE" | "REELS" | "CAROUSEL"; caption: string; assets: PublishAsset[]; accountId: string; scheduledAt: string; timezone: string };
export function validateDraft(value: any, now = Date.now()): PublishDraft {
  if (!value || !["IMAGE", "REELS", "CAROUSEL"].includes(value.type) || typeof value.caption !== "string" || [...value.caption].length > 2200 || !/^\d+$/.test(value.accountId)) throw new UnifiedError("draft_invalid");
  if (!Array.isArray(value.assets) || value.assets.length < (value.type === "CAROUSEL" ? 2 : 1) || value.assets.length > (value.type === "CAROUSEL" ? 20 : 1)) throw new UnifiedError("assets_invalid");
  const assets = value.assets.map((a: any) => {
    if (!a || !["IMAGE", "VIDEO"].includes(a.kind)) throw new UnifiedError("assets_invalid");
    let u: URL; try { u = new URL(a.url); } catch { throw new UnifiedError("media_url_invalid"); }
    if (u.protocol !== "https:" || u.username || u.password || u.port || u.hash || u.href.length > 4096) throw new UnifiedError("media_url_invalid");
    return { kind: a.kind, url: u.href };
  });
  if ((value.type === "IMAGE" && assets[0].kind !== "IMAGE") || (value.type === "REELS" && assets[0].kind !== "VIDEO")) throw new UnifiedError("assets_invalid");
  // Offset-bearing instants are required. Browser wall time must be converted before submitting.
  if (typeof value.scheduledAt !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(value.scheduledAt)) throw new UnifiedError("time_invalid");
  const at = Date.parse(value.scheduledAt);
  if (!Number.isFinite(at) || at < now + 60000 || at > now + 90 * 86400000) throw new UnifiedError("time_invalid");
  try { new Intl.DateTimeFormat("en", { timeZone: value.timezone }).format(); } catch { throw new UnifiedError("timezone_invalid"); }
  if (typeof value.timezone !== "string" || !value.timezone) throw new UnifiedError("timezone_invalid");
  return { type: value.type, caption: value.caption, assets, accountId: value.accountId, scheduledAt: new Date(at).toISOString(), timezone: value.timezone };
}
export function allowedMediaUrl(value: string, env = process.env): URL {
  let u: URL; try { u = new URL(value); } catch { throw new UnifiedError("media_url_invalid"); }
  const allowed = (env.INSTAGRAM_PUBLISH_MEDIA_HOSTS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (u.protocol !== "https:" || u.username || u.password || u.port || u.hash || !allowed.includes(u.hostname.toLowerCase()) || /^(localhost|.*\.local|.*\.internal|[\d.]+|\[.*\])$/.test(u.hostname)) throw new UnifiedError("media_host_not_allowed");
  // Ephemeral application uploads are never accepted as scheduled assets.
  if (["oravini.com", "www.oravini.com"].includes(u.hostname) && u.pathname.startsWith("/uploads/")) throw new UnifiedError("durable_media_required");
  return u;
}
export async function inspectAsset(asset: PublishAsset, env = process.env, fetcher: typeof fetch = fetch) {
  const url = allowedMediaUrl(asset.url, env);
  let response: Response; try { response = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(15000) }); } catch { throw new UnifiedError("media_fetch_failed", 422); }
  if (!response.ok || !response.body) throw new UnifiedError("media_fetch_failed", 422);
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const total = Number(response.headers.get("content-range")?.split("/")[1] || response.headers.get("content-length"));
  const max = asset.kind === "IMAGE" ? 8 * 1024 * 1024 : 300 * 1024 * 1024;
  if (!Number.isFinite(total) || total <= 0 || total > max) { await response.body.cancel(); throw new UnifiedError("media_size_invalid", 422); }
  const reader = response.body.getReader(), hash = createHash("sha256"); let bytes = new Uint8Array(), received = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      received += part.value.length;
      if (received > max) throw new UnifiedError("media_size_invalid", 422);
      hash.update(part.value);
      if (bytes.length < 65536) { const next = new Uint8Array(Math.min(65536, bytes.length + part.value.length)); next.set(bytes); next.set(part.value.subarray(0, next.length - bytes.length), bytes.length); bytes = next; }
    }
  } catch (e) { if (e instanceof UnifiedError) throw e; throw new UnifiedError("media_fetch_failed", 422); } finally { await reader.cancel(); }
  if (received !== total) throw new UnifiedError("media_fetch_failed", 422);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const mp4 = bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  if (asset.kind === "IMAGE" ? type !== "image/jpeg" || !jpeg : type !== "video/mp4" || !mp4) throw new UnifiedError("media_type_invalid", 422);
  const digest = hash.digest("hex");
  if (asset.sha256 && asset.sha256 !== digest) throw new UnifiedError("media_changed_confirm_again", 422);
  return digest;
}
export class PublishingGraph {
  constructor(private config: UnifiedConfig, private token: string, private fetcher: typeof fetch = fetch) {}
  async request(path: string, params: Record<string, string> = {}, write = false) {
    const url = new URL(`https://graph.facebook.com/${this.config.version}/${path}`);
    const data = new URLSearchParams({ ...params, appsecret_proof: createHmac("sha256", this.config.secret).update(this.token).digest("hex") });
    if (!write) url.search = data.toString();
    let response: Response;
    try { response = await this.fetcher(url, { method: write ? "POST" : "GET", headers: { Authorization: `Bearer ${this.token}`, ...(write ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) }, ...(write ? { body: data } : {}), redirect: "error", signal: AbortSignal.timeout(20000) }); } catch { throw new UnifiedError(write ? "meta_write_unknown" : "meta_unavailable", 502); }
    let result: any; try { result = await response.json(); } catch { throw new UnifiedError(write ? "meta_write_unknown" : "meta_unavailable", 502); }
    if (!response.ok || result.error) {
      if (Number(result.error?.code) === 190) throw new UnifiedError("reconnect_required", 401);
      if ([10, 200].includes(Number(result.error?.code))) throw new UnifiedError("publishing_permission_missing", 403);
      throw new UnifiedError(write && response.status >= 500 ? "meta_write_unknown" : "meta_publish_rejected", 422);
    }
    return result;
  }
  async create(account: string, asset: PublishAsset, caption: string, carousel = false) {
    const result = await this.request(`${account}/media`, { ...(asset.kind === "IMAGE" ? { image_url: asset.url } : { video_url: asset.url, media_type: carousel ? "VIDEO" : "REELS" }), ...(carousel ? { is_carousel_item: "true" } : { caption }) }, true);
    if (!/^\d+$/.test(result.id)) throw new UnifiedError("meta_write_unknown", 502); return result.id as string;
  }
  async carousel(account: string, children: string[], caption: string) { const r = await this.request(`${account}/media`, { media_type: "CAROUSEL", children: children.join(","), caption }, true); if (!/^\d+$/.test(r.id)) throw new UnifiedError("meta_write_unknown", 502); return r.id as string; }
  async status(id: string) { const r = await this.request(id, { fields: "status_code" }); return r.status_code as string; }
  async publish(account: string, id: string) { const r = await this.request(`${account}/media_publish`, { creation_id: id }, true); if (!/^\d+$/.test(r.id)) throw new UnifiedError("meta_write_unknown", 502); return r.id as string; }
}
