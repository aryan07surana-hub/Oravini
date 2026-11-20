// Payment processor connections + per-user revenue dashboard.
//
// Privacy rules enforced here (owner requirement):
//  - Every query is scoped by the authenticated session's user id. No route takes
//    a user id, connection id or account id from the client, so there is nothing
//    to point at another user's data.
//  - Credentials are encrypted with the payments vault (AES-256-GCM, bound to the
//    user + provider) and never leave the server. Responses carry the last 4
//    characters only.
//  - Nothing in this file logs keys, ciphertext, revenue figures or upstream
//    response bodies. Upstream error messages are never forwarded (Stripe echoes
//    part of the key in some of them); clients get fixed messages instead.
//  - Request/response bodies under /api/payments are excluded from the request
//    logger in server/index.ts.
//  - No admin route reads these tables.
//  - Disconnect deletes the credential row immediately and drops the cache.

import type { Express, NextFunction, Request, Response } from "express";
import { pool } from "./storage";
import { decryptCredential, encryptCredential, isVaultConfigured, last4, VaultNotConfiguredError } from "./paymentsVault";

export type Provider = "stripe" | "whop";
const PROVIDERS: Provider[] = ["stripe", "whop"];

const STRIPE_API = "https://api.stripe.com/v1";
const WHOP_API = "https://api.whop.com/api/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 12_000;
const DAY_MS = 24 * 60 * 60 * 1000;

// ── Tables (additive) ────────────────────────────────────────────────────────

export async function ensurePaymentTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_connections (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(16) NOT NULL,
      secret_ciphertext TEXT NOT NULL,
      key_last4 VARCHAR(4) NOT NULL,
      mode VARCHAR(8),
      account_ref VARCHAR(64),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT payment_connections_provider_chk CHECK (provider IN ('stripe', 'whop')),
      CONSTRAINT payment_connections_user_provider_uq UNIQUE (user_id, provider)
    )
  `);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !(req.user as any)?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

/** The only source of a user id in this module. */
function sessionUserId(req: Request): string {
  return String((req.user as any).id);
}

class UpstreamError extends Error {
  constructor(public status: number, public code: "auth" | "permission" | "unavailable") {
    super(code);
  }
}

async function upstreamGet(url: string, bearer: string): Promise<any> {
  let res: globalThis.Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new UpstreamError(0, "unavailable");
  }
  if (res.status === 401) throw new UpstreamError(401, "auth");
  if (res.status === 403) throw new UpstreamError(403, "permission");
  if (!res.ok) throw new UpstreamError(res.status, "unavailable");
  try {
    return await res.json();
  } catch {
    throw new UpstreamError(res.status, "unavailable");
  }
}

// Per-user cache of processor data (in memory only; never persisted or logged).
const dataCache = new Map<string, { at: number; data: ProcessorData }>();
function cacheKey(userId: string, provider: Provider) {
  return `${userId}:${provider}`;
}
function dropCache(userId: string, provider?: Provider) {
  for (const p of provider ? [provider] : PROVIDERS) dataCache.delete(cacheKey(userId, p));
}

// Connect attempts per user (stops the endpoint being used as a key-checking oracle).
const connectAttempts = new Map<string, number[]>();
function connectRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (connectAttempts.get(userId) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  connectAttempts.set(userId, recent);
  return recent.length > 10;
}

const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
function fromMinor(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? amount : amount / 100;
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Start (UTC midnight) of the 30-day window the dashboard shows: today and the 29 days before it. */
function window30Start(): number {
  return Date.parse(`${dayKey(Date.now() - 29 * DAY_MS)}T00:00:00Z`);
}

function monthBounds(now = new Date()) {
  const thisMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const lastMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  return { thisMonthStart, lastMonthStart };
}

// ── Normalised processor data ────────────────────────────────────────────────

export interface RevenueItem {
  id: string;
  amount: number; // major units
  currency: string;
  date: string; // ISO
  status: string;
  source: Provider;
}

export interface ProcessorData {
  provider: Provider;
  currency: string; // currency the summary is expressed in
  total30d: number;
  thisMonth: number;
  lastMonth: number;
  daily: Record<string, number>; // YYYY-MM-DD -> amount (summary currency)
  recent: RevenueItem[];
  balance?: { available: number; pending: number; currency: string } | null;
  otherCurrencies?: string[];
  notes?: string[];
}

// ── Stripe ───────────────────────────────────────────────────────────────────

const STRIPE_KEY_RE = /^rk_(live|test)_[A-Za-z0-9]{16,}$/;

async function validateStripeKey(key: string): Promise<{ mode: "live" | "test" }> {
  await upstreamGet(`${STRIPE_API}/balance`, key); // balance.retrieve
  try {
    await upstreamGet(`${STRIPE_API}/charges?limit=1`, key);
  } catch (e) {
    if (e instanceof UpstreamError && e.code === "permission") throw new UpstreamError(403, "permission");
    throw e;
  }
  return { mode: key.startsWith("rk_live_") ? "live" : "test" };
}

async function fetchStripe(key: string): Promise<ProcessorData> {
  const { lastMonthStart } = monthBounds();
  const since = Math.min(lastMonthStart, window30Start());
  const sinceSec = Math.floor(since / 1000);

  const charges: any[] = [];
  let startingAfter: string | null = null;
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ limit: "100", "created[gte]": String(sinceSec) });
    if (startingAfter) params.set("starting_after", startingAfter);
    const body = await upstreamGet(`${STRIPE_API}/charges?${params}`, key);
    const data: any[] = Array.isArray(body?.data) ? body.data : [];
    charges.push(...data);
    if (!body?.has_more || data.length === 0) break;
    startingAfter = data[data.length - 1].id;
  }

  const balanceBody = await upstreamGet(`${STRIPE_API}/balance`, key);

  // Pick the currency with the most succeeded volume as the summary currency.
  const volumeByCurrency = new Map<string, number>();
  for (const c of charges) {
    if (c?.status === "succeeded" && typeof c.currency === "string") {
      volumeByCurrency.set(c.currency, (volumeByCurrency.get(c.currency) || 0) + (c.amount || 0));
    }
  }
  const balanceCurrency: string | undefined = balanceBody?.available?.[0]?.currency;
  const currency = [...volumeByCurrency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || balanceCurrency || "usd";

  const { thisMonthStart, lastMonthStart: lms } = monthBounds();
  const cutoff30 = window30Start();
  const daily: Record<string, number> = {};
  let total30d = 0, thisMonth = 0, lastMonth = 0;
  for (const c of charges) {
    if (c?.status !== "succeeded" || c.currency !== currency || c.captured === false) continue;
    const net = fromMinor((c.amount || 0) - (c.amount_refunded || 0), currency);
    const ms = (c.created || 0) * 1000;
    if (ms >= cutoff30) {
      total30d += net;
      daily[dayKey(ms)] = (daily[dayKey(ms)] || 0) + net;
    }
    if (ms >= thisMonthStart) thisMonth += net;
    else if (ms >= lms) lastMonth += net;
  }

  const sumBalance = (arr: any[]) =>
    (Array.isArray(arr) ? arr : []).filter((b) => b?.currency === currency).reduce((s, b) => s + fromMinor(b.amount || 0, currency), 0);

  const recent: RevenueItem[] = charges.slice(0, 25).map((c) => ({
    id: String(c.id),
    amount: fromMinor(c.amount || 0, c.currency || currency),
    currency: String(c.currency || currency),
    date: new Date((c.created || 0) * 1000).toISOString(),
    status: c.refunded ? "refunded" : c.amount_refunded > 0 ? "partially_refunded" : String(c.status || "unknown"),
    source: "stripe",
  }));

  const notes: string[] = [];
  if (charges.length >= 500) notes.push("Showing the most recent 500 charges.");

  return {
    provider: "stripe",
    currency,
    total30d,
    thisMonth,
    lastMonth,
    daily,
    recent,
    balance: { available: sumBalance(balanceBody?.available), pending: sumBalance(balanceBody?.pending), currency },
    otherCurrencies: [...volumeByCurrency.keys()].filter((c) => c !== currency),
    notes,
  };
}

// ── Whop (company API key; Stats API + Payments API, api.whop.com/api/v1) ────

const WHOP_COMPANY_RE = /^biz_[A-Za-z0-9]{4,40}$/;
const WHOP_KEY_RE = /^[A-Za-z0-9_\-.]{20,300}$/;

function whopSeriesUrl(companyId: string, fromIso: string, toIso: string) {
  const params = new URLSearchParams({ account_id: companyId, from: fromIso, to: toIso, interval: "day", convert_to: "usd" });
  return `${WHOP_API}/stats/time_series/net_revenue?${params}`;
}

async function validateWhopKey(key: string, companyId: string): Promise<void> {
  const today = dayKey(Date.now());
  await upstreamGet(whopSeriesUrl(companyId, today, today), key);
}

async function fetchWhop(key: string, companyId: string): Promise<ProcessorData> {
  const { thisMonthStart, lastMonthStart } = monthBounds();
  const since = Math.min(lastMonthStart, window30Start());
  const series = await upstreamGet(whopSeriesUrl(companyId, dayKey(since), dayKey(Date.now())), key);
  const points: any[] = Array.isArray(series?.data?.points) ? series.data.points : [];
  const currency = String(series?.data?.currency || "usd").toLowerCase();

  const cutoff30 = window30Start();
  const daily: Record<string, number> = {};
  let total30d = 0, thisMonth = 0, lastMonth = 0;
  for (const p of points) {
    const ms = Number(p?.timestamp) * 1000;
    const v = typeof p?.value === "number" ? p.value : 0; // currency metrics are decimal amounts
    if (!Number.isFinite(ms)) continue;
    if (ms >= cutoff30) {
      total30d += v;
      daily[dayKey(ms)] = (daily[dayKey(ms)] || 0) + v;
    }
    if (ms >= thisMonthStart) thisMonth += v;
    else if (ms >= lastMonthStart) lastMonth += v;
  }

  const notes: string[] = [];
  let recent: RevenueItem[] = [];
  try {
    const params = new URLSearchParams({ account_id: companyId, first: "25" });
    const body = await upstreamGet(`${WHOP_API}/payments?${params}`, key);
    const data: any[] = Array.isArray(body?.data) ? body.data : [];
    recent = data.map((p) => ({
      id: String(p.id),
      amount: typeof p.total === "number" ? p.total : typeof p.usd_total === "number" ? p.usd_total : 0,
      currency: String(p.currency || "usd").toLowerCase(),
      date: String(p.paid_at || p.created_at || new Date(0).toISOString()),
      status: String(p.substatus || p.status || "unknown"),
      source: "whop" as const,
    }));
  } catch (e) {
    if (e instanceof UpstreamError && (e.code === "permission" || e.code === "auth")) {
      notes.push("Add the payment:basic:read permission to your Whop API key to see individual payments.");
    } else {
      notes.push("Whop payments are temporarily unavailable.");
    }
  }

  return { provider: "whop", currency, total30d, thisMonth, lastMonth, daily, recent, balance: null, notes };
}

// ── Data access (always scoped by the session user id) ──────────────────────

interface ConnectionRow {
  provider: Provider;
  secret_ciphertext: string;
  key_last4: string;
  mode: string | null;
  account_ref: string | null;
  created_at: Date;
}

async function getConnections(userId: string): Promise<ConnectionRow[]> {
  const r = await pool.query(
    `SELECT provider, secret_ciphertext, key_last4, mode, account_ref, created_at
       FROM payment_connections WHERE user_id = $1 ORDER BY provider`,
    [userId],
  );
  return r.rows;
}

function publicConnection(row: ConnectionRow) {
  return {
    provider: row.provider,
    last4: row.key_last4,
    mode: row.mode,
    accountRef: row.provider === "whop" ? row.account_ref : null,
    connectedAt: row.created_at,
  };
}

async function saveConnection(userId: string, provider: Provider, secret: string, mode: string | null, accountRef: string | null) {
  const ciphertext = encryptCredential(secret, userId, provider);
  await pool.query(
    `INSERT INTO payment_connections (user_id, provider, secret_ciphertext, key_last4, mode, account_ref)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, provider) DO UPDATE
       SET secret_ciphertext = EXCLUDED.secret_ciphertext, key_last4 = EXCLUDED.key_last4,
           mode = EXCLUDED.mode, account_ref = EXCLUDED.account_ref, updated_at = NOW()`,
    [userId, provider, ciphertext, last4(secret), mode, accountRef],
  );
}

async function loadProcessorData(userId: string, row: ConnectionRow): Promise<ProcessorData> {
  const k = cacheKey(userId, row.provider);
  const hit = dataCache.get(k);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const secret = decryptCredential(row.secret_ciphertext, userId, row.provider);
  const data = row.provider === "stripe" ? await fetchStripe(secret) : await fetchWhop(secret, row.account_ref || "");
  dataCache.set(k, { at: Date.now(), data });
  return data;
}

function processorErrorMessage(provider: Provider, e: unknown): string {
  const name = provider === "stripe" ? "Stripe" : "Whop";
  if (e instanceof UpstreamError) {
    if (e.code === "auth") return `${name} rejected the saved key. It may have been revoked. Disconnect and connect a new key.`;
    if (e.code === "permission") return `The saved ${name} key is missing a required read permission.`;
    return `${name} is not responding right now. Try again in a few minutes.`;
  }
  return `Could not load ${name} data.`;
}

function noStore(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
  next();
}

// ── Routes ───────────────────────────────────────────────────────────────────

export async function registerPaymentRoutes(app: Express): Promise<void> {
  try {
    await ensurePaymentTables();
  } catch {
    console.warn("[payments] could not ensure payment_connections table");
  }

  app.use("/api/payments", noStore);

  app.get("/api/payments/connections", requireAuth, async (req, res) => {
    try {
      const rows = await getConnections(sessionUserId(req));
      res.json({ connections: rows.map(publicConnection), vaultReady: isVaultConfigured() });
    } catch {
      res.status(500).json({ message: "Could not load payment connections." });
    }
  });

  app.post("/api/payments/stripe/connect", requireAuth, async (req, res) => {
    const userId = sessionUserId(req);
    const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";
    if (connectRateLimited(userId)) return res.status(429).json({ message: "Too many attempts. Wait a few minutes and try again." });
    if (/^sk_(live|test)_/.test(key)) {
      return res.status(400).json({ message: "That is a secret key. Create a restricted key (it starts with rk_) with read access to Charges, Balance and Payouts." });
    }
    if (!STRIPE_KEY_RE.test(key)) {
      return res.status(400).json({ message: "Paste a Stripe restricted key. It starts with rk_live_ or rk_test_." });
    }
    if (!isVaultConfigured()) return res.status(503).json({ message: "Payment connections are not available yet. Please contact support." });
    try {
      const { mode } = await validateStripeKey(key);
      await saveConnection(userId, "stripe", key, mode, null);
      dropCache(userId, "stripe");
      res.json({ connection: { provider: "stripe", last4: last4(key), mode, accountRef: null } });
    } catch (e) {
      if (e instanceof UpstreamError && e.code === "auth") return res.status(400).json({ message: "Stripe rejected this key. Check that you copied the whole restricted key and that it has not been deleted." });
      if (e instanceof UpstreamError && e.code === "permission") return res.status(400).json({ message: "This key is missing read access. Give it Read permission on Charges, Balance and Payouts, then try again." });
      if (e instanceof UpstreamError) return res.status(502).json({ message: "Could not reach Stripe to check the key. Try again shortly." });
      if (e instanceof VaultNotConfiguredError) return res.status(503).json({ message: "Payment connections are not available yet. Please contact support." });
      res.status(500).json({ message: "Could not save the Stripe connection." });
    }
  });

  app.post("/api/payments/whop/connect", requireAuth, async (req, res) => {
    const userId = sessionUserId(req);
    const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";
    const companyId = typeof req.body?.companyId === "string" ? req.body.companyId.trim() : "";
    if (connectRateLimited(userId)) return res.status(429).json({ message: "Too many attempts. Wait a few minutes and try again." });
    if (!WHOP_KEY_RE.test(key)) return res.status(400).json({ message: "Paste your Whop API key." });
    if (!WHOP_COMPANY_RE.test(companyId)) return res.status(400).json({ message: "Enter your Whop company ID. It starts with biz_." });
    if (!isVaultConfigured()) return res.status(503).json({ message: "Payment connections are not available yet. Please contact support." });
    try {
      await validateWhopKey(key, companyId);
      await saveConnection(userId, "whop", key, null, companyId);
      dropCache(userId, "whop");
      res.json({ connection: { provider: "whop", last4: last4(key), mode: null, accountRef: companyId } });
    } catch (e) {
      if (e instanceof UpstreamError && e.code === "auth") return res.status(400).json({ message: "Whop rejected this API key. Check that you copied all of it." });
      if (e instanceof UpstreamError && e.code === "permission") return res.status(400).json({ message: "This key cannot read stats for that company. Check the company ID and give the key the stats:read permission." });
      if (e instanceof UpstreamError && (e.status === 400 || e.status === 404 || e.status === 422)) return res.status(400).json({ message: "Whop did not accept that company ID for this key." });
      if (e instanceof UpstreamError) return res.status(502).json({ message: "Could not reach Whop to check the key. Try again shortly." });
      if (e instanceof VaultNotConfiguredError) return res.status(503).json({ message: "Payment connections are not available yet. Please contact support." });
      res.status(500).json({ message: "Could not save the Whop connection." });
    }
  });

  app.delete("/api/payments/:provider", requireAuth, async (req, res) => {
    const provider = req.params.provider as Provider;
    if (!PROVIDERS.includes(provider)) return res.status(404).json({ message: "Not found" });
    const userId = sessionUserId(req);
    try {
      const r = await pool.query(`DELETE FROM payment_connections WHERE user_id = $1 AND provider = $2`, [userId, provider]);
      dropCache(userId, provider);
      if (!r.rowCount) return res.status(404).json({ message: "Not connected" });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Could not disconnect. Try again." });
    }
  });

  app.get("/api/payments/revenue", requireAuth, async (req, res) => {
    const userId = sessionUserId(req);
    try {
      const rows = await getConnections(userId);
      if (rows.length === 0) return res.json({ connections: [], processors: {}, combined: null });

      const processors: Record<string, (ProcessorData & { error?: undefined }) | { provider: Provider; error: string }> = {};
      await Promise.all(
        rows.map(async (row) => {
          try {
            processors[row.provider] = await loadProcessorData(userId, row);
          } catch (e) {
            processors[row.provider] = { provider: row.provider, error: processorErrorMessage(row.provider, e) };
          }
        }),
      );

      const ok = Object.values(processors).filter((p): p is ProcessorData => !("error" in p && p.error));
      // Combine only what shares a currency; the most common summary currency wins.
      const currencyCount = new Map<string, number>();
      ok.forEach((p) => currencyCount.set(p.currency, (currencyCount.get(p.currency) || 0) + 1));
      const currency = [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "usd";
      const same = ok.filter((p) => p.currency === currency);

      const days: string[] = [];
      for (let i = 29; i >= 0; i--) days.push(dayKey(Date.now() - i * DAY_MS));
      const daily = days.map((d) => {
        const point: Record<string, number | string> = { date: d };
        for (const p of ok) point[p.provider] = p.currency === currency ? Math.round((p.daily[d] || 0) * 100) / 100 : 0;
        return point;
      });

      const recent = ok
        .flatMap((p) => p.recent)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 30);

      res.json({
        connections: rows.map(publicConnection),
        processors,
        combined: ok.length
          ? {
              currency,
              total30d: same.reduce((s, p) => s + p.total30d, 0),
              thisMonth: same.reduce((s, p) => s + p.thisMonth, 0),
              lastMonth: same.reduce((s, p) => s + p.lastMonth, 0),
              excluded: ok.filter((p) => p.currency !== currency).map((p) => p.provider),
              daily,
              recent,
            }
          : null,
        cachedForSeconds: CACHE_TTL_MS / 1000,
      });
    } catch {
      res.status(500).json({ message: "Could not load revenue." });
    }
  });

  // Errors raised inside /api/payments (including malformed JSON bodies, whose raw
  // text body-parser attaches to the error) stop here, so the global error handler
  // never prints them.
  app.use("/api/payments", (_err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    res.status(400).json({ message: "Invalid request" });
  });
}
