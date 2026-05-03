export type UserTier = "free" | "pro" | "enterprise";

export type User = {
  id: string;
  email: string;
  tier: UserTier;
  hasVideoMarketing: boolean;
};

export const canUseVideoMarketing = (user: User | null): boolean => {
  if (!user) return false;
  return user.hasVideoMarketing && (user.tier === "pro" || user.tier === "enterprise");
};

export const canSeeVideoMarketing = (user: User | null): boolean => {
  if (!user) return true; // Public can see landing page
  return true; // All logged-in users can see it
};

export const getVideoMarketingAccess = (user: User | null) => {
  return {
    canUse: canUseVideoMarketing(user),
    canSee: canSeeVideoMarketing(user),
    reason: !user
      ? "Sign up to access"
      : !user.hasVideoMarketing
        ? "Upgrade to unlock"
        : user.tier === "free"
          ? "Upgrade to Pro or Enterprise"
          : null,
  };
};
