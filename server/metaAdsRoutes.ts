import type { Express, Request, Response } from "express";
import { pool } from "./storage";
import { encryptToken, decryptToken } from "./security/tokenEncryption";

const META_BASE = "https://graph.facebook.com/v19.0";

const p = (param: string | string[]): string => Array.isArray(param) ? param[0] : param;

function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  if ((req.user as any).role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

async function metaAdsGet(token: string, path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${META_BASE}${path}`);
  url.searchParams.set("access_token", token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json() as any;
  if (data?.error) throw new Error(`Meta API: ${data.error.message} (code ${data.error.code})`);
  return data;
}

async function getClientConn(clientId: string): Promise<{ token: string; adAccountId: string } | null> {
  const result = await pool.query(
    "SELECT access_token, ad_account_id FROM client_meta_ads_connections WHERE client_id = $1 AND is_active = true",
    [clientId]
  );
  if (!result.rows[0]) return null;
  const { access_token, ad_account_id } = result.rows[0];
  if (!access_token) return null;
  return { token: decryptToken(access_token), adAccountId: ad_account_id };
}

export function registerMetaAdsRoutes(app: Express) {
  // GET /api/meta-ads/status/:clientId
  app.get("/api/meta-ads/status/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        "SELECT ad_account_id, ad_account_name, connected_at, last_synced_at, token_expires_at, is_active FROM client_meta_ads_connections WHERE client_id = $1",
        [clientId]
      );
      if (!result.rows[0]) return res.json({ connected: false });
      const r = result.rows[0];
      res.json({
        connected: r.is_active,
        adAccountId: r.ad_account_id,
        adAccountName: r.ad_account_name,
        connectedAt: r.connected_at,
        lastSyncedAt: r.last_synced_at,
        tokenExpiresAt: r.token_expires_at,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/meta-ads/connect/:clientId — save token + ad account id
  app.post("/api/meta-ads/connect/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const { accessToken, adAccountId } = req.body;
      if (!accessToken || !adAccountId) {
        return res.status(400).json({ message: "accessToken and adAccountId required" });
      }

      const normalizedId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

      // Verify token + get account name
      let adAccountName = normalizedId;
      try {
        const acct = await metaAdsGet(accessToken, `/${normalizedId}`, {
          fields: "id,name,currency,account_status",
        });
        adAccountName = acct.name || normalizedId;
      } catch { /* proceed even if name fetch fails */ }

      const encryptedToken = encryptToken(accessToken);
      await pool.query(
        `INSERT INTO client_meta_ads_connections
           (client_id, access_token, ad_account_id, ad_account_name, is_active, connected_at)
         VALUES ($1, $2, $3, $4, TRUE, NOW())
         ON CONFLICT (client_id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           ad_account_id = EXCLUDED.ad_account_id,
           ad_account_name = EXCLUDED.ad_account_name,
           is_active = TRUE,
           connected_at = NOW()`,
        [clientId, encryptedToken, normalizedId, adAccountName]
      );

      res.json({ success: true, adAccountName });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/meta-ads/disconnect/:clientId
  app.delete("/api/meta-ads/disconnect/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      await pool.query(
        "UPDATE client_meta_ads_connections SET is_active = FALSE WHERE client_id = $1",
        [clientId]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/meta-ads/list-accounts — list ad accounts for a given token
  app.post("/api/meta-ads/list-accounts", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) return res.status(400).json({ message: "accessToken required" });
      const data = await metaAdsGet(accessToken, "/me/adaccounts", {
        fields: "id,name,currency,account_status",
        limit: "25",
      });
      res.json(data?.data || []);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/meta-ads/sync/:clientId — pull fresh data from Meta Marketing API
  app.post("/api/meta-ads/sync/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection found for this client" });

      const { token, adAccountId } = conn;

      // Fetch campaigns
      const campaignsData = await metaAdsGet(token, `/${adAccountId}/campaigns`, {
        fields: "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time",
        limit: "50",
      });
      const campaigns: any[] = campaignsData?.data || [];

      // Fetch account-level insights (last 30 days)
      let accountInsights: any = {};
      try {
        const insData = await metaAdsGet(token, `/${adAccountId}/insights`, {
          fields: "spend,impressions,clicks,cpm,cpc,ctr,reach,conversions,purchase_roas",
          date_preset: "last_30d",
          level: "account",
        });
        accountInsights = insData?.data?.[0] || {};
      } catch { /* non-fatal */ }

      // Fetch per-campaign insights
      const campaignInsights: Record<string, any> = {};
      try {
        const ciData = await metaAdsGet(token, `/${adAccountId}/insights`, {
          fields: "campaign_id,spend,impressions,clicks,cpm,cpc,ctr,reach,conversions,purchase_roas",
          date_preset: "last_30d",
          level: "campaign",
          limit: "50",
        });
        (ciData?.data || []).forEach((ci: any) => {
          campaignInsights[ci.campaign_id] = ci;
        });
      } catch { /* non-fatal */ }

      // Upsert campaigns into cache
      for (const c of campaigns) {
        const ci = campaignInsights[c.id] || {};
        const roas = ci.purchase_roas?.[0]?.value ? String(ci.purchase_roas[0].value) : null;
        await pool.query(
          `INSERT INTO meta_ads_campaigns_cache
             (client_id, campaign_id, campaign_name, status, objective, budget_daily, budget_lifetime,
              spend, impressions, clicks, cpm, cpc, ctr, reach, conversions, roas, start_time, end_time, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
           ON CONFLICT (client_id, campaign_id) DO UPDATE SET
             campaign_name=EXCLUDED.campaign_name, status=EXCLUDED.status, objective=EXCLUDED.objective,
             budget_daily=EXCLUDED.budget_daily, budget_lifetime=EXCLUDED.budget_lifetime,
             spend=EXCLUDED.spend, impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks,
             cpm=EXCLUDED.cpm, cpc=EXCLUDED.cpc, ctr=EXCLUDED.ctr, reach=EXCLUDED.reach,
             conversions=EXCLUDED.conversions, roas=EXCLUDED.roas,
             start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time, synced_at=NOW()`,
          [
            clientId, c.id, c.name, c.status, c.objective,
            c.daily_budget ? Number(c.daily_budget) : null,
            c.lifetime_budget ? Number(c.lifetime_budget) : null,
            ci.spend || "0", Number(ci.impressions) || 0, Number(ci.clicks) || 0,
            ci.cpm || "0", ci.cpc || "0", ci.ctr || "0",
            Number(ci.reach) || 0, Number(ci.conversions) || 0, roas,
            c.start_time || null, c.stop_time || null,
          ]
        );
      }

      await pool.query(
        "UPDATE client_meta_ads_connections SET last_synced_at = NOW() WHERE client_id = $1",
        [clientId]
      );

      const roas = accountInsights.purchase_roas?.[0]?.value;
      res.json({
        success: true,
        campaignsCount: campaigns.length,
        accountInsights: {
          spend: accountInsights.spend || "0",
          impressions: Number(accountInsights.impressions) || 0,
          clicks: Number(accountInsights.clicks) || 0,
          cpm: accountInsights.cpm || "0",
          cpc: accountInsights.cpc || "0",
          ctr: accountInsights.ctr || "0",
          reach: Number(accountInsights.reach) || 0,
          conversions: Number(accountInsights.conversions) || 0,
          roas: roas ? String(roas) : null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/campaigns/:clientId
  app.get("/api/meta-ads/campaigns/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        `SELECT * FROM meta_ads_campaigns_cache
         WHERE client_id = $1
         ORDER BY CAST(spend AS NUMERIC) DESC NULLS LAST`,
        [clientId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
