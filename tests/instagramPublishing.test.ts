import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { validateDraft, allowedMediaUrl, inspectAsset, PublishingGraph } from "../server/instagramPublishingCore";
import { runPublishingTick, registerInstagramPublishingRoutes } from "../server/instagramPublishingRoutes";
import { sealToken } from "../server/instagramUnifiedCore";
const env = { INSTAGRAM_PUBLISH_ENABLED: "true", INSTAGRAM_PUBLISH_CONFIG_ID: "99", INSTAGRAM_PUBLISH_MEDIA_HOSTS: "media.example.com", INSTAGRAM_UNIFIED_APP_SECRET: "synthetic-secret", INSTAGRAM_UNIFIED_CONFIG_ID: "88", INSTAGRAM_UNIFIED_CONFIG_APPROVED: "true", TOKEN_ENCRYPTION_KEY: "a".repeat(64) };
const config = { appId: "40085646374415585", configId: "99", secret: "test", version: "v27.0", redirectUri: "https://oravini.com/api/instagram/unified/callback", encryptionKey: env.TOKEN_ENCRYPTION_KEY };
const draft = () => ({ type: "IMAGE", accountId: "123", caption: "A sample", assets: [{ kind: "IMAGE", url: "https://media.example.com/sample.jpg" }], scheduledAt: new Date(Date.now() + 120000).toISOString(), timezone: "Asia/Kolkata" });
test("validates supported formats, UTC dates and bounds", () => {
  assert.equal(validateDraft(draft()).assets.length, 1);
  for (const patch of [{ type: "STORIES" }, { caption: "x".repeat(2201) }, { assets: [] }, { timezone: "bad" }, { scheduledAt: "2030-01-01T10:00" }, { scheduledAt: new Date(0).toISOString() }, { assets: [{ kind: "VIDEO", url: "https://media.example.com/a.mp4" }] }]) assert.throws(() => validateDraft({ ...draft(), ...patch }));
  assert.throws(() => validateDraft({ ...draft(), type: "CAROUSEL" }));
  assert.equal(validateDraft({ ...draft(), type: "CAROUSEL", assets: Array(20).fill(draft().assets[0]) }).assets.length, 20);
  assert.throws(() => validateDraft({ ...draft(), type: "CAROUSEL", assets: Array(21).fill(draft().assets[0]) }));
});
test("restricts public media to configured exact HTTPS origins", () => {
  assert.equal(allowedMediaUrl(draft().assets[0].url, env).hostname, "media.example.com");
  for (const u of ["http://media.example.com/a", "https://evil.com/a", "https://127.0.0.1/a", "https://media.example.com.evil.com/a", "https://user:pass@media.example.com/a", "https://media.example.com:8080/a"]) assert.throws(() => allowedMediaUrl(u, env));
  assert.throws(() => allowedMediaUrl("https://oravini.com/uploads/a.jpg", { INSTAGRAM_PUBLISH_MEDIA_HOSTS: "oravini.com" }));
});
test("checks bytes, content type, size; disallows redirects", async () => {
  await inspectAsset(draft().assets[0] as any, env, (async (_u, o) => { assert.equal(o?.redirect, "error"); return new Response(new Uint8Array([255, 216, 255, 0]), { headers: { "Content-Type": "image/jpeg", "Content-Length": "4" } }); }) as typeof fetch);
  for (const r of [new Response("not jpeg", { headers: { "Content-Type": "image/jpeg", "Content-Length": "8" } }), new Response("bad", { status: 403 }), new Response("bad", { headers: { "Content-Type": "image/jpeg" } })]) await assert.rejects(() => inspectAsset(draft().assets[0] as any, env, (async () => r) as typeof fetch));
});
test("Meta writes use form bodies and auth header; unknown network outcome is explicit", async () => {
  const graph = new PublishingGraph(config, "synthetic-token", (async (u, opts) => { assert.equal(opts?.method, "POST"); assert.equal(new URL(String(u)).searchParams.has("access_token"), false); assert.match(String(opts?.body), /image_url=/); return Response.json({ id: "555" }); }) as typeof fetch);
  assert.equal(await graph.create("123", draft().assets[0] as any, "Sample"), "555");
  await assert.rejects(() => new PublishingGraph(config, "synthetic-token", (async () => { throw Error("network"); }) as typeof fetch).publish("123", "555"), /meta_write_unknown/);
});
test("disabled routes are readable but reject all scheduling, no DB setup", async () => {
  let queries = 0; const app = express(); app.use(express.json()); app.use((req: any, _res, next) => { req.isAuthenticated = () => true; req.user = { id: "user" }; next(); });
  await registerInstagramPublishingRoutes(app, { query: async () => { queries++; return { rows: [], rowCount: 0 }; }, env: {} });
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(r => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/instagram/publishing/jobs`;
  try { assert.equal((await (await fetch(base)).json()).enabled, false); assert.equal((await fetch(base, { method: "POST", headers: { Origin: "https://oravini.com", "Content-Type": "application/json" }, body: JSON.stringify(draft()) })).status, 503); assert.equal(queries, 0); } finally { server.closeAllConnections(); server.close(); }
});
async function tick(options: { changedGrant?: boolean; lostPublish?: boolean; carousel?: boolean } = {}) {
  const changes: { sql: string; values: any[] }[] = [], writes: string[] = [];
  const d = { ...draft(), ...(options.carousel ? { type: "CAROUSEL", assets: [draft().assets[0], draft().assets[0]] } : {}) };
  const job: any = { id: "job", user_id: "user", account_id: "123", grant_version: "grant", draft: d, scheduled_at: new Date().toISOString(), children: [], polls: 0 };
  const query = async (sql: string, values: any[] = []) => { changes.push({ sql, values }); if (sql.startsWith("WITH due")) return { rows: [job], rowCount: 1 }; if (sql.startsWith("SELECT * FROM instagram_unified_connections")) return { rows: [{ app_id: config.appId, config_id: "99", accounts: [{ id: "123" }], grant_version: options.changedGrant ? "other" : "grant", encrypted_token: sealToken("synthetic-token", env.TOKEN_ENCRYPTION_KEY) }], rowCount: 1 }; if (sql.startsWith("SELECT grant_version")) return { rows: [{ grant_version: "grant" }], rowCount: 1 }; return { rows: [], rowCount: 1 }; };
  let count = 0;
  const fetcher = async (u: any, opts: any) => {
    const url = new URL(u);
    if (url.hostname === "media.example.com") return new Response(new Uint8Array([255,216,255,0]), { headers: { "Content-Type": "image/jpeg", "Content-Length": "4" } });
    if (url.pathname.endsWith("/permissions")) return Response.json({ data: [{ permission: "instagram_content_publish", status: "granted" }] });
    if (url.pathname.endsWith("/content_publishing_limit")) return Response.json({ data: [{ quota_usage: 0, config: { quota_total: 100 } }] });
    if (opts.method === "POST") { writes.push(url.pathname); if (url.pathname.endsWith("/media_publish")) { if (options.lostPublish) throw Error("lost"); return Response.json({ id: "900" }); } return Response.json({ id: String(500 + count++) }); }
    return Response.json({ status_code: "FINISHED" });
  };
  await runPublishingTick({ query, env, fetcher: fetcher as any }); return { changes, writes };
}
test("worker publishes only after durable fence, persists actual media ID", async () => { const r = await tick(); assert.equal(r.writes.length, 2); const publish = r.changes.find(x => x.sql.includes("status='publishing'")); assert.ok(publish); assert.ok(r.changes.some(x => x.sql.includes("status='published'") && x.values[1] === "900")); });
test("worker refuses changed grants and does not call Meta writes", async () => { const r = await tick({ changedGrant: true }); assert.equal(r.writes.length, 0); assert.ok(r.changes.some(x => x.values[1] === "publishing_reconnect_required")); });
test("ambiguous publish outcome is never marked success or automatically retried", async () => { const r = await tick({ lostPublish: true }); assert.ok(r.changes.some(x => x.values[1] === "meta_write_unknown")); assert.ok(!r.changes.some(x => x.sql.includes("status='published'"))); });
test("carousel checks children, creates parent, then publishes", async () => { const r = await tick({ carousel: true }); assert.equal(r.writes.filter(x => x.endsWith("/media")).length, 3); assert.equal(r.writes.filter(x => x.endsWith("/media_publish")).length, 1); });
