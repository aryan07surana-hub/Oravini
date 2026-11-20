import { spawn } from "child_process";
import { FFMPEG_PATH, FFPROBE_PATH } from "../ffmpegPath";

export interface ProbeInfo {
  duration: number;
  width: number | null;
  height: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  rotation: number;
}

/** ffprobe a local path or http(s) URL. */
export function probe(input: string): Promise<ProbeInfo> {
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const proc = spawn(FFPROBE_PATH, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", input]);
    proc.on("error", e => reject(new Error(`ffprobe could not be started (${FFPROBE_PATH}): ${e.message}`)));
    proc.stdout.on("data", d => (out += d));
    proc.stderr.on("data", d => (err += d));
    proc.on("close", code => {
      if (code !== 0) return reject(new Error(`ffprobe failed: ${err.slice(-300) || `exit ${code}`}`));
      try {
        const j = JSON.parse(out);
        const streams: any[] = j.streams || [];
        const v = streams.find(s => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
        const a = streams.find(s => s.codec_type === "audio");
        const rot = Number(v?.tags?.rotate ?? v?.side_data_list?.find((x: any) => x.rotation !== undefined)?.rotation ?? 0) || 0;
        let width = v?.width ?? null, height = v?.height ?? null;
        if (Math.abs(rot) === 90 || Math.abs(rot) === 270) [width, height] = [height, width];
        resolve({
          duration: parseFloat(j.format?.duration) || parseFloat(v?.duration) || parseFloat(a?.duration) || 0,
          width, height, hasVideo: !!v, hasAudio: !!a, rotation: rot,
        });
      } catch (e: any) {
        reject(new Error(`ffprobe output parse error: ${e.message}`));
      }
    });
  });
}

/**
 * Run ffmpeg. `onProgress` receives processed output seconds (parsed from
 * -progress), so callers can turn it into a percentage.
 */
export function runFfmpeg(args: string[], opts: { onProgress?: (outSeconds: number) => void; timeoutMs?: number } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const full = ["-hide_banner", "-nostdin", "-y", ...(opts.onProgress ? ["-progress", "pipe:1", "-nostats"] : []), ...args];
    const proc = spawn(FFMPEG_PATH, full);
    let tail = "";
    let buf = "";
    const timer = opts.timeoutMs ? setTimeout(() => { proc.kill("SIGKILL"); }, opts.timeoutMs) : null;
    proc.on("error", e => { if (timer) clearTimeout(timer); reject(new Error(`ffmpeg could not be started (${FFMPEG_PATH}): ${e.message}`)); });
    proc.stderr.on("data", (d: Buffer) => { tail = (tail + d.toString()).slice(-4000); });
    proc.stdout.on("data", (d: Buffer) => {
      if (!opts.onProgress) return;
      buf += d.toString();
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const l of lines) {
        const m = l.match(/^out_time_(?:us|ms)=(\d+)/);
        if (m) opts.onProgress(parseInt(m[1], 10) / 1e6);
      }
    });
    proc.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      if (code === 0) return resolve();
      const reason = signal ? `killed (${signal}${opts.timeoutMs ? ", timed out" : ""})` : `exit ${code}`;
      const lastLines = tail.split("\n").filter(Boolean).slice(-6).join(" | ");
      reject(new Error(`ffmpeg ${reason}: ${lastLines}`));
    });
  });
}
