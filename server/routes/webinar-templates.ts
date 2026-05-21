import type { Express, Request, Response } from "express";
import { storage } from "../storage";

function p(id: string | string[] | undefined): string {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) throw new Error("Missing ID");
  return s;
}

export function registerWebinarTemplateRoutes(app: Express, requireAuth: any) {
  // Get all templates for a user
  app.get("/api/webinar-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const templates = await storage.getWebinarTemplates(user.id);
      res.json(templates);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Create template from existing webinar
  app.post("/api/webinar-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { name, description, config, thumbnailUrl } = req.body;
      if (!name || !config) return res.status(400).json({ message: "Name and config required" });
      const template = await storage.createWebinarTemplate({
        userId: user.id,
        name,
        description: description || null,
        config,
        thumbnailUrl: thumbnailUrl || null,
      });
      res.status(201).json(template);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Save webinar as template
  app.post("/api/webinars/:id/save-as-template", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const webinar = await storage.getWebinar(p(req.params.id));
      if (!webinar) return res.status(404).json({ message: "Webinar not found" });

      const { name } = req.body;
      const config = {
        title: webinar.title,
        description: webinar.description,
        durationMinutes: webinar.durationMinutes,
        webinarType: webinar.webinarType,
        videoQuality: webinar.videoQuality,
        maxAttendees: webinar.maxAttendees,
        offerUrl: webinar.offerUrl,
        offerTitle: webinar.offerTitle,
        presenterName: webinar.presenterName,
        isPublic: webinar.isPublic,
        waitingRoomVideoUrl: webinar.waitingRoomVideoUrl,
        waitingRoomMessage: webinar.waitingRoomMessage,
      };

      const template = await storage.createWebinarTemplate({
        userId: user.id,
        name: name || `Template: ${webinar.title}`,
        description: null,
        config,
        thumbnailUrl: webinar.thumbnailUrl || null,
      });
      res.status(201).json(template);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Delete template
  app.delete("/api/webinar-templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWebinarTemplate(p(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
