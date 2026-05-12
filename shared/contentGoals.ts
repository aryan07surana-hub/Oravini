// ─── Content Goals — Single Source of Truth ────────────────────────────────────
// Used by both client/AIIdeas.tsx and admin/AdminAIIdeas.tsx.
// The `value` strings are prompt-friendly and stored in aiIdeaLogs.goal.
// DO NOT rename existing values — they're referenced in stored logs and SURVEY_GOAL_MAP.

export interface GoalOption {
  /** Prompt-friendly string sent to backend and stored in aiIdeaLogs.goal */
  value: string;
  /** Human label shown in the dropdown */
  label: string;
  /** Optional muted subtitle shown under the label in the dropdown */
  hint?: string;
}

export interface GoalCategory {
  /** Stable slug used as React key */
  key: "core" | "growth" | "sales" | "brand" | "engagement" | "strategy";
  /** Group heading shown in the dropdown */
  label: string;
  /** Emoji shown next to the group heading */
  emoji: string;
  items: readonly GoalOption[];
}

export const GOAL_CATEGORIES: readonly GoalCategory[] = [
  {
    key: "core",
    label: "Core Goals",
    emoji: "⭐",
    items: [
      { value: "grow followers/subscribers fast", label: "Grow Followers / Subscribers" },
      { value: "drive sales and conversions", label: "Drive Sales & Conversions" },
      { value: "boost engagement and comments", label: "Boost Engagement & Comments" },
      { value: "build brand authority and trust", label: "Build Authority & Trust" },
      { value: "go viral and reach new audiences", label: "Go Viral & Reach New Audiences" },
      { value: "educate my audience", label: "Educate My Audience" },
    ],
  },
  {
    key: "growth",
    label: "Growth & Reach",
    emoji: "📈",
    items: [
      { value: "grow email list and newsletter subscribers", label: "Grow Email List / Newsletter Subscribers", hint: "Lead-magnet reels, comment-for-link hooks, link-in-bio funnels" },
      { value: "get more saves and shares", label: "Get Saves & Shares", hint: "Algorithm-rewarded signals; value-packed carousels & cheat-sheets" },
      { value: "increase reach via hashtags and explore page", label: "Increase Reach via Hashtags & Explore", hint: "Trend-riding, broad-appeal hooks" },
      { value: "grow dms and conversations", label: "Grow DMs & Conversations", hint: "'DM me X for Y' CTAs, quiz-style stories" },
      { value: "attract collaborators and creator partnerships", label: "Attract Collaborators & Partnerships", hint: "Collab-bait reels, duet-ready content" },
    ],
  },
  {
    key: "sales",
    label: "Sales & Monetization",
    emoji: "💰",
    items: [
      { value: "launch a new product or offer", label: "Launch a New Product or Offer", hint: "Pre-launch teasers, launch-day carousels, FOMO reels" },
      { value: "promote a sale discount or limited offer", label: "Promote a Sale / Limited Offer", hint: "Urgency-driven reels and story sequences" },
      { value: "drive traffic to website or link in bio", label: "Drive Traffic to Website / Link in Bio", hint: "Click-through hooks, 'full guide in bio' plays" },
      { value: "generate qualified leads and book calls", label: "Generate Leads / Book Calls", hint: "Consultation pitches, free-audit offers" },
      { value: "attract brand deals and sponsorships", label: "Attract Brand Deals & Sponsorships", hint: "Portfolio-grade, brand-safe reels" },
      { value: "sell digital products courses ebooks templates", label: "Sell Digital Products (Courses, Ebooks, Templates)", hint: "Testimonial reels, 'what's inside' carousels" },
      { value: "promote affiliate products", label: "Promote Affiliate Products", hint: "Review carousels, 'my top 5' reels" },
    ],
  },
  {
    key: "brand",
    label: "Brand & Community",
    emoji: "🤝",
    items: [
      { value: "build personal brand and thought leadership", label: "Build Personal Brand / Thought Leadership", hint: "POV reels, industry hot takes" },
      { value: "humanize the brand and show behind the scenes", label: "Humanize the Brand / Behind-the-Scenes", hint: "Founder story, day-in-the-life" },
      { value: "build community and loyalty", label: "Build Community & Loyalty", hint: "Polls, Q&A stories, 'tag someone who' hooks" },
      { value: "showcase client results and testimonials", label: "Showcase Client Results & Testimonials", hint: "Transformation reels, case-study carousels" },
      { value: "establish niche expertise", label: "Establish Niche Expertise", hint: "Myth-busting, framework breakdowns" },
      { value: "celebrate milestones and wins", label: "Celebrate Milestones & Wins", hint: "'We hit X' reels, founder reflections" },
    ],
  },
  {
    key: "engagement",
    label: "Engagement & Retention",
    emoji: "❤️‍🔥",
    items: [
      { value: "boost comments via controversial debate hooks", label: "Boost Comments via Debate Hooks", hint: "Hot-take reels, 'agree or disagree' posts" },
      { value: "increase story replies and poll votes", label: "Increase Story Replies & Poll Votes", hint: "Interactive stickers, 'this or that' stories" },
      { value: "re-engage cold followers", label: "Re-engage Cold Followers", hint: "Reintroduction posts, 'new here?' reels" },
      { value: "get more profile visits", label: "Get More Profile Visits", hint: "Curiosity hooks that force profile clicks" },
    ],
  },
  {
    key: "strategy",
    label: "Content Strategy",
    emoji: "🧠",
    items: [
      { value: "test new content formats", label: "Test New Content Formats", hint: "Experiment reels, 'trying this for 30 days'" },
      { value: "repurpose long-form content", label: "Repurpose Long-Form Content", hint: "Podcast clips, YouTube highlights for Reels" },
      { value: "build a content series", label: "Build a Content Series", hint: "Numbered episodic reels, 'Part 1 of 5' style" },
      { value: "jump on trending audio and trends", label: "Jump on Trending Audio / Trends", hint: "Trend-first ideas with niche angle" },
    ],
  },
] as const;

/** Flat array of all goals — backward-compatible with the old `GOALS` shape */
export const GOALS: readonly GoalOption[] = GOAL_CATEGORIES.flatMap(c => [...c.items]);

/** Runtime check: is this a known goal value? */
export function isValidGoalValue(value: string): boolean {
  return GOALS.some(g => g.value === value);
}

// Dev-time uniqueness guard
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<string>();
  for (const g of GOALS) {
    if (seen.has(g.value)) {
      console.error(`[contentGoals] Duplicate goal value: "${g.value}"`);
    }
    seen.add(g.value);
  }
}
