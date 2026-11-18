/**
 * UTM capture for public lead forms.
 * Reads utm_source / utm_medium / utm_campaign from the current URL and remembers
 * them for the browser tab (sessionStorage) so they survive in-funnel navigation
 * (e.g. /f/:slug?utm_source=ig → /f/:slug/thank-you).
 */
const KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
const STORE_KEY = "oravini:utm";

export type UtmParams = Partial<Record<(typeof KEYS)[number], string>>;

export function getUtmParams(): UtmParams {
  const fromUrl: UtmParams = {};
  try {
    const qs = new URLSearchParams(window.location.search);
    for (const k of KEYS) {
      const v = qs.get(k)?.trim();
      if (v) fromUrl[k] = v.slice(0, 200);
    }
  } catch {}
  if (Object.keys(fromUrl).length) {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(fromUrl)); } catch {}
    return fromUrl;
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
    if (saved && typeof saved === "object") {
      const out: UtmParams = {};
      for (const k of KEYS) if (typeof saved[k] === "string" && saved[k]) out[k] = saved[k];
      return out;
    }
  } catch {}
  return {};
}
