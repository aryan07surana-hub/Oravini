import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import crypto from "crypto";

function p(id: string | string[] | undefined): string {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) throw new Error("Missing ID");
  return s;
}

export function registerWebinarPanelistRoutes(app: Express, requireAuth: any) {
  // Get all panelists for a webinar
  app.get("/api/webinars/:id/panelists", requireAuth, async (req: Request, res: Response) => {
    try {
      const panelists = await storage.getWebinarPanelists(p(req.params.id));
      res.json(panelists);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Invite a panelist
  app.post("/api/webinars/:id/panelists", requireAuth, async (req: Request, res: Response) => {
    try {
      const { email, name, role, canShareScreen, canChat, canManagePolls, canMuteOthers, canRemoveAttendees } = req.body;
      if (!email || !name) return res.status(400).json({ message: "Email and name required" });
      const inviteToken = crypto.randomBytes(32).toString("hex");
      const panelist = await storage.createWebinarPanelist({
        webinarId: p(req.params.id),
        email,
        name,
        role: role || "panelist",
        inviteToken,
        status: "invited",
        canShareScreen: canShareScreen ?? true,
        canChat: canChat ?? true,
        canManagePolls: canManagePolls ?? false,
        canMuteOthers: canMuteOthers ?? false,
        canRemoveAttendees: canRemoveAttendees ?? false,
      });
      res.status(201).json(panelist);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Update panelist permissions
  app.patch("/api/webinars/:id/panelists/:panelistId", requireAuth, async (req: Request, res: Response) => {
    try {
      const panelist = await storage.updateWebinarPanelist(p(req.params.panelistId), req.body);
      res.json(panelist);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Remove panelist
  app.delete("/api/webinars/:id/panelists/:panelistId", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWebinarPanelist(p(req.params.panelistId));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Accept panelist invite (public - uses token)
  app.post("/api/webinar-invite/:token/accept", async (req: Request, res: Response) => {
    try {
      const panelist = await storage.acceptWebinarPanelistInvite(p(req.params.token));
      if (!panelist) return res.status(404).json({ message: "Invalid invite" });
      res.json(panelist);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get panelist invite details (public - for invite page)
  app.get("/api/webinar-invite/:token", async (req: Request, res: Response) => {
    try {
      const invite = await storage.getWebinarPanelistByToken(p(req.params.token));
      if (!invite) return res.status(404).json({ message: "Invalid invite" });
      res.json(invite);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Promote attendee to panelist (raise-to-speak)
  app.post("/api/webinars/:id/promote-attendee", requireAuth, async (req: Request, res: Response) => {
    try {
      const { viewerId, viewerName, viewerEmail } = req.body;
      const inviteToken = crypto.randomBytes(32).toString("hex");
      const panelist = await storage.createWebinarPanelist({
        webinarId: p(req.params.id),
        email: viewerEmail || `${viewerId}@viewer.local`,
        name: viewerName || "Attendee",
        role: "panelist",
        inviteToken,
        status: "joined",
        canShareScreen: false,
        canChat: true,
        canManagePolls: false,
        canMuteOthers: false,
        canRemoveAttendees: false,
      });
      res.status(201).json(panelist);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
