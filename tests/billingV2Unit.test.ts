import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parseCatalog, findOffer, snapshotHash, expectedAmountCents } from "../server/billing/catalog";
import { loadBillingV2Config, billingV2Status, parseWhopEnvironment, WHOP_API_BASES } from "../server/billing/config";
import { normalizeWhopPayment, assertPaymentMatchesSnapshot, parseMoneyCents, PaymentVerificationError } from "../server/billing/whopVerification";
import { createWhopClient } from "../server/billing/whopClient";
import { verifyWhopWebhook, signWhopWebhookForTest } from "../server/billing/whopWebhook";
import { periodIndexAt, termEnd } from "../server/billing/ledger";
import { paymentIdFromEvent } from "../server/billing/service";
import { proposedOffer } from "../shared/pricingV2";
import { catalogJson, finalEnv, TEST_COMPANY } from "./helpers/billingV2Fixture";

const cat = () => { const r = parseCatalog(catalogJson(), TEST_COMPANY); assert.ok(r.ok, JSON.stringify(r.errors)); return r.catalog; };

test("valid finalized catalog maps every plan x term to an immutable snapshot", () => {
  const c = cat();
  assert.equal(c.offers.length, 12);
  const g12 = findOffer(c, "growth_video", 12)!;
  assert.equal(g12.monthlyAllowance, 1250);
  assert.equal(g12.amountCents, 69 * 12 * 75);
  assert.equal(g12.autoRenew, false);
  assert.deepEqual(g12.featureRights, { webinars: true, videoMarketing: true, competitorDeep: true });
  assert.throws(() => { (g12 as any).amountCents = 1; });
  assert.equal(findOffer(c, "growth", 3)!.monthlyAllowance, 550);
  assert.equal(findOffer(c, "pro", 6)!.monthlyAllowance, 900);
  assert.equal(findOffer(c, "pro", 12)!.amountCents, 59 * 12 * 100);
  assert.equal(findOffer(c, "free", 1), null);
  assert.equal(findOffer(c, "growth", 2), null);
  assert.equal(snapshotHash(g12), snapshotHash({ ...g12 }));
});

test("plain Growth has no webinar/video rights; Pro and Growth+Video do", () => {
  const c = cat();
  for (const t of [1, 3, 6, 12]) {
    assert.equal(findOffer(c, "growth", t)!.featureRights.webinars, false);
    assert.equal(findOffer(c, "growth", t)!.legacyMapping.hasVideoMarketing, false);
    assert.equal(findOffer(c, "pro", t)!.featureRights.webinars, true);
    assert.deepEqual(findOffer(c, "growth_video", t)!.legacyMapping, { plan: "growth", hasVideoMarketing: true });
  }
});

test("catalog gate fails closed on every defect", () => {
  const bad = (json: string | undefined, company: string | null = TEST_COMPANY) => { const r = parseCatalog(json, company); assert.equal(r.ok, false); return r.errors.join(","); };
  assert.match(bad(undefined), /missing/);
  assert.match(bad("{nope"), /invalid-json/);
  assert.match(bad(catalogJson({ discountFinal: false })), /discount-not-final/);
  assert.match(bad(catalogJson({ businessName: "PLUXA" })), /wrong-business/);
  assert.match(bad(catalogJson(), "biz_SomeoneElse1"), /company-id-mismatch/);
  assert.match(bad(catalogJson(), null), /company-id-mismatch/);
  assert.match(bad(catalogJson({}, o => o.planId === "growth" && o.termMonths === 3 ? { ...o, amountCents: o.amountCents + 1 } : o)), /amount-mismatch:growth:3/);
  assert.match(bad(catalogJson({}, o => ({ ...o, whopPlanId: null }))), /invalid-variant-id/);
  assert.match(bad(catalogJson({}, o => ({ ...o, whopPlanId: "plan_same1" }))), /duplicate-variant-id/);
  assert.match(bad(catalogJson({}, o => o.termMonths === 12 ? { ...o, planType: "renewal" } : o)), /not-one-time/);
  assert.match(bad(catalogJson({}, o => ({ ...o, currency: "eur" }))), /invalid-currency/);
  assert.match(bad(JSON.stringify({ ...JSON.parse(catalogJson()), offers: JSON.parse(catalogJson()).offers.slice(1) })), /missing-offer:growth:1/);
  assert.match(bad(catalogJson({ discounts: { growth: { 1: 0, 3: 10, 6: 15, 12: 25 }, growth_video: { 1: 0, 3: 10, 6: 15, 12: 25 }, pro: { 1: 0, 3: 5, 6: 0, 12: 0 } } })), /invalid-discount:pro:3/);
  assert.match(bad(catalogJson({ discounts: { growth: { 1: 5, 3: 10, 6: 15, 12: 25 }, growth_video: { 1: 0, 3: 10, 6: 15, 12: 25 }, pro: { 1: 0, 3: 0, 6: 0, 12: 0 } } })), /invalid-discount:growth:1/);
});

test("preview pricing stays non-final; status gate closed without explicit final config", () => {
  assert.equal(proposedOffer("growth", 12).discountFinal, false);
  assert.equal(proposedOffer("growth", 12).checkoutEnabled, false);
  const empty = billingV2Status(loadBillingV2Config({}), true);
  assert.equal(empty.checkoutOpen, false); assert.equal(empty.fulfillmentOpen, false); assert.equal(empty.webhookOpen, false);
  assert.ok(empty.reasons.includes("catalog:missing") && empty.reasons.includes("checkout-kill-switch-off"));
  const ok = billingV2Status(loadBillingV2Config(finalEnv()), true);
  assert.deepEqual([ok.checkoutOpen, ok.fulfillmentOpen, ok.webhookOpen, ok.reasons.length], [true, true, true, 0]);
  assert.equal(billingV2Status(loadBillingV2Config(finalEnv()), false).checkoutOpen, false);
  assert.equal(billingV2Status(loadBillingV2Config(finalEnv({ BILLING_V2_CHECKOUT_ENABLED: "false" })), true).checkoutOpen, false);
  assert.equal(billingV2Status(loadBillingV2Config(finalEnv({ WHOP_WEBHOOK_SECRET: undefined })), true).checkoutOpen, false);
  assert.equal(billingV2Status(loadBillingV2Config(finalEnv({ WHOP_API_KEY: "" })), true).fulfillmentOpen, false);
  const draft = billingV2Status(loadBillingV2Config(finalEnv({ WHOP_PREPAID_CATALOG_JSON: catalogJson({ discountFinal: false }) })), true);
  assert.equal(draft.checkoutOpen, false); assert.ok(draft.reasons.includes("catalog:discount-not-final"));
  assert.ok(!JSON.stringify(ok).includes("test_key_not_real") && !JSON.stringify(ok).includes("test_webhook_secret"));
});

test("WHOP_ENVIRONMENT is strict: unset defaults to production, invalid fails closed", () => {
  assert.equal(parseWhopEnvironment(undefined), "production");
  assert.equal(parseWhopEnvironment("production"), "production");
  assert.equal(parseWhopEnvironment("sandbox"), "sandbox");
  for (const bad of ["", " staging ", "SANDBOX", "https://evil.example/api/v1", "production "]) {
    assert.equal(parseWhopEnvironment(bad), null, JSON.stringify(bad));
  }
  assert.deepEqual(WHOP_API_BASES, {
    production: "https://api.whop.com/api/v1",
    sandbox: "https://sandbox-api.whop.com/api/v1",
  });
  const base = finalEnv();
  const statusOf = (over: Record<string, string | undefined>) => billingV2Status(loadBillingV2Config(finalEnv(over)), true);
  const unset = billingV2Status(loadBillingV2Config(base), true);
  assert.equal(unset.environment, "production");
  assert.deepEqual([unset.checkoutOpen, unset.fulfillmentOpen, unset.webhookOpen, unset.reasons.length], [true, true, true, 0]);
  const sandbox = statusOf({ WHOP_ENVIRONMENT: "sandbox" });
  assert.equal(sandbox.environment, "sandbox");
  assert.deepEqual([sandbox.checkoutOpen, sandbox.fulfillmentOpen, sandbox.webhookOpen, sandbox.reasons.length], [true, true, true, 0]);
  const prod = statusOf({ WHOP_ENVIRONMENT: "production" });
  assert.equal(prod.environment, "production");
  assert.equal(prod.checkoutOpen, true);
  for (const bad of ["", "staging", "SANDBOX", "https://evil.example/api/v1"]) {
    const s = statusOf({ WHOP_ENVIRONMENT: bad });
    assert.equal(s.environment, null);
    assert.ok(s.reasons.includes("invalid-whop-environment"), JSON.stringify(bad));
    assert.deepEqual([s.checkoutOpen, s.fulfillmentOpen, s.webhookOpen], [false, false, false]);
  }
  assert.equal(loadBillingV2Config(finalEnv({ WHOP_ENVIRONMENT: "sandbox" })).environment, "sandbox");
  assert.equal(loadBillingV2Config(finalEnv({ WHOP_ENVIRONMENT: "staging" })).environment, null);
  assert.ok(!JSON.stringify(sandbox).includes("test_key_not_real") && !JSON.stringify(sandbox).includes("test_webhook_secret"));
});

export const TEST_WHOP_CHECKOUT_ID = "ch_testcheckout01";
export const usdMoney = (amount: string, currency = "usd") => ({ amount, currency, decimals: 2, display_decimals: 2 });

export function paidPayment(over: Record<string, unknown> = {}) {
  // Current 2026-11-20 Payment/Money contract: flat ids, Money objects, no
  // company/plan/product objects and no numeric money fields.
  return {
    id: "pay_Abc12345", status: "paid", substatus: "succeeded",
    account_id: TEST_COMPANY, product_id: "prod_growthX", variant_id: "plan_growth3m",
    checkout_configuration_id: TEST_WHOP_CHECKOUT_ID,
    metadata: { oravini_checkout_id: "11111111-1111-4111-8111-111111111111" },
    currency: "usd",
    total: usdMoney("132.30"), subtotal: usdMoney("147.00"), tax_amount: null, tax_behavior: "exclusive",
    refunded_amount: null, amount_charged: usdMoney("132.30"),
    paid_at: "2026-11-22T10:00:00.000Z", auto_refunded: false,
    dispute_created_at: null, dispute_alerted_at: null,
    ...over,
  };
}

const verificationCode = (raw: any, persisted: string | null = TEST_WHOP_CHECKOUT_ID) => {
  const snap = findOffer(cat(), "growth", 3)!;
  try { assertPaymentMatchesSnapshot(normalizeWhopPayment(raw), snap, TEST_COMPANY, persisted); return "ok"; }
  catch (e) { return (e as PaymentVerificationError).code; }
};

test("payment verification: exact business/product/variant/status/client binding", () => {
  assert.equal(expectedAmountCents("growth", 3, 10), 13230);
  assert.equal(verificationCode(paidPayment()), "ok");
  assert.equal(verificationCode(paidPayment({ account_id: "biz_Pluxa0001" })), "business-mismatch");
  assert.equal(verificationCode(paidPayment({ account_id: null })), "business-mismatch");
  assert.equal(verificationCode(paidPayment({ product_id: "prod_otherX" })), "product-mismatch");
  assert.equal(verificationCode(paidPayment({ product_id: null })), "product-mismatch");
  assert.equal(verificationCode(paidPayment({ variant_id: "plan_growth12m" })), "variant-mismatch");
  assert.equal(verificationCode(paidPayment({ status: "pending" })), "not-paid");
  assert.equal(verificationCode(paidPayment({ status: "open", substatus: "pending" })), "not-paid");
  assert.equal(verificationCode(paidPayment({ status: "draft", substatus: "drafted" })), "not-paid");
  assert.equal(verificationCode(paidPayment({ substatus: "failed" })), "not-paid");
  assert.equal(verificationCode(paidPayment({ checkout_configuration_id: "ch_other12345" })), "checkout-configuration-mismatch");
  assert.equal(verificationCode(paidPayment({ checkout_configuration_id: null })), "missing-checkout-configuration");
  assert.equal(verificationCode(paidPayment(), null), "checkout-not-persisted");
  assert.equal(verificationCode(paidPayment({ metadata: {} })), "missing-checkout-binding");
  assert.equal(verificationCode(paidPayment({ metadata: { oravini_checkout_id: "not-a-uuid" } })), "missing-checkout-binding");
  assert.equal(verificationCode(paidPayment({ id: "bogus" })), "malformed-payment");
  assert.equal(verificationCode(paidPayment({ status: "paid", substatus: "unknown_status" })), "unsupported-payment-schema");
  const snap = findOffer(cat(), "growth", 3)!;
  assert.throws(() => assertPaymentMatchesSnapshot(normalizeWhopPayment(paidPayment()), snap, "", TEST_WHOP_CHECKOUT_ID), /business-mismatch/);
});

test("Money is an exact decimal string: parse cents, reject malformed/sub-cent/unsafe/currency", () => {
  assert.equal(parseMoneyCents(usdMoney("132.30"), "usd"), 13230);
  assert.equal(parseMoneyCents(usdMoney("0.01"), "usd"), 1);
  assert.equal(parseMoneyCents(usdMoney("0.00"), "usd"), 0);
  assert.equal(parseMoneyCents(null, "usd"), null);
  assert.equal(parseMoneyCents({ amount: "12.340", currency: "usd", decimals: 3, display_decimals: 2 }, "usd"), 1234);
  const bad = (v: unknown) => assert.throws(() => parseMoneyCents(v, "usd"), (e: any) => e.code === "invalid-money" || e.code === "currency-mismatch");
  bad(132.3);                                             // number, not a string
  bad("132.30");                                          // bare string
  bad(usdMoney("132.301"));                               // sub-cent precision
  bad({ amount: "12.345", currency: "usd", decimals: 3, display_decimals: 2 }); // 1234.5 cents
  bad(usdMoney("-0.01"));                                 // negative money
  bad(usdMoney("12.abc"));
  assert.equal(verificationCode(paidPayment({ total: usdMoney("-132.30") })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ tax_amount: usdMoney("-1.00") })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ refunded_amount: usdMoney("-1.00") })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ amount_charged: usdMoney("-1.00") })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ subtotal: usdMoney("-1.00") })), "invalid-money");
  bad({ amount: "132.30", currency: "USD", decimals: 2, display_decimals: 2 });
  bad({ amount: "132.30", currency: "eur", decimals: 2, display_decimals: 2 });
  bad({ amount: "132.30", currency: "usd", decimals: "2", display_decimals: 2 });
  bad({ amount: "132.30", currency: "usd", decimals: 2 });
  bad(usdMoney("99999999999999999.99"));                   // unsafe integer
  assert.equal(verificationCode(paidPayment({ total: usdMoney("132.301") })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ total: 132.3 })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ amount_charged: { ...usdMoney("132.30"), currency: "eur" } })), "currency-mismatch");
});

test("tax exclusive/inclusive totals, buyer fees and subtotal are handled distinctly", () => {
  assert.equal(verificationCode(paidPayment()), "ok", "exclusive with no tax");
  assert.equal(verificationCode(paidPayment({ tax_behavior: "exclusive", tax_amount: usdMoney("10.00"), total: usdMoney("142.30") })), "ok", "tax added on top");
  assert.equal(verificationCode(paidPayment({ tax_behavior: "exclusive", tax_amount: usdMoney("10.00"), total: usdMoney("132.30") })), "amount-mismatch");
  assert.equal(verificationCode(paidPayment({ tax_behavior: "inclusive", tax_amount: usdMoney("10.00"), total: usdMoney("132.30") })), "ok", "tax already inside price");
  assert.equal(verificationCode(paidPayment({ tax_behavior: "inclusive", tax_amount: usdMoney("10.00"), total: usdMoney("142.30") })), "amount-mismatch");
  assert.equal(verificationCode(paidPayment({ tax_behavior: "inclusive", tax_amount: usdMoney("200.00") })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ tax_behavior: "unspecified" })), "unsupported-tax-behavior");
  assert.equal(verificationCode(paidPayment({ tax_behavior: null })), "unsupported-tax-behavior");
  assert.equal(verificationCode(paidPayment({ amount_charged: usdMoney("150.00") })), "ok", "buyer fees are not the sold price");
  assert.equal(verificationCode(paidPayment({ total: usdMoney("150.00"), amount_charged: usdMoney("132.30") })), "amount-mismatch");
  assert.equal(verificationCode(paidPayment({ subtotal: usdMoney("100.00") })), "amount-mismatch");
  assert.equal(verificationCode(paidPayment({ total: usdMoney("132.29") })), "amount-mismatch");
  assert.equal(verificationCode(paidPayment({ total: undefined })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ currency: "eur" })), "currency-mismatch");
});

test("current refund/dispute fields and paid_at validity fail closed without widening acceptance", () => {
  assert.equal(verificationCode(paidPayment({ refunded_amount: usdMoney("10.00") })), "refunded");
  assert.equal(verificationCode(paidPayment({ refunded_amount: usdMoney("0.00") })), "ok");
  assert.equal(verificationCode(paidPayment({ auto_refunded: true })), "refunded");
  assert.equal(verificationCode(paidPayment({ substatus: "partially_refunded" })), "refunded");
  assert.equal(verificationCode(paidPayment({ dispute_created_at: "2026-11-23T00:00:00.000Z" })), "disputed");
  assert.equal(verificationCode(paidPayment({ dispute_alerted_at: "2026-11-23T00:00:00.000Z" })), "disputed");
  assert.equal(verificationCode(paidPayment({ substatus: "dispute_warning" })), "disputed");
  // Malformed refund Money must never be read as a refund (no revocation).
  assert.equal(verificationCode(paidPayment({ refunded_amount: 10 })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ refunded_amount: "10.00" })), "invalid-money");
  assert.equal(verificationCode(paidPayment({ paid_at: "not-a-date" })), "invalid-paid-at");
  assert.equal(verificationCode(paidPayment({ paid_at: null })), "invalid-paid-at");
  assert.equal(verificationCode(paidPayment({ paid_at: 1800000000000 })), "invalid-paid-at");
});

test("old self-authored payment fixtures are rejected, not silently accepted", () => {
  const legacy = {
    id: "pay_Abc12345", status: "paid", substatus: "succeeded", company: { id: TEST_COMPANY },
    product: { id: "prod_growthX" }, plan: { id: "plan_growth3m" }, total: 132.3, currency: "usd",
    refunded_amount: 0, paid_at: "2026-11-22T10:00:00Z", metadata: { oravini_checkout_id: "11111111-1111-4111-8111-111111111111" },
  };
  assert.equal(verificationCode(legacy), "unsupported-payment-schema");
  const missingCurrentFields: Record<string, unknown> = { ...paidPayment() };
  delete missingCurrentFields.checkout_configuration_id;
  assert.equal(verificationCode(missingCurrentFields), "unsupported-payment-schema");
  const malformedMoney = { ...paidPayment(), refunded_amount: 0 };
  assert.equal(verificationCode(malformedMoney), "invalid-money");
});

test("checkout client: pinned API version, current body, idempotency key", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: true, json: async () => ({ id: "ch_created0001", purchase_url: "https://whop.com/checkout/ch_created0001" }) } as any;
  }) as unknown as typeof fetch;
  const client = createWhopClient("test_key_not_real", "production", fakeFetch);
  await client.getPayment("pay_Abc12345");
  const checkoutId = "11111111-1111-4111-8111-111111111111";
  const r = await client.createCheckout({
    accountId: TEST_COMPANY, whopPlanId: "plan_growth3m", checkoutId,
    catalogVersion: "test-v1", redirectUrl: "https://oravini.example/thanks",
  });
  assert.deepEqual(r, { id: "ch_created0001", purchaseUrl: "https://whop.com/checkout/ch_created0001" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://api.whop.com/api/v1/payments/pay_Abc12345");
  assert.equal(calls[1].url, "https://api.whop.com/api/v1/checkout_configurations");
  assert.equal(calls[1].init.method, "POST");
  const h = calls[1].init.headers as Record<string, string>;
  assert.equal(h.Authorization, "Bearer test_key_not_real");
  assert.equal(h["Api-Version-Date"], "2026-11-20");
  assert.equal(h["Idempotency-Key"], checkoutId);
  assert.equal((calls[0].init.headers as Record<string, string>)["Api-Version-Date"], "2026-11-20");
  assert.equal((calls[0].init.headers as Record<string, string>)["Idempotency-Key"], undefined);
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    account_id: TEST_COMPANY, variant_id: "plan_growth3m",
    metadata: { oravini_checkout_id: checkoutId, oravini_catalog_version: "test-v1" },
    redirect_url: "https://oravini.example/thanks",
  });
  await client.createCheckout({ accountId: TEST_COMPANY, whopPlanId: "plan_growth3m", checkoutId, catalogVersion: "test-v1", redirectUrl: null });
  assert.equal("redirect_url" in JSON.parse(String(calls[2].init.body)), false);
});

test("checkout client environment: exact host, version pin and idempotency for each base", async () => {
  const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seen.push({ url, headers: init.headers as Record<string, string>, body: String(init.body) });
    return { ok: true, json: async () => ({ id: "ch_env00001", purchase_url: "https://whop.com/checkout/ch_env00001" }) } as any;
  }) as unknown as typeof fetch;
  for (const env of ["production", "sandbox"] as const) {
    const client = createWhopClient("test_key_not_real", env, fakeFetch);
    const checkoutId = `11111111-1111-4111-8111-00000000000${env === "sandbox" ? "2" : "1"}`;
    await client.getPayment("pay_Abc12345");
    await client.createCheckout({ accountId: TEST_COMPANY, whopPlanId: "plan_growth3m", checkoutId, catalogVersion: "test-v1", redirectUrl: null });
    const i = seen.length - 2;
    assert.equal(seen[i].url, `${WHOP_API_BASES[env]}/payments/pay_Abc12345`);
    assert.equal(seen[i].url.startsWith(`https://${env === "sandbox" ? "sandbox-api" : "api"}.whop.com/api/v1/`), true);
    assert.equal(seen[i].headers.Authorization, "Bearer test_key_not_real");
    assert.equal(seen[i].headers["Api-Version-Date"], "2026-11-20");
    assert.equal(seen[i].headers["Idempotency-Key"], undefined);
    assert.equal(seen[i + 1].url, `${WHOP_API_BASES[env]}/checkout_configurations`);
    assert.equal(seen[i + 1].headers["Api-Version-Date"], "2026-11-20");
    assert.equal(seen[i + 1].headers["Idempotency-Key"], checkoutId);
    assert.equal(JSON.parse(seen[i + 1].body).variant_id, "plan_growth3m");
  }
  assert.throws(() => createWhopClient("test_key_not_real", "staging" as any), /invalid-whop-environment/);
});

test("webhook signature: ws_ literal secret bytes, raw body, stale, replay-shaped headers", () => {
  // Independent HMAC: literal UTF-8 bytes of the WHOLE secret, including ws_.
  // No prefix stripping, no base64 decoding of the secret itself.
  const secret = "ws_test_secret_utf8_bytes_2026";
  const independent = (id: string, t: number, b: string) =>
    `v1,${createHmac("sha256", Buffer.from(secret, "utf8")).update(`${id}.${t}.${b}`).digest("base64")}`;
  const body = JSON.stringify({ type: "payment.succeeded", data: { id: "pay_Abc12345" } });
  const ts = 1_800_000_000;
  const sig = independent("msg_1", ts, body);
  assert.equal(signWhopWebhookForTest(secret, "msg_1", ts, body), sig, "test helper matches official literal-byte scheme");
  const h = (s = sig, t = ts, id = "msg_1") => ({ "webhook-id": id, "webhook-timestamp": String(t), "webhook-signature": s });
  assert.deepEqual(verifyWhopWebhook(secret, h(), Buffer.from(body), ts * 1000), { ok: true, id: "msg_1" });
  assert.equal(verifyWhopWebhook(secret, h(`v1a,${sig.slice(3)} ${sig}`), body, ts * 1000).ok, true, "multiple signatures");
  assert.deepEqual(verifyWhopWebhook(secret, h(), body + " ", ts * 1000), { ok: false, reason: "bad-signature" });
  assert.deepEqual(verifyWhopWebhook(secret, h(sig, ts, "msg_2"), body, ts * 1000), { ok: false, reason: "bad-signature" });
  assert.deepEqual(verifyWhopWebhook("ws_other_secret", h(), body, ts * 1000), { ok: false, reason: "bad-signature" });
  const stripped = `v1,${createHmac("sha256", Buffer.from(secret.slice(3), "utf8")).update(`msg_1.${ts}.${body}`).digest("base64")}`;
  assert.deepEqual(verifyWhopWebhook(secret, h(stripped), body, ts * 1000), { ok: false, reason: "bad-signature" }, "prefix must not be stripped");
  assert.deepEqual(verifyWhopWebhook(secret, h(), body, (ts + 301) * 1000), { ok: false, reason: "stale-timestamp" });
  assert.deepEqual(verifyWhopWebhook(secret, h(), body, (ts - 301) * 1000), { ok: false, reason: "stale-timestamp" });
  assert.deepEqual(verifyWhopWebhook(secret, { "webhook-id": "x" }, body, ts * 1000), { ok: false, reason: "missing-headers" });
  assert.deepEqual(verifyWhopWebhook(null, h(), body, ts * 1000), { ok: false, reason: "missing-secret" });
  assert.deepEqual(verifyWhopWebhook(secret, h(), undefined, ts * 1000), { ok: false, reason: "missing-body" });
  const raw = "plain-secret"; const s2 = signWhopWebhookForTest(raw, "m", ts, body);
  assert.equal(verifyWhopWebhook(raw, h(s2, ts, "m"), body, ts * 1000).ok, true);
});

test("calendar periods: month-end clamp, leap year, exact end bound, no index beyond term", () => {
  const a = new Date("2028-01-31T15:00:00Z");
  assert.equal(termEnd(a, 1).toISOString(), "2028-02-29T15:00:00.000Z");
  assert.equal(termEnd(a, 3).toISOString(), "2028-04-30T15:00:00.000Z");
  assert.equal(termEnd(a, 12).toISOString(), "2029-01-31T15:00:00.000Z");
  assert.equal(termEnd(new Date("2027-01-31T00:00:00Z"), 1).toISOString(), "2027-02-28T00:00:00.000Z");
  assert.equal(termEnd(new Date("2028-02-29T00:00:00Z"), 12).toISOString(), "2029-02-28T00:00:00.000Z");
  assert.equal(periodIndexAt(a, 3, new Date("2028-01-31T14:59:59Z")), null);
  assert.equal(periodIndexAt(a, 3, a), 0);
  assert.equal(periodIndexAt(a, 3, new Date("2028-02-29T14:59:59.999Z")), 0);
  assert.equal(periodIndexAt(a, 3, new Date("2028-02-29T15:00:00Z")), 1);
  assert.equal(periodIndexAt(a, 3, new Date("2028-03-31T15:00:00Z")), 2);
  assert.equal(periodIndexAt(a, 3, new Date("2028-04-30T14:59:59Z")), 2);
  assert.equal(periodIndexAt(a, 3, new Date("2028-04-30T15:00:00Z")), null, "term end is exclusive");
  assert.equal(periodIndexAt(a, 12, new Date("2029-01-31T14:00:00Z")), 11);
});

test("webhook event mapping ignores membership/cancellation events", () => {
  assert.deepEqual(paymentIdFromEvent({ type: "payment.succeeded", data: { id: "pay_X1234" } }), { kind: "payment", paymentId: "pay_X1234", type: "payment.succeeded" });
  assert.equal(paymentIdFromEvent({ type: "refund.created", data: { id: "rfd_1", payment: { id: "pay_X1234" } } }).paymentId, "pay_X1234");
  assert.equal(paymentIdFromEvent({ type: "dispute.created", data: { payment_id: "pay_X1234" } }).paymentId, "pay_X1234");
  for (const type of ["membership.deactivated", "membership.cancel_at_period_end_changed", "membership.went_invalid", "payment.failed", "invoice.paid"]) {
    assert.equal(paymentIdFromEvent({ type, data: { id: "pay_X1234" } }).kind, "ignore", type);
  }
});
