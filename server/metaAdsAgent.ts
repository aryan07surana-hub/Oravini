/**
 * Meta Ads AI Agent — scheduled performance watcher.
 * 24h: account-level update (spend, ROAS, pacing, top/worst campaign).
 * 72h: ad-level creative analysis (winners, losers, pause candidates).
 */
import { pool } from "./storage";
import { decryptToken } from "./security/tokenEncryption";

const META_BASE = "https://graph.facebook.com/v19.0";

// ── Helpers ───────────────────────────────────────────────────────────────

async function metaGet(token: string, path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${META_BASE}${path}`);
  url.searchParams.set("access_token", token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json() as any;
  if (data?.error) throw new Error(`Meta API: ${data.error.message} (${data.error.code})`);
  return data;
}

async function callGroq(systemPrompt: string, userPrompt: string, maxTokens = 1200): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const models = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"];
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          max_tokens: maxTokens,
        }),
      });
      const data = await res.json() as any;
      if (data.error) continue;
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch { continue; }
  }
  throw new Error("All Groq models failed");
}

async function getActiveConnections(): Promise<Array<{ clientId: string; token: string; adAccountId: string }>> {
  const result = await pool.query(
    "SELECT client_id, access_token, ad_account_id FROM client_meta_ads_connections WHERE is_active = true"
  );
  return result.rows.map(r => ({
    clientId: r.client_id,
    token: decryptToken(r.access_token),
    adAccountId: r.ad_account_id,
  }));
}

async function saveLog(clientId: string, type: "24h_update" | "72h_creative_alert", summary: string, rawData: any) {
  await pool.query(
    `INSERT INTO meta_ads_agent_logs (client_id, type, ai_summary, raw_data)
     VALUES ($1, $2, $3, $4)`,
    [clientId, type, summary, JSON.stringify(rawData)]
  );
}

// ── 24h Daily Update ─────────────────────────────────────────────────────

export async function runDailyUpdate(clientId: string, token: string, adAccountId: string): Promise<string> {
  // Pull last 7 days of campaign-level insights
  const [todayData, yesterdayData, weekData] = await Promise.allSettled([
    metaGet(token, `/${adAccountId}/insights`, {
      fields: "spend,impressions,clicks,reach,conversions,purchase_roas,ctr,cpm",
      date_preset: "today",
      level: "account",
    }),
    metaGet(token, `/${adAccountId}/insights`, {
      fields: "spend,impressions,clicks,reach,conversions,purchase_roas,ctr",
      date_preset: "yesterday",
      level: "account",
    }),
    metaGet(token, `/${adAccountId}/insights`, {
      fields: "campaign_name,spend,impressions,clicks,conversions,purchase_roas,ctr,cpc",
      date_preset: "last_7d",
      level: "campaign",
      limit: "20",
    }),
  ]);

  const today = (todayData.status === "fulfilled" ? todayData.value?.data?.[0] : null) || {};
  const yesterday = (yesterdayData.status === "fulfilled" ? yesterdayData.value?.data?.[0] : null) || {};
  const campaigns: any[] = (weekData.status === "fulfilled" ? weekData.value?.data : null) || [];

  const todaySpend = parseFloat(today.spend || "0");
  const yesterdaySpend = parseFloat(yesterday.spend || "0");
  const todayRoas = today.purchase_roas?.[0]?.value ? parseFloat(today.purchase_roas[0].value) : null;
  const yesterdayRoas = yesterday.purchase_roas?.[0]?.value ? parseFloat(yesterday.purchase_roas[0].value) : null;

  const spendDelta = yesterdaySpend > 0 ? ((todaySpend - yesterdaySpend) / yesterdaySpend * 100).toFixed(1) : "N/A";

  const topCamp = campaigns.sort((a, b) => parseFloat(b.purchase_roas?.[0]?.value || "0") - parseFloat(a.purchase_roas?.[0]?.value || "0"))[0];
  const worstCamp = campaigns.sort((a, b) => parseFloat(a.purchase_roas?.[0]?.value || "0") - parseFloat(b.purchase_roas?.[0]?.value || "0"))[0];

  const rawData = { today, yesterday, campaigns, generatedAt: new Date().toISOString() };

  const dataStr = `
TODAY:
- Spend: $${todaySpend.toFixed(2)} (${spendDelta !== "N/A" ? spendDelta + "% vs yesterday" : "no prior data"})
- ROAS: ${todayRoas?.toFixed(2) || "N/A"}x (yesterday: ${yesterdayRoas?.toFixed(2) || "N/A"}x)
- Impressions: ${Number(today.impressions || 0).toLocaleString()}
- Clicks: ${Number(today.clicks || 0).toLocaleString()}
- CTR: ${parseFloat(today.ctr || "0").toFixed(2)}%
- Conversions: ${today.conversions || 0}
- CPM: $${parseFloat(today.cpm || "0").toFixed(2)}

LAST 7 DAYS — TOP CAMPAIGN:
${topCamp ? `${topCamp.campaign_name}: $${parseFloat(topCamp.spend).toFixed(2)} spend, ${topCamp.purchase_roas?.[0]?.value ? parseFloat(topCamp.purchase_roas[0].value).toFixed(2) + "x ROAS" : "no ROAS data"}` : "No campaign data"}

LAST 7 DAYS — WORST CAMPAIGN:
${worstCamp && worstCamp !== topCamp ? `${worstCamp.campaign_name}: $${parseFloat(worstCamp.spend).toFixed(2)} spend, ${worstCamp.purchase_roas?.[0]?.value ? parseFloat(worstCamp.purchase_roas[0].value).toFixed(2) + "x ROAS" : "no ROAS data"}` : "Only one campaign"}

ALL CAMPAIGNS (last 7d):
${campaigns.slice(0, 10).map(c => `- ${c.campaign_name}: $${parseFloat(c.spend || "0").toFixed(2)} spend, ${c.purchase_roas?.[0]?.value ? parseFloat(c.purchase_roas[0].value).toFixed(2) + "x ROAS" : "no ROAS"}, ${parseFloat(c.ctr || "0").toFixed(2)}% CTR`).join("\n")}
`.trim();

  const summary = await callGroq(
    `You are a Meta Ads performance analyst. Write a concise daily update for an ad account.
Format: use short paragraphs with emojis. Be direct and specific. Highlight what's working, what's not.
Max 250 words. Include: today's performance vs yesterday, trend assessment, top performer, worst performer, 2-3 action items.`,
    dataStr,
    600
  );

  await saveLog(clientId, "24h_update", summary, rawData);
  console.log(`[meta-ads-agent] 24h update done for client ${clientId}`);
  return summary;
}

// ── 72h Creative Alert ────────────────────────────────────────────────────

export async function runCreativeAlert(clientId: string, token: string, adAccountId: string): Promise<string> {
  // Pull ad-level performance (last 7 days)
  const [adsData, adInsightsData] = await Promise.allSettled([
    metaGet(token, `/${adAccountId}/ads`, {
      fields: "id,name,status,adset_id,adset{name},creative{id,name,thumbnail_url,body,title}",
      limit: "50",
    }),
    metaGet(token, `/${adAccountId}/insights`, {
      fields: "ad_id,ad_name,impressions,clicks,spend,ctr,cpc,cpm,reach,conversions,purchase_roas",
      date_preset: "last_7d",
      level: "ad",
      limit: "50",
    }),
  ]);

  const ads: any[] = (adsData.status === "fulfilled" ? adsData.value?.data : null) || [];
  const adInsights: any[] = (adInsightsData.status === "fulfilled" ? adInsightsData.value?.data : null) || [];

  // Join ads + insights by ad_id
  const insightsMap: Record<string, any> = {};
  adInsights.forEach(i => { insightsMap[i.ad_id] = i; });

  const adPerformance = ads.map(ad => {
    const ins = insightsMap[ad.id] || {};
    const roas = ins.purchase_roas?.[0]?.value ? parseFloat(ins.purchase_roas[0].value) : null;
    return {
      adId: ad.id,
      adName: ad.name,
      adSetName: ad.adset?.name || "Unknown Ad Set",
      status: ad.status,
      creativeName: ad.creative?.name || ad.name,
      creativeBody: ad.creative?.body?.slice(0, 100) || "",
      creativeTitle: ad.creative?.title || "",
      spend: parseFloat(ins.spend || "0"),
      impressions: Number(ins.impressions || 0),
      clicks: Number(ins.clicks || 0),
      ctr: parseFloat(ins.ctr || "0"),
      cpc: parseFloat(ins.cpc || "0"),
      cpm: parseFloat(ins.cpm || "0"),
      conversions: Number(ins.conversions || 0),
      roas,
    };
  }).filter(a => a.impressions > 100); // ignore ads with no data

  // Sort by ROAS desc
  const sorted = [...adPerformance].sort((a, b) => (b.roas || 0) - (a.roas || 0));
  const winners = sorted.slice(0, 3);
  const losers = sorted.slice(-3).reverse();

  // Hook rate = CTR (impressions → clicks is the "hook" for awareness campaigns)
  const avgCtr = adPerformance.length > 0 ? adPerformance.reduce((s, a) => s + a.ctr, 0) / adPerformance.length : 0;
  const hookWinners = [...adPerformance].sort((a, b) => b.ctr - a.ctr).slice(0, 3);
  const hookLosers = [...adPerformance].sort((a, b) => a.ctr - b.ctr).slice(0, 3);

  const rawData = { adPerformance, winners, losers, hookWinners, hookLosers, generatedAt: new Date().toISOString() };

  const dataStr = `
TOTAL ADS ANALYZED: ${adPerformance.length} (last 7 days, min 100 impressions)
ACCOUNT AVG CTR: ${avgCtr.toFixed(2)}%

TOP PERFORMERS (by ROAS):
${winners.map(a => `- "${a.creativeName}" | Ad Set: ${a.adSetName} | $${a.spend.toFixed(2)} spend | ${a.roas?.toFixed(2) || "N/A"}x ROAS | ${a.ctr.toFixed(2)}% CTR | ${a.conversions} conv`).join("\n") || "No data"}

UNDERPERFORMERS (by ROAS):
${losers.map(a => `- "${a.creativeName}" | Ad Set: ${a.adSetName} | $${a.spend.toFixed(2)} spend | ${a.roas?.toFixed(2) || "N/A"}x ROAS | ${a.ctr.toFixed(2)}% CTR | ${a.conversions} conv | Status: ${a.status}`).join("\n") || "No data"}

BEST HOOK RATE (CTR):
${hookWinners.map(a => `- "${a.creativeName}": ${a.ctr.toFixed(2)}% CTR, ${a.impressions.toLocaleString()} impressions`).join("\n") || "No data"}

WORST HOOK RATE (CTR):
${hookLosers.map(a => `- "${a.creativeName}": ${a.ctr.toFixed(2)}% CTR, $${a.spend.toFixed(2)} spent`).join("\n") || "No data"}

ALL ADS SUMMARY:
${adPerformance.slice(0, 15).map(a => `- ${a.adName}: $${a.spend.toFixed(2)}, ${a.roas?.toFixed(2) || "–"}x ROAS, ${a.ctr.toFixed(2)}% CTR, ${a.conversions} conv [${a.status}]`).join("\n")}
`.trim();

  const summary = await callGroq(
    `You are a Meta Ads creative strategist. Analyze creative performance data and write a 72-hour creative performance alert.

Format with sections:
🏆 WINNERS — What's crushing it and why
🚨 PAUSE THESE — Specific ads to pause immediately (by name) and why
💡 HOOK ANALYSIS — Which creatives have strong/weak hooks and what that means
📋 ACTION PLAN — 3-5 specific actions to take in the next 72 hours (scale winners, pause losers, test new angles)

Be specific, name actual creatives, give concrete numbers. Max 350 words.`,
    dataStr,
    900
  );

  await saveLog(clientId, "72h_creative_alert", summary, rawData);
  console.log(`[meta-ads-agent] 72h creative alert done for client ${clientId}`);
  return summary;
}

// ── Run for all connected clients ─────────────────────────────────────────

export async function runAgentForAllClients(type: "24h_update" | "72h_creative_alert") {
  const connections = await getActiveConnections();
  console.log(`[meta-ads-agent] Running ${type} for ${connections.length} client(s)`);

  for (const conn of connections) {
    try {
      if (type === "24h_update") {
        await runDailyUpdate(conn.clientId, conn.token, conn.adAccountId);
      } else {
        await runCreativeAlert(conn.clientId, conn.token, conn.adAccountId);
      }
    } catch (err: any) {
      console.error(`[meta-ads-agent] Failed for client ${conn.clientId}:`, err.message);
      // Log the failure so admin can see it
      await pool.query(
        `INSERT INTO meta_ads_agent_logs (client_id, type, ai_summary, raw_data)
         VALUES ($1, $2, $3, $4)`,
        [conn.clientId, type, `⚠️ Agent run failed: ${err.message}`, JSON.stringify({ error: err.message })]
      ).catch(() => {});
    }
  }
}
