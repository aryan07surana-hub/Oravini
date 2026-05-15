import { spawn, type ChildProcess } from "child_process";
import { WebSocket } from "ws";
import fs from "fs";
import path from "path";

const FFMPEG_PATH = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
const HLS_DIR = path.resolve("hls");

interface RelaySession {
  streamKey: string;
  ffmpeg: ChildProcess;
  ws: WebSocket;
  chunkCount: number;
  startTime: number;
}

const activeRelays = new Map<string, RelaySession>();

if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR, { recursive: true });
const liveHlsDir = path.join(HLS_DIR, "live");
if (!fs.existsSync(liveHlsDir)) fs.mkdirSync(liveHlsDir, { recursive: true });

export function getActiveRelays(): Map<string, RelaySession> {
  return activeRelays;
}

export function isStreamActive(streamKey: string): boolean {
  return activeRelays.has(streamKey);
}

export function startRelay(ws: WebSocket, streamKey: string): RelaySession | null {
  if (activeRelays.has(streamKey)) {
    console.log(`[relay] Stream ${streamKey} already active`);
    return null;
  }

  const rtmpUrl = `rtmp://localhost:${process.env.RTMP_PORT || "1935"}/live/${streamKey}`;
  const hlsPath = path.join(HLS_DIR, "live", `${streamKey}.m3u8`);

  const hlsFlags = "hls_time=2:hls_list_size=30:hls_flags=delete_segments+append_list";
  const teeOutput = `[f=flv:onfail=ignore]${rtmpUrl}|[f=hls:onfail=ignore:${hlsFlags}]${hlsPath}`;

  const ffmpeg = spawn(FFMPEG_PATH, [
    "-i", "pipe:0",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-tune", "zerolatency",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "64k",
    "-ar", "44100",
    "-ac", "1",
    "-f", "tee",
    "-map", "0:v", "-map", "0:a",
    teeOutput,
  ], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const session: RelaySession = {
    streamKey,
    ffmpeg,
    ws,
    chunkCount: 0,
    startTime: Date.now(),
  };

  activeRelays.set(streamKey, session);

  ffmpeg.stderr?.on("data", (data) => {
    if (process.env.NODE_ENV !== "production") {
      const msg = data.toString();
      if (msg.includes("Error") || msg.includes("error")) {
        console.error(`[relay] ffmpeg error: ${msg}`);
      }
    }
  });

  ffmpeg.on("error", (err) => {
    console.error(`[relay] ffmpeg process error: ${err.message}`);
    cleanupRelay(streamKey);
  });

  ffmpeg.on("exit", (code) => {
    console.log(`[relay] ffmpeg exited with code ${code} for ${streamKey}`);
    cleanupRelay(streamKey);
  });

  console.log(`[relay] Started: ${streamKey} → ${rtmpUrl}`);
  return session;
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

  try {
    session.ffmpeg.stdin?.end();
  } catch {}

  const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(1);
  console.log(`[relay] Stopped: ${streamKey} (${session.chunkCount} chunks, ${elapsed}s)`);

  cleanupRelay(streamKey);
  cleanupHlsFiles(streamKey);
}

function cleanupHlsFiles(streamKey: string): void {
  const liveDir = path.join(HLS_DIR, "live");
  if (!fs.existsSync(liveDir)) return;
  const prefix = path.join(liveDir, streamKey);
  try {
    const files = fs.readdirSync(liveDir);
    for (const file of files) {
      if (file.startsWith(streamKey) && (file.endsWith(".ts") || file.endsWith(".m3u8"))) {
        fs.rmSync(path.join(liveDir, file), { force: true });
      }
    }
  } catch {}
}

function cleanupRelay(streamKey: string): void {
  const session = activeRelays.get(streamKey);
  if (!session) return;

  activeRelays.delete(streamKey);

  try {
    session.ffmpeg.kill("SIGTERM");
    setTimeout(() => {
      try { session.ffmpeg.kill("SIGKILL"); } catch {}
    }, 5000);
  } catch {}
}
