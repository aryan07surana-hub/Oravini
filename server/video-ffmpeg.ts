import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);

// Use bundled static binaries — no system ffmpeg/ffprobe required
function getFfmpegPath(): string {
  try {
    const p = _require("ffmpeg-static") as string;
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return "ffmpeg"; // fallback to system
}

function getFfprobePath(): string {
  try {
    const installer = _require("@ffprobe-installer/ffprobe") as { path: string };
    if (installer?.path && fs.existsSync(installer.path)) return installer.path;
  } catch {}
  return "ffprobe";
}

const FFMPEG = getFfmpegPath();
const FFPROBE = getFfprobePath();

export interface RenderSettings {
  removeSilences?: boolean;
  silenceThreshold?: string;
  removeFillers?: boolean;         // cut um/uh/like/you know from transcript
  fillerWords?: string[];          // custom filler word list
  addCaptions?: boolean;
  captionStyle?: string;           // bold|netflix|minimal|karaoke|tiktok|reels|clean|cinematic|dark
  colorGrade?: string;             // none|cinematic|warm|cool|bright|vibrant|dark
  speed?: string;
  reframe?: string;                // none|9:16|1:1
  audioNormalize?: boolean;
  audioRestore?: boolean;          // noise removal + voice boost
  lowerThird?: string;
  watermarkText?: string;
  hookOpener?: string;
  platform?: string;               // original|instagram|tiktok|youtube-shorts|square
  musicUrl?: string;               // URL of background music file
  musicVolume?: string;            // 0.0–1.0, default 0.15
  addSubscribeCta?: boolean;       // @handle text overlay (bottom)
  ctaText?: string;
  transition?: string;             // none|fade
}

interface Segment { start: number; end: number; }

interface CondensedCtx {
  segments: Segment[];
  starts: number[];
  speed: number;
}

// ── Segment builder ───────────────────────────────────────────────────────────

const DEFAULT_FILLERS = new Set([
  "um", "uh", "ah", "er", "hmm", "mm", "mhm",
  "like", "literally", "basically", "actually", "you know", "i mean",
  "sort of", "kind of", "right", "okay", "so", "well",
]);

function buildSegments(words: any[], threshold: number, removeFillers = false, fillerWords?: string[]): Segment[] {
  if (!words?.length) return [];

  const fillerSet = removeFillers
    ? new Set([...DEFAULT_FILLERS, ...(fillerWords || []).map(w => w.toLowerCase())])
    : null;

  // Mark each word as kept or cut
  const kept = words.filter((w) => {
    if (!fillerSet) return true;
    return !fillerSet.has(w.word.toLowerCase().replace(/[.,!?]$/, ""));
  });

  if (!kept.length) return [{ start: words[0].start, end: words[words.length - 1].end + 0.3 }];

  const segs: Segment[] = [];
  let segStart = kept[0].start;
  let prevEnd = kept[0].end;
  for (let i = 1; i < kept.length; i++) {
    const gap = kept[i].start - prevEnd;
    if (gap >= threshold) {
      segs.push({ start: segStart, end: Math.min(prevEnd + 0.08, kept[i].start - 0.01) });
      segStart = kept[i].start;
    }
    prevEnd = kept[i].end;
  }
  segs.push({ start: segStart, end: prevEnd + 0.3 });
  return segs;
}

// ── Thumbnail extraction ──────────────────────────────────────────────────────

export function extractThumbnail(inputPath: string, outputPath: string, atSeconds = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, [
      "-y", "-ss", String(atSeconds), "-i", inputPath,
      "-frames:v", "1", "-q:v", "2", outputPath,
    ], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    proc.stderr.on("data", (d: Buffer) => { err += d.toString(); });
    proc.on("close", code => code === 0 ? resolve() : reject(new Error(`ffmpeg thumb: ${err.slice(-300)}`)));
    proc.on("error", reject);
  });
}

function buildCondensedCtx(segments: Segment[], speed: number): CondensedCtx {
  const starts: number[] = [];
  let total = 0;
  for (const seg of segments) {
    starts.push(total);
    total += (seg.end - seg.start) / speed;
  }
  return { segments, starts, speed };
}

function toCondensed(t: number, ctx: CondensedCtx): number {
  const { segments, starts, speed } = ctx;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (t >= segments[i].start && t <= segments[i].end + 0.5) {
      return starts[i] + (t - segments[i].start) / speed;
    }
  }
  if (t < segments[0].start) return 0;
  const last = segments.length - 1;
  return starts[last] + (t - segments[last].start) / speed;
}

// ── ASS subtitle generator ────────────────────────────────────────────────────

function toAssTime(t: number): string {
  t = Math.max(0, t);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}.${String(Math.round((s % 1) * 100)).padStart(2, "0")}`;
}

function generateAss(words: any[], ctx: CondensedCtx, style: string): string {
  const isKaraoke = ["tiktok", "karaoke", "reels"].includes(style);

  const styleMap: Record<string, { font: string; size: number; color: string; outline: number; marginV: number }> = {
    tiktok:   { font: "Arial Black", size: 88, color: "&H00FFFFFF", outline: 6, marginV: 80 },
    karaoke:  { font: "Arial Black", size: 88, color: "&H00FFFFFF", outline: 6, marginV: 80 },
    reels:    { font: "Impact",      size: 80, color: "&H00FFFFFF", outline: 5, marginV: 80 },
    bold:     { font: "Arial Black", size: 80, color: "&H00FFFFFF", outline: 5, marginV: 80 },
    netflix:  { font: "Arial Black", size: 76, color: "&H00FFFFFF", outline: 4, marginV: 70 },
    minimal:  { font: "Arial",       size: 60, color: "&H00FFFFFF", outline: 2, marginV: 60 },
    clean:    { font: "Arial",       size: 60, color: "&H00FFFFFF", outline: 2, marginV: 60 },
    cinematic:{ font: "Georgia",     size: 64, color: "&H00FFFF00", outline: 3, marginV: 100 },
    dark:     { font: "Arial Black", size: 72, color: "&H00FFFFFF", outline: 8, marginV: 80 },
  };
  const s = styleMap[style] || styleMap.bold;

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 1",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${s.font},${s.size},${s.color},&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,${s.outline},0,2,30,30,${s.marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const GROUP = 4;
  const lines: string[] = [header];

  for (let i = 0; i < words.length; i += GROUP) {
    const chunk = words.slice(i, Math.min(i + GROUP, words.length));
    const cs = toCondensed(chunk[0].start, ctx);
    const ce = toCondensed(chunk[chunk.length - 1].end, ctx) + 0.05;
    if (ce <= cs + 0.1) continue;

    let text: string;
    if (isKaraoke) {
      text = chunk.map((w: any) => {
        const ws = toCondensed(w.start, ctx);
        const we = toCondensed(w.end, ctx);
        const kd = Math.max(1, Math.round((we - ws) * 100));
        return `{\\k${kd}}${w.word}`;
      }).join(" ");
    } else {
      text = chunk.map((w: any) => w.word).join(" ");
    }

    lines.push(`Dialogue: 0,${toAssTime(cs)},${toAssTime(ce)},Default,,0,0,0,,${text}`);
  }

  return lines.join("\n");
}

// ── Filter helpers ────────────────────────────────────────────────────────────

function colorGradeFilter(grade: string): string {
  const map: Record<string, string> = {
    cinematic: "eq=contrast=1.1:saturation=0.85:gamma=0.95,colorchannelmixer=rr=0.95:bb=1.05",
    warm:      "eq=saturation=1.1,colorchannelmixer=rr=1.05:bb=0.9",
    cool:      "eq=saturation=0.95,colorchannelmixer=bb=1.1:rr=0.9",
    bright:    "eq=brightness=0.06:contrast=1.05:saturation=1.1",
    vibrant:   "eq=saturation=1.5:contrast=1.1",
    dark:      "eq=contrast=1.3:brightness=-0.05:saturation=0.75",
  };
  return map[grade] || "";
}

function cropScaleFilter(reframe: string, platform: string): string {
  const isPortrait = reframe === "9:16" || ["instagram", "tiktok", "youtube-shorts"].includes(platform);
  const isSquare   = reframe === "1:1" || platform === "square";
  if (isPortrait) {
    return [
      "crop=min(iw\\,ih*9/16):min(ih\\,iw*16/9):(iw-min(iw\\,ih*9/16))/2:(ih-min(ih\\,iw*16/9))/2",
      "scale=1080:1920:flags=lanczos",
    ].join(",");
  }
  if (isSquare) {
    return [
      "crop=min(iw\\,ih):min(ih\\,iw):(iw-min(iw\\,ih))/2:(ih-min(ih\\,iw))/2",
      "scale=1080:1080:flags=lanczos",
    ].join(",");
  }
  return "scale=trunc(iw/2)*2:trunc(ih/2)*2"; // ensure even dimensions
}

function audioTempoFilters(speed: number): string {
  if (speed === 1) return "";
  if (speed >= 0.5 && speed <= 2.0) return `atempo=${speed.toFixed(4)}`;
  if (speed > 2.0) return `atempo=2.0,atempo=${(speed / 2).toFixed(4)}`;
  return `atempo=0.5,atempo=${(speed / 0.5).toFixed(4)}`;
}

function findFontPath(): string {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
  ];
  return candidates.find(p => fs.existsSync(p)) || "";
}

function escFfPath(p: string): string {
  // Escape path for ffmpeg filter option: colons and backslashes need escaping
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

// ── ffmpeg runner ─────────────────────────────────────────────────────────────

function spawnFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("[ffmpeg] binary:", FFMPEG, "| args:", args.slice(0, 8).join(" "), "...");
    const proc = spawn(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) {
        console.log("[ffmpeg] render done");
        resolve();
      } else {
        console.error("[ffmpeg] failed, stderr tail:", stderr.slice(-3000));
        reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
      }
    });
    proc.on("error", (err) => {
      reject(new Error(`ffmpeg spawn error: ${err.message}`));
    });
  });
}

// ── Main render function ──────────────────────────────────────────────────────

export async function renderWithFfmpeg(
  inputPath: string,
  outputPath: string,
  transcript: any,
  settings: RenderSettings,
  videoDuration: number
): Promise<void> {
  const words: any[] = transcript?.words || [];
  const speed = parseFloat(settings.speed || "1");
  const threshold = parseFloat(settings.silenceThreshold || "0.5");
  const doSilence = (settings.removeSilences ?? true) && words.length > 0;
  const doFillers = (settings.removeFillers ?? false) && words.length > 0;

  // Build speech segments (silence removal + filler word cut combined)
  let segments: Segment[] = (doSilence || doFillers)
    ? buildSegments(words, doSilence ? threshold : 9999, doFillers, settings.fillerWords)
    : [{ start: 0, end: Math.max(videoDuration, 1) }];
  if (!segments.length) segments = [{ start: 0, end: Math.max(videoDuration, 1) }];

  const ctx = buildCondensedCtx(segments, speed);

  // Temp files
  const tmpFiles: string[] = [];
  const makeTmp = (label: string, ext: string) => {
    const p = path.join(os.tmpdir(), `oravini-${label}-${Date.now()}.${ext}`);
    tmpFiles.push(p);
    return p;
  };

  try {
    // ── filter_complex: silence removal + concat ──────────────────────────────
    const fc: string[] = [];
    const vLabels: string[] = [];
    const aLabels: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      fc.push(`[0:v]trim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`);
      fc.push(`[0:a]atrim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
      vLabels.push(`[v${i}]`);
      aLabels.push(`[a${i}]`);
    }

    const concatPairs = vLabels.map((v, i) => `${v}${aLabels[i]}`).join("");
    fc.push(`${concatPairs}concat=n=${segments.length}:v=1:a=1[cv][ca]`);

    // ── Video effect chain ────────────────────────────────────────────────────
    const vfx: string[] = [];
    if (speed !== 1) vfx.push(`setpts=PTS/${speed.toFixed(4)}`);
    const cg = colorGradeFilter(settings.colorGrade || "none");
    if (cg) vfx.push(cg);
    vfx.push(cropScaleFilter(settings.reframe || "none", settings.platform || "original"));

    // Text overlays via textfile (avoids shell-escaping the text itself)
    const fontPath = findFontPath();
    const fontArg = fontPath ? `:fontfile=${escFfPath(fontPath)}` : "";

    if (settings.hookOpener?.trim()) {
      const tf = makeTmp("hook", "txt");
      fs.writeFileSync(tf, settings.hookOpener.trim(), "utf8");
      vfx.push(`drawtext=textfile=${escFfPath(tf)}${fontArg}:fontsize=80:fontcolor=white:borderw=5:bordercolor=black:x=(w-text_w)/2:y=h*0.15:enable='between(t,0,3)'`);
    }
    if (settings.lowerThird?.trim()) {
      const tf = makeTmp("lower", "txt");
      fs.writeFileSync(tf, settings.lowerThird.trim(), "utf8");
      vfx.push(`drawtext=textfile=${escFfPath(tf)}${fontArg}:fontsize=52:fontcolor=white:borderw=4:bordercolor=black:box=1:boxcolor=black@0.5:boxborderw=8:x=(w-text_w)/2:y=h*0.75`);
    }
    if (settings.watermarkText?.trim()) {
      const tf = makeTmp("wm", "txt");
      fs.writeFileSync(tf, settings.watermarkText.trim(), "utf8");
      vfx.push(`drawtext=textfile=${escFfPath(tf)}${fontArg}:fontsize=36:fontcolor=white@0.7:borderw=2:bordercolor=black@0.5:x=w-text_w-20:y=20`);
    }

    // Subscribe / CTA overlay (bottom center)
    if (settings.addSubscribeCta && settings.ctaText?.trim()) {
      const tf = makeTmp("cta", "txt");
      fs.writeFileSync(tf, settings.ctaText.trim(), "utf8");
      vfx.push(`drawtext=textfile=${escFfPath(tf)}${fontArg}:fontsize=44:fontcolor=white:borderw=4:bordercolor=black:box=1:boxcolor=0xFF0000@0.85:boxborderw=12:x=(w-text_w)/2:y=h*0.88`);
    }

    // ASS subtitles
    if ((settings.addCaptions ?? true) && words.length > 0) {
      const assPath = makeTmp("subs", "ass");
      fs.writeFileSync(assPath, generateAss(words, ctx, settings.captionStyle || "bold"), "utf8");
      vfx.push(`subtitles='${escFfPath(assPath)}'`);
    }

    fc.push(`[cv]${vfx.join(",")}[ov]`);

    // ── Audio effect chain ────────────────────────────────────────────────────
    const afx: string[] = [];
    const tempo = audioTempoFilters(speed);
    if (tempo) afx.push(tempo);
    if (settings.audioRestore) {
      // Noise gate + high-pass + voice presence boost
      afx.push("highpass=f=80,lowpass=f=8000,afftdn=nf=-25,equalizer=f=3000:t=q:w=1:g=3");
    }
    if (settings.audioNormalize) afx.push("loudnorm=I=-14:LRA=11:TP=-1.5");

    if (afx.length > 0) {
      fc.push(`[ca]${afx.join(",")}[oa]`);
    }

    const hasMusicUrl = settings.musicUrl?.trim();
    const finalV = "ov";
    let finalA = afx.length > 0 ? "oa" : "ca";

    // ── Music mixing (background track) ──────────────────────────────────────
    const args: string[] = ["-y", "-i", inputPath];
    if (hasMusicUrl) {
      args.push("-i", hasMusicUrl);
      // Mix: voice at full vol, music at musicVolume (default 0.15)
      const mv = parseFloat(settings.musicVolume || "0.15");
      const voiceLabel = finalA;
      fc.push(`[1:a]volume=${mv},aloop=loop=-1:size=2e+09[music]`);
      fc.push(`[${voiceLabel}][music]amix=inputs=2:duration=first:normalize=0[mixed]`);
      finalA = "mixed";
    }

    args.push(
      "-filter_complex", fc.join(";"),
      "-map", `[${finalV}]`,
      "-map", `[${finalA}]`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputPath,
    );

    await spawnFfmpeg(args);
  } finally {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

// ── Probe video duration ──────────────────────────────────────────────────────

export function probeDuration(inputPath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(FFPROBE, [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      inputPath,
    ], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.on("close", () => {
      try {
        const data = JSON.parse(out);
        const stream = data.streams?.find((s: any) => s.codec_type === "video") || data.streams?.[0];
        resolve(parseFloat(stream?.duration || "0"));
      } catch {
        resolve(0);
      }
    });
    proc.on("error", () => resolve(0));
  });
}
