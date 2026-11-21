// Run: npm test   (node:test via tsx — no extra dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingPagePath, googleCalendarUrl, isValidCtaUrl } from "../shared/webinarFunnel";

test("CTA links: http(s) URLs and same-site paths are accepted", () => {
  assert.equal(isValidCtaUrl("https://example.com/offer"), true);
  assert.equal(isValidCtaUrl("http://example.com"), true);
  assert.equal(isValidCtaUrl(bookingPagePath("strategy-call")), true);
  assert.equal(isValidCtaUrl("  /book/strategy-call  "), true);
});

test("CTA links: anything that could leave the site or run script is rejected", () => {
  for (const v of ["//evil.com", "/\\evil.com", "javascript:alert(1)", "data:text/html,x", "evil.com", "/book/a b", "", "https://"]) {
    assert.equal(isValidCtaUrl(v), false, v);
  }
});

test("Google Calendar link: UTC dates, duration, encoded text", () => {
  const url = googleCalendarUrl({ title: "Scale & Grow", start: "2026-12-01T14:30:00.000Z", durationMinutes: 90, details: "Join here: https://x.test/w/a" });
  assert.equal(url,
    "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Scale%20%26%20Grow&dates=20261201T143000Z/20261201T160000Z&details=Join%20here%3A%20https%3A%2F%2Fx.test%2Fw%2Fa");
  assert.match(googleCalendarUrl({ title: "t", start: "2026-12-01T14:30:00Z" })!, /dates=20261201T143000Z\/20261201T153000Z$/);
  assert.equal(googleCalendarUrl({ title: "t", start: "nope" }), null);
});
