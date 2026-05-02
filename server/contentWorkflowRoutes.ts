/**
 * CONTENT WORKFLOW API ROUTES
 */

import { Router } from "express";
import { storage } from "./storage";
import { generateContentWorkflow, analyzeContentBatch } from "./contentWorkflow";
import { analyzeBrandVoice, processPerformanceFeedback } from "./contentIntelligence";

const router = Router();

// ── GENERATE CONTENT WORKFLOW ──────────────────────────────────────────────
router.post("/api/content-workflow/generate", async (req, res) => {
  try {
    const { period, startDate, days, platform, niche, goal, strategy, postsPerDay } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const workflow = await generateContentWorkflow({
      userId,
      period,
      startDate,
      days,
      platform,
      niche,
      goal,
      strategy,
      postsPerDay,
    });

    // Save to database
    const calendar = await storage.createContentCalendar({
      userId,
      month: workflow.startDate.substring(0, 7),
      niche,
      platform,
      goal,
      strategy: workflow.strategy,
      posts: workflow.posts,
      status: "draft",
    });

    res.json({ success: true, workflow, calendarId: calendar.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── ANALYZE CONTENT BATCH ──────────────────────────────────────────────────
router.post("/api/content-workflow/analyze-batch", async (req, res) => {
  try {
    const { posts, niche } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const analysis = await analyzeContentBatch({ userId, posts, niche });

    res.json({ success: true, analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── BULK PERFORMANCE FEEDBACK ──────────────────────────────────────────────
router.post("/api/content-workflow/bulk-feedback", async (req, res) => {
  try {
    const { posts, niche } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const results = [];

    for (const post of posts) {
      await processPerformanceFeedback(
        userId,
        post.id,
        post.views,
        post.likes,
        post.comments,
        post.saves,
        niche
      );
      results.push({ postId: post.id, processed: true });
    }

    res.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── ANALYZE BRAND VOICE ────────────────────────────────────────────────────
router.post("/api/brand-voice/analyze", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Get user's recent posts
    const posts = await storage.getContentPosts(userId, { limit: 20 });

    if (posts.length < 5) {
      return res.status(400).json({ error: "Need at least 5 posts to analyze brand voice" });
    }

    const voiceData = await analyzeBrandVoice(userId, posts);

    // Save to database
    const existing = await storage.getBrandVoiceProfile(userId);
    if (existing) {
      await storage.updateBrandVoiceProfile(userId, voiceData);
    } else {
      await storage.createBrandVoiceProfile({ userId, ...voiceData });
    }

    res.json({ success: true, brandVoice: voiceData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET BRAND VOICE ────────────────────────────────────────────────────────
router.get("/api/brand-voice", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const brandVoice = await storage.getBrandVoiceProfile(userId);

    if (!brandVoice) {
      return res.status(404).json({ error: "Brand voice not analyzed yet" });
    }

    res.json({ success: true, brandVoice });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET WINNING PATTERNS ───────────────────────────────────────────────────
router.get("/api/winning-patterns", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { platform, funnelStage, limit = 20 } = req.query;

    const patterns = await storage.getWinningPatterns(userId, {
      platform: platform as any,
      funnelStage: funnelStage as any,
      limit: Number(limit),
    });

    res.json({ success: true, patterns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET HOOK LIBRARY ───────────────────────────────────────────────────────
router.get("/api/hook-library", async (req, res) => {
  try {
    const { platform, niche, hookType, limit = 50 } = req.query;

    const hooks = await storage.getHookLibrary({
      platform: platform as any,
      niche: niche as string,
      hookType: hookType as any,
      limit: Number(limit),
    });

    res.json({ success: true, hooks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET CONTENT CALENDARS ──────────────────────────────────────────────────
router.get("/api/content-calendars", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const calendars = await storage.getContentCalendars(userId);

    res.json({ success: true, calendars });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET SINGLE CALENDAR ────────────────────────────────────────────────────
router.get("/api/content-calendars/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const calendar = await storage.getContentCalendar(req.params.id);

    if (!calendar || calendar.userId !== userId) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    res.json({ success: true, calendar });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── UPDATE CALENDAR ────────────────────────────────────────────────────────
router.patch("/api/content-calendars/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const calendar = await storage.getContentCalendar(req.params.id);

    if (!calendar || calendar.userId !== userId) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    const updated = await storage.updateContentCalendar(req.params.id, req.body);

    res.json({ success: true, calendar: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE CALENDAR ────────────────────────────────────────────────────────
router.delete("/api/content-calendars/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const calendar = await storage.getContentCalendar(req.params.id);

    if (!calendar || calendar.userId !== userId) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    await storage.deleteContentCalendar(req.params.id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET FUNNEL SKILLS ──────────────────────────────────────────────────────
router.get("/api/funnel-skills", async (req, res) => {
  try {
    const { FUNNEL_SKILLS } = await import("./contentWorkflow");
    res.json({ success: true, skills: FUNNEL_SKILLS });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET CONTENT STRATEGIES ─────────────────────────────────────────────────
router.get("/api/content-strategies", async (req, res) => {
  try {
    const { FUNNEL_DISTRIBUTION, CONTENT_MIX } = await import("./contentWorkflow");
    res.json({
      success: true,
      strategies: {
        funnelDistribution: FUNNEL_DISTRIBUTION,
        contentMix: CONTENT_MIX,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
