// Integration test for the deep-analysis job queue. Requires a Postgres in
// TEST_DATABASE_URL (skipped otherwise). storage.getUser/refundCredits are stubbed.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

test("competitor analysis job queue", { skip: !url && "TEST_DATABASE_URL not set" }, async (t) => {
  const { pool, storage } = await import("../server/storage");
  const jobs = await import("../server/competitorAnalysisJobs");
  const refunds: Array<{ userId: string; amount: number }> = [];
  (storage as any).getUser = async (id: string) => ({ id, plan: "growth", role: "client" });
  (storage as any).refundCredits = async (userId: string, amount: number) => { refunds.push({ userId, amount }); };

  await pool.query("DROP TABLE IF EXISTS competitor_analysis_jobs");
  await jobs.ensureCompetitorAnalysisJobsTable();
  await jobs.ensureCompetitorAnalysisJobsTable(); // idempotent

  const input = { userId: "u1", clientId: "u1", clientUrl: "https://www.instagram.com/me/", competitorUrl: "https://www.instagram.com/them/", clientHandle: "@me", competitorHandle: "@them" };

  await t.test("dedupes an active job for the same user+pair", async () => {
    const a = await jobs.enqueueAnalysisJob(input);
    const b = await jobs.enqueueAnalysisJob({ ...input, clientHandle: "@ME" });
    assert.equal(a.created, true);
    assert.equal(b.created, false);
    assert.equal(b.job.id, a.job.id);
    const other = await jobs.enqueueAnalysisJob({ ...input, userId: "u2", clientId: "u2" });
    assert.equal(other.created, true, "different user gets its own job");
  });

  await t.test("restart recovery refunds credits and re-queues, then fails on 2nd interruption", async () => {
    const { rows: [j] } = await pool.query(`SELECT * FROM competitor_analysis_jobs WHERE user_id='u1'`);
    await pool.query(`UPDATE competitor_analysis_jobs SET status='running', attempts=1, credits_charged=25, heartbeat_at=NOW()-interval '5 minutes' WHERE id=$1`, [j.id]);
    assert.equal(await jobs.recoverInterruptedJobs({ olderThanMs: 60000 }), 1);
    let cur = await jobs.getAnalysisJob(j.id);
    assert.equal(cur!.status, "queued");
    assert.equal(cur!.credits_charged, 0);
    assert.deepEqual(refunds, [{ userId: "u1", amount: 25 }]);

    await pool.query(`UPDATE competitor_analysis_jobs SET status='running', attempts=2, heartbeat_at=NOW()-interval '5 minutes' WHERE id=$1`, [j.id]);
    await jobs.recoverInterruptedJobs({ olderThanMs: 60000 });
    cur = await jobs.getAnalysisJob(j.id);
    assert.equal(cur!.status, "failed");
    assert.match(cur!.error!, /interrupted/);

    // A fresh heartbeat is NOT treated as interrupted.
    const fresh = await jobs.enqueueAnalysisJob(input);
    await pool.query(`UPDATE competitor_analysis_jobs SET status='running', heartbeat_at=NOW() WHERE id=$1`, [fresh.job.id]);
    assert.equal(await jobs.recoverInterruptedJobs({ olderThanMs: 60000 }), 0);
    await pool.query(`UPDATE competitor_analysis_jobs SET status='failed' WHERE id=$1`, [fresh.job.id]);
  });

  await t.test("worker runs queued jobs to done / failed with error status", async () => {
    await pool.query(`DELETE FROM competitor_analysis_jobs`);
    const ok = await jobs.enqueueAnalysisJob(input);
    const bad = await jobs.enqueueAnalysisJob({ ...input, competitorHandle: "@private" });
    await jobs.startCompetitorAnalysisWorker(async ({ job, progress }) => {
      await progress(50, "Halfway");
      if (job.competitor_handle === "@private") throw new jobs.AnalysisJobError("We couldn't fetch Instagram data for @private", 502, { failedProfiles: ["@private"] });
      return "analysis-123";
    });
    const deadline = Date.now() + 15000;
    let a, b;
    while (Date.now() < deadline) {
      a = await jobs.getAnalysisJob(ok.job.id); b = await jobs.getAnalysisJob(bad.job.id);
      if (a?.status === "done" && b?.status === "failed") break;
      await new Promise(r => setTimeout(r, 200));
    }
    assert.equal(a!.status, "done");
    assert.equal(a!.analysis_id, "analysis-123");
    assert.equal(a!.progress, 100);
    assert.equal(b!.status, "failed");
    assert.equal(b!.error_status, 502);
    assert.match(b!.error!, /@private/);
    const s = jobs.serializeJob(b!);
    assert.deepEqual(s.errorData, { failedProfiles: ["@private"] });
  });

  await pool.query("DROP TABLE IF EXISTS competitor_analysis_jobs");
  setTimeout(() => process.exit(0), 50).unref();
  await pool.end().catch(() => {});
});
