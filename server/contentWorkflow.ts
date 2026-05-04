/**
 * CONTENT WORKFLOW ENGINE
 * Bulk content generation for weeks, months with funnel intelligence
 */

import { storage } from "./storage";
import { buildTrainingPrompt } from "./contentIntelligence";

// ── FUNNEL STAGE SKILLS ────────────────────────────────────────────────────
export const FUNNEL_SKILLS = {
  top: {
    purpose: "Awareness — reach new people who don't know you",
    contentTypes: ["viral reels", "trending topics", "relatable pain points", "pattern interrupts"],
    hookTypes: ["curiosity", "controversy", "storytelling", "question"],
    ctaTypes: ["Follow for more", "Save this", "Share with someone who needs this", "Tag someone"],
    goals: ["Reach", "Virality", "New followers", "Brand awareness"],
    metrics: ["Views", "Shares", "Reach", "Profile visits"],
  },
  middle: {
    purpose: "Trust — prove you know what you're talking about",
    contentTypes: ["case studies", "frameworks", "how-to breakdowns", "behind-the-scenes", "value bombs"],
    hookTypes: ["authority", "education", "proof", "storytelling"],
    ctaTypes: ["Comment your thoughts", "DM me [word] for the full guide", "Save this framework", "Which one resonates?"],
    goals: ["Engagement", "Trust building", "Authority", "Community"],
    metrics: ["Saves", "Comments", "Engagement rate", "Time spent"],
  },
  bottom: {
    purpose: "Conversion — turn followers into customers",
    contentTypes: ["testimonials", "offers", "urgency-driven posts", "results", "transformations"],
    hookTypes: ["authority", "proof", "scarcity", "controversy"],
    ctaTypes: ["DM to work with me", "Link in bio", "Limited spots available", "Apply now"],
    goals: ["Conversions", "Sales", "Leads", "Applications"],
    metrics: ["DMs", "Link clicks", "Applications", "Sales"],
  },
};

// ── CONTENT MIX STRATEGIES ─────────────────────────────────────────────────
export const CONTENT_MIX = {
  growth: { reels: 60, carousels: 30, posts: 10 },
  engagement: { reels: 40, carousels: 40, posts: 20 },
  conversion: { reels: 30, carousels: 50, posts: 20 },
  balanced: { reels: 50, carousels: 30, posts: 20 },
};

// ── FUNNEL DISTRIBUTION STRATEGIES ────────────────────────────────────────
export const FUNNEL_DISTRIBUTION = {
  growth: { top: 60, middle: 30, bottom: 10 },
  nurture: { top: 30, middle: 50, bottom: 20 },
  conversion: { top: 20, middle: 40, bottom: 40 },
  balanced: { top: 40, middle: 40, bottom: 20 },
};

// ── WORKFLOW GENERATOR ─────────────────────────────────────────────────────
export async function generateContentWorkflow(params: {
  userId: string;
  period: "week" | "2weeks" | "month" | "custom";
  startDate?: string;
  days?: number;
  platform: "instagram" | "youtube";
  niche: string;
  goal: string;
  strategy?: "growth" | "nurture" | "conversion" | "balanced";
  postsPerDay?: number;
}) {
  const {
    userId,
    period,
    startDate = new Date().toISOString().split("T")[0],
    platform,
    niche,
    goal,
    strategy = "balanced",
    postsPerDay = 1,
  } = params;

  // Calculate days
  let days = params.days || 7;
  if (period === "week") days = 7;
  if (period === "2weeks") days = 14;
  if (period === "month") days = 30;

  // Get strategy distributions
  const funnelDist = FUNNEL_DISTRIBUTION[strategy];
  const contentMix = CONTENT_MIX[strategy];

  // Calculate post counts per funnel stage
  const totalPosts = days * postsPerDay;
  const tofuCount = Math.round(totalPosts * (funnelDist.top / 100));
  const mofuCount = Math.round(totalPosts * (funnelDist.middle / 100));
  const bofuCount = totalPosts - tofuCount - mofuCount;

  // Generate posts for each funnel stage
  const posts = [];
  let currentDay = 1;

  // Distribute posts across days
  const postsPerStage = {
    top: tofuCount,
    middle: mofuCount,
    bottom: bofuCount,
  };

  for (let day = 1; day <= days; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (day - 1));
    const dateStr = date.toISOString().split("T")[0];

    for (let postNum = 0; postNum < postsPerDay; postNum++) {
      // Determine funnel stage based on distribution
      let funnelStage: "top" | "middle" | "bottom" = "top";
      const postIndex = (day - 1) * postsPerDay + postNum;

      if (postIndex < tofuCount) funnelStage = "top";
      else if (postIndex < tofuCount + mofuCount) funnelStage = "middle";
      else funnelStage = "bottom";

      // Determine content type based on mix
      const contentType = selectContentType(contentMix);

      // Generate post using AI
      const post = await generateSinglePost({
        userId,
        platform,
        niche,
        funnelStage,
        contentType,
        day,
        date: dateStr,
      });

      posts.push(post);
    }
  }

  return {
    period,
    days,
    startDate,
    endDate: new Date(new Date(startDate).getTime() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    strategy: {
      name: strategy,
      funnelDistribution: funnelDist,
      contentMix,
      postsPerDay,
      totalPosts,
    },
    posts,
    summary: {
      totalPosts,
      byFunnelStage: {
        top: tofuCount,
        middle: mofuCount,
        bottom: bofuCount,
      },
      byContentType: calculateContentTypeCounts(posts),
    },
  };
}

// ── SINGLE POST GENERATOR ──────────────────────────────────────────────────
async function generateSinglePost(params: {
  userId: string;
  platform: "instagram" | "youtube";
  niche: string;
  funnelStage: "top" | "middle" | "bottom";
  contentType: string;
  day: number;
  date: string;
}) {
  const { userId, platform, niche, funnelStage, contentType, day, date } = params;

  // Build training prompt with user's data
  const trainingPrompt = await buildTrainingPrompt(userId, platform, niche, funnelStage);

  // Get funnel stage skills
  const skills = FUNNEL_SKILLS[funnelStage];

  // Select random hook type from funnel stage
  const hookType = skills.hookTypes[Math.floor(Math.random() * skills.hookTypes.length)];
  const ctaType = skills.ctaTypes[Math.floor(Math.random() * skills.ctaTypes.length)];

  // Get user's winning patterns for this stage
  const patterns = await storage.getWinningPatterns(userId, { platform, funnelStage, limit: 5 });

  // Get top hooks for this niche
  const hooks = await storage.getHookLibrary({ platform, niche, limit: 10 });

  // Generate content idea
  const idea = await generateContentIdea({
    trainingPrompt,
    funnelStage,
    hookType,
    ctaType,
    contentType,
    niche,
    patterns,
    hooks,
  });

  return {
    day,
    date,
    funnelStage,
    contentType,
    hookType,
    ...idea,
  };
}

// ── CONTENT IDEA GENERATOR ─────────────────────────────────────────────────
async function generateContentIdea(params: {
  trainingPrompt: string;
  funnelStage: string;
  hookType: string;
  ctaType: string;
  contentType: string;
  niche: string;
  patterns: any[];
  hooks: any[];
}) {
  const { trainingPrompt, funnelStage, hookType, ctaType, contentType, niche, patterns, hooks } = params;

  const skills = FUNNEL_SKILLS[funnelStage as keyof typeof FUNNEL_SKILLS];

  // Build prompt for AI
  const prompt = `${trainingPrompt}

TASK: Generate a ${contentType} for ${funnelStage.toUpperCase()} of funnel

FUNNEL STAGE: ${funnelStage.toUpperCase()}
Purpose: ${skills.purpose}
Goal: ${skills.goals.join(", ")}

REQUIREMENTS:
- Hook type: ${hookType}
- CTA type: ${ctaType}
- Content type: ${contentType}
- Niche: ${niche}

${patterns.length > 0 ? `YOUR WINNING PATTERNS:\n${patterns.map(p => `- "${p.hook}" (${p.viralScore.toFixed(1)} viral score)`).join("\n")}` : ""}

${hooks.length > 0 ? `TOP HOOKS IN YOUR NICHE:\n${hooks.slice(0, 5).map(h => `- "${h.hook}" (${h.viralScore.toFixed(1)} viral score)`).join("\n")}` : ""}

Generate:
1. Title/Hook (must match ${hookType} hook type)
2. Body (3-5 key points)
3. CTA (must match ${ctaType} style)
4. Why it works (1 sentence)

Format as JSON:
{
  "title": "...",
  "hook": "...",
  "body": "...",
  "cta": "...",
  "whyItWorks": "..."
}`;

  // In production, call OpenAI API here
  // For now, return structured template
  return generateTemplateContent({ funnelStage, hookType, ctaType, contentType, niche });
}

// ── TEMPLATE CONTENT GENERATOR ─────────────────────────────────────────────
function generateTemplateContent(params: {
  funnelStage: string;
  hookType: string;
  ctaType: string;
  contentType: string;
  niche: string;
}) {
  const { funnelStage, hookType, ctaType, contentType, niche } = params;

  const templates = {
    top: {
      curiosity: {
        title: `I analyzed 10,000 ${niche} posts. 97% are making this mistake`,
        hook: `Stop scrolling if you want to know the truth about ${niche}`,
        body: `Most people think ${niche} is about X. Wrong.\n\nHere's what actually works:\n\n1. [Key insight]\n2. [Counterintuitive truth]\n3. [Pattern that works]\n\nThe difference? Results.`,
        cta: ctaType,
        whyItWorks: "Curiosity hook + authority positioning + pattern interrupt = viral",
      },
      storytelling: {
        title: `I was broke 2 years ago. Now I make $50K/month in ${niche}`,
        hook: `Everyone romanticizes ${niche}. Here's the real story`,
        body: `2 years ago: Struggling, confused, broke\n\nToday: $50K/month, freedom, impact\n\nWhat changed?\n\n1. [Mindset shift]\n2. [Strategy that worked]\n3. [System I built]\n\nYou can do this too.`,
        cta: ctaType,
        whyItWorks: "Relatable story + transformation + hope = engagement",
      },
    },
    middle: {
      authority: {
        title: `After working with 100+ ${niche} clients, here's the framework that works`,
        hook: `Most ${niche} advice is generic. This framework is proven`,
        body: `The [Framework Name]:\n\n1. [Step 1] — Why it matters\n2. [Step 2] — How to implement\n3. [Step 3] — Common mistakes\n\nResults: [Specific outcome]\n\nSave this.`,
        cta: ctaType,
        whyItWorks: "Authority + framework + specificity = trust",
      },
      education: {
        title: `How to [achieve result] in ${niche} (step-by-step)`,
        hook: `If you're struggling with ${niche}, this will help`,
        body: `Step 1: [Action]\nWhy: [Reason]\n\nStep 2: [Action]\nWhy: [Reason]\n\nStep 3: [Action]\nWhy: [Reason]\n\nDo this for 30 days. Watch what happens.`,
        cta: ctaType,
        whyItWorks: "Clear steps + reasoning + timeframe = actionable value",
      },
    },
    bottom: {
      proof: {
        title: `Client went from $0 to $10K/month in ${niche} in 60 days`,
        hook: `Real results. Real strategy. No BS`,
        body: `Before: [Pain point]\nAfter: [Result]\n\nWhat we did:\n1. [Strategy]\n2. [Implementation]\n3. [Optimization]\n\nResult: [Specific numbers]\n\nWant the same?`,
        cta: ctaType,
        whyItWorks: "Social proof + specific results + clear offer = conversions",
      },
      authority: {
        title: `I'm opening 5 spots for ${niche} coaching. Here's what you get`,
        hook: `If you're serious about ${niche}, read this`,
        body: `What you get:\n✓ [Benefit 1]\n✓ [Benefit 2]\n✓ [Benefit 3]\n\nWho it's for:\n- [Criteria 1]\n- [Criteria 2]\n\nOnly 5 spots. First come, first served.`,
        cta: ctaType,
        whyItWorks: "Clear offer + scarcity + qualification = high-intent leads",
      },
    },
  };

  const stageTemplates = templates[funnelStage as keyof typeof templates];
  const hookTemplates = stageTemplates[hookType as keyof typeof stageTemplates] || Object.values(stageTemplates)[0];

  return hookTemplates;
}

// ── HELPER FUNCTIONS ───────────────────────────────────────────────────────
function selectContentType(mix: { reels: number; carousels: number; posts: number }): string {
  const rand = Math.random() * 100;
  if (rand < mix.reels) return "reel";
  if (rand < mix.reels + mix.carousels) return "carousel";
  return "post";
}

function calculateContentTypeCounts(posts: any[]) {
  return posts.reduce((acc, post) => {
    acc[post.contentType] = (acc[post.contentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ── BATCH ANALYSIS ─────────────────────────────────────────────────────────
export async function analyzeContentBatch(params: {
  userId: string;
  posts: Array<{
    title: string;
    platform: string;
    contentType: string;
    views: number;
    likes: number;
    comments: number;
    saves: number;
  }>;
  niche: string;
}) {
  const { userId, posts, niche } = params;

  const results = [];

  for (const post of posts) {
    // Import from contentIntelligence
    const { calculateViralScore, extractHook, classifyHookType, analyzeContentStructure } = await import("./contentIntelligence");

    const viralScore = calculateViralScore(post.views, post.likes, post.comments, post.saves);
    const hook = extractHook(post.title);
    const hookType = classifyHookType(hook);
    const structure = analyzeContentStructure(post.title);

    results.push({
      ...post,
      viralScore,
      hook,
      hookType,
      structure,
      performance: viralScore >= 7 ? "winning" : viralScore >= 4 ? "average" : "poor",
    });
  }

  return {
    totalPosts: posts.length,
    winningPosts: results.filter(r => r.viralScore >= 7).length,
    averagePosts: results.filter(r => r.viralScore >= 4 && r.viralScore < 7).length,
    poorPosts: results.filter(r => r.viralScore < 4).length,
    avgViralScore: results.reduce((sum, r) => sum + r.viralScore, 0) / results.length,
    topPerformers: results.sort((a, b) => b.viralScore - a.viralScore).slice(0, 5),
    insights: generateInsights(results),
  };
}

function generateInsights(results: any[]) {
  const hookTypes = results.reduce((acc, r) => {
    acc[r.hookType] = (acc[r.hookType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topHookType = Object.entries(hookTypes).sort((a, b) => b[1] - a[1])[0];

  return {
    topHookType: topHookType?.[0] || "unknown",
    hookTypeDistribution: hookTypes,
    recommendation: `Your ${topHookType?.[0] || "curiosity"} hooks perform best. Use more of these.`,
  };
}

export default {
  generateContentWorkflow,
  analyzeContentBatch,
  FUNNEL_SKILLS,
  CONTENT_MIX,
  FUNNEL_DISTRIBUTION,
};
