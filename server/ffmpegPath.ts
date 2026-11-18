import fs from "fs";
import path from "path";
import { createRequire } from "module";

/**
 * Single source of truth for the ffmpeg / ffprobe binaries.
 *
 * Resolution order:
 *   1. process.env.FFMPEG_PATH / process.env.FFPROBE_PATH
 *   2. bundled binary from ffmpeg-static / ffprobe-static (npm, free)
 *   3. bare "ffmpeg" / "ffprobe" (whatever is on PATH)
 *
 * Never hardcode a platform-specific path (e.g. /opt/homebrew/bin/ffmpeg):
 * it does not exist on Linux hosts like Render, and spawning a missing
 * binary without an "error" listener crashes the whole Node process.
 */

// Works in both the ESM dev runtime (tsx) and the CJS production bundle.
const req: NodeRequire =
  typeof require === "function" ? require : createRequire(import.meta.url);

function tryStaticFfmpeg(): string | null {
  try {
    const mod = req("ffmpeg-static");
    const p = typeof mod === "string" ? mod : mod?.default ?? mod?.path;
    return typeof p === "string" && p ? p : null;
  } catch {
    return null;
  }
}

function tryStaticFfprobe(): string | null {
  // ffprobe-static calls process.exit() on unsupported platforms at require
  // time, so only load it where it ships a binary.
  if (!["linux", "darwin", "win32"].includes(process.platform)) return null;
  try {
    const mod = req("ffprobe-static");
    const p = mod?.path ?? mod?.default?.path;
    return typeof p === "string" && p ? p : null;
  } catch {
    return null;
  }
}

function resolveBinary(envVar: string | undefined, staticPath: string | null, fallback: string): string {
  const fromEnv = envVar?.trim();
  if (fromEnv) {
    // An explicit path that doesn't exist on this host (e.g. a macOS Homebrew
    // path copied into a Linux deploy) falls through to the bundled binary.
    if (binaryExists(fromEnv)) return fromEnv;
    console.warn(`[ffmpeg] Configured path ${fromEnv} does not exist on this host; falling back`);
  }
  if (staticPath && fs.existsSync(staticPath)) return staticPath;
  return fallback;
}

export const FFMPEG_PATH: string = resolveBinary(process.env.FFMPEG_PATH, tryStaticFfmpeg(), "ffmpeg");
// Back-compat: when only FFMPEG_PATH is set (e.g. /usr/bin/ffmpeg), prefer the
// ffprobe sitting next to it, as the clip editor did before.
function siblingFfprobe(): string | undefined {
  const ff = process.env.FFMPEG_PATH?.trim();
  if (!ff || (!ff.includes("/") && !ff.includes("\\"))) return undefined;
  const candidate = path.join(path.dirname(ff), process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
  return fs.existsSync(candidate) ? candidate : undefined;
}

export const FFPROBE_PATH: string = resolveBinary(
  process.env.FFPROBE_PATH || siblingFfprobe(),
  tryStaticFfprobe(),
  "ffprobe",
);

/**
 * True if the binary exists: a path is checked on disk, a bare command name
 * ("ffmpeg") is looked up on PATH. Spawn "error" handlers remain the backstop.
 */
export function binaryExists(bin: string): boolean {
  try {
    if (bin.includes("/") || bin.includes("\\")) return fs.existsSync(bin);
    const exts = process.platform === "win32" ? ["", ".exe", ".cmd"] : [""];
    for (const dir of (process.env.PATH || "").split(path.delimiter)) {
      if (!dir) continue;
      for (const ext of exts) {
        if (fs.existsSync(path.join(dir, bin + ext))) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function ffmpegAvailable(): boolean {
  return binaryExists(FFMPEG_PATH);
}

let logged = false;
export function logFfmpegResolution(): void {
  if (logged) return;
  logged = true;
  const ok = ffmpegAvailable();
  console[ok ? "log" : "warn"](
    `[ffmpeg] ffmpeg=${FFMPEG_PATH}${ok ? "" : " (NOT FOUND — media tasks disabled)"} ffprobe=${FFPROBE_PATH}`,
  );
}
