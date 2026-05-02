/**
 * CONTENT INTELLIGENCE ENGINE
 * 
 * This is the brain of Oravini's AI content system.
 * It learns from real data and gets smarter over time.
 * 
 * NO GENERIC AI BULLSHIT. ONLY PROVEN PATTERNS.
 */

import { storage } from "./storage";

// ── VIRAL SCORE CALCULATOR ────────────────────────────────────────────────
export function calculateViralScore(views: number, likes: number, comments: number, saves: number): number {
  if (views === 0) return 0;
  
  const engagementRate = ((likes + comments * 2 + saves * 3) / views) * 100;
  
  // Viral thresholds
  let score = 0;
  if (views >= 1000000) score += 3;
  else if (views >= 500000) score += 2.5;
  else if (views >= 100000) score += 2;
  else if (views >= 50000) score += 1.5;
  else if (views >= 10000) score += 1;
  
  // Engagement multiplier
  if (engagementRate >= 10) score += 4;
  else if (engagementRate >= 7) score += 3;
  else if (engagementRate >= 5) score += 2;
  else if (engagementRate >= 3) score += 1;
  
  // Saves are king
  if (saves > 0) {
    const saveRate = (saves / views) * 100;
    if (saveRate >= 5) score += 2;
    else if (saveRate >= 3) score += 1.5;
    else if (saveRate >= 1) score += 1;
  }
  
  // Comments = engagement gold
  if (comments > 0) {
    const commentRate = (comments / views) * 100;
    if (commentRate >= 2) score += 1.5;
    else if (commentRate >= 1) score += 1;
    else if (commentRate >= 0.5) score += 0.5;
  }
  
  return Math.min(10, Math.max(0, score));
}

// ── HOOK EXTRACTOR ─────────────────────────────────────────────────────────
export function extractHook(caption: string): string {
  if (!caption) return "";
  
  // Get first sentence or first line
  const lines = caption.split("\n").filter(l => l.trim());
  if (lines.length === 0) return "";
  
  const firstLine = lines[0].trim();
  
  // If first line is short (< 100 chars), that's the hook
  if (firstLine.length < 100) return firstLine;
  
  // Otherwise, get first sentence
  const sentences = firstLine.split(/[.!?]/);
  return sentences[0].trim();
}

// ── HOOK TYPE CLASSIFIER ───────────────────────────────────────────────────
export function classifyHookType(hook: string): string {
  const lower = hook.toLowerCase();
  
  // Curiosity hooks
  if (
    /\b(secret|nobody|hidden|revealed|truth|exposed|shocking|surprising)\b/.test(lower) ||
    /\b(you won't believe|you'll never guess|wait until you see)\b/.test(lower)
  ) {
    return "curiosity";
  }
  
  // Authority hooks
  if (
    /\b(after analyzing|studied|research|data shows|proven|tested)\b/.test(lower) ||
    /\b(\d+\s*(years?|months?|posts?|clients?))\b/.test(lower)
  ) {
    return "authority";
  }
  
  // Storytelling hooks
  if (
    /\b(i was|i used to|my journey|my story|when i|back when)\b/.test(lower) ||
    /\b(years? ago|months? ago)\b/.test(lower)
  ) {
    return "storytelling";
  }
  
  // Controversy hooks
  if (
    /\b(unpopular opinion|hot take|controversial|disagree|wrong about|myth)\b/.test(lower) ||
    /\b(stop|quit|never|don't)\b/.test(lower)
  ) {
    return "controversy";
  }
  
  // Pain point hooks
  if (
    /\b(struggling|frustrated|tired of|sick of|problem|issue|mistake)\b/.test(lower) ||
    /\b(if you're|are you)\b/.test(lower)
  ) {
    return "pain_point";
  }
  
  // Question hooks
  if (hook.includes("?")) {
    return "question";
  }
  
  // Proof hooks
  if (
    /\b(results?|proof|case study|client|testimonial|before and after)\b/.test(lower) ||
    /\$\d+/.test(hook)
  ) {
    return "proof";
  }
  
  // Default to education
  return "education";
}

// ── CONTENT STRUCTURE ANALYZER ────────────────────────────────────────────
export function analyzeContentStructure(caption: string): string {
  if (!caption) return "Unknown";
  
  const lower = caption.toLowerCase();
  const lines = caption.split("\n").filter(l => l.trim());
  
  const hasHook = lines.length > 0;
  const hasProblem = /\b(problem|issue|struggle|challenge|pain)\b/.test(lower);
  const hasSolution = /\b(solution|answer|fix|how to|here's how)\b/.test(lower);
  const hasSteps = /\b(step \d|first|second|third|\d\.|1\)|2\)|3\))\b/.test(lower);
  const hasCTA = /\b(follow|save|share|comment|dm|link in bio|swipe)\b/.test(lower);
  const hasProof = /\b(results?|proof|case study|\$\d+|%)\b/.test(lower);
  
  const structure: string[] = [];
  
  if (hasHook) structure.push("Hook");
  if (hasProblem) structure.push("Problem");
  if (hasSteps) structure.push("Steps");
  else if (hasSolution) structure.push("Solution");
  if (hasProof) structure.push("Proof");
  if (hasCTA) structure.push("CTA");
  
  return structure.length > 0 ? structure.join(" → ") : "Hook → Value → CTA";
}

// ── PERFORMANCE FEEDBACK PROCESSOR ────────────────────────────────────────
export async function processPerformanceFeedback(
  userId: string,
  postId: string,
  views: number,
  likes: number,
  comments: number,
  saves: number,
  niche: string
): Promise<void> {
  const viralScore = calculateViralScore(views, likes, comments, saves);
  
  // Only save patterns that performed well (viral score > 7)
  if (viralScore < 7) return;
  
  const post = await storage.getContentPost(postId);
  if (!post || !post.title) return;
  
  const hook = extractHook(post.title);
  const hookType = classifyHookType(hook);
  const structure = analyzeContentStructure(post.title);
  const engagementRate = views > 0 ? ((likes + comments + saves) / views) * 100 : 0;
  
  // Save to winning patterns
  await storage.createWinningPattern({
    userId,
    postId,
    platform: post.platform,
    contentType: post.contentType,
    funnelStage: post.funnelStage || "top",
    hook,
    hookType: hookType as any,
    structure,
    cta: extractCTA(post.title),
    niche,
    views,
    likes,
    comments,
    saves,
    engagementRate,
    viralScore,
    performanceReason: generatePerformanceReason(viralScore, engagementRate, saves, comments),
  });
  
  // Add hook to global library if it's really good (viral score > 8.5)
  if (viralScore > 8.5) {
    await storage.createHook({
      hook,
      hookType: hookType as any,
      platform: post.platform,
      niche,
      viralScore,
      avgViews: views,
      avgEngagement: engagementRate,
      usageCount: 0,
      source: "user_content",
    });
  }
}

function extractCTA(caption: string): string {
  const lower = caption.toLowerCase();
  const lines = caption.split("\n").filter(l => l.trim());
  
  // Check last 2 lines for CTA
  const lastLines = lines.slice(-2).join(" ").toLowerCase();
  
  if (/\bfollow\b/.test(lastLines)) return "Follow for more";
  if (/\bsave\b/.test(lastLines)) return "Save this";
  if (/\bshare\b/.test(lastLines)) return "Share with someone";
  if (/\bcomment\b/.test(lastLines)) return "Comment below";
  if (/\bdm\b/.test(lastLines)) return "DM me";
  if (/\blink in bio\b/.test(lastLines)) return "Link in bio";
  
  return "Soft CTA";
}

function generatePerformanceReason(viralScore: number, engagementRate: number, saves: number, comments: number): string {
  const reasons: string[] = [];
  
  if (viralScore >= 9) reasons.push("Exceptional viral performance");
  else if (viralScore >= 8) reasons.push("Strong viral potential");
  
  if (engagementRate >= 10) reasons.push("extremely high engagement rate");
  else if (engagementRate >= 7) reasons.push("high engagement rate");
  
  if (saves > 100) reasons.push("massive save count");
  else if (saves > 50) reasons.push("strong save rate");
  
  if (comments > 50) reasons.push("sparked conversation");
  else if (comments > 20) reasons.push("good comment engagement");
  
  return reasons.join(" + ");
}

// ── BRAND VOICE ANALYZER ───────────────────────────────────────────────────
export async function analyzeBrandVoice(userId: string, posts: Array<{ title: string }>): Promise<any> {
  if (posts.length < 5) {
    throw new Error("Need at least 5 posts to analyze brand voice");
  }
  
  const captions = posts.map(p => p.title).filter(Boolean).join("\n\n");
  
  // Analyze tone
  const lower = captions.toLowerCase();
  let tone = "casual";
  if (/\b(data|research|study|proven|analysis)\b/.test(lower)) tone = "authoritative";
  if (/\b(dream|believe|inspire|transform|journey)\b/.test(lower)) tone = "inspirational";
  if (/\b(learn|how to|step|guide|tutorial)\b/.test(lower)) tone = "educational";
  if (/😂|🤣|lol|haha/.test(captions)) tone = "humorous";
  
  // Extract vocabulary
  const words = captions.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const wordCounts = new Map<string, number>();
  words.forEach(w => wordCounts.set(w, (wordCounts.get(w) || 0) + 1));
  const vocabulary = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
  
  // Analyze sentence structure
  const sentences = captions.split(/[.!?]/).filter(s => s.trim());
  const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
  let sentenceStructure = "mix";
  if (avgLength < 50) sentenceStructure = "short punchy";
  else if (avgLength > 100) sentenceStructure = "long flowing";
  
  // Analyze punctuation
  const emojiCount = (captions.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
  let punctuationStyle = "minimal";
  if (emojiCount > posts.length * 3) punctuationStyle = "lots of emojis";
  else if (/\b[A-Z]{2,}\b/.test(captions)) punctuationStyle = "professional";
  
  // Detect perspective
  let perspective = "second person";
  if (/\b(i|my|me|we|our)\b/i.test(captions)) perspective = "first person";
  else if (/\b(they|their|them)\b/i.test(captions)) perspective = "third person";
  
  // Extract unique patterns
  const uniquePatterns: string[] = [];
  if (/\b(here's the thing|truth is|real talk)\b/i.test(captions)) uniquePatterns.push("conversational openers");
  if (/\b(let me tell you|i'll be honest|confession)\b/i.test(captions)) uniquePatterns.push("personal disclosure");
  if (/\b(pro tip|insider secret|hack)\b/i.test(captions)) uniquePatterns.push("value-driven language");
  
  const voiceFingerprint = `${tone} tone + ${sentenceStructure} sentences + ${punctuationStyle} style`;
  
  return {
    tone,
    vocabulary,
    sentenceStructure,
    punctuationStyle,
    perspective,
    uniquePatterns,
    voiceFingerprint,
    analyzedPostsCount: posts.length,
  };
}

// ── TRAINING DATA BUILDER ──────────────────────────────────────────────────
export async function buildTrainingPrompt(userId: string, platform: string, niche: string, funnelStage: string): Promise<string> {
  // Get user's winning patterns
  const userPatterns = await storage.getWinningPatterns(userId, { platform, funnelStage, limit: 10 });
  
  // Get global top hooks for this niche
  const topHooks = await storage.getHookLibrary({ platform, niche, limit: 20 });
  
  // Get platform-specific training data
  const platformData = await storage.getPlatformTrainingData(platform);
  
  // Get funnel stage training
  const funnelData = await storage.getFunnelStageTraining(funnelStage);
  
  // Get brand voice
  const brandVoice = await storage.getBrandVoiceProfile(userId);
  
  let prompt = `You are Oravini's Content Intelligence Engine, trained on 10,000+ viral posts.\n\n`;
  
  // Add hook library
  if (topHooks.length > 0) {
    prompt += `PROVEN HOOK PATTERNS (sorted by viral score):\n`;
    topHooks.forEach(h => {
      prompt += `- "${h.hook}" [${h.hookType}] — Viral Score: ${h.viralScore.toFixed(1)}, Avg Views: ${h.avgViews.toLocaleString()}\n`;
    });
    prompt += `\n`;
  }
  
  // Add user's winning patterns
  if (userPatterns.length > 0) {
    prompt += `YOUR WINNING PATTERNS (what works for YOU specifically):\n`;
    userPatterns.forEach(p => {
      prompt += `- Hook: "${p.hook}" [${p.hookType}]\n`;
      prompt += `  Structure: ${p.structure}\n`;
      prompt += `  Performance: ${p.views.toLocaleString()} views, ${p.engagementRate.toFixed(2)}% ER, Viral Score: ${p.viralScore.toFixed(1)}\n`;
      prompt += `  Why it worked: ${p.performanceReason}\n\n`;
    });
  }
  
  // Add funnel stage training
  if (funnelData) {
    prompt += `FUNNEL STAGE: ${funnelStage.toUpperCase()}\n`;
    prompt += `Purpose: ${funnelData.purpose}\n`;
    prompt += `Best content types: ${funnelData.contentTypes.join(", ")}\n`;
    prompt += `Best hook types: ${funnelData.hookTypes.join(", ")}\n`;
    prompt += `Best CTA types: ${funnelData.ctaTypes.join(", ")}\n\n`;
  }
  
  // Add platform-specific patterns
  if (platformData.length > 0) {
    prompt += `PLATFORM-SPECIFIC PATTERNS (${platform.toUpperCase()}):\n`;
    const grouped = platformData.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {} as Record<string, typeof platformData>);
    
    Object.entries(grouped).forEach(([category, patterns]) => {
      prompt += `${category}:\n`;
      patterns.forEach(p => prompt += `  - ${p.description}\n`);
    });
    prompt += `\n`;
  }
  
  // Add brand voice
  if (brandVoice) {
    prompt += `BRAND VOICE (match this EXACTLY):\n`;
    prompt += `Tone: ${brandVoice.tone}\n`;
    prompt += `Sentence structure: ${brandVoice.sentenceStructure}\n`;
    prompt += `Punctuation style: ${brandVoice.punctuationStyle}\n`;
    prompt += `Perspective: ${brandVoice.perspective}\n`;
    prompt += `Voice fingerprint: ${brandVoice.voiceFingerprint}\n`;
    if (brandVoice.uniquePatterns.length > 0) {
      prompt += `Unique patterns: ${brandVoice.uniquePatterns.join(", ")}\n`;
    }
    prompt += `\n`;
  }
  
  prompt += `CRITICAL RULES:\n`;
  prompt += `1. Every hook MUST match a proven hook type from the library\n`;
  prompt += `2. Every post MUST follow the platform-specific structure\n`;
  prompt += `3. Every piece of content MUST sound like the brand voice\n`;
  prompt += `4. Use ONLY patterns that have proven to work\n`;
  prompt += `5. NO generic hooks like "5 tips" or "How to grow" — those are DEAD\n\n`;
  
  return prompt;
}

export default {
  calculateViralScore,
  extractHook,
  classifyHookType,
  analyzeContentStructure,
  processPerformanceFeedback,
  analyzeBrandVoice,
  buildTrainingPrompt,
};
