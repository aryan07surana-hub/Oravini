/**
 * Signed OAuth `state` for the YouTube connect flow.
 *
 * The state carries the Oravini user id and an optional in-app return path so
 * the callback can send the user back to where they started (e.g. the webinar
 * wizard). It is HMAC-signed so the callback can't be tricked into storing a
 * token under someone else's account, and it expires after 15 minutes.
 */
import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE_MS = 15 * 60 * 1000;
export const DEFAULT_YOUTUBE_RETURN = "/youtube-scheduler";

function secret(): string {
  return process.env.SESSION_SECRET || process.env.TOKEN_ENCRYPTION_KEY || "oravini-dev-youtube-oauth-state";
}

/**
 * Only same-origin, absolute in-app paths are allowed as return targets.
 * Rejects protocol-relative URLs ("//evil.com"), backslash tricks and full URLs.
 */
export function safeReturnPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim();
  if (!v || v.length > 300) return null;
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(v)) return null;
  return v;
}

/** Appends a query param to an in-app path, keeping any existing query string. */
export function withQuery(path: string, key: string, value: string): string {
  const [base, hash = ""] = path.split("#");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}${hash ? `#${hash}` : ""}`;
}

export function signYoutubeState(userId: string, returnTo?: string | null, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, r: safeReturnPath(returnTo) || undefined, t: now })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyYoutubeState(state: string | undefined, now = Date.now()): { userId: string; returnTo: string } | null {
  if (!state || typeof state !== "string") return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.u || typeof data.u !== "string") return null;
    if (typeof data.t !== "number" || now - data.t > MAX_AGE_MS || data.t - now > 60_000) return null;
    return { userId: data.u, returnTo: safeReturnPath(data.r) || DEFAULT_YOUTUBE_RETURN };
  } catch {
    return null;
  }
}

/**
 * The combined webinar + scheduler integration needs one scope. Google's
 * YouTube v3 discovery schema lists force-ssl for every method called here:
 * channels.list, videos.list/insert, liveBroadcasts.insert/update/list/bind,
 * liveStreams.insert/list. Separate upload + readonly grants are redundant.
 * Existing stored grants are preserved. This only affects future consent.
 */
export const YOUTUBE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
];
