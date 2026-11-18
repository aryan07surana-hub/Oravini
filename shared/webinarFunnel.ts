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
