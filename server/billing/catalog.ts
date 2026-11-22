// Trusted, versioned server catalog: exact Whop product/plan(variant) IDs -> immutable
// sold-offer snapshots. Loaded from server env only; the browser never supplies prices,
// IDs, allowances or rights. Any defect makes the whole catalog invalid (fail closed).
import { createHash } from "crypto";
import { TERM_PLANS, TERM_STEPS, TERM_CREDIT_BONUS, PLAN_RIGHTS_V2, LEGACY_PLAN_MAPPING_V2, type PaidPlanV2, type PricingTerm } from "../../shared/pricingV2";

export const OFFICIAL_BUSINESS_NAME = "Oravini AI";
export const PAID_PLANS: readonly PaidPlanV2[] = ["growth", "pro", "growth_video"];
const PRODUCT_RE = /^prod_[A-Za-z0-9]{4,64}$/;
const VARIANT_RE = /^plan_[A-Za-z0-9]{4,64}$/;
const BIZ_RE = /^biz_[A-Za-z0-9]{4,64}$/;
const VERSION_RE = /^[A-Za-z0-9._-]{1,64}$/;

export interface OfferSnapshot {
  schema: 1;
  catalogVersion: string;
  discountVersion: string;
  businessName: typeof OFFICIAL_BUSINESS_NAME;
  companyId: string;
  planId: PaidPlanV2;
  termMonths: PricingTerm;
  currency: "usd";
  amountCents: number;
  baseMonthlyPriceCents: number;
  discountPercent: number;
  monthlyBaseCredits: number;
  monthlyTermBonus: number;
  monthlyAllowance: number;
  featureRights: { webinars: boolean; videoMarketing: boolean; competitorDeep: boolean };
  legacyMapping: { plan: "growth" | "pro"; hasVideoMarketing: boolean };
  whopProductId: string;
  whopPlanId: string;
  autoRenew: false;
}

export interface Catalog {
  catalogVersion: string;
  discountVersion: string;
  companyId: string;
  offers: OfferSnapshot[];
  byWhopPlanId: Map<string, OfferSnapshot>;
}

export type CatalogParseResult = { ok: true; catalog: Catalog; errors: [] } | { ok: false; errors: string[] };

export function expectedAmountCents(planId: PaidPlanV2, term: PricingTerm, discountPercent: number): number {
  const plan = TERM_PLANS.find(p => p.id === planId)!;
  return Math.round(plan.price * 100 * term * (100 - discountPercent) / 100);
}

function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
}
export function snapshotHash(s: OfferSnapshot): string {
  return createHash("sha256").update(canonical(s)).digest("hex");
}

export function parseCatalog(json: string | undefined, envCompanyId: string | null): CatalogParseResult {
  if (!json || !json.trim()) return { ok: false, errors: ["missing"] };
  let raw: any;
  try { raw = JSON.parse(json); } catch { return { ok: false, errors: ["invalid-json"] }; }
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["invalid-shape"] };
  if (raw.discountFinal !== true) errors.push("discount-not-final");
  if (raw.businessName !== OFFICIAL_BUSINESS_NAME) errors.push("wrong-business");
  if (typeof raw.businessName === "string" && /pluxa/i.test(raw.businessName)) errors.push("wrong-business");
  if (typeof raw.companyId !== "string" || !BIZ_RE.test(raw.companyId)) errors.push("invalid-company-id");
  else if (!envCompanyId || raw.companyId !== envCompanyId) errors.push("company-id-mismatch");
  if (typeof raw.catalogVersion !== "string" || !VERSION_RE.test(raw.catalogVersion)) errors.push("invalid-catalog-version");
  if (typeof raw.discountVersion !== "string" || !VERSION_RE.test(raw.discountVersion)) errors.push("invalid-discount-version");

  // Discount table: Pro and 1-month are always 0; others integer 0..90.
  const discounts: Record<string, Record<string, number>> = raw.discounts && typeof raw.discounts === "object" ? raw.discounts : {};
  const discountOf = (planId: PaidPlanV2, term: PricingTerm): number | null => {
    const d = discounts[planId]?.[String(term)];
    if (!Number.isInteger(d) || d < 0 || d > 90) return null;
    if ((planId === "pro" || term === 1) && d !== 0) return null;
    return d;
  };
  for (const p of PAID_PLANS) for (const t of TERM_STEPS) if (discountOf(p, t) === null) errors.push(`invalid-discount:${p}:${t}`);

  const offers: OfferSnapshot[] = [];
  const seen = new Set<string>(); const seenVariant = new Set<string>();
  if (!Array.isArray(raw.offers)) errors.push("missing-offers");
  for (const o of Array.isArray(raw.offers) ? raw.offers : []) {
    const planId = o?.planId as PaidPlanV2; const term = o?.termMonths as PricingTerm;
    const tag = `${planId}:${term}`;
    if (!PAID_PLANS.includes(planId) || !(TERM_STEPS as readonly number[]).includes(term)) { errors.push(`unknown-offer:${tag}`); continue; }
    if (seen.has(tag)) { errors.push(`duplicate-offer:${tag}`); continue; }
    seen.add(tag);
    if (typeof o.whopProductId !== "string" || !PRODUCT_RE.test(o.whopProductId)) errors.push(`invalid-product-id:${tag}`);
    if (typeof o.whopPlanId !== "string" || !VARIANT_RE.test(o.whopPlanId)) errors.push(`invalid-variant-id:${tag}`);
    else if (seenVariant.has(o.whopPlanId)) errors.push(`duplicate-variant-id:${tag}`);
    else seenVariant.add(o.whopPlanId);
    // One-time payment only: Whop renewal/billing-period plans would auto-renew on Whop's day clock.
    if (o.planType !== "one_time") errors.push(`not-one-time:${tag}`);
    if (o.currency !== "usd") errors.push(`invalid-currency:${tag}`);
    const d = discountOf(planId, term);
    if (d === null) continue;
    const amount = expectedAmountCents(planId, term, d);
    if (o.amountCents !== amount) errors.push(`amount-mismatch:${tag}`);
    const plan = TERM_PLANS.find(p => p.id === planId)!;
    offers.push({
      schema: 1, catalogVersion: raw.catalogVersion, discountVersion: raw.discountVersion,
      businessName: OFFICIAL_BUSINESS_NAME, companyId: raw.companyId, planId, termMonths: term,
      currency: "usd", amountCents: amount, baseMonthlyPriceCents: plan.price * 100, discountPercent: d,
      monthlyBaseCredits: plan.credits, monthlyTermBonus: TERM_CREDIT_BONUS[term],
      monthlyAllowance: plan.credits + TERM_CREDIT_BONUS[term],
      featureRights: { ...PLAN_RIGHTS_V2[planId] }, legacyMapping: { ...LEGACY_PLAN_MAPPING_V2[planId] },
      whopProductId: o.whopProductId, whopPlanId: o.whopPlanId, autoRenew: false,
    });
  }
  for (const p of PAID_PLANS) for (const t of TERM_STEPS) if (!seen.has(`${p}:${t}`)) errors.push(`missing-offer:${p}:${t}`);
  if (errors.length) return { ok: false, errors: Array.from(new Set(errors)) };
  const frozen = offers.map(o => Object.freeze({ ...o, featureRights: Object.freeze(o.featureRights), legacyMapping: Object.freeze(o.legacyMapping) }) as OfferSnapshot);
  return {
    ok: true, errors: [],
    catalog: { catalogVersion: raw.catalogVersion, discountVersion: raw.discountVersion, companyId: raw.companyId, offers: frozen, byWhopPlanId: new Map(frozen.map(o => [o.whopPlanId, o])) },
  };
}

export function findOffer(catalog: Catalog, planId: unknown, termMonths: unknown): OfferSnapshot | null {
  return catalog.offers.find(o => o.planId === planId && o.termMonths === termMonths) ?? null;
}
