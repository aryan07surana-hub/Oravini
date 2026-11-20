/**
 * Burn-in caption builder: turns Whisper word timestamps (already re-timed to
 * the output timeline via remapWords) into an ASS subtitle file that ffmpeg's
 * `subtitles` filter (libass) renders onto the video.
 *
 * Presets:
 *   bold     – big white bold text, thick black outline (classic short-form)
 *   karaoke  – line stays up, the word being spoken pops in yellow (word-timed)
 *   minimal  – small clean white text with a soft shadow
 *   boxed    – white text on a translucent black box (Netflix-style subtitles)
 */
import type { EDL, Word } from "./edl";

export const CAPTION_FONT = "DejaVu Sans";

export interface CaptionLine { start: number; end: number; words: Word[] }

/** Group words into display lines: N words, breaking early on long pauses or sentence ends. */
export function groupLines(words: Word[], wordsPerLine: number): CaptionLine[] {
  const lines: CaptionLine[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    lines.push({ start: cur[0].start, end: cur[cur.length - 1].end, words: cur });
    cur = [];
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = cur[cur.length - 1];
    if (prev && (w.start - prev.end > 0.7 || cur.length >= wordsPerLine)) flush();
    cur.push(w);
    if (/[.!?]$/.test(w.word.trim())) flush();
  }
  flush();
  // Hold each line until the next one starts (when the gap is small) so
  // captions don't flicker, and guarantee a readable minimum duration.
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1];
    const minEnd = lines[i].start + 0.45;
    if (next && next.start - lines[i].end < 0.35) lines[i].end = next.start;
    lines[i].end = Math.max(lines[i].end, next ? Math.min(minEnd, next.start) : minEnd);
  }
  return lines;
}

function assTime(t: number): string {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "(").replace(/\}/g, ")").replace(/\r?\n/g, " ");
}

interface StyleSpec { size: number; primary: string; outline: string; back: string; bold: number; borderStyle: number; outlineW: number; shadow: number }

function styleFor(edl: EDL, w: number, h: number): StyleSpec {
  const base = Math.min(w, h);
  switch (edl.captions.style) {
    case "karaoke":
      return { size: Math.round(base * 0.08), primary: "&H00FFFFFF", outline: "&H00000000", back: "&H64000000", bold: -1, borderStyle: 1, outlineW: Math.max(2, Math.round(base * 0.006)), shadow: 2 };
    case "minimal":
      return { size: Math.round(base * 0.048), primary: "&H00FFFFFF", outline: "&H50000000", back: "&H80000000", bold: 0, borderStyle: 1, outlineW: 1, shadow: 1 };
    case "boxed":
      return { size: Math.round(base * 0.052), primary: "&H00FFFFFF", outline: "&H8C000000", back: "&H8C000000", bold: 0, borderStyle: 3, outlineW: Math.max(4, Math.round(base * 0.008)), shadow: 0 };
    case "bold":
    default:
      return { size: Math.round(base * 0.085), primary: "&H00FFFFFF", outline: "&H00000000", back: "&H80000000", bold: -1, borderStyle: 1, outlineW: Math.max(3, Math.round(base * 0.008)), shadow: 0 };
  }
}

/** Build a complete .ass document for output dimensions w×h. */
export function buildAss(outputWords: Word[], edl: EDL, w: number, h: number): string {
  const st = styleFor(edl, w, h);
  const align = edl.captions.position === "top" ? 8 : edl.captions.position === "middle" ? 5 : 2;
  const marginV = edl.captions.position === "middle" ? 0 : Math.round(h * 0.09);
  const marginLR = Math.round(w * 0.06);
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${w}`,
    `PlayResY: ${h}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Cap,${CAPTION_FONT},${st.size},${st.primary},&H0000FFFF,${st.outline},${st.back},${st.bold},0,0,0,100,100,0,0,${st.borderStyle},${st.outlineW},${st.shadow},${align},${marginLR},${marginLR},${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const upper = edl.captions.uppercase || edl.captions.style === "karaoke" || edl.captions.style === "bold";
  const txt = (s: string) => esc(upper ? s.trim().toUpperCase() : s.trim());
  const events: string[] = [];
  for (const line of groupLines(outputWords, edl.captions.wordsPerLine)) {
    if (edl.captions.style === "karaoke") {
      // One event per spoken word: the full line with the active word highlighted.
      for (let i = 0; i < line.words.length; i++) {
        const s = line.words[i].start;
        const e = i + 1 < line.words.length ? line.words[i + 1].start : line.end;
        if (e - s < 0.02) continue;
        const text = line.words
          .map((wd, j) => (j === i ? `{\\c&H0000E5FF&\\fscx112\\fscy112}${txt(wd.word)}{\\r}` : txt(wd.word)))
          .join(" ");
        events.push(`Dialogue: 0,${assTime(s)},${assTime(e)},Cap,,0,0,0,,${text}`);
      }
    } else {
      events.push(`Dialogue: 0,${assTime(line.start)},${assTime(line.end)},Cap,,0,0,0,,${line.words.map(wd => txt(wd.word)).join(" ")}`);
    }
  }
  return [...header, ...events, ""].join("\n");
}
