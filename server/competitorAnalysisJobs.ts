// Background job runner for Competitor Deep Analysis.
//
// Why: a deep analysis runs 2 Apify scrapes + transcript mining + a large AI call,
// which routinely takes ~2 minutes. The host kills HTTP requests at ~100s, so the
// old synchronous POST /api/competitor/analyze 502'd and never completed.
//
// Now: POST creates a row here and returns 202; an in-process worker loop claims
// queued rows with FOR UPDATE SKIP LOCKED (safe with several app instances) and
// runs the analysis; the client polls GET /api/competitor/analyze/jobs/:id.
//
// Guarantees:
//  - No duplicate scrapes: a partial unique index allows only ONE queued/running
//    job per (user, client handle, competitor handle).
//  - Restart-safe: on boot, jobs left "running" by a dead process get their
//    charged credits refunded and are re-queued once (scrapes are cached for 24h,
//    so a resume is cheap); a second interruption marks them failed.
//  - Stale-lock safety: a running job whose heartbeat is older than
//    STALE_AFTER_MS is treated the same way (covers a crashed sibling instance).
//
// Additive only: one new table, no changes to existing tables.

import { pool, storage } from "./storage";

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface CompetitorAnalysisJob {
  id: string;
  user_id: string;
  client_id: string;
  client_url: string;
  competitor_url: string;
  client_handle: string;
  competitor_handle: string;
  pair_key: string;
  status: JobStatus;
  progress: number;
  stage: string | null;
  error: string | null;
  error_status: number | null;
  error_data: any;
  analysis_id: string | null;
  credits_charged: number;
  attempts: number;
  created_at: string;
  started_at: string | null;
  heartbeat_at: string | null;
  finished_at: string | null;
}

/** Error carrying an HTTP-ish status + payload so the client can react (402/403/502…). */
export class AnalysisJobError extends Error {
  status: number;
  data: Record<string, any>;
  constructor(message: string, status = 500, data: Record<string, any> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export interface JobContext {
  job: CompetitorAnalysisJob;
  user: any;
  /** Report progress (0-100) and a short human-readable stage label. */
  progress: (pct: number, stage: string) => Promise<void>;
  /** Record credits charged so a crash mid-run can refund them on recovery. */
  setCreditsCharged: (n: number) => Promise<void>;
}

/** Returns the saved analysis id. Throw AnalysisJobError for user-facing failures. */
export type JobProcessor = (ctx: JobContext) => Promise<string>;

const POLL_MS = Number(process.env.COMPETITOR_JOB_POLL_MS || 3000);
const MAX_CONCURRENT = Number(process.env.COMPETITOR_JOB_CONCURRENCY || 2);
// Heartbeat is written every 30s while a job runs, so 2 min without one = dead worker.
const STALE_AFTER_MS = Number(process.env.COMPETITOR_JOB_STALE_MS || 2 * 60 * 1000);
const MAX_ATTEMPTS = 2;

let processor: JobProcessor | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let active = 0;
let ticking = false;

export async function ensureCompetitorAnalysisJobsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS competitor_analysis_jobs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL,
      client_id VARCHAR NOT NULL,
      client_url TEXT NOT NULL,
      competitor_url TEXT NOT NULL,
      client_handle VARCHAR NOT NULL,
      competitor_handle VARCHAR NOT NULL,
      pair_key VARCHAR NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'queued',
      progress INTEGER NOT NULL DEFAULT 0,
      stage TEXT,
      error TEXT,
      error_status INTEGER,
      error_data JSONB,
      analysis_id VARCHAR,
      credits_charged INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      started_at TIMESTAMP,
      heartbeat_at TIMESTAMP,
      finished_at TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_caj_user ON competitor_analysis_jobs(user_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_caj_status ON competitor_analysis_jobs(status, created_at)`);
  // One active job per user + pair → no duplicate Apify scrapes.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_caj_active_pair
    ON competitor_analysis_jobs(user_id, pair_key)
    WHERE status IN ('queued','running')
  `);
}

export function pairKey(clientHandle: string, competitorHandle: string): string {
  const n = (h: string) => String(h || "").trim().replace(/^@+/, "").toLowerCase();
  return `${n(clientHandle)}|${n(competitorHandle)}`;
}

/**
 * Create a queued job, or return the already-active one for the same pair.
 * `created` is false when an existing active job was returned.
 */
export async function enqueueAnalysisJob(input: {
  userId: string; clientId: string; clientUrl: string; competitorUrl: string;
  clientHandle: string; competitorHandle: string;
}): Promise<{ job: CompetitorAnalysisJob; created: boolean }> {
  const key = pairKey(input.clientHandle, input.competitorHandle);
  const { rows } = await pool.query(
    `INSERT INTO competitor_analysis_jobs (user_id, client_id, client_url, competitor_url, client_handle, competitor_handle, pair_key, stage)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'Queued')
     ON CONFLICT (user_id, pair_key) WHERE status IN ('queued','running') DO NOTHING
     RETURNING *`,
    [input.userId, input.clientId, input.clientUrl, input.competitorUrl, input.clientHandle, input.competitorHandle, key],
  );
  if (rows[0]) {
    setImmediate(() => { void tick(); });
    return { job: rows[0], created: true };
  }
  const existing = await pool.query(
    `SELECT * FROM competitor_analysis_jobs WHERE user_id=$1 AND pair_key=$2 AND status IN ('queued','running') ORDER BY created_at DESC LIMIT 1`,
    [input.userId, key],
  );
  if (existing.rows[0]) return { job: existing.rows[0], created: false };
  // Race: the active job finished between INSERT and SELECT — try once more.
  return enqueueAnalysisJob(input);
}

export async function getAnalysisJob(id: string): Promise<CompetitorAnalysisJob | null> {
  const { rows } = await pool.query(`SELECT * FROM competitor_analysis_jobs WHERE id=$1`, [id]);
  return rows[0] ?? null;
}

export async function listActiveAnalysisJobs(userId: string): Promise<CompetitorAnalysisJob[]> {
  const { rows } = await pool.query(
    `SELECT * FROM competitor_analysis_jobs WHERE user_id=$1 AND status IN ('queued','running') ORDER BY created_at DESC LIMIT 10`,
    [userId],
  );
  return rows;
}

/** Public JSON shape for the client. */
export function serializeJob(j: CompetitorAnalysisJob) {
  return {
    id: j.id,
    status: j.status,
    progress: j.progress,
    stage: j.stage,
    error: j.error,
    errorStatus: j.error_status,
    errorData: j.error_data ?? null,
    analysisId: j.analysis_id,
    clientHandle: j.client_handle,
    competitorHandle: j.competitor_handle,
    clientId: j.client_id,
    createdAt: j.created_at,
    startedAt: j.started_at,
    finishedAt: j.finished_at,
  };
}

async function refundIfCharged(job: CompetitorAnalysisJob, reason: string): Promise<void> {
  if (!job.credits_charged) return;
  try {
    const user = await storage.getUser(job.user_id);
    await storage.refundCredits(job.user_id, job.credits_charged, "competitor", reason, (user as any)?.plan || "free");
    await pool.query(`UPDATE competitor_analysis_jobs SET credits_charged=0 WHERE id=$1`, [job.id]);
  } catch (e: any) {
    console.warn(`[competitor-jobs] refund failed for job ${job.id}:`, e.message);
  }
}

/**
 * Jobs stuck in "running" (process died, or a sibling instance crashed): refund any
 * credits taken, then re-queue once or fail.
 */
export async function recoverInterruptedJobs(opts: { olderThanMs: number }): Promise<number> {
  const { rows } = await pool.query(
    `SELECT * FROM competitor_analysis_jobs
     WHERE status='running' AND COALESCE(heartbeat_at, started_at, created_at) < NOW() - ($1::text || ' milliseconds')::interval`,
    [String(opts.olderThanMs)],
  );
  for (const job of rows as CompetitorAnalysisJob[]) {
    await refundIfCharged(job, "Competitor Intelligence analysis (interrupted — refunded)");
    if (job.attempts < MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE competitor_analysis_jobs SET status='queued', progress=0, stage='Resuming after a server restart', heartbeat_at=NULL WHERE id=$1 AND status='running'`,
        [job.id],
      );
    } else {
      await pool.query(
        `UPDATE competitor_analysis_jobs SET status='failed', error=$2, error_status=503, finished_at=NOW() WHERE id=$1 AND status='running'`,
        [job.id, "The analysis was interrupted by a server restart. No credits were charged — please run it again."],
      );
    }
  }
  if (rows.length) console.log(`[competitor-jobs] recovered ${rows.length} interrupted job(s)`);
  return rows.length;
}

async function claimNext(): Promise<CompetitorAnalysisJob | null> {
  const { rows } = await pool.query(`
    UPDATE competitor_analysis_jobs SET status='running', attempts=attempts+1, started_at=NOW(), heartbeat_at=NOW(), stage='Starting', progress=GREATEST(progress, 2)
    WHERE id = (
      SELECT id FROM competitor_analysis_jobs
      WHERE status='queued'
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *
  `);
  return rows[0] ?? null;
}

async function runJob(job: CompetitorAnalysisJob): Promise<void> {
  const progress = async (pct: number, stage: string) => {
    await pool.query(
      `UPDATE competitor_analysis_jobs SET progress=$2, stage=$3, heartbeat_at=NOW() WHERE id=$1`,
      [job.id, Math.max(0, Math.min(99, Math.round(pct))), stage],
    ).catch(() => {});
  };
  const setCreditsCharged = async (n: number) => {
    job.credits_charged = n;
    await pool.query(`UPDATE competitor_analysis_jobs SET credits_charged=$2, heartbeat_at=NOW() WHERE id=$1`, [job.id, n]);
  };
  // Keep the heartbeat fresh during long awaits (Apify / AI) so we are not mistaken for stale.
  const hb = setInterval(() => {
    pool.query(`UPDATE competitor_analysis_jobs SET heartbeat_at=NOW() WHERE id=$1 AND status='running'`, [job.id]).catch(() => {});
  }, 30000);
  try {
    const user = await storage.getUser(job.user_id);
    if (!user) throw new AnalysisJobError("Your account could not be loaded. Please sign in again.", 401);
    if (!processor) throw new AnalysisJobError("Analysis worker is not ready yet. Please retry in a minute.", 503);
    const analysisId = await processor({ job, user, progress, setCreditsCharged });
    await pool.query(
      `UPDATE competitor_analysis_jobs SET status='done', progress=100, stage='Done', analysis_id=$2, finished_at=NOW(), heartbeat_at=NOW() WHERE id=$1`,
      [job.id, analysisId],
    );
  } catch (err: any) {
    const status = err instanceof AnalysisJobError ? err.status : 500;
    const data = err instanceof AnalysisJobError ? err.data : {};
    console.warn(`[competitor-jobs] job ${job.id} failed (${status}):`, err?.message);
    await pool.query(
      `UPDATE competitor_analysis_jobs SET status='failed', error=$2, error_status=$3, error_data=$4, finished_at=NOW() WHERE id=$1`,
      [job.id, String(err?.message || "Analysis failed").slice(0, 2000), status, JSON.stringify(data ?? {})],
    ).catch((e) => console.warn("[competitor-jobs] could not record failure:", e.message));
  } finally {
    clearInterval(hb);
  }
}

async function tick(): Promise<void> {
  if (ticking || !processor) return;
  ticking = true;
  try {
    while (active < MAX_CONCURRENT) {
      const job = await claimNext();
      if (!job) break;
      active++;
      runJob(job).finally(() => { active--; setImmediate(() => { void tick(); }); });
    }
  } catch (e: any) {
    console.warn("[competitor-jobs] tick failed:", e.message);
  } finally {
    ticking = false;
  }
}

/** Register the processor and start the worker loop (idempotent). */
export async function startCompetitorAnalysisWorker(fn: JobProcessor): Promise<void> {
  processor = fn;
  if (timer) return;
  try {
    await ensureCompetitorAnalysisJobsTable();
    // Anything "running" with no heartbeat in the last minute belonged to a dead process.
    await recoverInterruptedJobs({ olderThanMs: 60 * 1000 });
  } catch (e: any) {
    console.warn("[competitor-jobs] startup recovery skipped:", e.message);
  }
  let sweeps = 0;
  timer = setInterval(() => {
    void tick();
    // Every ~60s, sweep for jobs abandoned by a restarted/crashed process.
    if (++sweeps % Math.max(1, Math.round(60000 / POLL_MS)) === 0) {
      recoverInterruptedJobs({ olderThanMs: STALE_AFTER_MS }).catch(() => {});
    }
  }, POLL_MS);
  console.log(`[competitor-jobs] worker started (poll=${POLL_MS}ms, concurrency=${MAX_CONCURRENT})`);
}
