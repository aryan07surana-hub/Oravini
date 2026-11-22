// Run: npm test   (node:test via tsx — no extra dependencies, no database)
//
// Cross-account regression tests for the video hosting routes. Exercises the real
// route registrations (server/videoManagementRoutes.ts + server/videoEventUpdate.ts)
// against an in-memory store with two synthetic accounts. No real user data, no
// real deletions.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express, { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { registerVideoManagementRoutes, type VideoManagementStore } from "../server/videoManagementRoutes";
import { registerVideoEventUpdateRoutes } from "../server/videoEventUpdate";
import { hashVideoPassword, verifyVideoPassword } from "../server/videoPassword";

const A = "test-user-a"; // owner of the "a*" fixtures
const B = "test-user-b"; // the other account

// ── In-memory store ────────────────────────────────────────────────────────

type Row = Record<string, any>;
type DB = Record<string, Map<string | number, Row>>;
let db: DB;
let seq: number;

function fixtures(): DB {
  const t = (rows: Row[]) => new Map(rows.map(r => [r.id, r]));
  return {
    videos: t([
      { id: "va", userId: A, title: "A video", videoUrl: "https://cdn.test/a.mp4", captionUrl: "https://cdn.test/a.vtt",
        passwordHash: null, domainWhitelist: ["a.test"], editMetadata: "{\"clips\":[]}", approvalStatus: null, views: 3 },
      { id: "vp", userId: A, title: "A protected", videoUrl: "https://cdn.test/p.mp4", captionUrl: null,
        passwordHash: hashVideoPassword("open sesame"), domainWhitelist: [], editMetadata: null, views: 0 },
      { id: "vl", userId: A, title: "A legacy protected", videoUrl: "https://cdn.test/l.mp4", captionUrl: null,
        passwordHash: "legacy-plain", domainWhitelist: [], editMetadata: null, views: 0 },
      { id: "vb", userId: B, title: "B video", videoUrl: "https://cdn.test/b.mp4", passwordHash: null, domainWhitelist: [] },
    ]),
    chapters: t([
      { id: 1, videoEventId: "va", title: "Intro", startSeconds: 0, description: null },
      { id: 2, videoEventId: "vp", title: "Secret chapter", startSeconds: 5, description: null },
      { id: 3, videoEventId: "vb", title: "B chapter", startSeconds: 0, description: null },
    ]),
    ctas: t([
      { id: 1, videoEventId: "va", text: "Buy", url: "https://a.test/buy", type: "button", style: "gold", appearAt: 0, disappearAt: null, isActive: true, clicks: 42 },
      { id: 2, videoEventId: "va", text: "Hidden", url: null, type: "button", style: "gold", appearAt: 0, disappearAt: null, isActive: false, clicks: 1 },
      { id: 3, videoEventId: "vp", text: "Secret offer", url: "https://a.test/secret", type: "button", style: "gold", appearAt: 0, disappearAt: null, isActive: true, clicks: 0 },
    ]),
    sessions: t([{ id: 1, videoEventId: "va", visitorId: "visitor-1", watchedSeconds: 10, completionPct: 5, ctaClicked: false }]),
    interactive: t([
      { id: "ia", videoEventId: "va", type: "annotation", timestamp: 3, text: "Hi", isActive: true, impressions: 99, clicks: 7 },
      { id: "ip", videoEventId: "vp", type: "cta", timestamp: 3, ctaText: "Secret", isActive: true, impressions: 0, clicks: 0 },
    ]),
    collections: t([
      { id: 1, userId: A, title: "A collection", description: null, isPublic: false },
      { id: 2, userId: B, title: "B collection", description: null, isPublic: false },
    ]),
    items: t([
      { id: 1, collectionId: 1, videoEventId: "va", sortOrder: 0 },
      { id: 2, collectionId: 2, videoEventId: "vb", sortOrder: 0 },
    ]),
    abtests: t([
      { id: "aa", userId: A, name: "A test", videoAId: "va", videoBId: null, splitRatio: 50, status: "running", playsA: 5, playsB: 0 },
      { id: "ab", userId: B, name: "B test", videoAId: "vb", videoBId: null, splitRatio: 50, status: "running", playsA: 0, playsB: 0 },
    ]),
    channels: t([
      { id: "cpub", userId: A, name: "A public", slug: "a-pub", isPublic: true, subscriberCount: 10 },
      { id: "cpriv", userId: A, name: "A private", slug: "a-priv", isPublic: false, subscriberCount: 0 },
      { id: "cb", userId: B, name: "B channel", slug: "b", isPublic: true, subscriberCount: 0 },
    ]),
    episodes: t([
      { id: 1, channelId: "cpub", videoEventId: "va", section: "Episodes", sortOrder: 0 },
      { id: 2, channelId: "cpriv", videoEventId: "va", section: "Episodes", sortOrder: 0 },
    ]),
    dubbing: t([{ id: "da", userId: A, videoEventId: "va", language: "es", jobType: "dub", status: "processing" }]),
    comments: t([{ id: "ca", videoEventId: "va", authorId: A, authorName: "A", timestamp: null, text: "note", resolved: false }]),
  };
}

let calls: string[]; // every store method invoked, to prove denied requests touch nothing
function snapshot() { return JSON.stringify(Object.fromEntries(Object.entries(db).map(([k, m]) => [k, [...m.values()]]))); }

const list = (table: string, pred: (r: Row) => boolean) => [...db[table].values()].filter(pred).map(r => ({ ...r }));
const get = (table: string, id: any) => { const r = db[table].get(id); return r ? { ...r } : undefined; };
const insert = (table: string, data: Row, id?: any) => { const row = { id: id ?? ++seq, ...data }; db[table].set(row.id, row); return { ...row }; };
const update = (table: string, id: any, data: Row) => { const r = db[table].get(id); if (!r) return undefined; Object.assign(r, data); return { ...r }; };
const del = (table: string, id: any) => { db[table].delete(id); };

const raw: Record<string, (...a: any[]) => any> = {
  getVideoEvent: (id) => get("videos", id),
  deleteVideoEvent: (id) => del("videos", id),
  updateVideoEvent: (id, d) => update("videos", id, d),
  getVideoChapters: (vid) => list("chapters", r => r.videoEventId === vid),
  getVideoChapter: (id) => get("chapters", id),
  createVideoChapter: (d) => insert("chapters", d),
  updateVideoChapter: (id, d) => update("chapters", id, d),
  deleteVideoChapter: (id) => del("chapters", id),
  getVideoCtas: (vid) => list("ctas", r => r.videoEventId === vid),
  getVideoCta: (id) => get("ctas", id),
  createVideoCta: (d) => insert("ctas", { clicks: 0, ...d }),
  updateVideoCta: (id, d) => update("ctas", id, d),
  deleteVideoCta: (id) => del("ctas", id),
  getVideoViewerSessions: (vid) => list("sessions", r => r.videoEventId === vid),
  getViewerSession: (id) => get("sessions", id),
  createViewerSession: (d) => insert("sessions", d),
  updateViewerSession: (id, d) => { update("sessions", id, d); },
  getVideoInteractiveElements: (vid) => list("interactive", r => r.videoEventId === vid),
  getVideoInteractiveElement: (id) => get("interactive", id),
  createVideoInteractiveElement: (d) => insert("interactive", { impressions: 0, clicks: 0, isActive: true, ...d }, `i${++seq}`),
  updateVideoInteractiveElement: (id, d) => update("interactive", id, d),
  deleteVideoInteractiveElement: (id) => del("interactive", id),
  createVideoCollection: (d) => insert("collections", d),
  getVideoCollection: (id) => get("collections", id),
  updateVideoCollection: (id, d) => update("collections", id, d),
  deleteVideoCollection: (id) => del("collections", id),
  getVideoCollectionItems: (cid) => list("items", r => r.collectionId === cid),
  getVideoCollectionItem: (id) => get("items", id),
  addVideoToCollection: (cid, vid, sortOrder = 0) => insert("items", { collectionId: cid, videoEventId: vid, sortOrder }),
  removeVideoFromCollection: (id) => del("items", id),
  createVideoAbTest: (d) => insert("abtests", { playsA: 0, playsB: 0, ...d }, `t${++seq}`),
  getVideoAbTest: (id) => get("abtests", id),
  updateVideoAbTest: (id, d) => update("abtests", id, d),
  deleteVideoAbTest: (id) => del("abtests", id),
  createVideoChannel: (d) => insert("channels", { subscriberCount: 0, isPublic: true, ...d }, `c${++seq}`),
  getVideoChannel: (id) => get("channels", id),
  updateVideoChannel: (id, d) => update("channels", id, d),
  deleteVideoChannel: (id) => del("channels", id),
  getChannelEpisodes: (cid) => list("episodes", r => r.channelId === cid),
  getChannelEpisode: (id) => get("episodes", id),
  addChannelEpisode: (cid, vid, section, sortOrder) => insert("episodes", { channelId: cid, videoEventId: vid, section: section ?? "Episodes", sortOrder: sortOrder ?? 0 }),
  removeChannelEpisode: (id) => del("episodes", id),
  getVideoDubbingJobs: (uid, vid) => list("dubbing", r => r.userId === uid && (!vid || r.videoEventId === vid)),
  createVideoDubbingJob: (d) => insert("dubbing", d, `d${++seq}`),
  getVideoCollabComments: (vid) => list("comments", r => r.videoEventId === vid),
  getVideoCollabComment: (id) => get("comments", id),
  createVideoCollabComment: (d) => insert("comments", d, `m${++seq}`),
  updateVideoCollabComment: (id, d) => update("comments", id, d),
  deleteVideoCollabComment: (id) => del("comments", id),
  getVideoHeatmap: (vid) => [{ videoId: vid, second: 0, viewCount: 1 }],
  getVideoViewerProfiles: (vid) => [{ videoId: vid, sessionId: "s1" }],
  getVideoDailyStats: (vid) => [{ videoId: vid, plays: 1 }],
  getVideoAnalyticsEvents: (vid) => [{ videoId: vid, eventType: "play" }],
  getVideoAnalyticsSummary: () => ({ totalViews: 1, totalCompletions: 0, avgWatchTime: 0 }),
};
const WRITE = /^(create|update|delete|add|remove)/;
const store = new Proxy(raw, {
  get(target, prop: string) {
    const fn = target[prop];
    if (!fn) throw new Error(`store.${prop} not mocked`);
    return async (...args: any[]) => { calls.push(prop); return fn(...args); };
  },
}) as unknown as VideoManagementStore & { updateVideoEvent: any };

// ── App ───────────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function makeApp(unlockLimiter?: RequestHandler) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const uid = req.header("x-test-user");
    (req as any).user = uid ? { id: uid, name: uid } : undefined;
    (req as any).isAuthenticated = () => !!uid;
    next();
  });
  registerVideoManagementRoutes(app as any, requireAuth, store, unlockLimiter ? { unlockLimiter } : {});
  registerVideoEventUpdateRoutes(app as any, requireAuth, store as any);
  return app;
}

async function listen(app: express.Express) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(r => server.once("listening", () => r()));
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

let server: Server;
let base: string;
before(async () => {
  ({ server, base } = await listen(makeApp((_req, _res, next) => next())));
});
after(() => new Promise<void>(r => server.close(() => r())));
beforeEach(() => { db = fixtures(); seq = 1000; calls = []; });

async function call(method: string, path: string, opts: { user?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers ?? {}) };
  if (opts.user) headers["x-test-user"] = opts.user;
  const res = await fetch(base + path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json };
}

// ── Every management route, aimed at account A's resources ─────────────────

const MANAGEMENT: Array<[string, string, unknown?]> = [
  ["GET", "/api/video-events/va"],
  ["DELETE", "/api/video-events/va"],
  ["PATCH", "/api/video-events/va", { title: "x" }],
  ["PATCH", "/api/video-events/va/settings", { title: "x" }],
  ["GET", "/api/video-events/va/chapters"],
  ["POST", "/api/video-events/va/chapters", { title: "x", startSeconds: 1 }],
  ["PATCH", "/api/video-chapters/1", { title: "x" }],
  ["DELETE", "/api/video-chapters/1"],
  ["GET", "/api/video-events/va/ctas"],
  ["POST", "/api/video-events/va/ctas", { text: "x" }],
  ["PATCH", "/api/video-ctas/1", { isActive: false }],
  ["DELETE", "/api/video-ctas/1"],
  ["GET", "/api/video-events/va/viewers"],
  ["GET", "/api/video-events/va/interactive"],
  ["POST", "/api/video-events/va/interactive", { type: "annotation", timestamp: 1 }],
  ["PATCH", "/api/video-interactive/ia", { text: "x" }],
  ["DELETE", "/api/video-interactive/ia"],
  ["PATCH", "/api/video-collections/1", { title: "x" }],
  ["DELETE", "/api/video-collections/1"],
  ["GET", "/api/video-collections/1/items"],
  ["POST", "/api/video-collections/1/items", { videoEventId: "va" }],
  ["DELETE", "/api/video-collection-items/1"],
  ["PATCH", "/api/video-ab-tests/aa", { status: "paused" }],
  ["DELETE", "/api/video-ab-tests/aa"],
  ["GET", "/api/video-channels/cpub"],
  ["PATCH", "/api/video-channels/cpub", { name: "x" }],
  ["DELETE", "/api/video-channels/cpub"],
  ["POST", "/api/video-channels/cpub/episodes", { videoEventId: "va" }],
  ["DELETE", "/api/video-channel-episodes/1"],
  ["GET", "/api/video-events/va/dubbing-jobs"],
  ["POST", "/api/video-events/va/dub", { languages: ["fr"] }],
  ["POST", "/api/video-events/va/translate-captions", { languages: ["fr"] }],
  ["GET", "/api/video-events/va/collab-comments"],
  ["POST", "/api/video-events/va/collab-comments", { text: "x" }],
  ["PATCH", "/api/video-collab-comments/ca", { resolved: true }],
  ["DELETE", "/api/video-collab-comments/ca"],
  ["GET", "/api/video-analytics/va"],
  ["GET", "/api/video-analytics/va/heatmap"],
  ["GET", "/api/video-analytics/va/viewers"],
  ["GET", "/api/video-analytics/va/daily"],
];

test("anonymous: every management route returns 401 and touches nothing", async () => {
  const before = snapshot();
  for (const [method, path, body] of MANAGEMENT) {
    const r = await call(method, path, { body });
    assert.equal(r.status, 401, `${method} ${path}`);
  }
  assert.equal(snapshot(), before);
  assert.deepEqual(calls, [], "no store access for anonymous requests");
});

test("cross-account: every management route returns 404 to the other account and changes nothing", async () => {
  const before = snapshot();
  for (const [method, path, body] of MANAGEMENT) {
    const r = await call(method, path, { user: B, body });
    assert.equal(r.status, 404, `${method} ${path} → ${r.status} ${JSON.stringify(r.json)}`);
  }
  assert.equal(snapshot(), before, "no row created, changed or deleted");
  assert.deepEqual(calls.filter(c => WRITE.test(c)), [], "no write method was called");
});

test("owner: every management route succeeds", async () => {
  // Order matters for deletes, so run each against fresh fixtures.
  for (const [method, path, body] of MANAGEMENT) {
    db = fixtures();
    const r = await call(method, path, { user: A, body });
    assert.ok(r.status === 200 || r.status === 201, `${method} ${path} → ${r.status} ${JSON.stringify(r.json)}`);
  }
});

test("owner delete removes only the owner's video (in-memory)", async () => {
  const r = await call("DELETE", "/api/video-events/va", { user: A });
  assert.equal(r.status, 200);
  assert.ok(!db.videos.has("va"));
  assert.ok(db.videos.has("vb"), "other account's video untouched");
});

test("unknown ids return 404 for a signed-in owner, never 500", async () => {
  for (const path of ["/api/video-chapters/999", "/api/video-chapters/abc", "/api/video-ctas/1e3", "/api/video-interactive/nope",
    "/api/video-collections/999", "/api/video-collection-items/999", "/api/video-ab-tests/nope",
    "/api/video-channel-episodes/999", "/api/video-collab-comments/nope"]) {
    const r = await call("DELETE", path, { user: A });
    assert.equal(r.status, 404, path);
  }
  assert.deepEqual(calls.filter(c => WRITE.test(c)), []);
});

// ── Forged parent/child links ──────────────────────────────────────────────

test("collections: both sides of a link must belong to the caller", async () => {
  const before = snapshot();
  // B puts A's video into B's own collection.
  assert.equal((await call("POST", "/api/video-collections/2/items", { user: B, body: { videoEventId: "va" } })).status, 404);
  // B puts B's video into A's collection.
  assert.equal((await call("POST", "/api/video-collections/1/items", { user: B, body: { videoEventId: "vb" } })).status, 404);
  // A (collection owner) adds B's video.
  assert.equal((await call("POST", "/api/video-collections/1/items", { user: A, body: { videoEventId: "vb" } })).status, 404);
  // B removes an item of A's collection.
  assert.equal((await call("DELETE", "/api/video-collection-items/1", { user: B })).status, 404);
  assert.equal(snapshot(), before);
  // A adds A's own video: allowed.
  assert.equal((await call("POST", "/api/video-collections/1/items", { user: A, body: { videoEventId: "vp" } })).status, 200);
});

test("A/B tests: cannot reference another account's video on create or update", async () => {
  const before = snapshot();
  assert.equal((await call("POST", "/api/video-ab-tests", { user: A, body: { name: "t", videoAId: "va", videoBId: "vb" } })).status, 404);
  assert.equal((await call("PATCH", "/api/video-ab-tests/aa", { user: A, body: { videoBId: "vb" } })).status, 404);
  assert.equal(snapshot(), before);
  const ok = await call("POST", "/api/video-ab-tests", { user: A, body: { name: "t", videoAId: "va", videoBId: "", splitRatio: "60", userId: B, playsA: 999 } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.userId, A, "owner forced to caller");
  assert.equal(ok.json.videoBId, null, "empty ref stored as null");
  assert.equal(ok.json.splitRatio, 60);
  assert.equal(ok.json.playsA, 0, "counters not settable");
  assert.equal((await call("PATCH", "/api/video-ab-tests/aa", { user: A, body: { status: "bogus" } })).status, 400);
});

test("channels: episodes need an owned channel AND an owned video; owner/counters not settable", async () => {
  const before = snapshot();
  assert.equal((await call("POST", "/api/video-channels/cb/episodes", { user: B, body: { videoEventId: "va" } })).status, 404);
  assert.equal((await call("POST", "/api/video-channels/cpub/episodes", { user: A, body: { videoEventId: "vb" } })).status, 404);
  assert.equal((await call("DELETE", "/api/video-channel-episodes/1", { user: B })).status, 404);
  assert.equal(snapshot(), before);
  const ch = await call("POST", "/api/video-channels", { user: B, body: { name: "mine", userId: A, subscriberCount: 5000, slug: "" } });
  assert.equal(ch.status, 201);
  assert.equal(ch.json.userId, B);
  assert.equal(ch.json.subscriberCount, 0);
  assert.equal(ch.json.slug, null, "empty slug stored as null (unique column)");
});

test("children cannot be moved to another video or have counters/owner rewritten", async () => {
  await call("PATCH", "/api/video-chapters/1", { user: A, body: { title: "Renamed", videoEventId: "vb", id: 3 } });
  assert.equal(db.chapters.get(1)!.videoEventId, "va");
  assert.equal(db.chapters.get(1)!.title, "Renamed");
  assert.equal(db.chapters.get(3)!.title, "B chapter");

  await call("PATCH", "/api/video-ctas/1", { user: A, body: { isActive: false, clicks: 0, videoEventId: "vb" } });
  assert.equal(db.ctas.get(1)!.clicks, 42);
  assert.equal(db.ctas.get(1)!.videoEventId, "va");

  await call("PATCH", "/api/video-interactive/ia", { user: A, body: { text: "edited", impressions: 0, videoEventId: "vb" } });
  assert.equal(db.interactive.get("ia")!.impressions, 99);
  assert.equal(db.interactive.get("ia")!.videoEventId, "va");

  await call("PATCH", "/api/video-collections/1", { user: A, body: { title: "t", userId: B } });
  assert.equal(db.collections.get(1)!.userId, A);

  await call("PATCH", "/api/video-collab-comments/ca", { user: A, body: { resolved: true, authorId: B, videoEventId: "vb" } });
  assert.equal(db.comments.get("ca")!.authorId, A);
  assert.equal(db.comments.get("ca")!.videoEventId, "va");

  const created = await call("POST", "/api/video-events/va/chapters", { user: A, body: { title: "New", videoEventId: "vb" } });
  assert.equal(created.status, 201);
  assert.equal(created.json.videoEventId, "va", "URL parent wins, body parent ignored");
});

test("wrong value types are rejected with 400, not written", async () => {
  const before = snapshot();
  assert.equal((await call("PATCH", "/api/video-ctas/1", { user: A, body: { isActive: "nope" } })).status, 400);
  assert.equal((await call("POST", "/api/video-events/va/chapters", { user: A, body: { title: "" } })).status, 400);
  assert.equal((await call("POST", "/api/video-events/va/dub", { user: A, body: { languages: [1] } })).status, 400);
  assert.equal(snapshot(), before);
});

// ── Viewer sessions (public) ───────────────────────────────────────────────

test("viewer sessions: create needs a real video; progress updates need the session's real video+visitor", async () => {
  assert.equal((await call("POST", "/api/video-viewer-sessions", { body: { videoEventId: "nope", visitorId: "v" } })).status, 404);
  const created = await call("POST", "/api/video-viewer-sessions", { body: { videoEventId: "va", visitorId: "v2", watchedSeconds: 3 } });
  assert.equal(created.status, 201);

  const before = snapshot();
  assert.equal((await call("PATCH", "/api/video-viewer-sessions/1", { body: { watchedSeconds: 999 } })).status, 404);
  assert.equal((await call("PATCH", "/api/video-viewer-sessions/1", { body: { videoEventId: "vb", visitorId: "visitor-1", watchedSeconds: 999 } })).status, 404);
  assert.equal((await call("PATCH", "/api/video-viewer-sessions/1", { body: { videoEventId: "va", visitorId: "someone-else", watchedSeconds: 999 } })).status, 404);
  assert.equal(snapshot(), before);

  const ok = await call("PATCH", "/api/video-viewer-sessions/1", { body: { videoEventId: "va", visitorId: "visitor-1", watchedSeconds: 60, completionPct: 50 } });
  assert.equal(ok.status, 200);
  assert.equal(db.sessions.get(1)!.watchedSeconds, 60);
  assert.equal(db.sessions.get(1)!.videoEventId, "va");
});

// ── Public embed routes ────────────────────────────────────────────────────

test("public metadata: unprotected video plays, private fields hidden", async () => {
  const r = await call("GET", "/api/video/va/public");
  assert.equal(r.status, 200);
  assert.equal(r.json.videoUrl, "https://cdn.test/a.mp4");
  assert.equal(r.json.passwordRequired, false);
  for (const k of ["userId", "passwordHash", "domainWhitelist", "editMetadata", "approvalStatus"]) {
    assert.ok(!(k in r.json), `${k} must not be public`);
  }
  assert.equal((await call("GET", "/api/video/missing/public")).status, 404);
});

test("public content: active items only, no click/impression counters", async () => {
  const ctas = await call("GET", "/api/video/va/ctas");
  assert.deepEqual(ctas.json.map((c: any) => c.id), [1]);
  assert.ok(!("clicks" in ctas.json[0]));
  const els = await call("GET", "/api/video/va/interactive");
  assert.equal(els.json.length, 1);
  assert.ok(!("clicks" in els.json[0]) && !("impressions" in els.json[0]));
  assert.equal((await call("GET", "/api/video/va/chapters")).json.length, 1);
  assert.deepEqual((await call("GET", "/api/video/missing/chapters")).json, []);
});

test("public channel episodes: public channels open, private channels only for their owner", async () => {
  assert.equal((await call("GET", "/api/video-channels/cpub/episodes")).status, 200);
  assert.equal((await call("GET", "/api/video-channels/cpriv/episodes")).status, 404);
  assert.equal((await call("GET", "/api/video-channels/cpriv/episodes", { user: B })).status, 404);
  assert.equal((await call("GET", "/api/video-channels/cpriv/episodes", { user: A })).status, 200);
});

// ── Password protection ────────────────────────────────────────────────────

test("password: protected video withholds media and content until unlocked", async () => {
  const locked = await call("GET", "/api/video/vp/public");
  assert.equal(locked.status, 200);
  assert.equal(locked.json.passwordRequired, true);
  assert.equal(locked.json.videoUrl, "", "media URL withheld (empty string so players don't crash)");
  assert.equal(locked.json.captionUrl, null);
  assert.ok(!("passwordHash" in locked.json));
  for (const sub of ["chapters", "ctas", "interactive"]) {
    assert.deepEqual((await call("GET", `/api/video/vp/${sub}`)).json, [], sub);
  }

  assert.equal((await call("POST", "/api/video/vp/unlock", { body: { password: "wrong" } })).status, 401);
  assert.equal((await call("POST", "/api/video/vp/unlock", { body: {} })).status, 401);

  const unlock = await call("POST", "/api/video/vp/unlock", { body: { password: "open sesame" } });
  assert.equal(unlock.status, 200);
  const token = unlock.json.token as string;
  assert.ok(token);

  const viaHeader = await call("GET", "/api/video/vp/public", { headers: { "x-video-access": token } });
  assert.equal(viaHeader.json.videoUrl, "https://cdn.test/p.mp4");
  assert.equal(viaHeader.json.passwordRequired, false);
  const viaQuery = await call("GET", `/api/video/vp/chapters?access=${encodeURIComponent(token)}`);
  assert.equal(viaQuery.json.length, 1);

  // A token is bound to its video.
  const other = await call("GET", "/api/video/vl/public", { headers: { "x-video-access": token } });
  assert.equal(other.json.videoUrl, "");
  // Garbage / tampered tokens don't unlock.
  for (const bad of ["x", "9999999999.AAAA", token.replace(/.$/, c => (c === "A" ? "B" : "A"))]) {
    assert.equal((await call("GET", "/api/video/vp/public", { headers: { "x-video-access": bad } })).json.videoUrl, "", bad);
  }
});

test("password: changing the password revokes existing tokens; clearing it reopens the video", async () => {
  const token = (await call("POST", "/api/video/vp/unlock", { body: { password: "open sesame" } })).json.token;
  const set = await call("PATCH", "/api/video-events/vp/settings", { user: A, body: { passwordHash: "new pass" } });
  assert.equal(set.status, 200);
  assert.ok(!("passwordHash" in set.json), "owner response never echoes the stored value");
  assert.equal(set.json.passwordProtected, true);
  assert.match(db.videos.get("vp")!.passwordHash, /^scrypt\$/, "stored hashed, not plaintext");
  assert.ok(verifyVideoPassword(db.videos.get("vp")!.passwordHash, "new pass"));

  assert.equal((await call("GET", "/api/video/vp/public", { headers: { "x-video-access": token } })).json.videoUrl, "");

  const cleared = await call("PATCH", "/api/video-events/vp", { user: A, body: { passwordHash: "" } });
  assert.equal(cleared.json.passwordProtected, false);
  assert.equal((await call("GET", "/api/video/vp/public")).json.videoUrl, "https://cdn.test/p.mp4");
});

test("password: legacy plaintext values (set before this change) still verify", async () => {
  assert.equal((await call("GET", "/api/video/vl/public")).json.passwordRequired, true);
  assert.equal((await call("POST", "/api/video/vl/unlock", { body: { password: "nope" } })).status, 401);
  const r = await call("POST", "/api/video/vl/unlock", { body: { password: "legacy-plain" } });
  assert.equal(r.status, 200);
  assert.ok(r.json.token);
  // Unprotected video: unlock is a harmless no-op.
  assert.deepEqual((await call("POST", "/api/video/va/unlock", { body: { password: "x" } })).json, { ok: true, passwordRequired: false });
});

test("password: owner reads never include the stored value", async () => {
  const r = await call("GET", "/api/video-events/vl", { user: A });
  assert.equal(r.status, 200);
  assert.ok(!("passwordHash" in r.json));
  assert.equal(r.json.passwordProtected, true);
});

test("password: unlock attempts are rate limited per IP + video", async () => {
  const limited = await listen(makeApp()); // default limiter: 10 per 15 min
  try {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await fetch(`${limited.base}/api/video/vp/unlock`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: `guess-${i}` }),
      });
      statuses.push(res.status);
    }
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
    assert.equal(statuses[10], 429);
  } finally {
    await new Promise<void>(r => limited.server.close(() => r()));
  }
});

// ── Compatibility: payloads exactly as the existing UI sends them ──────────

test("owner payloads copied from the current client forms are accepted", async () => {
  // PlatformView CTA form defaults (disappearAt is "" from an empty number input).
  const cta = await call("POST", "/api/video-events/va/ctas", { user: A, body: { type: "button", text: "Grab it", url: "", appearAt: 0, disappearAt: "", style: "gold", isActive: true } });
  assert.equal(cta.status, 201, JSON.stringify(cta.json));
  assert.equal(cta.json.disappearAt, null);
  const cta2 = await call("POST", "/api/video-events/va/ctas", { user: A, body: { type: "banner", text: "Later", url: "https://x.test", appearAt: 5, disappearAt: "45", style: "red", isActive: true } });
  assert.equal(cta2.json.disappearAt, 45);
  // PlatformView chapter + collection forms.
  assert.equal((await call("POST", "/api/video-events/va/chapters", { user: A, body: { title: "Ch", startSeconds: 0, description: "" } })).status, 201);
  assert.equal((await call("POST", "/api/video-collections", { user: A, body: { title: "Col", description: "", isPublic: false } })).status, 200);
  // HostingFeatures A/B form defaults (videoBId "" until chosen).
  assert.equal((await call("POST", "/api/video-ab-tests", { user: A, body: { name: "T", videoAId: "va", videoBId: "", testType: "video", splitRatio: 50 } })).status, 201);
  // HostingFeatures channel form defaults.
  assert.equal((await call("POST", "/api/video-channels", { user: A, body: { name: "C", description: "", slug: "", theme: "dark", accentColor: "#d4b461", coverUrl: "", logoUrl: "", subscribable: true, isPublic: true } })).status, 201);
  // HostingFeatures interactive "annotation" (undefined fields are dropped by JSON) and "cta".
  assert.equal((await call("POST", "/api/video-events/va/interactive", { user: A, body: { type: "annotation", timestamp: 12, endTimestamp: null, isActive: true, text: "Hi", url: undefined } })).status, 201);
  assert.equal((await call("POST", "/api/video-events/va/interactive", { user: A, body: { type: "cta", timestamp: 0, endTimestamp: 30, isActive: true, ctaType: "text", ctaText: "Go", ctaButtonText: "Buy", ctaButtonUrl: "https://x.test", ctaPosition: "center" } })).status, 201);
  // HostingFeatures chapter form; PlatformView CTA toggle; A/B status toggle.
  assert.equal((await call("POST", "/api/video-events/va/chapters", { user: A, body: { title: "T", startSeconds: 65, description: null } })).status, 201);
  assert.equal((await call("PATCH", "/api/video-ctas/1", { user: A, body: { isActive: false } })).status, 200);
  assert.equal((await call("PATCH", "/api/video-ab-tests/aa", { user: A, body: { status: "paused" } })).status, 200);
  // Collection item add (PlatformView) and dubbing request.
  assert.equal((await call("POST", "/api/video-collections/1/items", { user: A, body: { videoEventId: "vp" } })).status, 200);
  assert.equal((await call("POST", "/api/video-events/va/dub", { user: A, body: { languages: ["es", "fr"] } })).status, 201);
});

test("NOT NULL integer fields reject blanks instead of writing null", async () => {
  const before = snapshot();
  assert.equal((await call("PATCH", "/api/video-chapters/1", { user: A, body: { startSeconds: "" } })).status, 400);
  assert.equal((await call("PATCH", "/api/video-ctas/1", { user: A, body: { appearAt: null } })).status, 400);
  assert.equal(snapshot(), before);
});
