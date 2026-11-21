// Run: npm test   (node:test via tsx — no extra dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countdownParts, funnelDisplayStatus, formatInZone, relativeStart, viewerLocalStart, zoneOffsetMinutes, HOST_TIME_ZONE,
} from "../client/src/components/webinar-funnel/eventTime";

const AT = Date.parse("2026-12-01T14:30:00.000Z"); // 8:00 pm IST

test("display status mirrors what visitors see", () => {
  assert.equal(funnelDisplayStatus("draft", new Date(AT), AT - 60_000), "draft");
  assert.equal(funnelDisplayStatus("draft", new Date(AT), AT + 60_000), "draft");
  assert.equal(funnelDisplayStatus("published", new Date(AT), AT - 60_000), "scheduled");
  assert.equal(funnelDisplayStatus("published", new Date(AT), AT), "live");
  assert.equal(funnelDisplayStatus("published", new Date(AT), AT + 60_000), "live");
  // Ended stays a replay whether or not the start time has passed.
  assert.equal(funnelDisplayStatus("ended", new Date(AT), AT - 60_000), "ended");
  assert.equal(funnelDisplayStatus("ended", new Date(AT), AT + 60_000), "ended");
});

test("display status: unparseable date falls back to scheduled, never crashes", () => {
  assert.equal(funnelDisplayStatus("published", "not-a-date", AT), "scheduled");
});

test("countdown parts never go negative and roll over correctly", () => {
  assert.deepEqual(countdownParts(-5000), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.deepEqual(countdownParts(0), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  // 2d 3h 4m 5s
  const ms = ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
  assert.deepEqual(countdownParts(ms), { days: 2, hours: 3, minutes: 4, seconds: 5 });
});

test("zone offsets: IST is +330, UTC is 0", () => {
  const d = new Date(AT);
  assert.equal(zoneOffsetMinutes(d, HOST_TIME_ZONE), 330);
  assert.equal(zoneOffsetMinutes(d, "UTC"), 0);
});

test("formatInZone renders the host time in IST and labels it", () => {
  const f = formatInZone(new Date(AT), HOST_TIME_ZONE);
  assert.ok(f);
  assert.equal(f!.zone, "IST");
  assert.match(f!.time, /8:00\s?PM/i);
  assert.match(f!.date, /1 Dec/);
  assert.equal(formatInZone("nope", HOST_TIME_ZONE), null);
});

test("viewer-local start is hidden for IST viewers and shown for others", () => {
  // Same offset as the host zone → no duplicate line on the page.
  assert.equal(viewerLocalStart(new Date(AT), HOST_TIME_ZONE), null);
  assert.equal(viewerLocalStart(new Date(AT), "Asia/Calcutta"), null);
  assert.equal(viewerLocalStart(new Date(AT), null), null);
  const utc = viewerLocalStart(new Date(AT), "UTC");
  assert.ok(utc, "a UTC viewer sees their own time");
  assert.match(utc!.time, /2:30\s?PM/i);
});

test("relativeStart phrases the gap in both directions", () => {
  assert.equal(relativeStart(new Date(AT), AT - 3 * 86_400_000), "Starts in 3 days");
  assert.equal(relativeStart(new Date(AT), AT - (2 * 3600 + 5 * 60) * 1000), "Starts in 2h 5m");
  assert.equal(relativeStart(new Date(AT), AT - 90 * 60 * 1000), "Starts in 1h 30m");
  assert.equal(relativeStart(new Date(AT), AT - 12 * 60 * 1000), "Starts in 12m");
  assert.equal(relativeStart(new Date(AT), AT - 10_000), "Starts in under a minute");
  assert.equal(relativeStart(new Date(AT), AT + 12 * 60 * 1000), "Started 12m ago");
  assert.equal(relativeStart("nope", AT), "");
});
