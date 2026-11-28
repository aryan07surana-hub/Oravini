// King Astrology webinar funnel — end-to-end against a real Postgres
// (TEST_DATABASE_URL). Exercises the whole flow a registrant and the host go
// through: free registration, VIP registration into Whop checkout, the Whop
// webhook marking a payment, and the host dashboard reading it all back.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

const WEBHOOK_SECRET = "ws_king_integration_secret";

test("king astrology webinar funnel (Postgres)", { skip: !url && "TEST_DATABASE_URL not set" }, async (t) => {
  process.env.WHOP_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.KING_ADMIN_EMAIL = "king@gmail.com";
  delete process.env.KING_ADMIN_PASSWORD; // exercise the built-in default

  const express = (await import("express")).default;
  const session = (await import("express-session")).default;
  const { ensureKingWebinarSchema, registerKingWebinar } = await import("../server/kingWebinar");
  const { pool } = await import("../server/storage");
  const { signWhopWebhookForTest } = await import("../server/billing/whopWebhook");
  const { KING_WHOP, KING_PATHS } = await import("../shared/kingWebinar");

  await pool.query("DROP TABLE IF EXISTS king_webinar_registrations CASCADE");
  await ensureKingWebinarSchema();

  const app = express();
  app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  app.use(session({ secret: "test-secret", resave: false, saveUninitialized: false }));
  registerKingWebinar(app);

  const server = http.createServer(app);
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  t.after(async () => { server.close(); await pool.end(); });

  // Minimal cookie jar so the admin session survives between calls.
  let cookie = "";
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...(init.headers || {}) },
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return res;
  };
  const register = (body: Record<string, unknown>) =>
    call("/api/king/register", { method: "POST", body: JSON.stringify(body) });

  const rowFor = async (email: string) =>
    (await pool.query("SELECT * FROM king_webinar_registrations WHERE email = $1", [email])).rows[0];

  // ── Free registration ────────────────────────────────────────────────────
  await t.test("a free registrant is saved as General and sent to the General page", async () => {
    const res = await register({ name: "Free Fiona", email: "Fiona@Example.com", phone: "+1 555 0100", tier: "general" });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.tier, "general");
    assert.equal(body.paid, false);
    assert.equal(body.checkoutUrl, null, "a free registrant is never sent to checkout");
    assert.equal(body.next, KING_PATHS.general);
    assert.match(body.registrationId, /^[0-9a-f-]{36}$/i);

    const row = await rowFor("fiona@example.com");
    assert.equal(row.email, "fiona@example.com", "stored lowercased");
    assert.equal(row.name, "Free Fiona");
    assert.equal(row.phone, "+1 555 0100");
    assert.equal(row.tier, "general");
    assert.equal(row.paid, false);
  });

  // ── VIP registration ─────────────────────────────────────────────────────
  await t.test("a VIP registrant is saved unpaid and sent to the Whop plan checkout", async () => {
    const res = await register({ name: "Vip Victor", email: "victor@example.com", tier: "vip" });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.tier, "vip");
    assert.equal(body.paid, false, "paid only once Whop says so");
    assert.equal(body.next, KING_PATHS.vip);
    assert.equal(body.checkoutUrl, `${KING_WHOP.checkoutUrl}?email=victor%40example.com`);
    assert.ok(!body.checkoutUrl.includes("king-astrology-inner-circle"), "plan checkout, not the product page");

    const row = await rowFor("victor@example.com");
    assert.equal(row.tier, "vip");
    assert.equal(row.paid, false);
  });

  // ── Re-registration ──────────────────────────────────────────────────────
  await t.test("registering again updates the one row instead of duplicating it", async () => {
    await register({ name: "Fiona Updated", email: "fiona@example.com", tier: "general" });
    const { rows } = await pool.query("SELECT * FROM king_webinar_registrations WHERE email = 'fiona@example.com'");
    assert.equal(rows.length, 1, "no duplicate row");
    assert.equal(rows[0].name, "Fiona Updated");
    assert.equal(rows[0].phone, "+1 555 0100", "an omitted phone keeps the one on file");
  });

  await t.test("General upgrades to VIP, and VIP never silently drops back", async () => {
    const up = await register({ name: "Fiona Updated", email: "fiona@example.com", tier: "vip" });
    assert.equal((await up.json()).tier, "vip");
    assert.equal((await rowFor("fiona@example.com")).tier, "vip");

    await register({ name: "Fiona Updated", email: "fiona@example.com", tier: "general" });
    assert.equal((await rowFor("fiona@example.com")).tier, "vip", "a paid-intent VIP is not downgraded");
  });

  await t.test("bad input is rejected", async () => {
    assert.equal((await register({ name: "", email: "a@b.com" })).status, 400);
    assert.equal((await register({ name: "No Email", email: "nope" })).status, 400);
    const unknownTier = await register({ name: "Odd Tier", email: "odd@example.com", tier: "platinum" });
    assert.equal((await unknownTier.json()).tier, "general", "an unknown tier falls back to General");
  });

  // ── Registration status ──────────────────────────────────────────────────
  await t.test("the confirmation pages can read a registration by its id", async () => {
    const id = (await (await register({ name: "Status Sam", email: "sam@example.com", tier: "vip" })).json()).registrationId;
    const res = await call(`/api/king/registration/${id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { registrationId: id, name: "Status Sam", tier: "vip", paid: false });

    assert.equal((await call("/api/king/registration/not-a-uuid")).status, 400);
    assert.equal((await call("/api/king/registration/11111111-1111-1111-1111-111111111111")).status, 404);
  });

  // ── Whop webhook ─────────────────────────────────────────────────────────
  const sendWebhook = (payload: unknown, opts: { secret?: string; ts?: number } = {}) => {
    const body = JSON.stringify(payload);
    const id = `msg_${Math.random().toString(36).slice(2)}`;
    const ts = opts.ts ?? Math.floor(Date.now() / 1000);
    return call("/api/king/whop/webhook", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "webhook-id": id,
        "webhook-timestamp": String(ts),
        "webhook-signature": signWhopWebhookForTest(opts.secret ?? WEBHOOK_SECRET, id, ts, body),
      },
    });
  };
  // The real Whop shape: top-level `type`, `customer_email`, `amount` as a
  // decimal string in major units, `product_id` (a payment has no plan_id).
  const paymentFor = (email: string, extra: Record<string, unknown> = {}) => ({
    type: "payment.succeeded",
    data: {
      id: "pay_int_1", customer_email: email, product_id: KING_WHOP.productId,
      amount: "15.00", currency: "usd", membership_id: null, customer_phone: "+1 555 0404", ...extra,
    },
  });

  await t.test("an unsigned or wrongly signed webhook never marks anyone paid", async () => {
    const plain = await call("/api/king/whop/webhook", { method: "POST", body: JSON.stringify(paymentFor("victor@example.com")) });
    assert.equal(plain.status, 401, "no signature headers");
    const forged = await sendWebhook(paymentFor("victor@example.com"), { secret: "not-the-secret" });
    assert.equal(forged.status, 401);
    const replayed = await sendWebhook(paymentFor("victor@example.com"), { ts: Math.floor(Date.now() / 1000) - 10_000 });
    assert.equal(replayed.status, 401, "stale timestamp");
    assert.equal((await rowFor("victor@example.com")).paid, false, "still unpaid");
  });

  await t.test("a signed payment marks the registrant paid with the amount", async () => {
    const res = await sendWebhook(paymentFor("victor@example.com"));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);

    const row = await rowFor("victor@example.com");
    assert.equal(row.paid, true);
    assert.equal(row.tier, "vip");
    assert.equal(row.amount_cents, 1500);
    assert.equal(row.currency, "USD");
    assert.equal(row.paid_source, "whop-webhook");
    assert.equal(row.whop_payment_id, "pay_int_1");
    assert.equal(row.whop_membership_id, null, "one-off purchases carry no membership");
    assert.ok(row.paid_at, "paid_at recorded");
  });

  await t.test("someone who paid without registering first still gets a VIP row", async () => {
    const res = await sendWebhook(paymentFor("walkin@example.com"));
    assert.equal(res.status, 200);
    const row = await rowFor("walkin@example.com");
    assert.equal(row.tier, "vip");
    assert.equal(row.paid, true);
    assert.equal(row.phone, "+1 555 0404", "phone captured from the payment");
  });

  await t.test("a payment for a different plan, or a non-payment event, is ignored", async () => {
    const otherPlan = await sendWebhook(paymentFor("fiona@example.com", { product_id: "prod_someoneelse" }));
    assert.match((await otherPlan.json()).ignored, /different product/);
    const refund = await sendWebhook({ type: "payment.failed", data: { customer_email: "fiona@example.com", product_id: KING_WHOP.productId } });
    assert.match((await refund.json()).ignored, /event payment\.failed/);
    assert.equal((await rowFor("fiona@example.com")).paid, false, "untouched");
  });

  await t.test("a webhook is refused outright when no secret is configured", async () => {
    const saved = process.env.WHOP_WEBHOOK_SECRET;
    delete process.env.WHOP_WEBHOOK_SECRET;
    const res = await sendWebhook(paymentFor("nosecret@example.com"));
    assert.equal(res.status, 503, "visible in Whop's delivery log instead of silently dropped");
    assert.equal(await rowFor("nosecret@example.com"), undefined, "no row created on an unverified body");
    process.env.WHOP_WEBHOOK_SECRET = saved;
  });

  // ── Host dashboard ───────────────────────────────────────────────────────
  await t.test("the dashboard is closed until the host signs in", async () => {
    assert.equal((await call("/api/king/admin/registrations")).status, 401);
    assert.equal((await call("/api/king/admin/registrations.csv")).status, 401);
    assert.equal((await (await call("/api/king/admin/session")).json()).signedIn, false);
  });

  await t.test("the wrong password is refused", async () => {
    const res = await call("/api/king/admin/login", { method: "POST", body: JSON.stringify({ email: "king@gmail.com", password: "wrong" }) });
    assert.equal(res.status, 401);
    const wrongUser = await call("/api/king/admin/login", { method: "POST", body: JSON.stringify({ email: "someone@else.com", password: "king 123" }) });
    assert.equal(wrongUser.status, 401);
  });

  await t.test("king@gmail.com signs in with the given password", async () => {
    const res = await call("/api/king/admin/login", { method: "POST", body: JSON.stringify({ email: "king@gmail.com", password: "king 123" }) });
    assert.equal(res.status, 200);
    assert.equal((await (await call("/api/king/admin/session")).json()).signedIn, true);
  });

  await t.test("the spelling without the space works too", async () => {
    const res = await call("/api/king/admin/login", { method: "POST", body: JSON.stringify({ email: "KING@GMAIL.COM", password: "king123" }) });
    assert.equal(res.status, 200, "email case-insensitive, both password spellings accepted");
  });

  await t.test("the dashboard shows every registration with VIP and paid totals", async () => {
    const res = await call("/api/king/admin/registrations");
    assert.equal(res.status, 200);
    const { registrations, totals } = await res.json();

    assert.equal(totals.all, registrations.length);
    assert.equal(totals.vip + totals.general, totals.all, "every row is in exactly one tier");
    assert.equal(totals.vipPaid + totals.vipUnpaid, totals.vip);
    assert.equal(totals.vipPaid, 2, "victor and the walk-in");
    assert.equal(totals.revenueCents, 3000, "2 × $15");

    const victor = registrations.find((r: any) => r.email === "victor@example.com");
    assert.equal(victor.tier, "vip");
    assert.equal(victor.paid, true);
    // Newest first, so the dashboard opens on the latest signups.
    const times = registrations.map((r: any) => new Date(r.created_at).getTime());
    assert.deepEqual(times, [...times].sort((a, b) => b - a));
  });

  await t.test("the host can tick a payment by hand, and untick it", async () => {
    const sam = (await (await call("/api/king/admin/registrations")).json())
      .registrations.find((r: any) => r.email === "sam@example.com");
    assert.equal(sam.paid, false);

    const on = await call(`/api/king/admin/registrations/${sam.id}`, { method: "PATCH", body: JSON.stringify({ paid: true }) });
    assert.equal(on.status, 200);
    let row = await rowFor("sam@example.com");
    assert.equal(row.paid, true);
    assert.equal(row.paid_source, "manual");
    assert.ok(row.paid_at);

    const off = await call(`/api/king/admin/registrations/${sam.id}`, { method: "PATCH", body: JSON.stringify({ paid: false }) });
    assert.equal(off.status, 200);
    row = await rowFor("sam@example.com");
    assert.equal(row.paid, false);
    assert.equal(row.paid_at, null);

    assert.equal((await call(`/api/king/admin/registrations/${sam.id}`, { method: "PATCH", body: JSON.stringify({ paid: "yes" }) })).status, 400);
  });

  await t.test("the CSV export is complete and spreadsheet-safe", async () => {
    // A name that a spreadsheet would otherwise run as a formula.
    await register({ name: "=cmd|' /c calc'!A1", email: "sneaky@example.com", tier: "general" });
    const res = await call("/api/king/admin/registrations.csv");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /text\/csv/);
    assert.match(res.headers.get("content-disposition") || "", /king-astrology-registrations\.csv/);

    const csv = await res.text();
    const lines = csv.trim().split("\r\n");
    assert.equal(lines[0], '"Name","Email","Phone","Tier","Paid","Paid at","Paid via","Amount","Registered at"');
    assert.ok(csv.includes("victor@example.com") && csv.includes("fiona@example.com"));
    assert.ok(csv.includes('"\'=cmd|\' /c calc\'!A1"'), "a leading = is quoted off so it can't execute");
    assert.ok(csv.includes('"15.00 USD"'), "paid amount shown");
  });

  await t.test("signing out closes the dashboard again", async () => {
    await call("/api/king/admin/logout", { method: "POST" });
    assert.equal((await call("/api/king/admin/registrations")).status, 401);
  });

  // ── Calendar file ────────────────────────────────────────────────────────
  await t.test("the .ics invite downloads for Apple Calendar and Outlook", async () => {
    const res = await call("/api/king/invite.ics");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /text\/calendar/);
    assert.match(res.headers.get("content-disposition") || "", /attachment; filename="king-astrology-webinar\.ics"/);
    const ics = await res.text();
    assert.ok(ics.includes("DTSTART:20261205T180000Z"), "the fixed 1:00 PM ET instant");
    assert.ok(ics.includes("BEGIN:VEVENT") && ics.includes("END:VCALENDAR"));
  });
});
