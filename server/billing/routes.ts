// Billing v2 HTTP surface. All identity comes from the authenticated session; request
// bodies only select a catalog offer or name a Whop payment id to re-verify.
import type { Express, Request, Response, NextFunction } from "express";
import { billingV2Status, loadBillingV2Config, type BillingV2Config, type WhopEnvironment } from "./config";
import { findOffer, PAID_PLANS } from "./catalog";
import { BillingError, createCheckoutRecord, isV2Account, refreshForUser, type Db, type V2State } from "./ledger";
import { billingV2SchemaReady } from "./schema";
import { processWhopPayment, paymentIdFromEvent } from "./service";
import { createWhopClient, type WhopClient } from "./whopClient";
import { verifyWhopWebhook } from "./whopWebhook";
import { isWhopPaymentId } from "./whopVerification";
import { TERM_STEPS } from "../../shared/pricingV2";

export interface BillingV2Deps {
  db: Db & { query(sql: string, v?: unknown[]): Promise<{ rows: any[] }> };
  config?: () => BillingV2Config;
  whop?: (apiKey: string, environment: WhopEnvironment) => WhopClient;
  now?: () => Date;
}

const sessionUserId = (req: Request): string | null => {
  if (typeof (req as any).isAuthenticated !== "function" || !(req as any).isAuthenticated()) return null;
  const id = (req.user as any)?.id;
  return typeof id === "string" && id ? id : null;
};

function sendBillingError(res: Response, e: unknown) {
  if (e instanceof BillingError) return res.status(e.status).json({ message: e.code, ...e.detail });
  console.error("[billing-v2] unexpected error:", (e as any)?.code || (e as any)?.name || "error");
  return res.status(500).json({ message: "billing-error" });
}

export function registerBillingV2Routes(app: Pick<Express, "get" | "post" | "use">, deps: BillingV2Deps) {
  const cfg = deps.config ?? (() => loadBillingV2Config());
  const now = deps.now ?? (() => new Date());
  const whopFor = deps.whop ?? ((k: string, env: WhopEnvironment) => createWhopClient(k, env));
  let schemaCache: { at: number; ready: boolean } | null = null;
  const schemaReady = async () => {
    if (schemaCache && Date.now() - schemaCache.at < 60_000) return schemaCache.ready;
    const ready = await billingV2SchemaReady(deps.db);
    schemaCache = { at: Date.now(), ready };
    return ready;
  };
  const status = async () => { const c = cfg(); return { c, s: billingV2Status(c, await schemaReady()) }; };

  // Public, secret-free gate status (drives "draft / checkout not available" UI copy).
  app.get("/api/billing/v2/status", async (_req, res) => {
    const { c, s } = await status();
    // Final public prices only once the finalized catalog validates (no Whop IDs exposed).
    const offers = c.catalog.ok ? c.catalog.catalog.offers.map(o => ({ planId: o.planId, termMonths: o.termMonths, amountCents: o.amountCents, currency: o.currency, discountPercent: o.discountPercent, monthlyAllowance: o.monthlyAllowance })) : null;
    res.json({ ...s, plans: PAID_PLANS, terms: TERM_STEPS, autoRenew: false, offers });
  });

  // Current user's v2 state (also refreshes the current month for v2 accounts).
  app.get("/api/billing/v2/me", async (req, res) => {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { s } = await status();
      if (!s.schemaReady) return res.json({ billingModel: "legacy", status: s });
      const state = await refreshForUser(deps.db, userId, now(), { allowFreeEnrollment: s.freeEnrollmentEnabled });
      res.json({ billingModel: state ? "v2" : "legacy", state, status: s });
    } catch (e) { sendBillingError(res, e); }
  });

  app.post("/api/billing/v2/checkout", async (req, res) => {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { c, s } = await status();
    if (!s.checkoutOpen || !c.catalog.ok) return res.status(503).json({ message: "checkout-unavailable", reasons: s.reasons });
    const body = req.body ?? {};
    // Only planId + termMonths are read; any userId/price/variant in the body is ignored.
    const offer = findOffer(c.catalog.catalog, body.planId, body.termMonths);
    if (!offer) return res.status(400).json({ message: "unknown-offer" });
    try {
      const { checkoutId } = await createCheckoutRecord(deps.db, userId, offer, now());
      try {
        const wc = await whopFor(c.apiKey!, c.environment!).createCheckout({ accountId: c.companyId!, whopPlanId: offer.whopPlanId, checkoutId, catalogVersion: offer.catalogVersion, redirectUrl: c.redirectUrl });
        await deps.db.query("UPDATE billing_checkouts_v2 SET whop_checkout_id = $2, updated_at = NOW() WHERE id = $1", [checkoutId, wc.id]);
        return res.json({ checkoutId, purchaseUrl: wc.purchaseUrl, offer: { planId: offer.planId, termMonths: offer.termMonths, amountCents: offer.amountCents, currency: offer.currency, monthlyAllowance: offer.monthlyAllowance, autoRenew: false } });
      } catch {
        await deps.db.query("UPDATE billing_checkouts_v2 SET status = 'abandoned', updated_at = NOW() WHERE id = $1 AND status = 'created'", [checkoutId]);
        return res.status(502).json({ message: "whop-checkout-failed" });
      }
    } catch (e) { sendBillingError(res, e); }
  });

  // Browser return path. The redirect proves nothing: we re-fetch and verify the payment
  // and bind it to the checkout the SAME authenticated user created.
  app.post("/api/billing/v2/reconcile", async (req, res) => {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { c, s } = await status();
    if (!s.fulfillmentOpen || !c.catalog.ok) return res.status(503).json({ message: "fulfillment-unavailable", reasons: s.reasons });
    const paymentId = req.body?.paymentId;
    if (!isWhopPaymentId(paymentId)) return res.status(400).json({ message: "invalid-payment-id" });
    try {
      const r = await processWhopPayment({ db: deps.db, whop: whopFor(c.apiKey!, c.environment!), companyId: c.companyId!, now }, paymentId, { expectedUserId: userId });
      const code = r.result === "fulfilled" || r.result === "already-fulfilled" ? 200 : r.result === "ignored" || r.result === "rejected" ? 422 : 409;
      return res.status(code).json(r);
    } catch (e) { sendBillingError(res, e); }
  });

  // Signed Whop webhook -> same pipeline as reconciliation.
  app.post("/api/webhooks/whop/billing-v2", async (req, res) => {
    const { c, s } = await status();
    const check = verifyWhopWebhook(c.webhookSecret, req.headers as any, (req as any).rawBody);
    if (!check.ok) return res.status(check.reason === "missing-secret" ? 503 : 401).json({ message: "invalid-signature" });
    // Revocation (refund/dispute) must keep working even when fulfillment is switched off.
    const revokeOnly = !s.webhookOpen;
    // An invalid environment must not fall back to production, including on the
    // revocation path that runs while fulfillment is switched off: return a
    // retryable response before any client is constructed or API call attempted.
    if (revokeOnly && (!c.apiKey || !c.companyId || !c.environment || !s.schemaReady)) return res.status(503).json({ message: "fulfillment-unavailable" }); // Whop retries
    const evt = paymentIdFromEvent(req.body);
    const ins = await deps.db.query(
      `INSERT INTO billing_webhook_events_v2(webhook_id, event_type, whop_payment_id, status) VALUES ($1,$2,$3,'processing')
       ON CONFLICT (webhook_id) DO UPDATE SET updated_at = NOW() WHERE billing_webhook_events_v2.status IN ('failed','processing')
       RETURNING status`,
      [check.id, evt.type, evt.paymentId ?? null],
    );
    if (!ins.rows.length) return res.json({ received: true, replay: true });
    if (evt.kind === "ignore") {
      await deps.db.query("UPDATE billing_webhook_events_v2 SET status = 'ignored', result = 'event-not-handled', updated_at = NOW() WHERE webhook_id = $1", [check.id]);
      return res.json({ received: true, ignored: true });
    }
    if (!isWhopPaymentId(evt.paymentId)) {
      await deps.db.query("UPDATE billing_webhook_events_v2 SET status = 'rejected', result = 'invalid-payment-id', updated_at = NOW() WHERE webhook_id = $1", [check.id]);
      return res.json({ received: true });
    }
    try {
      const r = await processWhopPayment({ db: deps.db, whop: whopFor(c.apiKey!, c.environment!), companyId: c.companyId!, now }, evt.paymentId, { revokeOnly });
      if (r.result === "deferred") {
        // Keep the event retryable: a legitimate webhook can beat the checkout
        // persist in the same request, and must not be permanently discarded.
        await deps.db.query("UPDATE billing_webhook_events_v2 SET status = 'failed', result = $2, updated_at = NOW() WHERE webhook_id = $1", [check.id, `deferred:${r.reason}`]);
        return res.status(503).json({ message: "fulfillment-unavailable" }); // Whop retries
      }
      const st = r.result === "ignored" ? "ignored" : r.result === "rejected" ? "rejected" : "processed";
      await deps.db.query("UPDATE billing_webhook_events_v2 SET status = $2, result = $3, updated_at = NOW() WHERE webhook_id = $1", [check.id, st, JSON.stringify(r).slice(0, 500)]);
      return res.json({ received: true, result: r.result });
    } catch (e: any) {
      await deps.db.query("UPDATE billing_webhook_events_v2 SET status = 'failed', result = $2, updated_at = NOW() WHERE webhook_id = $1", [check.id, String(e?.code || e?.name || "error").slice(0, 100)]).catch(() => {});
      return res.status(500).json({ message: "processing-failed" }); // Whop retries; fulfillment is idempotent
    }
  });

  // Legacy "cancel plan" is a free downgrade for monthly subscribers. Prepaid v2 terms
  // have no auto-renewal to cancel; block it for v2 accounts, pass through for legacy.
  app.post("/api/auth/cancel-plan", async (req: Request, res: Response, next: NextFunction) => {
    const userId = sessionUserId(req);
    if (!userId) return next();
    try { if (await isV2Account(deps.db, userId)) return res.status(409).json({ message: "prepaid-term-has-no-renewal-to-cancel" }); }
    catch { return res.status(503).json({ message: "billing-unavailable" }); }
    next();
  });
}

/**
 * Authenticated middleware: keeps v2 entitlement state current (expiry, monthly resets)
 * so plan-gated routes see the right plan. Cheap for legacy accounts (one indexed read,
 * cached); v2 accounts re-check at most once per minute, but never past the next paid
 * period/term end or UTC month boundary. One injected clock value is used per request.
 */
function v2CacheBoundary(state: V2State | null, t: Date): number {
  if (!state) return Number.POSITIVE_INFINITY;
  if (state.state === "paid" && state.entitlement) {
    const endsAt = Date.parse(state.entitlement.endsAt);
    const periodEnd = Date.parse(state.entitlement.periodEnd);
    return Math.min(endsAt, periodEnd);
  }
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1);
}

export function billingV2SessionMiddleware(deps: { db: BillingV2Deps["db"]; freeEnrollment: () => boolean; now?: () => Date }) {
  const nextCheck = new Map<string, number>();
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = sessionUserId(req);
    if (!userId || !req.path.startsWith("/api")) return next();
    const t = deps.now?.() ?? new Date();
    const ms = t.getTime();
    if ((nextCheck.get(userId) ?? 0) > ms) return next();
    try {
      const enrolled = await isV2Account(deps.db, userId);
      const u: any = req.user;
      const candidate = enrolled || (deps.freeEnrollment() && u?.plan === "free" && u?.role !== "admin");
      if (candidate) {
        const state = await refreshForUser(deps.db, userId, t, { allowFreeEnrollment: deps.freeEnrollment() });
        if (state && u) { // reflect the locked, refreshed plan on this request
          const fresh = await deps.db.query("SELECT plan, has_video_marketing FROM users WHERE id = $1", [userId]);
          if (fresh.rows[0]) { u.plan = fresh.rows[0].plan; u.hasVideoMarketing = fresh.rows[0].has_video_marketing; }
        }
        // Cap the short cache at the next authoritative boundary. Fail closed with
        // no cache if the boundary cannot be determined.
        const boundary = v2CacheBoundary(state, t);
        nextCheck.set(userId, Number.isFinite(boundary) ? Math.min(ms + 60_000, boundary) : ms);
      } else {
        nextCheck.set(userId, ms + 300_000);
      }
      if (nextCheck.size > 50_000) nextCheck.clear();
    } catch (e: any) {
      // Refresh errors are never cached: the next request retries immediately.
      console.error("[billing-v2] session refresh failed:", e?.code || e?.name || "error");
    }
    next();
  };
}
