// Test-only catalog fixture. IDs are fake placeholders; real IDs come from Whop later.
import { expectedAmountCents } from "../../server/billing/catalog";
import { TERM_STEPS } from "../../shared/pricingV2";

export const TEST_COMPANY = "biz_TestOravini01";
export const TEST_DISCOUNTS = { growth: { 1: 0, 3: 10, 6: 15, 12: 25 }, growth_video: { 1: 0, 3: 10, 6: 15, 12: 25 }, pro: { 1: 0, 3: 0, 6: 0, 12: 0 } } as const;

export function catalogJson(over: Record<string, unknown> = {}, offerOver: (o: any) => any = o => o): string {
  const offers: any[] = [];
  for (const planId of ["growth", "pro", "growth_video"] as const) for (const t of TERM_STEPS) {
    const d = (TEST_DISCOUNTS as any)[planId][t];
    offers.push(offerOver({ planId, termMonths: t, whopProductId: `prod_${planId.replace("_", "")}X`, whopPlanId: `plan_${planId.replace("_", "")}${t}m`, planType: "one_time", currency: "usd", amountCents: expectedAmountCents(planId, t, d) }));
  }
  return JSON.stringify({ catalogVersion: "test-v1", discountVersion: "disc-test-1", businessName: "Oravini AI", companyId: TEST_COMPANY, discountFinal: true, discounts: TEST_DISCOUNTS, offers, ...over });
}

export function finalEnv(over: Record<string, string | undefined> = {}) {
  return {
    BILLING_V2_CHECKOUT_ENABLED: "true", BILLING_V2_FULFILLMENT_ENABLED: "true",
    WHOP_COMPANY_ID: TEST_COMPANY, WHOP_API_KEY: "test_key_not_real_000000", WHOP_WEBHOOK_SECRET: "test_webhook_secret_value",
    WHOP_PREPAID_CATALOG_JSON: catalogJson(), ...over,
  };
}
