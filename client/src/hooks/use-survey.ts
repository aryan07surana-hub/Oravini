import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export interface SurveyData {
  // Q0 — awareness level
  awareness: string;
  // Q1 — niche/field (primary + array)
  niche: string;
  fields: string[];
  // Q2 — struggles
  struggles: string[];
  topStruggle: string;
  // Q3 — content types
  contentTypes: string[];
  // Q4 — descriptor
  descriptor: string;
  // Q5 — experience
  experience: string;
  // Q6 — follower count
  followerCount: string;
  // Q7 — monthly revenue
  monthlyRevenue: string;
  // Q8 — primary goal
  primaryGoal: string;
  // Q9 — platforms
  platforms: string[];
  primaryPlatform: string;
  // Q10 — heard about
  heardAbout: string[];
  // Derived helpers
  isBeginnerLevel: boolean;
  isMonetised: boolean;
  preferShortForm: boolean;
  preferLongForm: boolean;
  goalLabel: string;
  hasData: boolean;
}

const GOAL_LABEL_MAP: Record<string, string> = {
  "Grow my audience fast": "grow",
  "Land brand deals & sponsorships": "leads",
  "Sell digital products or courses": "sales",
  "Replace my 9–5 income": "sales",
  "Build a loyal community": "community",
  "Become a full-time content creator": "authority",
  "All of the above": "grow",
};

const PLATFORM_NORM: Record<string, string> = {
  "Instagram": "instagram",
  "YouTube": "youtube",
  "TikTok": "tiktok",
  "LinkedIn": "linkedin",
  "Twitter / X": "twitter",
  "Pinterest": "pinterest",
  "Threads": "threads",
  "Facebook": "facebook",
};

export function useSurvey(): SurveyData {
  const { user } = useAuth();
  const u = user as any;

  const { data: surveyData } = useQuery<any>({
    queryKey: ["/api/user/onboarding-status"],
    enabled: !!u?.id,
    staleTime: Infinity,
  });

  const survey = surveyData?.survey;

  // Pull from user object (already merged by server) or raw survey
  const fields: string[] = u?.fields || survey?.fields || [];
  const struggles: string[] = u?.struggles || survey?.struggles || [];
  const contentTypes: string[] = u?.contentTypes || survey?.content_types || [];
  const platforms: string[] = u?.platforms || survey?.platforms || [];
  const heardAbout: string[] = u?.heardAbout || survey?.heard_about || [];

  const niche = fields.length > 0 ? fields[0] : "";
  const topStruggle = struggles[0] || "";
  const primaryPlatform = platforms.length > 0
    ? (PLATFORM_NORM[platforms[0]] || platforms[0].toLowerCase())
    : "instagram";

  const awareness: string = u?.awareness || survey?.awareness || "";
  const descriptor: string = u?.descriptor || survey?.descriptor || "";
  const experience: string = u?.experience || survey?.experience || "";
  const followerCount: string = u?.followerCount || survey?.follower_count || "";
  const monthlyRevenue: string = u?.monthlyRevenue || survey?.monthly_revenue || "";
  const primaryGoal: string = u?.primaryGoal || survey?.primary_goal || "";

  const isBeginnerLevel =
    awareness.includes("beginner") ||
    awareness.includes("basics") ||
    experience.includes("less than 1 month") ||
    experience.includes("Less than 6 months");

  const isMonetised = !monthlyRevenue.includes("$0") && monthlyRevenue !== "";

  const preferShortForm = contentTypes.some(c =>
    c.toLowerCase().includes("short") || c.toLowerCase().includes("reel") || c.toLowerCase().includes("tiktok")
  );

  const preferLongForm = contentTypes.some(c =>
    c.toLowerCase().includes("long") || c.toLowerCase().includes("youtube") || c.toLowerCase().includes("podcast")
  );

  const goalLabel = GOAL_LABEL_MAP[primaryGoal] || "grow";

  const hasData = fields.length > 0 || struggles.length > 0 || !!primaryGoal;

  return {
    awareness,
    niche,
    fields,
    struggles,
    topStruggle,
    contentTypes,
    descriptor,
    experience,
    followerCount,
    monthlyRevenue,
    primaryGoal,
    platforms,
    primaryPlatform,
    heardAbout,
    isBeginnerLevel,
    isMonetised,
    preferShortForm,
    preferLongForm,
    goalLabel,
    hasData,
  };
}
