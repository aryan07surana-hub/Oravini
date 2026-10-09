import type { Express, Request, Response } from "express";
import { db } from "../storage";
import { userActivityEvents } from "../../shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

/* ─── Human-readable feature labels ─── */
const FEATURE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/ai-ideas": "AI Content Ideas",
  "/competitor-study": "Competitor Study",
  "/carousel-studio": "Carousel Studio",
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
