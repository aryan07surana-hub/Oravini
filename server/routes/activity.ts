import type { Express, Request, Response } from "express";
import { db } from "../storage";
import { userActivityEvents } from "../../shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

async function groq(messages: { role: string; content: string }[], maxTokens = 1200) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature: 0.6 }),
  });
  const data = await r.json() as any;
  return data.choices[0].message.content as string;
}

/* ─── Human-readable feature labels ─── */
const FEATURE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/ai-ideas": "AI Content Ideas",
  "/ai-coach": "AI Coach",
  "/niche-intelligence": "Niche Intelligence",
  "/knowledge-graph": "Knowledge Graph",
  "/vault": "Cortex Vault",
  "/competitor-study": "Competitor Study",
  "/carousel-studio": "Carousel Studio",
  "/content-intelligence": "Content Intelligence",
  "/analytics": "Analytics",
  "/dm-automation": "DM Automation",
  "/dm-hub": "DM Hub",
  "/email-marketing": "Email Marketing",
  "/sms-marketing": "SMS Marketing",
  "/dialer": "Sales Dialer",
  "/scheduling": "Scheduling",
  "/webinar": "Webinar",
  "/crm": "CRM",
  "/bio-generator": "Bio Generator",
  "/video-editor": "Video Editor",
  "/brand-kit": "Brand Kit",
  "/community": "Community",
  "/settings": "Settings",
  "/ai-design": "AI Design",
  "/board-builder": "Board Builder",
};

export function registerActivityRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: any) => void
) {
  /* ─── Fire-and-forget event track ─── */
  app.post("/api/activity/track", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { eventType, feature, action, metadata, sessionId } = req.body;

      if (!eventType) return res.status(400).json({ message: "eventType required" });

      await db.insert(userActivityEvents).values({
        userId,
        eventType,
        feature: feature ?? null,
        action: action ?? null,
        metadata: metadata ?? null,
        sessionId: sessionId ?? null,
      });

      res.json({ ok: true });
    } catch (err: any) {
      // non-critical — always 200 so client doesn't retry
      console.error("[activity/track]", err?.message);
      res.json({ ok: false });
    }
  });

  /* ─── Get user activity summary ─── */
  app.get("/api/activity/summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const days = Number(req.query.days) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await db
        .select()
        .from(userActivityEvents)
        .where(and(eq(userActivityEvents.userId, userId), gte(userActivityEvents.createdAt, since)))
        .orderBy(desc(userActivityEvents.createdAt))
        .limit(500);

      // Aggregate by feature
      const featureCounts: Record<string, number> = {};
      const actionCounts: Record<string, number> = {};
      const dailyActivity: Record<string, number> = {};

      for (const e of events) {
        if (e.feature) featureCounts[e.feature] = (featureCounts[e.feature] ?? 0) + 1;
        if (e.action) actionCounts[e.action] = (actionCounts[e.action] ?? 0) + 1;
        const day = e.createdAt!.toISOString().split("T")[0];
        dailyActivity[day] = (dailyActivity[day] ?? 0) + 1;
      }

      const topFeatures = Object.entries(featureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([feature, count]) => ({ feature, label: FEATURE_LABELS[feature] ?? feature, count }));

      const topActions = Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([action, count]) => ({ action, count }));

      const uniqueFeatures = Object.keys(featureCounts).length;
      const totalEvents = events.length;
      const activeDays = Object.keys(dailyActivity).length;

      res.json({
        totalEvents,
        uniqueFeatures,
        activeDays,
        topFeatures,
        topActions,
        dailyActivity,
        recentEvents: events.slice(0, 20).map(e => ({
          eventType: e.eventType,
          feature: e.feature,
          action: e.action,
          createdAt: e.createdAt,
        })),
      });
    } catch (err: any) {
      console.error("[activity/summary]", err);
      res.status(500).json({ message: err.message });
    }
  });

  /* ─── Generate vault note from activity ─── */
  app.post("/api/activity/vault-synthesis", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const days = Number(req.body.days) || 14;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await db
        .select()
        .from(userActivityEvents)
        .where(and(eq(userActivityEvents.userId, userId), gte(userActivityEvents.createdAt, since)))
        .orderBy(desc(userActivityEvents.createdAt))
        .limit(400);

      if (!events.length) {
        return res.json({
          title: `Behavior Insights — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          content: `# Behavior Insights\n\nNo activity recorded in the last ${days} days.\n`,
        });
      }

      // Build frequency map
      const featureCounts: Record<string, number> = {};
      const actionCounts: Record<string, number> = {};
      const hourCounts: Record<number, number> = {};
      const sessionIds = new Set<string>();

      for (const e of events) {
        if (e.feature) featureCounts[e.feature] = (featureCounts[e.feature] ?? 0) + 1;
        if (e.action) actionCounts[e.action] = (actionCounts[e.action] ?? 0) + 1;
        if (e.createdAt) hourCounts[e.createdAt.getHours()] = (hourCounts[e.createdAt.getHours()] ?? 0) + 1;
        if (e.sessionId) sessionIds.add(e.sessionId);
      }

      const topFeatures = Object.entries(featureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([f, c]) => `${FEATURE_LABELS[f] ?? f}: ${c} times`);

      const peakHour = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
      const peakHourLabel = peakHour
        ? `${Number(peakHour[0]) > 12 ? Number(peakHour[0]) - 12 + "pm" : peakHour[0] + "am"}`
        : "unknown";

      const unusedFeatures = Object.values(FEATURE_LABELS)
        .filter(label => !Object.entries(featureCounts).some(([f]) => (FEATURE_LABELS[f] ?? f) === label))
        .slice(0, 6);

      const prompt = `You are analyzing a content creator's behavior on the Oravini platform to generate strategic insights for their Cortex second brain vault.

ACTIVITY DATA (last ${days} days):
- Total events: ${events.length}
- Sessions: ${sessionIds.size}
- Active days: ${new Set(events.map(e => e.createdAt?.toISOString().split("T")[0])).size}
- Peak usage hour: ${peakHourLabel}

TOP FEATURES USED:
${topFeatures.join("\n")}

TOP ACTIONS:
${Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a, c]) => `${a}: ${c}`).join("\n")}

UNUSED FEATURES (opportunities):
${unusedFeatures.join(", ")}

Write a strategic vault note in Markdown that:
1. **Behavior Patterns** — what does their usage tell us about their content strategy focus?
2. **Strengths** — tools they're mastering
3. **Blind Spots** — valuable features they're not using and WHY they should
4. **Peak Performance Window** — their best time to create
5. **This Week's Priority** — one specific action to take based on behavior
6. **Cortex Insight** — a sharp, non-obvious observation about their creative habits

Be specific, insightful, and actionable. Reference actual tool names. This note should feel like a smart mentor who watched them work.`;

      const content = await groq([{ role: "user", content: prompt }], 1600);
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      res.json({
        title: `Behavior Insights — ${today}`,
        folder: "Daily",
        content,
      });
    } catch (err: any) {
      console.error("[activity/vault-synthesis]", err);
      res.status(500).json({ message: err.message });
    }
  });

  /* ─── Platform intelligence for admins — aggregate all user behavior ─── */
  app.get("/api/activity/platform-intelligence", requireAuth, async (req: Request, res: Response) => {
    try {
      if ((req.user as any).role !== "admin") return res.status(403).json({ message: "Forbidden" });

      const days = Number(req.query.days) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await db
        .select()
        .from(userActivityEvents)
        .where(gte(userActivityEvents.createdAt, since))
        .orderBy(desc(userActivityEvents.createdAt))
        .limit(5000);

      const featureCounts: Record<string, { views: number; users: Set<string> }> = {};
      const actionCounts: Record<string, number> = {};

      for (const e of events) {
        if (e.feature) {
          if (!featureCounts[e.feature]) featureCounts[e.feature] = { views: 0, users: new Set() };
          featureCounts[e.feature].views++;
          featureCounts[e.feature].users.add(e.userId);
        }
        if (e.action) actionCounts[e.action] = (actionCounts[e.action] ?? 0) + 1;
      }

      const featureStats = Object.entries(featureCounts)
        .sort((a, b) => b[1].views - a[1].views)
        .map(([feature, { views, users }]) => ({
          feature,
          label: FEATURE_LABELS[feature] ?? feature,
          views,
          uniqueUsers: users.size,
        }));

      res.json({
        totalEvents: events.length,
        uniqueUsers: new Set(events.map(e => e.userId)).size,
        featureStats,
        topActions: Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 20),
      });
    } catch (err: any) {
      console.error("[activity/platform-intelligence]", err);
      res.status(500).json({ message: err.message });
    }
  });
}
