import type { Express, Request, Response } from "express";
import { storage } from "../storage";

function p(id: string | string[] | undefined): string {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) throw new Error("Missing ID");
  return s;
}

export function registerWebinarAdvancedRoutes(app: Express, requireAuth: any) {
  // ── Stream Destinations (YouTube Live, Facebook Live, etc.) ──────────────
  app.get("/api/webinars/:id/stream-destinations", requireAuth, async (req: Request, res: Response) => {
    try {
      const destinations = await storage.getWebinarStreamDestinations(p(req.params.id));
      res.json(destinations);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/webinars/:id/stream-destinations", requireAuth, async (req: Request, res: Response) => {
    try {
      const { platform, rtmpUrl, streamKey, label } = req.body;
      if (!platform || !rtmpUrl || !streamKey) {
        return res.status(400).json({ message: "platform, rtmpUrl, and streamKey required" });
      }
      const dest = await storage.createWebinarStreamDestination({
        webinarId: p(req.params.id),
        platform,
        rtmpUrl,
        streamKey,
        label: label || null,
        isActive: true,
      });
      res.status(201).json(dest);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/webinars/:id/stream-destinations/:destId", requireAuth, async (req: Request, res: Response) => {
    try {
      const dest = await storage.updateWebinarStreamDestination(p(req.params.destId), req.body);
      res.json(dest);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/webinars/:id/stream-destinations/:destId", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWebinarStreamDestination(p(req.params.destId));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Resource/File Sharing ───────────────────────────────────────────────────
  app.get("/api/webinars/:id/resources", async (req: Request, res: Response) => {
    try {
      const resources = await storage.getWebinarResources(p(req.params.id));
      res.json(resources);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/webinars/:id/resources", requireAuth, async (req: Request, res: Response) => {
    try {
      const { title, url, type } = req.body;
      if (!title || !url) return res.status(400).json({ message: "title and url required" });
      const resource = await storage.createWebinarResource({
        webinarId: p(req.params.id),
        title,
        url,
        type: type || "link",
      });
      res.status(201).json(resource);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/webinars/:id/resources/:resourceId/push", requireAuth, async (req: Request, res: Response) => {
    try {
      const resource = await storage.pushWebinarResource(p(req.params.resourceId));
      res.json(resource);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/webinars/:id/resources/:resourceId", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWebinarResource(p(req.params.resourceId));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Attendee Engagement Scores ──────────────────────────────────────────────
  app.get("/api/webinars/:id/engagement-scores", requireAuth, async (req: Request, res: Response) => {
    try {
      const scores = await storage.getWebinarAttendeeScores(p(req.params.id));
      res.json(scores);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Update engagement score (called from websocket events or batch)
  app.post("/api/webinars/:id/engagement-scores/update", async (req: Request, res: Response) => {
    try {
      const { viewerId, viewerName, viewerEmail, event } = req.body;
      if (!viewerId || !event) return res.status(400).json({ message: "viewerId and event required" });

      const score = await storage.updateAttendeeEngagement(p(req.params.id), {
        viewerId,
        viewerName: viewerName || "Anonymous",
        viewerEmail: viewerEmail || null,
        event, // chat | poll | reaction | cta_click | question | hand_raise
      });
      res.json(score);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Compute final engagement scores for a completed webinar
  app.post("/api/webinars/:id/engagement-scores/compute", requireAuth, async (req: Request, res: Response) => {
    try {
      const scores = await storage.computeWebinarEngagementScores(p(req.params.id));
      res.json(scores);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Advanced Analytics / Reports ────────────────────────────────────────────
  app.get("/api/webinars/:id/report", requireAuth, async (req: Request, res: Response) => {
    try {
      const webinarId = p(req.params.id);
      const webinar = await storage.getWebinar(webinarId);
      if (!webinar) return res.status(404).json({ message: "Not found" });

      const registrations = await storage.getWebinarRegistrations(webinarId);
      const analytics = await storage.getWebinarAnalytics(webinarId);
      const scores = await storage.getWebinarAttendeeScores(webinarId);
      const polls = await storage.getWebinarPolls(webinarId);

      const registered = registrations.length;
      const attended = scores.length;
      const showRate = registered > 0 ? (attended / registered) * 100 : 0;
      const avgEngagement = scores.length > 0
        ? scores.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / scores.length
        : 0;
      const avgWatchDuration = scores.length > 0
        ? scores.reduce((sum, s) => sum + (s.watchDuration || 0), 0) / scores.length
        : 0;
      const completionRate = scores.length > 0
        ? (scores.filter(s => s.attendedFullDuration).length / scores.length) * 100
        : 0;

      // Engagement breakdown
      const totalChats = scores.reduce((s, a) => s + (a.chatMessages || 0), 0);
      const totalQuestions = scores.reduce((s, a) => s + (a.questionsAsked || 0), 0);
      const totalPollVotes = scores.reduce((s, a) => s + (a.pollsVoted || 0), 0);
      const totalReactions = scores.reduce((s, a) => s + (a.reactionsCount || 0), 0);
      const totalCtaClicks = scores.reduce((s, a) => s + (a.ctaClicks || 0), 0);

      // Top engaged attendees
      const topAttendees = [...scores]
        .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
        .slice(0, 10);

      res.json({
        webinar,
        summary: {
          registered,
          attended,
          showRate: Math.round(showRate * 10) / 10,
          avgEngagement: Math.round(avgEngagement * 10) / 10,
          avgWatchDuration: Math.round(avgWatchDuration),
          completionRate: Math.round(completionRate * 10) / 10,
          peakViewers: webinar.peakViewers || analytics?.peakConcurrent || 0,
          totalDuration: webinar.durationMinutes,
        },
        engagement: {
          totalChats,
          totalQuestions,
          totalPollVotes,
          totalReactions,
          totalCtaClicks,
        },
        topAttendees,
        polls: polls.length,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
