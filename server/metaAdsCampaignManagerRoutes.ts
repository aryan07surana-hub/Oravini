/**
 * Meta Ads Campaign Manager — full hierarchy CRUD + bulk ops + live sync.
 * Campaign → Ad Set → Ad tree with inline edits and bulk actions.
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
  if (data?.error) {
    const isPerm = data.error.code === 200 || data.error.message?.includes("permission");
    throw Object.assign(new Error(data.error.message), { permissionRequired: isPerm });
  }
  return data;
}

async function metaDelete(token: string, objectId: string): Promise<any> {
  const url = new URL(`${META_BASE}/${objectId}`);
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString(), { method: "DELETE" });
  return await res.json();
}

// Paginate through Meta API collecting all results
async function metaGetAll(token: string, path: string, params: Record<string, string>): Promise<any[]> {
  const items: any[] = [];
  let nextUrl: string | null = null;
  const first = await metaGet(token, path, { ...params, limit: "200" });
  (first.data || []).forEach((r: any) => items.push(r));
  nextUrl = first.paging?.next || null;
  while (nextUrl && items.length < 2000) {
    const res = await fetch(nextUrl + `&access_token=${token}`);
    const page = await res.json() as any;
    (page.data || []).forEach((r: any) => items.push(r));
    nextUrl = page.paging?.next || null;
  }
  return items;
}

const OBJECTIVE_MAP: Record<string, string> = {
  CONVERSIONS: "OUTCOME_SALES",
  TRAFFIC: "OUTCOME_TRAFFIC",
  AWARENESS: "OUTCOME_AWARENESS",
  LEADS: "OUTCOME_LEADS",
  ENGAGEMENT: "OUTCOME_ENGAGEMENT",
  APP_INSTALLS: "OUTCOME_APP_PROMOTION",
  VIDEO_VIEWS: "OUTCOME_ENGAGEMENT",
  REACH: "OUTCOME_AWARENESS",
};

export function registerMetaAdsCampaignManagerRoutes(app: Express) {

  // ── Sync campaigns + ad sets + ads from Meta ──────────────────────────────
  app.post("/api/meta-cm/sync/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      // Campaigns with insights
      const campaigns = await metaGetAll(conn.token, `/${conn.adAccountId}/campaigns`, {
        fields: "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time",
      });

      // Pull 30d insights per campaign in batch
      const insightsMap: Record<string, any> = {};
      for (const c of campaigns) {
        try {
          const ins = await metaGet(conn.token, `/${c.id}/insights`, {
            fields: "spend,impressions,clicks,ctr,cpc,actions,action_values",
            date_preset: "last_30d",
          });
          if (ins.data?.[0]) insightsMap[c.id] = ins.data[0];
        } catch { /* non-fatal */ }
      }

      // Upsert campaigns to cache
      let synced = 0;
      for (const c of campaigns) {
        const ins = insightsMap[c.id] || {};
        const spend = ins.spend || "0";
        const impressions = ins.impressions || "0";
        const clicks = ins.clicks || "0";
        const ctr = ins.ctr || "0";
        const cpc = ins.cpc || "0";
        const revenue = (ins.action_values || [])
          .filter((a: any) => a.action_type === "omni_purchase")
          .reduce((sum: number, a: any) => sum + parseFloat(a.value || 0), 0);
        const roas = parseFloat(spend) > 0 ? (revenue / parseFloat(spend)).toFixed(4) : "0";

        await pool.query(
          `INSERT INTO meta_ads_campaigns_cache
           (client_id, campaign_id, campaign_name, status, objective, daily_budget, lifetime_budget,
            spend, impressions, clicks, ctr, cpc, roas, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
           ON CONFLICT (client_id, campaign_id)
           DO UPDATE SET
             campaign_name=$3, status=$4, objective=$5, daily_budget=$6, lifetime_budget=$7,
             spend=$8, impressions=$9, clicks=$10, ctr=$11, cpc=$12, roas=$13, synced_at=NOW()`,
          [clientId, c.id, c.name, c.status, c.objective,
           c.daily_budget || null, c.lifetime_budget || null,
           spend, impressions, clicks, ctr, cpc, roas]
        );
        synced++;
      }

      res.json({ synced, total: campaigns.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message, permissionRequired: (err as any).permissionRequired });
    }
  });

  // ── List campaigns (from cache) ───────────────────────────────────────────
  app.get("/api/meta-cm/campaigns/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const { status, sort = "spend", dir = "desc" } = req.query as any;
      const safeSort = ["spend", "roas", "ctr", "impressions", "clicks", "campaign_name"].includes(sort) ? sort : "spend";
      const safeDir = dir === "asc" ? "ASC" : "DESC";

      let where = "WHERE client_id = $1";
      const vals: any[] = [clientId];
      if (status && status !== "ALL") { where += ` AND status = $${vals.length + 1}`; vals.push(status); }

      const result = await pool.query(
        `SELECT * FROM meta_ads_campaigns_cache ${where}
         ORDER BY CAST(COALESCE(${safeSort},'0') AS NUMERIC) ${safeDir} NULLS LAST`,
        vals
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Get ad sets for a campaign (live from Meta) ───────────────────────────
  app.get("/api/meta-cm/adsets/:clientId/:campaignId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const campaignId = p(req.params.campaignId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const [adsets, insights] = await Promise.all([
        metaGet(conn.token, `/${campaignId}/adsets`, {
          fields: "id,name,status,daily_budget,lifetime_budget,optimization_goal,targeting,start_time,end_time,bid_amount",
          limit: "200",
        }),
        metaGet(conn.token, `/${campaignId}/insights`, {
          fields: "spend,impressions,clicks,ctr,cpc,actions,action_values",
          level: "adset",
          date_preset: "last_30d",
          limit: "200",
        }).catch(() => ({ data: [] })),
      ]);

      const insMap: Record<string, any> = {};
      (insights.data || []).forEach((i: any) => { insMap[i.adset_id] = i; });

      const result = (adsets.data || []).map((as: any) => ({
        ...as,
        insights: insMap[as.id] || null,
      }));

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Get ads for an ad set (live from Meta) ────────────────────────────────
  app.get("/api/meta-cm/ads/:clientId/:adsetId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const adsetId = p(req.params.adsetId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const [ads, insights] = await Promise.all([
        metaGet(conn.token, `/${adsetId}/ads`, {
          fields: "id,name,status,creative{id,name,thumbnail_url,object_story_spec},created_time",
          limit: "200",
        }),
        metaGet(conn.token, `/${adsetId}/insights`, {
          fields: "spend,impressions,clicks,ctr,cpc,actions,action_values",
          level: "ad",
          date_preset: "last_30d",
          limit: "200",
        }).catch(() => ({ data: [] })),
      ]);

      const insMap: Record<string, any> = {};
      (insights.data || []).forEach((i: any) => { insMap[i.ad_id] = i; });

      const result = (ads.data || []).map((ad: any) => ({
        ...ad,
        insights: insMap[ad.id] || null,
      }));

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Create campaign ───────────────────────────────────────────────────────
  app.post("/api/meta-cm/campaign/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const { name, objective, dailyBudget, lifetimeBudget, status = "PAUSED" } = req.body;
      if (!name) return res.status(400).json({ message: "name required" });
      if (!objective) return res.status(400).json({ message: "objective required" });

      const body: Record<string, any> = {
        name,
        objective: OBJECTIVE_MAP[objective] || objective,
        status,
        special_ad_categories: [],
      };
      if (dailyBudget) body.daily_budget = String(Math.round(dailyBudget * 100));
      if (lifetimeBudget) body.lifetime_budget = String(Math.round(lifetimeBudget * 100));

      const data = await metaPost(conn.token, `/${conn.adAccountId}/campaigns`, body);

      // Cache it
      await pool.query(
        `INSERT INTO meta_ads_campaigns_cache (client_id, campaign_id, campaign_name, status, objective, daily_budget, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (client_id, campaign_id) DO UPDATE SET campaign_name=$3, status=$4, objective=$5, daily_budget=$6, synced_at=NOW()`,
        [clientId, data.id, name, status, objective, dailyBudget ? String(Math.round(dailyBudget * 100)) : null]
      );

      res.json({ id: data.id, name, status });
    } catch (err: any) {
      res.status(500).json({ message: err.message, permissionRequired: (err as any).permissionRequired });
    }
  });

  // ── Update campaign ───────────────────────────────────────────────────────
  app.patch("/api/meta-cm/campaign/:clientId/:campaignId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const campaignId = p(req.params.campaignId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const { status, dailyBudget, name } = req.body;
      const body: Record<string, any> = {};
      if (status) body.status = status;
      if (name) body.name = name;
      if (dailyBudget != null) body.daily_budget = String(Math.round(dailyBudget * 100));

      await metaPost(conn.token, `/${campaignId}`, body);

      // Update cache
      const updates: string[] = [];
      const vals: any[] = [clientId, campaignId];
      if (status) { vals.push(status); updates.push(`status=$${vals.length}`); }
      if (name) { vals.push(name); updates.push(`campaign_name=$${vals.length}`); }
      if (dailyBudget != null) { vals.push(String(Math.round(dailyBudget * 100))); updates.push(`daily_budget=$${vals.length}`); }
      if (updates.length) {
        await pool.query(
          `UPDATE meta_ads_campaigns_cache SET ${updates.join(",")} WHERE client_id=$1 AND campaign_id=$2`,
          vals
        );
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message, permissionRequired: (err as any).permissionRequired });
    }
  });

  // ── Delete campaign ───────────────────────────────────────────────────────
  app.delete("/api/meta-cm/campaign/:clientId/:campaignId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const campaignId = p(req.params.campaignId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      await metaDelete(conn.token, campaignId);
      await pool.query("DELETE FROM meta_ads_campaigns_cache WHERE client_id=$1 AND campaign_id=$2", [clientId, campaignId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Bulk action on campaigns (pause/activate/delete) ─────────────────────
  app.post("/api/meta-cm/bulk/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const { ids, action } = req.body;
      if (!ids?.length) return res.status(400).json({ message: "ids required" });
      if (!["pause", "activate", "delete"].includes(action)) return res.status(400).json({ message: "invalid action" });

      let ok = 0, fail = 0;
      for (const id of ids) {
        try {
          if (action === "delete") {
            await metaDelete(conn.token, id);
            await pool.query("DELETE FROM meta_ads_campaigns_cache WHERE client_id=$1 AND campaign_id=$2", [clientId, id]);
          } else {
            const status = action === "pause" ? "PAUSED" : "ACTIVE";
            await metaPost(conn.token, `/${id}`, { status });
            await pool.query(
              "UPDATE meta_ads_campaigns_cache SET status=$1 WHERE client_id=$2 AND campaign_id=$3",
              [status, clientId, id]
            );
          }
          ok++;
        } catch { fail++; }
      }

      res.json({ ok, fail });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Update ad set ─────────────────────────────────────────────────────────
  app.patch("/api/meta-cm/adset/:clientId/:adsetId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const adsetId = p(req.params.adsetId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const { status, dailyBudget, name } = req.body;
      const body: Record<string, any> = {};
      if (status) body.status = status;
      if (name) body.name = name;
      if (dailyBudget != null) body.daily_budget = String(Math.round(dailyBudget * 100));

      await metaPost(conn.token, `/${adsetId}`, body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Delete ad set ─────────────────────────────────────────────────────────
  app.delete("/api/meta-cm/adset/:clientId/:adsetId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const adsetId = p(req.params.adsetId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      await metaDelete(conn.token, adsetId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Update ad ─────────────────────────────────────────────────────────────
  app.patch("/api/meta-cm/ad/:clientId/:adId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const adId = p(req.params.adId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const { status, name } = req.body;
      const body: Record<string, any> = {};
      if (status) body.status = status;
      if (name) body.name = name;

      await metaPost(conn.token, `/${adId}`, body);

      // Update ad cache if exists
      if (status) {
        await pool.query(
          "UPDATE meta_ads_ads_cache SET status=$1 WHERE client_id=$2 AND ad_id=$3",
          [status, clientId, adId]
        ).catch(() => {}); // non-fatal if not cached
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Delete ad ─────────────────────────────────────────────────────────────
  app.delete("/api/meta-cm/ad/:clientId/:adId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const adId = p(req.params.adId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      await metaDelete(conn.token, adId);
      await pool.query("DELETE FROM meta_ads_ads_cache WHERE client_id=$1 AND ad_id=$2", [clientId, adId]).catch(() => {});
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Create ad set under a campaign ───────────────────────────────────────
  app.post("/api/meta-cm/adset/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const {
        campaignId, name, dailyBudget, optimizationGoal = "LINK_CLICKS",
        billingEvent = "IMPRESSIONS", bidAmount, status = "PAUSED",
        targeting = {}, startTime,
      } = req.body;
      if (!campaignId || !name) return res.status(400).json({ message: "campaignId and name required" });
      if (!dailyBudget) return res.status(400).json({ message: "dailyBudget required" });

      const body: Record<string, any> = {
        campaign_id: campaignId,
        name,
        daily_budget: String(Math.round(dailyBudget * 100)),
        optimization_goal: optimizationGoal,
        billing_event: billingEvent,
        status,
        targeting: Object.keys(targeting).length
          ? targeting
          : { geo_locations: { countries: ["US"] }, age_min: 18, age_max: 65 },
      };
      if (bidAmount) body.bid_amount = String(Math.round(bidAmount * 100));
      if (startTime) body.start_time = startTime;

      const data = await metaPost(conn.token, `/${conn.adAccountId}/adsets`, body);
      res.json({ id: data.id, name, status });
    } catch (err: any) {
      res.status(500).json({ message: err.message, permissionRequired: (err as any).permissionRequired });
    }
  });

  // ── Account summary across all campaigns ─────────────────────────────────
  app.get("/api/meta-cm/summary/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        `SELECT
           COUNT(*) as total_campaigns,
           COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_campaigns,
           COUNT(*) FILTER (WHERE status = 'PAUSED') as paused_campaigns,
           COALESCE(SUM(CAST(spend AS NUMERIC)),0) as total_spend,
           COALESCE(SUM(CAST(impressions AS NUMERIC)),0) as total_impressions,
           COALESCE(SUM(CAST(clicks AS NUMERIC)),0) as total_clicks,
           COALESCE(AVG(CAST(NULLIF(roas,'0') AS NUMERIC)),0) as avg_roas,
           COALESCE(AVG(CAST(NULLIF(ctr,'0') AS NUMERIC)),0) as avg_ctr
         FROM meta_ads_campaigns_cache WHERE client_id = $1`,
        [clientId]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
