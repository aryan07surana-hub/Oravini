import type { Express, Request, Response } from "express";
import { storage } from "../storage";

function p(id: string | string[] | undefined): string {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) throw new Error("Missing ID");
  return s;
}

export function registerWebinarSurveyRoutes(app: Express, requireAuth: any) {
  // Get survey for a webinar
  app.get("/api/webinars/:id/survey", requireAuth, async (req: Request, res: Response) => {
    try {
      const survey = await storage.getWebinarSurvey(p(req.params.id));
      res.json(survey || null);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Create/update survey
  app.post("/api/webinars/:id/survey", requireAuth, async (req: Request, res: Response) => {
    try {
      const { title, questions, isActive } = req.body;
      if (!questions || !questions.length) return res.status(400).json({ message: "At least one question required" });
      const survey = await storage.upsertWebinarSurvey({
        webinarId: p(req.params.id),
        title: title || "How was the webinar?",
        questions,
        isActive: isActive ?? true,
      });
      res.status(201).json(survey);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Public: Get survey for viewers (after webinar ends)
  app.get("/api/webinars/public/:code/survey", async (req: Request, res: Response) => {
    try {
      const webinar = await storage.getWebinarByCode(p(req.params.code));
      if (!webinar) return res.status(404).json({ message: "Not found" });
      const survey = await storage.getWebinarSurvey(webinar.id);
      if (!survey || !survey.isActive) return res.json(null);
      res.json(survey);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Public: Submit survey response
  app.post("/api/webinars/public/:code/survey/respond", async (req: Request, res: Response) => {
    try {
      const webinar = await storage.getWebinarByCode(p(req.params.code));
      if (!webinar) return res.status(404).json({ message: "Not found" });
      const survey = await storage.getWebinarSurvey(webinar.id);
      if (!survey) return res.status(404).json({ message: "No survey found" });

      const { viewerId, viewerName, viewerEmail, answers, rating } = req.body;
      const response = await storage.submitWebinarSurveyResponse({
        surveyId: survey.id,
        viewerId: viewerId || "anonymous",
        viewerName,
        viewerEmail,
        answers: answers || {},
        rating,
      });
      res.status(201).json(response);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get all survey responses
  app.get("/api/webinars/:id/survey/responses", requireAuth, async (req: Request, res: Response) => {
    try {
      const survey = await storage.getWebinarSurvey(p(req.params.id));
      if (!survey) return res.json([]);
      const responses = await storage.getWebinarSurveyResponses(survey.id);
      res.json(responses);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
