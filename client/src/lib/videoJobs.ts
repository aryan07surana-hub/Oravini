/**
 * Client side of the video job queue. Heavy video endpoints answer
 * `202 { jobId }` immediately; this polls GET /api/video-editor/jobs/:id until
 * the job finishes and resolves with its result (same shape the endpoints used
 * to return synchronously).
 */
export interface VideoJob {
  id: number;
  editId: number | null;
  kind: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number; // 0..100
  stage: string | null;
  result: any;
  error: string | null;
  queuePosition: number;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function pollVideoJob(jobId: number, onUpdate?: (job: VideoJob) => void, opts: { intervalMs?: number; timeoutMs?: number } = {}): Promise<any> {
  const interval = opts.intervalMs ?? 1500;
  const deadline = Date.now() + (opts.timeoutMs ?? 60 * 60 * 1000);
  let failures = 0;
  while (Date.now() < deadline) {
    let job: VideoJob | null = null;
    try {
      const r = await fetch(`/api/video-editor/jobs/${jobId}`, { credentials: "include" });
      if (r.status === 404) throw new Error("Job not found");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      job = await r.json();
      failures = 0;
    } catch (e: any) {
      // Tolerate cold starts / brief restarts (Render free tier sleeps).
      if (e?.message === "Job not found" || ++failures > 40) throw e;
    }
    if (job) {
      onUpdate?.(job);
      if (job.status === "done") return job.result;
      if (job.status === "failed") throw new Error(job.error || "Job failed");
    }
    await sleep(interval);
  }
  throw new Error("Timed out waiting for the job");
}

/** POST to a job-backed endpoint and wait for the result. */
export async function runVideoJob<T = any>(url: string, body: unknown, onUpdate?: (job: VideoJob) => void): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  if (data?.jobId) return pollVideoJob(data.jobId, onUpdate);
  return data as T; // endpoint answered synchronously
}
