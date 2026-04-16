export const PLAN_CONFIG = {
  free:    { label: "Free",    credits: 5,     color: "#71717a", nextPlan: "starter" },
  starter: { label: "Starter", credits: 150,   color: "#60a5fa", nextPlan: "growth"  },
  growth:  { label: "Growth",  credits: 350,   color: "#a78bfa", nextPlan: "pro"     },
  pro:     { label: "Pro",     credits: 700,   color: "#34d399", nextPlan: null       },
  elite:   { label: "Elite",   credits: 99999, color: "#d4b461", nextPlan: null       },
} as const;

export const ACTION_COSTS: Record<string, { cost: number; label: string; level: "light" | "medium" | "heavy" }> = {
  ai_ideas:    { cost: 2,  label: "AI Content Ideas",    level: "light"  },
  ai_coach:    { cost: 2,  label: "AI Coach",            level: "light"  },
  carousel:    { cost: 3,  label: "Carousel",            level: "light"  },
  ai_report:   { cost: 8,  label: "Content Report",      level: "medium" },
  competitor:  { cost: 10, label: "Competitor Analysis", level: "heavy"  },
  lead_magnet: { cost: 5,  label: "Lead Magnet",         level: "medium" },
  story_gen:   { cost: 3,  label: "Story Generator",     level: "light"  },
  icp:         { cost: 4,  label: "ICP Builder",         level: "light"  },
  sop:         { cost: 4,  label: "SOP Generator",       level: "light"  },
  brand_kit:   { cost: 5,  label: "Brand Kit",           level: "medium" },
  video:       { cost: 20, label: "Video Editing",       level: "heavy"  },
  clip_finder: { cost: 10, label: "Clip Finder",         level: "heavy"  },
  jarvis:      { cost: 2,  label: "Jarvis AI",           level: "light"  },
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
