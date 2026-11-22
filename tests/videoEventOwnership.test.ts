// Run: npm test   (node:test via tsx — no extra dependencies, no database)
//
// Exercises the real route registration from server/videoEventUpdate.ts against
// an in-memory store with synthetic accounts. No real user data is touched.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express, { type Request, type Response, type NextFunction } from "express";
import {
  registerVideoEventUpdateRoutes,
  sanitizeVideoEventUpdate,
  type VideoEventUpdateStore,
} from "../server/videoEventUpdate";

const OWNER = "test-owner-a";
const OTHER = "test-other-b";

type Row = Record<string, any>;
let rows: Map<string, Row>;
let updateCalls: number;

function resetStore() {
  updateCalls = 0;
  rows = new Map([
    ["vid-1", { id: "vid-1", userId: OWNER, title: "Owner video", views: 7, isPublic: false, createdAt: new Date(0) }],
  ]);
}

const store: VideoEventUpdateStore = {
  async getVideoEvent(id) { return rows.get(id) as any; },
  async updateVideoEvent(id, data) {
    updateCalls++;
    const row = rows.get(id);
    if (!row) return undefined;
    Object.assign(row, data);
    return { ...row } as any;
  },
};

// Same check as requireAuth in server/routes.ts (passport's req.isAuthenticated()).
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

let server: Server;
let base: string;

before(async () => {
  const app = express();
  app.use(express.json());
  // Stand-in for passport: the test picks the signed-in account via a header.
  app.use((req, _res, next) => {
    const uid = req.header("x-test-user");
    (req as any).user = uid ? { id: uid } : undefined;
    (req as any).isAuthenticated = () => !!uid;
    next();
  });
  registerVideoEventUpdateRoutes(app as any, requireAuth, store);
  server = app.listen(0);
  await new Promise<void>(r => server.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>(r => server.close(() => r())));

function patch(path: string, body: unknown, user?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (user) headers["x-test-user"] = user;
  return fetch(base + path, { method: "PATCH", headers, body: JSON.stringify(body) });
}

for (const path of ["/api/video-events/vid-1", "/api/video-events/vid-1/settings"]) {
  test(`${path}: anonymous request is denied and nothing changes`, async () => {
    resetStore();
    const res = await patch(path, { title: "hacked" });
    assert.equal(res.status, 401);
    assert.equal(rows.get("vid-1")!.title, "Owner video");
    assert.equal(updateCalls, 0);
  });

  test(`${path}: another account is denied (404, no existence leak) and nothing changes`, async () => {
    resetStore();
    const res = await patch(path, { title: "hacked", userId: OTHER }, OTHER);
    assert.equal(res.status, 404);
    assert.equal(rows.get("vid-1")!.title, "Owner video");
    assert.equal(rows.get("vid-1")!.userId, OWNER);
    assert.equal(updateCalls, 0);
  });

  test(`${path}: owner can edit settings`, async () => {
    resetStore();
    const res = await patch(path, {
      title: "Renamed",
      isPublic: true,
      progressBarConfig: JSON.stringify({ enabled: true, style: "hook-crawl-close" }),
      domainWhitelist: ["example.com"],
      expiresAt: "2030-01-01T00:00:00.000Z",
      defaultPlaybackSpeed: 1.25,
    }, OWNER);
    assert.equal(res.status, 200);
    const row = rows.get("vid-1")!;
    assert.equal(row.title, "Renamed");
    assert.equal(row.isPublic, true);
    assert.deepEqual(row.domainWhitelist, ["example.com"]);
    assert.ok(row.expiresAt instanceof Date, "ISO string is stored as a Date");
    assert.equal(row.defaultPlaybackSpeed, 1.25);
  });

  test(`${path}: owner cannot reassign ownership, id or system fields`, async () => {
    resetStore();
    const res = await patch(path, {
      title: "Still mine",
      userId: OTHER, id: "vid-999", views: 1_000_000,
      createdAt: "2001-01-01T00:00:00Z", approvalStatus: "approved", owner: OTHER,
    }, OWNER);
    assert.equal(res.status, 200);
    const row = rows.get("vid-1")!;
    assert.equal(row.title, "Still mine");
    assert.equal(row.userId, OWNER);
    assert.equal(row.id, "vid-1");
    assert.equal(row.views, 7);
    assert.equal(row.createdAt.getTime(), 0);
    assert.equal(row.approvalStatus, undefined);
    assert.equal(row.owner, undefined);
    assert.ok(!rows.has("vid-999"));
  });
}

test("unknown video id returns 404 for a signed-in user", async () => {
  resetStore();
  const res = await patch("/api/video-events/does-not-exist", { title: "x" }, OWNER);
  assert.equal(res.status, 404);
  assert.equal(updateCalls, 0);
});

test("owner request with only protected fields is rejected with 400", async () => {
  resetStore();
  const res = await patch("/api/video-events/vid-1", { userId: OTHER, id: "x" }, OWNER);
  assert.equal(res.status, 400);
  assert.equal(rows.get("vid-1")!.userId, OWNER);
  assert.equal(updateCalls, 0);
});

test("sanitize: wrong types are rejected", () => {
  for (const body of [
    { isPublic: "yes" }, { title: "" }, { tags: [1, 2] },
    { expiresAt: "not a date" }, { defaultPlaybackSpeed: "fast" }, [], null,
  ]) {
    assert.equal(sanitizeVideoEventUpdate(body).ok, false, JSON.stringify(body));
  }
});

test("sanitize: nulls clear optional fields; prototype keys are ignored", () => {
  const r = sanitizeVideoEventUpdate(JSON.parse('{"progressBarConfig":null,"expiresAt":null,"__proto__":{"userId":"x"},"logoUrl":null}'));
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.data, { progressBarConfig: null, expiresAt: null, logoUrl: null });
    assert.equal((r.data as any).userId, undefined);
  }
});
