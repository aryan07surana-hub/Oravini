// Who the visitor is, remembered on their own device so the confirmation pages
// work after a round trip through Whop. Every access is guarded: private mode
// and blocked storage must not break the funnel.
import { isKingTier, type KingTier } from "@shared/kingWebinar";

const KEY = "oravini:king-registration";

export type KingStored = { registrationId?: string; name?: string; email?: string; tier?: KingTier };

export function readKingRegistration(): KingStored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") return null;
    return {
      registrationId: typeof v.registrationId === "string" ? v.registrationId : undefined,
      name: typeof v.name === "string" ? v.name : undefined,
      email: typeof v.email === "string" ? v.email : undefined,
      tier: isKingTier(v.tier) ? v.tier : undefined,
    };
  } catch {
    return null;
  }
}

export function saveKingRegistration(reg: KingStored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(reg));
  } catch {
    /* private mode / storage disabled — the pages fall back to the ?r= link */
  }
}
