import type { Express, Request, Response } from "express";
import { storage } from "../storage";

function p(id: string | undefined): string {
  if (!id) throw new Error("Missing ID");
  return id;
}
function pn(id: string | undefined): number {
  if (!id) throw new Error("Missing ID");
  const n = parseInt(id, 10);
  if (isNaN(n)) throw new Error("Invalid numeric ID");
  return n;
}

export function registerVideoHostingRoutes(app: Express, requireAuth: any) {

  // ── Video Collections ──────────────────────────────────────────────────────
  app.get("/api/video-collections", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const cols = await storage.getVideoCollections(user.id);
      res.json(cols);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/video-collections", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const col = await storage.createVideoCollection({ ...req.body, userId: user.id });
      res.status(201).json(col);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/video-collections/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const col = await storage.updateVideoCollection(pn(req.params.id), req.body);
      res.json(col);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/video-collections/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteVideoCollection(pn(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/video-collections/:id/items", requireAuth, async (req: Request, res: Response) => {
    try {
      const items = await storage.getVideoCollectionItems(pn(req.params.id));
      res.json(items);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/video-collections/:id/items", requireAuth, async (req: Request, res: Response) => {
    try {
      const { videoEventId, sortOrder } = req.body;
      const item = await storage.addVideoToCollection(pn(req.params.id), videoEventId, sortOrder ?? 0);
      res.status(201).json(item);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/video-collection-items/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.removeVideoFromCollection(pn(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Video Chapters ─────────────────────────────────────────────────────────
  app.get("/api/video-events/:id/chapters", requireAuth, async (req: Request, res: Response) => {
    try {
      const chapters = await storage.getVideoChapters(p(req.params.id));
      res.json(chapters);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/video-events/:id/chapters", requireAuth, async (req: Request, res: Response) => {
    try {
      const chapter = await storage.createVideoChapter({ ...req.body, videoEventId: p(req.params.id) });
      res.status(201).json(chapter);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/video-chapters/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const chapter = await storage.updateVideoChapter(pn(req.params.id), req.body);
      res.json(chapter);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/video-chapters/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteVideoChapter(pn(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Video CTAs ─────────────────────────────────────────────────────────────
  app.get("/api/video-events/:id/ctas", requireAuth, async (req: Request, res: Response) => {
    try {
      const ctas = await storage.getVideoCtas(p(req.params.id));
      res.json(ctas);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/video-events/:id/ctas", requireAuth, async (req: Request, res: Response) => {
    try {
      const cta = await storage.createVideoCta({ ...req.body, videoEventId: p(req.params.id) });
      res.status(201).json(cta);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/video-ctas/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const cta = await storage.updateVideoCta(pn(req.params.id), req.body);
      res.json(cta);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/video-ctas/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteVideoCta(pn(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Public: track CTA click
  app.post("/api/video-ctas/:id/click", async (req: Request, res: Response) => {
    try {
      await storage.incrementCtaClicks(pn(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Video Viewer Sessions ──────────────────────────────────────────────────
  app.get("/api/video-events/:id/viewers", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessions = await storage.getVideoViewerSessions(p(req.params.id));
      res.json(sessions);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Public: record / update viewer session
  app.post("/api/video-viewer-sessions", async (req: Request, res: Response) => {
    try {
      const session = await storage.createViewerSession(req.body);
      res.status(201).json(session);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/video-viewer-sessions/:id", async (req: Request, res: Response) => {
    try {
      await storage.updateViewerSession(pn(req.params.id), req.body);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Video Settings (protection, branding, player config) ──────────────────
  app.patch("/api/video-events/:id/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateVideoEvent(p(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
