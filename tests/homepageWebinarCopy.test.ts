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
  assert.match(all, /No webinar email or SMS is sent/i, "card should state that no webinar email or SMS is sent");
  assert.match(all, /YouTube/i, "card should name the YouTube live channel requirement");
  // Community links are their own card on this page, so check at page level.
  assert.match(tierGateSrc, /community links/i, "optional community links should be described somewhere on the page");
});

// ── Video Marketing tier gate: whole-page sales-copy honesty ───────────────
// Delivery is off and AI generation is preview-only, so the whole page (not
// just the webinar card) must avoid promising sends, automatic recording,
// browser-camera broadcasting, or performance/outcome figures we cannot source.
test("tier gate page promises no automated webinar delivery anywhere", () => {
  for (const claim of [
    /reminder emails/i,
    /email sequence/i,
    /follow-up emails?/i,
    /replay delivery/i,
    /cross-session email/i,
    /email reminders? (&|and) sequences/i,
    /sent automatically/i,
  ]) {
    assert.doesNotMatch(tierGateSrc, claim, `tier gate still promises delivery: ${claim}`);
  }
});

test("tier gate makes no automatic-recording or in-browser broadcast claim", () => {
  for (const claim of [
    /automatically recorded/i,
    /auto-saved/i,
    /every session is automatically/i,
    /run your live session directly inside the platform/i,
  ]) {
    assert.doesNotMatch(tierGateSrc, claim, `tier gate still claims: ${claim}`);
  }
  // It should instead be explicit about where the stream and archive live.
  assert.match(tierGateSrc, /YouTube Studio|encoder/i, "should say the stream runs via YouTube Studio or an encoder");
  assert.match(tierGateSrc, /recorded by YouTube/i, "should attribute recording to YouTube");
  assert.match(tierGateSrc, /processing/i, "should note archive processing affects availability");
});

test("tier gate publishes no unsourced performance or outcome figures", () => {
  for (const claim of [
    /avg\.? vsl watch-through/i,
    /watch-through rate["',]/i,
    /push conversion rates?/i,
    /conversion rates? past/i,
    /higher conversion/i,
    /show-up rate/i,
    /open rate/i,
    /registrant-to-buyer/i,
    /Higher Conversion vs Static Pages/i,
    /Powerful Video Tools/i,
    /high-converting/i,
    /in under \d+ minutes/i,
    /infinite conversion/i,
  ]) {
    assert.doesNotMatch(tierGateSrc, claim, `tier gate still asserts: ${claim}`);
  }
});

test("tier gate presents AI generation as preview-only, not guaranteed extraction", () => {
  assert.match(tierGateSrc, /preview-only/i, "AI should be described as preview-only");
  assert.doesNotMatch(tierGateSrc, /extracts the highest-value/i, "guaranteed AI extraction claim returned");
  assert.doesNotMatch(tierGateSrc, /viral short clips/i, "viral clip guarantee returned");
});

test("tier gate prices and entitlement numbers are untouched", () => {
  for (const kept of ['"+$20"', '"$59"', '"$99"', "3 live webinars per month", "500 AI credits / month", "Video hosting — 5 videos"]) {
    assert.ok(tierGateSrc.includes(kept), `pricing/entitlement text must be preserved: ${kept}`);
  }
});

// ── YouTube section placement and purpose ──────────────────────────────────
/** The full YouTube webinar section markup, from its opening tag to its close. */
function youtubeSection(): string {
  const start = src.indexOf('id="youtube-webinars"');
  assert.notEqual(start, -1, "youtube-webinars section should exist");
  const end = src.indexOf("</section>", start);
  assert.notEqual(end, -1, "youtube-webinars section should be closed");
  return src.slice(start, end);
}

test("youtube webinar section comes before generic marketing sections", () => {
  const youtubeAt = src.indexOf('id="youtube-webinars"');
  for (const marker of ["WHAT IS ORAVINI", 'id="features-section"', 'id="pricing"']) {
    const at = src.indexOf(marker);
    assert.notEqual(at, -1, `${marker} should exist`);
    assert.ok(youtubeAt < at, `youtube-webinars should precede ${marker}`);
  }
});

test("youtube webinar section states its purpose and features", () => {
  const section = youtubeSection();
  assert.match(section, /business software for creators and coaches/i, "purpose should be stated up front");
  for (const feature of [
    /webinar registration/i,
    /video pages/i,
    /attendee CRM/i,
    /community links/i,
    /YouTube scheduler/i,
    /channel you choose/i,
    /broadcast/i,
    /stream health/i,
    /archive|replay/i,
    /uploads to your channel/i,
  ]) {
    assert.match(section, feature, `section should mention ${feature}`);
  }
});

test("youtube webinar section explains Google data use and intended use", () => {
  const section = youtubeSection();
  assert.match(section, /Google data/i, "should name Google data");
  assert.match(section, /used only to provide these connected features/i, "should limit data use to connected features");
  assert.match(section, /do not sell/i, "should state data is not sold");
  assert.match(section, /advertising targeting/i, "should exclude advertising targeting");
  assert.match(section, /general AI training/i, "should exclude general AI training");
  assert.match(section, /not a service for sharing intimate imagery/i, "should state intended-use limits");
  assert.match(section, /non-consensual intimate imagery is prohibited/i, "should prohibit NCII");
});

test("youtube webinar section links privacy and terms", () => {
  const section = youtubeSection();
  assert.match(section, /href="\/privacy"/, "should link the privacy policy");
  assert.match(section, /href="\/terms"/, "should link the terms of service");
});
