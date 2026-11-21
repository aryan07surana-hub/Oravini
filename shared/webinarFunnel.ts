// Shared helpers for the Webinar Funnel feature (used by client + server).

const YT_ID = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts an 11-char YouTube video ID from a bare ID or any standard YouTube URL:
 *   youtube.com/watch?v=ID, m.youtube.com/watch?v=ID, music.youtube.com/watch?v=ID
 *   youtu.be/ID, youtube.com/live/ID, youtube.com/embed/ID, youtube-nocookie.com/embed/ID,
 *   youtube.com/shorts/ID, youtube.com/v/ID, youtube.com/e/ID
 * Returns null if no valid ID can be found.
 */
export function parseYouTubeVideoId(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  if (YT_ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const id = segments[0];
    return id && YT_ID.test(id) ? id : null;
  }

  const isYouTube =
    host === "youtube.com" || host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com");
  if (!isYouTube) return null;

  const v = url.searchParams.get("v");
  if (v && YT_ID.test(v)) return v;

  if (segments.length >= 2 && ["live", "embed", "shorts", "v", "e"].includes(segments[0])) {
    const id = segments[1];
    if (YT_ID.test(id)) return id;
  }
  return null;
}

/** URL-safe slug from a title; caller appends a random suffix to guarantee uniqueness. */
export function slugifyWebinarTitle(title: string): string {
  return (
    String(title || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "webinar"
  );
}

export const WEBINAR_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

/** Format a date in India Standard Time, e.g. "Sat, 22 Nov 2026, 7:00 pm IST". */
export function formatIST(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return (
    d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " IST"
  );
}

// ── Slides / deck embeds ───────────────────────────────────────────────────
export type DeckEmbed =
  | { kind: "pdf" | "google" | "canva" | "other"; src: string; label: string }
  | null;

/**
 * Turns a deck link into something we can iframe on the live page.
 *   PDF (upload or any *.pdf URL) → used as-is
 *   Google Slides  docs.google.com/presentation/d/<id>/edit  → /d/<id>/embed
 *                  docs.google.com/presentation/d/e/<pubId>/pub → /d/e/<pubId>/embed
 *   Canva          canva.com/design/<id>/<key>/view|edit → …/view?embed
 * Returns null for empty/unsafe input.
 */
export function deckEmbed(input: string | null | undefined): DeckEmbed {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/^\/uploads\/[\w.\-]+$/i.test(raw)) return { kind: "pdf", src: raw, label: "PDF deck" };
  if (!/^https?:\/\//i.test(raw)) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segs = url.pathname.split("/").filter(Boolean);

  if (host === "docs.google.com" && segs[0] === "presentation" && segs[1] === "d") {
    if (segs[2] === "e" && segs[3]) {
      return { kind: "google", src: `https://docs.google.com/presentation/d/e/${segs[3]}/embed?start=false&loop=false`, label: "Google Slides" };
    }
    if (segs[2]) {
      return { kind: "google", src: `https://docs.google.com/presentation/d/${segs[2]}/embed?start=false&loop=false`, label: "Google Slides" };
    }
  }
  if ((host === "canva.com" || host.endsWith(".canva.com")) && segs[0] === "design" && segs[1]) {
    const base = `https://www.canva.com/design/${segs[1]}${segs[2] && segs[2] !== "view" && segs[2] !== "edit" ? `/${segs[2]}` : ""}/view`;
    return { kind: "canva", src: `${base}?embed`, label: "Canva" };
  }
  if (/\.pdf$/i.test(url.pathname)) return { kind: "pdf", src: url.toString(), label: "PDF deck" };
  return { kind: "other", src: url.toString(), label: "Slides" };
}

/** Validates a deck link for saving: our own /uploads/ path or an http(s) URL. */
export function isValidDeckUrl(input: string): boolean {
  const v = input.trim();
  return /^\/uploads\/[\w.\-]+$/i.test(v) || /^https?:\/\/[^\s]+$/i.test(v);
}

/**
 * Validates a CTA link: an http(s) URL, or a same-site path such as
 * "/book/strategy-call" (one of the owner's booking pages). Protocol-relative
 * "//host" and backslashes are rejected so a path can never leave the site.
 */
export function isValidCtaUrl(input: string | null | undefined): boolean {
  const v = (input || "").trim();
  return /^https?:\/\/[^\s]+$/i.test(v) || /^\/(?![\/\\])[^\s\\]*$/.test(v);
}

/** Same-site booking page path for a meeting type slug. */
export function bookingPagePath(slug: string): string {
  return `/book/${slug}`;
}

/** "Add to Google Calendar" link for a webinar (dates in UTC, YYYYMMDDTHHMMSSZ). */
export function googleCalendarUrl(opts: { title: string; start: string | Date; durationMinutes?: number | null; details?: string }): string | null {
  const start = new Date(opts.start);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (opts.durationMinutes && opts.durationMinutes > 0 ? opts.durationMinutes : 60) * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = [
    "action=TEMPLATE",
    `text=${encodeURIComponent(opts.title)}`,
    `dates=${fmt(start)}/${fmt(end)}`,
    ...(opts.details ? [`details=${encodeURIComponent(opts.details)}`] : []),
  ];
  return `https://calendar.google.com/calendar/render?${params.join("&")}`;
}

/** Where the public live page is right now. */
export type WebinarLivePhase = "waiting" | "live" | "replay";
export function webinarLivePhase(status: string, scheduledAt: string | Date, now = Date.now()): WebinarLivePhase {
  if (status === "ended") return "replay";
  return new Date(scheduledAt).getTime() <= now ? "live" : "waiting";
}
