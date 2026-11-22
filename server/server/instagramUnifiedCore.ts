import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const IG_UNIFIED_APP_ID = "40085646374415585";
export const IG_UNIFIED_CALLBACK = "/api/instagram/unified/callback";
export const IG_UNIFIED_HOME = "/tracking/content/instagram/insights";
export type InstagramAccount = { id: string; username: string };
export type UnifiedConfig = { appId: string; secret: string; configId: string; redirectUri: string; version: string; encryptionKey: string };
export class UnifiedError extends Error {
  constructor(public code: string, public httpStatus = 400) { super(code); }
}
export function readUnifiedConfig(env = process.env): UnifiedConfig {
  const appId = env.INSTAGRAM_UNIFIED_APP_ID || IG_UNIFIED_APP_ID;
  const secret = env.INSTAGRAM_UNIFIED_APP_SECRET || "";
  const configId = env.INSTAGRAM_UNIFIED_CONFIG_ID || "";
  const version = env.INSTAGRAM_UNIFIED_GRAPH_VERSION || "v27.0";
  const encryptionKey = env.INSTAGRAM_UNIFIED_TOKEN_ENCRYPTION_KEY || env.TOKEN_ENCRYPTION_KEY || "";
  const redirectUri = env.INSTAGRAM_UNIFIED_REDIRECT_URI || `https://oravini.com${IG_UNIFIED_CALLBACK}`;
  // Never fall back to META_APP_*: those belong to the separate messaging app.
  if (appId !== IG_UNIFIED_APP_ID || !secret || !/^\d+$/.test(configId) || !/^v\d+\.0$/.test(version) || !/^[a-f\d]{64}$/i.test(encryptionKey)) throw new UnifiedError("not_configured", 503);
  const callback = new URL(redirectUri);
  if (callback.protocol !== "https:" || callback.pathname !== IG_UNIFIED_CALLBACK || callback.username || callback.password || callback.search || callback.hash) throw new UnifiedError("not_configured", 503);
  // The Meta configuration must be reviewed for its actual permissions first.
  if (env.INSTAGRAM_UNIFIED_CONFIG_APPROVED !== "true") throw new UnifiedError("configuration_pending", 503);
  return { appId, secret, configId, redirectUri, version, encryptionKey };
}
export function authorizationUrl(config: UnifiedConfig, state: string) {
  const url = new URL("https://www.facebook.com/dialog/oauth");
  for (const [k, v] of Object.entries({ client_id: config.appId, config_id: config.configId, redirect_uri: config.redirectUri, response_type: "code", prompt: "login", state })) url.searchParams.set(k, v);
  // Permissions come only from the separately approved Unified Login config.
  return url.href;
}
export const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
export const newState = () => randomBytes(32).toString("hex");
export function sealToken(token: string, key: string): string {
  if (!/^[a-f\d]{64}$/i.test(key)) throw new UnifiedError("encryption_unavailable", 503);
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["ig1", iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}
export function openToken(stored: string, key: string): string {
  if (!/^[a-f\d]{64}$/i.test(key)) throw new UnifiedError("encryption_unavailable", 503);
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "ig1" || !/^[a-f\d]{24}$/i.test(parts[1]) || !/^[a-f\d]{32}$/i.test(parts[2]) || !/^(?:[a-f\d]{2})+$/i.test(parts[3])) throw new UnifiedError("stored_token_invalid", 503);
  try {
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), Buffer.from(parts[1], "hex"));
    decipher.setAuthTag(Buffer.from(parts[2], "hex"));
    return Buffer.concat([decipher.update(Buffer.from(parts[3], "hex")), decipher.final()]).toString("utf8");
  } catch { throw new UnifiedError("stored_token_invalid", 503); }
}
export function metricValue(response: any, name: string): number | null {
  const entry = Array.isArray(response?.data) ? response.data.find((x: any) => x?.name === name) : null;
  const value = entry?.values?.[0]?.value ?? entry?.total_value?.value;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
export function safeInstagramUrl(value: unknown): string | null {
  try { const url = new URL(String(value)); return url.protocol === "https:" && ["instagram.com", "www.instagram.com"].includes(url.hostname) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export class UnifiedGraph {
  constructor(private config: UnifiedConfig, private fetcher: typeof fetch = fetch) {}
  private async request(path: string, token: string | null, params: Record<string, string> = {}) {
    const url = new URL(`https://graph.facebook.com/${this.config.version}/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (token) url.searchParams.set("appsecret_proof", createHmac("sha256", this.config.secret).update(token).digest("hex"));
    let response: Response;
    try { response = await this.fetcher(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(15000), redirect: "error" }); }
    catch { throw new UnifiedError("meta_unavailable", 502); }
    let data: any;
    try { data = await response.json(); } catch { throw new UnifiedError("meta_unavailable", 502); }
    if (!response.ok || data?.error) {
      const code = Number(data?.error?.code);
      if (code === 190) throw new UnifiedError("reconnect_required", 401);
      if (response.status === 429 || [4, 17, 32, 613, 80004].includes(code)) throw new UnifiedError("meta_rate_limited", 429);
      if ([10, 200].includes(code)) throw new UnifiedError("permission_missing", 403);
      throw new UnifiedError("metric_unavailable", 422);
    }
    return data;
  }
  async exchange(code: string) {
    const data = await this.request("oauth/access_token", null, { client_id: this.config.appId, client_secret: this.config.secret, redirect_uri: this.config.redirectUri, code });
    if (typeof data.access_token !== "string" || !data.access_token) throw new UnifiedError("token_exchange_failed", 502);
    const seconds = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : null;
    return { token: data.access_token as string, expiresAt: seconds ? new Date(Date.now() + seconds * 1000) : null };
  }
  async discover(token: string) {
    const identity = await this.request("me", token, { fields: "id,client_business_id" });
    if (!/^\d+$/.test(identity.client_business_id ?? "") || !/^\d+$/.test(identity.id ?? "")) throw new UnifiedError("business_portfolio_required", 422);
    const accounts: InstagramAccount[] = []; let after = "";
    for (let page = 0; page < 10; page++) {
      const data = await this.request("me/assigned_instagram_accounts", token, { fields: "id,username", limit: "100", ...(after ? { after } : {}) });
      for (const account of data.data ?? []) if (/^\d+$/.test(account?.id ?? "") && typeof account.username === "string" && !accounts.some(x => x.id === account.id)) accounts.push({ id: account.id, username: account.username.slice(0, 100) });
      if (!data.paging?.next) return { businessId: String(identity.client_business_id), subjectId: String(identity.id), accounts };
      after = data.paging?.cursors?.after;
      if (typeof after !== "string" || !after || after.length > 4096) throw new UnifiedError("account_discovery_failed", 502);
    }
    throw new UnifiedError("too_many_accounts", 422);
  }
  async recentMedia(token: string, accountId: string) {
    if (!/^\d+$/.test(accountId)) throw new UnifiedError("account_invalid");
    const data = await this.request(`${accountId}/media`, token, { fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count", limit: "3" });
    const media: any[] = [];
    for (const post of (Array.isArray(data.data) ? data.data : []).slice(0, 3)) {
      if (!/^\d+$/.test(post?.id ?? "")) continue;
      const metrics: Record<string, number | null> = { likes: typeof post.like_count === "number" ? post.like_count : null, comments: typeof post.comments_count === "number" ? post.comments_count : null };
      const names = ["views", "reach", "saved", "shares", ...(post.media_product_type === "REELS" ? ["reels_skip_rate"] : [])];
      for (const name of names) {
        try { metrics[name] = metricValue(await this.request(`${post.id}/insights`, token, { metric: name }), name); }
        catch (error) {
          if (!(error instanceof UnifiedError) || ["reconnect_required", "meta_rate_limited", "meta_unavailable"].includes(error.code)) throw error;
          metrics[name] = null;
        }
      }
      media.push({ id: post.id, caption: typeof post.caption === "string" ? post.caption.slice(0, 2200) : "", mediaType: post.media_product_type || post.media_type || "Unknown", permalink: safeInstagramUrl(post.permalink), timestamp: typeof post.timestamp === "string" ? post.timestamp : null, metrics });
    }
    return media;
  }
}

// Used only with this new Meta app's secret, never the messaging app's secret.
export function verifyUnifiedSignedRequest(value: unknown, secret: string): { userId: string } {
  if (!secret) throw new UnifiedError("not_configured", 503);
  if (typeof value !== "string" || value.length > 16384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) throw new UnifiedError("signature_invalid", 403);
  const [signature, encoded] = value.split(".");
  const actual = Buffer.from(signature, "base64url"), expected = createHmac("sha256", secret).update(encoded).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnifiedError("signature_invalid", 403);
  let data: any;
  try { data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); } catch { throw new UnifiedError("signature_invalid", 403); }
  if (data.algorithm !== "HMAC-SHA256" || !/^\d+$/.test(data.user_id ?? "")) throw new UnifiedError("signature_invalid", 403);
  if (data.issued_at && (!Number.isFinite(data.issued_at) || data.issued_at > Date.now()/1000 + 300)) throw new UnifiedError("signature_invalid", 403);
  // Old signed deletion retries are safe and intentionally idempotent.
  return { userId: String(data.user_id) };
    }
