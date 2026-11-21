// Webinar event-time + status helpers (pure: no React/DOM, so they're unit-testable).
// Everything here derives from stored data (status, scheduledAt, durationMinutes) and
// the viewer's own clock/timezone — never invented numbers.

export const HOST_TIME_ZONE = "Asia/Kolkata"; // webinars are scheduled in IST (see formatIST)

export type FunnelStatus = "draft" | "published" | "ended";
export type FunnelDisplayStatus = "draft" | "scheduled" | "live" | "ended";

/**
 * What a webinar row "is" right now, matching what visitors see:
 *  draft → hidden · published + future → scheduled · published + started → live · ended → replay.
 */
export function funnelDisplayStatus(status: FunnelStatus | string, scheduledAt: string | Date, now = Date.now()): FunnelDisplayStatus {
  if (status === "draft") return "draft";
  if (status === "ended") return "ended";
  const t = new Date(scheduledAt).getTime();
  return !isNaN(t) && t <= now ? "live" : "scheduled";
}

export const DISPLAY_STATUS_LABEL: Record<FunnelDisplayStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live",
  ended: "Ended",
};

/** The viewer's IANA timezone, or null if the runtime can't tell. */
export function viewerTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Offset in minutes of `timeZone` at instant `d` (e.g. +330 for IST). NaN if unknown. */
export function zoneOffsetMinutes(d: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(d);
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60_000);
  } catch {
    return NaN;
  }
}

/** "Sat, 5 Dec · 7:00 pm" in the given zone, plus a short zone label ("GMT+1", "PST"). */
export function formatInZone(iso: string | Date, timeZone: string): { date: string; time: string; zone: string } | null {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return null;
  try {
    const date = d.toLocaleDateString("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true });
    const zonePart = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(d).find(p => p.type === "timeZoneName");
    return { date, time, zone: timeZone === HOST_TIME_ZONE ? "IST" : zonePart?.value || timeZone };
  } catch {
    return null;
  }
}

/**
 * The start time in the viewer's own timezone, or null when it would just repeat the IST
 * line (viewer is in India / same offset) or the zone is unknown.
 */
export function viewerLocalStart(iso: string | Date, tz: string | null): { date: string; time: string; zone: string } | null {
  if (!tz) return null;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return null;
  const a = zoneOffsetMinutes(d, tz), b = zoneOffsetMinutes(d, HOST_TIME_ZONE);
  if (isNaN(a) || a === b) return null;
  return formatInZone(d, tz);
}

/** Days/hours/minutes/seconds for a countdown (never negative). */
export function countdownParts(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Short human phrase relative to the start: "Starts in 3 days", "Starts in 2h 5m", "Started 12m ago". */
export function relativeStart(scheduledAt: string | Date, now = Date.now()): string {
  const t = new Date(scheduledAt).getTime();
  if (isNaN(t)) return "";
  const diff = t - now;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60_000);
  const h = Math.floor(m / 60), mm = m % 60;
  const d = Math.floor(abs / 86_400_000);
  const span = d >= 2 ? `${d} days` : h >= 1 ? `${h}h${mm ? ` ${mm}m` : ""}` : m >= 1 ? `${m}m` : "under a minute";
  return diff > 0 ? `Starts in ${span}` : `Started ${span} ago`;
}
