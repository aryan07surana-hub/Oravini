/**
 * Run: npm test   (node:test via tsx — no extra dependencies)
 *
 * Webinar email/SMS delivery is switched off (server/webinarOutboundDisabled.ts),
 * so the marketing homepage must not promise reminders that are never sent.
 *
 * This guards the places that previously made that claim — on the marketing
 * homepage, the toolkit grid blurb and the two-column feature-detail card (its
 * description sentence and its bullet list); and in the Video Marketing tier
 * gate, the Live Webinars feature card. It is written against each file's text
 * so it keeps holding if the copy is reworded or the components restructured.
 *
 * Scope is deliberately narrow: only blocks titled "Live Webinars" are checked,
 * so unrelated email features elsewhere on those screens are not flagged.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const LANDING = new URL("../client/src/pages/OraviniLanding.tsx", import.meta.url);
const TIER_GATE = new URL("../client/src/components/video-marketing/TierGate.tsx", import.meta.url);
const src = readFileSync(LANDING, "utf8");
const tierGateSrc = readFileSync(TIER_GATE, "utf8");

/** The webinar copy only — so an unrelated email feature elsewhere isn't flagged. */
function webinarBlocksIn(source: string): string[] {
  const blocks: string[] = [];
  const re = /title:\s*"Live Webinars"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    // The surrounding object literal: back to the opening brace, forward past bullets.
    const start = source.lastIndexOf("{", m.index);
    const end = source.indexOf("},", m.index);
    blocks.push(source.slice(start, end === -1 ? m.index + 600 : end));
  }
  return blocks;
}

const webinarBlocks = () => webinarBlocksIn(src);
const tierGateWebinarBlocks = () => webinarBlocksIn(tierGateSrc);

/** Shared check: a Live Webinars block must not advertise reminders we never send. */
function assertNoReminderPromise(block: string, label: string) {
  assert.doesNotMatch(block, /email reminder/i, `${label}: "email reminder" promise returned`);
  assert.doesNotMatch(block, /\bSMS\b(?!\s+is sent)/i, `${label}: SMS sending promise returned`);
  assert.doesNotMatch(block, /24h/i, `${label}: 24h reminder cadence returned`);
  assert.doesNotMatch(block, /10\s*min/i, `${label}: 10-minute reminder cadence returned`);
  assert.doesNotMatch(block, /before go-time/i, `${label}: pre-start reminder promise returned`);
}

test("homepage has both Live Webinars blocks (toolkit grid + feature card)", () => {
  assert.equal(webinarBlocks().length, 2, "expected exactly two Live Webinars blocks");
});

test("no Live Webinars block promises email or SMS reminders", () => {
  for (const [i, block] of webinarBlocks().entries()) {
    assertNoReminderPromise(block, `homepage block ${i}`);
  }
});

test("Live Webinars copy describes what actually happens instead", () => {
  const blocks = webinarBlocks();
  const all = blocks.join("\n");
  assert.match(all, /registration page/i, "registration pages should still be described");
  assert.match(all, /group links/i, "optional post-signup group links should be described");
  assert.match(all, /attendee CRM/i, "attendee CRM should still be described");
  // The feature card states the absence of sending outright.
  assert.ok(
    blocks.some(b => /No webinar email or SMS is sent/i.test(b)),
    "a Live Webinars block should state that no webinar email or SMS is sent",
  );
});

// ── Video Marketing tier gate ───────────────────────────────────────────────
test("tier gate has its Live Webinars feature card", () => {
  assert.equal(tierGateWebinarBlocks().length, 1, "expected one Live Webinars card in TierGate");
});

test("tier gate Live Webinars card promises no email or SMS reminders", () => {
  for (const [i, block] of tierGateWebinarBlocks().entries()) {
    assertNoReminderPromise(block, `tier gate card ${i}`);
  }
});

test("tier gate Live Webinars card describes what actually happens", () => {
  const all = tierGateWebinarBlocks().join("\n");
  assert.match(all, /registration page/i, "registration pages should still be described");
  assert.match(all, /community links/i, "optional post-signup community links should be described");
  assert.match(all, /No webinar email or SMS is sent/i, "card should state that no webinar email or SMS is sent");
});
