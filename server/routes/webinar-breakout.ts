import type { Express, Request, Response } from "express";
import { storage } from "../storage";

function p(id: string | string[] | undefined): string {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) throw new Error("Missing ID");
  return s;
}

export function registerWebinarBreakoutRoutes(app: Express, requireAuth: any) {
  // Get breakout rooms for a webinar
  app.get("/api/webinars/:id/breakout-rooms", requireAuth, async (req: Request, res: Response) => {
    try {
      const rooms = await storage.getWebinarBreakoutRooms(p(req.params.id));
      res.json(rooms);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Create breakout room
  app.post("/api/webinars/:id/breakout-rooms", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, topic, maxParticipants, assignmentType, duration } = req.body;
      if (!name) return res.status(400).json({ message: "Room name required" });
      const room = await storage.createWebinarBreakoutRoom({
        webinarId: p(req.params.id),
        name,
        topic: topic || null,
        maxParticipants: maxParticipants || null,
        assignmentType: assignmentType || "manual",
        isOpen: false,
        duration: duration || null,
      });
      res.status(201).json(room);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Update breakout room (open/close, rename)
  app.patch("/api/webinars/:id/breakout-rooms/:roomId", requireAuth, async (req: Request, res: Response) => {
    try {
      const room = await storage.updateWebinarBreakoutRoom(p(req.params.roomId), req.body);
      res.json(room);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Delete breakout room
  app.delete("/api/webinars/:id/breakout-rooms/:roomId", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWebinarBreakoutRoom(p(req.params.roomId));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Open all rooms (start breakout session)
  app.post("/api/webinars/:id/breakout-rooms/open-all", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.openAllBreakoutRooms(p(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Close all rooms (bring everyone back)
  app.post("/api/webinars/:id/breakout-rooms/close-all", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.closeAllBreakoutRooms(p(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Assign participant to room
  app.post("/api/webinars/:id/breakout-rooms/:roomId/assign", async (req: Request, res: Response) => {
    try {
      const { viewerId, viewerName } = req.body;
      if (!viewerId || !viewerName) return res.status(400).json({ message: "viewerId and viewerName required" });
      const participant = await storage.assignBreakoutParticipant({
        roomId: p(req.params.roomId),
        viewerId,
        viewerName,
      });
      res.status(201).json(participant);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Remove participant from room
  app.post("/api/webinars/:id/breakout-rooms/:roomId/leave", async (req: Request, res: Response) => {
    try {
      const { viewerId } = req.body;
      await storage.removeBreakoutParticipant(p(req.params.roomId), viewerId);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get participants in a room
  app.get("/api/webinars/:id/breakout-rooms/:roomId/participants", async (req: Request, res: Response) => {
    try {
      const participants = await storage.getBreakoutParticipants(p(req.params.roomId));
      res.json(participants);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Auto-assign all attendees to rooms
  app.post("/api/webinars/:id/breakout-rooms/auto-assign", requireAuth, async (req: Request, res: Response) => {
    try {
      const { viewerIds } = req.body; // Array of {viewerId, viewerName}
      const rooms = await storage.getWebinarBreakoutRooms(p(req.params.id));
      if (!rooms.length) return res.status(400).json({ message: "No breakout rooms created" });

      const assignments: any[] = [];
      for (let i = 0; i < (viewerIds || []).length; i++) {
        const room = rooms[i % rooms.length];
        const participant = await storage.assignBreakoutParticipant({
          roomId: room.id,
          viewerId: viewerIds[i].viewerId,
          viewerName: viewerIds[i].viewerName,
        });
        assignments.push(participant);
      }
      res.json(assignments);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
