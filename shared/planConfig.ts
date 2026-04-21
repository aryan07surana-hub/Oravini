export const PLAN_CONFIG = {
  free:    { label: "Free",    credits: 20,    color: "#71717a", nextPlan: "starter" },
  starter: { label: "Starter", credits: 100,   color: "#60a5fa", nextPlan: "growth"  },
  growth:  { label: "Growth",  credits: 250,   color: "#a78bfa", nextPlan: "pro"     },
  pro:     { label: "Pro",     credits: 500,   color: "#34d399", nextPlan: null       },
  elite:   { label: "Elite",   credits: 99999, color: "#d4b461", nextPlan: null       },
} as const;

export const ACTION_COSTS: Record<string, { cost: number; label: string; level: "light" | "medium" | "heavy" }> = {
  ai_ideas:           { cost: 5,  label: "AI Content Ideas",       level: "light"  },
  ai_coach:           { cost: 2,  label: "AI Coach",               level: "light"  },
  carousel:           { cost: 5,  label: "Carousel",               level: "medium" },
  carousel_image:     { cost: 3,  label: "Carousel Image",         level: "light"  },
  ai_report:          { cost: 8,  label: "Content Report",         level: "medium" },
  competitor:         { cost: 12, label: "Competitor Analysis",    level: "heavy"  },
  competitor_reels:   { cost: 5,  label: "Reel Comparison",        level: "medium" },
  steal_strategy:     { cost: 10, label: "Steal Strategy",         level: "heavy"  },
  niche_analysis:     { cost: 12, label: "Niche Intelligence",     level: "heavy"  },
  methodology:        { cost: 7,  label: "Content DNA",            level: "medium" },
  lead_magnet:        { cost: 6,  label: "Lead Magnet",            level: "medium" },
  story:              { cost: 2,  label: "Story Generator",        level: "light"  },
  icp:                { cost: 6,  label: "ICP Builder",            level: "medium" },
  sop:                { cost: 7,  label: "SOP Generator",          level: "medium" },
  brand_kit:          { cost: 6,  label: "Brand Kit",              level: "medium" },
  audience_psychology:{ cost: 6,  label: "Audience Psychology",    level: "medium" },
  content_planner:    { cost: 7,  label: "Content Planner",        level: "medium" },
  video_editor:       { cost: 2,  label: "Video Editor",           level: "light"  },
  clip_finder:        { cost: 5,  label: "Clip Finder",            level: "medium" },
  virality:           { cost: 4,  label: "Virality Tester",        level: "light"  },
  virality_hooks:     { cost: 2,  label: "Viral Hooks",            level: "light"  },
  virality_rewrite:   { cost: 2,  label: "Script Rewrite",         level: "light"  },
  virality_angles:    { cost: 3,  label: "Viral Angles",           level: "light"  },
  analyse:            { cost: 4,  label: "Content Analyser",       level: "medium" },
  ig_tracker:         { cost: 1,  label: "IG Tracker Scan",        level: "light"  },
  hashtag_suggestions:{ cost: 1,  label: "Hashtag Suggestions",    level: "light"  },
  jarvis:             { cost: 2,  label: "Jarvis AI",              level: "light"  },
};

export type PlanKey = keyof typeof PLAN_CONFIG;

export function getPlanCredits(plan: string): number {
  return PLAN_CONFIG[plan as PlanKey]?.credits ?? 5;
}

export function getLowCreditThreshold(plan: string): number {
  return Math.ceil(getPlanCredits(plan) * 0.2);
}

export function getNextPlan(plan: string): string | null {
  return (PLAN_CONFIG[plan as PlanKey] as any)?.nextPlan ?? null;
}

export function getPlanLabel(plan: string): string {
  return PLAN_CONFIG[plan as PlanKey]?.label ?? "Free";
}

export function getPlanColor(plan: string): string {
  return PLAN_CONFIG[plan as PlanKey]?.color ?? "#71717a";
}
