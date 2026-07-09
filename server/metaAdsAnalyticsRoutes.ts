/**
 * Meta Ads Analytics — ad-level sync, time-series snapshots, creative performance,
 * fatigue detection, statistical significance testing.
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

// ── Statistical significance (two-proportion z-test) ─────────────────────
function zTest(clicks1: number, impressions1: number, clicks2: number, impressions2: number) {
  if (impressions1 < 100 || impressions2 < 100) return { significant: false, confidence: 0, winner: null };
  const p1 = clicks1 / impressions1;
  const p2 = clicks2 / impressions2;
  const pPool = (clicks1 + clicks2) / (impressions1 + impressions2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / impressions1 + 1 / impressions2));
  if (se === 0) return { significant: false, confidence: 0, winner: null };
  const z = Math.abs(p1 - p2) / se;
  const confidence = z > 2.576 ? 99 : z > 1.96 ? 95 : z > 1.645 ? 90 : Math.round(z * 45);
  return {
    significant: z > 1.96,
    confidence,
    winner: p1 > p2 ? "a" : "b",
    zScore: parseFloat(z.toFixed(3)),
    ctrs: { a: parseFloat((p1 * 100).toFixed(3)), b: parseFloat((p2 * 100).toFixed(3)) },
  };
}

export function registerMetaAdsAnalyticsRoutes(app: Express) {

  // POST /api/meta-ads/sync-ads/:clientId — pull full ad-level data + daily snapshots
  app.post("/api/meta-ads/sync-ads/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });
      const { token, adAccountId } = conn;

      // Pull ads with creative info
      let allAds: any[] = [];
      let adsUrl: string | null = `/${adAccountId}/ads`;
      let adsParams: Record<string, string> = {
        fields: "id,name,status,adset_id,adset{id,name},campaign_id,campaign{id,name},creative{id,name,thumbnail_url}",
        limit: "200",
      };
      while (adsUrl && allAds.length < 2000) {
        const data = await metaGet(token, adsUrl, adsParams);
        allAds = allAds.concat(data.data || []);
        const next = data.paging?.cursors?.after;
        if (next && data.data?.length === 200) {
          adsParams = { ...adsParams, after: next };
        } else { break; }
      }

      // Pull 30d insights at ad level
      const insightsData = await metaGet(token, `/${adAccountId}/insights`, {
        fields: "ad_id,ad_name,impressions,clicks,spend,ctr,cpc,cpm,reach,conversions,purchase_roas,frequency",
        date_preset: "last_30d",
        level: "ad",
        limit: "200",
      });
      const insightsMap: Record<string, any> = {};
      (insightsData?.data || []).forEach((i: any) => { insightsMap[i.ad_id] = i; });

      // Upsert into ads cache
      const today = new Date().toISOString().slice(0, 10);
      for (const ad of allAds) {
        const ins = insightsMap[ad.id] || {};
        const roas = ins.purchase_roas?.[0]?.value ? parseFloat(ins.purchase_roas[0].value) : null;
        await pool.query(
          `INSERT INTO meta_ads_ads_cache
             (client_id, ad_id, ad_name, campaign_id, campaign_name, adset_id, adset_name,
              status, creative_id, creative_name, thumbnail_url,
              spend, impressions, clicks, conversions, reach, ctr, cpc, cpm, roas, frequency, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
           ON CONFLICT (client_id, ad_id) DO UPDATE SET
             ad_name=EXCLUDED.ad_name, status=EXCLUDED.status,
             creative_id=EXCLUDED.creative_id, creative_name=EXCLUDED.creative_name,
             thumbnail_url=EXCLUDED.thumbnail_url,
             spend=EXCLUDED.spend, impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks,
             conversions=EXCLUDED.conversions, reach=EXCLUDED.reach,
             ctr=EXCLUDED.ctr, cpc=EXCLUDED.cpc, cpm=EXCLUDED.cpm,
             roas=EXCLUDED.roas, frequency=EXCLUDED.frequency, synced_at=NOW()`,
          [
            clientId, ad.id, ad.name,
            ad.campaign_id, ad.campaign?.name || null,
            ad.adset_id, ad.adset?.name || null,
            ad.status,
            ad.creative?.id || null, ad.creative?.name || null, ad.creative?.thumbnail_url || null,
            parseFloat(ins.spend || "0"),
            Number(ins.impressions || 0), Number(ins.clicks || 0),
            Number(ins.conversions || 0), Number(ins.reach || 0),
            parseFloat(ins.ctr || "0"), parseFloat(ins.cpc || "0"), parseFloat(ins.cpm || "0"),
            roas, parseFloat(ins.frequency || "0"),
          ]
        );

        // Also save today's snapshot
        if (ins.spend) {
          await pool.query(
            `INSERT INTO meta_ads_ad_snapshots
               (client_id, ad_id, ad_name, campaign_id, campaign_name, adset_id, adset_name,
                snapshot_date, spend, impressions, clicks, conversions, reach, ctr, cpc, cpm, roas)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             ON CONFLICT (client_id, ad_id, snapshot_date) DO UPDATE SET
               spend=EXCLUDED.spend, impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks,
               conversions=EXCLUDED.conversions, reach=EXCLUDED.reach,
               ctr=EXCLUDED.ctr, cpc=EXCLUDED.cpc, cpm=EXCLUDED.cpm, roas=EXCLUDED.roas`,
            [
              clientId, ad.id, ad.name,
              ad.campaign_id, ad.campaign?.name || null,
              ad.adset_id, ad.adset?.name || null,
              today,
              parseFloat(ins.spend || "0"),
              Number(ins.impressions || 0), Number(ins.clicks || 0),
              Number(ins.conversions || 0), Number(ins.reach || 0),
              parseFloat(ins.ctr || "0"), parseFloat(ins.cpc || "0"), parseFloat(ins.cpm || "0"),
              roas,
            ]
          );
        }
      }

      res.json({ synced: allAds.length, withInsights: Object.keys(insightsMap).length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/ads/:clientId — get full ad cache
  app.get("/api/meta-ads/ads/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const { status, campaign_id, adset_id, sort = "spend", order = "desc", limit = "200" } = req.query as Record<string, string>;

      let query = "SELECT * FROM meta_ads_ads_cache WHERE client_id = $1";
      const params: any[] = [clientId];
      if (status) { params.push(status); query += ` AND status = $${params.length}`; }
      if (campaign_id) { params.push(campaign_id); query += ` AND campaign_id = $${params.length}`; }
      if (adset_id) { params.push(adset_id); query += ` AND adset_id = $${params.length}`; }

      const sortCol = ["spend", "impressions", "clicks", "roas", "ctr", "cpc", "conversions"].includes(sort) ? sort : "spend";
      const dir = order === "asc" ? "ASC" : "DESC";
      query += ` ORDER BY ${sortCol} ${dir} NULLS LAST LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/ad-trends/:clientId/:adId — time-series for a specific ad
  app.get("/api/meta-ads/ad-trends/:clientId/:adId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const adId = p(req.params.adId);
      const { days = "30" } = req.query as Record<string, string>;

      // Try DB first (historical snapshots)
      const dbResult = await pool.query(
        `SELECT snapshot_date, spend, impressions, clicks, conversions, ctr, cpc, cpm, roas
         FROM meta_ads_ad_snapshots
         WHERE client_id = $1 AND ad_id = $2
         ORDER BY snapshot_date ASC
         LIMIT $3`,
        [clientId, adId, parseInt(days)]
      );

      if (dbResult.rows.length > 1) {
        return res.json({ source: "db", data: dbResult.rows });
      }

      // Fall back to live Meta API for daily breakdown
      const conn = await getClientConn(clientId);
      if (!conn) return res.json({ source: "none", data: [] });

      const data = await metaGet(conn.token, `/${adId}/insights`, {
        fields: "impressions,clicks,spend,ctr,cpc,cpm,reach,conversions,purchase_roas",
        time_increment: "1",
        date_preset: `last_${days}d`,
      });

      const rows = (data?.data || []).map((d: any) => ({
        snapshot_date: d.date_start,
        spend: parseFloat(d.spend || "0"),
        impressions: Number(d.impressions || 0),
        clicks: Number(d.clicks || 0),
        conversions: Number(d.conversions || 0),
        ctr: parseFloat(d.ctr || "0"),
        cpc: parseFloat(d.cpc || "0"),
        cpm: parseFloat(d.cpm || "0"),
        roas: d.purchase_roas?.[0]?.value ? parseFloat(d.purchase_roas[0].value) : null,
      }));

      res.json({ source: "live", data: rows });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/creative-performance/:clientId — creative comparison matrix
  app.get("/api/meta-ads/creative-performance/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);

      // Group by creative_name, aggregate metrics
      const result = await pool.query(
        `SELECT
           creative_name,
           COUNT(*) as ad_count,
           SUM(spend) as total_spend,
           SUM(impressions) as total_impressions,
           SUM(clicks) as total_clicks,
           SUM(conversions) as total_conversions,
           AVG(ctr) as avg_ctr,
           AVG(cpm) as avg_cpm,
           AVG(roas) FILTER (WHERE roas IS NOT NULL) as avg_roas,
           ARRAY_AGG(DISTINCT adset_name) as adset_names,
           MAX(thumbnail_url) as thumbnail_url,
           MAX(status) as status
         FROM meta_ads_ads_cache
         WHERE client_id = $1 AND creative_name IS NOT NULL AND impressions > 100
         GROUP BY creative_name
         ORDER BY total_spend DESC
         LIMIT 100`,
        [clientId]
      );

      const rows = result.rows.map(r => ({
        ...r,
        total_spend: parseFloat(r.total_spend || "0"),
        avg_ctr: parseFloat(r.avg_ctr || "0"),
        avg_cpm: parseFloat(r.avg_cpm || "0"),
        avg_roas: r.avg_roas ? parseFloat(r.avg_roas) : null,
        // Performance tier
        tier: !r.avg_roas ? "no_data"
          : parseFloat(r.avg_roas) >= 3 ? "winner"
          : parseFloat(r.avg_roas) >= 1.5 ? "average"
          : "loser",
      }));

      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/fatigue-report/:clientId — creatives with declining CTR
  app.get("/api/meta-ads/fatigue-report/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);

      // Get ads with at least 7 days of snapshot data
      const result = await pool.query(
        `SELECT
           ad_id, ad_name, creative_name, adset_name,
           ARRAY_AGG(snapshot_date ORDER BY snapshot_date) as dates,
           ARRAY_AGG(ctr ORDER BY snapshot_date) as ctrs,
           ARRAY_AGG(spend ORDER BY snapshot_date) as spends,
           ARRAY_AGG(roas ORDER BY snapshot_date) as roases,
           SUM(spend) as total_spend
         FROM meta_ads_ad_snapshots
         WHERE client_id = $1
         GROUP BY ad_id, ad_name, creative_name, adset_name
         HAVING COUNT(*) >= 5`,
        [clientId]
      );

      const fatigued = result.rows
        .map(row => {
          const ctrs = row.ctrs.map(Number);
          const n = ctrs.length;
          if (n < 3) return null;

          // Compare first third vs last third
          const earlyAvg = ctrs.slice(0, Math.floor(n / 3)).reduce((a: number, b: number) => a + b, 0) / Math.floor(n / 3);
          const recentAvg = ctrs.slice(-Math.floor(n / 3)).reduce((a: number, b: number) => a + b, 0) / Math.floor(n / 3);
          const drop = earlyAvg > 0 ? ((earlyAvg - recentAvg) / earlyAvg) * 100 : 0;

          return {
            adId: row.ad_id,
            adName: row.ad_name,
            creativeName: row.creative_name,
            adSetName: row.adset_name,
            totalSpend: parseFloat(row.total_spend || "0"),
            earlyAvgCtr: parseFloat(earlyAvg.toFixed(3)),
            recentAvgCtr: parseFloat(recentAvg.toFixed(3)),
            ctrDropPct: parseFloat(drop.toFixed(1)),
            fatigued: drop >= 25,
            dates: row.dates,
            ctrs,
            spends: row.spends.map(Number),
            roases: row.roases.map((r: any) => r ? Number(r) : null),
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.ctrDropPct - a.ctrDropPct);

      res.json(fatigued);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/meta-ads/stat-test — statistical significance between two ads
  app.post("/api/meta-ads/stat-test", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { adIdA, adIdB, clientId } = req.body;
      const result = await pool.query(
        "SELECT ad_id, ad_name, clicks, impressions, conversions, roas, ctr, spend FROM meta_ads_ads_cache WHERE client_id = $1 AND ad_id = ANY($2)",
        [clientId, [adIdA, adIdB]]
      );
      const ads = result.rows;
      const a = ads.find(r => r.ad_id === adIdA);
      const b = ads.find(r => r.ad_id === adIdB);
      if (!a || !b) return res.status(404).json({ message: "One or both ads not found in cache" });

      const ctrTest = zTest(Number(a.clicks), Number(a.impressions), Number(b.clicks), Number(b.impressions));
      const convTest = zTest(Number(a.conversions), Number(a.impressions), Number(b.conversions), Number(b.impressions));

      res.json({
        adA: { id: a.ad_id, name: a.ad_name, ctr: parseFloat(a.ctr), roas: a.roas, spend: parseFloat(a.spend) },
        adB: { id: b.ad_id, name: b.ad_name, ctr: parseFloat(b.ctr), roas: b.roas, spend: parseFloat(b.spend) },
        ctrTest,
        conversionTest: convTest,
        recommendation: ctrTest.significant
          ? `Ad ${ctrTest.winner === "a" ? a.ad_name : b.ad_name} wins on CTR with ${ctrTest.confidence}% confidence. ${ctrTest.winner === "a" ? "Scale A, pause B." : "Scale B, pause A."}`
          : "Not enough data yet for statistical significance. Need more impressions.",
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/account-stats/:clientId — aggregate stats across all ads
  app.get("/api/meta-ads/account-stats/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        `SELECT
           COUNT(*) as total_ads,
           COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_ads,
           COUNT(*) FILTER (WHERE status = 'PAUSED') as paused_ads,
           SUM(spend) as total_spend,
           SUM(impressions) as total_impressions,
           SUM(clicks) as total_clicks,
           SUM(conversions) as total_conversions,
           AVG(roas) FILTER (WHERE roas IS NOT NULL AND roas > 0) as avg_roas,
           AVG(ctr) FILTER (WHERE impressions > 100) as avg_ctr,
           COUNT(*) FILTER (WHERE roas >= 2) as winning_ads,
           COUNT(*) FILTER (WHERE roas < 1 AND roas IS NOT NULL AND spend > 10) as losing_ads
         FROM meta_ads_ads_cache
         WHERE client_id = $1`,
        [clientId]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
