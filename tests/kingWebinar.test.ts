import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KING_EVENT, KING_EVENT_MS, KING_EVENT_UTC_ISO, KING_PATHS, KING_VIDEOS, KING_WHATSAPP, KING_WHOP,
  isKingTier, kingCountdownParts, kingGoogleCalendarUrl, kingHasStarted, kingIcsFile, kingMsUntilStart,
  kingOutlookCalendarUrl, kingTimeIn, kingViewerLocal, kingWhopCheckoutUrl,
  readWhopEvent, eventIsForKingPlan,
} from '../shared/kingWebinar';
import { signWhopWebhookForTest, verifyWhopWebhook } from '../server/billing/whopWebhook';

// ── The instant ─────────────────────────────────────────────────────────────

test('the event is Saturday 5 December 2026, 1:00 PM US Eastern = 18:00 UTC', () => {
  assert.equal(KING_EVENT_UTC_ISO, '2026-12-05T18:00:00.000Z');
  assert.equal(new Date(KING_EVENT_MS).toISOString(), KING_EVENT_UTC_ISO);

  const et = kingTimeIn('America/New_York');
  assert.ok(et, 'America/New_York must be resolvable');
  assert.equal(et!.time, '1:00 PM');
  assert.match(et!.date, /Sat, 5 Dec 2026/);
  // December is EST, never EDT — a DST slip here would move the webinar an hour.
  assert.equal(et!.zone, 'EST');
  assert.equal(new Date(KING_EVENT_MS).getUTCDay(), 6, 'Saturday');
});

test('the ET label shown next to the countdown is exactly "1:00 PM ET"', () => {
  assert.equal(KING_EVENT.label, '1:00 PM ET');
  assert.equal(KING_EVENT.zoneShort, 'ET');
  assert.equal(KING_EVENT.dateLine, 'Saturday, December 5, 2026');
});

test('the same instant renders correctly in other timezones', () => {
  assert.equal(kingTimeIn('Asia/Kolkata')!.time, '11:30 PM');       // UTC+5:30
  assert.equal(kingTimeIn('Europe/London')!.time, '6:00 PM');        // UTC+0 in Dec
  assert.equal(kingTimeIn('America/Los_Angeles')!.time, '10:00 AM'); // UTC-8 in Dec
});

test('the viewer local line is hidden only when it would repeat the ET line', () => {
  assert.equal(kingViewerLocal('America/New_York'), null, 'same as host: no duplicate line');
  assert.equal(kingViewerLocal(null), null, 'unknown zone');
  const kolkata = kingViewerLocal('Asia/Kolkata');
  assert.ok(kolkata && kolkata.time === '11:30 PM');
});

// ── Countdown ───────────────────────────────────────────────────────────────

test('the countdown is computed from the fixed UTC instant, not a clock offset', () => {
  // One day, two hours, three minutes and four seconds before the event.
  const now = KING_EVENT_MS - (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1000;
  assert.deepEqual(kingCountdownParts(kingMsUntilStart(now)), { days: 1, hours: 2, minutes: 3, seconds: 4 });
  assert.equal(kingHasStarted(now), false);
});

test('the countdown floors at zero and the event reads as started', () => {
  assert.equal(kingMsUntilStart(KING_EVENT_MS), 0);
  assert.equal(kingMsUntilStart(KING_EVENT_MS + 60_000), 0);
  assert.deepEqual(kingCountdownParts(-5_000), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.deepEqual(kingCountdownParts(NaN), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.equal(kingHasStarted(KING_EVENT_MS), true, 'live at exactly the start instant');
  assert.equal(kingHasStarted(KING_EVENT_MS - 1), false);
});

// ── Whop checkout ───────────────────────────────────────────────────────────

test('VIP goes to the Whop plan checkout, never the product page', () => {
  assert.equal(KING_WHOP.checkoutUrl, 'https://whop.com/checkout/plan_uQzQcb8LYeGMF/');
  assert.equal(KING_WHOP.planId, 'plan_uQzQcb8LYeGMF');
  assert.equal(KING_WHOP.productId, 'prod_oP6wAR1ulIVRv');
  assert.equal(KING_WHOP.price, '$15');
  assert.equal(KING_WHOP.amount, 15);
  for (const url of [kingWhopCheckoutUrl(), kingWhopCheckoutUrl('a@b.com')]) {
    assert.ok(url.startsWith('https://whop.com/checkout/plan_uQzQcb8LYeGMF/'), url);
    assert.ok(!url.includes('king-astrology-inner-circle'), 'must not be the product page');
  }
});

test('the registrant email is prefilled, and junk is dropped rather than sent', () => {
  // "+" must be percent-encoded or Whop reads it as a space and the prefill breaks.
  assert.equal(kingWhopCheckoutUrl('King.User+vip@Example.com'),
    'https://whop.com/checkout/plan_uQzQcb8LYeGMF/?email=King.User%2Bvip%40Example.com');
  assert.equal(kingWhopCheckoutUrl('  a@b.com  '),
    'https://whop.com/checkout/plan_uQzQcb8LYeGMF/?email=a%40b.com', 'surrounding space trimmed');
  for (const bad of [undefined, null, '', '   ', 'nope', 'no@domain', 'has space@b.com', 'a@b.c'.padEnd(300, 'x')]) {
    assert.equal(kingWhopCheckoutUrl(bad as any), KING_WHOP.checkoutUrl, `should drop ${JSON.stringify(bad)}`);
  }
});

// ── Links and assets ────────────────────────────────────────────────────────

test('the WhatsApp groups and the three videos are the ones that were given', () => {
  assert.equal(KING_WHATSAPP.vip, 'https://chat.whatsapp.com/EBdSrBnjaNn1H11UBpLNe8');
  assert.equal(KING_WHATSAPP.general, 'https://chat.whatsapp.com/GbddxBxB9QO4iOjF4zBIuK');
  assert.notEqual(KING_WHATSAPP.vip, KING_WHATSAPP.general);
  assert.deepEqual(KING_VIDEOS, {
    vsl: '/king-webinar/vsl.mp4',
    general: '/king-webinar/general-section.mp4',
    vip: '/king-webinar/vip-section.mp4',
  });
  assert.equal(KING_PATHS.funnel, '/king-astrology');
  assert.equal(KING_PATHS.vip, '/king-astrology/vip');
  assert.equal(KING_PATHS.general, '/king-astrology/general');
});

test('isKingTier accepts only the two tiers', () => {
  assert.ok(isKingTier('vip') && isKingTier('general'));
  for (const v of ['VIP', 'paid', '', null, undefined, 1, {}]) assert.equal(isKingTier(v), false);
});

// ── Calendar invites ────────────────────────────────────────────────────────

test('Google Calendar gets the event at the right UTC instant', () => {
  const url = kingGoogleCalendarUrl({ details: 'see you there' });
  assert.ok(url.includes('dates=20261205T180000Z/20261205T193000Z'), url); // 90 minutes
  assert.ok(url.includes('ctz=America%2FNew_York'));
  assert.ok(url.includes('details=see%20you%20there'));
});

test('Outlook gets the event as ISO UTC', () => {
  const url = kingOutlookCalendarUrl();
  assert.ok(url.startsWith('https://outlook.live.com/calendar/0/deeplink/compose?'));
  assert.ok(url.includes(`startdt=${encodeURIComponent('2026-12-05T18:00:00.000Z')}`), url);
  assert.ok(url.includes(`enddt=${encodeURIComponent('2026-12-05T19:30:00.000Z')}`), url);
});

test('the .ics file is valid for Apple Calendar and Outlook desktop', () => {
  const ics = kingIcsFile({ details: 'Group: https://chat.whatsapp.com/x; and more, really' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'), 'CRLF line endings are required by RFC 5545');
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
  assert.ok(ics.includes('DTSTART:20261205T180000Z'));
  assert.ok(ics.includes('DTEND:20261205T193000Z'));
  assert.ok(ics.includes('SUMMARY:King Astrology Live Masterclass'));
  // ; and , must be escaped inside a property value, or the file won't import.
  assert.ok(ics.includes('\;') && ics.includes('\\,'), 'separators escaped');
  assert.ok(ics.includes('BEGIN:VALARM') && ics.includes('TRIGGER:-PT30M'), '30 minute reminder');
  assert.ok(!/\r\r|\n\n/.test(ics), 'no doubled line breaks');
});

// ── Whop webhook ────────────────────────────────────────────────────────────

test('a payment.succeeded payload is read as a paid event for our plan', () => {
  const e = readWhopEvent({
    action: 'payment.succeeded',
    data: { id: 'pay_1', user_email: 'Buyer@Example.com', plan_id: KING_WHOP.planId, final_amount: 15, currency: 'usd', membership_id: 'mem_1' },
  });
  assert.equal(e.isPaid, true);
  assert.equal(e.email, 'buyer@example.com', 'lowercased for the unique index');
  assert.equal(e.amountCents, 1500, 'major units converted to cents');
  assert.equal(e.currency, 'USD');
  assert.equal(e.paymentId, 'pay_1');
  assert.equal(e.membershipId, 'mem_1');
  assert.ok(eventIsForKingPlan(e));
});

test('membership.went_valid and nested email shapes are handled', () => {
  const e = readWhopEvent({ event: 'membership_went_valid', data: { user: { email: 'x@y.com' }, product_id: KING_WHOP.productId } });
  assert.equal(e.isPaid, true);
  assert.equal(e.email, 'x@y.com');
  assert.ok(eventIsForKingPlan(e));
});

test('events for other plans and non-payment events are not treated as paid', () => {
  const other = readWhopEvent({ action: 'payment.succeeded', data: { plan_id: 'plan_somethingelse', user_email: 'a@b.com' } });
  assert.equal(other.isPaid, true);
  assert.equal(eventIsForKingPlan(other), false, 'different plan must be ignored');

  const refund = readWhopEvent({ action: 'payment.failed', data: { plan_id: KING_WHOP.planId, user_email: 'a@b.com' } });
  assert.equal(refund.isPaid, false);
  assert.equal(readWhopEvent({}).isPaid, false);
  assert.equal(readWhopEvent({ action: 'membership.went_invalid', data: {} }).isPaid, false);
});

test('a payload naming neither plan nor product is accepted (endpoint is per-business)', () => {
  assert.ok(eventIsForKingPlan(readWhopEvent({ action: 'payment.succeeded', data: { user_email: 'a@b.com' } })));
});

test('amounts that are missing or nonsense never become NaN', () => {
  for (const amount of [undefined, null, 'abc', 0, -5]) {
    const e = readWhopEvent({ action: 'payment.succeeded', data: { user_email: 'a@b.com', final_amount: amount } });
    assert.equal(e.amountCents, null, `amount ${JSON.stringify(amount)}`);
  }
});

test('the webhook only trusts a correctly signed body', () => {
  const secret = 'ws_king_test_secret';
  const body = JSON.stringify({ action: 'payment.succeeded', data: { user_email: 'a@b.com', plan_id: KING_WHOP.planId } });
  const id = 'msg_king_1';
  const ts = Math.floor(Date.now() / 1000);
  const headers = { 'webhook-id': id, 'webhook-timestamp': String(ts), 'webhook-signature': signWhopWebhookForTest(secret, id, ts, body) };

  assert.deepEqual(verifyWhopWebhook(secret, headers, body), { ok: true, id });
  assert.equal(verifyWhopWebhook(null, headers, body).ok, false, 'no secret configured → never trusted');
  assert.equal(verifyWhopWebhook('wrong_secret', headers, body).ok, false);
  assert.equal(verifyWhopWebhook(secret, headers, body + ' ').ok, false, 'tampered body');
  assert.equal(
    verifyWhopWebhook(secret, { ...headers, 'webhook-timestamp': String(ts - 10_000) }, body).ok,
    false, 'replayed timestamp',
  );
});
