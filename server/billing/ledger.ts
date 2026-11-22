// Durable, transactional billing v2 entitlement + credit-grant ledger.
//
// Invariants
// - Every transaction locks the user row FIRST (SELECT ... FROM users FOR UPDATE), then
//   follows the order in schema.ts. Any error rolls the whole transaction back.
// - One Whop payment -> at most one entitlement (PK + UNIQUE). One (entitlement, month)
//   -> at most one grant (PK). One (account, calendar month) -> at most one Free grant.
// - Paid/free monthly allowance REPLACES credit_balances.monthly_credits (reset, never
//   added); only the current month is granted, skipped months are never caught up.
// - bonus_credits (purchased / refunded / admin-granted) are never reset or removed.
// - Overlapping active prepaid terms are rejected (payment kept as needs_review).
// - Accounts not in billing_accounts_v2 are legacy: these functions return null and the
//   legacy storage path keeps their existing contract unchanged.
import { calendarMonthBoundary, freeV2PeriodKey, FREE_V2_POLICY } from "../../shared/creditPeriodsV2";
import { LEGACY_PLAN_MAPPING_V2, type PaidPlanV2 } from "../../shared/pricingV2";
import { snapshotHash, type OfferSnapshot } from "./catalog";

export interface Tx { query(sql: string, values?: unknown[]): Promise<{ rows: any[]; rowCount?: number | null }>; }
export interface Db { connect(): Promise<Tx & { release(): void }>; }

export const LOCK_USER_SQL = "SELECT id, plan, role, has_video_marketing FROM users WHERE id = $1 FOR UPDATE";

export class BillingError extends Error {
  constructor(public code: string, public status = 409, public detail: Record<string, unknown> = {}) { super(code); }
}

export async function withUserLock<T>(db: Db, userId: string, fn: (tx: Tx, user: any) => Promise<T>): Promise<T> {
  if (typeof userId !== "string" || !userId) throw new BillingError("invalid-user", 400);
  const tx = await db.connect();
  try {
    await tx.query("BEGIN");
    const u = await tx.query(LOCK_USER_SQL, [userId]);
    if (!u.rows[0]) throw new BillingError("user-not-found", 404);
    const out = await fn(tx, u.rows[0]);
    await tx.query("COMMIT");
    return out;
  } catch (e) {
    try { await tx.query("ROLLBACK"); } catch { /* connection already broken */ }
    throw e;
  } finally { tx.release(); }
}

// ── Calendar periods ─────────────────────────────────────────────────────────
export function termEnd(anchor: Date, termMonths: number): Date { return calendarMonthBoundary(anchor, termMonths); }

/** Index of the calendar month containing `now`, or null outside [anchor, end). */
export function periodIndexAt(anchor: Date, termMonths: number, now: Date): number | null {
  if (now < anchor || now >= termEnd(anchor, termMonths)) return null;
  let i = 0;
  while (i + 1 < termMonths && calendarMonthBoundary(anchor, i + 1) <= now) i++;
  return i;
}

// ── Balance helpers (credit_balances is the legacy table, reused) ───────────
async function setMonthly(tx: Tx, userId: string, credits: number, periodTag: string) {
  await tx.query(
    `INSERT INTO credit_balances(user_id, monthly_credits, bonus_credits, last_reset_month) VALUES ($1,$2,0,$3)
     ON CONFLICT (user_id) DO UPDATE SET monthly_credits = EXCLUDED.monthly_credits, last_reset_month = EXCLUDED.last_reset_month`,
    [userId, credits, periodTag],
  );
}
async function logTxn(tx: Tx, userId: string, amount: number, type: string, description: string) {
  await tx.query("INSERT INTO credit_transactions(user_id, amount, type, description) VALUES ($1,$2,$3,$4)", [userId, amount, type, description]);
}
async function readBalance(tx: Tx, userId: string, lock = false) {
  const r = await tx.query(`SELECT * FROM credit_balances WHERE user_id = $1${lock ? " FOR UPDATE" : ""}`, [userId]);
  return r.rows[0] ?? null;
}
const toBalance = (row: any) => row ? ({ id: row.id, userId: row.user_id, monthlyCredits: row.monthly_credits, bonusCredits: row.bonus_credits, lastResetMonth: row.last_reset_month, createdAt: row.created_at }) : null;

export interface V2State {
  state: "paid" | "free";
  planId: PaidPlanV2 | "free";
  monthlyAllowance: number;
  entitlement: null | { id: string; planId: PaidPlanV2; termMonths: number; startsAt: string; endsAt: string; periodIndex: number; periodEnd: string };
  balance: ReturnType<typeof toBalance>;
  enrolledNow: boolean;
}

async function syncLegacyPlan(tx: Tx, user: any, plan: "free" | "growth" | "pro", hasVideo: boolean) {
  if (user.plan !== plan || user.has_video_marketing !== hasVideo) {
    await tx.query("UPDATE users SET plan = $2, has_video_marketing = $3 WHERE id = $1", [user.id, plan, hasVideo]);
    user.plan = plan; user.has_video_marketing = hasVideo;
  }
}

/** Free accounts eligible for automatic v2 enrollment (never admin, never legacy paid). */
export const isFreeEnrollable = (user: any) => user.role !== "admin" && user.plan === "free";

/**
 * Current-period refresh for an already-locked user. Returns null for legacy accounts.
 * Expires finished terms, grants the current paid month or the current Free month.
 */
export async function refreshLocked(tx: Tx, user: any, now: Date, opts: { allowFreeEnrollment: boolean }): Promise<V2State | null> {
  let enrolledNow = false;
  // Admin and Elite keep their existing (legacy) rights and unlimited handling.
  if (user.role === "admin" || user.plan === "elite") return null;
  const acct = await tx.query("SELECT user_id FROM billing_accounts_v2 WHERE user_id = $1", [user.id]);
  if (!acct.rows[0]) {
    if (!opts.allowFreeEnrollment || !isFreeEnrollable(user)) return null;
    await tx.query("INSERT INTO billing_accounts_v2(user_id, source) VALUES ($1,'free_enrollment') ON CONFLICT DO NOTHING", [user.id]);
    enrolledNow = true;
  }

  // Expire finished terms: paid allowance ends with the term, purchased bonus stays.
  const expired = await tx.query(
    "UPDATE billing_entitlements_v2 SET status = 'expired', updated_at = NOW() WHERE user_id = $1 AND status = 'active' AND ends_at <= $2 RETURNING id, plan_id",
    [user.id, now],
  );
  if (expired.rows.length) {
    await setMonthly(tx, user.id, 0, `v2expired:${expired.rows[0].id}`);
    await logTxn(tx, user.id, 0, "v2_term_expired", `Prepaid ${expired.rows[0].plan_id} term ended; unused monthly allowance removed, bonus credits kept`);
  }

  const active = (await tx.query(
    "SELECT * FROM billing_entitlements_v2 WHERE user_id = $1 AND status = 'active' AND starts_at <= $2 AND ends_at > $2",
    [user.id, now],
  )).rows[0];

  if (active) {
    const anchor = new Date(active.starts_at);
    const idx = periodIndexAt(anchor, active.term_months, now)!;
    const pStart = calendarMonthBoundary(anchor, idx), pEnd = calendarMonthBoundary(anchor, idx + 1);
    const map = LEGACY_PLAN_MAPPING_V2[active.plan_id as PaidPlanV2];
    await syncLegacyPlan(tx, user, map.plan, map.hasVideoMarketing); // repairs legacy-route tampering
    const g = await tx.query(
      `INSERT INTO billing_period_grants_v2(entitlement_id, period_index, user_id, period_start, period_end, credits)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING period_index`,
      [active.id, idx, user.id, pStart, pEnd, active.monthly_allowance],
    );
    if (g.rows.length) {
      await setMonthly(tx, user.id, active.monthly_allowance, `v2paid:${active.id}:${idx}`);
      await logTxn(tx, user.id, active.monthly_allowance, "v2_period_reset", `Prepaid ${active.plan_id} month ${idx + 1}/${active.term_months}: allowance reset to ${active.monthly_allowance}, no rollover`);
    }
    return {
      state: "paid", planId: active.plan_id, monthlyAllowance: active.monthly_allowance,
      entitlement: { id: active.id, planId: active.plan_id, termMonths: active.term_months, startsAt: anchor.toISOString(), endsAt: new Date(active.ends_at).toISOString(), periodIndex: idx, periodEnd: pEnd.toISOString() },
      balance: toBalance(await readBalance(tx, user.id)), enrolledNow,
    };
  }

  // Free v2: role-gated Free rights, 100/calendar month (UTC), reset not added.
  if (user.role !== "admin") await syncLegacyPlan(tx, user, "free", false);
  const key = freeV2PeriodKey(now);
  const claim = await tx.query("INSERT INTO oravini_free_grants_v2(user_id, period_key) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING period_key", [user.id, key]);
  if (claim.rows.length) {
    await setMonthly(tx, user.id, FREE_V2_POLICY.credits, `v2free:${key}`);
    await logTxn(tx, user.id, FREE_V2_POLICY.credits, "v2_free_reset", `Free monthly allowance for ${key}: reset to ${FREE_V2_POLICY.credits}, no rollover`);
  }
  return { state: "free", planId: "free", monthlyAllowance: FREE_V2_POLICY.credits, entitlement: null, balance: toBalance(await readBalance(tx, user.id)), enrolledNow };
}

export async function refreshForUser(db: Db, userId: string, now = new Date(), opts = { allowFreeEnrollment: false }) {
  return withUserLock(db, userId, (tx, user) => refreshLocked(tx, user, now, opts));
}

// ── Credit debit / credit (v2 accounts) ─────────────────────────────────────
export type DebitResult = { legacy: true } | { legacy: false; success: boolean; balance: ReturnType<typeof toBalance>; message?: string };

export async function debitCredits(db: Db, userId: string, amount: number, type: string, description: string, now = new Date(), opts = { allowFreeEnrollment: false }): Promise<DebitResult> {
  if (!Number.isInteger(amount) || amount <= 0) throw new BillingError("invalid-amount", 400);
  return withUserLock(db, userId, async (tx, user) => {
    const state = await refreshLocked(tx, user, now, opts);
    if (!state) return { legacy: true } as const;
    const b = await readBalance(tx, userId, true);
    const monthly = b?.monthly_credits ?? 0, bonus = b?.bonus_credits ?? 0;
    if (monthly + bonus < amount) {
      return { legacy: false, success: false, balance: toBalance(b), message: `Not enough credits. You need ${amount} but have ${monthly + bonus}.` } as const;
    }
    // Spend the expiring monthly allowance first; purchased bonus credits last.
    const fromMonthly = Math.min(monthly, amount);
    const r = await tx.query(
      "UPDATE credit_balances SET monthly_credits = monthly_credits - $2, bonus_credits = bonus_credits - $3 WHERE user_id = $1 RETURNING *",
      [userId, fromMonthly, amount - fromMonthly],
    );
    await logTxn(tx, userId, -amount, type, description);
    return { legacy: false, success: true, balance: toBalance(r.rows[0]) } as const;
  });
}

/** Return credits for failed paid work (lands in bonus so a reset can't swallow it). */
export async function refundCreditsV2(db: Db, userId: string, amount: number, type: string, description: string): Promise<boolean> {
  if (!Number.isInteger(amount) || amount <= 0) return true;
  return withUserLock(db, userId, async (tx) => {
    const acct = await tx.query("SELECT 1 FROM billing_accounts_v2 WHERE user_id = $1", [userId]);
    if (!acct.rows[0]) return false;
    const r = await tx.query("UPDATE credit_balances SET bonus_credits = bonus_credits + $2 WHERE user_id = $1 RETURNING id", [userId, amount]);
    if (r.rows[0]) await logTxn(tx, userId, amount, `${type}_refund`, `Refund: ${description}`);
    return true;
  });
}

// ── Checkout ────────────────────────────────────────────────────────────────
/** Server-side eligibility + checkout row. userId comes from the session only. */
export async function createCheckoutRecord(db: Db, userId: string, offer: OfferSnapshot, now = new Date()): Promise<{ checkoutId: string }> {
  return withUserLock(db, userId, async (tx, user) => {
    if (user.role === "admin" || user.plan === "elite") throw new BillingError("ineligible-account", 409);
    const acct = await tx.query("SELECT 1 FROM billing_accounts_v2 WHERE user_id = $1", [userId]);
    // Legacy paid subscribers keep their prior contract until deliberately migrated.
    if (!acct.rows[0] && user.plan !== "free") throw new BillingError("legacy-subscriber-migration-required", 409);
    const existing = (await tx.query("SELECT ends_at FROM billing_entitlements_v2 WHERE user_id = $1 AND status = 'active' AND ends_at > $2", [userId, now])).rows[0];
    if (existing) throw new BillingError("existing-term", 409, { endsAt: new Date(existing.ends_at).toISOString() });
    const r = await tx.query(
      "INSERT INTO billing_checkouts_v2(user_id, whop_plan_id, offer_snapshot, snapshot_hash) VALUES ($1,$2,$3,$4) RETURNING id",
      [userId, offer.whopPlanId, JSON.stringify(offer), snapshotHash(offer)],
    );
    return { checkoutId: r.rows[0].id };
  });
}

export async function getCheckout(q: { query: Tx["query"] }, checkoutId: string) {
  const r = await q.query("SELECT id, user_id, whop_plan_id, whop_checkout_id, offer_snapshot, snapshot_hash, status, created_at FROM billing_checkouts_v2 WHERE id = $1", [checkoutId]);
  return r.rows[0] ?? null;
}

// ── Fulfillment (single path for webhooks AND browser reconciliation) ───────
export interface VerifiedPayment {
  paymentId: string;
  checkoutId: string;
  whopPlanId: string;
  productId: string;
  /** Verified sold catalog amount; never the tax-inclusive gross total. */
  amountCents: number;
  currency: string;
  paidAt: Date | null;
}

export type FulfillResult =
  | { result: "fulfilled"; entitlementId: string; endsAt: string }
  | { result: "already-fulfilled"; entitlementId: string | null }
  | { result: "existing-term"; endsAt: string }
  | { result: "needs-review"; reason: string }
  | { result: "revoked"; status: string };

export async function fulfillVerifiedPayment(db: Db, vp: VerifiedPayment, opts: { expectedUserId?: string; now?: Date } = {}): Promise<FulfillResult> {
  const now = opts.now ?? new Date();
  const pre = await (async () => { const c = await db.connect(); try { return await getCheckout(c, vp.checkoutId); } finally { c.release(); } })();
  if (!pre) throw new BillingError("unknown-checkout", 404);
  // Account binding: the only user that can receive access is the one who created the
  // checkout server-side. A browser caller must be that same authenticated user.
  if (opts.expectedUserId !== undefined && opts.expectedUserId !== pre.user_id) throw new BillingError("account-mismatch", 403);

  return withUserLock(db, pre.user_id, async (tx, user) => {
    const co = (await tx.query("SELECT * FROM billing_checkouts_v2 WHERE id = $1 FOR UPDATE", [vp.checkoutId])).rows[0];
    if (!co || co.user_id !== user.id) throw new BillingError("account-mismatch", 403);
    const snap: OfferSnapshot = co.offer_snapshot;
    if (snapshotHash(snap) !== co.snapshot_hash) throw new BillingError("snapshot-integrity", 500);

    const existing = (await tx.query("SELECT * FROM billing_payments_v2 WHERE whop_payment_id = $1 FOR UPDATE", [vp.paymentId])).rows[0];
    if (existing) {
      if (existing.checkout_id !== co.id) throw new BillingError("payment-checkout-mismatch", 409);
      if (existing.status === "fulfilled") {
        const e = (await tx.query("SELECT id FROM billing_entitlements_v2 WHERE whop_payment_id = $1", [vp.paymentId])).rows[0];
        return { result: "already-fulfilled", entitlementId: e?.id ?? null };
      }
      if (existing.status === "needs_review") return { result: "needs-review", reason: existing.review_reason };
      return { result: "revoked", status: existing.status };
    }
    // Exact match against the immutable sold snapshot (defence in depth after verification).
    if (co.whop_plan_id !== snap.whopPlanId || vp.whopPlanId !== snap.whopPlanId) throw new BillingError("variant-mismatch", 409);
    if (vp.productId !== snap.whopProductId) throw new BillingError("product-mismatch", 409);
    if (vp.amountCents !== snap.amountCents || vp.currency !== snap.currency) throw new BillingError("amount-mismatch", 409);
    if (co.status !== "created") throw new BillingError("checkout-already-used", 409);

    const recordReview = async (reason: string) => {
      await tx.query(
        `INSERT INTO billing_payments_v2(whop_payment_id, checkout_id, user_id, amount_cents, currency, offer_snapshot, snapshot_hash, paid_at, status, review_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'needs_review',$9)`,
        [vp.paymentId, co.id, user.id, vp.amountCents, vp.currency, JSON.stringify(snap), co.snapshot_hash, vp.paidAt ?? now, reason],
      );
      await tx.query("UPDATE billing_checkouts_v2 SET status = 'rejected', updated_at = NOW() WHERE id = $1", [co.id]);
    };

    // Paid time anchors at Whop's paid_at, bounded to [checkout creation - 1h, now + 5m].
    const paidAt = vp.paidAt ?? now;
    if (paidAt.getTime() > now.getTime() + 5 * 60_000 || paidAt.getTime() < new Date(co.created_at).getTime() - 3_600_000) {
      await recordReview("paid-at-out-of-range"); return { result: "needs-review", reason: "paid-at-out-of-range" };
    }
    if (user.role === "admin" || user.plan === "elite") { await recordReview("ineligible-account"); return { result: "needs-review", reason: "ineligible-account" }; }
    const acct = (await tx.query("SELECT 1 FROM billing_accounts_v2 WHERE user_id = $1", [user.id])).rows[0];
    if (!acct && user.plan !== "free") { await recordReview("legacy-subscriber"); return { result: "needs-review", reason: "legacy-subscriber" }; }

    await tx.query("UPDATE billing_entitlements_v2 SET status = 'expired', updated_at = NOW() WHERE user_id = $1 AND status = 'active' AND ends_at <= $2", [user.id, now]);
    const overlap = (await tx.query("SELECT ends_at FROM billing_entitlements_v2 WHERE user_id = $1 AND status = 'active'", [user.id])).rows[0];
    if (overlap) {
      // Never silently discard paid time: keep the payment for manual refund/extension.
      await recordReview("existing-term");
      return { result: "existing-term", endsAt: new Date(overlap.ends_at).toISOString() };
    }
    // Clock skew: never anchor a term in the future (it would not be active yet).
    const anchorAt = paidAt.getTime() > now.getTime() ? now : paidAt;
    const endsAt = termEnd(anchorAt, snap.termMonths);
    if (endsAt <= now) { await recordReview("term-already-elapsed"); return { result: "needs-review", reason: "term-already-elapsed" }; }

    await tx.query(
      `INSERT INTO billing_payments_v2(whop_payment_id, checkout_id, user_id, amount_cents, currency, offer_snapshot, snapshot_hash, paid_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'fulfilled')`,
      [vp.paymentId, co.id, user.id, vp.amountCents, vp.currency, JSON.stringify(snap), co.snapshot_hash, paidAt],
    );
    const ent = await tx.query(
      `INSERT INTO billing_entitlements_v2(user_id, whop_payment_id, plan_id, term_months, monthly_allowance, offer_snapshot, starts_at, ends_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING id`,
      [user.id, vp.paymentId, snap.planId, snap.termMonths, snap.monthlyAllowance, JSON.stringify(snap), anchorAt, endsAt],
    );
    await tx.query("INSERT INTO billing_accounts_v2(user_id, source) VALUES ($1,'prepaid_purchase') ON CONFLICT DO NOTHING", [user.id]);
    await tx.query("UPDATE billing_checkouts_v2 SET status = 'fulfilled', updated_at = NOW() WHERE id = $1", [co.id]);
    await logTxn(tx, user.id, 0, "v2_purchase", `Prepaid ${snap.planId} ${snap.termMonths}-month term (${vp.paymentId}), no auto-renewal`);
    await refreshLocked(tx, user, now, { allowFreeEnrollment: false }); // grants the current month
    return { result: "fulfilled", entitlementId: ent.rows[0].id, endsAt: endsAt.toISOString() };
  });
}

// ── Refund / dispute (fail safe) ────────────────────────────────────────────
export interface ReversalInput {
  paymentId: string;
  checkoutId: string;
  userId: string;
  offerSnapshot: OfferSnapshot;
  snapshotHash: string;
  paidAt: Date | null;
  reason: "refunded" | "disputed";
  expectedUserId?: string;
  now: Date;
}
export type ReversalResult =
  | { result: "tombstoned" }
  | { result: "revoked"; entitlementRevoked: boolean }
  | { result: "already-revoked" };

async function revokePaymentLocked(tx: Tx, user: any, paymentId: string, reason: "refunded" | "disputed", now: Date) {
  await tx.query("UPDATE billing_payments_v2 SET status = $2, updated_at = NOW() WHERE whop_payment_id = $1", [paymentId, reason]);
  const e = await tx.query("UPDATE billing_entitlements_v2 SET status = 'revoked', revoked_reason = $2, updated_at = NOW() WHERE whop_payment_id = $1 AND status = 'active' RETURNING id", [paymentId, reason]);
  if (e.rows.length) {
    await setMonthly(tx, user.id, 0, `v2revoked:${e.rows[0].id}`);
    await logTxn(tx, user.id, 0, "v2_term_revoked", `Prepaid term revoked (${reason}); paid allowance removed, bonus credits kept`);
    await refreshLocked(tx, user, now, { allowFreeEnrollment: false }); // back to gated Free
  }
  return { result: "revoked" as const, entitlementRevoked: e.rows.length > 0 };
}

/**
 * Durable reversal for a verified refund/dispute that reaches us before a stale
 * paid response is fulfilled. The payment row (unique per checkout) is the
 * tombstone: a later paid response sees it and can never grant access. Callers
 * must first verify the server-fetched payment against the persisted snapshot.
 */
export async function recordUnfulfilledReversal(db: Db, input: ReversalInput): Promise<ReversalResult> {
  if (input.expectedUserId !== undefined && input.expectedUserId !== input.userId) throw new BillingError("account-mismatch", 403);
  return withUserLock(db, input.userId, async (tx, user) => {
    const row = (await tx.query("SELECT * FROM billing_checkouts_v2 WHERE id = $1 FOR UPDATE", [input.checkoutId])).rows[0];
    if (!row || row.user_id !== user.id) throw new BillingError("account-mismatch", 403);
    const snap: OfferSnapshot = row.offer_snapshot;
    if (snapshotHash(snap) !== row.snapshot_hash || snapshotHash(input.offerSnapshot) !== row.snapshot_hash || input.snapshotHash !== row.snapshot_hash) {
      throw new BillingError("snapshot-integrity", 500);
    }
    if (row.whop_plan_id !== snap.whopPlanId) throw new BillingError("variant-mismatch", 409);

    // checkout_id is UNIQUE in billing_payments_v2: a different payment already
    // bound to this checkout must never be overwritten by a reversal.
    const bound = (await tx.query("SELECT whop_payment_id FROM billing_payments_v2 WHERE checkout_id = $1 FOR UPDATE", [row.id])).rows[0];
    if (bound && bound.whop_payment_id !== input.paymentId) throw new BillingError("payment-checkout-mismatch", 409);
    const existing = (await tx.query("SELECT * FROM billing_payments_v2 WHERE whop_payment_id = $1 FOR UPDATE", [input.paymentId])).rows[0];
    if (existing) {
      if (existing.checkout_id !== row.id || existing.user_id !== user.id) throw new BillingError("payment-checkout-mismatch", 409);
      if (existing.status === "refunded" || existing.status === "disputed") return { result: "already-revoked" };
      return revokePaymentLocked(tx, user, input.paymentId, input.reason, input.now);
    }

    // No payment row yet: write the immutable sold snapshot from the checkout row
    // itself, never from the webhook/redirect payload.
    await tx.query(
      `INSERT INTO billing_payments_v2(whop_payment_id, checkout_id, user_id, amount_cents, currency, offer_snapshot, snapshot_hash, paid_at, status, review_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [input.paymentId, row.id, user.id, snap.amountCents, snap.currency, JSON.stringify(snap), row.snapshot_hash,
       input.paidAt ?? input.now, input.reason, `reversal-before-fulfillment:${input.reason}`],
    );
    await tx.query("UPDATE billing_checkouts_v2 SET status = 'rejected', updated_at = NOW() WHERE id = $1", [row.id]);
    // Defensive: no entitlement can reference a payment row that did not exist, but
    // if one appeared, revoke only that payment's entitlement — never an unrelated one.
    const e = await tx.query("UPDATE billing_entitlements_v2 SET status = 'revoked', revoked_reason = $2, updated_at = NOW() WHERE whop_payment_id = $1 AND status = 'active' RETURNING id", [input.paymentId, input.reason]);
    if (e.rows.length) {
      await setMonthly(tx, user.id, 0, `v2revoked:${e.rows[0].id}`);
      await logTxn(tx, user.id, 0, "v2_term_revoked", `Prepaid term revoked (${input.reason}); paid allowance removed, bonus credits kept`);
      await refreshLocked(tx, user, input.now, { allowFreeEnrollment: false });
    }
    return { result: "tombstoned" };
  });
}

/** Revoke paid access for a refunded or disputed v2 payment. Unknown payments (legacy
 * subscriptions, other products) are ignored — this never cancels legacy subscribers. */
export async function revokeForPayment(db: Db, paymentId: string, reason: "refunded" | "disputed", now = new Date()) {
  const pre = await (async () => { const c = await db.connect(); try { return (await c.query("SELECT user_id FROM billing_payments_v2 WHERE whop_payment_id = $1", [paymentId])).rows[0]; } finally { c.release(); } })();
  if (!pre) return { result: "ignored-unknown-payment" as const };
  return withUserLock(db, pre.user_id, async (tx, user) => {
    const p = (await tx.query("SELECT * FROM billing_payments_v2 WHERE whop_payment_id = $1 FOR UPDATE", [paymentId])).rows[0];
    if (p.status === "refunded" || p.status === "disputed") return { result: "already-revoked" as const };
    return revokePaymentLocked(tx, user, paymentId, reason, now);
  });
}

export async function isV2Account(q: { query: Tx["query"] }, userId: string): Promise<boolean> {
  try {
    return (await q.query("SELECT 1 FROM billing_accounts_v2 WHERE user_id = $1", [userId])).rows.length > 0;
  } catch (e: any) {
    if (e?.code === "42P01") return false; // schema not migrated yet -> everyone is legacy
    throw e;
  }
}
