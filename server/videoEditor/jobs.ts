/**
 * Background job queue for video processing (transcription, renders, clip
 * editor exports, ffmpeg analysis).
 *
 * Why: on Render's free tier a web request must never wait on ffmpeg — requests
 * time out, cold starts take ~50s and the instance has 512MB RAM. Every heavy
 * task is therefore stored as a row in `video_editor_jobs`, the route returns
 * `{ jobId }` immediately, and the client polls GET /api/video-editor/jobs/:id.
 *
 * - Jobs are claimed with FOR UPDATE SKIP LOCKED so two instances never run the
 *   same job.
 * - Concurrency defaults to 1 (VIDEO_JOB_CONCURRENCY) to keep ffmpeg within the
 *   free-tier memory budget.
 * - On boot, jobs left "running" by a restart are re-queued; handlers fail them
 *   with a clear message if their source file was wiped with the ephemeral disk.
 */
import { pool } from "../storage";

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface JobRow {
  id: number;
  user_id: string;
  edit_id: number | null;
  kind: string;
  status: JobStatus;
  progress: number;
  stage: string | null;
  payload: any;
  result: any;
  error: string | null;
  attempts: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface JobContext {
  /** progress in 0..1; throttled DB writes. */
  progress(p: number, stage?: string): Promise<void>;
}

type Handler = (job: JobRow, ctx: JobContext) => Promise<any>;

const handlers = new Map<string, Handler>();
const CONCURRENCY = Math.max(1, parseInt(process.env.VIDEO_JOB_CONCURRENCY || "1", 10) || 1);
const MAX_ATTEMPTS = 2;
let running = 0;
let schemaReady: Promise<void> | null = null;
let timer: NodeJS.Timeout | null = null;

/** Additive, idempotent schema (also run from server/index.ts migrations). */
export const VIDEO_EDITOR_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS video_editor_jobs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    edit_id INTEGER,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    progress REAL NOT NULL DEFAULT 0,
    stage TEXT,
    payload JSONB,
    result JSONB,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_video_editor_jobs_status ON video_editor_jobs(status, id);
  CREATE INDEX IF NOT EXISTS idx_video_editor_jobs_user ON video_editor_jobs(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_video_editor_jobs_edit ON video_editor_jobs(edit_id, created_at DESC);
  ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS edl JSONB;
  ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS chat_history JSONB;
  ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload';
  ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS source_remote_url TEXT;
  ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS output_engine TEXT;
  ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS output_watermarked BOOLEAN DEFAULT FALSE;
  ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS output_meta JSONB;
  ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS error TEXT;
  ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
`;

export function ensureVideoEditorSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(VIDEO_EDITOR_SCHEMA_SQL).then(() => undefined).catch((e: any) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export function registerJobHandler(kind: string, handler: Handler) {
  handlers.set(kind, handler);
}

export async function enqueueJob(input: { userId: string; kind: string; editId?: number | null; payload?: any; stage?: string }): Promise<JobRow> {
  await ensureVideoEditorSchema();
  const { rows } = await pool.query(
    `INSERT INTO video_editor_jobs (user_id, edit_id, kind, payload, stage) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.userId, input.editId ?? null, input.kind, JSON.stringify(input.payload ?? {}), input.stage || "Queued"],
  );
  setImmediate(pump);
  return rows[0];
}

export async function getJob(id: number, userId: string): Promise<JobRow | null> {
  await ensureVideoEditorSchema();
  const { rows } = await pool.query(`SELECT * FROM video_editor_jobs WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] || null;
}

export async function latestJobForEdit(editId: number, userId: string, kinds?: string[]): Promise<JobRow | null> {
  await ensureVideoEditorSchema();
  const { rows } = kinds?.length
    ? await pool.query(`SELECT * FROM video_editor_jobs WHERE edit_id = $1 AND user_id = $2 AND kind = ANY($3) ORDER BY id DESC LIMIT 1`, [editId, userId, kinds])
    : await pool.query(`SELECT * FROM video_editor_jobs WHERE edit_id = $1 AND user_id = $2 ORDER BY id DESC LIMIT 1`, [editId, userId]);
  return rows[0] || null;
}

export async function queuePosition(job: JobRow): Promise<number> {
  if (job.status !== "queued") return 0;
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM video_editor_jobs WHERE status IN ('queued','running') AND id < $1`, [job.id]);
  return rows[0]?.n || 0;
}

/** Public, client-safe view of a job. */
export function publicJob(job: JobRow, position = 0) {
  return {
    id: job.id,
    editId: job.edit_id,
    kind: job.kind,
    status: job.status,
    progress: Math.round((job.progress || 0) * 100),
    stage: job.stage,
    result: job.status === "done" ? job.result : null,
    error: job.error,
    queuePosition: position,
    createdAt: job.created_at,
    startedAt: job.started_at,
    finishedAt: job.finished_at,
  };
}

async function claim(): Promise<JobRow | null> {
  const { rows } = await pool.query(`
    UPDATE video_editor_jobs SET status = 'running', started_at = NOW(), attempts = attempts + 1, stage = COALESCE(stage, 'Starting')
    WHERE id = (
      SELECT id FROM video_editor_jobs WHERE status = 'queued' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1
    ) RETURNING *`);
  return rows[0] || null;
}

async function runOne(job: JobRow) {
  const handler = handlers.get(job.kind);
  let lastWrite = 0;
  const ctx: JobContext = {
    async progress(p, stage) {
      const now = Date.now();
      if (now - lastWrite < 1000 && !stage) return;
      lastWrite = now;
      await pool.query(`UPDATE video_editor_jobs SET progress = $1, stage = COALESCE($2, stage) WHERE id = $3`, [Math.max(0, Math.min(1, p)), stage ?? null, job.id]).catch(() => {});
    },
  };
  try {
    if (!handler) throw new Error(`No handler registered for job kind "${job.kind}"`);
    const result = await handler(job, ctx);
    await pool.query(
      `UPDATE video_editor_jobs SET status = 'done', progress = 1, stage = 'Done', result = $1, error = NULL, finished_at = NOW() WHERE id = $2`,
      [JSON.stringify(result ?? {}), job.id],
    );
  } catch (e: any) {
    const msg = String(e?.userMessage || e?.message || e).slice(0, 1000);
    console.error(`[video-jobs] job ${job.id} (${job.kind}) failed:`, e?.message || e);
    await pool.query(`UPDATE video_editor_jobs SET status = 'failed', stage = 'Failed', error = $1, finished_at = NOW() WHERE id = $2`, [msg, job.id]).catch(() => {});
  }
}

export async function pump(): Promise<void> {
  try {
    await ensureVideoEditorSchema();
  } catch (e: any) {
    console.warn("[video-jobs] schema not ready:", e.message);
    return;
  }
  while (running < CONCURRENCY) {
    let job: JobRow | null = null;
    try { job = await claim(); } catch (e: any) { console.warn("[video-jobs] claim failed:", e.message); return; }
    if (!job) return;
    running++;
    runOne(job).finally(() => { running--; setImmediate(pump); });
  }
}

/** Call once at boot: re-queue jobs interrupted by a restart and start polling. */
export async function startVideoJobRunner(): Promise<void> {
  try {
    await ensureVideoEditorSchema();
    const { rows } = await pool.query(
      `UPDATE video_editor_jobs SET status = CASE WHEN attempts >= $1 THEN 'failed' ELSE 'queued' END,
              error = CASE WHEN attempts >= $1 THEN 'Interrupted by a server restart. Please try again.' ELSE error END,
              finished_at = CASE WHEN attempts >= $1 THEN NOW() ELSE NULL END,
              stage = CASE WHEN attempts >= $1 THEN 'Failed' ELSE 'Re-queued after restart' END
       WHERE status = 'running' RETURNING id, status`,
      [MAX_ATTEMPTS],
    );
    if (rows.length) console.log(`[video-jobs] recovered ${rows.length} interrupted job(s)`);
  } catch (e: any) {
    console.warn("[video-jobs] recovery skipped:", e.message);
  }
  if (!timer) {
    timer = setInterval(() => { pump().catch(() => {}); }, 10_000);
    timer.unref?.();
  }
  pump().catch(() => {});
}
