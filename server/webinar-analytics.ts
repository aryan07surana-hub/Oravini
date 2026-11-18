// Pure helpers for webinar host analytics (no DB access — easy to test).
//
// Builds a real per-minute concurrent-viewer series from viewer sessions,
// derives stay rates / drop-off points / peak minute, and links viewer
// sessions to registrations so "attended" reflects who actually showed up.

/** Grace period after the last heartbeat before a silent viewer counts as gone. */
export const HEARTBEAT_GRACE_MS = 60_000;
/** Safety cap on the per-minute series length. */
const MAX_TIMELINE_MINUTES = 24 * 60;

export interface SessionLike {
  id?: string;
  viewerId: string;
  viewerName?: string | null;
  joinedAt?: Date | string | null;
  lastHeartbeatAt?: Date | string | null;
  leftAt?: Date | string | null;
  watchedSeconds?: number | null;
  isActive?: boolean | null;
}

export interface EventLike {
  eventType: string;
  viewerId?: string | null;
  viewerName?: string | null;
  data?: any;
  ts?: Date | string | null;
}

export interface RegistrationLike {
  id: string;
  name: string;
  email: string;
  attended?: boolean | null;
}

export interface TimelinePoint {
  minute: number;
  viewers: number;
  chats: number;
  reactions: number;
  questions: number;
  pollVotes: number;
  ctaClicks: number;
}

const toMs = (d: Date | string | null | undefined): number | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
};

export const normEmail = (e: unknown): string =>
  typeof e === "string" ? e.trim().toLowerCase() : "";

const normName = (n: unknown): string =>
  typeof n === "string" ? n.trim().toLowerCase().replace(/\s+/g, " ") : "";

/**
 * When did this session effectively end?
 * - leftAt if the viewer explicitly left
 * - null if the viewer is still watching (recent heartbeat, no leftAt)
 * - otherwise last heartbeat + grace (tab crash / network drop / missed beacon)
 */
export function sessionEndMs(s: SessionLike, nowMs: number): number | null {
  const left = toMs(s.leftAt);
  if (left != null) return left;
  const hb = toMs(s.lastHeartbeatAt) ?? toMs(s.joinedAt);
  if (hb == null) return null;
  if (s.isActive && nowMs - hb <= HEARTBEAT_GRACE_MS) return null; // still watching
  return hb + HEARTBEAT_GRACE_MS;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Map event types from the various clients onto the counters we chart. */
function eventBucket(type: string): keyof Omit<TimelinePoint, "minute" | "viewers"> | null {
  switch (type) {
    case "chat": case "chat_sent": return "chats";
    case "reaction": case "reaction_sent": return "reactions";
    case "question": case "qa": case "question_asked": return "questions";
    case "poll_vote": case "poll_voted": case "poll": return "pollVotes";
    case "cta_click": case "cta_clicked": return "ctaClicks";
    default: return null;
  }
}

export interface ComputeInput {
  webinar: { startedAt?: Date | string | null; endedAt?: Date | string | null; status?: string | null; durationMinutes?: number | null };
  sessions: SessionLike[];
  events: EventLike[];
  now?: number;
}

export function computeWebinarTimeline({ webinar, sessions, events, now = Date.now() }: ComputeInput) {
  const spans = sessions
    .map((s) => ({ s, start: toMs(s.joinedAt), end: sessionEndMs(s, now) }))
    .filter((x): x is { s: SessionLike; start: number; end: number | null } => x.start != null);

  // Window: real start → real end (or now while live / last viewer leaving).
  let startMs = toMs(webinar.startedAt);
  if (startMs == null && spans.length) startMs = Math.min(...spans.map((x) => x.start));

  let endMs = toMs(webinar.endedAt);
  if (endMs == null) {
    if (webinar.status === "live" || spans.some((x) => x.end == null)) endMs = now;
    else if (spans.length) endMs = Math.max(...spans.map((x) => x.end ?? now));
  }

  const timeline: TimelinePoint[] = [];
  if (startMs == null || endMs == null || endMs < startMs) {
    return { timeline, startMs, endMs, durationMinutes: 0, spans };
  }

  const durationMinutes = Math.min(Math.ceil((endMs - startMs) / 60_000), MAX_TIMELINE_MINUTES);
  for (let m = 0; m <= durationMinutes; m++) {
    const t = startMs + m * 60_000;
    let viewers = 0;
    for (const x of spans) {
      if (x.start <= t && (x.end == null || x.end >= t)) viewers++;
    }
    timeline.push({ minute: m, viewers, chats: 0, reactions: 0, questions: 0, pollVotes: 0, ctaClicks: 0 });
  }

  for (const e of events) {
    const bucket = eventBucket(e.eventType);
    const ts = toMs(e.ts);
    if (!bucket || ts == null) continue;
    const m = Math.floor((ts - startMs) / 60_000);
    if (m >= 0 && m < timeline.length) timeline[m][bucket]++;
  }

  return { timeline, startMs, endMs, durationMinutes, spans };
}

/** Minute index (0-based from start) at which a session dropped off, or null if still watching. */
export function dropOffMinute(s: SessionLike, startMs: number | null, nowMs: number): number | null {
  if (startMs == null) return null;
  const end = sessionEndMs(s, nowMs);
  if (end == null) return null;
  return Math.max(0, Math.floor((end - startMs) / 60_000));
}

/**
 * % of attendees still watching at 25 / 50 / 75 % of the webinar's duration,
 * read off the per-minute series.
 */
export function computeStayRates(timeline: TimelinePoint[], attendees: number) {
  const last = timeline.length - 1;
  const at = (frac: number) => {
    if (last < 1 || attendees <= 0) return { minute: 0, viewers: 0, pct: 0 };
    const minute = Math.round(last * frac);
    const viewers = timeline[minute]?.viewers ?? 0;
    return { minute, viewers, pct: Math.min(100, Math.round((viewers / attendees) * 100)) };
  };
  return { p25: at(0.25), p50: at(0.5), p75: at(0.75) };
}

/**
 * Work out which registrations correspond to viewers who joined.
 * Matches (in order): email recorded on viewer_join events, then a unique
 * case-insensitive name match against the session's viewer name.
 * Returns registration ids that should be (or already are) marked attended,
 * with the total seconds watched by the matched viewers.
 */
export function matchAttendedRegistrations(
  registrations: RegistrationLike[],
  sessions: SessionLike[],
  events: EventLike[],
): Map<string, number> {
  const byEmail = new Map<string, RegistrationLike>();
  const byName = new Map<string, RegistrationLike[]>();
  for (const r of registrations) {
    const e = normEmail(r.email);
    if (e && !byEmail.has(e)) byEmail.set(e, r);
    const n = normName(r.name);
    if (n) byName.set(n, [...(byName.get(n) || []), r]);
  }

  const emailByViewer = new Map<string, string>();
  for (const ev of events) {
    if (ev.eventType !== "viewer_join" || !ev.viewerId) continue;
    const e = normEmail(ev.data?.email);
    if (e) emailByViewer.set(ev.viewerId, e);
  }

  const matched = new Map<string, number>();
  for (const s of sessions) {
    let reg: RegistrationLike | undefined;
    const email = emailByViewer.get(s.viewerId);
    if (email) reg = byEmail.get(email);
    if (!reg) {
      const candidates = byName.get(normName(s.viewerName));
      if (candidates && candidates.length === 1 && normName(s.viewerName) !== "anonymous") reg = candidates[0];
    }
    if (reg) matched.set(reg.id, (matched.get(reg.id) || 0) + (s.watchedSeconds || 0));
  }
  return matched;
}

export const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
