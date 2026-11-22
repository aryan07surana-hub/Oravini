import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import { serveStatic } from "../server/static";

// This exercises the production static-serving path, without executing page JavaScript.
test("policy URLs deliver full shared copy to normal and Meta crawlers", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "policy-crawler-test-"));
  const { buildPolicyPages } = await import("../script/buildPolicies.mjs");
  let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;
  try {
    await writeFile(path.join(directory, "index.html"), '<html><head><link rel="stylesheet" href="/assets/app.css"></head><body><div id="root"></div><script src="app.js"></script></body></html>');
    await buildPolicyPages(directory);
    const app = express(); serveStatic(app, directory);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server!.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    for (const userAgent of ["Mozilla/5.0", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"]) {
      for (const [slug, expected] of [["data-deletion", "Request deletion without signing in"], ["privacy", "Oravini Content &amp; Analytics"], ["terms", "Terms of Service"]]) {
        const response = await fetch(`${base}/${slug}`, { headers: { "User-Agent": userAgent } });
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type")!, /text\/html/);
        const body = await response.text();
        assert.ok(body.includes(expected), `${slug} must include real content`);
        assert.match(body, /support\.oravini@gmail\.com/);
        assert.match(body, /<h1/); assert.match(body, /<h2/);
        assert.ok(!body.includes('<div id="root"></div>'));
        assert.ok(!body.includes('<script'));
        assert.match(body, /href="\/assets\/app.css"/);
        assert.equal(body, await readFile(path.join(directory, `${slug}.html`), "utf8"));
      }
    }
    const head = await fetch(`${base}/data-deletion`, { method: "HEAD" });
    assert.equal(head.status, 200); assert.match(head.headers.get("content-type")!, /text\/html/);
    assert.equal(await head.text(), "");
    assert.match(await (await fetch(`${base}/tracking/content/instagram/insights`)).text(), /id="root"/);
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
