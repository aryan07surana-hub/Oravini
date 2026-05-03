/**
 * CONTENT WORKFLOW API ROUTES
 */

import { Router } from "express";
import { storage } from "./storage";
import { generateContentWorkflow, analyzeContentBatch } from "./contentWorkflow";
import { 
  analyzeBrandVoice, 
  processPerformanceFeedback,
  getViralHookSuggestions,
  getStructureSuggestions,
  getCTASuggestions,
  getNicheInsights,
  getViralFormulas,
  getPlatformBestPractices,
  generateSmartSuggestions,
  classifyHookType,
  extractHook,
  analyzeContentStructure,
  calculateViralScore,
  detectViralPatterns,
  calculateContentScore,
  getViralBreakdowns,
  searchViralBreakdowns
} from "./contentIntelligence";

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

// ── SMART CONTENT ANALYSIS (ENHANCED) ──────────────────────────────────────
router.post("/api/intelligence/analyze", async (req, res) => {
  try {
    const { content, platform, niche, funnelStage } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const suggestions = generateSmartSuggestions(
      content,
      platform || "instagram",
      niche,
      funnelStage || "top"
    );

    res.json({ success: true, ...suggestions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET VIRAL HOOK SUGGESTIONS ─────────────────────────────────────────────
router.get("/api/intelligence/hooks", async (req, res) => {
  try {
    const { hookType, platform, niche } = req.query;
    
    const hooks = getViralHookSuggestions(
      hookType as string || "curiosity",
      platform as string || "instagram",
      niche as string
    );

    res.json({ success: true, hooks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET STRUCTURE SUGGESTIONS ──────────────────────────────────────────────
router.get("/api/intelligence/structures", async (req, res) => {
  try {
    const { platform } = req.query;
    
    const structures = getStructureSuggestions(platform as string || "instagram");

    res.json({ success: true, structures });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET CTA SUGGESTIONS ────────────────────────────────────────────────────
router.get("/api/intelligence/ctas", async (req, res) => {
  try {
    const { funnelStage, platform } = req.query;
    
    const ctas = getCTASuggestions(
      funnelStage as string || "top_funnel",
      platform as string || "instagram"
    );

    res.json({ success: true, ctas });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET NICHE INSIGHTS ─────────────────────────────────────────────────────
router.get("/api/intelligence/niche/:niche", async (req, res) => {
  try {
    const insights = getNicheInsights(req.params.niche);

    if (!insights) {
      return res.status(404).json({ error: "No insights found for this niche" });
    }

    res.json({ success: true, insights });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET VIRAL FORMULAS ─────────────────────────────────────────────────────
router.get("/api/intelligence/formulas", async (req, res) => {
  try {
    const { niche } = req.query;
    
    const formulas = getViralFormulas(niche as string);

    res.json({ success: true, formulas });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET PLATFORM BEST PRACTICES ────────────────────────────────────────────
router.get("/api/intelligence/platform/:platform", async (req, res) => {
  try {
    const practices = getPlatformBestPractices(req.params.platform);

    if (!practices) {
      return res.status(404).json({ error: "Platform not found" });
    }

    res.json({ success: true, practices });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── SUBMIT PERFORMANCE FEEDBACK ────────────────────────────────────────────
router.post("/api/performance-feedback", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { content, views, likes, comments, saves, niche, platform } = req.body;

    if (!content || views === undefined || likes === undefined) {
      return res.status(400).json({ error: "Content, views, and likes are required" });
    }

    // Create a temporary post to process
    const post = await storage.createContentPost({
      clientId: userId,
      platform: platform || "instagram",
      title: content.slice(0, 120),
      contentType: "post",
      funnelStage: "top",
      views: Number(views),
      likes: Number(likes),
      comments: Number(comments) || 0,
      saves: Number(saves) || 0,
      followersGained: 0,
      subscribersGained: 0,
    });

    await processPerformanceFeedback(
      userId,
      post.id,
      Number(views),
      Number(likes),
      Number(comments) || 0,
      Number(saves) || 0,
      niche || "general"
    );

    const viralScore = calculateViralScore(
      Number(views),
      Number(likes),
      Number(comments) || 0,
      Number(saves) || 0
    );

    res.json({ 
      success: true, 
      viralScore,
      message: viralScore >= 7 ? "Added to winning patterns!" : "Performance logged"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── ANALYZE POST WITH CONTENT INTELLIGENCE ────────────────────────────────────
router.post("/api/content/:postId/analyze", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const post = await storage.getContentPost(req.params.postId);
    if (!post || post.clientId !== userId) {
      return res.status(404).json({ error: "Post not found" });
    }

    const { niche } = req.body;

    // Run full intelligence analysis
    const patterns = detectViralPatterns(post.title || "");
    const score = calculateContentScore(post.title || "", post.platform, niche);
    const suggestions = generateSmartSuggestions(post.title || "", post.platform, niche, post.funnelStage || "top");

    // If post has performance data, process it for learning
    if (post.views > 0) {
      await processPerformanceFeedback(
        userId,
        post.id,
        post.views,
        post.likes || 0,
        post.comments || 0,
        post.saves || 0,
        niche || "general"
      );
    }

    res.json({
      success: true,
      postId: post.id,
      patterns: patterns.detected,
      missingPatterns: patterns.missingPatterns,
      score: score.totalScore,
      rating: score.rating,
      breakdown: score.breakdown,
      improvements: score.improvements,
      suggestions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── BULK ANALYZE POSTS ─────────────────────────────────────────────────────────
router.post("/api/content/bulk-analyze", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { postIds, niche } = req.body;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ error: "postIds array is required" });
    }

    const results = [];

    for (const postId of postIds) {
      try {
        const post = await storage.getContentPost(postId);
        if (!post || post.clientId !== userId) continue;

        const patterns = detectViralPatterns(post.title || "");
        const score = calculateContentScore(post.title || "", post.platform, niche);

        // Process performance feedback if post has metrics
        if (post.views > 0) {
          await processPerformanceFeedback(
            userId,
            post.id,
            post.views,
            post.likes || 0,
            post.comments || 0,
            post.saves || 0,
            niche || "general"
          );
        }

        results.push({
          postId: post.id,
          title: post.title,
          score: score.totalScore,
          rating: score.rating,
          patternsDetected: patterns.count,
          viralScore: calculateViralScore(post.views, post.likes || 0, post.comments || 0, post.saves || 0),
        });
      } catch (e) {
        // Skip failed posts
        continue;
      }
    }

    res.json({
      success: true,
      analyzed: results.length,
      results: results.sort((a, b) => b.score - a.score),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── DETECT VIRAL PATTERNS ──────────────────────────────────────────────────
router.post("/api/intelligence/detect-patterns", async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const patterns = detectViralPatterns(content);

    res.json({ success: true, ...patterns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── CALCULATE CONTENT SCORE ────────────────────────────────────────────────
router.post("/api/intelligence/score", async (req, res) => {
  try {
    const { content, platform, niche } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const score = calculateContentScore(
      content,
      platform || "instagram",
      niche
    );

    res.json({ success: true, ...score });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET VIRAL BREAKDOWNS ───────────────────────────────────────────────────
router.get("/api/intelligence/viral-breakdowns", async (req, res) => {
  try {
    const { platform, niche, minViralScore, limit } = req.query;
    
    const breakdowns = getViralBreakdowns({
      platform: platform as string,
      niche: niche as string,
      minViralScore: minViralScore ? Number(minViralScore) : undefined,
      limit: limit ? Number(limit) : 20
    });

    res.json({ success: true, breakdowns, count: breakdowns.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── SEARCH VIRAL BREAKDOWNS ────────────────────────────────────────────────
router.get("/api/intelligence/search-breakdowns", async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const breakdowns = searchViralBreakdowns(query as string);

    res.json({ success: true, breakdowns, count: breakdowns.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
