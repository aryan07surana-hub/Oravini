// Billing v2 ledger integration tests against a real Postgres (TEST_DATABASE_URL).
// Uses a throwaway database: creates minimal users/credit tables, applies the v2
// migration, and never contacts Whop (a fake client serves payments).
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { catalogJson, finalEnv, TEST_COMPANY } from "./helpers/billingV2Fixture";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

test("billing v2 ledger (Postgres)", { skip: !url && "TEST_DATABASE_URL not set" }, async (t) => {
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 20 });
  const { BILLING_V2_MIGRATION_SQL, BILLING_V2_ROLLBACK_SQL, billingV2SchemaReady } = await import("../server/billing/schema");
  const L = await import("../server/billing/ledger");
  const { parseCatalog, findOffer } = await import("../server/billing/catalog");
  const { processWhopPayment } = await import("../server/billing/service");
  const { loadBillingV2Config } = await import("../server/billing/config");
  const { registerBillingV2Routes, billingV2SessionMiddleware } = await import("../server/billing/routes");
  const { signWhopWebhookForTest } = await import("../server/billing/whopWebhook");

  await pool.query(BILLING_V2_ROLLBACK_SQL);
  await pool.query("DROP TABLE IF EXISTS credit_transactions, credit_balances, users CASCADE");
  await pool.query(`CREATE TABLE users (id VARCHAR PRIMARY KEY, email TEXT, password TEXT DEFAULT 'x', name TEXT DEFAULT 'n', role TEXT NOT NULL DEFAULT 'client', plan TEXT NOT NULL DEFAULT 'free', has_video_marketing BOOLEAN NOT NULL DEFAULT FALSE, plan_confirmed BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW());
    CREATE TABLE credit_balances (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id), monthly_credits INTEGER NOT NULL DEFAULT 20, bonus_credits INTEGER NOT NULL DEFAULT 0, last_reset_month TEXT NOT NULL DEFAULT '', created_at TIMESTAMP DEFAULT NOW());
    CREATE TABLE credit_transactions (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id VARCHAR NOT NULL REFERENCES users(id), amount INTEGER NOT NULL, type TEXT NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT NOW());`);

  const catalog = (() => { const r = parseCatalog(catalogJson(), TEST_COMPANY); assert.ok(r.ok); return r.catalog; })();
  const offer = (p: string, m: number) => findOffer(catalog, p, m)!;
  const mkUser = async (id: string, plan = "free", role = "client", monthly = 7, bonus = 30) => {
    await pool.query("INSERT INTO users(id, email, plan, role, has_video_marketing) VALUES ($1,$2,$3,$4,$5)", [id, `${id}@t.test`, plan, role, plan === "pro" || plan === "elite"]);
    await pool.query("INSERT INTO credit_balances(user_id, monthly_credits, bonus_credits, last_reset_month) VALUES ($1,$2,$3,'2026-11')", [id, monthly, bonus]);
  };
  const bal = async (id: string) => (await pool.query("SELECT monthly_credits AS m, bonus_credits AS b FROM credit_balances WHERE user_id=$1", [id])).rows[0];
  const user = async (id: string) => (await pool.query("SELECT plan, has_video_marketing AS v FROM users WHERE id=$1", [id])).rows[0];
  const count = async (sql: string, v: unknown[] = []) => (await pool.query(sql, v)).rows[0].n as number;

  // Fake Whop: current-contract payments keyed by id; counts reads.
  const money = (amount: string) => ({ amount, currency: "usd", decimals: 2, display_decimals: 2 });
  const whopCheckoutIdFor = (checkoutId: string) => `ch_${checkoutId.slice(0, 8)}`;
  const payments = new Map<string, any>();
  let payN = 0;
  const whop = { reads: 0, async getPayment(id: string) { this.reads++; const p = payments.get(id); if (!p) { const e: any = new Error("404"); e.status = 404; throw e; } return structuredClone(p); },
    async createCheckout(i: any) { return { id: whopCheckoutIdFor(i.checkoutId), purchaseUrl: `https://whop.com/checkout/${i.whopPlanId}` }; } };
  // Persist the fake Whop checkout id exactly like routes.ts does after the
  // checkout POST, so verification can bind checkout_configuration_id.
  const mkCheckout = async (uid: string, o: any) => {
    const { checkoutId } = await L.createCheckoutRecord(pool, uid, o);
    const whopCheckoutId = whopCheckoutIdFor(checkoutId);
    await pool.query("UPDATE billing_checkouts_v2 SET whop_checkout_id = $2 WHERE id = $1", [checkoutId, whopCheckoutId]);
    return { checkoutId, whopCheckoutId };
  };
  const pay = (checkoutId: string, o: any, over: Record<string, unknown> = {}) => {
    const id = `pay_T${String(++payN).padStart(6, "0")}`;
    const price = (o.amountCents / 100).toFixed(2);
    payments.set(id, {
      id, status: "paid", substatus: "succeeded",
      account_id: TEST_COMPANY, product_id: o.whopProductId, variant_id: o.whopPlanId,
      checkout_configuration_id: whopCheckoutIdFor(checkoutId),
      metadata: { oravini_checkout_id: checkoutId, oravini_catalog_version: "test-v1" },
      currency: "usd", total: money(price), subtotal: money(price), tax_amount: null, tax_behavior: "exclusive",
      refunded_amount: null, amount_charged: money(price), paid_at: new Date().toISOString(), auto_refunded: false,
      dispute_created_at: null, dispute_alerted_at: null,
      ...over,
    });
    return id;
  };
  const deps = (now = new Date()) => ({ db: pool, whop, companyId: TEST_COMPANY, catalog, now: () => now });
  const buy = async (uid: string, p = "growth", m = 3) => { const o = offer(p, m); const { checkoutId } = await mkCheckout(uid, o); return { checkoutId, o, paymentId: pay(checkoutId, o) }; };
  const plus = (d: Date, days: number) => new Date(d.getTime() + days * 86400_000);

  await t.test("migration is explicit and repeat-safe; rollback leaves legacy tables", async () => {
    assert.equal(await billingV2SchemaReady(pool), false);
    await pool.query(BILLING_V2_MIGRATION_SQL);
    await pool.query(BILLING_V2_MIGRATION_SQL);
    assert.equal(await billingV2SchemaReady(pool), true);
    await pool.query(BILLING_V2_ROLLBACK_SQL);
    assert.equal(await billingV2SchemaReady(pool), false);
    assert.equal(await count("SELECT COUNT(*)::int n FROM users"), 0, "legacy tables intact");
    await pool.query(BILLING_V2_MIGRATION_SQL);
    assert.equal(await billingV2SchemaReady(pool), true);
  });

  await t.test("Free v2: 100/month reset, exactly once per month, no rollover, bonus kept", async () => {
    await mkUser("free1");
    assert.equal(await L.refreshForUser(pool, "free1", new Date("2026-11-22T10:00Z")), null, "not enrolled without flag");
    assert.deepEqual(await bal("free1"), { m: 7, b: 30 });
    const opt = { allowFreeEnrollment: true };
    await Promise.all(Array.from({ length: 10 }, () => L.refreshForUser(pool, "free1", new Date("2026-11-22T10:00Z"), opt)));
    assert.deepEqual(await bal("free1"), { m: 100, b: 30 });
    assert.equal(await count("SELECT COUNT(*)::int n FROM oravini_free_grants_v2 WHERE user_id='free1'"), 1);
    const d = await L.debitCredits(pool, "free1", 40, "t", "t", new Date("2026-11-25T00:00Z"));
    assert.ok(!d.legacy && d.success);
    assert.deepEqual(await bal("free1"), { m: 60, b: 30 }, "monthly spent first, bonus preserved");
    await L.refreshForUser(pool, "free1", new Date("2026-11-30T23:59:59Z"));
    assert.deepEqual(await bal("free1"), { m: 60, b: 30 }, "no second grant same month");
    await L.refreshForUser(pool, "free1", new Date("2026-12-01T00:00:00Z"));
    assert.deepEqual(await bal("free1"), { m: 100, b: 30 }, "reset, not 160");
    await L.refreshForUser(pool, "free1", new Date("2027-03-15T00:00:00Z"));
    assert.deepEqual(await bal("free1"), { m: 100, b: 30 }, "returning after months: one month only, no catch-up");
    assert.equal(await count("SELECT COUNT(*)::int n FROM oravini_free_grants_v2 WHERE user_id='free1'"), 3);
  });

  await t.test("legacy paid, Elite and admin are untouched and cannot buy prepaid", async () => {
    await mkUser("legacyGrowth", "growth", "client", 250, 12);
    await mkUser("elite1", "elite", "client", 99999, 0);
    await mkUser("admin1", "free", "admin", 20, 0);
    for (const id of ["legacyGrowth", "elite1", "admin1"]) assert.equal(await L.refreshForUser(pool, id, new Date(), { allowFreeEnrollment: true }), null, id);
    assert.deepEqual(await bal("legacyGrowth"), { m: 250, b: 12 });
    assert.equal((await user("legacyGrowth")).plan, "growth");
    await assert.rejects(L.createCheckoutRecord(pool, "legacyGrowth", offer("pro", 1)), /legacy-subscriber-migration-required/);
    await assert.rejects(L.createCheckoutRecord(pool, "elite1", offer("pro", 1)), /ineligible-account/);
    await assert.rejects(L.createCheckoutRecord(pool, "admin1", offer("pro", 1)), /ineligible-account/);
    const d = await L.debitCredits(pool, "legacyGrowth", 5, "t", "t");
    assert.deepEqual(d, { legacy: true });
    assert.deepEqual(await bal("legacyGrowth"), { m: 250, b: 12 }, "v2 debit never touches legacy");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_accounts_v2 WHERE user_id IN ('legacyGrowth','elite1','admin1')"), 0);
  });

  let u1Payment = "";
  await t.test("verified payment -> one entitlement, current month only, calendar end, rights", async () => {
    await mkUser("u1");
    const { paymentId, o } = await buy("u1", "growth", 3);
    u1Payment = paymentId;
    const r = await processWhopPayment(deps(), paymentId);
    assert.equal(r.result, "fulfilled");
    assert.deepEqual(await bal("u1"), { m: 550, b: 30 });
    assert.deepEqual(await user("u1"), { plan: "growth", v: false }, "plain Growth has no video/webinar rights");
    const e = (await pool.query("SELECT * FROM billing_entitlements_v2 WHERE user_id='u1'")).rows[0];
    assert.equal(e.monthly_allowance, 550); assert.equal(e.term_months, 3);
    assert.equal(new Date(e.ends_at).toISOString(), L.termEnd(new Date(e.starts_at), 3).toISOString());
    assert.equal(e.offer_snapshot.whopPlanId, o.whopPlanId);
    assert.equal(e.offer_snapshot.discountVersion, "disc-test-1");
    await assert.rejects(pool.query("UPDATE billing_entitlements_v2 SET offer_snapshot = '{}'::jsonb WHERE user_id='u1'"), /immutable/);
    await assert.rejects(pool.query("UPDATE billing_entitlements_v2 SET ends_at = ends_at + interval '1 year' WHERE user_id='u1'"), /immutable/);
    // Replayed webhook/reconcile: idempotent.
    for (let i = 0; i < 3; i++) assert.equal((await processWhopPayment(deps(), paymentId)).result, "already-fulfilled");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_period_grants_v2 WHERE user_id='u1'"), 1);
    assert.deepEqual(await bal("u1"), { m: 550, b: 30 });
  });

  await t.test("overlapping prepaid term is rejected without discarding the payment", async () => {
    await assert.rejects(L.createCheckoutRecord(pool, "u1", offer("pro", 1)), (e: any) => e.code === "existing-term" && !!e.detail.endsAt);
    // A checkout created before the first payment, then paid: kept for manual review.
    await mkUser("u2");
    const a = await buy("u2", "growth", 1); const b = await buy("u2", "pro", 6);
    assert.equal((await processWhopPayment(deps(), a.paymentId)).result, "fulfilled");
    const r = await processWhopPayment(deps(), b.paymentId);
    assert.equal(r.result, "existing-term");
    const p = (await pool.query("SELECT status, review_reason FROM billing_payments_v2 WHERE whop_payment_id=$1", [b.paymentId])).rows[0];
    assert.deepEqual(p, { status: "needs_review", review_reason: "existing-term" });
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='u2'"), 1);
    assert.equal((await processWhopPayment(deps(), b.paymentId)).result, "needs-review", "replay stays in review");
  });

  await t.test("monthly paid grants: once per month under concurrency, no catch-up, then expiry to Free", async () => {
    const e = (await pool.query("SELECT starts_at, ends_at FROM billing_entitlements_v2 WHERE user_id='u1'")).rows[0];
    const s = new Date(e.starts_at);
    await L.debitCredits(pool, "u1", 500, "t", "t", plus(s, 1));
    assert.deepEqual(await bal("u1"), { m: 50, b: 30 });
    const m2 = new Date(L.termEnd(s, 1).getTime() + 1000);
    await Promise.all(Array.from({ length: 12 }, () => L.refreshForUser(pool, "u1", m2)));
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_period_grants_v2 WHERE user_id='u1' AND period_index=1"), 1);
    assert.deepEqual(await bal("u1"), { m: 550, b: 30 }, "reset to allowance, not 600");
    const m3 = new Date(L.termEnd(s, 2).getTime() + 1000);
    await L.refreshForUser(pool, "u1", m3);
    assert.deepEqual(await bal("u1"), { m: 550, b: 30 }, "never accumulates");
    const after = new Date(new Date(e.ends_at).getTime());
    const st = await L.refreshForUser(pool, "u1", after);
    assert.equal(st!.state, "free");
    assert.deepEqual(await user("u1"), { plan: "free", v: false });
    assert.deepEqual(await bal("u1"), { m: 100, b: 30 }, "paid allowance removed, Free month granted, bonus kept");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='u1' AND status='expired'"), 1);
    // No auto-renewal: much later, still Free, no new entitlement, no paid grants.
    await L.refreshForUser(pool, "u1", plus(after, 400));
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='u1'"), 1);
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_period_grants_v2 WHERE user_id='u1'"), 3);
    assert.equal((await user("u1")).plan, "free");
  });

  await t.test("concurrent duplicate fulfillment yields exactly one entitlement and grant", async () => {
    await mkUser("u3");
    const { paymentId } = await buy("u3", "growth_video", 12);
    const results = await Promise.all(Array.from({ length: 10 }, () => processWhopPayment(deps(), paymentId)));
    assert.equal(results.filter(r => r.result === "fulfilled").length, 1);
    assert.equal(results.filter(r => r.result === "already-fulfilled").length, 9);
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='u3'"), 1);
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_period_grants_v2 WHERE user_id='u3'"), 1);
    assert.deepEqual(await bal("u3"), { m: 1250, b: 30 });
    assert.deepEqual(await user("u3"), { plan: "growth", v: true }, "Growth+Video gets video rights");
  });

  await t.test("concurrent debits never overspend", async () => {
    const rs = await Promise.all(Array.from({ length: 20 }, () => L.debitCredits(pool, "u3", 100, "t", "t")));
    assert.equal(rs.filter(r => !r.legacy && r.success).length, 12, "1250 monthly + 30 bonus => 12 x 100");
    assert.deepEqual(await bal("u3"), { m: 50, b: 30 }, "monthly spent first; purchased bonus untouched");
  });

  await t.test("payment mismatch / pending / unpaid / account mismatch never grant", async () => {
    await mkUser("u4"); await mkUser("intruder");
    const o = offer("pro", 3);
    const mk = async (over: Record<string, unknown>) => { const { checkoutId } = await mkCheckout("u4", o); return pay(checkoutId, o, over); };
    const cases: [Record<string, unknown>, string][] = [
      [{ total: money((o.amountCents / 100 - 1).toFixed(2)) }, "amount-mismatch"], [{ currency: "eur" }, "currency-mismatch"],
      [{ status: "pending" }, "not-paid"], [{ status: "open", substatus: "pending" }, "not-paid"],
      [{ variant_id: offer("pro", 12).whopPlanId }, "variant-mismatch"], [{ product_id: "prod_growthX" }, "product-mismatch"],
      [{ account_id: "biz_Pluxa00001" }, "business-mismatch"],
      [{ total: 49 }, "invalid-money"],
    ];
    for (const [over, code] of cases) assert.deepEqual(await processWhopPayment(deps(), await mk(over)), { result: "rejected", reason: code });
    const pending = await mk({ status: "pending" });
    await assert.rejects(processWhopPayment(deps(), pending, { expectedUserId: "intruder" }), /account-mismatch/);
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id IN ('u4','intruder')"), 0);
    // Later the same payment succeeds -> fulfilled for the checkout owner only.
    payments.get(pending)!.status = "paid";
    await assert.rejects(processWhopPayment(deps(), pending, { expectedUserId: "intruder" }), /account-mismatch/);
    assert.equal((await processWhopPayment(deps(), pending, { expectedUserId: "u4" })).result, "fulfilled");
    assert.deepEqual(await user("u4"), { plan: "pro", v: true });
    assert.equal((await user("intruder")).plan, "free");
    // No checkout binding (legacy/other product payments) is ignored, never granted.
    payments.set("pay_Legacy0001", { ...payments.get(pending), id: "pay_Legacy0001", metadata: {} });
    assert.deepEqual(await processWhopPayment(deps(), "pay_Legacy0001"), { result: "ignored", reason: "not-a-v2-payment" });
  });

  await t.test("atomic rollback: a failure mid-fulfillment leaves no partial state", async () => {
    await mkUser("u5");
    const { paymentId, checkoutId } = await buy("u5", "growth", 6);
    const failing = { connect: async () => { const c = await pool.connect(); return { release: () => c.release(), query: (sql: string, v?: unknown[]) => sql.includes("INSERT INTO billing_period_grants_v2") ? Promise.reject(new Error("boom")) : c.query(sql, v as any[]) }; } };
    await assert.rejects(processWhopPayment({ ...deps(), db: failing as any }, paymentId), /boom/);
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_payments_v2 WHERE whop_payment_id=$1", [paymentId]), 0);
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='u5'"), 0);
    assert.equal((await pool.query("SELECT status FROM billing_checkouts_v2 WHERE id=$1", [checkoutId])).rows[0].status, "created");
    assert.deepEqual(await bal("u5"), { m: 7, b: 30 }); assert.equal((await user("u5")).plan, "free");
    assert.equal((await processWhopPayment(deps(), paymentId)).result, "fulfilled", "retry succeeds");
  });

  await t.test("refund and dispute revoke fail-safe, keep bonus credits, replay-safe", async () => {
    payments.get(u1Payment)!.refunded_amount = money("10.00"); // u1 already expired: payment marked, nothing else
    assert.equal((await processWhopPayment(deps(), u1Payment)).result, "revoked-on-refund");
    const u5p = (await pool.query("SELECT whop_payment_id FROM billing_payments_v2 WHERE user_id='u5'")).rows[0].whop_payment_id;
    payments.get(u5p)!.refunded_amount = money("49.00"); // partial refund still revokes (fail safe)
    assert.equal((await processWhopPayment(deps(), u5p)).result, "revoked-on-refund");
    assert.deepEqual(await user("u5"), { plan: "free", v: false });
    const b5 = await bal("u5"); assert.equal(b5.b, 30, "purchased bonus kept");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='u5' AND status='revoked'"), 1);
    assert.deepEqual(await processWhopPayment(deps(), u5p), { result: "revoked-on-refund", detail: "already-revoked" });
    const u3p = (await pool.query("SELECT whop_payment_id FROM billing_payments_v2 WHERE user_id='u3'")).rows[0].whop_payment_id;
    payments.get(u3p)!.dispute_created_at = "2026-11-23T10:00:00.000Z";
    await processWhopPayment(deps(), u3p);
    assert.equal((await pool.query("SELECT status FROM billing_payments_v2 WHERE whop_payment_id=$1", [u3p])).rows[0].status, "disputed");
    assert.deepEqual(await user("u3"), { plan: "free", v: false });
    // A revoked term never grants again later in its original window.
    await L.refreshForUser(pool, "u3", plus(new Date(), 45));
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_period_grants_v2 WHERE user_id='u3'"), 1);
    // Refund for a payment we never sold (legacy subscription) is ignored.
    payments.set("pay_LegacySub01", {
      id: "pay_LegacySub01", status: "paid", substatus: "refunded", account_id: TEST_COMPANY,
      product_id: "prod_otherX", variant_id: "plan_otherX", checkout_configuration_id: null,
      metadata: null, currency: "usd", total: money("49.00"), subtotal: money("49.00"),
      tax_amount: null, tax_behavior: "unspecified", refunded_amount: money("49.00"),
      amount_charged: money("49.00"), paid_at: "2026-11-22T10:00:00.000Z", auto_refunded: false,
      dispute_created_at: null, dispute_alerted_at: null,
    });
    assert.deepEqual(await processWhopPayment(deps(), "pay_LegacySub01"), { result: "ignored", reason: "not-a-v2-payment" });
    assert.equal((await user("legacyGrowth")).plan, "growth");
  });

  await t.test("clock skew: a paid_at slightly in the future anchors at now, term is active", async () => {
    await mkUser("skew");
    const o = offer("pro", 1); const { checkoutId } = await mkCheckout("skew", o);
    const pid = pay(checkoutId, o, { paid_at: new Date(Date.now() + 3 * 60_000).toISOString() });
    const now = new Date();
    assert.equal((await processWhopPayment(deps(now), pid)).result, "fulfilled");
    const e = (await pool.query("SELECT starts_at FROM billing_entitlements_v2 WHERE user_id='skew'")).rows[0];
    assert.ok(new Date(e.starts_at) <= now);
    assert.deepEqual(await user("skew"), { plan: "pro", v: true });
    assert.deepEqual(await bal("skew"), { m: 700, b: 30 });
    assert.equal(await count("SELECT COUNT(*)::int n FROM oravini_free_grants_v2 WHERE user_id='skew'"), 0);
  });

  await t.test("every v2 transaction locks the user row first", async () => {
    const log: string[][] = [];
    const rec = { connect: async () => { const c = await pool.connect(); const seq: string[] = []; log.push(seq); return { release: () => c.release(), query: (sql: string, v?: unknown[]) => { seq.push(sql); return c.query(sql, v as any[]); } }; } };
    await mkUser("lk"); await mkUser("lk2");
    const o = offer("growth", 1);
    const { checkoutId } = await L.createCheckoutRecord(rec as any, "lk", o);
    await pool.query("UPDATE billing_checkouts_v2 SET whop_checkout_id = $2 WHERE id = $1", [checkoutId, whopCheckoutIdFor(checkoutId)]);
    const pid = pay(checkoutId, o);
    await processWhopPayment({ ...deps(), db: rec as any }, pid);
    await L.refreshForUser(rec as any, "lk", plus(new Date(), 40));
    await L.debitCredits(rec as any, "lk", 1, "t", "t");
    await L.refundCreditsV2(rec as any, "lk", 1, "t", "t");
    await L.refreshForUser(rec as any, "lk2", new Date(), { allowFreeEnrollment: true });
    payments.get(pid)!.refunded_amount = money("1.00");
    await processWhopPayment({ ...deps(), db: rec as any }, pid);
    const txs = log.filter(s => s.includes("BEGIN"));
    assert.ok(txs.length >= 7);
    for (const s of txs) assert.equal(s[s.indexOf("BEGIN") + 1], L.LOCK_USER_SQL);
  });

  await t.test("HTTP: checkout ignores client-selected user/price, reconcile binds account, webhook signed + replay-safe", async () => {
    const express = (await import("express")).default;
    const env = finalEnv();
    let cfgEnv: Record<string, string | undefined> = env;
    const app = express();
    app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
    app.use((req: any, _res, next) => { const id = req.get("x-test-user"); req.user = id ? { id, plan: "free", role: "client" } : undefined; req.isAuthenticated = () => !!id; next(); });
    const clientEnvironments: (string | null)[] = [];
    registerBillingV2Routes(app, { db: pool, config: () => loadBillingV2Config(cfgEnv), whop: (_key, environment) => { clientEnvironments.push(environment); return whop as any; } });
    app.post("/api/auth/cancel-plan", (_req, res) => res.json({ legacy: true }));
    const server = http.createServer(app); await new Promise<void>(r => server.listen(0, r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const post = (p: string, body: unknown, user?: string, headers: Record<string, string> = {}) => fetch(base + p, { method: "POST", headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}), ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
    try {
      await mkUser("h1"); await mkUser("h2");
      assert.equal((await post("/api/billing/v2/checkout", { planId: "growth", termMonths: 3 })).status, 401);
      const r = await post("/api/billing/v2/checkout", { planId: "growth", termMonths: 3, userId: "h2", amountCents: 1, whopPlanId: offer("pro", 12).whopPlanId, monthlyAllowance: 99999 }, "h1");
      assert.equal(r.status, 200);
      const j: any = await r.json();
      assert.equal(j.offer.amountCents, 13230); assert.equal(j.offer.monthlyAllowance, 550); assert.equal(j.offer.autoRenew, false);
      const co = (await pool.query("SELECT user_id, whop_plan_id, whop_checkout_id FROM billing_checkouts_v2 WHERE id=$1", [j.checkoutId])).rows[0];
      assert.deepEqual([co.user_id, co.whop_plan_id], ["h1", offer("growth", 3).whopPlanId]);
      assert.equal((await post("/api/billing/v2/checkout", { planId: "growth", termMonths: 2 }, "h1")).status, 400);
      assert.equal((await post("/api/billing/v2/checkout", { planId: "free", termMonths: 1 }, "h1")).status, 400);
      assert.deepEqual(clientEnvironments, ["production"], "unset WHOP_ENVIRONMENT keeps the production base");
      cfgEnv = finalEnv({ WHOP_ENVIRONMENT: "sandbox" });
      const sandboxCheckout = await post("/api/billing/v2/checkout", { planId: "growth", termMonths: 1 }, "h2");
      assert.equal(sandboxCheckout.status, 200);
      assert.equal(clientEnvironments[clientEnvironments.length - 1], "sandbox", "explicit environment reaches the client factory");
      cfgEnv = env;

      const pid = pay(j.checkoutId, offer("growth", 3));
      // Browser redirect by a different logged-in account cannot claim it.
      assert.equal((await post("/api/billing/v2/reconcile", { paymentId: pid }, "h2")).status, 403);
      assert.equal((await post("/api/billing/v2/reconcile", { paymentId: "../../x" }, "h1")).status, 400);

      // Signed webhook -> same fulfillment path.
      const body = JSON.stringify({ type: "payment.succeeded", data: { id: pid, total: 0.01 } });
      const ts = Math.floor(Date.now() / 1000);
      const good = { "webhook-id": "msg_h1", "webhook-timestamp": String(ts), "webhook-signature": signWhopWebhookForTest(env.WHOP_WEBHOOK_SECRET, "msg_h1", ts, body) };
      assert.equal((await post("/api/webhooks/whop/billing-v2", body, undefined, { ...good, "webhook-signature": "v1,AAAA" })).status, 401);
      assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='h1'"), 0);
      const w = await post("/api/webhooks/whop/billing-v2", body, undefined, good);
      assert.equal(w.status, 200); assert.equal(((await w.json()) as any).result, "fulfilled");
      const replay = await post("/api/webhooks/whop/billing-v2", body, undefined, good);
      assert.equal(((await replay.json()) as any).replay, true);
      const rc = await post("/api/billing/v2/reconcile", { paymentId: pid }, "h1");
      assert.equal(rc.status, 200); assert.equal(((await rc.json()) as any).result, "already-fulfilled");
      assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='h1'"), 1);
      assert.equal((await user("h2")).plan, "free");

      // Existing-term error and no cancel/renew semantics for prepaid accounts.
      const again = await post("/api/billing/v2/checkout", { planId: "pro", termMonths: 1 }, "h1");
      assert.equal(again.status, 409); assert.equal(((await again.json()) as any).message, "existing-term");
      assert.equal((await post("/api/auth/cancel-plan", {}, "h1")).status, 409);
      assert.deepEqual(await (await post("/api/auth/cancel-plan", {}, "legacyGrowth")).json(), { legacy: true });

      // Kill switches / non-final catalog fail closed.
      cfgEnv = finalEnv({ BILLING_V2_CHECKOUT_ENABLED: "false" });
      assert.equal((await post("/api/billing/v2/checkout", { planId: "growth", termMonths: 1 }, "h2")).status, 503);
      cfgEnv = finalEnv({ WHOP_PREPAID_CATALOG_JSON: catalogJson({ discountFinal: false }) });
      assert.equal((await post("/api/billing/v2/checkout", { planId: "growth", termMonths: 1 }, "h2")).status, 503);
      assert.equal((await post("/api/billing/v2/reconcile", { paymentId: pid }, "h1")).status, 503);
      const ts2 = Math.floor(Date.now() / 1000);
      const sig2 = { "webhook-id": "msg_h2", "webhook-timestamp": String(ts2), "webhook-signature": signWhopWebhookForTest(env.WHOP_WEBHOOK_SECRET, "msg_h2", ts2, body) };
      assert.equal((await post("/api/webhooks/whop/billing-v2", body, undefined, sig2)).status, 503, "Whop retries later");
      // Refunds still revoke while fulfillment is off (fail safe).
      payments.get(pid)!.refunded_amount = money("5.00");
      const rb = JSON.stringify({ type: "refund.created", data: { id: "rfd_1", payment_id: pid } });
      const sig3 = { "webhook-id": "msg_h3", "webhook-timestamp": String(ts2), "webhook-signature": signWhopWebhookForTest(env.WHOP_WEBHOOK_SECRET, "msg_h3", ts2, rb) };
      const rr = await post("/api/webhooks/whop/billing-v2", rb, undefined, sig3);
      assert.equal(rr.status, 200); assert.equal(((await rr.json()) as any).result, "revoked-on-refund");
      assert.deepEqual(await user("h1"), { plan: "free", v: false });
      const st: any = await (await fetch(base + "/api/billing/v2/status")).json();
      assert.equal(st.checkoutOpen, false); assert.equal(st.autoRenew, false);
      assert.ok(!JSON.stringify(st).includes(env.WHOP_API_KEY));
      assert.deepEqual(Array.from(new Set(clientEnvironments)), ["production", "sandbox"]);

      // Invalid environment: no fallback to production, no client, no API call.
      const beforeInvalid = clientEnvironments.length;
      cfgEnv = finalEnv({ WHOP_ENVIRONMENT: "staging" });
      assert.equal((await post("/api/billing/v2/checkout", { planId: "growth", termMonths: 1 }, "h2")).status, 503);
      assert.equal((await post("/api/billing/v2/reconcile", { paymentId: pid }, "h1")).status, 503);
      const invBody = JSON.stringify({ type: "refund.created", data: { id: "rfd_invalid_env", payment_id: pid } });
      const tsInv = Math.floor(Date.now() / 1000);
      const invHeaders = { "webhook-id": "msg_invalid_env", "webhook-timestamp": String(tsInv), "webhook-signature": signWhopWebhookForTest(env.WHOP_WEBHOOK_SECRET, "msg_invalid_env", tsInv, invBody) };
      assert.equal((await post("/api/webhooks/whop/billing-v2", invBody, undefined, invHeaders)).status, 503, "revocation path also retries when environment is invalid");
      assert.equal(clientEnvironments.length, beforeInvalid, "no client constructed on invalid environment");
      const invStatus: any = await (await fetch(base + "/api/billing/v2/status")).json();
      assert.equal(invStatus.environment, null);
      assert.ok(invStatus.reasons.includes("invalid-whop-environment"));
      assert.ok(!JSON.stringify(invStatus).includes(env.WHOP_API_KEY));
    } finally { server.close(); }
  });

  await t.test("storage integration: v2 accounts bypass PLAN_CREDITS; legacy unchanged", async () => {
    const { storage } = await import("../server/storage");
    // Legacy paid subscriber: legacy monthly allowance logic still applies.
    const legacyBefore = await bal("legacyGrowth");
    const lb = await storage.upsertCreditBalance("legacyGrowth", "growth");
    assert.deepEqual([lb.monthlyCredits, lb.bonusCredits], [250, 12]);
    assert.deepEqual(await bal("legacyGrowth"), legacyBefore, "legacy paid subscriber unchanged");
    const ld = await storage.deductCredits("legacyGrowth", 5, "t", "t", "growth");
    assert.equal(ld.success, true);
    assert.deepEqual(await bal("legacyGrowth"), { m: 250, b: 7 }, "legacy debit order (bonus first) unchanged");
    // v2 account (st1, active Growth 3m): session plan arg is ignored, no legacy grants.
    await mkUser("st1"); { const b = await buy("st1", "growth", 3); assert.equal((await processWhopPayment(deps(), b.paymentId)).result, "fulfilled"); }
    await storage.activatePlanCredits("st1", "elite");
    assert.deepEqual(await bal("st1"), { m: 550, b: 30 });
    const r = await storage.deductCredits("st1", 10, "t", "t", "elite");
    assert.equal(r.success, true);
    assert.deepEqual(await bal("st1"), { m: 540, b: 30 }, "elite session plan cannot bypass v2 debit");
    await storage.refundCredits("st1", 10, "t", "t", "growth");
    assert.deepEqual(await bal("st1"), { m: 540, b: 40 });
    await storage.addBonusCredits("st1", 5, "admin grant");
    assert.deepEqual(await bal("st1"), { m: 540, b: 45 });
    // Legacy free account without enrollment flag keeps the legacy daily path.
    await mkUser("legacyFree", "free", "client", 3, 0);
    const lf = await storage.upsertCreditBalance("legacyFree", "free");
    assert.equal(lf.monthlyCredits, 20, "legacy daily free grant unchanged when v2 enrollment is off");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_accounts_v2 WHERE user_id='legacyFree'"), 0);
    await (await import("../server/storage")).pool.end();
  });

  await t.test("current contract pipeline: exclusive tax fulfills at the sold catalog amount", async () => {
    await mkUser("tax1");
    const o = offer("pro", 3);
    const { checkoutId } = await mkCheckout("tax1", o);
    const gross = (o.amountCents / 100 + 12).toFixed(2);
    // total is the buyer's account-facing gross (price + exclusive tax); the
    // ledger must still record and re-check the immutable sold price.
    const pid = pay(checkoutId, o, { tax_behavior: "exclusive", tax_amount: money("12.00"), total: money(gross), amount_charged: money(gross) });
    const r = await processWhopPayment(deps(), pid);
    assert.equal(r.result, "fulfilled");
    const p = (await pool.query("SELECT amount_cents, status FROM billing_payments_v2 WHERE whop_payment_id=$1", [pid])).rows[0];
    assert.deepEqual(p, { amount_cents: o.amountCents, status: "fulfilled" });
    assert.equal(p.amount_cents, o.amountCents, "not the tax-inclusive gross total");
    const e = (await pool.query("SELECT plan_id, term_months, monthly_allowance FROM billing_entitlements_v2 WHERE user_id='tax1'")).rows[0];
    assert.deepEqual([e.plan_id, e.term_months, e.monthly_allowance], [o.planId, o.termMonths, o.monthlyAllowance]);
    assert.deepEqual(await bal("tax1"), { m: o.monthlyAllowance, b: 30 });
    assert.deepEqual(await user("tax1"), { plan: "pro", v: true });
  });

  await t.test("current contract pipeline: wrong checkout_configuration_id never grants", async () => {
    await mkUser("cfg1");
    const o = offer("growth", 1);
    const { checkoutId } = await mkCheckout("cfg1", o);
    const pid = pay(checkoutId, o, { checkout_configuration_id: "ch_wrong000001" });
    assert.deepEqual(await processWhopPayment(deps(), pid), { result: "rejected", reason: "checkout-configuration-mismatch" });
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_payments_v2 WHERE whop_payment_id=$1", [pid]), 0);
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='cfg1'"), 0);
    assert.deepEqual(await bal("cfg1"), { m: 7, b: 30 });
    assert.deepEqual(await user("cfg1"), { plan: "free", v: false });
  });

  await t.test("current contract pipeline: webhook before checkout persist defers, then succeeds on retry", async () => {
    await mkUser("race1");
    const o = offer("growth", 1);
    // Webhook can arrive between Whop creating the configuration and routes.ts
    // storing its id. Defer so the event stays retryable; never grant early.
    const { checkoutId } = await L.createCheckoutRecord(pool, "race1", o);
    const pid = pay(checkoutId, o);
    assert.deepEqual(await processWhopPayment(deps(), pid), { result: "deferred", reason: "checkout-not-persisted" });
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_payments_v2 WHERE whop_payment_id=$1", [pid]), 0);
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='race1'"), 0);
    assert.equal((await pool.query("SELECT status FROM billing_checkouts_v2 WHERE id=$1", [checkoutId])).rows[0].status, "created");
    await pool.query("UPDATE billing_checkouts_v2 SET whop_checkout_id = $2 WHERE id = $1", [checkoutId, whopCheckoutIdFor(checkoutId)]);
    assert.equal((await processWhopPayment(deps(), pid)).result, "fulfilled");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='race1'"), 1);
    assert.deepEqual(await bal("race1"), { m: o.monthlyAllowance, b: 30 });
  });

  await t.test("durable reversal: refund/dispute tombstone blocks stale paid grants and changes nothing else", async () => {
    const fullPrice = (o: any) => money((o.amountCents / 100).toFixed(2));
    const clientFor = (payment: any) => ({
      async getPayment() { return structuredClone(payment); },
      async createCheckout() { throw new Error("no API calls in reversal path"); },
    });
    const untouchedFree = async (uid: string) => {
      assert.equal(await count("SELECT COUNT(*)::int n FROM billing_accounts_v2 WHERE user_id=$1", [uid]), 0, "no v2 enrollment");
      assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id=$1", [uid]), 0);
      assert.deepEqual(await bal(uid), { m: 7, b: 30 }, "monthly unchanged and purchased bonus kept");
      assert.deepEqual(await user(uid), { plan: "free", v: false }, "unrelated plan not downgraded");
    };
    const o = offer("growth", 1);

    await mkUser("revRefund");
    const r1 = await mkCheckout("revRefund", o);
    const p1 = pay(r1.checkoutId, o);
    const paid1 = structuredClone(payments.get(p1));
    const refunded1 = { ...paid1, substatus: "refunded", refunded_amount: fullPrice(o) };
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor(refunded1) as any }, p1), { result: "revoked-on-refund", detail: "tombstoned" });
    const tomb1 = (await pool.query("SELECT checkout_id, user_id, amount_cents, currency, offer_snapshot, snapshot_hash, status, review_reason FROM billing_payments_v2 WHERE whop_payment_id=$1", [p1])).rows[0];
    const co1 = (await pool.query("SELECT offer_snapshot, snapshot_hash, status FROM billing_checkouts_v2 WHERE id=$1", [r1.checkoutId])).rows[0];
    assert.deepEqual([tomb1.checkout_id, tomb1.user_id], [r1.checkoutId, "revRefund"]);
    assert.deepEqual([tomb1.amount_cents, tomb1.currency], [o.amountCents, o.currency]);
    assert.deepEqual(tomb1.offer_snapshot, co1.offer_snapshot, "immutable sold snapshot preserved from checkout");
    assert.equal(tomb1.snapshot_hash, co1.snapshot_hash);
    assert.deepEqual([tomb1.status, co1.status], ["refunded", "rejected"]);
    assert.ok(String(tomb1.review_reason).startsWith("reversal-before-fulfillment:"));
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor(paid1) as any }, p1), { result: "revoked", status: "refunded" }, "stale paid response cannot grant");
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor(refunded1) as any }, p1), { result: "revoked-on-refund", detail: "already-revoked" }, "duplicate reversal is replay-safe");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_payments_v2 WHERE whop_payment_id=$1", [p1]), 1);
    await untouchedFree("revRefund");

    await mkUser("revRace");
    const r2 = await mkCheckout("revRace", o);
    const p2 = pay(r2.checkoutId, o);
    const paid2 = structuredClone(payments.get(p2));
    let releasePaid!: () => void; let paidStarted!: () => void;
    const started = new Promise<void>(r => { paidStarted = r; });
    const gate = new Promise<void>(r => { releasePaid = r; });
    const delayedPaid = {
      async getPayment() { paidStarted(); await gate; return structuredClone(paid2); },
      async createCheckout() { throw new Error("no API calls"); },
    };
    const paidJob = processWhopPayment({ ...deps(), whop: delayedPaid as any }, p2);
    await started;
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor({ ...paid2, refunded_amount: fullPrice(o) }) as any }, p2), { result: "revoked-on-refund", detail: "tombstoned" });
    releasePaid();
    assert.deepEqual(await paidJob, { result: "revoked", status: "refunded" });
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='revRace' AND status='active'"), 0);
    await untouchedFree("revRace");

    await mkUser("revDispute");
    const r3 = await mkCheckout("revDispute", o);
    const p3 = pay(r3.checkoutId, o);
    const paid3 = structuredClone(payments.get(p3));
    const disputed = { ...paid3, dispute_created_at: "2026-11-23T10:00:00.000Z" };
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor(disputed) as any }, p3), { result: "revoked-on-refund", detail: "tombstoned" });
    assert.equal((await pool.query("SELECT status FROM billing_payments_v2 WHERE whop_payment_id=$1", [p3])).rows[0].status, "disputed");
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor(paid3) as any }, p3), { result: "revoked", status: "disputed" });
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor(disputed) as any }, p3), { result: "revoked-on-refund", detail: "already-revoked" });
    await untouchedFree("revDispute");

    await mkUser("revWrongBiz");
    const r4 = await mkCheckout("revWrongBiz", o);
    const p4 = pay(r4.checkoutId, o, { account_id: "biz_wrong000001", refunded_amount: fullPrice(o) });
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor(payments.get(p4)) as any }, p4), { result: "ignored", reason: "reversal-business-mismatch" });
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_payments_v2 WHERE whop_payment_id=$1", [p4]), 0);
    assert.equal((await pool.query("SELECT status FROM billing_checkouts_v2 WHERE id=$1", [r4.checkoutId])).rows[0].status, "created");
    await untouchedFree("revWrongBiz");

    await mkUser("revWrongCfg");
    const r5 = await mkCheckout("revWrongCfg", o);
    const p5 = pay(r5.checkoutId, o, { checkout_configuration_id: "ch_wrong000001", refunded_amount: fullPrice(o) });
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor(payments.get(p5)) as any }, p5), { result: "ignored", reason: "reversal-checkout-configuration-mismatch" });
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_payments_v2 WHERE whop_payment_id=$1", [p5]), 0);
    assert.equal((await pool.query("SELECT status FROM billing_checkouts_v2 WHERE id=$1", [r5.checkoutId])).rows[0].status, "created");
    await untouchedFree("revWrongCfg");

    await mkUser("revLegacy", "growth");
    const legacyPid = "pay_LegacyRev01";
    payments.set(legacyPid, {
      id: legacyPid, status: "paid", substatus: "refunded", account_id: TEST_COMPANY,
      product_id: "prod_otherX", variant_id: "plan_otherX", checkout_configuration_id: null,
      metadata: null, currency: "usd", total: fullPrice(o), subtotal: fullPrice(o),
      tax_amount: null, tax_behavior: "unspecified", refunded_amount: fullPrice(o),
      amount_charged: fullPrice(o), paid_at: "2026-11-22T10:00:00.000Z", auto_refunded: false,
      dispute_created_at: null, dispute_alerted_at: null,
    });
    assert.deepEqual(await processWhopPayment({ ...deps(), whop: clientFor(payments.get(legacyPid)) as any }, legacyPid), { result: "ignored", reason: "not-a-v2-payment" });
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_payments_v2 WHERE whop_payment_id=$1", [legacyPid]), 0);
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_accounts_v2 WHERE user_id='revLegacy'"), 0);
    assert.deepEqual(await user("revLegacy"), { plan: "growth", v: false }, "unrelated legacy subscriber untouched");
    assert.deepEqual(await bal("revLegacy"), { m: 7, b: 30 }, "legacy balance untouched");
  });

  await t.test("session middleware cache stops at paid term, UTC month and leaves legacy untouched", async () => {
    const clock = { value: new Date() };
    const middleware = billingV2SessionMiddleware({ db: pool, freeEnrollment: () => false, now: () => clock.value });
    const run = async (user: any) => {
      const req: any = { path: "/api/credits", user, isAuthenticated: () => true };
      await middleware(req, {} as any, ((e?: unknown) => { if (e) throw e; }) as any);
      return req.user;
    };

    await mkUser("mwPaid");
    const o = offer("growth", 1);
    const { checkoutId } = await mkCheckout("mwPaid", o);
    const t0 = new Date();
    const pid = pay(checkoutId, o, { paid_at: t0.toISOString() });
    assert.equal((await processWhopPayment(deps(t0), pid)).result, "fulfilled");
    const ent = (await pool.query("SELECT ends_at FROM billing_entitlements_v2 WHERE user_id='mwPaid'")).rows[0];
    const endsAt = new Date(ent.ends_at);
    const before = new Date(endsAt.getTime() - 1_000);
    const session: any = { id: "mwPaid", plan: "free", role: "client" };

    clock.value = before;
    assert.equal((await run(session)).plan, o.planId, "recently cached request sees paid before expiry");
    // A second call inside the short cache still sees paid; the cache must not run past endsAt.
    clock.value = new Date(before.getTime() + 500);
    assert.equal((await run(session)).plan, o.planId);
    clock.value = endsAt; // exact boundary, no real waiting
    assert.equal((await run(session)).plan, "free", "exact expiry refreshes despite the 60s cache");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_entitlements_v2 WHERE user_id='mwPaid' AND status='active'"), 0);
    assert.equal(await count("SELECT COUNT(*)::int n FROM oravini_free_grants_v2 WHERE user_id='mwPaid'"), 1);
    assert.deepEqual(await bal("mwPaid"), { m: 100, b: 30 }, "paid allowance removed, Free monthly reset, bonus kept");

    const nextMonth = new Date(Date.UTC(endsAt.getUTCFullYear(), endsAt.getUTCMonth() + 1, 1));
    clock.value = new Date(nextMonth.getTime() - 1_000);
    assert.equal((await run(session)).plan, "free");
    clock.value = nextMonth;
    assert.equal((await run(session)).plan, "free");
    assert.equal(await count("SELECT COUNT(*)::int n FROM oravini_free_grants_v2 WHERE user_id='mwPaid'"), 2, "UTC month boundary is not skipped");
    assert.deepEqual(await bal("mwPaid"), { m: 100, b: 30 });

    await mkUser("mwTerm", "free", "client", 7, 30);
    const o3 = offer("growth", 3);
    const termCheckout = await mkCheckout("mwTerm", o3);
    const t3 = new Date();
    const termPid = pay(termCheckout.checkoutId, o3, { paid_at: t3.toISOString() });
    assert.equal((await processWhopPayment(deps(t3), termPid)).result, "fulfilled");
    const periodEnd = new Date((await pool.query("SELECT period_end FROM billing_period_grants_v2 WHERE user_id='mwTerm' AND period_index=0")).rows[0].period_end);
    const termSession: any = { id: "mwTerm", plan: "free", role: "client" };
    clock.value = new Date(periodEnd.getTime() - 1_000);
    assert.equal((await run(termSession)).plan, o3.planId, "three-month term is paid just before its first period end");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_period_grants_v2 WHERE user_id='mwTerm'"), 1);
    clock.value = periodEnd;
    assert.equal((await run(termSession)).plan, o3.planId, "paid term stays active at the first period boundary");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_period_grants_v2 WHERE user_id='mwTerm'"), 2, "allowance resets at periodEnd despite the short cache");
    assert.deepEqual(await bal("mwTerm"), { m: o3.monthlyAllowance, b: 30 }, "bonus credits untouched across the reset");

    await mkUser("mwLegacy", "growth");
    const legacy: any = { id: "mwLegacy", plan: "growth", role: "client" };
    clock.value = new Date();
    await run(legacy);
    clock.value = new Date(clock.value.getTime() + 300_001);
    assert.equal((await run(legacy)).plan, "growth", "legacy account unchanged on cached and uncached paths");
    assert.equal(await count("SELECT COUNT(*)::int n FROM billing_accounts_v2 WHERE user_id='mwLegacy'"), 0);
    assert.deepEqual(await bal("mwLegacy"), { m: 7, b: 30 });
    assert.deepEqual(await user("mwLegacy"), { plan: "growth", v: false });
  });

  await pool.end();
});
