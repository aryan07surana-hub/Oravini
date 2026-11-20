// Run: npm test   (node:test via tsx — no extra dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WIZARD_STEP_COUNT, blankWizardState, normalizeWizardState, parseSavedWizardState, shouldPersistWizardState,
} from "../client/src/components/webinar-funnel/wizardState";

test("regression: completed wizard (saved step 5) starts fresh instead of crashing", () => {
  const saved = JSON.stringify({ ...blankWizardState(), step: 5, title: "Old webinar", createdId: "abc" });
  assert.equal(parseSavedWizardState(saved), null);
});

test("steps past the end are never restored", () => {
  for (const step of [WIZARD_STEP_COUNT, WIZARD_STEP_COUNT + 1, 99]) {
    assert.equal(normalizeWizardState({ step }), null, `step ${step}`);
  }
});

test("in-range steps are kept, including the last one", () => {
  for (let step = 0; step < WIZARD_STEP_COUNT; step++) {
    assert.equal(normalizeWizardState({ step })?.step, step);
  }
});

test("bad step values are clamped into the valid range", () => {
  assert.equal(normalizeWizardState({ step: -3 })?.step, 0);
  assert.equal(normalizeWizardState({ step: 2.7 })?.step, 2);
  assert.equal(normalizeWizardState({ step: "3" })?.step, 3);
  assert.equal(normalizeWizardState({ step: "nope" })?.step, 0);
  assert.equal(normalizeWizardState({})?.step, 0);
});

test("saved fields are kept and missing fields get defaults", () => {
  const s = normalizeWizardState({ step: 2, youtube: "https://youtu.be/x", title: "T" })!;
  assert.equal(s.youtube, "https://youtu.be/x");
  assert.equal(s.title, "T");
  assert.equal(s.durationMinutes, 60);
  assert.deepEqual(s.checks2, [false, false, false, false]);
});

test("garbage input starts fresh", () => {
  assert.equal(parseSavedWizardState(null), null);
  assert.equal(parseSavedWizardState("{not json"), null);
  assert.equal(parseSavedWizardState("[1,2]"), null);
  assert.equal(parseSavedWizardState("null"), null);
});

test("finished state is not persisted; in-progress state is", () => {
  assert.equal(shouldPersistWizardState({ ...blankWizardState(), step: WIZARD_STEP_COUNT }), false);
  assert.equal(shouldPersistWizardState({ ...blankWizardState(), step: WIZARD_STEP_COUNT - 1 }), true);
});
