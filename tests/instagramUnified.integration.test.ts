import { createHmac } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { Pool } from "pg";
import type { AddressInfo } from "node:net";
import { registerInstagramUnifiedRoutes } from "../server/instagramUnifiedRoutes";
import { openToken } from "../server/instagramUnifiedCore";
const url = process.env.IG_UNIFIED_TEST_DATABASE_URL;
test("real PostgreSQL: OAuth -> onboarding -> sync -> snapshots -> scoped deletion", { skip: !url }, async () => {
  const pool = new Pool({ connectionString: url });
  // Dedicated disposable test schema only. Never run against app tables.
  const schema = `ig_test_${Date.now()}`;
  const client = await pool.connect();
  await client.query(`CREATE SCHEMA ${schema}`); await client.query(`SET search_path TO ${schema}`);
  await client.query("CREATE TABLE users(id VARCHAR PRIMARY KEY); INSERT INTO users VALUES('a'),('b')");
  const query = async (text: string, values?: any[]) => client.query(text, values);
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => { req.isAuthenticated = () => true; req.user = { id: req.get("x-test-user") || "a" }; req.sessionID = `session-${req.user.id}`; next(); });
  const env = { INSTAGRAM_UNIFIED_APP_SECRET: "test-only", INSTAGRAM_UNIFIED_CONFIG_ID: "1692089839019107", INSTAGRAM_UNIFIED_CONFIG_APPROVED: "true", TOKEN_ENCRYPTION_KEY: "a".repeat(64) };
  let exchanges = 0;
  const fakeFetch = async (value: any) => {
    const u = new URL(value);
    if (u.pathname.endsWith("oauth/access_token")) { exchanges++; return Response.json({ access_token: "synthetic-private-token", expires_in: 60 * 60 }); }
    if (u.pathname.endsWith("assigned_instagram_accounts")) return Response.json({ data: [{ id: "9001", username: "sample" }, { id: "9002", username: "other" }] });
    if (u.pathname.endsWith("/me")) return Response.json({ id: "8001", client_business_id: "7001" });
    if (u.pathname.endsWith("/media")) return Response.json({ data: [{ id: "1001", caption: "Sample", media_product_type: "REELS", permalink: "https://www.instagram.com/reel/sample/", timestamp: "2026-11-22T10:00:00Z" }] });
    return Response.json({ data: [{ name: u.searchParams.get("metric"), values: [{ value: 0 }] }] });
  };
  await registerInstagramUnifiedRoutes(app, { query, env, fetcher: fakeFetch as any });
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(r => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/instagram/unified`;
  const post = (path: string, body = {}, user = "a") => fetch(`${base}/${path}`, { method: "POST", headers: { Origin: "https://oravini.com", "Content-Type": "application/json", "x-test-user": user }, body: JSON.stringify(body) });
  try {
    const start = await (await post("connect")).json();
    const state = new URL(start.authorizationUrl).searchParams.get("state");
    const callback = await fetch(`${base}/callback?code=synthetic&state=${state}`, { redirect: "manual" });
    assert.match(callback.headers.get("location")!, /choose_account/); assert.equal(exchanges, 1);
    const replay = await fetch(`${base}/callback?code=synthetic&state=${state}`, { redirect: "manual" });
    assert.match(replay.headers.get("location")!, /state_invalid/); assert.equal(exchanges, 1);
    const stored = (await query("SELECT * FROM instagram_unified_connections WHERE user_id='a'")).rows[0];
    assert.equal(openToken(stored.encrypted_token, env.TOKEN_ENCRYPTION_KEY), "synthetic-private-token");
    assert.equal(stored.client_business_id, "7001"); assert.equal(stored.selected_account_id, null);
    assert.equal((await post("account", { accountId: "9999" })).status, 403);
    assert.equal((await post("account", { accountId: "9001" }, "b")).status, 403);
    assert.equal((await post("account", { accountId: "9001" })).status, 200);
    const sync = await post("sync"); assert.equal(sync.status, 200); const media = (await sync.json()).media;
    assert.equal(media[0].metrics.views, 0); assert.equal(media[0].metrics.likes, null);
    assert.equal((await post("sync")).status, 429);
    assert.equal((await query("SELECT count(*)::int AS n FROM instagram_unified_metric_snapshots")).rows[0].n, 1);
    const own = await (await fetch(`${base}/media`)).json(); assert.equal(own.media.length, 1);
    const other = await (await fetch(`${base}/media`, { headers: { "x-test-user": "b" } })).json(); assert.equal(other.media.length, 0);
    await post("remove", {}, "b"); assert.equal((await query("SELECT count(*)::int AS n FROM instagram_unified_connections")).rows[0].n, 1);
    const encoded=Buffer.from(JSON.stringify({algorithm:"HMAC-SHA256",user_id:"8001"})).toString("base64url");
    const signedRequest=createHmac("sha256",env.INSTAGRAM_UNIFIED_APP_SECRET).update(encoded).digest("base64url")+"."+encoded;
    const deletion=await post("data-deletion",{signed_request:signedRequest});assert.equal(deletion.status,200);
    const receipt=await deletion.json();const status=await fetch(receipt.url.replace("https://oravini.com/api/instagram/unified",base));assert.equal(status.status,200);assert.match(await status.text(),/removal complete/);
    await post("remove");
    for (const table of ["instagram_unified_connections", "instagram_unified_media", "instagram_unified_metric_snapshots", "instagram_unified_oauth_states"]) assert.equal((await query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0);
    await query("DELETE FROM users WHERE id='a'");
  } finally {
    server.closeAllConnections(); await new Promise<void>(r => server.close(() => r()));
    await client.query(`DROP SCHEMA ${schema} CASCADE`); client.release(); await pool.end();
  }
});
