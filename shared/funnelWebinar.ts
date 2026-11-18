// Webinar step settings for the funnel builder (funnel_steps.webinar JSONB).
// Shared by the server (validation) and client (builder panel + public page).
import { parseYouTubeVideoId } from "./webinarFunnel";

export const FUNNEL_WEBINAR_STATUSES = ["scheduled", "live", "ended"] as const;
export type FunnelWebinarStatus = (typeof FUNNEL_WEBINAR_STATUSES)[number];

export type FunnelWebinarSettings = {
  title: string;
  /** UTC ISO string */
  scheduledAt: string;
  /** 11-char YouTube video id (parsed from any YouTube URL on save) */
  youtubeId: string | null;
  hostName: string;
  replayAvailable: boolean;
  offerCta: { label: string; url: string };
  /** Host-controlled state. "scheduled" auto-goes live at scheduledAt. */
  status: FunnelWebinarStatus;
};

/** What the public page shows right now. */
export type FunnelWebinarPhase = "registration" | "live" | "replay" | "ended";

export function defaultFunnelWebinar(title = "Live Webinar", now = Date.now()): FunnelWebinarSettings {
  const d = new Date(now + 7 * 86_400_000);
  d.setUTCMinutes(0, 0, 0);
  return {
    title,
    scheduledAt: d.toISOString(),
    youtubeId: null,
    hostName: "",
    replayAvailable: true,
    offerCta: { label: "", url: "" },
    status: "scheduled",
  };
}

const isHttpUrl = (u: unknown): u is string => typeof u === "string" && /^https?:\/\/\S+$/i.test(u.trim());

/**
 * Validates + normalises an untrusted (partial) settings object, merged over `base`.
 * Returns { ok:false, message } for invalid input instead of throwing.
 * Accepts `youtubeUrl` or `youtubeId` (any YouTube link or bare id).
 */
export function normalizeFunnelWebinar(
  input: any,
  base: FunnelWebinarSettings | null | undefined,
): { ok: true; value: FunnelWebinarSettings } | { ok: false; message: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, message: "webinar must be an object" };
  const cur: FunnelWebinarSettings = { ...defaultFunnelWebinar(), ...(base || {}) };
  const out: FunnelWebinarSettings = { ...cur, offerCta: { ...cur.offerCta } };

  if (input.title !== undefined) {
    const t = String(input.title ?? "").trim();
    if (!t) return { ok: false, message: "Webinar title is required" };
    out.title = t.slice(0, 200);
  }
  if (input.scheduledAt !== undefined) {
    const ms = Date.parse(String(input.scheduledAt));
    if (isNaN(ms)) return { ok: false, message: "Invalid webinar date/time" };
    out.scheduledAt = new Date(ms).toISOString();
  }
  const yt = input.youtubeUrl !== undefined ? input.youtubeUrl : input.youtubeId;
  if (yt !== undefined) {
    if (yt === null || String(yt).trim() === "") out.youtubeId = null;
    else {
      const id = parseYouTubeVideoId(String(yt));
      if (!id) return { ok: false, message: "Couldn't find a YouTube video ID in that link" };
      out.youtubeId = id;
    }
  }
  if (input.hostName !== undefined) out.hostName = String(input.hostName ?? "").trim().slice(0, 120);
  if (input.replayAvailable !== undefined) out.replayAvailable = !!input.replayAvailable;
  if (input.offerCta !== undefined) {
    const c = input.offerCta || {};
    const label = String(c.label ?? "").trim().slice(0, 120);
    const url = String(c.url ?? "").trim();
    if (url && !isHttpUrl(url)) return { ok: false, message: "Offer URL must start with http:// or https://" };
    out.offerCta = { label, url };
  }
  if (input.status !== undefined) {
    if (!FUNNEL_WEBINAR_STATUSES.includes(input.status)) return { ok: false, message: "status must be scheduled, live or ended" };
    out.status = input.status;
  }
  return { ok: true, value: out };
}

/**
 * scheduled + before scheduledAt → registration
 * scheduled + at/after scheduledAt, or status live → live
 * ended → replay (if replayAvailable and a video is set) else ended
 */
export function getFunnelWebinarPhase(w: FunnelWebinarSettings, now = Date.now()): FunnelWebinarPhase {
  if (w.status === "ended") return w.replayAvailable && w.youtubeId ? "replay" : "ended";
  if (w.status === "live") return "live";
  return new Date(w.scheduledAt).getTime() <= now ? "live" : "registration";
}

export function hasOfferCta(w: FunnelWebinarSettings): boolean {
  return !!w.offerCta?.label && isHttpUrl(w.offerCta?.url);
}

const IST_OFFSET_MIN = 330;
/** UTC ISO → "YYYY-MM-DDTHH:mm" wall-clock in IST (for datetime-local inputs). Same convention as the webinar funnel editor. */
export function isoToISTInput(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 16);
}
/** "YYYY-MM-DDTHH:mm" interpreted as IST → UTC ISO, or null. */
export function istInputToIso(value: string): string | null {
  const d = new Date(`${value}:00+05:30`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
