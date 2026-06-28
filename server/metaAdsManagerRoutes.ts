import type { Express, Request, Response } from "express";
import { pool } from "./storage";

const p = (param: string | string[]): string => Array.isArray(param) ? param[0] : param;

function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  if ((req.user as any).role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

async function callGroq(systemPrompt: string, userPrompt: string, maxTokens = 4000, json = false): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");
  const models = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant"];
  let lastError = "";
  for (const model of models) {
    try {
      const body: any = {
        model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
      };
      if (json) body.response_format = { type: "json_object" };
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { lastError = `HTTP ${r.status}`; continue; }
      const data: any = await r.json();
      if (data?.error) { lastError = data.error.message; continue; }
      const text = data?.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (e: any) { lastError = e.message; }
  }
  throw new Error(`AI generation failed: ${lastError}`);
}

export function registerMetaAdsManagerRoutes(app: Express) {

  // ── Campaign Architect ────────────────────────────────────────────────────
  app.post("/api/meta-ads/architect", requireAdmin, async (req: Request, res: Response) => {
    try {
      const {
        budget, goalType, niche, offer, targetAudience,
        funnelType, budgetStrategy, currency = "USD",
      } = req.body;

      if (!budget || !goalType || !niche || !offer) {
        return res.status(400).json({ message: "budget, goalType, niche, offer required" });
      }

      const systemPrompt = `You are an elite Meta Ads strategist with 10+ years experience managing $50M+ in ad spend.
Design precise, actionable Meta Ads campaign structures that maximize ROAS.
Always return valid JSON only. No markdown, no explanation outside the JSON.`;

      const userPrompt = `Design a complete Meta Ads campaign structure for:

Budget: ${currency} ${budget}/month
Goal: ${goalType}
Niche: ${niche}
Offer: ${offer}
Target Audience: ${targetAudience || "Not specified"}
Funnel Type: ${funnelType || "full_funnel"} (full_funnel = TOFU+MOFU+BOFU, single = conversion only)
Budget Strategy: ${budgetStrategy || "CBO"} (CBO = Campaign Budget Optimization, ABO = Ad Set Budget)

Return this exact JSON structure:
{
  "strategy_summary": "2-3 sentence overview of the approach",
  "budget_breakdown": {
    "tofu_percent": number,
    "mofu_percent": number,
    "bofu_percent": number,
    "tofu_monthly": number,
    "mofu_monthly": number,
    "bofu_monthly": number
  },
  "campaigns": [
    {
      "name": "campaign name",
      "stage": "tofu|mofu|bofu",
      "objective": "Meta objective (REACH|AWARENESS|TRAFFIC|ENGAGEMENT|LEADS|SALES)",
      "budget_type": "CBO|ABO",
      "monthly_budget": number,
      "daily_budget": number,
      "rationale": "why this structure",
      "ad_sets": [
        {
          "name": "ad set name",
          "audience_type": "cold|warm|hot",
          "audience_description": "specific targeting details",
          "daily_budget": number,
          "placement": "automatic|feed|reels|stories",
          "optimization_goal": "IMPRESSIONS|REACH|LINK_CLICKS|LEAD_GENERATION|CONVERSIONS"
        }
      ]
    }
  ],
  "testing_framework": {
    "phase_1": "what to test first (week 1-2)",
    "phase_2": "what to test next (week 3-4)",
    "success_metrics": ["metric1", "metric2"],
    "kill_threshold": "when to pause an ad set"
  },
  "launch_checklist": [
    "checklist item 1",
    "checklist item 2"
  ],
  "estimated_results": {
    "expected_roas_range": "X-Yx",
    "expected_cpa_range": "$X-$Y",
    "break_even_roas": number,
    "days_to_optimize": number
  }
}`;

      const raw = await callGroq(systemPrompt, userPrompt, 4000, true);
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Budget Optimizer ──────────────────────────────────────────────────────
  app.post("/api/meta-ads/budget-optimizer/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const { monthlyBudget } = req.body;

      const campaigns = await pool.query(
        `SELECT campaign_name, status, spend, impressions, clicks, ctr, cpc, conversions, roas
         FROM meta_ads_campaigns_cache WHERE client_id = $1 ORDER BY CAST(spend AS NUMERIC) DESC`,
        [clientId]
      );

      if (campaigns.rows.length === 0) {
        return res.json({ suggestions: [], summary: "No campaign data yet. Sync your Meta Ads account first." });
      }

      const campaignSummary = campaigns.rows.map(c =>
        `- ${c.campaign_name}: spend=$${parseFloat(c.spend || "0").toFixed(2)}, ` +
        `ROAS=${c.roas ? parseFloat(c.roas).toFixed(2) + "x" : "N/A"}, ` +
        `CTR=${parseFloat(c.ctr || "0").toFixed(2)}%, ` +
        `conversions=${c.conversions || 0}, status=${c.status}`
      ).join("\n");

      const systemPrompt = `You are a Meta Ads budget optimization expert. Analyze campaign performance and give precise, actionable budget recommendations. Return JSON only.`;

      const userPrompt = `Monthly budget: ${monthlyBudget ? `$${monthlyBudget}` : "Not specified"}

Current campaigns (last 30 days):
${campaignSummary}

Return this exact JSON:
{
  "summary": "2-3 sentence overall assessment",
  "score": number (0-100, overall account health),
  "suggestions": [
    {
      "type": "scale|pause|reallocate|test",
      "campaign": "campaign name",
      "action": "specific action to take",
      "amount": number or null,
      "reason": "data-driven reason",
      "priority": "high|medium|low",
      "expected_impact": "what this will achieve"
    }
  ],
  "budget_reallocation": {
    "from": "campaign name",
    "to": "campaign name",
    "amount": number,
    "justification": "reason"
  } or null,
  "quick_wins": ["win1", "win2", "win3"]
}`;

      const raw = await callGroq(systemPrompt, userPrompt, 2000, true);
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Scaling Rules CRUD ────────────────────────────────────────────────────
  app.get("/api/meta-ads/scaling-rules/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        "SELECT * FROM meta_ads_scaling_rules WHERE client_id = $1 ORDER BY created_at DESC",
        [clientId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/meta-ads/scaling-rules", requireAdmin, async (req: Request, res: Response) => {
    try {
      const {
        clientId, name, conditionMetric, conditionOperator,
        conditionValue, conditionWindowDays, actionType, actionValue,
      } = req.body;

      if (!clientId || !name || !conditionMetric || !conditionOperator || conditionValue == null || !actionType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const result = await pool.query(
        `INSERT INTO meta_ads_scaling_rules
           (client_id, name, condition_metric, condition_operator, condition_value,
            condition_window_days, action_type, action_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [clientId, name, conditionMetric, conditionOperator, conditionValue,
          conditionWindowDays || 3, actionType, actionValue || null]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/meta-ads/scaling-rules/:ruleId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const ruleId = p(req.params.ruleId);
      await pool.query("DELETE FROM meta_ads_scaling_rules WHERE id = $1", [ruleId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/meta-ads/scaling-rules/:ruleId/toggle", requireAdmin, async (req: Request, res: Response) => {
    try {
      const ruleId = p(req.params.ruleId);
      const result = await pool.query(
        "UPDATE meta_ads_scaling_rules SET is_active = NOT is_active WHERE id = $1 RETURNING *",
        [ruleId]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Evaluate scaling rules against current campaign data
  app.post("/api/meta-ads/scaling-rules/evaluate/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const rules = await pool.query(
        "SELECT * FROM meta_ads_scaling_rules WHERE client_id = $1 AND is_active = true",
        [clientId]
      );
      const campaigns = await pool.query(
        "SELECT * FROM meta_ads_campaigns_cache WHERE client_id = $1",
        [clientId]
      );

      const triggered: any[] = [];
      for (const rule of rules.rows) {
        for (const campaign of campaigns.rows) {
          const metricVal = getMetricValue(campaign, rule.condition_metric);
          if (metricVal === null) continue;
          const meets = evaluateCondition(metricVal, rule.condition_operator, parseFloat(rule.condition_value));
          if (meets) {
            triggered.push({
              rule: rule.name,
              campaign: campaign.campaign_name,
              metric: rule.condition_metric,
              value: metricVal,
              action: rule.action_type,
              actionValue: rule.action_value,
            });
          }
        }
      }

      res.json({ triggered, evaluated: rules.rows.length * campaigns.rows.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── COGS / Profit Calculator ──────────────────────────────────────────────
  app.get("/api/meta-ads/cogs/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query("SELECT * FROM meta_ads_cogs WHERE client_id = $1", [clientId]);
      res.json(result.rows[0] || null);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/meta-ads/cogs/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const { productName, sellingPrice, cogsAmount, currency } = req.body;
      if (!productName || !sellingPrice || !cogsAmount) {
        return res.status(400).json({ message: "productName, sellingPrice, cogsAmount required" });
      }
      const result = await pool.query(
        `INSERT INTO meta_ads_cogs (client_id, product_name, selling_price, cogs_amount, currency, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (client_id) DO UPDATE SET
           product_name=EXCLUDED.product_name, selling_price=EXCLUDED.selling_price,
           cogs_amount=EXCLUDED.cogs_amount, currency=EXCLUDED.currency, updated_at=NOW()
         RETURNING *`,
        [clientId, productName, sellingPrice, cogsAmount, currency || "USD"]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/meta-ads/profit-analysis/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);

      const cogsRes = await pool.query("SELECT * FROM meta_ads_cogs WHERE client_id = $1", [clientId]);
      const cogs = cogsRes.rows[0];

      const campaigns = await pool.query(
        "SELECT campaign_name, spend, conversions, roas FROM meta_ads_campaigns_cache WHERE client_id = $1",
        [clientId]
      );

      const analysis = campaigns.rows.map(c => {
        const spend = parseFloat(c.spend || "0");
        const conversions = c.conversions || 0;
        const revenue = cogs ? conversions * parseFloat(cogs.selling_price) : 0;
        const grossProfit = cogs ? conversions * (parseFloat(cogs.selling_price) - parseFloat(cogs.cogs_amount)) : 0;
        const netProfit = grossProfit - spend;
        const profitRoas = spend > 0 ? grossProfit / spend : 0;
        const breakEvenConversions = cogs && spend > 0
          ? Math.ceil(spend / (parseFloat(cogs.selling_price) - parseFloat(cogs.cogs_amount)))
          : null;

        return {
          campaignName: c.campaign_name,
          spend,
          conversions,
          revenue,
          grossProfit,
          netProfit,
          profitRoas,
          breakEvenConversions,
          isProfit: netProfit > 0,
        };
      });

      const totals = {
        totalSpend: analysis.reduce((s, c) => s + c.spend, 0),
        totalRevenue: analysis.reduce((s, c) => s + c.revenue, 0),
        totalGrossProfit: analysis.reduce((s, c) => s + c.grossProfit, 0),
        totalNetProfit: analysis.reduce((s, c) => s + c.netProfit, 0),
        overallProfitRoas: 0,
      };
      totals.overallProfitRoas = totals.totalSpend > 0 ? totals.totalGrossProfit / totals.totalSpend : 0;

      res.json({ campaigns: analysis, totals, cogs });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Spend Pacing ──────────────────────────────────────────────────────────
  app.get("/api/meta-ads/spend-pacing/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const { monthlyBudget } = req.query;

      const campaigns = await pool.query(
        "SELECT SUM(CAST(spend AS NUMERIC)) as total_spend FROM meta_ads_campaigns_cache WHERE client_id = $1",
        [clientId]
      );

      const totalSpend30d = parseFloat(campaigns.rows[0]?.total_spend || "0");
      const budget = monthlyBudget ? parseFloat(monthlyBudget as string) : null;

      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dayOfMonth = now.getDate();
      const daysRemaining = daysInMonth - dayOfMonth;
      const expectedSpend = budget ? (budget / daysInMonth) * dayOfMonth : null;
      const projectedMonthly = budget ? (totalSpend30d / dayOfMonth) * daysInMonth : null;
      const overspendAmount = budget && projectedMonthly ? Math.max(0, projectedMonthly - budget) : null;
      const underspendAmount = budget && projectedMonthly ? Math.max(0, budget - projectedMonthly) : null;
      const pacingPct = expectedSpend && expectedSpend > 0 ? (totalSpend30d / expectedSpend) * 100 : null;

      res.json({
        totalSpend30d,
        budget,
        dayOfMonth,
        daysInMonth,
        daysRemaining,
        expectedSpend,
        projectedMonthly,
        overspendAmount,
        underspendAmount,
        pacingPct,
        status: pacingPct === null ? "no_budget" : pacingPct > 110 ? "overpacing" : pacingPct < 90 ? "underpacing" : "on_track",
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Weekly AI Report ──────────────────────────────────────────────────────
  app.post("/api/meta-ads/generate-report/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const { clientName, niche } = req.body;

      const campaigns = await pool.query(
        `SELECT campaign_name, status, spend, impressions, clicks, ctr, cpc, cpm, conversions, roas, reach
         FROM meta_ads_campaigns_cache WHERE client_id = $1 ORDER BY CAST(spend AS NUMERIC) DESC`,
        [clientId]
      );

      if (campaigns.rows.length === 0) {
        return res.status(400).json({ message: "No campaign data. Sync Meta Ads first." });
      }

      const cogsRes = await pool.query("SELECT * FROM meta_ads_cogs WHERE client_id = $1", [clientId]);
      const cogs = cogsRes.rows[0];

      const totalSpend = campaigns.rows.reduce((s, c) => s + parseFloat(c.spend || "0"), 0);
      const totalConversions = campaigns.rows.reduce((s, c) => s + (c.conversions || 0), 0);
      const totalRevenue = cogs ? totalConversions * parseFloat(cogs.selling_price) : null;
      const avgRoas = campaigns.rows.filter(c => c.roas).length > 0
        ? campaigns.rows.filter(c => c.roas).reduce((s, c) => s + parseFloat(c.roas), 0) / campaigns.rows.filter(c => c.roas).length
        : null;

      const bestCampaign = [...campaigns.rows].sort((a, b) => parseFloat(b.roas || "0") - parseFloat(a.roas || "0"))[0];
      const worstCampaign = [...campaigns.rows].sort((a, b) => parseFloat(a.roas || "0") - parseFloat(b.roas || "0"))[0];

      const metricsText = campaigns.rows.map(c =>
        `${c.campaign_name}: spend=$${parseFloat(c.spend || "0").toFixed(2)}, ` +
        `impressions=${(c.impressions || 0).toLocaleString()}, ` +
        `clicks=${c.clicks || 0}, CTR=${parseFloat(c.ctr || "0").toFixed(2)}%, ` +
        `CPC=$${parseFloat(c.cpc || "0").toFixed(2)}, ` +
        `conversions=${c.conversions || 0}, ROAS=${c.roas ? parseFloat(c.roas).toFixed(2) + "x" : "N/A"}`
      ).join("\n");

      const systemPrompt = `You are an expert Meta Ads performance analyst writing a professional weekly report for a ${niche || "business"} client.
Write in a clear, confident, data-driven tone. Be specific with numbers. Give actionable next steps.`;

      const userPrompt = `Write a weekly Meta Ads performance report for ${clientName || "this client"}.

Last 30 days summary:
- Total spend: $${totalSpend.toFixed(2)}
- Total conversions: ${totalConversions}
- Average ROAS: ${avgRoas ? avgRoas.toFixed(2) + "x" : "N/A"}
${totalRevenue ? `- Estimated revenue: $${totalRevenue.toFixed(2)}` : ""}
- Best campaign: ${bestCampaign?.campaign_name} (ROAS: ${bestCampaign?.roas ? parseFloat(bestCampaign.roas).toFixed(2) + "x" : "N/A"})
- Worst campaign: ${worstCampaign?.campaign_name} (ROAS: ${worstCampaign?.roas ? parseFloat(worstCampaign.roas).toFixed(2) + "x" : "N/A"})

All campaigns:
${metricsText}

Write a report with these sections:
1. **Executive Summary** (3-4 sentences, overall performance assessment)
2. **What Worked** (specific campaigns/ad sets with data)
3. **What Didn't Work** (specific underperformers with data)
4. **Key Insights** (3-5 bullet points, data-driven observations)
5. **Action Items for Next Week** (5 specific, prioritized actions)
6. **Budget Recommendation** (how to allocate budget next month)`;

      const reportText = await callGroq(systemPrompt, userPrompt, 3000);

      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 30);

      const saved = await pool.query(
        `INSERT INTO meta_ads_reports (client_id, report_date, period_start, period_end, ai_summary, metrics_snapshot)
         VALUES ($1, NOW(), $2, $3, $4, $5) RETURNING id, created_at`,
        [clientId, periodStart.toISOString().split("T")[0], periodEnd.toISOString().split("T")[0], reportText, JSON.stringify({ totalSpend, totalConversions, avgRoas, campaignCount: campaigns.rows.length })]
      );

      res.json({
        id: saved.rows[0].id,
        reportText,
        createdAt: saved.rows[0].created_at,
        metrics: { totalSpend, totalConversions, avgRoas },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/meta-ads/reports/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        "SELECT id, report_date, period_start, period_end, metrics_snapshot, created_at FROM meta_ads_reports WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20",
        [clientId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/meta-ads/reports/:clientId/:reportId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const reportId = p(req.params.reportId);
      const result = await pool.query(
        "SELECT * FROM meta_ads_reports WHERE id = $1 AND client_id = $2",
        [reportId, clientId]
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Report not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Snapshot current campaigns as daily data point ────────────────────────
  app.post("/api/meta-ads/snapshot/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const campaigns = await pool.query(
        "SELECT * FROM meta_ads_campaigns_cache WHERE client_id = $1",
        [clientId]
      );
      const today = new Date().toISOString().split("T")[0];
      let snapped = 0;
      for (const c of campaigns.rows) {
        await pool.query(
          `INSERT INTO meta_ads_daily_snapshots
             (client_id, campaign_id, campaign_name, snapshot_date, spend, impressions, clicks, conversions, reach, ctr, cpc, roas)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (client_id, campaign_id, snapshot_date) DO UPDATE SET
             spend=EXCLUDED.spend, impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks,
             conversions=EXCLUDED.conversions, reach=EXCLUDED.reach, ctr=EXCLUDED.ctr,
             cpc=EXCLUDED.cpc, roas=EXCLUDED.roas`,
          [clientId, c.campaign_id, c.campaign_name, today,
            parseFloat(c.spend || "0"), c.impressions || 0, c.clicks || 0,
            c.conversions || 0, c.reach || 0,
            parseFloat(c.ctr || "0"), parseFloat(c.cpc || "0"),
            c.roas ? parseFloat(c.roas) : null]
        );
        snapped++;
      }
      res.json({ success: true, snapped });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Trend data ─────────────────────────────────────────────────────────────
  app.get("/api/meta-ads/trend-data/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        `SELECT snapshot_date,
                SUM(spend) as spend,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(conversions) as conversions,
                AVG(roas) as roas,
                AVG(ctr) as ctr
         FROM meta_ads_daily_snapshots
         WHERE client_id = $1 AND snapshot_date >= NOW() - INTERVAL '30 days'
         GROUP BY snapshot_date ORDER BY snapshot_date ASC`,
        [clientId]
      );

      if (result.rows.length < 2) {
        // Fall back to campaign cache as single data point
        const cache = await pool.query(
          "SELECT campaign_id, campaign_name, spend, impressions, clicks, conversions, roas, ctr, synced_at FROM meta_ads_campaigns_cache WHERE client_id = $1",
          [clientId]
        );
        return res.json({ daily: [], campaigns: cache.rows, hasHistory: false });
      }

      res.json({ daily: result.rows, campaigns: [], hasHistory: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Cohort analysis ────────────────────────────────────────────────────────
  app.get("/api/meta-ads/cohort/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        `SELECT
           campaign_name,
           EXTRACT(WEEK FROM snapshot_date) - EXTRACT(WEEK FROM MIN(snapshot_date) OVER (PARTITION BY campaign_id)) + 1 AS week_num,
           SUM(spend) as spend,
           SUM(conversions) as conversions,
           AVG(roas) as roas,
           AVG(ctr) as ctr
         FROM meta_ads_daily_snapshots
         WHERE client_id = $1
         GROUP BY campaign_id, campaign_name, week_num
         ORDER BY campaign_name, week_num`,
        [clientId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getMetricValue(campaign: any, metric: string): number | null {
  switch (metric) {
    case "roas": return campaign.roas ? parseFloat(campaign.roas) : null;
    case "ctr": return parseFloat(campaign.ctr || "0");
    case "cpc": return parseFloat(campaign.cpc || "0");
    case "cpm": return parseFloat(campaign.cpm || "0");
    case "conversions": return campaign.conversions || 0;
    case "spend": return parseFloat(campaign.spend || "0");
    default: return null;
  }
}

function evaluateCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
    case "eq": return value === threshold;
    default: return false;
  }
}
