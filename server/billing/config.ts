// Billing v2 (Whop prepaid) runtime configuration and kill switches.
// Every switch defaults to OFF. Nothing here holds or returns secret values.
import { parseCatalog, type CatalogParseResult } from "./catalog";

export type WhopEnvironment = "production" | "sandbox";
// The only allowed API bases. Never accept an arbitrary URL: it could leak the
// server API key to an attacker-controlled host.
export const WHOP_API_BASES: Record<WhopEnvironment, string> = {
  production: "https://api.whop.com/api/v1",
  sandbox: "https://sandbox-api.whop.com/api/v1",
};

export interface BillingV2Config {
  checkoutEnabled: boolean;      // BILLING_V2_CHECKOUT_ENABLED — creates new Whop checkouts
  fulfillmentEnabled: boolean;   // BILLING_V2_FULFILLMENT_ENABLED — webhooks + reconciliation grant access
  freeEnrollmentEnabled: boolean;// BILLING_V2_FREE_ENROLLMENT_ENABLED — moves legacy Free accounts to 100/month
  environment: WhopEnvironment | null; // WHOP_ENVIRONMENT; null means invalid and fails closed
  companyId: string | null;      // WHOP_COMPANY_ID (biz_...)
  apiKey: string | null;         // WHOP_API_KEY (never exposed)
  webhookSecret: string | null;  // WHOP_WEBHOOK_SECRET (never exposed)
  redirectUrl: string | null;    // BILLING_V2_CHECKOUT_REDIRECT_URL
  catalog: CatalogParseResult;   // WHOP_PREPAID_CATALOG_JSON
}

const on = (v: string | undefined) => v === "true";
const str = (v: string | undefined) => (typeof v === "string" && v.trim() ? v.trim() : null);

// Unset keeps the historical production base. An explicitly supplied value must
// be exactly one of the two supported environments, never a silent fallback.
export function parseWhopEnvironment(value: string | undefined): WhopEnvironment | null {
  if (value === undefined) return "production";
  return value === "production" || value === "sandbox" ? value : null;
}

export function loadBillingV2Config(env: Record<string, string | undefined> = process.env): BillingV2Config {
  const companyId = str(env.WHOP_COMPANY_ID);
  return {
    checkoutEnabled: on(env.BILLING_V2_CHECKOUT_ENABLED),
    fulfillmentEnabled: on(env.BILLING_V2_FULFILLMENT_ENABLED),
    freeEnrollmentEnabled: on(env.BILLING_V2_FREE_ENROLLMENT_ENABLED),
    environment: parseWhopEnvironment(env.WHOP_ENVIRONMENT),
    companyId,
    apiKey: str(env.WHOP_API_KEY),
    webhookSecret: str(env.WHOP_WEBHOOK_SECRET),
    redirectUrl: str(env.BILLING_V2_CHECKOUT_REDIRECT_URL),
    catalog: parseCatalog(env.WHOP_PREPAID_CATALOG_JSON, companyId),
  };
}

export interface BillingV2Status {
  environment: WhopEnvironment | null; // selected Whop API environment, never a key or URL
  checkoutOpen: boolean;
  fulfillmentOpen: boolean;
  webhookOpen: boolean;
  freeEnrollmentEnabled: boolean;
  catalogFinal: boolean;
  catalogVersion: string | null;
  discountVersion: string | null;
  schemaReady: boolean;
  reasons: string[]; // reason codes only, safe to show publicly
}

// Fail-closed gate. Checkout and fulfillment both require a finalized, fully valid
// catalog: without it no Whop payment can be mapped to a sold offer.
export function billingV2Status(cfg: BillingV2Config, schemaReady: boolean): BillingV2Status {
  const common: string[] = [];
  if (!cfg.catalog.ok) common.push(...cfg.catalog.errors.map(e => `catalog:${e}`));
  if (!cfg.environment) common.push("invalid-whop-environment");
  if (!cfg.companyId) common.push("missing-whop-company-id");
  if (!cfg.apiKey) common.push("missing-whop-api-key");
  if (!schemaReady) common.push("schema-not-migrated");
  const reasons = [...common];
  if (!cfg.checkoutEnabled) reasons.push("checkout-kill-switch-off");
  if (!cfg.fulfillmentEnabled) reasons.push("fulfillment-kill-switch-off");
  if (!cfg.webhookSecret) reasons.push("missing-whop-webhook-secret");
  const fulfillmentOpen = common.length === 0 && cfg.fulfillmentEnabled;
  return {
    environment: cfg.environment,
    // Checkout also needs the webhook secret: selling without signed webhooks is not allowed.
    checkoutOpen: fulfillmentOpen && cfg.checkoutEnabled && !!cfg.webhookSecret,
    fulfillmentOpen,
    webhookOpen: fulfillmentOpen && !!cfg.webhookSecret,
    freeEnrollmentEnabled: cfg.freeEnrollmentEnabled && schemaReady,
    catalogFinal: cfg.catalog.ok,
    catalogVersion: cfg.catalog.ok ? cfg.catalog.catalog.catalogVersion : null,
    discountVersion: cfg.catalog.ok ? cfg.catalog.catalog.discountVersion : null,
    schemaReady,
    reasons: Array.from(new Set(reasons)),
  };
}
