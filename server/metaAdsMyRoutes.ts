/**
 * Client-facing Meta Ads routes — authenticated as the logged-in user.
 * Mirrors admin routes but uses req.user.id, accessible to pro+elite plan users.
 * Path prefix: /api/my-ads/
 */
import type { Express, Request, Response } from "express";
import { pool } from "./storage";
import { decryptToken } from "./security/tokenEncryption";

const META_BASE = "https://graph.facebook.com/v19.0";

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function requireProOrElite(req: Request, res: Response, next: Function) {
  const plan = (req.user as any)?.plan;
  if (!["pro", "elite"].includes(plan)) return res.status(403).json({ message: "Available on Tier 4 (Pro) and Tier 5 (Elite) plans" });
  next();
}

function myId(req: Request): string {
  return String((req.user as any).id);
}

async function getMyConn(userId: string) {
  const r = await pool.query(
    "SELECT access_token, ad_account_id FROM client_meta_ads_connections WHERE client_id = $1 AND is_active = true",
    [userId]
  );
  if (!r.rows[0]) return null;
  return { token: decryptToken(r.rows[0].access_token), adAccountId: r.rows[0].ad_account_id };
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

async function metaPost(token: string, path: string, body: Record<string, any>): Promise<any> {
  const url = new URL(`${META_BASE}${path}`);
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (data?.error) throw Object.assign(new Error(data.error.message), { permissionRequired: data.error.code === 200 });
  return data;
}

async function metaDelete(token: string, objectId: string) {
  const url = new URL(`${META_BASE}/${objectId}`);
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString(), { method: "DELETE" });
  return await res.json();
}

// Batch API
interface BatchOp { method: "GET" | "POST" | "DELETE"; relative_url: string; body?: Record<string, any>; }
async function metaBatch(token: string, ops: BatchOp[]): Promise<Array<{ code: number; body: string }>> {
  const formatted = ops.map(op => ({
    method: op.method,
    relative_url: op.relative_url,
    ...(op.body ? { body: Object.entries(op.body).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === "object" ? JSON.stringify(v) : String(v))}`).join("&") } : {}),
  }));
  const fd = new URLSearchParams();
  fd.append("access_token", token);
  fd.append("batch", JSON.stringify(formatted));
  const res = await fetch(`${META_BASE}/`, { method: "POST", body: fd });
  return await res.json() as any;
}
function parseBatch(results: Array<{ code: number; body: string }>) {
  return results.map(r => { try { const d = JSON.parse(r.body); return { success: r.code >= 200 && r.code < 300 && !d.error, code: r.code, data: d }; } catch { return { success: false, code: r.code, data: {} }; } });
}

export function registerMetaAdsMyRoutes(app: Express) {
  const guard = [requireAuth, requireProOrElite];

  // ── Connection status ─────────────────────────────────────────────────────
  app.get("/api/my-ads/status", guard, async (req: Request, res: Response) => {
    try {
      const r = await pool.query("SELECT ad_account_id, connected_at FROM client_meta_ads_connections WHERE client_id=$1 AND is_active=true", [myId(req)]);
      res.json({ connected: r.rows.length > 0, adAccountId: r.rows[0]?.ad_account_id, connectedAt: r.rows[0]?.connected_at });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Connect own Meta account ──────────────────────────────────────────────
  app.post("/api/my-ads/connect", guard, async (req: Request, res: Response) => {
    try {
      const { accessToken, adAccountId } = req.body;
      if (!accessToken || !adAccountId) return res.status(400).json({ message: "accessToken and adAccountId required" });
      const { encryptToken } = await import("./security/tokenEncryption");
      const encryptedToken = encryptToken(accessToken);
      const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      await pool.query(
        `INSERT INTO client_meta_ads_connections (client_id, access_token, ad_account_id, is_active, connected_at)
         VALUES ($1,$2,$3,true,NOW())
         ON CONFLICT (client_id) DO UPDATE SET access_token=$2, ad_account_id=$3, is_active=true, connected_at=NOW()`,
        [myId(req), encryptedToken, accountId]
      );
      res.json({ success: true, adAccountId: accountId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  app.delete("/api/my-ads/connect", guard, async (req: Request, res: Response) => {
    try {
      await pool.query("UPDATE client_meta_ads_connections SET is_active=false WHERE client_id=$1", [myId(req)]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Sync + list campaigns ─────────────────────────────────────────────────
  app.post("/api/my-ads/sync-campaigns", guard, async (req: Request, res: Response) => {
    try {
      const userId = myId(req);
      const conn = await getMyConn(userId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      let cursor: string | null = null;
      const campaigns: any[] = [];
      do {
        const params: any = { fields: "id,name,status,objective,daily_budget,lifetime_budget", limit: "200" };
        if (cursor) params.after = cursor;
        const page = await metaGet(conn.token, `/${conn.adAccountId}/campaigns`, params);
        (page.data || []).forEach((c: any) => campaigns.push(c));
        cursor = page.paging?.cursors?.after && page.paging?.next ? page.paging.cursors.after : null;
      } while (cursor && campaigns.length < 500);

      const insightsMap: Record<string, any> = {};
      for (const c of campaigns) {
        try {
          const ins = await metaGet(conn.token, `/${c.id}/insights`, { fields: "spend,impressions,clicks,ctr,cpc,actions,action_values", date_preset: "last_30d" });
          if (ins.data?.[0]) insightsMap[c.id] = ins.data[0];
        } catch { /* non-fatal */ }
      }

      let synced = 0;
      for (const c of campaigns) {
        const ins = insightsMap[c.id] || {};
        const spend = ins.spend || "0";
        const revenue = (ins.action_values || []).filter((a: any) => a.action_type === "omni_purchase").reduce((s: number, a: any) => s + parseFloat(a.value || 0), 0);
        const roas = parseFloat(spend) > 0 ? (revenue / parseFloat(spend)).toFixed(4) : "0";
        await pool.query(
          `INSERT INTO meta_ads_campaigns_cache (client_id, campaign_id, campaign_name, status, objective, daily_budget, lifetime_budget, spend, impressions, clicks, ctr, cpc, roas, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
           ON CONFLICT (client_id, campaign_id) DO UPDATE SET campaign_name=$3,status=$4,objective=$5,daily_budget=$6,lifetime_budget=$7,spend=$8,impressions=$9,clicks=$10,ctr=$11,cpc=$12,roas=$13,synced_at=NOW()`,
          [userId, c.id, c.name, c.status, c.objective, c.daily_budget||null, c.lifetime_budget||null, spend, ins.impressions||"0", ins.clicks||"0", ins.ctr||"0", ins.cpc||"0", roas]
        );
        synced++;
      }
      res.json({ synced });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/my-ads/campaigns", guard, async (req: Request, res: Response) => {
    try {
      const userId = myId(req);
      const { status } = req.query as any;
      let where = "WHERE client_id=$1";
      const vals: any[] = [userId];
      if (status && status !== "ALL") { where += ` AND status=$${vals.length + 1}`; vals.push(status); }
      const result = await pool.query(`SELECT * FROM meta_ads_campaigns_cache ${where} ORDER BY CAST(COALESCE(spend,'0') AS NUMERIC) DESC NULLS LAST`, vals);
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/my-ads/summary", guard, async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as total_campaigns, COUNT(*) FILTER(WHERE status='ACTIVE') as active_campaigns, COUNT(*) FILTER(WHERE status='PAUSED') as paused_campaigns,
         COALESCE(SUM(CAST(spend AS NUMERIC)),0) as total_spend, COALESCE(SUM(CAST(impressions AS NUMERIC)),0) as total_impressions,
         COALESCE(SUM(CAST(clicks AS NUMERIC)),0) as total_clicks, COALESCE(AVG(CAST(NULLIF(roas,'0') AS NUMERIC)),0) as avg_roas, COALESCE(AVG(CAST(NULLIF(ctr,'0') AS NUMERIC)),0) as avg_ctr
         FROM meta_ads_campaigns_cache WHERE client_id=$1`,
        [myId(req)]
      );
      res.json(result.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Campaign tree ─────────────────────────────────────────────────────────
  app.get("/api/my-ads/adsets/:campaignId", guard, async (req: Request, res: Response) => {
    try {
      const conn = await getMyConn(myId(req));
      if (!conn) return res.status(404).json({ message: "Not connected" });
      const campaignId = Array.isArray(req.params.campaignId) ? req.params.campaignId[0] : req.params.campaignId;
      const [adsets, insights] = await Promise.all([
        metaGet(conn.token, `/${campaignId}/adsets`, { fields: "id,name,status,daily_budget,optimization_goal", limit: "200" }),
        metaGet(conn.token, `/${campaignId}/insights`, { fields: "spend,impressions,clicks,ctr", level: "adset", date_preset: "last_30d", limit: "200" }).catch(() => ({ data: [] })),
      ]);
      const insMap: Record<string, any> = {};
      (insights.data || []).forEach((i: any) => { insMap[i.adset_id] = i; });
      res.json((adsets.data || []).map((as: any) => ({ ...as, insights: insMap[as.id] || null })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/my-ads/ads/:adsetId", guard, async (req: Request, res: Response) => {
    try {
      const conn = await getMyConn(myId(req));
      if (!conn) return res.status(404).json({ message: "Not connected" });
      const adsetId = Array.isArray(req.params.adsetId) ? req.params.adsetId[0] : req.params.adsetId;
      const [ads, insights] = await Promise.all([
        metaGet(conn.token, `/${adsetId}/ads`, { fields: "id,name,status,creative{id,name}", limit: "200" }),
        metaGet(conn.token, `/${adsetId}/insights`, { fields: "spend,impressions,clicks,ctr,cpc,actions,action_values", level: "ad", date_preset: "last_30d", limit: "200" }).catch(() => ({ data: [] })),
      ]);
      const insMap: Record<string, any> = {};
      (insights.data || []).forEach((i: any) => { insMap[i.ad_id] = i; });
      res.json((ads.data || []).map((ad: any) => ({ ...ad, insights: insMap[ad.id] || null })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Campaign + ad set + ad CRUD ───────────────────────────────────────────
  app.patch("/api/my-ads/campaign/:campaignId", guard, async (req: Request, res: Response) => {
    try {
      const conn = await getMyConn(myId(req));
      if (!conn) return res.status(404).json({ message: "Not connected" });
      const campaignId = Array.isArray(req.params.campaignId) ? req.params.campaignId[0] : req.params.campaignId;
      const { status, dailyBudget, name } = req.body;
      const body: Record<string, any> = {};
      if (status) body.status = status;
      if (name) body.name = name;
      if (dailyBudget != null) body.daily_budget = String(Math.round(dailyBudget * 100));
      await metaPost(conn.token, `/${campaignId}`, body);
      if (status) await pool.query("UPDATE meta_ads_campaigns_cache SET status=$1 WHERE client_id=$2 AND campaign_id=$3", [status, myId(req), campaignId]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/my-ads/adset/:adsetId", guard, async (req: Request, res: Response) => {
    try {
      const conn = await getMyConn(myId(req));
      if (!conn) return res.status(404).json({ message: "Not connected" });
      const adsetId = Array.isArray(req.params.adsetId) ? req.params.adsetId[0] : req.params.adsetId;
      const { status, dailyBudget } = req.body;
      const body: Record<string, any> = {};
      if (status) body.status = status;
      if (dailyBudget != null) body.daily_budget = String(Math.round(dailyBudget * 100));
      await metaPost(conn.token, `/${adsetId}`, body);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/my-ads/ad/:adId", guard, async (req: Request, res: Response) => {
    try {
      const conn = await getMyConn(myId(req));
      if (!conn) return res.status(404).json({ message: "Not connected" });
      const adId = Array.isArray(req.params.adId) ? req.params.adId[0] : req.params.adId;
      const { status } = req.body;
      if (status) await metaPost(conn.token, `/${adId}`, { status });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Bulk launch (creative matrix) ─────────────────────────────────────────
  app.post("/api/my-ads/bulk-launch", guard, async (req: Request, res: Response) => {
    try {
      const userId = myId(req);
      const conn = await getMyConn(userId);
      if (!conn) return res.status(404).json({ message: "Not connected" });
      const config = req.body;
      if (!config.selectedCombinations?.length) return res.status(400).json({ message: "No combinations selected" });
      if (!config.adSetIds?.length) return res.status(400).json({ message: "No ad sets selected" });
      if (!config.pageId) return res.status(400).json({ message: "Facebook page ID required" });
      const totalAds = config.selectedCombinations.length * config.adSetIds.length;
      const jobResult = await pool.query(
        `INSERT INTO meta_ads_bulk_jobs (client_id, job_type, status, total_count, config) VALUES ($1,'bulk_launch','pending',$2,$3) RETURNING id`,
        [userId, totalAds, JSON.stringify(config)]
      );
      const jobId = jobResult.rows[0].id;

      setImmediate(async () => {
        await pool.query("UPDATE meta_ads_bulk_jobs SET status='running',started_at=NOW(),total_count=$1 WHERE id=$2", [totalAds, jobId]);
        const { pageId, destinationUrl, callToAction="LEARN_MORE", adSetIds, selectedCombinations, headlines, bodies, imageUrls, adStatus="PAUSED" } = config;
        let completed = 0, failed = 0;
        const creativeOps = selectedCombinations.map(([hi, bi, ii]: [number,number,number]) => ({
          method: "POST" as const,
          relative_url: `${conn.adAccountId}/adcreatives`,
          body: { name: `H${hi+1}-B${bi+1}-I${ii+1}-${Date.now()}`, object_story_spec: { page_id: pageId, link_data: { image_url: imageUrls[ii], message: bodies[bi], name: headlines[hi], link: destinationUrl, call_to_action: { type: callToAction } } } },
        }));
        const creativeIds: string[] = [];
        for (let i = 0; i < creativeOps.length; i += 50) {
          const results = parseBatch(await metaBatch(conn.token, creativeOps.slice(i, i+50)));
          results.forEach(r => creativeIds.push(r.success && r.data.id ? r.data.id : ""));
        }
        const adOps: BatchOp[] = [];
        selectedCombinations.forEach(([hi,bi,ii]: [number,number,number], idx: number) => {
          const creativeId = creativeIds[idx]; if (!creativeId) { failed += adSetIds.length; return; }
          adSetIds.forEach((asId: string) => adOps.push({ method: "POST", relative_url: `${conn.adAccountId}/ads`, body: { name: `Ad-H${hi+1}-B${bi+1}-I${ii+1}`, adset_id: asId, creative: { creative_id: creativeId }, status: adStatus } }));
        });
        for (let i = 0; i < adOps.length; i += 50) {
          const results = parseBatch(await metaBatch(conn.token, adOps.slice(i, i+50)));
          results.forEach(r => { if (r.success) completed++; else failed++; });
          await pool.query("UPDATE meta_ads_bulk_jobs SET completed_count=$1,failed_count=$2 WHERE id=$3", [completed, failed, jobId]);
        }
        await pool.query("UPDATE meta_ads_bulk_jobs SET status=$1,completed_at=NOW(),completed_count=$2,failed_count=$3 WHERE id=$4", [completed === 0 ? "failed" : "completed", completed, failed, jobId]);
      });

      res.json({ jobId, totalAds });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/my-ads/bulk-jobs", guard, async (req: Request, res: Response) => {
    try {
      const r = await pool.query("SELECT id,job_type,status,total_count,completed_count,failed_count,created_at,started_at,completed_at FROM meta_ads_bulk_jobs WHERE client_id=$1 ORDER BY created_at DESC LIMIT 20", [myId(req)]);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/my-ads/bulk-jobs/:jobId", guard, async (req: Request, res: Response) => {
    try {
      const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
      const r = await pool.query("SELECT * FROM meta_ads_bulk_jobs WHERE id=$1 AND client_id=$2", [jobId, myId(req)]);
      if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
      const job = r.rows[0];
      res.json({ ...job, progress: job.total_count > 0 ? Math.round(((job.completed_count + job.failed_count) / job.total_count) * 100) : 0 });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/my-ads/adsets-for-select", guard, async (req: Request, res: Response) => {
    try {
      const conn = await getMyConn(myId(req));
      if (!conn) return res.status(404).json({ message: "Not connected" });
      const data = await metaGet(conn.token, `/${conn.adAccountId}/adsets`, { fields: "id,name,status,campaign_id,campaign{name},daily_budget,optimization_goal", limit: "200" });
      res.json(data?.data || []);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── AI agent logs (read-only) ─────────────────────────────────────────────
  app.get("/api/my-ads/agent-logs", guard, async (req: Request, res: Response) => {
    try {
      const r = await pool.query("SELECT * FROM meta_ads_agent_logs WHERE client_id=$1 ORDER BY created_at DESC LIMIT 20", [myId(req)]);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/my-ads/agent-logs/unread-count", guard, async (req: Request, res: Response) => {
    try {
      const r = await pool.query("SELECT COUNT(*) as count FROM meta_ads_agent_logs WHERE client_id=$1 AND is_read=false", [myId(req)]);
      res.json({ count: parseInt(r.rows[0].count) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/my-ads/agent-logs/read-all", guard, async (req: Request, res: Response) => {
    try {
      await pool.query("UPDATE meta_ads_agent_logs SET is_read=true WHERE client_id=$1", [myId(req)]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}
