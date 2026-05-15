import type { Express, Request, Response } from "express";
import { storage } from "../storage";

function p(id: string | string[] | undefined): string {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) throw new Error("Missing ID");
  return s;
}

export function registerWebinarPollRoutes(app: Express, requireAuth: any) {
  app.get("/api/webinars/:id/polls", requireAuth, async (req: Request, res: Response) => {
    try {
      const polls = await storage.getWebinarPolls(p(req.params.id));
      res.json(polls);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/webinars/:id/polls", requireAuth, async (req: Request, res: Response) => {
    try {
      const { question, options, isActive, showResults } = req.body;
      const poll = await storage.createWebinarPoll({
        webinarId: p(req.params.id),
        question,
        options: options || [],
        isActive: isActive ?? false,
        showResults: showResults ?? false,
      });
      res.status(201).json(poll);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/webinars/:id/polls/:pollId", requireAuth, async (req: Request, res: Response) => {
    try {
      const poll = await storage.updateWebinarPoll(p(req.params.pollId), req.body);
      res.json(poll);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/webinars/:id/polls/:pollId", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWebinarPoll(p(req.params.pollId));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Record a poll vote (persists to DB)
  app.post("/api/webinars/:id/polls/:pollId/vote", async (req: Request, res: Response) => {
    try {
      const { viewerId, viewerName, optionIndex } = req.body;
      if (viewerId === undefined || optionIndex === undefined) {
        return res.status(400).json({ message: "viewerId and optionIndex required" });
      }
      const vote = await storage.createWebinarPollVote({
        pollId: p(req.params.pollId),
        webinarId: p(req.params.id),
        viewerId,
        viewerName: viewerName || "Anonymous",
        optionIndex,
      });
      res.status(201).json(vote);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get poll votes
  app.get("/api/webinars/:id/polls/:pollId/votes", async (req: Request, res: Response) => {
    try {
      const votes = await storage.getWebinarPollVotes(p(req.params.pollId));
      res.json(votes);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
