/**
 * render-queue.ts — BullMQ queue definition + shared Redis connection.
 * Imported by both routes.ts (to enqueue) and render-worker.ts (to process).
 */
import { Queue } from "bullmq";
import type { RenderSettings } from "./video-ffmpeg";

// ── Job payload ───────────────────────────────────────────────────────────────

export interface RenderJobData {
  editId:     number;
  userId:     string;
  filePath:   string;
  outputPath: string;
  settings:   RenderSettings;
  duration:   number;
  transcript: any;
  baseUrl:    string;  // e.g. "https://oravini.com" — used to build outputUrl
}

// ── Redis connection (works with Render.com Redis URL or local) ───────────────

export function getRedisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const u = new URL(url);
    return {
      host:     u.hostname,
      port:     parseInt(u.port || "6379"),
      password: u.password || undefined,
      tls:      u.protocol === "rediss:" ? ({} as any) : undefined,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

export const redisConnection = getRedisConnection();

// ── Queue ─────────────────────────────────────────────────────────────────────

export const renderQueue = new Queue<RenderJobData>("video-render", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts:         2,
    backoff:          { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 50 },
  },
});
