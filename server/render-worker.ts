/**
 * render-worker.ts — standalone BullMQ worker for video rendering.
 *
 * Dev:  tsx server/render-worker.ts
 * Prod: node dist/worker.cjs
 *
 * Reads from the "video-render" BullMQ queue and runs one ffmpeg pipeline
 * per job. CONCURRENCY jobs run in parallel (default 3).
 * Also runs a cleanup cron every 6h to delete old rendered files.
 */
import "dotenv/config";
import path from "path";
import fs from "fs";
import { Worker } from "bullmq";
import { eq, and, lt } from "drizzle-orm";

import { redisConnection, type RenderJobData } from "./render-queue";
import { renderWithFfmpeg } from "./video-ffmpeg";
import { db, pool } from "./storage";
import { videoEdits } from "../shared/schema";

// ── Config ────────────────────────────────────────────────────────────────────

const CONCURRENCY       = parseInt(process.env.RENDER_CONCURRENCY  || "3");
const CLEANUP_AGE_DAYS  = parseInt(process.env.RENDER_CLEANUP_DAYS || "7");
const RENDERED_DIR      = path.resolve(process.env.RENDERED_DIR    || "uploads/rendered");

console.log(`[render-worker] starting | concurrency=${CONCURRENCY} | cleanup=${CLEANUP_AGE_DAYS}d`);

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker<RenderJobData>(
  "video-render",
  async (job) => {
    const { editId, filePath, outputPath, settings, duration, transcript } = job.data;
    console.log(`[render-worker] job ${job.id} started — editId=${editId}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Source file missing: ${filePath}`);
    }

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    await job.updateProgress(10);
    await renderWithFfmpeg(filePath, outputPath, transcript, settings, duration);
    await job.updateProgress(100);

    console.log(`[render-worker] job ${job.id} done — editId=${editId}`);
  },
  { connection: redisConnection, concurrency: CONCURRENCY }
);

// ── Completion handler — write outputUrl to DB ────────────────────────────────

worker.on("completed", async (job) => {
  const { editId, userId, baseUrl } = job.data;
  const outputUrl = `${baseUrl}/uploads/rendered/edit-${editId}.mp4`;
  try {
    await db
      .update(videoEdits)
      .set({ status: "done", outputUrl })
      .where(and(eq(videoEdits.id, editId), eq(videoEdits.userId, userId)));
    console.log(`[render-worker] DB done — editId=${editId}`);
  } catch (e: any) {
    console.error(`[render-worker] DB update failed — editId=${editId}:`, e.message);
  }
});

// ── Failure handler ───────────────────────────────────────────────────────────

worker.on("failed", async (job, err) => {
  if (!job) return;
  const { editId, userId } = job.data;
  console.error(`[render-worker] job failed — editId=${editId}:`, err.message);
  try {
    await db
      .update(videoEdits)
      .set({ status: "failed" })
      .where(and(eq(videoEdits.id, editId), eq(videoEdits.userId, userId)));
  } catch {}
});

// ── Cleanup cron — every 6 hours ──────────────────────────────────────────────

async function cleanupOldRenders() {
  const cutoffDate = new Date(Date.now() - CLEANUP_AGE_DAYS * 86_400_000);
  let filesDeleted = 0;

  // 1. Delete old files from disk
  if (fs.existsSync(RENDERED_DIR)) {
    for (const file of fs.readdirSync(RENDERED_DIR)) {
      const fp = path.join(RENDERED_DIR, file);
      try {
        const { mtimeMs } = fs.statSync(fp);
        if (mtimeMs < cutoffDate.getTime()) {
          fs.unlinkSync(fp);
          filesDeleted++;
        }
      } catch {}
    }
  }

  if (filesDeleted > 0) {
    console.log(`[render-worker] cleanup: deleted ${filesDeleted} old files from disk`);
  }

  // 2. Reset DB rows whose output file is now gone — user can re-render
  try {
    const stale = await db
      .select({ id: videoEdits.id, userId: videoEdits.userId, outputUrl: videoEdits.outputUrl })
      .from(videoEdits)
      .where(lt(videoEdits.createdAt, cutoffDate));

    let dbReset = 0;
    for (const row of stale) {
      if (!row.outputUrl) continue;
      // Check if the file still exists on disk
      const localPath = row.outputUrl.replace(/^https?:\/\/[^/]+/, "").replace("/uploads/", "uploads/");
      const fullPath = path.resolve(localPath);
      if (!fs.existsSync(fullPath)) {
        await db
          .update(videoEdits)
          .set({ status: "transcribed", outputUrl: null })
          .where(eq(videoEdits.id, row.id));
        dbReset++;
      }
    }
    if (dbReset > 0) {
      console.log(`[render-worker] cleanup: reset ${dbReset} stale DB rows`);
    }
  } catch (e: any) {
    console.error("[render-worker] cleanup DB error:", e.message);
  }
}

// Run once at boot, then every 6 hours
cleanupOldRenders();
setInterval(cleanupOldRenders, 6 * 60 * 60 * 1000);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`[render-worker] ${signal} — shutting down…`);
  await worker.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
