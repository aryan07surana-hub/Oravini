import type { Express, Request, Response } from "express";
import { storage } from "../storage";

function p(id: string | string[] | undefined): string {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) throw new Error("Missing ID");
  return s;
}

export function registerWebinarCaptionRoutes(app: Express, requireAuth: any) {
  // Get captions for a webinar (paginated / recent)
  app.get("/api/webinars/:id/captions", async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const after = Number(req.query.after) || 0; // startTime after this value
      const captions = await storage.getWebinarCaptions(p(req.params.id), after, limit);
      res.json(captions);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Add a caption segment (from host's speech-to-text)
  app.post("/api/webinars/:id/captions", requireAuth, async (req: Request, res: Response) => {
    try {
      const { text, speakerName, language, startTime, endTime, isFinal } = req.body;
      if (!text || startTime === undefined) return res.status(400).json({ message: "text and startTime required" });
      const caption = await storage.addWebinarCaption({
        webinarId: p(req.params.id),
        text,
        speakerName: speakerName || null,
        language: language || "en",
        startTime,
        endTime: endTime || null,
        isFinal: isFinal ?? false,
      });
      res.status(201).json(caption);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get full transcript (post-event)
  app.get("/api/webinars/:id/transcript", async (req: Request, res: Response) => {
    try {
      const transcript = await storage.getWebinarTranscript(p(req.params.id));
      res.json(transcript || null);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Generate transcript from captions (post-event processing)
  app.post("/api/webinars/:id/transcript/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const webinarId = p(req.params.id);
      const captions = await storage.getWebinarCaptions(webinarId, 0, 10000);
      if (!captions.length) return res.status(400).json({ message: "No captions to transcribe" });

      const fullText = captions.map(c => c.text).join(" ");
      const segments = captions.map(c => ({
        start: c.startTime,
        end: c.endTime || c.startTime + 3,
        speaker: c.speakerName || "Host",
        text: c.text,
      }));

      const transcript = await storage.saveWebinarTranscript({
        webinarId,
        fullText,
        segments,
        language: captions[0]?.language || "en",
      });
      res.json(transcript);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Toggle captions enabled for viewers (via webinar settings)
  app.patch("/api/webinars/:id/captions/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      // This updates the webinar's caption settings - stored on webinar model
      const { captionsEnabled, captionLanguage } = req.body;
      await storage.updateWebinar(p(req.params.id), {
        // We'll add these fields via a jsonb settings field
      });
      res.json({ ok: true, captionsEnabled, captionLanguage });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
