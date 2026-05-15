import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const FFMPEG_PATH = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
const HLS_DIR = path.resolve("hls");
const RTMP_PORT = parseInt(process.env.RTMP_PORT || "1935", 10);

interface VideoVariant {
  name: string;
  width: number;
  height: number;
  bitrateK: string;
  maxrateK: string;
  bufsizeK: string;
}

const PRESETS: Record<string, VideoVariant[]> = {
  "4k": [
    { name: "2160p", width: 3840, height: 2160, bitrateK: "16000", maxrateK: "24000", bufsizeK: "32000" },
    { name: "1080p", width: 1920, height: 1080, bitrateK: "5000",  maxrateK: "7500",  bufsizeK: "10000" },
    { name: "720p",  width: 1280, height: 720,  bitrateK: "2500",  maxrateK: "3750",  bufsizeK: "5000"  },
    { name: "480p",  width: 854,  height: 480,  bitrateK: "1000",  maxrateK: "1500",  bufsizeK: "2000"  },
    { name: "360p",  width: 640,  height: 360,  bitrateK: "600",   maxrateK: "900",   bufsizeK: "1200"  },
  ],
  "1080p": [
    { name: "1080p", width: 1920, height: 1080, bitrateK: "5000",  maxrateK: "7500",  bufsizeK: "10000" },
    { name: "720p",  width: 1280, height: 720,  bitrateK: "2500",  maxrateK: "3750",  bufsizeK: "5000"  },
    { name: "480p",  width: 854,  height: 480,  bitrateK: "1000",  maxrateK: "1500",  bufsizeK: "2000"  },
    { name: "360p",  width: 640,  height: 360,  bitrateK: "600",   maxrateK: "900",   bufsizeK: "1200"  },
  ],
  "720p": [
    { name: "720p",  width: 1280, height: 720,  bitrateK: "2500",  maxrateK: "3750",  bufsizeK: "5000"  },
    { name: "480p",  width: 854,  height: 480,  bitrateK: "1000",  maxrateK: "1500",  bufsizeK: "2000"  },
    { name: "360p",  width: 640,  height: 360,  bitrateK: "600",   maxrateK: "900",   bufsizeK: "1200"  },
  ],
};

const isMac = os.platform() === "darwin";

if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR, { recursive: true });
const liveHlsDir = path.join(HLS_DIR, "live");
if (!fs.existsSync(liveHlsDir)) fs.mkdirSync(liveHlsDir, { recursive: true });

const activeTranscoders = new Map<string, ChildProcess>();

export function startHlsTranscode(streamKey: string): void {
  if (activeTranscoders.has(streamKey)) return;

  const quality = process.env.HLS_QUALITY || "1080p";
  const variants = PRESETS[quality] || PRESETS["1080p"];
  const streamDir = path.join(HLS_DIR, "live", streamKey);
  fs.mkdirSync(streamDir, { recursive: true });

  const rtmpUrl = `rtmp://localhost:${RTMP_PORT}/live/${streamKey}`;
  const n = variants.length;

  let ffmpeg: ChildProcess;
  if (n === 1) {
    ffmpeg = singleStreamFfmpeg(streamDir, rtmpUrl, variants[0]);
  } else {
    ffmpeg = adaptiveFfmpeg(streamDir, rtmpUrl, variants);
  }

  activeTranscoders.set(streamKey, ffmpeg);

  ffmpeg.stderr?.on("data", (data) => {
    const msg = data.toString();
    if (msg.includes("Error") || msg.includes("error") || msg.includes("failed")) {
      console.error(`[hls] ffmpeg[${streamKey}]: ${msg.substring(0, 300)}`);
    }
  });

  ffmpeg.on("exit", (code) => {
    console.log(`[hls] Transcoder exited (code ${code}) for ${streamKey}`);
    activeTranscoders.delete(streamKey);
  });

  console.log(`[hls] Started QR ${quality} adaptive HLS for ${streamKey} (${variants.map(v => v.name).join(", ")})`);
}

function singleStreamFfmpeg(streamDir: string, rtmpUrl: string, v: VideoVariant): ChildProcess {
  const hlsPath = path.join(streamDir, "index.m3u8");
  const args = ["-i", rtmpUrl];

  if (isMac) {
    args.push("-c:v", "videotoolbox", "-quality", "90", "-b:v", `${v.bitrateK}k`, "-maxrate", `${v.maxrateK}k`, "-bufsize", `${v.bufsizeK}k`);
  } else {
    args.push("-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "28");
  }

  if (v.width > 0) {
    args.push("-vf", `scale=${v.width}:${v.height}:force_original_aspect_ratio=decrease,pad=${v.width}:${v.height}:(ow-iw)/2:(oh-ih)/2`);
  }

  args.push("-c:a", "aac", "-b:a", "64k", "-ar", "44100", "-ac", "1",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "30",
    "-hls_flags", "delete_segments+append_list",
    hlsPath);

  return spawn(FFMPEG_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });
}

function adaptiveFfmpeg(streamDir: string, rtmpUrl: string, variants: VideoVariant[]): ChildProcess {
  for (const v of variants) {
    fs.mkdirSync(path.join(streamDir, v.name), { recursive: true });
  }

  const splits: string[] = [];
  const filters: string[] = [];
  const maps: string[] = [];
  const encoders: string[] = [];

  variants.forEach((v, i) => {
    splits.push(`[v${i}]`);
    filters.push(`[v${i}]scale=${v.width}:${v.height}:force_original_aspect_ratio=decrease,pad=${v.width}:${v.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[vo${i}]`);
    maps.push("-map", `[vo${i}]`);
    const enc = isMac ? "videotoolbox" : "libx264";
    encoders.push(`-c:v:${i}`, enc);
    if (isMac) {
      encoders.push(`-b:v:${i}`, `${v.bitrateK}k`, `-maxrate:v:${i}`, `${v.maxrateK}k`, `-bufsize:v:${i}`, `${v.bufsizeK}k`);
    } else {
      encoders.push("-preset", "fast", "-crf", "23");
    }
  });

  return spawn(FFMPEG_PATH, [
    "-i", rtmpUrl,
    "-filter_complex", `[0:v]split=${variants.length}${splits.join("")};\n${filters.join(";\n")}`,
    ...maps,
    "-map", "0:a",
    "-c:a", "aac",
    "-b:a", "128k",
    "-ar", "44100",
    ...encoders,
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "30",
    "-hls_flags", "delete_segments+append_list+independent_segments",
    "-master_pl_name", "master.m3u8",
    "-var_stream_map", variants.map((v, i) => `v:${i},a:0,name:${v.name}`).join(" "),
    path.join(streamDir, "%v", "stream.m3u8"),
  ], { stdio: ["ignore", "pipe", "pipe"] });
}

export function stopHlsTranscode(streamKey: string): void {
  const ffmpeg = activeTranscoders.get(streamKey);
  if (!ffmpeg) return;
  try {
    ffmpeg.kill("SIGTERM");
    setTimeout(() => { try { ffmpeg.kill("SIGKILL"); } catch {} }, 5000);
  } catch {}
  activeTranscoders.delete(streamKey);
  cleanupHlsFiles(streamKey);
  console.log(`[hls] Stopped transcoding ${streamKey}`);
}

function cleanupHlsFiles(streamKey: string): void {
  const streamDir = path.join(HLS_DIR, "live", streamKey);
  if (!fs.existsSync(streamDir)) return;
  try { fs.rmSync(streamDir, { recursive: true, force: true }); console.log(`[hls] Cleaned: ${streamDir}`); } catch {}
}

export function stopAllTranscoders(): void {
  for (const [key] of activeTranscoders) { stopHlsTranscode(key); }
}

export function isTranscoding(streamKey: string): boolean {
  return activeTranscoders.has(streamKey);
}
