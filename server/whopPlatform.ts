// Whop for Platforms: every Oravini customer ("seller") gets their own Whop subaccount.
// Buyers pay the seller directly (direct charge). Oravini collects a fixed 1.5%
// application fee on each payment and never holds the seller's money.
//
// Safety rules enforced in this file:
//  - Kill switch: WHOP_PLATFORM_ENABLED must be "true". Default OFF. Sandbox is the default environment.
//  - The amount and the fee are computed on the server, in integer cents, from the saved checkout row.
//    Nothing the buyer's browser sends can change the price, the fee or the destination account.
//  - Payments are only credited after the webhook signature is verified, the webhook id is stored
//    (replays are ignored), and the payment is re-read from the Whop API and matches the checkout
//    (seller account, amount, currency, our checkout id).
//  - No card data touches Oravini: the buyer pays on Whop's hosted checkout.
//  - The Whop API key and webhook secret come from environment variables only and are never logged
//    or returned. Seller emails and ids are only returned to their own seller.
//  - Refunds and disputes stay with the seller's Whop account; we only mirror the status.
import type { Express, NextFunction, Request, Response } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { pool } from "./storage";
import { verifyWhopWebhook } from "./billing/whopWebhook";
import { WHOP_API_BASES, type WhopEnvironment } from "./billing/config";

export const PLATFORM_FEE_PERCENT = 1.5;
const FEE_BPS = 150; // 1.5% = 150 basis points
const MIN_CENTS = 100;       // $1.00
const MAX_CENTS = 500_000;   // $5,000.00 per checkout in v1
const API_VERSION_DATE = "2026-11-25";
const TIMEOUT_MS = 15_000;

// ── Fee maths (integer cents only) ───────────────────────────────────────────
export function computeFeeCents(amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) throw new Error("invalid-amount");
  const fee = Math.max(1, Math.round((amountCents * FEE_BPS) / 10_000));
  if (fee >= amountCents) throw new Error("invalid-fee");
  return fee;
}
export const centsToUnits = (c: number) => Math.round(c) / 100;

// ── Config ───────────────────────────────────────────────────────────────────
export interface PlatformConfig {
  enabled: boolean;
  environment: WhopEnvironment;
  apiKey: string | null;
  webhookSecret: string | null;
  platformAccountId: string | null; // biz_... of Oravini's own Whop company
  appUrl: string;
}
export function loadPlatformConfig(env: Record<string, string | undefined> = process.env): PlatformConfig {
  const e = env.WHOP_PLATFORM_ENV === "production" ? "production" : "sandbox";
  const clean = (v?: string) => (v && v.trim() ? v.trim() : null);
  return {
    enabled: env.WHOP_PLATFORM_ENABLED === "true",
    environment: e,
    apiKey: clean(env.WHOP_PLATFORM_API_KEY),
    webhookSecret: clean(env.WHOP_PLATFORM_WEBHOOK_SECRET),
    platformAccountId: clean(env.WHOP_PLATFORM_ACCOUNT_ID),
    appUrl: (clean(env.PUBLIC_APP_URL) || clean(env.APP_URL) || "https://oravini.com").replace(/\/+$/, ""),
  };
}

// ── Validation ───────────────────────────────────────────────────────────────
const httpsUrl = z.string().trim().max(500).url().refine((u) => /^https:\/\//i.test(u), "must be https");
export const checkoutInput = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  price: z.number().finite().min(MIN_CENTS / 100).max(MAX_CENTS / 100),
  redirectUrl: z.union([httpsUrl, z.literal(""), z.null()]).optional(),
  buttonColor: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal(""), z.null()]).optional(),
  webinarFunnelId: z.union([z.string().max(64), z.literal(""), z.null()]).optional(),
  buttonLabel: z.union([z.string().trim().max(40), z.null()]).optional(),
  active: z.boolean().optional(),
});
export const priceToCents = (price: number) => Math.round(price * 100);

// ── Whop API client (platform key, fixed base per environment) ──────────────
export class WhopPlatformError extends Error {
  constructor(public status: number, public code: string, public detail?: string) { super(code); }
}
export function createPlatformClient(cfg: PlatformConfig, fetchImpl: typeof fetch = fetch) {
  const base = WHOP_API_BASES[cfg.environment];
  const call = async (path: string, init: RequestInit = {}, idem?: string) => {
    if (!cfg.apiKey) throw new WhopPlatformError(503, "not-configured");
    let res: globalThis.Response;
    try {
      res = await fetchImpl(`${base}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Api-Version-Date": API_VERSION_DATE,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(idem ? { "Idempotency-Key": idem } : {}),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new WhopPlatformError(0, "unavailable");
    }
    if (!res.ok) { let detail = ""; try { detail = (await res.text()).slice(0, 300); } catch {} throw new WhopPlatformError(res.status, res.status === 401 || res.status === 403 ? "auth" : res.status === 409 ? "conflict" : res.status >= 500 ? "unavailable" : "rejected", detail); }
    return res.json() as Promise<any>;
  };
  return {
    createAccount: (b: { email: string; title: string; externalId: string }) =>
      call("/companies", { method: "POST", body: JSON.stringify({ title: b.title, email: b.email, parent_company_id: cfg.platformAccountId, metadata: { oravini_ref: b.externalId } }) }, `acct-${b.externalId}`),
    getAccount: (id: string) => call(`/companies/${encodeURIComponent(id)}`),
    createOnboardingLink: (accountId: string, refreshUrl: string, returnUrl: string) =>
      call("/account_links", { method: "POST", body: JSON.stringify({ company_id: accountId, refresh_url: refreshUrl, return_url: returnUrl, use_case: "account_onboarding" }) }),
    createPayoutLink: (accountId: string, refreshUrl: string, returnUrl: string) =>
      call("/account_links", { method: "POST", body: JSON.stringify({ company_id: accountId, refresh_url: refreshUrl, return_url: returnUrl, use_case: "payouts_portal" }) }),
    createCheckout: (b: { accountId: string; amountCents: number; feeCents: number; title: string; description: string | null; redirectUrl: string | null; buttonColor: string | null; metadata: Record<string, string>; idem: string }) => {
      const body: any = {
        account_id: b.accountId,
        metadata: b.metadata,
        variant: {
          currency: "usd",
          title: b.title.slice(0, 80),
          ...(b.description ? { description: b.description.slice(0, 500) } : {}),
          initial_price: centsToUnits(b.amountCents),
          billing_type: "one_time",
          application_fee_amount: centsToUnits(b.feeCents),
        },
      };
      if (b.redirectUrl) body.redirect_url = b.redirectUrl;
      return call("/checkout_configurations", { method: "POST", body: JSON.stringify(body) }, b.idem);
    },
    getPayment: (id: string) => call(`/payments/${encodeURIComponent(id)}`),
  };
}
export type PlatformClient = ReturnType<typeof createPlatformClient>;

// ── Tables (additive, idempotent) ────────────────────────────────────────────
export async function ensureWhopPlatformTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whop_platform_accounts (
      user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      whop_account_id VARCHAR(64) NOT NULL,
      environment VARCHAR(12) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS whop_platform_checkouts (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(16) NOT NULL UNIQUE,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(80) NOT NULL,
      description VARCHAR(500),
      amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN ${MIN_CENTS} AND ${MAX_CENTS}),
      currency VARCHAR(3) NOT NULL DEFAULT 'usd',
      redirect_url VARCHAR(500),
      button_color VARCHAR(7),
      webinar_funnel_id VARCHAR,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    ALTER TABLE whop_platform_checkouts ADD COLUMN IF NOT EXISTS button_label VARCHAR(40);
    ALTER TABLE whop_platform_checkouts ADD COLUMN IF NOT EXISTS offer_live BOOLEAN NOT NULL DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_whop_platform_checkouts_user ON whop_platform_checkouts(user_id);
    CREATE TABLE IF NOT EXISTS whop_platform_payments (
      whop_payment_id VARCHAR(64) PRIMARY KEY,
      checkout_id VARCHAR NOT NULL REFERENCES whop_platform_checkouts(id) ON DELETE CASCADE,
      user_id VARCHAR NOT NULL,
      registration_id VARCHAR,
      amount_cents INTEGER NOT NULL,
      fee_cents INTEGER NOT NULL,
      currency VARCHAR(3) NOT NULL,
      status VARCHAR(24) NOT NULL,
      refunded_cents INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_whop_platform_payments_user ON whop_platform_payments(user_id);
    CREATE TABLE IF NOT EXISTS whop_platform_events (
      webhook_id VARCHAR(128) PRIMARY KEY,
      type VARCHAR(64) NOT NULL,
      received_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !(req.user as any)?.id) return res.status(401).json({ message: "Unauthorized" });
  next();
}
const uid = (req: Request) => String((req.user as any).id);
const p = (v: unknown) => String(Array.isArray(v) ? v[0] : v ?? "");
const newCode = () => randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toLowerCase();

const hits = new Map<string, number[]>();
function limited(key: string, max: number, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const r = (hits.get(key) || []).filter((t) => now - t < windowMs);
  r.push(now); hits.set(key, r);
  if (hits.size > 5000) hits.clear();
  return r.length > max;
}
function noStore(_q: Request, res: Response, next: NextFunction) { res.setHeader("Cache-Control", "no-store, private"); next(); }

const WHOP_HOST_RE = /^https:\/\/([a-z0-9-]+\.)*whop\.com\//i;
const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const DEFAULT_BUTTON_LABEL = "Click here to buy";
function publicCheckout(r: any, appUrl: string) {
  return {
    id: r.id, code: r.code, title: r.title, description: r.description, price: r.amount_cents / 100, currency: r.currency,
    feeCents: computeFeeCents(r.amount_cents), sellerReceivesCents: r.amount_cents - computeFeeCents(r.amount_cents),
    redirectUrl: r.redirect_url, buttonColor: r.button_color, buttonLabel: r.button_label || DEFAULT_BUTTON_LABEL, offerLive: !!r.offer_live, webinarFunnelId: r.webinar_funnel_id, active: r.active,
    link: `${appUrl}/pay/${r.code}`, sales: Number(r.sales ?? 0), createdAt: r.created_at,
  };
}

// ── Payment sync: the only place that records a payment ──────────────────────
// Called from the webhook after signature + replay checks. Re-reads the payment
// from Whop and only credits it when it matches our checkout row exactly.
export async function syncPayment(client: PlatformClient, paymentId: string): Promise<"recorded" | "ignored" | "mismatch"> {
  const pay: any = await client.getPayment(paymentId);
  const checkoutId = pay?.metadata?.oravini_checkout_id;
  if (typeof checkoutId !== "string") { console.warn("[whop-platform] sync ignored: no checkout metadata", { paymentId, keys: Object.keys(pay || {}).slice(0, 40), metaKeys: Object.keys(pay?.metadata || {}) }); return "ignored"; } // not one of ours
  const { rows } = await pool.query(
    `SELECT c.*, a.whop_account_id FROM whop_platform_checkouts c
       LEFT JOIN whop_platform_accounts a ON a.user_id = c.user_id WHERE c.id = $1`, [checkoutId]);
  const c = rows[0];
  if (!c) return "ignored";
  const paidAccount = String(pay?.company_id ?? pay?.company?.id ?? pay?.account_id ?? "");
  // Whop returns money either as a plain number (older API) or as { amount: "97.00", currency } (current API).
  const money = (v: any): number => (v && typeof v === "object" ? Number(v.amount) : Number(v));
  const cents = Math.round(money(pay?.total ?? pay?.subtotal) * 100);
  const currency = String(pay?.currency ?? pay?.total?.currency ?? "").toLowerCase();
  const status = String(pay?.status ?? "");
  const refunded = Math.round((money(pay?.refunded_amount ?? pay?.amount_refunded ?? 0) || 0) * 100) || 0;
  // Never credit a payment that doesn't match what the seller priced.
  if (!c.whop_account_id || (paidAccount && paidAccount !== c.whop_account_id) || cents !== c.amount_cents || currency !== c.currency) {
    console.warn("[whop-platform] sync mismatch", { paymentId, hasAccount: !!c.whop_account_id, paidAccount, expectedAccount: c.whop_account_id, cents, expectedCents: c.amount_cents, currency, expectedCurrency: c.currency, status });
    return "mismatch";
  }
  const regId = typeof pay?.metadata?.oravini_registration_id === "string" ? pay.metadata.oravini_registration_id.slice(0, 64) : null;
  const normalized = status === "paid" || status === "succeeded" ? "paid" : status || "unknown";
  await pool.query(
    `INSERT INTO whop_platform_payments (whop_payment_id, checkout_id, user_id, registration_id, amount_cents, fee_cents, currency, status, refunded_cents)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (whop_payment_id) DO UPDATE SET status = EXCLUDED.status, refunded_cents = EXCLUDED.refunded_cents, updated_at = NOW()`,
    [paymentId, c.id, c.user_id, regId, c.amount_cents, computeFeeCents(c.amount_cents), c.currency, refunded >= c.amount_cents ? "refunded" : normalized, refunded],
  );
  return "recorded";
}

// ── Routes ───────────────────────────────────────────────────────────────────
export async function registerWhopPlatformRoutes(app: Express, deps: { client?: PlatformClient; config?: PlatformConfig } = {}): Promise<void> {
  const cfg = deps.config ?? loadPlatformConfig();
  const client = deps.client ?? createPlatformClient(cfg);
  try { await ensureWhopPlatformTables(); } catch { console.warn("[whop-platform] could not ensure tables"); }
  try { const { registerWhopLogin } = await import("./whopLogin"); await registerWhopLogin(app); } catch (e) { console.warn("[whop-login] not registered"); }

  const ready = (res: Response) => {
    if (!cfg.enabled || !cfg.apiKey) { res.status(503).json({ message: "Payments are not switched on yet." }); return false; }
    return true;
  };

  app.use("/api/whop-platform", noStore);

  // Status + checkouts + earnings (own data only)
  app.get("/api/whop-platform/status", requireAuth, async (req, res) => {
    try {
      const u = uid(req);
      const [acc, chk, sum] = await Promise.all([
        pool.query(`SELECT status, environment FROM whop_platform_accounts WHERE user_id = $1`, [u]),
        pool.query(`SELECT c.*, (SELECT COUNT(*) FROM whop_platform_payments x WHERE x.checkout_id = c.id AND x.status = 'paid') AS sales
                      FROM whop_platform_checkouts c WHERE c.user_id = $1 ORDER BY c.created_at DESC LIMIT 100`, [u]),
        pool.query(`SELECT COUNT(*) FILTER (WHERE status='paid')::int AS sales,
                           COALESCE(SUM(amount_cents) FILTER (WHERE status='paid'),0)::bigint AS gross,
                           COALESCE(SUM(fee_cents) FILTER (WHERE status='paid'),0)::bigint AS fees
                      FROM whop_platform_payments WHERE user_id = $1`, [u]),
      ]);
      res.json({
        enabled: cfg.enabled && !!cfg.apiKey, sandbox: cfg.environment === "sandbox", feePercent: PLATFORM_FEE_PERCENT,
        account: acc.rows[0] ? { status: acc.rows[0].status } : null,
        checkouts: chk.rows.map((r) => publicCheckout(r, cfg.appUrl)),
        totals: { sales: sum.rows[0].sales, grossCents: Number(sum.rows[0].gross), feeCents: Number(sum.rows[0].fees) },
      });
    } catch { res.status(500).json({ message: "Could not load payments." }); }
  });

  // Create/refresh the seller's own Whop subaccount, return the hosted onboarding link
  app.post("/api/whop-platform/connect", requireAuth, async (req, res) => {
    if (!ready(res)) return;
    const u = uid(req);
    if (limited(`connect|${u}`, 8)) return res.status(429).json({ message: "Too many attempts. Try again in a few minutes." });
    try {
      let { rows } = await pool.query(`SELECT whop_account_id, environment FROM whop_platform_accounts WHERE user_id = $1`, [u]);
      if (rows[0] && rows[0].environment !== cfg.environment) rows = []; // never reuse an account from the other environment
      let accountId: string = rows[0]?.whop_account_id;
      if (!accountId) {
        const email = String((req.user as any).email || "");
        const name = String((req.user as any).name || email.split("@")[0] || "Oravini seller").slice(0, 80);
        const acc: any = await client.createAccount({ email, title: `${name} (${String(u).replace(/[^A-Za-z0-9]/g, "").slice(0, 6)}-${randomBytes(2).toString("hex")})`, externalId: `oravini:${cfg.environment}:${u}` });
        accountId = String(acc?.id || "");
        if (!/^biz_[A-Za-z0-9]+$/.test(accountId)) return res.status(502).json({ message: "Whop did not return an account." });
        await pool.query(
          `INSERT INTO whop_platform_accounts (user_id, whop_account_id, environment, status) VALUES ($1,$2,$3,'pending')
           ON CONFLICT (user_id) DO UPDATE SET whop_account_id = EXCLUDED.whop_account_id, environment = EXCLUDED.environment, status = 'pending', updated_at = NOW()`,
          [u, accountId, cfg.environment]);
      }
      const link: any = await client.createOnboardingLink(accountId, `${cfg.appUrl}/get-paid?refresh=1`, `${cfg.appUrl}/get-paid?connected=1`);
      if (typeof link?.url !== "string" || !WHOP_HOST_RE.test(link.url)) return res.status(502).json({ message: "Whop did not return an onboarding link." });
      res.json({ url: link.url });
    } catch (e: any) {
      console.warn("[whop-platform] connect failed", e?.status, e?.code || e?.message, e?.detail);
      res.status(e?.status === 409 ? 409 : 502).json({ message: e?.status === 409 ? "This email is already linked to another Whop account." : "Could not reach Whop. Try again shortly." });
    }
  });

  // Seller marks onboarding done after returning from Whop (readiness is also proven by the first checkout succeeding)
  app.post("/api/whop-platform/connected", requireAuth, async (req, res) => {
    try {
      await pool.query(`UPDATE whop_platform_accounts SET status = 'connected', updated_at = NOW() WHERE user_id = $1`, [uid(req)]);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Could not update." }); }
  });

  // Hosted payout portal link (seller withdraws their own money)
  app.post("/api/whop-platform/payouts-link", requireAuth, async (req, res) => {
    if (!ready(res)) return;
    try {
      const { rows } = await pool.query(`SELECT whop_account_id FROM whop_platform_accounts WHERE user_id = $1 AND environment = $2`, [uid(req), cfg.environment]);
      if (!rows[0]) return res.status(400).json({ message: "Connect your Whop account first." });
      const link: any = await client.createPayoutLink(rows[0].whop_account_id, `${cfg.appUrl}/get-paid`, `${cfg.appUrl}/get-paid`);
      if (typeof link?.url !== "string" || !WHOP_HOST_RE.test(link.url)) return res.status(502).json({ message: "Whop did not return a link." });
      res.json({ url: link.url });
    } catch { res.status(502).json({ message: "Could not reach Whop. Try again shortly." }); }
  });

  async function ownedFunnelOk(userId: string, funnelId: string | null | undefined): Promise<boolean> {
    if (!funnelId) return true;
    const { rows } = await pool.query(`SELECT 1 FROM webinar_funnels WHERE id = $1 AND user_id = $2`, [funnelId, userId]);
    return rows.length > 0;
  }

  app.post("/api/whop-platform/checkouts", requireAuth, async (req, res) => {
    const u = uid(req);
    const parsed = checkoutInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the name and price. Price must be between $1 and $5,000." });
    const d = parsed.data;
    try {
      if (!(await ownedFunnelOk(u, d.webinarFunnelId || null))) return res.status(400).json({ message: "Webinar not found." });
      const count = await pool.query(`SELECT COUNT(*)::int AS n FROM whop_platform_checkouts WHERE user_id = $1`, [u]);
      if (count.rows[0].n >= 100) return res.status(400).json({ message: "Checkout limit reached." });
      const { rows } = await pool.query(
        `INSERT INTO whop_platform_checkouts (code, user_id, title, description, amount_cents, redirect_url, button_color, webinar_funnel_id, button_label)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [newCode(), u, d.title, d.description || null, priceToCents(d.price), d.redirectUrl || null, d.buttonColor || null, d.webinarFunnelId || null, d.buttonLabel || null]);
      res.json({ checkout: publicCheckout(rows[0], cfg.appUrl) });
    } catch { res.status(500).json({ message: "Could not save the checkout." }); }
  });

  app.patch("/api/whop-platform/checkouts/:id", requireAuth, async (req, res) => {
    const u = uid(req);
    const parsed = checkoutInput.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the values and try again." });
    const d = parsed.data;
    try {
      if (d.webinarFunnelId !== undefined && !(await ownedFunnelOk(u, d.webinarFunnelId || null))) return res.status(400).json({ message: "Webinar not found." });
      const cur = await pool.query(`SELECT * FROM whop_platform_checkouts WHERE id = $1 AND user_id = $2`, [p(req.params.id), u]);
      if (!cur.rows[0]) return res.status(404).json({ message: "Not found" });
      const c = cur.rows[0];
      const { rows } = await pool.query(
        `UPDATE whop_platform_checkouts SET title=$3, description=$4, amount_cents=$5, redirect_url=$6, button_color=$7, webinar_funnel_id=$8, active=$9, button_label=$10, updated_at=NOW()
          WHERE id=$1 AND user_id=$2 RETURNING *`,
        [c.id, u, d.title ?? c.title, d.description !== undefined ? d.description || null : c.description,
         d.price !== undefined ? priceToCents(d.price) : c.amount_cents,
         d.redirectUrl !== undefined ? d.redirectUrl || null : c.redirect_url,
         d.buttonColor !== undefined ? d.buttonColor || null : c.button_color,
         d.webinarFunnelId !== undefined ? d.webinarFunnelId || null : c.webinar_funnel_id,
         d.active ?? c.active,
         d.buttonLabel !== undefined ? d.buttonLabel || null : c.button_label]);
      res.json({ checkout: publicCheckout(rows[0], cfg.appUrl) });
    } catch { res.status(500).json({ message: "Could not update the checkout." }); }
  });

  // Presenter control: show or hide this offer in the live room. Owner only; at most one live offer per webinar.
  app.post("/api/whop-platform/checkouts/:id/push", requireAuth, async (req, res) => {
    const u = uid(req);
    const live = req.body?.live === true;
    try {
      const cur = await pool.query(`SELECT id, webinar_funnel_id FROM whop_platform_checkouts WHERE id = $1 AND user_id = $2`, [p(req.params.id), u]);
      const c = cur.rows[0];
      if (!c) return res.status(404).json({ message: "Not found" });
      if (live && !c.webinar_funnel_id) return res.status(400).json({ message: "Attach this offer to a webinar first." });
      if (live) await pool.query(`UPDATE whop_platform_checkouts SET offer_live = FALSE WHERE user_id = $1 AND webinar_funnel_id = $2 AND id <> $3`, [u, c.webinar_funnel_id, c.id]);
      const { rows } = await pool.query(`UPDATE whop_platform_checkouts SET offer_live = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`, [c.id, u, live]);
      res.json({ checkout: publicCheckout(rows[0], cfg.appUrl) });
    } catch { res.status(500).json({ message: "Could not update the offer." }); }
  });

  app.delete("/api/whop-platform/checkouts/:id", requireAuth, async (req, res) => {
    try {
      // Soft delete: past payments keep their record.
      const r = await pool.query(`UPDATE whop_platform_checkouts SET active = FALSE, updated_at = NOW() WHERE id = $1 AND user_id = $2`, [p(req.params.id), uid(req)]);
      if (!r.rowCount) return res.status(404).json({ message: "Not found" });
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Could not remove the checkout." }); }
  });

  // Public pay link: price, fee and seller come from OUR row; the browser sends nothing that matters.
  app.get("/pay/:code", async (req, res) => {
    const code = p(req.params.code).toLowerCase();
    if (!/^[a-z0-9]{4,16}$/.test(code)) return res.status(404).send("Not found");
    if (limited(`pay|${req.ip}`, 30, 60_000)) return res.status(429).send("Too many requests. Try again in a minute.");
    if (!cfg.enabled || !cfg.apiKey) return res.status(503).send("Payments are not switched on yet.");
    try {
      const { rows } = await pool.query(
        `SELECT c.*, a.whop_account_id FROM whop_platform_checkouts c
           JOIN whop_platform_accounts a ON a.user_id = c.user_id AND a.environment = $2
          WHERE c.code = $1 AND c.active = TRUE`, [code, cfg.environment]);
      const c = rows[0];
      if (!c) return res.status(404).send("This payment link is not available.");
      const fee = computeFeeCents(c.amount_cents);
      const reg = /^[A-Za-z0-9-]{8,64}$/.test(p(req.query.r)) ? p(req.query.r) : "";
      const metadata: Record<string, string> = { oravini_checkout_id: c.id };
      if (reg) metadata.oravini_registration_id = reg;
      const out: any = await client.createCheckout({
        accountId: c.whop_account_id, amountCents: c.amount_cents, feeCents: fee, title: c.title, description: c.description,
        redirectUrl: c.redirect_url, buttonColor: c.button_color, metadata, idem: `${c.id}:${randomBytes(8).toString("hex")}`,
      });
      const url = out?.purchase_url;
      if (typeof url !== "string" || !WHOP_HOST_RE.test(url)) return res.status(502).send("Checkout unavailable. Try again shortly.");
      res.setHeader("Cache-Control", "no-store");
      res.redirect(302, url);
    } catch (e: any) {
      res.status(502).send(e?.code === "rejected" ? "The seller has not finished setting up payments yet." : "Checkout unavailable. Try again shortly.");
    }
  });

  // Public: offer banner for the webinar live room (what to show, never the account id)
  app.get("/api/public/webinars/:slug/pay-offer", async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT c.code, c.title, c.description, c.amount_cents, c.currency, c.button_color, c.button_label
           FROM whop_platform_checkouts c JOIN webinar_funnels f ON f.id = c.webinar_funnel_id
           JOIN whop_platform_accounts a ON a.user_id = c.user_id AND a.environment = $2
          WHERE f.slug = $1 AND f.status IN ('published','ended') AND c.active = TRUE AND c.offer_live = TRUE
          ORDER BY c.updated_at DESC LIMIT 1`, [p(req.params.slug).toLowerCase(), cfg.environment]);
      if (!cfg.enabled || !rows[0]) return res.json({ offer: null });
      const c = rows[0];
      res.setHeader("Cache-Control", "no-store");
      res.json({ offer: { code: c.code, title: c.title, description: c.description, price: fmtUsd(c.amount_cents), buttonColor: c.button_color, buttonLabel: c.button_label || DEFAULT_BUTTON_LABEL } });
    } catch { res.json({ offer: null }); }
  });

  // Webhook: signature first, then replay check, then re-read from Whop.
  app.post("/api/whop-platform/webhook", async (req, res) => {
    const check = verifyWhopWebhook(cfg.webhookSecret, req.headers as any, (req as any).rawBody);
    if (!check.ok) return res.status(401).json({ message: "Invalid signature" });
    try {
      const event: any = req.body;
      const type = String(event?.type || "");
      const ins = await pool.query(`INSERT INTO whop_platform_events (webhook_id, type) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [check.id, type.slice(0, 64)]);
      if (!ins.rowCount) return res.json({ ok: true, duplicate: true });
      const data = event?.data ?? {};
      if (type === "payment.succeeded" || type === "payment.failed" || type === "payment.pending") {
        if (typeof data.id === "string") await syncPayment(client, data.id);
      } else if (type === "refund.created" || type === "refund.updated") {
        const pid = data?.payment?.id ?? data?.payment_id;
        if (typeof pid === "string") await syncPayment(client, pid);
      }
      res.json({ ok: true });
    } catch (e) {
      // Release the replay lock so Whop's retry can run again.
      try { await pool.query(`DELETE FROM whop_platform_events WHERE webhook_id = $1`, [check.id]); } catch {}
      res.status(500).json({ message: "Retry later" });
    }
  });

  app.use("/api/whop-platform", (_err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (!res.headersSent) res.status(400).json({ message: "Invalid request" });
  });
}
