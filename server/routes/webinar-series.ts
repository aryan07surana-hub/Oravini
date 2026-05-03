import type { Express, Request, Response } from "express";
import { storage } from "../storage";

function p(id: string | undefined): string {
  if (!id) throw new Error("Missing ID");
  return id;
}

export function registerWebinarSeriesRoutes(app: Express, requireAuth: any) {
  app.get("/api/webinar-series", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const series = await storage.getWebinarSeries(user.id);
      res.json(series);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/webinar-series", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const series = await storage.createWebinarSeries({ ...req.body, userId: user.id });
      res.status(201).json(series);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/webinar-series/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const series = await storage.updateWebinarSeries(p(req.params.id), req.body);
      res.json(series);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/webinar-series/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWebinarSeries(p(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
