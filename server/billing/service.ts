// One pipeline for both signed Whop webhooks and authenticated browser reconciliation:
// re-fetch the payment from Whop -> normalize -> bind to our server checkout ->
// verify against the sold snapshot -> idempotent ledger fulfillment / revocation.
import type { Catalog } from "./catalog";
import { BillingError, fulfillVerifiedPayment, getCheckout, recordUnfulfilledReversal, revokeForPayment, type Db, type FulfillResult } from "./ledger";
import { assertPaymentMatchesSnapshot, assertReversalMatchesSnapshot, normalizeWhopPayment, PaymentVerificationError } from "./whopVerification";
import type { WhopClient } from "./whopClient";

export interface PipelineDeps { db: Db; whop: WhopClient; companyId: string; catalog?: Catalog; now?: () => Date; }

export type PipelineResult =
  | FulfillResult
  | { result: "ignored"; reason: string }
  | { result: "rejected"; reason: string }
  | { result: "revoked-on-refund"; detail: string }
  | { result: "deferred"; reason: "fulfillment-disabled" | "checkout-not-persisted" };

// revokeOnly: used while fulfillment is switched off. Refunds/disputes still revoke
// (fail safe); anything that would grant access is deferred so Whop retries later.
export async function processWhopPayment(deps: PipelineDeps, paymentId: string, opts: { expectedUserId?: string; revokeOnly?: boolean } = {}): Promise<PipelineResult> {
  const now = deps.now?.() ?? new Date();
  const raw = await deps.whop.getPayment(paymentId); // network errors propagate -> retry
  let p;
  try { p = normalizeWhopPayment(raw); } catch (e) {
    if (e instanceof PaymentVerificationError) return { result: "rejected", reason: e.code };
    throw e;
  }
  if (p.id !== paymentId) return { result: "rejected", reason: "payment-id-mismatch" };

  // Refund/dispute always wins. For a known v2 checkout, verify the actual
  // server-fetched payment against the persisted immutable snapshot first, then
  // write a durable payment-row tombstone if fulfillment has not happened yet.
  // A stale/concurrent paid response will see that row and cannot grant access.
  if (p.refunded || p.disputed) {
    const reason = p.disputed ? "disputed" : "refunded";
    if (p.checkoutId) {
      const c = await deps.db.connect();
      let co; try { co = await getCheckout(c, p.checkoutId); } finally { c.release(); }
      if (co) {
        if (opts.expectedUserId !== undefined && opts.expectedUserId !== co.user_id) throw new BillingError("account-mismatch", 403);
        try {
          assertReversalMatchesSnapshot(p, co.offer_snapshot, deps.companyId, co.whop_checkout_id ?? null);
        } catch (e) {
          if (e instanceof PaymentVerificationError) {
            // The checkout POST may not have persisted its Whop id yet: retry,
            // never permanently reject a legitimate reversal.
            if (e.code === "checkout-not-persisted") return { result: "deferred", reason: "checkout-not-persisted" };
            return { result: "ignored", reason: `reversal-${e.code}` };
          }
          throw e;
        }
        const r = await recordUnfulfilledReversal(deps.db, {
          paymentId: p.id, checkoutId: co.id, userId: co.user_id,
          offerSnapshot: co.offer_snapshot, snapshotHash: co.snapshot_hash,
          paidAt: p.paidAt, reason, expectedUserId: opts.expectedUserId, now,
        });
        return { result: "revoked-on-refund", detail: r.result };
      }
    }
    // Unknown/legacy/other-product payments or already-known payment ids without
    // a persisted checkout binding keep the existing fail-safe path.
    const r = await revokeForPayment(deps.db, p.id, reason, now);
    return r.result === "ignored-unknown-payment" ? { result: "ignored", reason: "not-a-v2-payment" } : { result: "revoked-on-refund", detail: r.result };
  }
  if (!p.checkoutId) return { result: "ignored", reason: "not-a-v2-payment" }; // legacy/other products
  if (opts.revokeOnly) return { result: "deferred", reason: "fulfillment-disabled" };
  const c = await deps.db.connect();
  let co; try { co = await getCheckout(c, p.checkoutId); } finally { c.release(); }
  if (!co) return { result: "ignored", reason: "unknown-checkout" };
  if (opts.expectedUserId !== undefined && opts.expectedUserId !== co.user_id) throw new BillingError("account-mismatch", 403);
  let soldAmountCents: number;
  try {
    soldAmountCents = assertPaymentMatchesSnapshot(p, co.offer_snapshot, deps.companyId, co.whop_checkout_id ?? null);
  } catch (e) {
    if (e instanceof PaymentVerificationError) {
      // The webhook can arrive before the checkout POST persists its Whop id.
      // Defer (retryable 503), never mark the event permanently rejected.
      if (e.code === "checkout-not-persisted") return { result: "deferred", reason: "checkout-not-persisted" };
      return { result: "rejected", reason: e.code };
    }
    throw e;
  }
  return fulfillVerifiedPayment(deps.db, {
    paymentId: p.id, checkoutId: p.checkoutId, whopPlanId: p.whopPlanId!, productId: p.productId!,
    // Sold catalog amount, not the tax-inclusive gross total: ledger.ts re-checks
    // this against the immutable offer snapshot after taking the user lock.
    amountCents: soldAmountCents, currency: p.currency!, paidAt: p.paidAt!,
  }, { expectedUserId: opts.expectedUserId, now });
}

// Whop event types -> payment id extraction. Membership/cancellation events never
// change v2 terms (the app owns calendar expiry) and never touch legacy subscribers.
export function paymentIdFromEvent(evt: any): { kind: "payment" | "ignore"; paymentId?: string; type: string } {
  const type = typeof evt?.type === "string" ? evt.type : (typeof evt?.action === "string" ? evt.action : "unknown");
  const d = evt?.data ?? {};
  const pid = typeof d?.payment?.id === "string" ? d.payment.id : typeof d?.payment_id === "string" ? d.payment_id : type.startsWith("payment.") && typeof d?.id === "string" ? d.id : undefined;
  const relevant = /^(payment\.(succeeded|refunded|disputed|updated)|refund\.(created|updated)|dispute\.(created|updated))$/.test(type);
  return relevant && pid ? { kind: "payment", paymentId: pid, type } : { kind: "ignore", type };
}
