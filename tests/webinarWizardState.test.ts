// Run with: npm test
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { WIZARD_STEP_COUNT, clampWizardStep, restoreWizardState } from "../client/src/components/webinar-funnel/wizardState";

const blank = () => ({ step: 0, title: "", createdId: null as string | null });

describe("wizard step restore (fix for: Cannot read properties of undefined (reading 'short'))", () => {
  test("a finished wizard (step 5) restores as fresh instead of an out-of-range step", () => {
    const raw = JSON.stringify({ step: 5, title: "Old webinar", createdId: "wf_old" });
    assert.equal(restoreWizardState(raw, blank), null);
  });

  test("valid steps are restored as-is", () => {
    const s = restoreWizardState(JSON.stringify({ step: 3, title: "T" }), blank)!;
    assert.equal(s.step, 3);
    assert.equal(s.title, "T");
  });

  test("garbage steps are clamped into 0..4", () => {
    for (const bad of [-2, "abc", null, 2.7]) {
      const s = restoreWizardState(JSON.stringify({ step: bad }), blank)!;
      assert.ok(s.step >= 0 && s.step < WIZARD_STEP_COUNT, `step ${bad} → ${s.step}`);
    }
    assert.equal(clampWizardStep(99), WIZARD_STEP_COUNT - 1);
    assert.equal(clampWizardStep(Number.NaN), 0);
    assert.equal(clampWizardStep(2.7), 2);
  });

  test("missing or corrupt storage starts fresh", () => {
    assert.equal(restoreWizardState(null, blank), null);
    assert.equal(restoreWizardState("{not json", blank), null);
    assert.equal(restoreWizardState("[1,2]", blank), null);
  });
});
