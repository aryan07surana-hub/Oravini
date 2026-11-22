/**
 * Run: npm test   (node:test via tsx — no extra dependencies)
 *
 * Google review needs the app's purpose to be established from the homepage
 * itself. These checks keep the purpose disclosure visible, near the TOP of the
 * page (before the generic marketing sections, not buried in the footer), and
 * truthful about what connecting a YouTube channel actually does.
 *
 * They assert on the page source so they keep holding if the copy is reworded,
 * and they deliberately do not assert anything about moderation, enforcement or
 * compliance certification, because none of that is implemented.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const LANDING = new URL("../client/src/pages/OraviniLanding.tsx", import.meta.url);
const raw = readFileSync(LANDING, "utf8");
/** JSX wraps prose across lines, so match against whitespace-collapsed text. */
const src = raw.replace(/\s+/g, " ");

const purposeAt = () => src.indexOf('id="what-oravini-is"');
const heroEndAt = () => src.indexOf("{/* ── WHAT IS ORAVINI");   // first generic marketing section
const footerAt = () => src.lastIndexOf("<footer");

test("purpose section exists and is a real, labelled landmark", () => {
  assert.ok(purposeAt() > -1, "homepage must carry the purpose section");
  assert.match(src, /aria-labelledby="what-oravini-is-heading"/, "section must be labelled for assistive tech");
  assert.match(src, /id="what-oravini-is-heading"/, "the heading it points at must exist");
  assert.match(src, /What Oravini is for/i, "purpose heading text");
});

test("purpose section sits near the top — before generic marketing, not in the footer", () => {
  const purpose = purposeAt();
  assert.ok(purpose < heroEndAt(), "purpose must come before the generic 'What is Oravini' marketing section");
  assert.ok(purpose < footerAt(), "purpose must not be in or after the footer");
  // Guard against it drifting down the page over time.
  const ratio = purpose / src.length;
  assert.ok(ratio < 0.5, `purpose section should stay in the first half of the page (was ${(ratio * 100).toFixed(1)}%)`);
});

test("purpose text states what the product is and who it is for", () => {
  for (const claim of [
    /webinar and video business tool/i,
    /creators and coaches/i,
    /registration page/i,
    /community links/i,
    /CRM/,
    /YouTube/,
  ]) {
    assert.match(src, claim, `purpose copy must state: ${claim}`);
  }
});

test("purpose text describes the YouTube connection accurately", () => {
  for (const claim of [
    /optional/i,                                  // connecting is optional
    /channel identity/i,                          // reads identity
    /unlisted livestreams?/i,                     // creates scheduled unlisted broadcasts
    /binds a stream/i,                            // binds stream
    /stream health/i,                             // reads health
    /archive is available/i,                      // reads available archive
    /uploads the videos you choose/i,             // uploads chosen videos
    /YouTube Studio or an external encoder/i,     // camera/audio path
    /eligibility/i,                               // live eligibility affects availability
    /processing time/i,                           // processing affects availability
  ]) {
    assert.match(src, claim, `YouTube disclosure must state: ${claim}`);
  }
  assert.match(src, /camera and audio are never captured by Oravini/i, "must be explicit that Oravini does not capture media");
});

test("purpose text names the single scope and the data-use limits", () => {
  assert.match(src, /youtube\.force-ssl/, "the one requested scope must be named");
  assert.doesNotMatch(src, /youtube\.readonly|youtube\.upload['"]/, "no additional scopes should be advertised");
  assert.match(src, /do not sell your data/i, "must state data is not sold");
  assert.match(src, /advertising or ad targeting/i, "must state no ad targeting");
  assert.match(src, /train generalised AI|train generalized AI/i, "must state no generalised AI training");
});

test("purpose section links privacy and terms visibly", () => {
  const section = src.slice(purposeAt(), heroEndAt());
  assert.match(section, /href="\/privacy"/, "privacy policy must be linked from the purpose section");
  assert.match(section, /href="\/terms"/, "terms must be linked from the purpose section");
});

test("safety line is present and claims no enforcement capability", () => {
  assert.match(src, /not for generating or hosting intimate imagery/i, "safety scope line must be present");
  assert.match(src, /non-consensual intimate imagery is prohibited/i, "prohibition must be stated");
  // We must not claim detection/blocking/certification we have not built.
  for (const overclaim of [
    /we (automatically )?(detect|block|scan|moderate)/i,
    /content moderation system/i,
    /certified compliant/i,
    /guaranteed safe/i,
  ]) {
    assert.doesNotMatch(src, overclaim, `must not claim unimplemented capability: ${overclaim}`);
  }
});
