/**
 * Renders an EDL to an MP4.
 *
 * Primary path: local ffmpeg (FFMPEG_PATH / ffmpeg-static). One pass:
 *   input seek to trim.start → select/aselect keep-segments → speed →
 *   color grade → reframe (crop-to-fill) → burn-in ASS captions → H.264/AAC.
 * No watermark, no per-render cost.
 *
 * Fallback path: Shotstack's free *stage* sandbox, used only when ffmpeg is not
 * available on the host. Stage output is watermarked, which the UI states
 * plainly. We never switch Shotstack to its paid production environment.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { probe, runFfmpeg, type ProbeInfo } from "./ffmpeg";
import { buildAss } from "./captions";
import { keepSegments, outputDuration, remapWords, type EDL, type Word } from "./edl";

export const FONTS_DIR = path.resolve(process.cwd(), "server", "videoEditor", "fonts");

const GRADE_FILTERS: Record<string, string> = {
  cinematic: "curves=preset=strong_contrast,colorbalance=rs=-.04:gs=.02:bs=.05,eq=saturation=0.9",
  warm: "colorbalance=rs=.08:gs=.02:bs=-.06,eq=saturation=1.08",
  cool: "colorbalance=rs=-.06:gs=.02:bs=.08",
  bright: "eq=brightness=0.06:contrast=1.04:saturation=1.1",
  vivid: "eq=saturation=1.4:contrast=1.08",
  bw: "hue=s=0,eq=contrast=1.1",
};

export type Quality = "preview" | "final";

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Output frame size for an aspect + quality, never upscaling past the source. */
export function outputSize(info: Pick<ProbeInfo, "width" | "height">, edl: EDL, quality: Quality): { w: number; h: number } {
  const sw = info.width || 1280, sh = info.height || 720;
  const shortCap = Math.min(quality === "preview" ? 540 : 1080, Math.min(sw, sh));
  if (edl.aspect === "original") {
    const scale = shortCap / Math.min(sw, sh);
    return { w: even(sw * scale), h: even(sh * scale) };
  }
  const [aw, ah] = edl.aspect === "9:16" ? [9, 16] : edl.aspect === "1:1" ? [1, 1] : [16, 9];
  return aw <= ah ? { w: even(shortCap), h: even((shortCap * ah) / aw) } : { w: even((shortCap * aw) / ah), h: even(shortCap) };
}

function atempoChain(speed: number): string[] {
  const out: string[] = [];
  let r = speed;
  while (r > 2) { out.push("atempo=2.0"); r /= 2; }
  while (r < 0.5) { out.push("atempo=0.5"); r /= 0.5; }
  if (Math.abs(r - 1) > 0.001) out.push(`atempo=${r.toFixed(4)}`);
  return out;
}

export interface RenderResult {
  outputPath: string;
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  sizeBytes: number;
  captionLines: number;
}

/** Build the ffmpeg argument list (exported for tests). */
export function buildFfmpegArgs(opts: { input: string; info: ProbeInfo; edl: EDL; assPath: string | null; outputPath: string; quality: Quality }): { args: string[]; w: number; h: number; expected: number } {
  const { input, info, edl, assPath, outputPath, quality } = opts;
  const segs = keepSegments(edl);
  if (!segs.length) throw Object.assign(new Error("Nothing left to render: every part of the video is cut."), { userMessage: "Nothing left to render — every part of the video is cut. Undo some cuts and try again." });
  const base = edl.trim.start;
  const span = edl.trim.end - edl.trim.start;
  const rel = segs.map(s => ({ start: +(s.start - base).toFixed(3), end: +(s.end - base).toFixed(3) }));
  const sel = rel.map(s => `between(t,${s.start},${s.end})`).join("+");
  const fps = 30;
  const { w, h } = outputSize(info, edl, quality);

  const v: string[] = [`fps=${fps}`, `select='${sel}'`, `setpts=N/(${fps}*${edl.speed})/TB`];
  if (edl.speed !== 1) v.push(`fps=${fps}`);
  if (GRADE_FILTERS[edl.colorGrade]) v.push(GRADE_FILTERS[edl.colorGrade]);
  if (edl.aspect === "original") v.push(`scale=${w}:${h}`);
  else v.push(`scale=${w}:${h}:force_original_aspect_ratio=increase`, `crop=${w}:${h}`);
  v.push("setsar=1");
  if (assPath) v.push(`subtitles=filename=${assPath}:fontsdir=${FONTS_DIR}`);
  v.push("format=yuv420p");

  let fc = `[0:v]${v.join(",")}[vout]`;
  if (info.hasAudio) {
    const a = [`aselect='${sel}'`, "asetpts=N/SR/TB", ...atempoChain(edl.speed), "aresample=async=1"];
    fc += `;[0:a]${a.join(",")}[aout]`;
  }
  const args = [
    "-ss", String(base), "-t", String(span), "-i", input,
    "-filter_complex", fc,
    "-map", "[vout]", ...(info.hasAudio ? ["-map", "[aout]", "-c:a", "aac", "-b:a", "128k", "-ac", "2"] : []),
    "-c:v", "libx264", "-preset", quality === "preview" ? "ultrafast" : "veryfast",
    "-crf", quality === "preview" ? "30" : "22", "-threads", "2",
    "-r", String(fps), "-movflags", "+faststart", "-shortest", outputPath,
  ];
  return { args, w, h, expected: outputDuration(edl) };
}

export async function renderWithFfmpeg(opts: {
  input: string; edl: EDL; words: Word[]; outputPath: string; quality: Quality;
  onProgress?: (p: number) => void;
}): Promise<RenderResult> {
  const info = await probe(opts.input);
  if (!info.hasVideo) throw Object.assign(new Error("no video stream"), { userMessage: "This file has no video track — upload a video (audio-only files can be transcribed but not rendered)." });
  let assPath: string | null = null;
  let captionLines = 0;
  const { w, h } = outputSize(info, opts.edl, opts.quality);
  if (opts.edl.captions.enabled && opts.words.length) {
    const outWords = remapWords(opts.words, opts.edl);
    if (outWords.length) {
      const ass = buildAss(outWords, opts.edl, w, h);
      captionLines = ass.split("\n").filter(l => l.startsWith("Dialogue:")).length;
      assPath = path.join(os.tmpdir(), `oravini-cap-${Date.now()}-${Math.round(Math.random() * 1e6)}.ass`);
      await fs.promises.writeFile(assPath, ass, "utf8");
    }
  }
  try {
    const { args, expected } = buildFfmpegArgs({ input: opts.input, info, edl: opts.edl, assPath, outputPath: opts.outputPath, quality: opts.quality });
    await runFfmpeg(args, {
      timeoutMs: 45 * 60 * 1000,
      onProgress: s => opts.onProgress?.(expected > 0 ? Math.min(0.99, s / expected) : 0),
    });
    const out = await probe(opts.outputPath);
    const st = await fs.promises.stat(opts.outputPath);
    return { outputPath: opts.outputPath, duration: out.duration, width: out.width || w, height: out.height || h, hasAudio: out.hasAudio, sizeBytes: st.size, captionLines };
  } finally {
    if (assPath) fs.promises.unlink(assPath).catch(() => {});
  }
}

// ── Shotstack stage fallback (watermarked preview, free sandbox only) ─────────

const SHOTSTACK_STAGE = "https://api.shotstack.io/stage";

export function shotstackConfigured(): boolean {
  return !!process.env.SHOTSTACK_API_KEY;
}

export function buildShotstackTimeline(publicUrl: string, edl: EDL, words: Word[]) {
  const filterMap: Record<string, string> = { cinematic: "contrast", warm: "boost", cool: "muted", bright: "lighten", vivid: "boost", bw: "greyscale" };
  const filter = filterMap[edl.colorGrade];
  const clips: any[] = [];
  let t = 0;
  for (const s of keepSegments(edl)) {
    const len = (s.end - s.start) / edl.speed;
    clips.push({ asset: { type: "video", src: publicUrl, trim: s.start }, start: +t.toFixed(3), length: +((s.end - s.start)).toFixed(3), ...(filter ? { filter } : {}), ...(edl.speed !== 1 ? { speed: edl.speed } : {}) });
    t += len;
  }
  const tracks: any[] = [];
  if (edl.captions.enabled && words.length) {
    const out = remapWords(words, edl);
    const cap: any[] = [];
    const style = edl.captions.style === "minimal" ? "minimal" : edl.captions.style === "boxed" ? "subtitle" : "blockbuster";
    for (let i = 0; i < out.length; i += edl.captions.wordsPerLine) {
      const chunk = out.slice(i, i + edl.captions.wordsPerLine);
      cap.push({ asset: { type: "title", text: chunk.map(w => w.word).join(" "), style, size: "small", color: edl.captions.style === "karaoke" ? "#ffe500" : "#ffffff" }, start: chunk[0].start, length: Math.max(0.4, chunk[chunk.length - 1].end - chunk[0].start), position: edl.captions.position === "top" ? "top" : edl.captions.position === "middle" ? "center" : "bottom" });
    }
    if (cap.length) tracks.push({ clips: cap });
  }
  tracks.push({ clips });
  const resolution = edl.aspect === "original" || edl.aspect === "16:9" ? "hd" : "1080";
  const aspectRatio = edl.aspect === "9:16" ? "9:16" : edl.aspect === "1:1" ? "1:1" : "16:9";
  return { timeline: { background: "#000000", tracks }, output: { format: "mp4", resolution, aspectRatio, fps: 25 } };
}

/** Submit to Shotstack stage and poll until done (runs inside a background job). */
export async function renderWithShotstackStage(publicUrl: string, edl: EDL, words: Word[], onProgress?: (p: number, stage?: string) => void): Promise<{ url: string }> {
  const key = process.env.SHOTSTACK_API_KEY || "";
  const res = await fetch(`${SHOTSTACK_STAGE}/render`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify(buildShotstackTimeline(publicUrl, edl, words)),
  });
  const data: any = await res.json().catch(() => ({}));
  const id = data?.response?.id;
  if (!res.ok || !id) throw Object.assign(new Error(`Shotstack submit failed: ${JSON.stringify(data).slice(0, 300)}`), { userMessage: `Shotstack preview render failed: ${data?.message || res.status}` });
  const started = Date.now();
  while (Date.now() - started < 15 * 60 * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    const s = await fetch(`${SHOTSTACK_STAGE}/render/${id}`, { headers: { "x-api-key": key } });
    const sd: any = await s.json().catch(() => ({}));
    const st = sd?.response?.status;
    onProgress?.(Math.min(0.95, (Date.now() - started) / 180000), `Shotstack: ${st || "waiting"}`);
    if (st === "done" && sd.response.url) return { url: sd.response.url };
    if (st === "failed") throw Object.assign(new Error(`Shotstack render failed: ${sd?.response?.error || ""}`), { userMessage: `Shotstack preview render failed: ${sd?.response?.error || "unknown error"}` });
  }
  throw Object.assign(new Error("Shotstack timed out"), { userMessage: "Shotstack preview render timed out after 15 minutes." });
}
