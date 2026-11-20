// Pure helpers for restoring the setup wizard from localStorage (no React, so they're unit-testable).

/** Number of steps in the wizard (STEPS in WebinarSetupWizard). Index `WIZARD_STEP_COUNT` means "finished". */
export const WIZARD_STEP_COUNT = 5;

/** Clamps any value to a valid step index 0..count-1 (NaN/negative → 0). */
export function clampWizardStep(step: unknown, count = WIZARD_STEP_COUNT): number {
  const n = Math.trunc(Number(step));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, count - 1);
}

/**
 * Parses persisted wizard state. Returns null (→ start fresh) when nothing usable
 * is stored, or when the stored wizard was already finished: after publishing,
 * the state used to be re-persisted with step = 5, and reopening the wizard read
 * STEPS[5] (undefined) and crashed. Any other step is clamped into range.
 */
export function restoreWizardState<T extends { step: number }>(raw: string | null, blank: () => T, count = WIZARD_STEP_COUNT): T | null {
  if (!raw) return null;
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (Number(parsed.step) >= count) return null;
  return { ...blank(), ...parsed, step: clampWizardStep(parsed.step, count) };
}
