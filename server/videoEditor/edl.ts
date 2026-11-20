/**
 * Edit Decision List (EDL) for the AI video editor.
 *
 * The EDL is the single source of truth for an edit. It is stored as JSON on
 * `video_edits.edl`, changed by the AI chat (as concrete operations) or by the
 * UI, previewed client-side, and rendered by ffmpeg. All times are in SOURCE
 * seconds (the original upload's timeline) so edits never drift when other
 * edits change.
 *
 * This file is pure (no I/O) so it can be unit-tested and shared.
 */

export type CaptionStyle = "bold" | "karaoke" | "minimal" | "boxed";
export type CaptionPosition = "bottom" | "middle" | "top";
export type ColorGrade = "none" | "cinematic" | "warm" | "cool" | "bright" | "vivid" | "bw";
export type Aspect = "original" | "9:16" | "1:1" | "16:9";
export type CutSource = "silence" | "filler" | "ai" | "manual";

export interface Cut { start: number; end: number; reason?: string; source?: CutSource }

export interface EDL {
  version: 1;
  /** Source-time window that is kept (everything outside is dropped). */
  trim: { start: number; end: number };
  /** Removed ranges inside the trim window (source time). */
  cuts: Cut[];
  captions: {
    enabled: boolean;
    style: CaptionStyle;
    position: CaptionPosition;
    wordsPerLine: number;
    uppercase: boolean;
  };
  colorGrade: ColorGrade;
  speed: number;
  aspect: Aspect;
}

export interface Word { word: string; start: number; end: number }
export interface Segment { start: number; end: number }

export const CAPTION_STYLES: CaptionStyle[] = ["bold", "karaoke", "minimal", "boxed"];
export const COLOR_GRADES: ColorGrade[] = ["none", "cinematic", "warm", "cool", "bright", "vivid", "bw"];
export const ASPECTS: Aspect[] = ["original", "9:16", "1:1", "16:9"];
export const MIN_SPEED = 0.5;
export const MAX_SPEED = 2;

const FILLERS = new Set(["um", "uh", "uhh", "umm", "uhm", "erm", "er", "ah", "ahh", "hmm", "hm", "mhm", "mm"]);

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const num = (v: any, fallback: number) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
};

export function defaultEdl(duration: number): EDL {
  return {
    version: 1,
    trim: { start: 0, end: round3(Math.max(0, duration || 0)) },
    cuts: [],
    captions: { enabled: true, style: "bold", position: "bottom", wordsPerLine: 4, uppercase: false },
    colorGrade: "none",
    speed: 1,
    aspect: "original",
  };
}

function normCaptionStyle(v: any): CaptionStyle | undefined {
  const s = String(v || "").toLowerCase().trim();
  if (s === "netflix" || s === "box" || s === "subtitle" || s === "subtitles") return "boxed";
  if (s === "hormozi" || s === "highlight" || s === "word-highlight" || s === "tiktok") return "karaoke";
  if (s === "clean" || s === "simple" || s === "small") return "minimal";
  if (s === "big" || s === "bold-white" || s === "impact") return "bold";
  return (CAPTION_STYLES as string[]).includes(s) ? (s as CaptionStyle) : undefined;
}

function normGrade(v: any): ColorGrade | undefined {
  const s = String(v || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
  const alias: Record<string, ColorGrade> = {
    blackandwhite: "bw", bw: "bw", monochrome: "bw", grayscale: "bw", greyscale: "bw",
    film: "cinematic", movie: "cinematic", teal: "cinematic", tealorange: "cinematic",
    golden: "warm", sunny: "warm", cold: "cool", blue: "cool", brighten: "bright", light: "bright",
    saturated: "vivid", punchy: "vivid", vibrant: "vivid", off: "none", original: "none", reset: "none",
  };
  if (alias[s]) return alias[s];
  return (COLOR_GRADES as string[]).includes(s) ? (s as ColorGrade) : undefined;
}

function normAspect(v: any): Aspect | undefined {
  const s = String(v || "").toLowerCase().trim();
  if (["9:16", "vertical", "portrait", "reel", "reels", "tiktok", "shorts"].includes(s)) return "9:16";
  if (["1:1", "square"].includes(s)) return "1:1";
  if (["16:9", "landscape", "horizontal", "youtube"].includes(s)) return "16:9";
  if (["original", "source", "none"].includes(s)) return "original";
  return undefined;
}

/** Merge overlapping / touching ranges and drop zero-length ones. */
export function mergeRanges<T extends Segment>(ranges: T[]): T[] {
  const sorted = ranges
    .filter(r => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end - r.start > 0.01)
    .map(r => ({ ...r }))
    .sort((a, b) => a.start - b.start);
  const out: T[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end + 0.01) {
      last.end = Math.max(last.end, r.end);
    } else out.push(r);
  }
  return out;
}

/** Validate + coerce anything (DB JSON, client payload, LLM output) into a safe EDL. */
export function normalizeEdl(raw: any, duration: number): EDL {
  const base = defaultEdl(duration);
  if (!raw || typeof raw !== "object") return base;
  const dur = duration > 0 ? duration : num(raw?.trim?.end, 0);
  const tStart = clamp(num(raw?.trim?.start, 0), 0, dur);
  let tEnd = clamp(num(raw?.trim?.end, dur), 0, dur);
  if (tEnd - tStart < 0.2) tEnd = dur;
  const cuts = mergeRanges(
    (Array.isArray(raw.cuts) ? raw.cuts : []).map((c: any) => ({
      start: round3(clamp(num(c?.start, 0), tStart, tEnd)),
      end: round3(clamp(num(c?.end, 0), tStart, tEnd)),
      reason: c?.reason ? String(c.reason).slice(0, 120) : undefined,
      source: (["silence", "filler", "ai", "manual"].includes(c?.source) ? c.source : "manual") as CutSource,
    })),
  );
  // Absorb slivers: a kept gap shorter than 0.2s between two cuts would only
  // flash on screen, so the neighbouring cuts are joined.
  for (let i = cuts.length - 1; i > 0; i--) {
    if (cuts[i].start - cuts[i - 1].end < 0.2) {
      cuts[i - 1] = { ...cuts[i - 1], end: Math.max(cuts[i - 1].end, cuts[i].end) };
      cuts.splice(i, 1);
    }
  }
  const cap = raw.captions || {};
  return {
    version: 1,
    trim: { start: round3(tStart), end: round3(tEnd) },
    cuts,
    captions: {
      enabled: cap.enabled === undefined ? base.captions.enabled : !!cap.enabled,
      style: normCaptionStyle(cap.style) || base.captions.style,
      position: (["bottom", "middle", "top"].includes(cap.position) ? cap.position : base.captions.position) as CaptionPosition,
      wordsPerLine: clamp(Math.round(num(cap.wordsPerLine, base.captions.wordsPerLine)), 1, 8),
      uppercase: !!cap.uppercase,
    },
    colorGrade: normGrade(raw.colorGrade) || "none",
    speed: round3(clamp(num(raw.speed, 1), MIN_SPEED, MAX_SPEED)),
    aspect: normAspect(raw.aspect) || "original",
  };
}

/** Ranges of source time that survive the edit, in order. */
export function keepSegments(edl: EDL): Segment[] {
  const segs: Segment[] = [];
  let cursor = edl.trim.start;
  for (const c of mergeRanges(edl.cuts)) {
    if (c.end <= cursor) continue;
    if (c.start >= edl.trim.end) break;
    if (c.start > cursor) segs.push({ start: cursor, end: Math.min(c.start, edl.trim.end) });
    cursor = Math.max(cursor, c.end);
  }
  if (cursor < edl.trim.end) segs.push({ start: cursor, end: edl.trim.end });
  return segs.filter(s => s.end - s.start >= 0.05).map(s => ({ start: round3(s.start), end: round3(s.end) }));
}

/** Duration of the rendered output in seconds. */
export function outputDuration(edl: EDL): number {
  const total = keepSegments(edl).reduce((s, g) => s + (g.end - g.start), 0);
  return round3(total / (edl.speed || 1));
}

/** Map a source timestamp to output time, or null if it is cut. */
export function sourceToOutput(t: number, segs: Segment[], speed: number): number | null {
  let acc = 0;
  for (const s of segs) {
    if (t >= s.start && t < s.end) return (acc + (t - s.start)) / speed;
    acc += s.end - s.start;
  }
  return null;
}

/** Words re-timed onto the output timeline (words inside cuts are dropped). */
export function remapWords(words: Word[], edl: EDL): Word[] {
  const segs = keepSegments(edl);
  const out: Word[] = [];
  for (const w of words) {
    const mid = (w.start + w.end) / 2;
    const seg = segs.find(s => mid >= s.start && mid < s.end);
    if (!seg) continue;
    const s = Math.max(w.start, seg.start);
    const e = Math.min(w.end, seg.end);
    const os = sourceToOutput(s, segs, edl.speed);
    if (os === null) continue;
    const oe = os + Math.max(0.05, e - s) / edl.speed;
    out.push({ word: w.word, start: round3(os), end: round3(oe) });
  }
  return out;
}

export function silenceCuts(words: Word[], edl: EDL, minGap = 0.6, pad = 0.12): Cut[] {
  const cuts: Cut[] = [];
  const inWin = words.filter(w => w.end > edl.trim.start && w.start < edl.trim.end);
  if (!inWin.length) return cuts;
  // Leading dead air
  if (inWin[0].start - edl.trim.start >= minGap) {
    cuts.push({ start: edl.trim.start, end: inWin[0].start - pad, reason: "leading silence", source: "silence" });
  }
  for (let i = 1; i < inWin.length; i++) {
    const gap = inWin[i].start - inWin[i - 1].end;
    if (gap >= minGap) {
      cuts.push({
        start: round3(inWin[i - 1].end + pad), end: round3(inWin[i].start - pad),
        reason: `${gap.toFixed(1)}s pause`, source: "silence",
      });
    }
  }
  const lastEnd = inWin[inWin.length - 1].end;
  if (edl.trim.end - lastEnd >= minGap) {
    cuts.push({ start: lastEnd + pad, end: edl.trim.end, reason: "trailing silence", source: "silence" });
  }
  return cuts.filter(c => c.end - c.start > 0.05);
}

export function fillerCuts(words: Word[], edl: EDL): Cut[] {
  return words
    .filter(w => w.start >= edl.trim.start && w.end <= edl.trim.end)
    .filter(w => FILLERS.has(w.word.toLowerCase().replace(/[^a-z]/g, "")))
    .map(w => ({ start: round3(w.start - 0.03), end: round3(w.end + 0.03), reason: `filler "${w.word.trim()}"`, source: "filler" as CutSource }));
}

// ── Operations (what the AI chat and the UI emit) ─────────────────────────────

export type EditOp =
  | { op: "set_trim"; start: number; end: number }
  | { op: "cut"; start: number; end: number; reason?: string }
  | { op: "uncut"; start: number; end: number }
  | { op: "clear_cuts"; source?: CutSource }
  | { op: "keep_only"; ranges: Segment[] }
  | { op: "remove_silences"; minGap?: number }
  | { op: "remove_fillers" }
  | { op: "set_captions"; enabled?: boolean; style?: string; position?: string; wordsPerLine?: number; uppercase?: boolean }
  | { op: "set_color_grade"; grade: string }
  | { op: "set_speed"; value: number }
  | { op: "set_aspect"; value: string };

export interface AppliedOp { op: EditOp; summary: string }

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m > 0 ? `${m}:${r.toFixed(1).padStart(4, "0")}` : `${r.toFixed(1)}s`;
};

/**
 * Apply operations to an EDL. Invalid operations are skipped (never throw), so
 * a partially wrong LLM response still yields the valid edits.
 */
export function applyOperations(edlIn: EDL, ops: any[], words: Word[], duration: number): { edl: EDL; applied: AppliedOp[]; skipped: string[] } {
  let edl: EDL = normalizeEdl(edlIn, duration);
  const applied: AppliedOp[] = [];
  const skipped: string[] = [];
  const dur = duration > 0 ? duration : edl.trim.end;

  for (const raw of Array.isArray(ops) ? ops : []) {
    const type = String(raw?.op || raw?.type || "").toLowerCase();
    try {
      switch (type) {
        case "set_trim":
        case "trim": {
          const start = clamp(num(raw.start, edl.trim.start), 0, dur);
          const end = clamp(num(raw.end, edl.trim.end), 0, dur);
          if (end - start < 0.5) { skipped.push(`trim ${start}-${end} is too short`); break; }
          edl = normalizeEdl({ ...edl, trim: { start, end } }, dur);
          applied.push({ op: { op: "set_trim", start, end }, summary: `Trimmed to ${fmt(start)} – ${fmt(end)}` });
          break;
        }
        case "cut":
        case "remove":
        case "delete_range": {
          const start = clamp(num(raw.start, NaN), 0, dur);
          const end = clamp(num(raw.end, NaN), 0, dur);
          if (!(end > start)) { skipped.push(`cut needs start < end`); break; }
          edl = normalizeEdl({ ...edl, cuts: [...edl.cuts, { start, end, reason: raw.reason || "AI cut", source: "ai" }] }, dur);
          applied.push({ op: { op: "cut", start, end, reason: raw.reason }, summary: `Cut ${fmt(start)} – ${fmt(end)}${raw.reason ? ` (${String(raw.reason).slice(0, 60)})` : ""}` });
          break;
        }
        case "uncut":
        case "restore": {
          const start = num(raw.start, NaN), end = num(raw.end, NaN);
          if (!(end > start)) { skipped.push("uncut needs start < end"); break; }
          const next: Cut[] = [];
          for (const c of edl.cuts) {
            if (c.end <= start || c.start >= end) { next.push(c); continue; }
            if (c.start < start) next.push({ ...c, end: start });
            if (c.end > end) next.push({ ...c, start: end });
          }
          edl = normalizeEdl({ ...edl, cuts: next }, dur);
          applied.push({ op: { op: "uncut", start, end }, summary: `Restored ${fmt(start)} – ${fmt(end)}` });
          break;
        }
        case "clear_cuts": {
          const src = raw.source as CutSource | undefined;
          const before = edl.cuts.length;
          edl = normalizeEdl({ ...edl, cuts: src ? edl.cuts.filter(c => c.source !== src) : [] }, dur);
          applied.push({ op: { op: "clear_cuts", source: src }, summary: `Removed ${before - edl.cuts.length} ${src || ""} cut${before - edl.cuts.length === 1 ? "" : "s"}`.replace("  ", " ") });
          break;
        }
        case "keep_only": {
          const ranges = mergeRanges((raw.ranges || []).map((r: any) => ({ start: clamp(num(r.start, 0), 0, dur), end: clamp(num(r.end, 0), 0, dur) })));
          if (!ranges.length) { skipped.push("keep_only needs ranges"); break; }
          const tStart = ranges[0].start, tEnd = ranges[ranges.length - 1].end;
          const cuts: Cut[] = [];
          for (let i = 1; i < ranges.length; i++) cuts.push({ start: ranges[i - 1].end, end: ranges[i].start, reason: "not in highlight", source: "ai" });
          edl = normalizeEdl({ ...edl, trim: { start: tStart, end: tEnd }, cuts }, dur);
          applied.push({ op: { op: "keep_only", ranges }, summary: `Kept ${ranges.map(r => `${fmt(r.start)}–${fmt(r.end)}`).join(", ")}` });
          break;
        }
        case "remove_silences":
        case "remove_silence": {
          if (!words.length) { skipped.push("remove_silences needs a transcript"); break; }
          const minGap = clamp(num(raw.minGap, 0.6), 0.25, 5);
          const cuts = silenceCuts(words, edl, minGap);
          edl = normalizeEdl({ ...edl, cuts: [...edl.cuts.filter(c => c.source !== "silence"), ...cuts] }, dur);
          const saved = cuts.reduce((s, c) => s + (c.end - c.start), 0);
          applied.push({ op: { op: "remove_silences", minGap }, summary: `Removed ${cuts.length} pause${cuts.length === 1 ? "" : "s"} over ${minGap}s (−${saved.toFixed(1)}s)` });
          break;
        }
        case "remove_fillers":
        case "remove_filler_words": {
          if (!words.length) { skipped.push("remove_fillers needs a transcript"); break; }
          const cuts = fillerCuts(words, edl);
          edl = normalizeEdl({ ...edl, cuts: [...edl.cuts.filter(c => c.source !== "filler"), ...cuts] }, dur);
          applied.push({ op: { op: "remove_fillers" }, summary: cuts.length ? `Cut ${cuts.length} filler word${cuts.length === 1 ? "" : "s"}` : "No filler words found" });
          break;
        }
        case "set_captions":
        case "captions": {
          const style = raw.style !== undefined ? normCaptionStyle(raw.style) : undefined;
          if (raw.style !== undefined && !style) { skipped.push(`unknown caption style "${raw.style}"`); }
          const next = {
            ...edl.captions,
            ...(raw.enabled !== undefined ? { enabled: !!raw.enabled } : {}),
            ...(style ? { style, enabled: raw.enabled === undefined ? true : !!raw.enabled } : {}),
            ...(raw.position ? { position: raw.position } : {}),
            ...(raw.wordsPerLine ? { wordsPerLine: raw.wordsPerLine } : {}),
            ...(raw.uppercase !== undefined ? { uppercase: !!raw.uppercase } : {}),
          };
          edl = normalizeEdl({ ...edl, captions: next }, dur);
          const c = edl.captions;
          applied.push({ op: { op: "set_captions", ...c }, summary: c.enabled ? `Captions: ${c.style}, ${c.position}, ${c.wordsPerLine} words/line${c.uppercase ? ", UPPERCASE" : ""}` : "Captions off" });
          break;
        }
        case "set_color_grade":
        case "color_grade":
        case "grade": {
          const g = normGrade(raw.grade ?? raw.value);
          if (!g) { skipped.push(`unknown color grade "${raw.grade ?? raw.value}"`); break; }
          edl = { ...edl, colorGrade: g };
          applied.push({ op: { op: "set_color_grade", grade: g }, summary: g === "none" ? "Color grade removed" : `Color grade: ${g}` });
          break;
        }
        case "set_speed":
        case "speed": {
          const v = clamp(num(raw.value ?? raw.speed, NaN), MIN_SPEED, MAX_SPEED);
          if (!Number.isFinite(v)) { skipped.push("set_speed needs a number"); break; }
          edl = { ...edl, speed: round3(v) };
          applied.push({ op: { op: "set_speed", value: edl.speed }, summary: `Speed ${edl.speed}×` });
          break;
        }
        case "set_aspect":
        case "aspect": {
          const a = normAspect(raw.value ?? raw.aspect);
          if (!a) { skipped.push(`unknown aspect "${raw.value}"`); break; }
          edl = { ...edl, aspect: a };
          applied.push({ op: { op: "set_aspect", value: a }, summary: a === "original" ? "Original aspect ratio" : `Reframed to ${a}` });
          break;
        }
        default:
          skipped.push(`unknown operation "${type}"`);
      }
    } catch (e: any) {
      skipped.push(`${type}: ${e?.message || e}`);
    }
  }
  return { edl, applied, skipped };
}

/**
 * Deterministic fallback: turn common requests into operations without an LLM
 * (used when the LLM is unavailable or answers without concrete edits).
 */
export function ruleBasedOps(message: string, duration: number): EditOp[] {
  const m = message.toLowerCase();
  const ops: EditOp[] = [];
  const t = (s: string) => {
    // "1:05" / "65" / "65s" / "1m5s"
    const mm = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
    if (mm) return parseInt(mm[1]) * 60 + parseFloat(mm[2]);
    const ms = s.match(/^(?:(\d+)m)?\s*(\d+(?:\.\d+)?)s?$/);
    if (ms) return (ms[1] ? parseInt(ms[1]) * 60 : 0) + parseFloat(ms[2]);
    return NaN;
  };
  const TS = "(\\d+:\\d{1,2}(?:\\.\\d+)?|\\d+(?:\\.\\d+)?s?)";

  if (/\b(silence|silences|pauses?|dead air|gaps?)\b/.test(m) && /\b(remove|cut|delete|trim|tighten|kill|no)\b/.test(m)) {
    const g = m.match(/(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?\b/);
    ops.push({ op: "remove_silences", ...(g && /longer|over|than|above/.test(m) ? { minGap: parseFloat(g[1]) } : {}) });
  }
  if (/\b(filler|fillers|ums?|uhs?|umm+|uhh+)\b/.test(m)) ops.push({ op: "remove_fillers" });

  const range = m.match(new RegExp(`\\b(?:cut|remove|delete)\\b[^\\d]*(?:from\\s+)?${TS}\\s*(?:-|–|to|until|and)\\s*${TS}`));
  if (range) ops.push({ op: "cut", start: t(range[1]), end: t(range[2]), reason: "requested" });
  const keep = m.match(new RegExp(`\\b(?:trim|keep|only)\\b[^\\d]*(?:from\\s+)?${TS}\\s*(?:-|–|to|until)\\s*${TS}`));
  if (keep && !range) ops.push({ op: "set_trim", start: t(keep[1]), end: t(keep[2]) });
  const firstN = m.match(/\bfirst\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds)\b/);
  if (firstN && /\b(keep|trim|only|make)\b/.test(m)) ops.push({ op: "set_trim", start: 0, end: Math.min(duration, parseFloat(firstN[1])) });
  const lastN = m.match(/\b(?:cut|remove|drop)\s+(?:the\s+)?(first|last)\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds)\b/);
  if (lastN) {
    const n = parseFloat(lastN[2]);
    ops.push(lastN[1] === "first" ? { op: "set_trim", start: n, end: duration } : { op: "set_trim", start: 0, end: Math.max(0.5, duration - n) });
  }

  const style = m.match(/\b(karaoke|hormozi|highlight(?:ed)?|bold|minimal|clean|boxed|netflix|subtitle)\b/);
  if (/\b(no|remove|turn off|disable|hide)\b[^.]*\bcaptions?\b/.test(m)) ops.push({ op: "set_captions", enabled: false });
  else if (/\b(captions?|subtitles?|subs)\b/.test(m) || style) {
    ops.push({
      op: "set_captions", enabled: true,
      ...(style ? { style: style[1].startsWith("highlight") ? "karaoke" : style[1] } : {}),
      ...(/\btop\b/.test(m) ? { position: "top" } : /\b(middle|center|centre)\b/.test(m) ? { position: "middle" } : /\bbottom\b/.test(m) ? { position: "bottom" } : {}),
      ...(/\b(upper ?case|all caps|caps)\b/.test(m) ? { uppercase: true } : {}),
    });
  }

  const grade = m.match(/\b(cinematic|film(?:ic)?|warm(?:er)?|cool(?:er)?|cold|bright(?:er|en)?|vivid|punchy|saturated|black and white|b&w|bw|monochrome|grayscale|greyscale)\b/);
  if (grade) {
    const g = grade[1].replace(/er$|en$/, "").replace("filmic", "cinematic").replace("film", "cinematic").replace("b&w", "bw").replace(/^black and white$/, "bw");
    ops.push({ op: "set_color_grade", grade: g === "brighten" ? "bright" : g });
  } else if (/\b(remove|reset|no)\b[^.]*\b(colou?r|grade|filter)\b/.test(m)) ops.push({ op: "set_color_grade", grade: "none" });

  const speed = m.match(/(\d(?:\.\d+)?)\s*x\b/) || m.match(/\bspeed\b[^\d]*(\d(?:\.\d+)?)/);
  if (speed) ops.push({ op: "set_speed", value: parseFloat(speed[1]) });
  else if (/\b(speed (it )?up|faster)\b/.test(m)) ops.push({ op: "set_speed", value: 1.25 });
  else if (/\b(slow (it )?down|slower)\b/.test(m)) ops.push({ op: "set_speed", value: 0.8 });

  const aspect = m.match(/\b(9:16|1:1|16:9|vertical|portrait|square|landscape|reels?|tiktok|shorts)\b/);
  if (aspect) ops.push({ op: "set_aspect", value: aspect[1] });

  return ops;
}

/** Short human summary of an EDL (for the UI and the LLM prompt). */
export function describeEdl(edl: EDL): string {
  const segs = keepSegments(edl);
  return [
    `trim ${fmt(edl.trim.start)}–${fmt(edl.trim.end)}`,
    `${edl.cuts.length} cuts`,
    `${segs.length} kept segments`,
    `output ${outputDuration(edl).toFixed(1)}s`,
    edl.captions.enabled ? `captions ${edl.captions.style}/${edl.captions.position}` : "captions off",
    `grade ${edl.colorGrade}`,
    `speed ${edl.speed}x`,
    `aspect ${edl.aspect}`,
  ].join(", ");
}
