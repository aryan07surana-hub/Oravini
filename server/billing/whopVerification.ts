// Server-side verification of a Whop payment retrieved from the Whop API with the
// server's own key. Browser redirects and webhook bodies are only lookup hints: the
// payment is always re-fetched and every field below must match the sold snapshot.
// Field names and Money shapes follow the pinned 2026-11-20 `GET /payments/{id}`
// contract. Unknown/legacy shapes fail closed.
import type { OfferSnapshot } from "./catalog";

export type VerificationCode =
  | "malformed-payment" | "unsupported-payment-schema" | "invalid-money" | "invalid-paid-at"
  | "payment-id-mismatch" | "missing-checkout-binding" | "missing-checkout-configuration"
  | "checkout-configuration-mismatch" | "checkout-not-persisted" | "business-mismatch"
  | "product-mismatch" | "variant-mismatch" | "not-paid" | "refunded" | "disputed"
  | "amount-mismatch" | "currency-mismatch" | "unsupported-tax-behavior";

export class PaymentVerificationError extends Error {
  constructor(public code: VerificationCode) { super(code); }
}

export interface NormalizedPayment {
  id: string;
  status: string;
  substatus: string;
  accountId: string | null;
  productId: string | null;
  whopPlanId: string | null;
  checkoutConfigurationId: string | null;
  totalCents: number | null;
  subtotalCents: number | null;
  taxCents: number | null;
  taxBehavior: string | null;
  refundedCents: number | null;
  amountChargedCents: number | null;
  currency: string | null;
  checkoutId: string | null;  // our server checkout UUID from Whop payment metadata
  paidAt: Date | null;
  refunded: boolean;
  disputed: boolean;
}

const PAY_RE = /^pay_[A-Za-z0-9]{4,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURRENCY_RE = /^[a-z]{3}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const STATUSES = new Set(["draft", "open", "authorized", "paid", "pending", "uncollectible", "unresolved", "void"]);
const SUBSTATUSES = new Set([
  "succeeded", "requires_capture", "pending", "failed", "blocked", "past_due", "canceled", "price_too_low",
  "uncollectible", "refunded", "auto_refunded", "partially_refunded", "dispute_warning",
  "dispute_needs_response", "dispute_warning_needs_response", "resolution_needs_response",
  "dispute_under_review", "dispute_warning_under_review", "resolution_under_review", "dispute_won",
  "dispute_warning_closed", "resolution_won", "dispute_lost", "dispute_closed", "resolution_lost",
  "drafted", "incomplete", "unresolved", "open_dispute", "open_resolution",
]);
const TAX_BEHAVIORS = new Set(["exclusive", "inclusive", "unspecified", "unable_to_collect"]);
const REFUND_SUBSTATUSES = new Set(["refunded", "auto_refunded", "partially_refunded"]);
const DISPUTE_SUBSTATUSES = new Set([
  "dispute_warning", "dispute_needs_response", "dispute_warning_needs_response", "resolution_needs_response",
  "dispute_under_review", "dispute_warning_under_review", "resolution_under_review", "dispute_won",
  "dispute_warning_closed", "resolution_won", "dispute_lost", "dispute_closed", "resolution_lost",
  "open_dispute", "open_resolution",
]);

export const isWhopPaymentId = (v: unknown): v is string => typeof v === "string" && PAY_RE.test(v);

function required(raw: Record<string, unknown>, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(raw, key)) throw new PaymentVerificationError("unsupported-payment-schema");
  return raw[key];
}

function nullableId(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v !== "string" || !v) throw new PaymentVerificationError("unsupported-payment-schema");
  return v;
}

// Money is an exact decimal string in major units. Convert with BigInt so no
// floating-point rounding can widen acceptance; reject sub-cent and unsafe values.
export function parseMoneyCents(v: unknown, currency: string): number | null {
  if (v === null) return null;
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new PaymentVerificationError("invalid-money");
  const m = v as Record<string, unknown>;
  if (typeof m.currency !== "string" || !CURRENCY_RE.test(m.currency)) throw new PaymentVerificationError("invalid-money");
  if (m.currency !== currency) throw new PaymentVerificationError("currency-mismatch");
  if (!Number.isInteger(m.decimals) || (m.decimals as number) < 0 || (m.decimals as number) > 8) throw new PaymentVerificationError("invalid-money");
  if (!Number.isInteger(m.display_decimals) || (m.display_decimals as number) < 0 || (m.display_decimals as number) > 8) throw new PaymentVerificationError("invalid-money");
  if (typeof m.amount !== "string" || !/^-?\d+(?:\.\d+)?$/.test(m.amount)) throw new PaymentVerificationError("invalid-money");
  const decimals = m.decimals as number;
  const [whole, frac = ""] = m.amount.split(".");
  if (frac.length > decimals) throw new PaymentVerificationError("invalid-money");
  const negative = whole.startsWith("-");
  const digits = `${negative ? whole.slice(1) : whole}${frac.padEnd(decimals, "0")}`;
  const scale = BigInt(10) ** BigInt(decimals);
  const units = BigInt(digits || "0");
  const scaled = units * BigInt(100);
  if (scaled % scale !== BigInt(0)) throw new PaymentVerificationError("invalid-money"); // sub-cent
  const centsBig = scaled / scale;
  const cents = Number(centsBig);
  if (!Number.isSafeInteger(cents) || BigInt(cents) !== centsBig) throw new PaymentVerificationError("invalid-money");
  // This is a positive one-time USD workflow: negative money of any kind is invalid.
  if (negative || cents < 0) throw new PaymentVerificationError("invalid-money");
  return cents;
}

function toDate(v: unknown): Date | null {
  if (v === null) return null;
  if (typeof v !== "string" || !ISO_DATE_RE.test(v)) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

// A present-but-invalid paid_at is treated the same as missing: fulfillment
// rejects it, while a simultaneous refund/dispute can still revoke safely.
const hasMark = (v: unknown): boolean => v !== null && v !== undefined;

export function normalizeWhopPayment(raw: any): NormalizedPayment {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !isWhopPaymentId(raw.id)) {
    throw new PaymentVerificationError("malformed-payment");
  }
  // Old company/plan/product-object fixtures are not the current contract.
  if ("company" in raw || "plan" in raw || "product" in raw) throw new PaymentVerificationError("unsupported-payment-schema");

  const statusRaw = required(raw, "status");
  const subRaw = required(raw, "substatus");
  if (typeof statusRaw !== "string" || !STATUSES.has(statusRaw.toLowerCase())) throw new PaymentVerificationError("unsupported-payment-schema");
  if (typeof subRaw !== "string" || !SUBSTATUSES.has(subRaw.toLowerCase())) throw new PaymentVerificationError("unsupported-payment-schema");
  const status = statusRaw.toLowerCase();
  const substatus = subRaw.toLowerCase();

  const currencyRaw = required(raw, "currency");
  if (typeof currencyRaw !== "string" || !CURRENCY_RE.test(currencyRaw)) throw new PaymentVerificationError("currency-mismatch");
  const currency = currencyRaw;

  const metadata = required(raw, "metadata");
  if (metadata !== null && (typeof metadata !== "object" || Array.isArray(metadata))) throw new PaymentVerificationError("unsupported-payment-schema");
  const md = (metadata ?? {}) as Record<string, unknown>;
  const checkoutId = typeof md.oravini_checkout_id === "string" && UUID_RE.test(md.oravini_checkout_id)
    ? md.oravini_checkout_id.toLowerCase() : null;

  const taxRaw = required(raw, "tax_behavior");
  if (taxRaw !== null && (typeof taxRaw !== "string" || !TAX_BEHAVIORS.has(taxRaw))) throw new PaymentVerificationError("unsupported-tax-behavior");
  const taxBehavior = taxRaw === null ? null : taxRaw as string;

  const disputeCreatedAt = required(raw, "dispute_created_at");
  const disputeAlertedAt = required(raw, "dispute_alerted_at");
  if (hasMark(disputeCreatedAt) && typeof disputeCreatedAt !== "string") throw new PaymentVerificationError("unsupported-payment-schema");
  if (hasMark(disputeAlertedAt) && typeof disputeAlertedAt !== "string") throw new PaymentVerificationError("unsupported-payment-schema");

  const refundedCents = parseMoneyCents(required(raw, "refunded_amount"), currency);
  const totalCents = parseMoneyCents(required(raw, "total"), currency);
  const subtotalCents = parseMoneyCents(required(raw, "subtotal"), currency);
  const taxCents = parseMoneyCents(required(raw, "tax_amount"), currency);
  const amountChargedCents = parseMoneyCents(required(raw, "amount_charged"), currency);

  return {
    id: raw.id, status, substatus,
    accountId: nullableId(required(raw, "account_id")),
    productId: nullableId(required(raw, "product_id")),
    whopPlanId: nullableId(required(raw, "variant_id")),
    checkoutConfigurationId: nullableId(required(raw, "checkout_configuration_id")),
    totalCents, subtotalCents, taxCents, taxBehavior, refundedCents, amountChargedCents,
    currency,
    checkoutId,
    paidAt: toDate(required(raw, "paid_at")),
    refunded: (refundedCents !== null && refundedCents > 0) || raw.auto_refunded === true || REFUND_SUBSTATUSES.has(substatus),
    disputed: hasMark(disputeCreatedAt) || hasMark(disputeAlertedAt) || DISPUTE_SUBSTATUSES.has(substatus),
  };
}

// Identity/binding checks shared by paid fulfillment and reversal. This uses only
// the server-fetched payment and the persisted immutable snapshot; webhook/reconcile
// payload claims are never proof of business, product, variant or checkout binding.
function assertPaymentIdentity(
  p: NormalizedPayment, snap: OfferSnapshot, configuredCompanyId: string, persistedWhopCheckoutId: string | null,
): void {
  if (!p.checkoutId) throw new PaymentVerificationError("missing-checkout-binding");
  if (!persistedWhopCheckoutId) throw new PaymentVerificationError("checkout-not-persisted");
  if (!p.checkoutConfigurationId) throw new PaymentVerificationError("missing-checkout-configuration");
  if (p.checkoutConfigurationId !== persistedWhopCheckoutId) throw new PaymentVerificationError("checkout-configuration-mismatch");
  if (!configuredCompanyId || p.accountId !== configuredCompanyId || snap.companyId !== configuredCompanyId) throw new PaymentVerificationError("business-mismatch");
  if (p.productId !== snap.whopProductId) throw new PaymentVerificationError("product-mismatch");
  if (p.whopPlanId !== snap.whopPlanId) throw new PaymentVerificationError("variant-mismatch");
  if (p.currency !== snap.currency) throw new PaymentVerificationError("currency-mismatch");
}

// A verified refund/dispute for a known v2 checkout may record a durable reversal
// before fulfillment, but only after the server-fetched payment itself matches the
// sold snapshot. Money/paid_at are not re-checked here because a reversal must not
// depend on the stale paid shape that raced with it.
export function assertReversalMatchesSnapshot(
  p: NormalizedPayment, snap: OfferSnapshot, configuredCompanyId: string, persistedWhopCheckoutId: string | null,
): void {
  assertPaymentIdentity(p, snap, configuredCompanyId, persistedWhopCheckoutId);
}

// Exact match of a normalized payment against the immutable snapshot that was sold
// through our server-created checkout. `persistedWhopCheckoutId` is the whop
// checkout configuration id stored with the checkout row; null means the webhook
// beat the checkout persist and must be retried, never permanently rejected.
export function assertPaymentMatchesSnapshot(
  p: NormalizedPayment, snap: OfferSnapshot, configuredCompanyId: string, persistedWhopCheckoutId: string | null,
): number {
  assertPaymentIdentity(p, snap, configuredCompanyId, persistedWhopCheckoutId);
  if (p.disputed) throw new PaymentVerificationError("disputed");
  if (p.refunded) throw new PaymentVerificationError("refunded");
  if (p.status !== "paid" || p.substatus !== "succeeded") throw new PaymentVerificationError("not-paid");
  if (!p.paidAt || !Number.isFinite(p.paidAt.getTime())) throw new PaymentVerificationError("invalid-paid-at");

  // tax_behavior is exclusive or inclusive; anything else fails closed. Buyer
  // fees live in amount_charged and are deliberately NOT compared to the price.
  if (p.taxBehavior !== "exclusive" && p.taxBehavior !== "inclusive") throw new PaymentVerificationError("unsupported-tax-behavior");
  const tax = p.taxCents ?? 0;
  const expectedTotal = p.taxBehavior === "exclusive" ? snap.amountCents + tax : snap.amountCents;
  if (p.taxBehavior === "inclusive" && tax > expectedTotal) throw new PaymentVerificationError("invalid-money");
  if (p.subtotalCents !== null && p.subtotalCents < snap.amountCents) throw new PaymentVerificationError("amount-mismatch");
  if (p.totalCents === null || p.totalCents !== expectedTotal) throw new PaymentVerificationError("amount-mismatch");
  // Return the audited SOLD price (catalog amount), not the gross total: with
  // exclusive tax the buyer's total is higher, but the ledger must be recorded
  // and re-checked against the immutable snapshot amount.
  return snap.amountCents;
}
