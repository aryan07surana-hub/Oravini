// Webinar setup wizard — persisted progress (pure helpers, no React/DOM so they're unit-testable).

/** Number of wizard steps; valid step indexes are 0..WIZARD_STEP_COUNT-1. */
export const WIZARD_STEP_COUNT = 5;

export type WizardState = {
  step: number;                // 0..4 while in progress
  channelReady: boolean;
  checks1: boolean[];
  streamScheduled: boolean;
  checks2: boolean[];
  youtube: string;
  deckMode: "upload" | "link";
  deckUrl: string;
  ctaText: string;
  ctaUrl: string;
  offerText: string;
  offerPrice: string;
  offerExpiresLocal: string;
  title: string;
  description: string;
  hostName: string;
  scheduledLocal: string;
  durationMinutes: number;
  remindersEnabled: boolean;
  publish: boolean;
  createdId: string | null;
};

export const blankWizardState = (): WizardState => ({
  step: 0, channelReady: false, checks1: [false, false, false], streamScheduled: false, checks2: [false, false, false, false],
  youtube: "", deckMode: "upload", deckUrl: "", ctaText: "", ctaUrl: "", offerText: "", offerPrice: "", offerExpiresLocal: "",
  title: "", description: "", hostName: "", scheduledLocal: "", durationMinutes: 60, remindersEnabled: true, publish: true, createdId: null,
});

/**
 * Turns raw saved progress into a safe state, or null to start fresh.
 *  - step at/after the last index (e.g. 5 = "finished", written by older builds) → null:
 *    the wizard was completed, so a new visit starts over instead of indexing past STEPS.
 *  - missing / non-numeric / negative / fractional step → clamped into 0..WIZARD_STEP_COUNT-1.
 *  - anything that isn't a plain object → null.
 */
export function normalizeWizardState(raw: unknown): WizardState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const merged: WizardState = { ...blankWizardState(), ...(raw as Partial<WizardState>) };
  const n = Number((raw as any).step);
  if (Number.isFinite(n) && n >= WIZARD_STEP_COUNT) return null;
  merged.step = Number.isFinite(n) ? Math.min(WIZARD_STEP_COUNT - 1, Math.max(0, Math.floor(n))) : 0;
  return merged;
}

/** Parses the localStorage string; corrupt JSON → null. */
export function parseSavedWizardState(json: string | null): WizardState | null {
  if (!json) return null;
  try { return normalizeWizardState(JSON.parse(json)); } catch { return null; }
}

/** Only in-progress state is worth saving; a finished wizard must not be resumed. */
export function shouldPersistWizardState(s: WizardState): boolean {
  return s.step >= 0 && s.step < WIZARD_STEP_COUNT;
}
