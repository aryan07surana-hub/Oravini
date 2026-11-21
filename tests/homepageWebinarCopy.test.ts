/**
 * Run: npm test   (node:test via tsx — no extra dependencies)
 *
 * Webinar email/SMS delivery is switched off (server/webinarOutboundDisabled.ts),
 * so the marketing homepage must not promise reminders that are never sent.
 *
 * This guards the two places that previously made that claim — the toolkit grid
 * blurb and the two-column feature-detail card (its description sentence and its
 * bullet list) — and is written against the file's text so it keeps holding if the
 * copy is reworded or the components are restructured.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const LANDING = new URL("../client/src/pages/OraviniLanding.tsx", import.meta.url);
const src = readFileSync(LANDING, "utf8");

/** The webinar copy only — so an unrelated email feature elsewhere isn't flagged. */
function webinarBlocks(): string[] {
  const blocks: string[] = [];
  const re = /title:\s*"Live Webinars"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // The surrounding object literal: back to the opening brace, forward past bullets.
    const start = src.lastIndexOf("{", m.index);
    const end = src.indexOf("},", m.index);
    blocks.push(src.slice(start, end === -1 ? m.index + 600 : end));
  }
  return blocks;
}

test("homepage has both Live Webinars blocks (toolkit grid + feature card)", () => {
  assert.equal(webinarBlocks().length, 2, "expected exactly two Live Webinars blocks");
});

test("no Live Webinars block promises email or SMS reminders", () => {
  for (const [i, block] of webinarBlocks().entries()) {
    assert.doesNotMatch(block, /email reminder/i, `block ${i}: "email reminder" promise returned`);
    assert.doesNotMatch(block, /\bSMS\b(?!\s+is sent)/i, `block ${i}: SMS sending promise returned`);
    // The specific cadence that used to be advertised, in prose and as a bullet.
    assert.doesNotMatch(block, /24h/i, `block ${i}: 24h reminder cadence returned`);
    assert.doesNotMatch(block, /10\s*min/i, `block ${i}: 10-minute reminder cadence returned`);
    assert.doesNotMatch(block, /before go-time/i, `block ${i}: pre-start reminder promise returned`);
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
