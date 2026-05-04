export type UserTier = "tier1" | "tier2" | "tier3" | "tier4" | "tier5";

export type User = {
  id: string;
  email: string;
  tier: UserTier;
  hasVideoMarketing: boolean;
};

export const canUseVideoMarketing = (user: User | null): boolean => {
  if (!user) return false;
  return user.hasVideoMarketing && (user.tier === "tier3" || user.tier === "tier4" || user.tier === "tier5");
};

export const canSeeVideoMarketing = (user: User | null): boolean => {
  return true; // Everyone can see the landing page
};

export const getVideoMarketingAccess = (user: User | null) => {
  if (!user) {
    return {
      canUse: false,
      canSee: true,
      reason: "Sign up to access",
    };
  }

  if (user.tier === "tier1" || user.tier === "tier2") {
    return {
      canUse: false,
      canSee: true,
      reason: "Upgrade to Professional (Tier 3) or higher to access Video Marketing",
    };
  }

  if (!user.hasVideoMarketing) {
    if (user.tier === "tier3") {
      return {
        canUse: false,
        canSee: true,
        reason: "Add Video Marketing for +$20/mo",
      };
    }
    if (user.tier === "tier4") {
      return {
        canUse: false,
        canSee: true,
        reason: "Add Video Marketing FREE with your Business plan",
      };
    }
  }

  return {
    canUse: true,
    canSee: true,
    reason: null,
  };
};
