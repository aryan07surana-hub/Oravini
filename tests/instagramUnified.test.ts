import { createHmac } from "node:crypto";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { authorizationUrl, IG_UNIFIED_APP_ID, metricValue, openToken, readUnifiedConfig, safeInstagramUrl, sealToken, UnifiedGraph, hashValue, verifyUnifiedSignedRequest } from "../server/instagramUnifiedCore";
import { registerInstagramUnifiedRoutes } from "../server/instagramUnifiedRoutes";
const env = { INSTAGRAM_UNIFIED_APP_SECRET: "test-secret-not-a-credential", INSTAGRAM_UNIFIED_CONFIG_ID: "1692089839019107", INSTAGRAM_UNIFIED_CONFIG_APPROVED: "true", TOKEN_ENCRYPTION_KEY: "a".repeat(64) };
const config = () => readUnifiedConfig(env);
describe("new-app configuration and token privacy", () => {
  test("never consumes first app credentials", () => {
    assert.throws(() => readUnifiedConfig({ META_APP_ID: "old", META_APP_SECRET: "old", META_LOGIN_CONFIG_ID: "old", TOKEN_ENCRYPTION_KEY: "a".repeat(64) }), /not_configured/);
    assert.throws(() => readUnifiedConfig({ ...env, INSTAGRAM_UNIFIED_APP_ID: "other" }), /not_configured/);
    assert.throws(() => readUnifiedConfig({ ...env, TOKEN_ENCRYPTION_KEY: "z".repeat(64) }), /not_configured/);
    assert.throws(() => readUnifiedConfig({ ...env, INSTAGRAM_UNIFIED_CONFIG_APPROVED: "false" }), /configuration_pending/);
    assert.throws(() => readUnifiedConfig({ ...env, INSTAGRAM_UNIFIED_REDIRECT_URI: "http://oravini.com/api/instagram/unified/callback" }), /not_configured/);
    assert.throws(() => readUnifiedConfig({ ...env, INSTAGRAM_UNIFIED_REDIRECT_URI: "https://oravini.com/other" }), /not_configured/);
  });
  test("uses the new configuration only, exact callback, random state, no scopes or secrets", () => {
    const url = new URL(authorizationUrl(config(), "state-nonce"));
    assert.equal(url.origin, "https://www.facebook.com");
    assert.equal(url.searchParams.get("client_id"), IG_UNIFIED_APP_ID);
    assert.equal(url.searchParams.get("config_id"), env.INSTAGRAM_UNIFIED_CONFIG_ID);
    assert.equal(url.searchParams.get("redirect_uri"), "https://oravini.com/api/instagram/unified/callback");
    assert.equal(url.searchParams.get("scope"), null);
    assert.equal(url.searchParams.get("state"), "state-nonce");
    assert.ok(!url.href.includes(env.INSTAGRAM_UNIFIED_APP_SECRET));
  });
  test("authenticated encryption is randomized and fails closed on tampering and missing keys", () => {
    const key = env.TOKEN_ENCRYPTION_KEY, token = "synthetic-token-for-test";
    const stored = sealToken(token, key);
    assert.notEqual(stored, token);
    assert.notEqual(stored, sealToken(token, key));
    assert.equal(openToken(stored, key), token);
    assert.throws(() => openToken(stored, "b".repeat(64)), /stored_token_invalid/);
    assert.throws(() => openToken(token, key), /stored_token_invalid/);
    assert.throws(() => sealToken(token, ""), /encryption_unavailable/);
  });
  test("missing and malformed metrics remain null, actual zero stays zero", () => {
    assert.equal(metricValue({ data: [] }, "reach"), null);
    assert.equal(metricValue({ data: [{ name: "reach", values: [{ value: 0 }] }] }, "reach"), 0);
    assert.equal(metricValue({ data: [{ name: "reach", values: [{ value: "0" }] }] }, "reach"), null);
    assert.equal(metricValue({ data: [{ name: "reach", total_value: { value: 20 } }] }, "reach"), 20);
    assert.equal(metricValue({ data: [{ name: "reach", values: [{ value: -1 }] }] }, "reach"), null);
  });
  test("Instagram outbound URLs cannot inject scripts or alternate hosts", () => {
    assert.equal(safeInstagramUrl("javascript:alert(1)"), null);
    assert.equal(safeInstagramUrl("https://instagram.com.attacker.invalid/x"), null);
    assert.equal(safeInstagramUrl("https://evil@instagram.com/x"), null);
    assert.equal(safeInstagramUrl("https://www.instagram.com/reel/test/"), "https://www.instagram.com/reel/test/");
  });
});
describe("Unified Graph contract", () => {
  test("exchanges server-side and discovers assigned assets, not /me as an Instagram account", async () => {
    const calls: { url: URL; options: RequestInit }[] = [];
    const fakeFetch = async (value: any, options: any) => {
      const url = new URL(value); calls.push({ url, options });
      if (url.pathname.endsWith("oauth/access_token")) return Response.json({ access_token: "synthetic-token", expires_in: 5184000 });
      if (url.pathname.endsWith("assigned_instagram_accounts")) return Response.json({ data: [{ id: "9001", username: "sample_creator" }] });
      return Response.json({ id: "8001", client_business_id: "7001" });
    };
    const graph = new UnifiedGraph(config(), fakeFetch as any);
    const grant = await graph.exchange("synthetic-code");
    const result = await graph.discover(grant.token);
    assert.deepEqual(result, { businessId: "7001", subjectId: "8001", accounts: [{ id: "9001", username: "sample_creator" }] });
    assert.ok(grant.expiresAt);
    assert.equal(calls[0].url.searchParams.get("redirect_uri"), config().redirectUri);
    assert.equal(calls[0].url.searchParams.get("client_id"), IG_UNIFIED_APP_ID);
    assert.equal(calls[1].url.searchParams.get("access_token"), null);
    assert.equal((calls[1].options.headers as any).Authorization, "Bearer synthetic-token");
    assert.ok(calls.every(x => x.url.hostname === "graph.facebook.com"));
    assert.ok(calls.every(x => !x.url.pathname.includes("/me/accounts")));
  });
  test("does not invent a 60-day expiry if Meta omits it", async () => {
    const graph = new UnifiedGraph(config(), (async () => Response.json({ access_token: "synthetic" })) as any);
    assert.equal((await graph.exchange("code")).expiresAt, null);
  });
  test("partial insights unavailable does not hide supplied zero or other metrics", async () => {
    const graph = new UnifiedGraph(config(), (async (value: any) => {
      const url = new URL(value);
      if (url.pathname.endsWith("/media")) return Response.json({ data: [{ id: "99", caption: "Test", media_product_type: "REELS", like_count: 0, permalink: "javascript:bad" }] });
      const metric = url.searchParams.get("metric");
      if (metric === "reach") return Response.json({ error: { code: 100, message: "raw private diagnostic" } }, { status: 400 });
      return Response.json({ data: [{ name: metric, values: [{ value: 0 }] }] });
    }) as any);
    const posts = await graph.recentMedia("synthetic", "9001");
    assert.equal(posts[0].metrics.reach, null);
    assert.equal(posts[0].metrics.views, 0);
    assert.equal(posts[0].metrics.comments, null);
    assert.equal(posts[0].permalink, null);
  });
  test("invalid grant fails as reconnect required, without reflecting raw Meta messages", async () => {
    const graph = new UnifiedGraph(config(), (async () => Response.json({ error: { code: 190, message: "DO-NOT-RETURN synthetic-secret" } }, { status: 401 })) as any);
    await assert.rejects(graph.discover("synthetic"), error => (error as any).code === "reconnect_required" && !(error as any).message.includes("DO-NOT-RETURN"));
  });
});
async function harness(options: { authenticated?: boolean; query?: any; fetcher?: any } = {}) {
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => { req.isAuthenticated = () => options.authenticated !== false; req.user = { id: "user-a" }; req.sessionID = "session-a"; next(); });
  const calls: any[] = [];
  const query = async (sql: string, values: any[] = []) => { calls.push({ sql, values }); return options.query ? options.query(sql, values) : { rows: [], rowCount: 0 }; };
  await registerInstagramUnifiedRoutes(app, { query, env, fetcher: options.fetcher });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/instagram/unified`;
  return { base, calls, close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }) };
}
describe("route security and tenant boundaries", () => {
  test("every private endpoint requires auth", async () => {
    const h = await harness({ authenticated: false });
    try { for (const [path, method] of [["status", "GET"], ["media", "GET"], ["connect", "POST"], ["account", "POST"], ["sync", "POST"], ["remove", "POST"]]) assert.equal((await fetch(`${h.base}/${path}`, { method })).status, 401); } finally { await h.close(); }
  });
  test("cross-site connect, account, sync and removal are refused before mutation", async () => {
    const h = await harness();
    try { for (const path of ["connect", "account", "sync", "remove"]) assert.equal((await fetch(`${h.base}/${path}`, { method: "POST", headers: { Origin: "https://evil.invalid" } })).status, 403); assert.equal(h.calls.length, 1); } finally { await h.close(); }
  });
  test("connect state is random and stored only hashed with owner and session", async () => {
    const h = await harness();
    try {
      const res = await fetch(`${h.base}/connect`, { method: "POST", headers: { Origin: "https://oravini.com" } });
      assert.equal(res.status, 200); assert.equal(res.headers.get("cache-control"), "no-store");
      const body = await res.json(); const state = new URL(body.authorizationUrl).searchParams.get("state")!;
      assert.match(state, /^[a-f0-9]{64}$/);
      const insert = h.calls.find(x => x.sql.startsWith("INSERT INTO instagram_unified_oauth_states"));
      assert.deepEqual(insert.values, [hashValue(state), "user-a", hashValue("session-a"), false]);
    } finally { await h.close(); }
  });
  test("callback rejects unknown/replayed states before any token exchange", async () => {
    let fetched = false;
    const h = await harness({ fetcher: async () => { fetched = true; return Response.json({}); } });
    try {
      const res = await fetch(`${h.base}/callback?state=${"a".repeat(64)}&code=synthetic`, { redirect: "manual" });
      assert.match(res.headers.get("location")!, /result=state_invalid/); assert.equal(fetched, false);
      const q = h.calls.find(x => x.sql.includes("RETURNING user_id"));
      assert.match(q.sql, /DELETE.*session_hash=\$3.*expires_at>NOW/);
      assert.deepEqual(q.values, [hashValue("a".repeat(64)), "user-a", hashValue("session-a")]);
    } finally { await h.close(); }
  });
  test("status cannot leak token fields or another user's connection", async () => {
    const h = await harness({ query: async (sql: string) => ({ rows: sql.startsWith("SELECT accounts") ? [{ accounts: [{ id: "99", username: "sample" }], selected_account_id: "99", encrypted_token: "DO-NOT-LEAK", client_business_id: "private" }] : [], rowCount: 1 }) });
    try {
      const res = await fetch(`${h.base}/status`); const body = await res.text();
      assert.ok(!body.includes("DO-NOT-LEAK") && !body.includes("private"));
      const q = h.calls.find(x => x.sql.startsWith("SELECT accounts")); assert.deepEqual(q.values, ["user-a"]);
    } finally { await h.close(); }
  });
  test("account must be present in the owner's assigned-assets list", async () => {
    const h = await harness();
    try {
      const res = await fetch(`${h.base}/account`, { method: "POST", headers: { Origin: "https://oravini.com", "Content-Type": "application/json" }, body: JSON.stringify({ accountId: "999" }) });
      assert.equal(res.status, 403);
      const q = h.calls.find(x => x.sql.startsWith("UPDATE"));
      assert.match(q.sql, /user_id=\$1 AND accounts @>/); assert.equal(q.values[0], "user-a");
    } finally { await h.close(); }
  });
  test("removal touches only the new app's local tables and scoped owner", async () => {
    const h = await harness();
    try {
      const res = await fetch(`${h.base}/remove`, { method: "POST", headers: { Origin: "https://oravini.com" } });
      assert.equal(res.status, 200);
      const deletes = h.calls.filter(x => x.sql.startsWith("DELETE"));
      assert.equal(deletes.length, 2); assert.ok(deletes.every(x => x.sql.includes("instagram_unified_") && x.values[0] === "user-a"));
    } finally { await h.close(); }
  });
});

const signed = (id: string, secret = env.INSTAGRAM_UNIFIED_APP_SECRET) => {
  const payload = Buffer.from(JSON.stringify({ algorithm: "HMAC-SHA256", user_id: id, issued_at: Math.floor(Date.now()/1000) })).toString("base64url");
  return `${createHmac("sha256", secret).update(payload).digest("base64url")}.${payload}`;
};
describe("signed new-app removal callbacks", () => {
  test("validates algorithm, signature, format and numeric identity", () => {
    assert.equal(verifyUnifiedSignedRequest(signed("8001"), env.INSTAGRAM_UNIFIED_APP_SECRET).userId, "8001");
    for (const value of [signed("8001", "other-app-secret"), "bad", signed("not-an-id"), signed("8001") + "x"]) assert.throws(() => verifyUnifiedSignedRequest(value, env.INSTAGRAM_UNIFIED_APP_SECRET), /signature_invalid/);
  });
  test("rejects forged callbacks before data removal and accepts signed request without a user session", async () => {
    const h = await harness({ authenticated: false });
    try {
      const send = (body: any) => fetch(`${h.base}/data-deletion`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) });
      assert.equal((await send({signed_request: signed("8001", "wrong")})).status,403);
      assert.equal(h.calls.length,1);
      const response=await send({signed_request:signed("8001")});assert.equal(response.status,200);
      const body=await response.json();assert.match(body.confirmation_code,/^[a-f0-9]{64}$/);assert.ok(body.url.endsWith(body.confirmation_code));
      const q=h.calls.find(x=>x.sql.includes("WITH removed"));assert.equal(q.values[0],IG_UNIFIED_APP_ID);assert.equal(q.values[1],"8001");assert.equal(q.values[2],hashValue(body.confirmation_code));
    } finally {await h.close();}
  });
});

// Expired or revoked connections still contain local data that users must be able to remove.
test("expired connection retains the data removal control", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const React = await import("react");
  const { InstagramUnifiedView } = await import("../client/src/components/InstagramUnifiedView");
  const html = renderToStaticMarkup(React.createElement(InstagramUnifiedView, {
    status: { configured: true, connected: false, reconnectRequired: true, accounts: [{ id: "99", username: "sample" }], selectedAccountId: "99", lastSyncedAt: null },
    media: [], onConnect() {}, onAccount() {}, onSync() {}, onRemove() {}
  }));
  assert.match(html, /Remove this connection/);
});
