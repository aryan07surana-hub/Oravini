/**
 * AI Advisor for client Meta Ads
 * Option 1: Recommendation Queue (LLM analysis → approve/reject)
 * Option 2: Autopilot Rules (rule-based recommendations)
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
  if (!["pro", "elite"].includes(plan)) return res.status(403).json({ message: "Available on Pro and Elite plans" });
  next();
}

function myId(req: Request): string {
  return String((req.user as any).id);
}

async function getMyConn(userId: string) {
  const r = await pool.query(
    "SELECT access_token, ad_account_id FROM client_meta_ads_connections WHERE client_id=$1 AND is_active=true",
    [userId]
  );
  if (!r.rows[0]) return null;
  return { token: decryptToken(r.rows[0].access_token), adAccountId: r.rows[0].ad_account_id };
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
  if (data?.error) throw new Error(data.error.message);
  return data;
}

async function callGroqJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  let lastError = "";
  for (const model of models) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) { lastError = `HTTP ${r.status}`; continue; }
      const data: any = await r.json();
      if (data?.error) { lastError = data.error.message; continue; }
      const text = data?.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (e: any) { lastError = e.message; }
  }
  throw new Error(`Groq failed: ${lastError}`);
}

export async function registerMetaAdsAIAdvisorRoutes(app: Express) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meta_ads_ai_rules (
      id SERIAL PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE,
      enabled BOOLEAN DEFAULT false,
      pause_if_roas_below NUMERIC(10,2) DEFAULT 1.5,
      pause_if_roas_days INTEGER DEFAULT 3,
      scale_if_roas_above NUMERIC(10,2) DEFAULT 4.0,
      scale_if_roas_days INTEGER DEFAULT 3,
      max_budget_increase_pct INTEGER DEFAULT 20,
      daily_spend_cap NUMERIC(10,2) DEFAULT 500,
      last_run_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meta_ads_ai_recommendations (
      id SERIAL PRIMARY KEY,
      client_id TEXT NOT NULL,
      campaign_id TEXT,
      campaign_name TEXT,
      action_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      suggested_value TEXT,
      source TEXT DEFAULT 'llm',
      status TEXT DEFAULT 'pending',
      executed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const guard: any[] = [requireAuth, requireProOrElite];

  // GET /api/my-ads/ai-rules
  app.get("/api/my-ads/ai-rules", guard, async (req: Request, res: Response) => {
    try {
      const r = await pool.query("SELECT * FROM meta_ads_ai_rules WHERE client_id=$1", [myId(req)]);
      res.json(r.rows[0] || {
        enabled: false,
        pause_if_roas_below: "1.50",
        pause_if_roas_days: 3,
        scale_if_roas_above: "4.00",
        scale_if_roas_days: 3,
        max_budget_increase_pct: 20,
        daily_spend_cap: "500.00",
        last_run_at: null,
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // PUT /api/my-ads/ai-rules
  app.put("/api/my-ads/ai-rules", guard, async (req: Request, res: Response) => {
    try {
      const { enabled, pause_if_roas_below, pause_if_roas_days, scale_if_roas_above, scale_if_roas_days, max_budget_increase_pct, daily_spend_cap } = req.body;
      await pool.query(
        `INSERT INTO meta_ads_ai_rules
           (client_id,enabled,pause_if_roas_below,pause_if_roas_days,scale_if_roas_above,scale_if_roas_days,max_budget_increase_pct,daily_spend_cap,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT (client_id) DO UPDATE
           SET enabled=$2,pause_if_roas_below=$3,pause_if_roas_days=$4,scale_if_roas_above=$5,
               scale_if_roas_days=$6,max_budget_increase_pct=$7,daily_spend_cap=$8,updated_at=NOW()`,
        [myId(req), enabled, pause_if_roas_below, pause_if_roas_days, scale_if_roas_above, scale_if_roas_days, max_budget_increase_pct, daily_spend_cap]
      );
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // GET /api/my-ads/ai-recommendations
  app.get("/api/my-ads/ai-recommendations", guard, async (req: Request, res: Response) => {
    try {
      const r = await pool.query(
        "SELECT * FROM meta_ads_ai_recommendations WHERE client_id=$1 ORDER BY created_at DESC LIMIT 60",
        [myId(req)]
      );
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // POST /api/my-ads/ai-analyze — LLM analysis → pending recommendations
  app.post("/api/my-ads/ai-analyze", guard, async (req: Request, res: Response) => {
    try {
      const userId = myId(req);
      const camps = await pool.query(
        "SELECT * FROM meta_ads_campaigns_cache WHERE client_id=$1 ORDER BY CAST(COALESCE(spend,'0') AS NUMERIC) DESC LIMIT 20",
        [userId]
      );
      if (!camps.rows.length) return res.status(400).json({ message: "No campaign data — sync campaigns first" });

      const summary = camps.rows.map((c: any) => ({
        id: c.campaign_id,
        name: c.campaign_name,
        status: c.status,
        spend_30d_usd: parseFloat(c.spend || 0).toFixed(2),
        roas: parseFloat(c.roas || 0).toFixed(2),
        ctr_pct: parseFloat(c.ctr || 0).toFixed(2),
        cpc_usd: parseFloat(c.cpc || 0).toFixed(2),
        daily_budget_usd: c.daily_budget ? (parseFloat(c.daily_budget) / 100).toFixed(2) : null,
      }));

      const sys = `You are a Meta Ads performance analyst. Return ONLY valid JSON with this exact shape:
{"recommendations":[{"campaign_id":"string","campaign_name":"string","action_type":"pause|scale_budget|activate|alert","reason":"1-2 sentences with specific numbers","suggested_value":"new daily budget USD as string e.g. '120.00', or null"}]}
Logic:
- pause: ACTIVE campaign, spend > $5, ROAS < 1.5
- scale_budget: ACTIVE campaign, spend > $20, ROAS > 4.0 → suggested_value = current daily_budget * 1.2
- activate: PAUSED campaign showing strong efficiency signals (low CPC, high CTR)
- alert: anomalies such as near-zero CTR, exhausted budget headroom, or spend spike with no returns
Max 8 recs, most impactful first. Set suggested_value to null for everything except scale_budget.`;

      const raw = await callGroqJson(sys, `Campaign performance (last 30 days):\n${JSON.stringify(summary, null, 2)}`);
      const parsed = JSON.parse(raw);
      const recs: any[] = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

      const inserted: any[] = [];
      for (const r of recs) {
        const ins = await pool.query(
          "INSERT INTO meta_ads_ai_recommendations (client_id,campaign_id,campaign_name,action_type,reason,suggested_value,source) VALUES ($1,$2,$3,$4,$5,$6,'llm') RETURNING *",
          [userId, r.campaign_id || null, r.campaign_name || null, r.action_type, r.reason, r.suggested_value || null]
        );
        inserted.push(ins.rows[0]);
      }
      res.json({ count: inserted.length, recommendations: inserted });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // POST /api/my-ads/autopilot-run — rules engine → pending recommendations
  app.post("/api/my-ads/autopilot-run", guard, async (req: Request, res: Response) => {
    try {
      const userId = myId(req);
      const rulesR = await pool.query("SELECT * FROM meta_ads_ai_rules WHERE client_id=$1", [userId]);
      const rules = rulesR.rows[0] || {};
      const pauseBelow = parseFloat(rules.pause_if_roas_below ?? 1.5);
      const scaleAbove = parseFloat(rules.scale_if_roas_above ?? 4.0);
      const maxIncreasePct = parseFloat(rules.max_budget_increase_pct ?? 20);
      const spendCap = parseFloat(rules.daily_spend_cap ?? 500);

      const camps = await pool.query("SELECT * FROM meta_ads_campaigns_cache WHERE client_id=$1", [userId]);
      const created: any[] = [];

      for (const c of camps.rows) {
        const spend = parseFloat(c.spend || 0);
        const roas = parseFloat(c.roas || 0);
        const budget = c.daily_budget ? parseFloat(c.daily_budget) / 100 : null;

        if (c.status === "ACTIVE" && spend > 5 && roas > 0 && roas < pauseBelow) {
          const ins = await pool.query(
            "INSERT INTO meta_ads_ai_recommendations (client_id,campaign_id,campaign_name,action_type,reason,source) VALUES ($1,$2,$3,'pause',$4,'rule') RETURNING *",
            [userId, c.campaign_id, c.campaign_name,
             `ROAS is ${roas.toFixed(2)}x — below your pause threshold of ${pauseBelow}x. $${spend.toFixed(0)} spent in last 30 days.`]
          );
          created.push(ins.rows[0]);
        }

        if (c.status === "ACTIVE" && spend > 20 && roas > scaleAbove && budget) {
          const newBudget = Math.min(budget * (1 + maxIncreasePct / 100), spendCap);
          if (newBudget > budget) {
            const ins = await pool.query(
              "INSERT INTO meta_ads_ai_recommendations (client_id,campaign_id,campaign_name,action_type,reason,suggested_value,source) VALUES ($1,$2,$3,'scale_budget',$4,$5,'rule') RETURNING *",
              [userId, c.campaign_id, c.campaign_name,
               `ROAS is ${roas.toFixed(2)}x — above your scale threshold of ${scaleAbove}x. Increasing daily budget by ${maxIncreasePct}% (from $${budget.toFixed(0)} → $${newBudget.toFixed(0)}).`,
               newBudget.toFixed(2)]
            );
            created.push(ins.rows[0]);
          }
        }
      }

      await pool.query(
        `INSERT INTO meta_ads_ai_rules (client_id,last_run_at,updated_at) VALUES ($1,NOW(),NOW())
         ON CONFLICT (client_id) DO UPDATE SET last_run_at=NOW(),updated_at=NOW()`,
        [userId]
      );

      res.json({ count: created.length, recommendations: created });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // PATCH /api/my-ads/ai-recommendations/:id/approve — execute on Meta
  app.patch("/api/my-ads/ai-recommendations/:id/approve", guard, async (req: Request, res: Response) => {
    try {
      const userId = myId(req);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const recR = await pool.query(
        "SELECT * FROM meta_ads_ai_recommendations WHERE id=$1 AND client_id=$2 AND status='pending'",
        [id, userId]
      );
      const rec = recR.rows[0];
      if (!rec) return res.status(404).json({ message: "Recommendation not found or already actioned" });

      const conn = await getMyConn(userId);
      if (!conn) return res.status(400).json({ message: "Not connected to Meta" });

      if (rec.action_type === "pause" && rec.campaign_id) {
        await metaPost(conn.token, `/${rec.campaign_id}`, { status: "PAUSED" });
        await pool.query("UPDATE meta_ads_campaigns_cache SET status='PAUSED' WHERE client_id=$1 AND campaign_id=$2", [userId, rec.campaign_id]);
      } else if (rec.action_type === "activate" && rec.campaign_id) {
        await metaPost(conn.token, `/${rec.campaign_id}`, { status: "ACTIVE" });
        await pool.query("UPDATE meta_ads_campaigns_cache SET status='ACTIVE' WHERE client_id=$1 AND campaign_id=$2", [userId, rec.campaign_id]);
      } else if (rec.action_type === "scale_budget" && rec.campaign_id && rec.suggested_value) {
        const cents = Math.round(parseFloat(rec.suggested_value) * 100);
        await metaPost(conn.token, `/${rec.campaign_id}`, { daily_budget: String(cents) });
        await pool.query("UPDATE meta_ads_campaigns_cache SET daily_budget=$1 WHERE client_id=$2 AND campaign_id=$3", [String(cents), userId, rec.campaign_id]);
      }
      // action_type === "alert": no Meta API call, just acknowledge

      await pool.query("UPDATE meta_ads_ai_recommendations SET status='executed', executed_at=NOW() WHERE id=$1", [id]);
      res.json({ ok: true });
    } catch (e: any) {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await pool.query("UPDATE meta_ads_ai_recommendations SET status='failed' WHERE id=$1", [id]);
      res.status(500).json({ message: e.message });
    }
  });

  // PATCH /api/my-ads/ai-recommendations/:id/reject
  app.patch("/api/my-ads/ai-recommendations/:id/reject", guard, async (req: Request, res: Response) => {
    try {
      const userId = myId(req);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await pool.query("UPDATE meta_ads_ai_recommendations SET status='rejected' WHERE id=$1 AND client_id=$2", [id, userId]);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}
