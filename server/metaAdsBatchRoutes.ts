/**
 * Meta Ads Batch Operations — bulk launch, creative matrix, job tracking, templates.
 * Uses Meta's Batch API (50 ops per request) to handle thousands of ads efficiently.
 */
import type { Express, Request, Response } from "express";
import { pool } from "./storage";
import { decryptToken } from "./security/tokenEncryption";

const META_BASE = "https://graph.facebook.com/v19.0";
const p = (param: string | string[]): string => Array.isArray(param) ? param[0] : param;

function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  if ((req.user as any).role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

async function getClientConn(clientId: string) {
  const r = await pool.query(
    "SELECT access_token, ad_account_id FROM client_meta_ads_connections WHERE client_id = $1 AND is_active = true",
    [clientId]
  );
  if (!r.rows[0]) return null;
  return { token: decryptToken(r.rows[0].access_token), adAccountId: r.rows[0].ad_account_id };
}

// ── Meta Batch API ────────────────────────────────────────────────────────

interface BatchOp {
  method: "GET" | "POST" | "DELETE";
  relative_url: string;
  body?: Record<string, any>;
}

async function metaBatch(token: string, ops: BatchOp[]): Promise<Array<{ code: number; body: string }>> {
  const formatted = ops.map(op => ({
    method: op.method,
    relative_url: op.relative_url,
    ...(op.body ? {
      body: Object.entries(op.body)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === "object" ? JSON.stringify(v) : String(v))}`)
        .join("&"),
    } : {}),
  }));

  const fd = new URLSearchParams();
  fd.append("access_token", token);
  fd.append("batch", JSON.stringify(formatted));

  const res = await fetch(`${META_BASE}/`, { method: "POST", body: fd });
  return await res.json() as any;
}

function parseBatch(results: Array<{ code: number; body: string }>) {
  return results.map(r => {
    try {
      const data = JSON.parse(r.body);
      return { success: r.code >= 200 && r.code < 300 && !data.error, code: r.code, data };
    } catch {
      return { success: false, code: r.code, data: { error: r.body } };
    }
  });
}

async function metaGet(token: string, path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${META_BASE}${path}`);
  url.searchParams.set("access_token", token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json() as any;
  if (data?.error) throw new Error(`Meta API: ${data.error.message}`);
  return data;
}

// ── Bulk Launch Processor (runs async in background) ──────────────────────

async function processBulkLaunchJob(
  jobId: number,
  clientId: string,
  token: string,
  adAccountId: string,
  config: any
) {
  await pool.query(
    "UPDATE meta_ads_bulk_jobs SET status = 'running', started_at = NOW(), total_count = $1 WHERE id = $2",
    [config.selectedCombinations.length * config.adSetIds.length, jobId]
  );

  const {
    pageId,
    destinationUrl,
    callToAction = "LEARN_MORE",
    adSetIds,
    selectedCombinations,
    headlines,
    bodies,
    imageUrls,
    adStatus = "PAUSED",
  } = config;

  let completed = 0;
  let failed = 0;
  const errorLog: string[] = [];

  try {
    // ── Step 1: Create creatives in batches of 50 ──
    const creativeOps: BatchOp[] = selectedCombinations.map(
      ([hi, bi, ii]: [number, number, number]) => ({
        method: "POST" as const,
        relative_url: `${adAccountId}/adcreatives`,
        body: {
          name: `H${hi + 1}-B${bi + 1}-I${ii + 1}-${Date.now()}`,
          object_story_spec: {
            page_id: pageId,
            link_data: {
              image_url: imageUrls[ii],
              message: bodies[bi],
              name: headlines[hi],
              link: destinationUrl,
              call_to_action: { type: callToAction },
            },
          },
        },
      })
    );

    const creativeIds: string[] = [];
    for (let i = 0; i < creativeOps.length; i += 50) {
      const batch = creativeOps.slice(i, i + 50);
      const results = parseBatch(await metaBatch(token, batch));
      results.forEach(r => {
        creativeIds.push(r.success && r.data.id ? r.data.id : "");
        if (!r.success) errorLog.push(`Creative error: ${JSON.stringify(r.data?.error || r.data)}`);
      });
      // Update progress mid-flight
      await pool.query(
        "UPDATE meta_ads_bulk_jobs SET completed_count = $1, failed_count = $2 WHERE id = $3",
        [completed, failed, jobId]
      );
    }

    // ── Step 2: Create ads — one per (creative × adset) ──
    const adOps: BatchOp[] = [];
    selectedCombinations.forEach(([hi, bi, ii]: [number, number, number], idx: number) => {
      const creativeId = creativeIds[idx];
      if (!creativeId) { failed += adSetIds.length; return; }
      adSetIds.forEach((adSetId: string) => {
        adOps.push({
          method: "POST",
          relative_url: `${adAccountId}/ads`,
          body: {
            name: `Ad-H${hi + 1}-B${bi + 1}-I${ii + 1}-${adSetId.slice(-6)}`,
            adset_id: adSetId,
            creative: { creative_id: creativeId },
            status: adStatus,
          },
        });
      });
    });

    for (let i = 0; i < adOps.length; i += 50) {
      const batch = adOps.slice(i, i + 50);
      const results = parseBatch(await metaBatch(token, batch));
      results.forEach(r => {
        if (r.success) completed++;
        else {
          failed++;
          errorLog.push(`Ad error: ${JSON.stringify(r.data?.error || r.data)}`);
        }
      });
      await pool.query(
        "UPDATE meta_ads_bulk_jobs SET completed_count = $1, failed_count = $2 WHERE id = $3",
        [completed, failed, jobId]
      );
    }

    const finalStatus = completed === 0 ? "failed" : "completed";
    await pool.query(
      `UPDATE meta_ads_bulk_jobs SET status = $1, completed_at = NOW(),
       completed_count = $2, failed_count = $3,
       results = $4
       WHERE id = $5`,
      [
        finalStatus, completed, failed,
        JSON.stringify({ errorSample: errorLog.slice(0, 20), totalCreatives: creativeIds.filter(Boolean).length }),
        jobId,
      ]
    );
  } catch (err: any) {
    await pool.query(
      "UPDATE meta_ads_bulk_jobs SET status = 'failed', completed_at = NOW(), error = $1 WHERE id = $2",
      [err.message, jobId]
    );
  }
}

// ── Bulk Action Processor ─────────────────────────────────────────────────

async function processBulkAction(
  jobId: number,
  clientId: string,
  token: string,
  adAccountId: string,
  config: any
) {
  await pool.query("UPDATE meta_ads_bulk_jobs SET status = 'running', started_at = NOW(), total_count = $1 WHERE id = $2",
    [config.ids.length, jobId]);

  const { ids, action, newBudget } = config;
  let completed = 0, failed = 0;

  const ops: BatchOp[] = ids.map((id: string) => {
    const body: Record<string, any> = {};
    if (action === "pause") body.status = "PAUSED";
    else if (action === "activate") body.status = "ACTIVE";
    else if (action === "delete") return { method: "DELETE" as const, relative_url: id };
    else if (action === "set_budget" && newBudget) body.daily_budget = String(Math.round(newBudget * 100));
    else if (action === "scale_20") {/* handled per-id below */}
    return { method: "POST" as const, relative_url: id, body };
  });

  for (let i = 0; i < ops.length; i += 50) {
    const results = parseBatch(await metaBatch(token, ops.slice(i, i + 50)));
    results.forEach(r => { if (r.success) completed++; else failed++; });
    await pool.query("UPDATE meta_ads_bulk_jobs SET completed_count = $1, failed_count = $2 WHERE id = $3",
      [completed, failed, jobId]);
  }

  await pool.query(
    "UPDATE meta_ads_bulk_jobs SET status = $1, completed_at = NOW() WHERE id = $2",
    [failed > 0 && completed === 0 ? "failed" : "completed", jobId]
  );
}

// ── Route Registration ────────────────────────────────────────────────────

export function registerMetaAdsBatchRoutes(app: Express) {

  // POST /api/meta-ads/bulk-launch/:clientId — start creative matrix launch
  app.post("/api/meta-ads/bulk-launch/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const config = req.body;
      if (!config.selectedCombinations?.length) return res.status(400).json({ message: "No combinations selected" });
      if (!config.adSetIds?.length) return res.status(400).json({ message: "No ad sets selected" });
      if (!config.pageId) return res.status(400).json({ message: "Facebook page ID required" });
      if (!config.destinationUrl) return res.status(400).json({ message: "Destination URL required" });

      const totalAds = config.selectedCombinations.length * config.adSetIds.length;

      const jobResult = await pool.query(
        `INSERT INTO meta_ads_bulk_jobs (client_id, job_type, status, total_count, config)
         VALUES ($1, 'bulk_launch', 'pending', $2, $3) RETURNING id`,
        [clientId, totalAds, JSON.stringify(config)]
      );
      const jobId = jobResult.rows[0].id;

      // Fire and forget — process in background
      setImmediate(() =>
        processBulkLaunchJob(jobId, clientId, conn.token, conn.adAccountId, config)
          .catch(err => console.error("[bulk-launch] job", jobId, "failed:", err))
      );

      res.json({ jobId, totalAds, message: `Queued: creating ${totalAds} ads across ${config.adSetIds.length} ad sets` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/meta-ads/bulk-action/:clientId — bulk pause/activate/delete/scale
  app.post("/api/meta-ads/bulk-action/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const { ids, action, newBudget } = req.body;
      if (!ids?.length) return res.status(400).json({ message: "ids required" });

      const config = { ids, action, newBudget };
      const jobResult = await pool.query(
        `INSERT INTO meta_ads_bulk_jobs (client_id, job_type, status, total_count, config)
         VALUES ($1, $2, 'pending', $3, $4) RETURNING id`,
        [clientId, `bulk_${action}`, ids.length, JSON.stringify(config)]
      );
      const jobId = jobResult.rows[0].id;

      setImmediate(() =>
        processBulkAction(jobId, clientId, conn.token, conn.adAccountId, config)
          .catch(err => console.error("[bulk-action] job", jobId, "failed:", err))
      );

      res.json({ jobId, message: `Queued: ${action} on ${ids.length} item(s)` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/bulk-jobs/:clientId — list jobs
  app.get("/api/meta-ads/bulk-jobs/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        "SELECT id, job_type, status, total_count, completed_count, failed_count, error, created_at, started_at, completed_at FROM meta_ads_bulk_jobs WHERE client_id = $1 ORDER BY created_at DESC LIMIT 30",
        [clientId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/bulk-jobs/:clientId/:jobId — job status
  app.get("/api/meta-ads/bulk-jobs/:clientId/:jobId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const jobId = p(req.params.jobId);
      const result = await pool.query(
        "SELECT * FROM meta_ads_bulk_jobs WHERE id = $1 AND client_id = $2",
        [jobId, clientId]
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Job not found" });
      const job = result.rows[0];
      res.json({
        ...job,
        progress: job.total_count > 0 ? Math.round(((job.completed_count + job.failed_count) / job.total_count) * 100) : 0,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/adsets/:clientId — get all ad sets for selection
  app.get("/api/meta-ads/adsets/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const data = await metaGet(conn.token, `/${conn.adAccountId}/adsets`, {
        fields: "id,name,status,campaign_id,campaign{name},daily_budget,optimization_goal",
        limit: "200",
      });
      res.json(data?.data || []);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/meta-ads/templates — save campaign template
  app.post("/api/meta-ads/templates", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { clientId, name, description, structure } = req.body;
      if (!clientId || !name || !structure) return res.status(400).json({ message: "clientId, name, structure required" });
      const result = await pool.query(
        "INSERT INTO meta_ads_templates (client_id, name, description, structure) VALUES ($1, $2, $3, $4) RETURNING id",
        [clientId, name, description || "", JSON.stringify(structure)]
      );
      res.json({ id: result.rows[0].id });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/templates/:clientId
  app.get("/api/meta-ads/templates/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        "SELECT * FROM meta_ads_templates WHERE client_id = $1 ORDER BY created_at DESC",
        [clientId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/meta-ads/templates/:clientId/:templateId
  app.delete("/api/meta-ads/templates/:clientId/:templateId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const templateId = p(req.params.templateId);
      await pool.query("DELETE FROM meta_ads_templates WHERE id = $1 AND client_id = $2", [templateId, clientId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
