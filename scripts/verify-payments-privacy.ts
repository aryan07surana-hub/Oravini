/**
 * Privacy / encryption verification for the payments feature.
 *
 *   DATABASE_URL=postgres://... SESSION_SECRET=... npx tsx scripts/verify-payments-privacy.ts
 *
 * Safe to point at a shared database: everything runs inside a throwaway schema
 * (payments_verify_<random>) that is dropped at the end. Stripe and Whop are stubbed
 * at the fetch layer with fake keys, so no real processor account or money is touched.
 *
 * Mounts the real registerPaymentRoutes() behind a real express-session + passport
 * login, then checks that user B can never read or delete user A's data, that keys are
 * stored as ciphertext and never returned or logged, and that disconnect deletes rows.
 */
import { randomBytes } from "crypto";

const schema = `payments_verify_${randomBytes(4).toString("hex")}`;
const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) throw new Error("DATABASE_URL is required");
const u = new URL(baseUrl);
u.searchParams.set("options", `-c search_path=${schema},public`);
process.env.DATABASE_URL = u.toString();
if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = randomBytes(32).toString("hex");

// ── Fake processor keys + stubbed upstream APIs ─────────────────────────────
const KEY_A = "rk_test_AAAAaaaa1111SecretUserA" + randomBytes(8).toString("hex") + "zA9q";
const KEY_B_REVOKED = "rk_test_BBBBbbbb2222Revoked" + randomBytes(8).toString("hex") + "rv01";
const KEY_NOPERM = "rk_test_CCCCcccc3333NoCharges" + randomBytes(8).toString("hex") + "np02";
const WHOP_KEY_A = "whop_" + randomBytes(20).toString("hex") + "Wh4A";
const WHOP_CO_A = "biz_TestCompanyA1";
const A_CHARGE_AMOUNT = 4242_17; // cents: 4242.17, a distinctive figure to grep logs for
const upstreamCalls: string[] = [];

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input.url;
  if (!/^https:\/\/api\.(stripe|whop)\.com\//.test(url)) return realFetch(input, init);
  upstreamCalls.push(url.replace(/\?.*$/, ""));
  const auth = (init?.headers?.Authorization || "") as string;
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const now = Math.floor(Date.now() / 1000);
  if (url.startsWith("https://api.stripe.com/")) {
    if (auth === `Bearer ${KEY_A}`) {
      if (url.includes("/v1/balance")) return json(200, { available: [{ amount: 100000, currency: "usd" }], pending: [{ amount: 2500, currency: "usd" }] });
      if (url.includes("/v1/charges")) return json(200, { has_more: false, data: [
        { id: "ch_A1", amount: A_CHARGE_AMOUNT, amount_refunded: 0, currency: "usd", status: "succeeded", captured: true, created: now - 3600 },
        { id: "ch_A2", amount: 5000, amount_refunded: 0, currency: "usd", status: "failed", captured: false, created: now - 7200 },
      ] });
    }
    if (auth === `Bearer ${KEY_NOPERM}`) {
      if (url.includes("/v1/balance")) return json(200, { available: [], pending: [] });
      return json(403, { error: { message: `The provided key 'rk_test_***${KEY_NOPERM.slice(-4)}' does not have the required permissions` } });
    }
    return json(401, { error: { message: `Invalid API Key provided: ${auth.slice(7, 15)}****` } });
  }
  if (auth !== `Bearer ${WHOP_KEY_A}`) return json(401, { error: "unauthorized" });
  if (url.includes("/stats/time_series/net_revenue")) {
    const day = 86400;
    const start = Math.floor(Date.now() / 1000 / day) * day;
    return json(200, { data: { currency: "usd", points: [{ timestamp: start, value: 99.5 }, { timestamp: start - day, value: 10 }] } });
  }
  if (url.includes("/payments")) return json(200, { data: [{ id: "pay_A1", total: 99.5, currency: "usd", status: "paid", substatus: "succeeded", created_at: new Date().toISOString() }], page_info: {} });
  return json(404, {});
}) as typeof fetch;

// ── Capture everything the server prints ────────────────────────────────────
const logged: string[] = [];
for (const level of ["log", "info", "warn", "error", "debug"] as const) {
  const orig = console[level].bind(console);
  (console as any)[level] = (...args: any[]) => {
    logged.push(args.map((a) => (typeof a === "string" ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })())).join(" "));
    if (process.env.VERBOSE) orig(...args);
  };
}
const out = (s: string) => process.stdout.write(s + "\n");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  out(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function main() {
  const express = (await import("express")).default;
  const session = (await import("express-session")).default;
  const passport = (await import("passport")).default;
  const { pool } = await import("../server/storage");
  const vault = await import("../server/paymentsVault");
  const { registerPaymentRoutes } = await import("../server/paymentsRoutes");

  await pool.query(`CREATE SCHEMA ${schema}`);
  await pool.query(`CREATE TABLE ${schema}.users (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), username TEXT)`);
  const A = (await pool.query(`INSERT INTO ${schema}.users (username) VALUES ('user-a') RETURNING id`)).rows[0].id as string;
  const B = (await pool.query(`INSERT INTO ${schema}.users (username) VALUES ('user-b') RETURNING id`)).rows[0].id as string;

  const app = express();
  app.use(express.json());
  app.use(session({ secret: process.env.SESSION_SECRET!, resave: false, saveUninitialized: false }));
  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser((id: string, done) => done(null, { id }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.post("/__test/login/:id", (req, res, next) => req.login({ id: req.params.id } as any, (err) => (err ? next(err) : res.json({ ok: true }))));
  await registerPaymentRoutes(app);
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;

  async function login(id: string) {
    const r = await realFetch(`${base}/__test/login/${id}`, { method: "POST" });
    return (r.headers.get("set-cookie") || "").split(";")[0];
  }
  async function call(method: string, path: string, cookie?: string, body?: unknown, rawBody?: string) {
    const r = await realFetch(base + path, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined || rawBody ? { "content-type": "application/json" } : {}) },
      body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const text = await r.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: r.status, json, text, headers: r.headers };
  }
  const rowsFor = async (id: string) => (await pool.query(`SELECT * FROM payment_connections WHERE user_id = $1`, [id])).rows;
  const responses: string[] = [];

  out(`\n# 1. No session → 401 on every route`);
  for (const [m, p] of [["GET", "/api/payments/connections"], ["GET", "/api/payments/revenue"], ["POST", "/api/payments/stripe/connect"], ["POST", "/api/payments/whop/connect"], ["DELETE", "/api/payments/stripe"]] as const) {
    const r = await call(m, p, undefined, m === "POST" ? { key: KEY_A } : undefined);
    check(`${m} ${p} without session`, r.status === 401, `status ${r.status}`);
  }

  const cookieA = await login(A);
  const cookieB = await login(B);

  out(`\n# 2. Validation (bad keys never stored)`);
  let r = await call("POST", "/api/payments/stripe/connect", cookieA, { key: "sk_test_" + "x".repeat(30) });
  check("secret key (sk_) rejected", r.status === 400 && /restricted key/.test(r.json?.message), r.json?.message);
  r = await call("POST", "/api/payments/stripe/connect", cookieA, { key: "hello" });
  check("malformed key rejected", r.status === 400, r.json?.message);
  r = await call("POST", "/api/payments/stripe/connect", cookieA, { key: KEY_B_REVOKED });
  check("key Stripe rejects (balance.retrieve 401) → clear 400", r.status === 400 && /Stripe rejected this key/.test(r.json?.message), r.json?.message);
  check("upstream error text (key fragment) not forwarded", !r.text.includes(KEY_B_REVOKED.slice(0, 12)));
  r = await call("POST", "/api/payments/stripe/connect", cookieA, { key: KEY_NOPERM });
  check("key without Charges read → clear 400", r.status === 400 && /missing read access/.test(r.json?.message), r.json?.message);
  check("nothing stored after failed attempts", (await rowsFor(A)).length === 0);

  out(`\n# 3. User A connects Stripe + Whop`);
  r = await call("POST", "/api/payments/stripe/connect", cookieA, { key: KEY_A });
  responses.push(r.text);
  check("A connects Stripe", r.status === 200 && r.json?.connection?.last4 === KEY_A.slice(-4), r.text);
  check("response carries last 4 only, never the key", !r.text.includes(KEY_A) && !r.text.includes(KEY_A.slice(0, -4)));
  r = await call("POST", "/api/payments/whop/connect", cookieA, { key: WHOP_KEY_A, companyId: WHOP_CO_A });
  responses.push(r.text);
  check("A connects Whop", r.status === 200 && r.json?.connection?.last4 === WHOP_KEY_A.slice(-4), r.text);
  r = await call("GET", "/api/payments/connections", cookieA);
  responses.push(r.text);
  check("A sees 2 connections", r.json?.connections?.length === 2);
  check("connections response has no key / ciphertext", !r.text.includes(KEY_A) && !r.text.includes(WHOP_KEY_A) && !r.text.includes("pv1:"));
  check("Cache-Control: no-store", (r.headers.get("cache-control") || "").includes("no-store"));

  r = await call("GET", "/api/payments/revenue", cookieA);
  responses.push(r.text);
  check("A sees own revenue", r.status === 200 && Math.abs(r.json?.processors?.stripe?.total30d - 4242.17) < 0.001 && r.json?.processors?.whop?.thisMonth > 0, `stripe30d=${r.json?.processors?.stripe?.total30d}`);
  check("combined total = stripe + whop (same currency)", Math.abs(r.json?.combined?.total30d - (4242.17 + 109.5)) < 0.01, `combined=${r.json?.combined?.total30d}`);
  check("revenue response has no key material", !r.text.includes(KEY_A) && !r.text.includes(WHOP_KEY_A));
  const callsBefore = upstreamCalls.length;
  await call("GET", "/api/payments/revenue", cookieA);
  check("second load within 5 min served from cache (no upstream calls)", upstreamCalls.length === callsBefore);

  out(`\n# 4. Encryption at rest`);
  const rowsA = await rowsFor(A);
  const stripeRow = rowsA.find((x) => x.provider === "stripe");
  const whopRow = rowsA.find((x) => x.provider === "whop");
  out(`      stored stripe value: ${stripeRow.secret_ciphertext.slice(0, 40)}…  (len ${stripeRow.secret_ciphertext.length})`);
  check("stored value is ciphertext (pv1: prefix)", stripeRow.secret_ciphertext.startsWith("pv1:") && whopRow.secret_ciphertext.startsWith("pv1:"));
  const fullRow = JSON.stringify(rowsA);
  check("no column contains the plaintext key or a long substring", !fullRow.includes(KEY_A) && !fullRow.includes(KEY_A.slice(8, 24)) && !fullRow.includes(WHOP_KEY_A.slice(5, 25)));
  check("decrypt round-trip returns the key", vault.decryptCredential(stripeRow.secret_ciphertext, A, "stripe") === KEY_A);
  check("same key encrypts differently each time (random IV)", vault.encryptCredential(KEY_A, A, "stripe") !== vault.encryptCredential(KEY_A, A, "stripe"));
  let boundFail = false;
  try { vault.decryptCredential(stripeRow.secret_ciphertext, B, "stripe"); } catch { boundFail = true; }
  check("A's ciphertext cannot be decrypted as user B (AAD binding)", boundFail);
  let tamperFail = false;
  const tampered = stripeRow.secret_ciphertext.slice(0, -4) + (stripeRow.secret_ciphertext.slice(-4) === "AAAA" ? "BBBB" : "AAAA");
  try { vault.decryptCredential(tampered, A, "stripe"); } catch { tamperFail = true; }
  check("tampered ciphertext is rejected (GCM tag)", tamperFail);
  const savedEnv = { k: process.env.PAYMENTS_VAULT_KEY, s: process.env.SESSION_SECRET };
  delete process.env.PAYMENTS_VAULT_KEY; delete process.env.SESSION_SECRET;
  let noKeyThrows = false;
  try { vault.encryptCredential("rk_test_x", A, "stripe"); } catch (e) { noKeyThrows = e instanceof vault.VaultNotConfiguredError; }
  check("no key configured → encrypt refuses (no plaintext fallback)", noKeyThrows);
  r = await call("POST", "/api/payments/stripe/connect", cookieB, { key: KEY_A });
  check("…and connect returns 503 instead of storing", r.status === 503, `status ${r.status}`);
  if (savedEnv.k) process.env.PAYMENTS_VAULT_KEY = savedEnv.k;
  process.env.SESSION_SECRET = savedEnv.s;

  out(`\n# 5. User B cannot reach A's data, even when naming A's id`);
  r = await call("GET", `/api/payments/connections?userId=${A}&user_id=${A}`, cookieB);
  check("B GET connections (with ?userId=A) → empty", r.status === 200 && r.json?.connections?.length === 0, r.text);
  r = await call("GET", `/api/payments/revenue?userId=${A}`, cookieB);
  check("B GET revenue (with ?userId=A) → empty, no A figures", r.status === 200 && r.json?.connections?.length === 0 && !r.text.includes("4242"), r.text);
  r = await call("DELETE", `/api/payments/stripe?userId=${A}`, cookieB, { userId: A });
  check("B DELETE stripe (naming A) → 404", r.status === 404, `status ${r.status}`);
  check("A's rows untouched after B's delete attempt", (await rowsFor(A)).length === 2);
  r = await call("POST", "/api/payments/stripe/connect", cookieB, { key: KEY_B_REVOKED, userId: A });
  check("B connect with body.userId=A cannot write to A", (await rowsFor(A)).find((x) => x.provider === "stripe")?.key_last4 === KEY_A.slice(-4));
  r = await call("DELETE", `/api/payments/${A}`, cookieB);
  check("unknown provider path → 404", r.status === 404);
  // Even a ciphertext copied from A's row into B's row is useless to B.
  await pool.query(`INSERT INTO payment_connections (user_id, provider, secret_ciphertext, key_last4) VALUES ($1, 'stripe', $2, 'xxxx')`, [B, stripeRow.secret_ciphertext]);
  r = await call("GET", "/api/payments/revenue", cookieB);
  check("A's ciphertext planted on B's row yields an error, not A's revenue", r.json?.processors?.stripe?.error && !r.text.includes("4242"), r.json?.processors?.stripe?.error);
  await pool.query(`DELETE FROM payment_connections WHERE user_id = $1`, [B]);

  out(`\n# 6. Malformed JSON carrying a key is not echoed or logged`);
  r = await call("POST", "/api/payments/stripe/connect", cookieA, undefined, `{"key":"${KEY_A}"`);
  check("malformed body → 400 generic", r.status === 400 && !r.text.includes(KEY_A), `status ${r.status} ${r.text}`);

  out(`\n# 7. Disconnect deletes immediately`);
  r = await call("DELETE", "/api/payments/stripe", cookieA);
  check("A disconnects Stripe → 200", r.status === 200);
  check("Stripe row gone from DB immediately", (await rowsFor(A)).filter((x) => x.provider === "stripe").length === 0);
  r = await call("GET", "/api/payments/revenue", cookieA);
  check("revenue no longer shows Stripe (cache dropped)", !r.json?.processors?.stripe && !r.text.includes("4242"));
  r = await call("DELETE", "/api/payments/whop", cookieA);
  check("A disconnects Whop → no rows left", r.status === 200 && (await rowsFor(A)).length === 0);
  r = await call("DELETE", "/api/payments/whop", cookieA);
  check("disconnect again → 404", r.status === 404);

  out(`\n# 8. Nothing sensitive was logged or sent anywhere but the processor`);
  const allLogs = logged.join("\n");
  const secrets = [KEY_A, KEY_B_REVOKED, KEY_NOPERM, WHOP_KEY_A, KEY_A.slice(0, 16), WHOP_KEY_A.slice(0, 16), "pv1:", "4242.17", "424217"];
  const leaks = secrets.filter((s) => allLogs.includes(s));
  check(`server console output (${logged.length} lines) contains no keys, ciphertext or revenue`, leaks.length === 0, leaks.length ? `leaked: ${leaks.length}` : "");
  check("only api.stripe.com / api.whop.com were called upstream", upstreamCalls.every((c) => /^https:\/\/api\.(stripe|whop)\.com\//.test(c)), [...new Set(upstreamCalls)].join(", "));

  server.close();
  await pool.query(`DROP SCHEMA ${schema} CASCADE`);
  await pool.end();
  out(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  process.stdout.write(`ERROR ${e?.message}\n`);
  try { const { pool } = await import("../server/storage"); await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); } catch { /* ignore */ }
  process.exit(1);
});
