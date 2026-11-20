// Opens the existing Meta OAuth flow (/api/oauth/meta/connect — unchanged) in a
// popup so the DM Automation page can keep polling for the connection. Falls back
// to a full-page redirect when the browser blocks popups.
export const META_CONNECT_URL = "/api/oauth/meta/connect";

let lastPopup: Window | null = null;

export function openMetaConnect(): "popup" | "redirect" {
  const w = 620;
  const h = 760;
  const left = Math.max(0, (window.screenX ?? 0) + ((window.outerWidth ?? w) - w) / 2);
  const top = Math.max(0, (window.screenY ?? 0) + ((window.outerHeight ?? h) - h) / 2);
  const popup = window.open(META_CONNECT_URL, "oravini-meta-connect", `width=${w},height=${h},left=${left},top=${top}`);
  if (!popup) {
    window.location.href = META_CONNECT_URL;
    return "redirect";
  }
  lastPopup = popup;
  popup.focus();
  return "popup";
}

/** Close the connect popup once we've detected the connection (it lands on our own /dashboard). */
export function closeMetaConnectPopup(): void {
  try {
    if (lastPopup && !lastPopup.closed) lastPopup.close();
  } catch { /* cross-origin while still on facebook.com — leave it */ }
  lastPopup = null;
}
