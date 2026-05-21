import type { Express, Request, Response } from "express";
import { storage } from "../storage";

function p(id: string | string[] | undefined): string {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) throw new Error("Missing ID");
  return s;
}

export function registerWebinarBackstageRoutes(app: Express, requireAuth: any) {
  // Get backstage messages
  app.get("/api/webinars/:id/backstage/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getWebinarBackstageMessages(p(req.params.id));
      res.json(messages);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Send backstage message
  app.post("/api/webinars/:id/backstage/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const msg = await storage.createBackstageMessage({
        webinarId: p(req.params.id),
        senderName: user.name || "Host",
        senderRole: "host",
        message,
      });
      res.status(201).json(msg);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Start practice session
  app.post("/api/webinars/:id/practice/start", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const session = await storage.startPracticeSession({
        webinarId: p(req.params.id),
        startedBy: user.id,
      });
      res.status(201).json(session);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // End practice session
  app.post("/api/webinars/:id/practice/end", requireAuth, async (req: Request, res: Response) => {
    try {
      const { notes } = req.body;
      const session = await storage.endPracticeSession(p(req.params.id), notes);
      res.json(session);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get practice session status
  app.get("/api/webinars/:id/practice", requireAuth, async (req: Request, res: Response) => {
    try {
      const session = await storage.getActivePracticeSession(p(req.params.id));
      res.json(session || null);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get practice session history
  app.get("/api/webinars/:id/practice/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessions = await storage.getPracticeSessionHistory(p(req.params.id));
      res.json(sessions);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
