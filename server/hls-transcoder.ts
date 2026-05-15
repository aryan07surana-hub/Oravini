import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

const FFMPEG_PATH = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
const HLS_DIR = path.resolve("hls");
const RTMP_PORT = parseInt(process.env.RTMP_PORT || "1935", 10);

if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR, { recursive: true });
const liveHlsDir = path.join(HLS_DIR, "live");
if (!fs.existsSync(liveHlsDir)) fs.mkdirSync(liveHlsDir, { recursive: true });

const activeTranscoders = new Map<string, ChildProcess>();

export function startHlsTranscode(streamKey: string): void {
  if (activeTranscoders.has(streamKey)) return;

  const rtmpUrl = `rtmp://localhost:${RTMP_PORT}/live/${streamKey}`;
  const hlsPath = path.join(HLS_DIR, "live", `${streamKey}.m3u8`);

  const ffmpeg = spawn(FFMPEG_PATH, [
    "-i", rtmpUrl,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-tune", "zerolatency",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "64k",
    "-ar", "44100",
    "-ac", "1",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "30",
    "-hls_flags", "delete_segments+append_list",
    hlsPath,
  ], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  activeTranscoders.set(streamKey, ffmpeg);

  ffmpeg.stderr?.on("data", (data) => {
    const msg = data.toString();
    if (msg.includes("Error") || msg.includes("error")) {
      console.error(`[hls] ffmpeg error for ${streamKey}: ${msg.substring(0, 200)}`);
    }
  });

  ffmpeg.on("exit", (code) => {
    console.log(`[hls] Transcoder exited (code ${code}) for ${streamKey}`);
    activeTranscoders.delete(streamKey);
  });

  console.log(`[hls] Started transcoding ${streamKey} → ${hlsPath}`);
}

export function stopHlsTranscode(streamKey: string): void {
  const ffmpeg = activeTranscoders.get(streamKey);
  if (!ffmpeg) return;

  try {
    ffmpeg.kill("SIGTERM");
    setTimeout(() => {
      try { ffmpeg.kill("SIGKILL"); } catch {}
    }, 5000);
  } catch {}

  activeTranscoders.delete(streamKey);
  cleanupHlsFiles(streamKey);
  console.log(`[hls] Stopped transcoding ${streamKey}`);
}

function cleanupHlsFiles(streamKey: string): void {
  const liveDir = path.join(HLS_DIR, "live");
  if (!fs.existsSync(liveDir)) return;
  try {
    const files = fs.readdirSync(liveDir);
    for (const file of files) {
      if (file.startsWith(streamKey) && (file.endsWith(".ts") || file.endsWith(".m3u8"))) {
        fs.rmSync(path.join(liveDir, file), { force: true });
      }
    }
  } catch {}
}

export function stopAllTranscoders(): void {
  for (const [key] of activeTranscoders) {
    stopHlsTranscode(key);
  }
}

export function isTranscoding(streamKey: string): boolean {
  return activeTranscoders.has(streamKey);
}
