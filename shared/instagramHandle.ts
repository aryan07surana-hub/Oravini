// Shared Instagram handle / profile-URL normalizer (client + server).
//
// Users paste all sorts of things into "handle" fields: "@foo", "foo",
// "instagram.com/foo", "https://www.instagram.com/foo/?hl=en", or even a reel
// link off a profile ("instagram.com/foo/reel/abc"). Older per-file normalizers
// only recognised a leading "http", so "instagram.com/foo" became
// "https://www.instagram.com/instagram.com/foo/" and the scrape failed silently.
// Everything that accepts a handle should go through this module.

// First path segments that are Instagram routes, never usernames.
const RESERVED_PATHS = new Set([
  "p", "reel", "reels", "tv", "explore", "stories", "direct", "accounts", "emails",
  "help", "about", "blog", "developer", "developers", "api", "legal", "privacy",
  "web", "challenge", "session", "nametag", "directory", "lite", "s", "ar", "oauth",
]);

const IG_HOST_RE = /^(?:[a-z0-9-]+\.)*(?:instagram\.com|instagr\.am)$/i;
// Instagram usernames: letters, digits, "." and "_", up to 30 chars.
const HANDLE_RE = /^[a-z0-9._]{1,30}$/i;

/**
 * Normalize any handle-ish input to a bare, lower-cased Instagram username
 * (no "@", no domain, no slashes). Returns "" when no valid handle is present
 * (empty input, a non-Instagram URL, or a bare post/reel link with no username).
 */
export function normalizeInstagramHandle(input: unknown): string {
  if (input == null) return "";
  let s = String(input).trim().replace(/\s+/g, "");
  if (!s) return "";

  // Strip protocol.
  const hadProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(s);
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  // Strip query / fragment.
  s = s.replace(/[?#].*$/, "");

  const firstSlash = s.indexOf("/");
  const head = firstSlash === -1 ? s : s.slice(0, firstSlash);
  const looksLikeDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(head);
  let segments: string[];
  if (IG_HOST_RE.test(head)) {
    // "www.instagram.com/foo/..." (or bare "instagram.com" → no handle)
    segments = s.slice(head.length).split("/").filter(Boolean);
  } else if (looksLikeDomain && (hadProtocol || firstSlash !== -1)) {
    // Some other site ("tiktok.com/foo") — not an Instagram profile.
    return "";
  } else {
    // Bare handle ("@foo", "foo", "foo.bar") or a path ("/foo/").
    segments = s.split("/").filter(Boolean);
  }

  // Repair already-doubled input ("instagram.com/instagram.com/foo").
  while (segments.length && IG_HOST_RE.test(segments[0])) segments.shift();
  if (!segments.length) return "";
  let first = segments[0].replace(/^@+/, "");
  // "/stories/<handle>/<id>" carries the username in the second segment.
  if (first.toLowerCase() === "stories" && segments[1]) first = segments[1].replace(/^@+/, "");
  else if (RESERVED_PATHS.has(first.toLowerCase())) return "";

  first = first.replace(/^@+/, "");
  if (!HANDLE_RE.test(first)) return "";
  return first.toLowerCase();
}

/** Canonical profile URL for a bare handle (the format Apify expects). */
export function instagramProfileUrl(handle: string): string {
  return `https://www.instagram.com/${handle}/`;
}

/** Normalize any handle-ish input straight to a canonical profile URL ("" if invalid). */
export function normalizeInstagramProfileUrl(input: unknown): string {
  const h = normalizeInstagramHandle(input);
  return h ? instagramProfileUrl(h) : "";
}
