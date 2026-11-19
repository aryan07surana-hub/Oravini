// Single source of truth for Competitor Study / Methodology credit costs.
// The server deducts exactly these amounts and the UI badges read the same
// constants, so a badge can no longer drift from what is actually charged.
export const COMPETITOR_CREDIT_COSTS = {
  deepAnalysis: 12,        // POST /api/competitor/analyze
  compareReels: 5,         // POST /api/competitor/compare-reels
  stealStrategy: 10,       // POST /api/competitor/steal-strategy
  feedIdeas: 3,            // POST /api/competitor/feed/:postId/generate-ideas
  methodologyAnalyze: 7,   // POST /api/methodology/analyze (Content DNA)
  methodologyImprove: 2,   // POST /api/methodology/improve
} as const;

// Plans allowed to run the deep Competitor Analysis (marketed as Growth+).
export const COMPETITOR_ANALYSIS_PLANS = ["growth", "pro", "elite"] as const;

export function canUseCompetitorAnalysis(user: { role?: string | null; plan?: string | null } | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (COMPETITOR_ANALYSIS_PLANS as readonly string[]).includes(String(user.plan || "free"));
}
