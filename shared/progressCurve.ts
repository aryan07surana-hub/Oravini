/**
 * Fake ("perceived") progress bar curves for hosted videos / VSLs.
 *
 * A curve is an ordered list of segments covering the *displayed* bar from
 * 0% to 100%. Each segment ends at `untilPct` (cumulative, 0-100) and says how
 * the bar moves through it, in one of two ways:
 *
 *   - `seconds`: fill this part of the bar in exactly N real seconds of video
 *     (an absolute anchor, e.g. "first 20% of the bar in 10 seconds").
 *   - `speed`:   relative speed multiplier. Segments with a speed share the
 *     real time left over after the `seconds` anchors, in proportion to
 *     (bar width / speed). speed 2 = the bar moves twice as fast as average.
 *
 * The curve always maps real time -> displayed progress monotonically and the
 * bar always reaches 100% exactly at the end of the video, so seeking stays
 * consistent: clicking the bar at x% seeks to the real time where the bar
 * shows x%.
 *
 * Stored on video_events.progress_bar_config as JSON:
 *   { enabled: true, style: "<preset id>" | "custom", version: 2,
 *     curve: ProgressSegment[], segments: "<legacy text summary>" }
 *
 * Older saved configs only have { enabled, style, segments: "0-25%: 10s, ..." }.
 * Those are resolved by preset id first, then by parsing the segments text.
 */

export interface ProgressSegment {
  /** Cumulative end of this segment on the displayed bar, 0-100. */
  untilPct: number;
  /** Real seconds of video this segment of the bar should take (absolute). */
  seconds?: number;
  /** Relative speed multiplier (> 0). Ignored if `seconds` is set. */
  speed?: number;
}

export interface ProgressBarConfig {
  enabled: boolean;
  style: string;
  version?: number;
  curve?: ProgressSegment[];
  /** Legacy human-readable summary, e.g. "0-25%: 10s, 25-50%: 15s". */
  segments?: string;
}

/** Built-in curves, keyed by preset id (ids match the UI presets). */
export const PRESET_CURVES: Record<string, ProgressSegment[]> = {
  // Legacy presets keep their original relative timing: each quarter of the bar
  // took N "seconds" (really relative weights), i.e. speed = 25% / N.
  "fast-start": [
    { untilPct: 25, speed: 25 / 10 },
    { untilPct: 50, speed: 25 / 15 },
    { untilPct: 75, speed: 25 / 20 },
    { untilPct: 100, speed: 25 / 35 },
  ],
  "slow-start": [
    { untilPct: 25, speed: 25 / 40 },
    { untilPct: 50, speed: 25 / 20 },
    { untilPct: 75, speed: 25 / 15 },
    { untilPct: 100, speed: 25 / 10 },
  ],
  "front-loaded": [
    { untilPct: 25, speed: 25 / 8 },
    { untilPct: 50, speed: 25 / 8 },
    { untilPct: 75, speed: 25 / 25 },
    { untilPct: 100, speed: 25 / 35 },
  ],
  steady: [{ untilPct: 100, speed: 1 }],
  // Hook-Crawl-Close: bar rockets to 20% in the first ~10 real seconds, crawls
  // through the middle, then speeds up again for the close.
  "hook-crawl-close": [
    { untilPct: 20, seconds: 10 },
    { untilPct: 80, speed: 0.6 },
    { untilPct: 100, speed: 2.5 },
  ],
};

const MIN_SPEED = 0.05;
const MAX_SPEED = 50;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Clean up a user/DB-provided curve. Returns null if nothing usable is left. */
export function normalizeCurve(input: unknown): ProgressSegment[] | null {
  if (!Array.isArray(input)) return null;
  const out: ProgressSegment[] = [];
  let prev = 0;
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as any;
    const until = clamp(Number(r.untilPct), 0, 100);
    if (!Number.isFinite(until) || until <= prev) continue;
    const seg: ProgressSegment = { untilPct: Math.round(until * 100) / 100 };
    const secs = Number(r.seconds);
    const speed = Number(r.speed);
    if (r.seconds != null && Number.isFinite(secs) && secs > 0) seg.seconds = secs;
    else if (Number.isFinite(speed) && speed > 0) seg.speed = clamp(speed, MIN_SPEED, MAX_SPEED);
    else seg.speed = 1;
    out.push(seg);
    prev = seg.untilPct;
    if (prev >= 100) break;
  }
  if (!out.length) return null;
  // The bar must always end at 100%.
  out[out.length - 1].untilPct = 100;
  return out;
}

/**
 * Parse the legacy segments text: "0-25%: 10s, 25-50%: 15s, ..." into a curve.
 * Legacy seconds were relative weights (they never matched the real video
 * length), so they become speeds proportional to width/seconds.
 */
export function parseLegacySegments(text: unknown): ProgressSegment[] | null {
  if (typeof text !== "string") return null;
  const re = /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%\s*:\s*(\d+(?:\.\d+)?)\s*s/gi;
  const segs: ProgressSegment[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const from = Number(m[1]);
    const to = Number(m[2]);
    const secs = Number(m[3]);
    if (to > from && secs > 0) segs.push({ untilPct: to, speed: (to - from) / secs });
  }
  return normalizeCurve(segs);
}

/** Parse whatever is stored in progress_bar_config. Returns null when disabled/invalid. */
export function parseProgressConfig(raw: unknown): ProgressBarConfig | null {
  let cfg: any = raw;
  if (typeof raw === "string") {
    try { cfg = JSON.parse(raw); } catch { return null; }
  }
  if (!cfg || typeof cfg !== "object") return null;
  return {
    enabled: !!cfg.enabled,
    style: typeof cfg.style === "string" ? cfg.style : "steady",
    version: typeof cfg.version === "number" ? cfg.version : undefined,
    curve: Array.isArray(cfg.curve) ? cfg.curve : undefined,
    segments: typeof cfg.segments === "string" ? cfg.segments : undefined,
  };
}

/** Resolve the curve to use for a config (explicit curve > preset id > legacy text). */
export function resolveCurve(cfg: ProgressBarConfig | null): ProgressSegment[] | null {
  if (!cfg || !cfg.enabled) return null;
  return (
    normalizeCurve(cfg.curve) ||
    (PRESET_CURVES[cfg.style] ? PRESET_CURVES[cfg.style] : null) ||
    parseLegacySegments(cfg.segments)
  );
}

/** True if the curve is the identity mapping (no fake progress). */
export function isIdentityCurve(curve: ProgressSegment[] | null): boolean {
  if (!curve) return true;
  return curve.length === 1 && curve[0].seconds == null;
}

/** A knot on the piecewise-linear map: real time `t` (s) -> bar fraction `p` (0-1). */
export interface CurveKnot { t: number; p: number }

/**
 * Turn a curve into knots for a concrete video duration.
 * `seconds` anchors are honoured as long as they fit; if they'd eat more than
 * 85% of the video (or all segments are anchors) they're scaled to fit.
 */
export function buildKnots(curve: ProgressSegment[], duration: number): CurveKnot[] {
  if (!(duration > 0) || !curve.length) return [{ t: 0, p: 0 }, { t: Math.max(duration, 0), p: 1 }];

  let prev = 0;
  const widths = curve.map(s => { const w = s.untilPct - prev; prev = s.untilPct; return w; });

  let fixedTotal = 0;
  let weightTotal = 0;
  curve.forEach((s, i) => {
    if (s.seconds != null) fixedTotal += s.seconds;
    else weightTotal += widths[i] / (s.speed || 1);
  });

  let fixedScale = 1;
  let flexTime = duration - fixedTotal;
  if (weightTotal === 0) {
    // Only anchors: scale them to the real duration.
    fixedScale = fixedTotal > 0 ? duration / fixedTotal : 1;
    flexTime = 0;
  } else if (fixedTotal > duration * 0.85) {
    // Anchors don't fit (short video): squeeze them proportionally.
    fixedScale = (duration * 0.5) / fixedTotal;
    flexTime = duration * 0.5;
  }

  const knots: CurveKnot[] = [{ t: 0, p: 0 }];
  let t = 0;
  curve.forEach((s, i) => {
    const dt = s.seconds != null
      ? s.seconds * fixedScale
      : weightTotal > 0 ? flexTime * (widths[i] / (s.speed || 1)) / weightTotal : 0;
    t += dt;
    knots.push({ t, p: s.untilPct / 100 });
  });
  // Pin the last knot to the exact end to absorb rounding.
  knots[knots.length - 1] = { t: duration, p: 1 };
  return knots;
}

/** Real time (s) -> displayed bar fraction (0-1). */
export function realToDisplay(knots: CurveKnot[], t: number): number {
  if (knots.length < 2) return 0;
  const end = knots[knots.length - 1];
  if (t <= 0) return 0;
  if (t >= end.t) return 1;
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1], b = knots[i];
    if (t <= b.t) {
      const span = b.t - a.t;
      return span > 0 ? a.p + ((t - a.t) / span) * (b.p - a.p) : b.p;
    }
  }
  return 1;
}

/** Displayed bar fraction (0-1) -> real time (s). Used for click-to-seek. */
export function displayToReal(knots: CurveKnot[], p: number): number {
  if (knots.length < 2) return 0;
  const end = knots[knots.length - 1];
  if (p <= 0) return 0;
  if (p >= 1) return end.t;
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1], b = knots[i];
    if (p <= b.p) {
      const span = b.p - a.p;
      return span > 0 ? a.t + ((p - a.p) / span) * (b.t - a.t) : b.t;
    }
  }
  return end.t;
}

/**
 * Relative bar speed per segment (1 = average pace) for a reference duration.
 * Handy for drawing mini visuals of a curve.
 */
export function segmentSpeeds(curve: ProgressSegment[], refDuration = 600): { widthPct: number; speed: number }[] {
  const knots = buildKnots(curve, refDuration);
  const out: { widthPct: number; speed: number }[] = [];
  for (let i = 1; i < knots.length; i++) {
    const dp = knots[i].p - knots[i - 1].p;
    const dt = knots[i].t - knots[i - 1].t;
    out.push({ widthPct: dp * 100, speed: dt > 0 ? (dp * refDuration) / dt : MAX_SPEED });
  }
  return out;
}

/** Human-readable summary, also stored as the legacy `segments` field. */
export function describeCurve(curve: ProgressSegment[]): string {
  let prev = 0;
  return curve.map(s => {
    const label = `${prev}-${s.untilPct}%: ${s.seconds != null ? `${s.seconds}s` : `${Number((s.speed ?? 1).toFixed(2))}x`}`;
    prev = s.untilPct;
    return label;
  }).join(", ");
}
