/**
 * CONTENT INTELLIGENCE ENGINE
 * 
 * This is the brain of Oravini's AI content system.
 * It learns from real data and gets smarter over time.
 * 
 * NO GENERIC AI BULLSHIT. ONLY PROVEN PATTERNS.
 */

import { storage } from "./storage";
import { 
  VIRAL_HOOKS, 
  CONTENT_STRUCTURES, 
  CTA_PATTERNS, 
  NICHE_PATTERNS,
  ENGAGEMENT_TRIGGERS,
  VIRAL_FORMULAS,
  PLATFORM_BEST_PRACTICES,
  VIRAL_BREAKDOWNS,
  VIRAL_PATTERNS
} from "./viralTrainingData";

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

// ── HOOK TYPE CLASSIFIER (ENHANCED WITH TRAINING DATA) ────────────────────
export function classifyHookType(hook: string): string {
  const lower = hook.toLowerCase();
  
  // Check against viral hook patterns first
  let bestMatch = { type: "education", score: 0 };
  
  for (const [type, hooks] of Object.entries(VIRAL_HOOKS)) {
    for (const viralHook of hooks) {
      const similarity = calculateSimilarity(lower, viralHook.hook.toLowerCase());
      if (similarity > bestMatch.score) {
        bestMatch = { type, score: similarity };
      }
    }
  }
  
  // If we found a strong match (>60% similarity), use it
  if (bestMatch.score > 0.6) {
    return bestMatch.type;
  }
  
  // Otherwise use pattern matching
  // Curiosity hooks
  if (
    /\b(secret|nobody|hidden|revealed|truth|exposed|shocking|surprising|insane|discovered)\b/.test(lower) ||
    /\b(you won't believe|you'll never guess|wait until you see|wasn't supposed to)\b/.test(lower)
  ) {
    return "curiosity";
  }
  
  // Authority hooks
  if (
    /\b(after analyzing|studied|research|data shows|proven|tested|spent \$|analyzed)\b/.test(lower) ||
    /\b(\d+\s*(years?|months?|posts?|clients?|hours?))\b/.test(lower)
  ) {
    return "authority";
  }
  
  // Storytelling hooks
  if (
    /\b(i was|i used to|my journey|my story|when i|back when|years? ago|months? ago)\b/.test(lower) ||
    /\b(broke|failed|quit|lost everything|sleeping on)\b/.test(lower)
  ) {
    return "storytelling";
  }
  
  // Controversy hooks
  if (
    /\b(unpopular opinion|hot take|controversial|disagree|wrong about|myth|harsh truth)\b/.test(lower) ||
    /\b(stop doing|everyone's doing|biggest lie|piss off)\b/.test(lower)
  ) {
    return "controversy";
  }
  
  // Pain point hooks
  if (
    /\b(struggling|frustrated|tired of|sick of|problem|issue|mistake|failing)\b/.test(lower) ||
    /\b(if you're|are you|feel stuck)\b/.test(lower)
  ) {
    return "pain_point";
  }
  
  // Question hooks
  if (hook.includes("?")) {
    return "question";
  }
  
  // Proof hooks
  if (
    /\b(results?|proof|case study|client|testimonial|before and after|income report)\b/.test(lower) ||
    /\$\d+|\d+k followers|0 to \d+/.test(lower)
  ) {
    return "proof";
  }
  
  // Default to education
  return "education";
}

// Helper function to calculate text similarity
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  return commonWords.length / Math.max(words1.length, words2.length);
}

// ── CONTENT STRUCTURE ANALYZER (ENHANCED) ─────────────────────────────────
export function analyzeContentStructure(caption: string, platform: string = "instagram"): string {
  if (!caption) return "Unknown";
  
  const lower = caption.toLowerCase();
  const lines = caption.split("\n").filter(l => l.trim());
  
  const hasHook = lines.length > 0;
  const hasProblem = /\b(problem|issue|struggle|challenge|pain|mistake|failing)\b/.test(lower);
  const hasSolution = /\b(solution|answer|fix|how to|here's how|strategy|method)\b/.test(lower);
  const hasSteps = /\b(step \d|first|second|third|\d\.|1\)|2\)|3\)|framework)\b/.test(lower);
  const hasCTA = /\b(follow|save|share|comment|dm|link in bio|swipe|tag|double tap)\b/.test(lower);
  const hasProof = /\b(results?|proof|case study|\$\d+|%|before|after|client)\b/.test(lower);
  const hasStory = /\b(i was|my journey|when i|years ago|failed|quit)\b/.test(lower);
  const hasData = /\b(analyzed|studied|research|data|\d+\s*(posts?|clients?|hours?))\b/.test(lower);
  const hasQuestion = caption.includes("?");
  
  const structure: string[] = [];
  
  if (hasHook) structure.push("Hook");
  if (hasQuestion) structure.push("Question");
  if (hasStory) structure.push("Story");
  if (hasData) structure.push("Data");
  if (hasProblem) structure.push("Problem");
  if (hasSteps) structure.push("Steps");
  else if (hasSolution) structure.push("Solution");
  if (hasProof) structure.push("Proof");
  if (hasCTA) structure.push("CTA");
  
  const detectedStructure = structure.length > 0 ? structure.join(" → ") : "Hook → Value → CTA";
  
  // Match against viral structures for the platform
  const platformStructures = CONTENT_STRUCTURES[platform as keyof typeof CONTENT_STRUCTURES]?.viral || [];
  let bestMatch = { structure: detectedStructure, score: 0 };
  
  for (const viralStruct of platformStructures) {
    const similarity = calculateSimilarity(detectedStructure.toLowerCase(), viralStruct.structure.toLowerCase());
    if (similarity > bestMatch.score) {
      bestMatch = { structure: viralStruct.structure, score: similarity };
    }
  }
  
  // If we found a strong match, suggest it
  if (bestMatch.score > 0.7) {
    return `${detectedStructure} (Similar to viral: ${bestMatch.structure})`;
  }
  
  return detectedStructure;
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

// ── GET VIRAL HOOK SUGGESTIONS ────────────────────────────────────────────
export function getViralHookSuggestions(hookType: string, platform: string, niche?: string): any[] {
  const hooks = VIRAL_HOOKS[hookType as keyof typeof VIRAL_HOOKS] || [];
  
  // Filter by platform if specified
  let filtered = platform ? hooks.filter(h => h.platform === platform) : hooks;
  
  // If no platform-specific hooks, return all
  if (filtered.length === 0) filtered = hooks;
  
  // Sort by viral score
  return filtered.sort((a, b) => b.viralScore - a.viralScore).slice(0, 5);
}

// ── GET CONTENT STRUCTURE SUGGESTIONS ──────────────────────────────────────
export function getStructureSuggestions(platform: string): any[] {
  const structures = CONTENT_STRUCTURES[platform as keyof typeof CONTENT_STRUCTURES]?.viral || [];
  return structures.sort((a, b) => b.viralScore - a.viralScore);
}

// ── GET CTA SUGGESTIONS ────────────────────────────────────────────────────
export function getCTASuggestions(funnelStage: string, platform: string = "instagram"): any[] {
  const ctas = CTA_PATTERNS[funnelStage as keyof typeof CTA_PATTERNS] || [];
  return ctas.filter(c => c.platform === platform).sort((a, b) => b.conversionRate - a.conversionRate);
}

// ── GET NICHE INSIGHTS ─────────────────────────────────────────────────────
export function getNicheInsights(niche: string): any {
  const normalizedNiche = niche.toLowerCase();
  return NICHE_PATTERNS[normalizedNiche as keyof typeof NICHE_PATTERNS] || null;
}

// ── GET VIRAL FORMULA SUGGESTIONS ──────────────────────────────────────────
export function getViralFormulas(niche?: string): any[] {
  if (!niche) return VIRAL_FORMULAS;
  
  const normalizedNiche = niche.toLowerCase();
  return VIRAL_FORMULAS.filter(f => 
    f.bestFor.includes("all niches") || 
    f.bestFor.some(n => normalizedNiche.includes(n))
  ).sort((a, b) => b.viralScore - a.viralScore);
}

// ── GET PLATFORM BEST PRACTICES ────────────────────────────────────────────
export function getPlatformBestPractices(platform: string): any {
  return PLATFORM_BEST_PRACTICES[platform as keyof typeof PLATFORM_BEST_PRACTICES] || null;
}

// ── GENERATE SMART SUGGESTIONS ─────────────────────────────────────────────
export function generateSmartSuggestions(
  content: string,
  platform: string,
  niche?: string,
  funnelStage: string = "top"
): any {
  const hook = extractHook(content);
  const hookType = classifyHookType(hook);
  const structure = analyzeContentStructure(content, platform);
  const viralScore = calculateViralScore(0, 0, 0, 0); // Will be calculated with real data
  
  const suggestions: any = {
    hook: {
      detected: hook,
      type: hookType,
      alternatives: getViralHookSuggestions(hookType, platform, niche),
    },
    structure: {
      detected: structure,
      viralStructures: getStructureSuggestions(platform),
    },
    cta: {
      suggestions: getCTASuggestions(funnelStage, platform),
    },
    improvements: [],
    viralFormulas: getViralFormulas(niche),
  };
  
  // Generate specific improvements
  if (!hook || hook.length < 10) {
    suggestions.improvements.push({
      type: "hook",
      priority: "high",
      message: "Add a stronger hook in the first line",
      examples: getViralHookSuggestions(hookType, platform, niche).slice(0, 3),
    });
  }
  
  if (!structure.includes("CTA")) {
    suggestions.improvements.push({
      type: "cta",
      priority: "high",
      message: "Add a clear call-to-action",
      examples: getCTASuggestions(funnelStage, platform).slice(0, 3),
    });
  }
  
  if (!structure.includes("Proof") && funnelStage !== "top") {
    suggestions.improvements.push({
      type: "proof",
      priority: "medium",
      message: "Add social proof or results to build credibility",
      examples: ["Client results", "Before/After", "Case study", "Testimonial"],
    });
  }
  
  if (niche) {
    const nicheInsights = getNicheInsights(niche);
    if (nicheInsights) {
      suggestions.nicheInsights = nicheInsights;
      
      if (!nicheInsights.topHooks.includes(hookType)) {
        suggestions.improvements.push({
          type: "hook_type",
          priority: "medium",
          message: `For ${niche}, ${nicheInsights.topHooks.join(", ")} hooks perform best`,
          examples: nicheInsights.topHooks.map((type: string) => 
            getViralHookSuggestions(type, platform, niche)[0]
          ).filter(Boolean),
        });
      }
    }
  }
  
  // Add platform-specific tips
  const platformTips = getPlatformBestPractices(platform);
  if (platformTips) {
    suggestions.platformTips = platformTips;
  }
  
  return suggestions;
}

// ── PATTERN RECOGNITION ENGINE ────────────────────────────────────────────
export function detectViralPatterns(content: string): any {
  const lower = content.toLowerCase();
  const detectedPatterns: any[] = [];
  
  for (const [key, pattern] of Object.entries(VIRAL_PATTERNS)) {
    let score = 0;
    let matchedIndicators: string[] = [];
    
    // Check each indicator
    for (const indicator of pattern.indicators) {
      if (lower.includes(indicator.toLowerCase())) {
        score += 20; // Each indicator adds 20 points
        matchedIndicators.push(indicator);
      }
    }
    
    // Cap at 100
    score = Math.min(100, score);
    
    if (score > 0) {
      detectedPatterns.push({
        pattern: key,
        name: pattern.name,
        description: pattern.description,
        strength: pattern.strength,
        score,
        matchedIndicators,
        avgBoost: pattern.avgBoost,
        examples: pattern.examples
      });
    }
  }
  
  // Sort by score
  detectedPatterns.sort((a, b) => b.score - a.score);
  
  // Calculate pattern density (how many patterns per 100 words)
  const wordCount = content.split(/\s+/).length;
  const patternDensity = (detectedPatterns.length / wordCount) * 100;
  
  return {
    detected: detectedPatterns,
    count: detectedPatterns.length,
    patternDensity: patternDensity.toFixed(2),
    missingPatterns: getMissingPatterns(detectedPatterns),
    overallStrength: calculateOverallPatternStrength(detectedPatterns)
  };
}

function getMissingPatterns(detected: any[]): any[] {
  const detectedKeys = new Set(detected.map(p => p.pattern));
  const missing: any[] = [];
  
  for (const [key, pattern] of Object.entries(VIRAL_PATTERNS)) {
    if (!detectedKeys.has(key) && pattern.strength === "very high") {
      missing.push({
        pattern: key,
        name: pattern.name,
        description: pattern.description,
        strength: pattern.strength,
        avgBoost: pattern.avgBoost,
        examples: pattern.examples
      });
    }
  }
  
  return missing.slice(0, 5); // Top 5 missing high-impact patterns
}

function calculateOverallPatternStrength(patterns: any[]): number {
  if (patterns.length === 0) return 0;
  
  const totalScore = patterns.reduce((sum, p) => sum + p.score, 0);
  const avgScore = totalScore / patterns.length;
  
  // Bonus for having multiple patterns
  const diversityBonus = Math.min(20, patterns.length * 5);
  
  return Math.min(100, avgScore + diversityBonus);
}

// ── SMART CONTENT SCORING SYSTEM ───────────────────────────────────────────
export function calculateContentScore(content: string, platform: string, niche?: string): any {
  const hook = extractHook(content);
  const hookType = classifyHookType(hook);
  const structure = analyzeContentStructure(content, platform);
  const patterns = detectViralPatterns(content);
  
  // 1. Hook Strength (0-25 points)
  let hookScore = 0;
  if (hook.length > 10) hookScore += 10;
  if (hook.length > 30) hookScore += 5;
  
  // Check if hook matches viral patterns
  const viralHooks = VIRAL_HOOKS[hookType as keyof typeof VIRAL_HOOKS] || [];
  const hookSimilarity = viralHooks.reduce((max, vh) => {
    const sim = calculateSimilarity(hook.toLowerCase(), vh.hook.toLowerCase());
    return Math.max(max, sim);
  }, 0);
  hookScore += hookSimilarity * 10;
  
  // 2. Pattern Density (0-30 points)
  const patternScore = Math.min(30, patterns.count * 6);
  
  // 3. Structure Quality (0-25 points)
  let structureScore = 0;
  const hasHook = structure.includes("Hook");
  const hasCTA = structure.includes("CTA");
  const hasValue = structure.includes("Solution") || structure.includes("Steps") || structure.includes("Proof");
  
  if (hasHook) structureScore += 10;
  if (hasCTA) structureScore += 10;
  if (hasValue) structureScore += 5;
  
  // 4. CTA Effectiveness (0-10 points)
  const lower = content.toLowerCase();
  let ctaScore = 0;
  if (/\b(comment|dm|save|share|follow)\b/.test(lower)) ctaScore += 5;
  if (/\b(link in bio|swipe|tag)\b/.test(lower)) ctaScore += 3;
  if (/\b(only|limited|last chance)\b/.test(lower)) ctaScore += 2;
  
  // 5. Engagement Triggers (0-10 points)
  let triggerScore = 0;
  for (const trigger of ENGAGEMENT_TRIGGERS) {
    if (lower.includes(trigger.trigger.toLowerCase().split(" ")[0])) {
      triggerScore += 2;
    }
  }
  triggerScore = Math.min(10, triggerScore);
  
  // Calculate total score
  const totalScore = Math.round(hookScore + patternScore + structureScore + ctaScore + triggerScore);
  
  // Compare to viral benchmarks
  const viralBenchmark = 85; // Top 1% viral content scores 85+
  const goodBenchmark = 70; // Good content scores 70+
  const averageBenchmark = 50; // Average content scores 50+
  
  let rating = "Needs Work";
  let color = "#f87171";
  if (totalScore >= viralBenchmark) {
    rating = "Viral Potential";
    color = "#d4b461";
  } else if (totalScore >= goodBenchmark) {
    rating = "Strong";
    color = "#34d399";
  } else if (totalScore >= averageBenchmark) {
    rating = "Good";
    color = "#60a5fa";
  }
  
  // Generate specific improvements
  const improvements = generateScoreImprovements({
    hookScore,
    patternScore,
    structureScore,
    ctaScore,
    triggerScore,
    hook,
    hookType,
    structure,
    patterns,
    platform,
    niche
  });
  
  return {
    totalScore,
    maxScore: 100,
    rating,
    color,
    breakdown: {
      hookStrength: { score: Math.round(hookScore), max: 25, percentage: Math.round((hookScore / 25) * 100) },
      patternDensity: { score: Math.round(patternScore), max: 30, percentage: Math.round((patternScore / 30) * 100) },
      structureQuality: { score: Math.round(structureScore), max: 25, percentage: Math.round((structureScore / 25) * 100) },
      ctaEffectiveness: { score: Math.round(ctaScore), max: 10, percentage: Math.round((ctaScore / 10) * 100) },
      engagementTriggers: { score: Math.round(triggerScore), max: 10, percentage: Math.round((triggerScore / 10) * 100) }
    },
    benchmarks: {
      viral: viralBenchmark,
      good: goodBenchmark,
      average: averageBenchmark,
      yourScore: totalScore,
      percentile: calculatePercentile(totalScore)
    },
    improvements,
    patterns: patterns.detected,
    missingPatterns: patterns.missingPatterns
  };
}

function calculatePercentile(score: number): number {
  // Based on distribution of content scores
  if (score >= 85) return 99;
  if (score >= 75) return 90;
  if (score >= 65) return 75;
  if (score >= 55) return 50;
  if (score >= 45) return 25;
  return 10;
}

function generateScoreImprovements(data: any): any[] {
  const improvements: any[] = [];
  
  // Hook improvements
  if (data.hookScore < 20) {
    const viralHooks = getViralHookSuggestions(data.hookType, data.platform, data.niche);
    improvements.push({
      category: "Hook Strength",
      priority: "high",
      currentScore: Math.round(data.hookScore),
      maxScore: 25,
      issue: "Your hook is weak and won't stop the scroll",
      fix: "Use a proven viral hook pattern",
      expectedIncrease: "+12-15 points",
      examples: viralHooks.slice(0, 3).map((h: any) => h.hook)
    });
  }
  
  // Pattern improvements
  if (data.patternScore < 20) {
    improvements.push({
      category: "Pattern Density",
      priority: "high",
      currentScore: Math.round(data.patternScore),
      maxScore: 30,
      issue: `Only ${data.patterns.count} viral patterns detected - need at least 3-4`,
      fix: "Add more viral patterns to your content",
      expectedIncrease: "+10-18 points",
      examples: data.patterns.missingPatterns.slice(0, 3).map((p: any) => `${p.name}: ${p.examples[0]}`)
    });
  }
  
  // Structure improvements
  if (data.structureScore < 20) {
    const platformStructures = getStructureSuggestions(data.platform);
    improvements.push({
      category: "Structure Quality",
      priority: "medium",
      currentScore: Math.round(data.structureScore),
      maxScore: 25,
      issue: "Your content structure doesn't follow viral patterns",
      fix: "Use a proven viral structure",
      expectedIncrease: "+8-12 points",
      examples: platformStructures.slice(0, 3).map((s: any) => s.structure)
    });
  }
  
  // CTA improvements
  if (data.ctaScore < 7) {
    improvements.push({
      category: "CTA Effectiveness",
      priority: "medium",
      currentScore: Math.round(data.ctaScore),
      maxScore: 10,
      issue: "Weak or missing call-to-action",
      fix: "Add a clear, compelling CTA",
      expectedIncrease: "+5-8 points",
      examples: ["Comment 'YES' for the full guide", "Save this for later", "DM me 'READY' to get started"]
    });
  }
  
  // Engagement trigger improvements
  if (data.triggerScore < 6) {
    improvements.push({
      category: "Engagement Triggers",
      priority: "low",
      currentScore: Math.round(data.triggerScore),
      maxScore: 10,
      issue: "Missing engagement triggers",
      fix: "Add elements that drive engagement",
      expectedIncrease: "+4-6 points",
      examples: ["Ask a question", "Use 'Comment [word]' CTA", "Show before/after results"]
    });
  }
  
  return improvements;
}

// ── GET VIRAL BREAKDOWN DATABASE ───────────────────────────────────────────
export function getViralBreakdowns(filters?: {
  platform?: string;
  niche?: string;
  minViralScore?: number;
  limit?: number;
}): any[] {
  let breakdowns = [...VIRAL_BREAKDOWNS];
  
  if (filters?.platform) {
    breakdowns = breakdowns.filter(b => b.platform === filters.platform);
  }
  
  if (filters?.niche) {
    breakdowns = breakdowns.filter(b => b.niche === filters.niche);
  }
  
  if (filters?.minViralScore) {
    breakdowns = breakdowns.filter(b => b.viralScore >= filters.minViralScore);
  }
  
  // Sort by viral score
  breakdowns.sort((a, b) => b.viralScore - a.viralScore);
  
  if (filters?.limit) {
    breakdowns = breakdowns.slice(0, filters.limit);
  }
  
  return breakdowns;
}

// ── SEARCH VIRAL BREAKDOWNS ────────────────────────────────────────────────
export function searchViralBreakdowns(query: string): any[] {
  const lower = query.toLowerCase();
  
  return VIRAL_BREAKDOWNS.filter(b => {
    return (
      b.content.toLowerCase().includes(lower) ||
      b.niche.toLowerCase().includes(lower) ||
      b.patternAnalysis.hookType.toLowerCase().includes(lower) ||
      b.whyItWentViral.some(reason => reason.toLowerCase().includes(lower))
    );
  }).sort((a, b) => b.viralScore - a.viralScore);
}

export default {
  calculateViralScore,
  extractHook,
  classifyHookType,
  analyzeContentStructure,
  processPerformanceFeedback,
  analyzeBrandVoice,
  buildTrainingPrompt,
  getViralHookSuggestions,
  getStructureSuggestions,
  getCTASuggestions,
  getNicheInsights,
  getViralFormulas,
  getPlatformBestPractices,
  generateSmartSuggestions,
  detectViralPatterns,
  calculateContentScore,
  getViralBreakdowns,
  searchViralBreakdowns,
};
