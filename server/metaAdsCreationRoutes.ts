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
    const msg = data.error.message || "Meta API error";
    const code = data.error.code;
    if (code === 200 || code === 10 || msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("advertiser")) {
      throw new Error("PERMISSION_DENIED: " + msg);
    }
    throw new Error(`Meta API (${code}): ${msg}`);
  }
  return data;
}

async function metaDelete(token: string, objectId: string): Promise<any> {
  const url = new URL(`${META_BASE}/${objectId}`);
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString(), { method: "DELETE" });
  const data = await res.json() as any;
  if (data?.error) throw new Error(`Meta API: ${data.error.message}`);
  return data;
}

async function getClientConn(clientId: string) {
  const result = await pool.query(
    "SELECT access_token, ad_account_id FROM client_meta_ads_connections WHERE client_id = $1 AND is_active = true",
    [clientId]
  );
  if (!result.rows[0]) return null;
  const { access_token, ad_account_id } = result.rows[0];
  return { token: decryptToken(access_token), adAccountId: ad_account_id };
}

async function callGroq(systemPrompt: string, userPrompt: string, maxTokens = 2000): Promise<any> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
  const models = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"];
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json() as any;
      if (data.error) continue;
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;
      return JSON.parse(content);
    } catch { continue; }
  }
  throw new Error("All Groq models failed");
}

// Meta API enum mappings
const OBJECTIVE_MAP: Record<string, string> = {
  LEADS: "LEAD_GENERATION",
  SALES: "CONVERSIONS",
  TRAFFIC: "LINK_CLICKS",
  AWARENESS: "REACH",
  APP_INSTALLS: "APP_INSTALLS",
  VIDEO_VIEWS: "VIDEO_VIEWS",
  LEAD_GENERATION: "LEAD_GENERATION",
  CONVERSIONS: "CONVERSIONS",
  LINK_CLICKS: "LINK_CLICKS",
  REACH: "REACH",
};

const OPTIMIZATION_GOAL_MAP: Record<string, string> = {
  LEAD_GENERATION: "LEAD_GENERATION",
  CONVERSIONS: "OFFSITE_CONVERSIONS",
  LINK_CLICKS: "LINK_CLICKS",
  REACH: "REACH",
  APP_INSTALLS: "APP_INSTALLS",
  VIDEO_VIEWS: "THRUPLAY",
};

const BILLING_EVENT_MAP: Record<string, string> = {
  LEAD_GENERATION: "IMPRESSIONS",
  OFFSITE_CONVERSIONS: "IMPRESSIONS",
  LINK_CLICKS: "LINK_CLICKS",
  REACH: "IMPRESSIONS",
  APP_INSTALLS: "IMPRESSIONS",
  THRUPLAY: "THRUPLAY",
};

function buildTargeting(opts: {
  countries?: string[];
  ageMin?: number;
  ageMax?: number;
  genders?: number[];
}): Record<string, any> {
  const targeting: Record<string, any> = {
    geo_locations: { countries: opts.countries?.length ? opts.countries : ["US"] },
    age_min: opts.ageMin || 18,
    age_max: opts.ageMax || 65,
    publisher_platforms: ["facebook", "instagram"],
    facebook_positions: ["feed", "story", "instant_article"],
    instagram_positions: ["stream", "story", "reels"],
  };
  if (opts.genders?.length) targeting.genders = opts.genders;
  return targeting;
}

export function registerMetaAdsCreationRoutes(app: Express) {
  // ── Launch blueprint as PAUSED campaigns ──────────────────────────────────
  app.post("/api/meta-ads/launch/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection for this client" });

      const { blueprint, countries = ["US"] } = req.body;
      if (!blueprint?.campaigns?.length) {
        return res.status(400).json({ message: "blueprint.campaigns required" });
      }

      const { token, adAccountId } = conn;
      const created: any[] = [];

      for (const camp of blueprint.campaigns) {
        const metaObjective = OBJECTIVE_MAP[camp.objective] || "REACH";
        const optimizationGoal = OPTIMIZATION_GOAL_MAP[metaObjective] || "REACH";
        const billingEvent = BILLING_EVENT_MAP[optimizationGoal] || "IMPRESSIONS";
        const isCBO = camp.budget_type === "CBO";

        // monthly_budget → daily cents (÷30 × 100), minimum $10 = 1000 cents
        const dailyBudgetCents = camp.monthly_budget
          ? Math.max(Math.round((camp.monthly_budget / 30) * 100), 1000)
          : 1000;

        const campaignBody: Record<string, any> = {
          name: camp.name,
          objective: metaObjective,
          status: "PAUSED",
          special_ad_categories: [],
        };
        if (isCBO) campaignBody.daily_budget = String(dailyBudgetCents);

        const createdCampaign = await metaPost(token, `/${adAccountId}/campaigns`, campaignBody);
        const campaignId = createdCampaign.id;
        const createdAdSets: any[] = [];

        for (const adset of (camp.ad_sets || [])) {
          const adsetDailyCents = adset.daily_budget
            ? Math.max(Math.round(adset.daily_budget * 100), 1000)
            : Math.max(Math.round(((adset.monthly_budget || 300) / 30) * 100), 1000);

          const adSetBody: Record<string, any> = {
            name: adset.name,
            campaign_id: campaignId,
            optimization_goal: optimizationGoal,
            billing_event: billingEvent,
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            targeting: buildTargeting({ countries }),
            status: "PAUSED",
          };
          if (!isCBO) adSetBody.daily_budget = String(adsetDailyCents);

          const createdAdSet = await metaPost(token, `/${adAccountId}/adsets`, adSetBody);
          createdAdSets.push({ id: createdAdSet.id, name: adset.name });
        }

        created.push({ campaignId, campaignName: camp.name, adSets: createdAdSets });
      }

      await pool.query(
        `INSERT INTO meta_ads_launch_log (client_id, instruction, campaigns_created, status)
         VALUES ($1, $2, $3, 'success')`,
        [clientId, `Blueprint: ${blueprint.campaigns.length} campaign(s)`, JSON.stringify(created)]
      );

      res.json({
        success: true,
        created,
        message: `${created.length} campaign(s) created as PAUSED. Add creatives in Meta Ads Manager then activate.`,
      });
    } catch (err: any) {
      const msg = err.message || "Failed";
      const isPerm = msg.startsWith("PERMISSION_DENIED");
      await pool.query(
        `INSERT INTO meta_ads_launch_log (client_id, instruction, campaigns_created, status) VALUES ($1, $2, $3, 'error')`,
        [p(req.params.clientId), "Blueprint launch", JSON.stringify({ error: msg })]
      ).catch(() => {});
      res.status(isPerm ? 403 : 500).json({
        message: isPerm
          ? "ads_management permission required. In Meta Developer console → your app → Add product → Marketing API → Request ads_management permission."
          : msg,
        permissionRequired: isPerm,
      });
    }
  });

  // ── AI Agent: natural language → create campaign ───────────────────────
  app.post("/api/meta-ads/agent/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const { instruction } = req.body;
      if (!instruction?.trim()) return res.status(400).json({ message: "instruction required" });

      const { token, adAccountId } = conn;

      const parsed = await callGroq(
        `You are a Meta Ads API expert. Parse the user's campaign instruction into exact Meta Marketing API parameters.
Return ONLY valid JSON with this structure:
{
  "campaigns": [{
    "name": "Descriptive campaign name (include niche + goal + date shorthand)",
    "objective": "LEAD_GENERATION|CONVERSIONS|LINK_CLICKS|REACH|VIDEO_VIEWS|APP_INSTALLS",
    "daily_budget_cents": 5000,
    "is_cbo": true,
    "ad_sets": [{
      "name": "Ad set name describing audience",
      "daily_budget_cents": null,
      "age_min": 18,
      "age_max": 65,
      "genders": [],
      "countries": ["US"]
    }]
  }],
  "explanation": "Plain English: what you're creating and why this structure"
}

Rules:
- is_cbo=true means budget at campaign level (set ad_set daily_budget_cents=null)
- minimum daily_budget_cents is 1000 (= $10/day)
- genders: [] = all, [1] = male only, [2] = female only
- countries: ISO 2-letter codes ["US","CA","GB","AU" etc]
- infer objective from intent: "leads/calls/bookings" → LEAD_GENERATION, "sales/purchases/buy" → CONVERSIONS, "traffic/clicks/website" → LINK_CLICKS, "awareness/reach/views" → REACH
- create multiple ad sets if user mentions testing different audiences`,
        `Today: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
User instruction: "${instruction}"`
      );

      if (!parsed.campaigns?.length) {
        return res.status(400).json({ message: "Could not parse instruction into campaign structure. Be more specific." });
      }

      const created: any[] = [];

      for (const camp of parsed.campaigns) {
        const metaObjective = OBJECTIVE_MAP[camp.objective] || "REACH";
        const optimizationGoal = OPTIMIZATION_GOAL_MAP[metaObjective] || "REACH";
        const billingEvent = BILLING_EVENT_MAP[optimizationGoal] || "IMPRESSIONS";
        const isCBO = camp.is_cbo !== false;

        const campaignBody: Record<string, any> = {
          name: camp.name,
          objective: metaObjective,
          status: "PAUSED",
          special_ad_categories: [],
        };
        if (isCBO) {
          campaignBody.daily_budget = String(Math.max(camp.daily_budget_cents || 1000, 1000));
        }

        const createdCampaign = await metaPost(token, `/${adAccountId}/campaigns`, campaignBody);
        const campaignId = createdCampaign.id;
        const createdAdSets: any[] = [];

        const adSets = camp.ad_sets?.length
          ? camp.ad_sets
          : [{ name: camp.name + " — Ad Set", daily_budget_cents: camp.daily_budget_cents, age_min: 18, age_max: 65, genders: [], countries: ["US"] }];

        for (const adset of adSets) {
          const adSetBody: Record<string, any> = {
            name: adset.name,
            campaign_id: campaignId,
            optimization_goal: optimizationGoal,
            billing_event: billingEvent,
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            targeting: buildTargeting({
              countries: adset.countries || ["US"],
              ageMin: adset.age_min,
              ageMax: adset.age_max,
              genders: adset.genders,
            }),
            status: "PAUSED",
          };
          if (!isCBO && adset.daily_budget_cents) {
            adSetBody.daily_budget = String(Math.max(adset.daily_budget_cents, 1000));
          }

          const createdAdSet = await metaPost(token, `/${adAccountId}/adsets`, adSetBody);
          createdAdSets.push({ id: createdAdSet.id, name: adset.name });
        }

        created.push({ campaignId, campaignName: camp.name, adSets: createdAdSets });
      }

      await pool.query(
        `INSERT INTO meta_ads_launch_log (client_id, instruction, campaigns_created, status)
         VALUES ($1, $2, $3, 'success')`,
        [clientId, instruction, JSON.stringify(created)]
      );

      res.json({
        success: true,
        created,
        explanation: parsed.explanation,
        message: `Created ${created.length} campaign(s) as PAUSED. Add creatives in Meta Ads Manager then activate.`,
      });
    } catch (err: any) {
      const msg = err.message || "Failed";
      const isPerm = msg.startsWith("PERMISSION_DENIED");
      await pool.query(
        `INSERT INTO meta_ads_launch_log (client_id, instruction, campaigns_created, status) VALUES ($1, $2, $3, 'error')`,
        [p(req.params.clientId), req.body?.instruction || "", JSON.stringify({ error: msg })]
      ).catch(() => {});
      res.status(isPerm ? 403 : 500).json({
        message: isPerm
          ? "ads_management permission required. Request it in Meta Developer console → your app → Marketing API."
          : msg,
        permissionRequired: isPerm,
      });
    }
  });

  // ── Update campaign status or budget ──────────────────────────────────────
  app.patch("/api/meta-ads/campaign/:clientId/:campaignId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const campaignId = p(req.params.campaignId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      const { status, dailyBudget } = req.body;
      const body: Record<string, any> = {};
      if (status) body.status = status;
      if (dailyBudget != null) body.daily_budget = String(Math.round(dailyBudget * 100));

      const url = new URL(`${META_BASE}/${campaignId}`);
      url.searchParams.set("access_token", conn.token);
      const res2 = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res2.json() as any;
      if (data?.error) throw new Error(`Meta API: ${data.error.message}`);

      // Update local cache status if status changed
      if (status) {
        await pool.query(
          "UPDATE meta_ads_campaigns_cache SET status = $1 WHERE client_id = $2 AND campaign_id = $3",
          [status, clientId, campaignId]
        );
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Delete campaign ───────────────────────────────────────────────────────
  app.delete("/api/meta-ads/campaign/:clientId/:campaignId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const campaignId = p(req.params.campaignId);
      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection" });

      await metaDelete(conn.token, campaignId);
      await pool.query(
        "DELETE FROM meta_ads_campaigns_cache WHERE client_id = $1 AND campaign_id = $2",
        [clientId, campaignId]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Launch log ────────────────────────────────────────────────────────────
  app.get("/api/meta-ads/launch-log/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        "SELECT * FROM meta_ads_launch_log WHERE client_id = $1 ORDER BY launched_at DESC LIMIT 30",
        [clientId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
