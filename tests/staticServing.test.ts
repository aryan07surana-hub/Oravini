import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import { matchesSpaRoute, SPA_ROUTES } from '../server/spaRoutes';
import { SEO_ROUTES, PRERENDERED_ROUTES } from '../server/seoMeta';
import { serveStatic } from '../server/static';

const SHELL = '<!DOCTYPE html><html><head><title>t</title></head><body><div id="root"></div></body></html>';

test('every route declared in App.tsx is recognized by the server', () => {
  // Marketing/SEO pages are recognized through their seoMeta entries; app
  // pages through the SPA route list. A route in neither would 404.
  const appSource = readFileSync(new URL('../client/src/App.tsx', import.meta.url), 'utf8');
  const declared = [...appSource.matchAll(/path="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(declared.length > 100, 'route extraction from App.tsx broke');
  const missing = declared.filter(
    (r) =>
      !SPA_ROUTES.includes(r) &&
      !SEO_ROUTES[r] &&
      !PRERENDERED_ROUTES[r] &&
      // Dynamic marketing routes (e.g. /blog/:slug) are registered per slug.
      !(r.endsWith('/:slug') && Object.keys(SEO_ROUTES).some((k) => k.startsWith(r.slice(0, -5)))),
  );
  assert.deepEqual(missing, [], `routes in App.tsx unknown to the server: ${missing.join(', ')}`);
});

test('matchesSpaRoute matches exact routes, dynamic segments and trailing slashes', () => {
  for (const r of ['/', '/dashboard', '/crm', '/tools/webinars', '/vs/manychat']) {
    assert.ok(matchesSpaRoute(r), `should match ${r}`);
  }
  assert.ok(matchesSpaRoute('/dashboard/'), 'trailing slash ignored');
  assert.ok(matchesSpaRoute('/book/some-coach'), ':slug pattern');
  assert.ok(matchesSpaRoute('/f/my-funnel/step-2'), 'two dynamic segments');
  assert.ok(matchesSpaRoute('/admin/clients/abc123'), 'nested dynamic');
  assert.ok(matchesSpaRoute('/webinar-studio/xyz/analytics'));
});

test('matchesSpaRoute rejects unknown paths', () => {
  for (const r of ['/this-page-does-not-exist', '/wp-login.php', '/dashboard/anything-extra', '/random/deep/path', '/.env']) {
    assert.ok(!matchesSpaRoute(r), `should not match ${r}`);
  }
});

async function withServer(fn: (base: string) => Promise<void>) {
  const dir = mkdtempSync(path.join(tmpdir(), 'oravini-static-test-'));
  writeFileSync(path.join(dir, 'index.html'), SHELL);
  writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log(1)');
  const app = express();
  serveStatic(app as any, dir);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = (server.address() as any).port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test('unknown URLs return a real 404 status with the shell; known SPA routes return 200', async () => {
  await withServer(async (base) => {
    const junk = await fetch(`${base}/totally-made-up-url-xyz`);
    assert.equal(junk.status, 404);
    assert.match(await junk.text(), /<div id="root">/);

    const junkDeep = await fetch(`${base}/foo/bar/baz`);
    assert.equal(junkDeep.status, 404);

    const appRoute = await fetch(`${base}/dashboard`);
    assert.equal(appRoute.status, 200);
    assert.match(await appRoute.text(), /<div id="root">/);

    const dynamic = await fetch(`${base}/watch/ABC123`);
    assert.equal(dynamic.status, 200);

    const slash = await fetch(`${base}/crm/`);
    assert.equal(slash.status, 200);
  });
});

test('static assets get long cache lifetimes, public files a day, HTML revalidates', async () => {
  await withServer(async (base) => {
    const js = await fetch(`${base}/assets/index-abc123.js`);
    assert.equal(js.status, 200);
    assert.match(js.headers.get('cache-control') ?? '', /max-age=31536000/);
    assert.match(js.headers.get('cache-control') ?? '', /immutable/);

    const robots = await fetch(`${base}/robots.txt`);
    assert.equal(robots.status, 200);
    assert.match(robots.headers.get('cache-control') ?? '', /max-age=86400/);

    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('cache-control') ?? '', /must-revalidate/);
  });
});
