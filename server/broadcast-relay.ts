import { spawn, type ChildProcess } from "child_process";
import { WebSocket } from "ws";
import fs from "fs";
import path from "path";
import os from "os";

const FFMPEG_PATH = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
const HLS_DIR = path.resolve("hls");

interface VideoVariant {
  name: string;
  width: number;
  height: number;
  bitrateK: string;
  maxrateK: string;
  bufsizeK: string;
}

interface RelaySession {
  streamKey: string;
  ffmpeg: ChildProcess;
  ws: WebSocket;
  chunkCount: number;
  startTime: number;
  quality: string;
}

const activeRelays = new Map<string, RelaySession>();

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

export function getActiveRelays(): Map<string, RelaySession> {
  return activeRelays;
}

export function isStreamActive(streamKey: string): boolean {
  return activeRelays.has(streamKey);
}

export function startRelay(ws: WebSocket, streamKey: string, quality: string = "1080p"): RelaySession | null {
  if (activeRelays.has(streamKey)) {
    console.log(`[relay] Stream ${streamKey} already active`);
    return null;
  }

  const variants = PRESETS[quality] || PRESETS["1080p"];
  const streamDir = path.join(HLS_DIR, "live", streamKey);
  fs.mkdirSync(streamDir, { recursive: true });

  const ffmpeg = spawn(FFMPEG_PATH, buildFfmpegArgs(variants, streamDir), {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const session: RelaySession = {
    streamKey, ffmpeg, ws, chunkCount: 0, startTime: Date.now(), quality,
  };
  activeRelays.set(streamKey, session);
  wireEvents(streamKey);

  const variantNames = variants.map(v => `${v.name}(${v.width}x${v.height}@${v.bitrateK}k)`).join(", ");
  const enc = isMac ? "videotoolbox" : "libx264";
  console.log(`[relay] Started ${quality} (${enc}): ${streamKey} [${variantNames}]`);
  return session;
}

function buildFfmpegArgs(variants: VideoVariant[], streamDir: string): string[] {
  const n = variants.length;
  if (n === 1) return singleStreamArgs(variants[0], streamDir);
  return adaptiveStreamArgs(variants, streamDir);
}

function singleStreamArgs(v: VideoVariant, streamDir: string): string[] {
  const hlsPath = path.join(streamDir, "index.m3u8");
  const encoder = isMac ? "videotoolbox" : "libx264";
  const base: string[] = ["-i", "pipe:0"];

  if (isMac) {
    base.push("-c:v", "videotoolbox", "-quality", "90", "-b:v", `${v.bitrateK}k`, "-maxrate", `${v.maxrateK}k`, "-bufsize", `${v.bufsizeK}k`);
  } else {
    base.push("-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "28");
  }

  if (v.width > 0) {
    base.push("-vf", `scale=${v.width}:${v.height}:force_original_aspect_ratio=decrease,pad=${v.width}:${v.height}:(ow-iw)/2:(oh-ih)/2`);
  }

  base.push(
    "-c:a", "aac", "-b:a", "64k", "-ar", "44100", "-ac", "1",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "30",
    "-hls_flags", "delete_segments+append_list",
    hlsPath,
  );
  return base;
}

function adaptiveStreamArgs(variants: VideoVariant[], streamDir: string): string[] {
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
    if (isMac) {
      encoders.push("-c:v:0", "videotoolbox", "-b:v:0", `${v.bitrateK}k`, "-maxrate:v:0", `${v.maxrateK}k`, "-bufsize:v:0", `${v.bufsizeK}k`, "-quality", "85");
    } else {
      encoders.push("-c:v:0", "libx264", "-preset", "fast", "-crf", "23");
    }
  });

  return [
    "-i", "pipe:0",
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
  ];
}

function wireEvents(streamKey: string): void {
  const session = activeRelays.get(streamKey);
  if (!session) return;
  const { ffmpeg } = session;

  ffmpeg.stderr?.on("data", (data) => {
    const msg = data.toString();
    if (msg.includes("Error") || msg.includes("error") || msg.includes("failed")) {
      console.error(`[relay] ffmpeg[${streamKey}]: ${msg.substring(0, 300)}`);
    }
  });

  ffmpeg.on("error", (err) => {
    console.error(`[relay] ffmpeg process error for ${streamKey}: ${err.message}`);
    cleanupRelay(streamKey);
  });

  ffmpeg.on("exit", (code, signal) => {
    console.log(`[relay] ffmpeg exited (code=${code}, signal=${signal}) for ${streamKey}`);
    cleanupRelay(streamKey);
  });
}

export function relayChunk(streamKey: string, chunk: Buffer): boolean {
  const session = activeRelays.get(streamKey);
  if (!session) return false;
  try {
    session.ffmpeg.stdin?.write(chunk);
    session.chunkCount++;
    return true;
  } catch (err) {
    console.error(`[relay] Write error for ${streamKey}: ${err}`);
    cleanupRelay(streamKey);
    return false;
  }
}

export function stopRelay(streamKey: string): void {
  const session = activeRelays.get(streamKey);
  if (!session) return;
  try { session.ffmpeg.stdin?.end(); } catch {}
  const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(1);
  console.log(`[relay] Stopped: ${streamKey} (${session.chunkCount} chunks, ${elapsed}s)`);
  cleanupRelay(streamKey);
  cleanupHlsFiles(streamKey);
}

function cleanupHlsFiles(streamKey: string): void {
  const streamDir = path.join(HLS_DIR, "live", streamKey);
  if (!fs.existsSync(streamDir)) return;
  try { fs.rmSync(streamDir, { recursive: true, force: true }); console.log(`[relay] Cleaned HLS: ${streamDir}`); } catch {}
}

function cleanupRelay(streamKey: string): void {
  const session = activeRelays.get(streamKey);
  if (!session) return;
  activeRelays.delete(streamKey);
  try {
    session.ffmpeg.kill("SIGTERM");
    setTimeout(() => { try { session.ffmpeg.kill("SIGKILL"); } catch {} }, 5000);
  } catch {}
}
