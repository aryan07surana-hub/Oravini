// Run with: npm test
import { test, describe, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "net";
import { google } from "googleapis";
import {
  buildBroadcastRequest, buildStreamRequest, createLiveBroadcast, broadcastStartTime, describeYoutubeError,
  registerWebinarYoutubeRoutes, YT_CONNECT_FIRST_MESSAGE, YT_NOT_CONFIGURED_MESSAGE, type WebinarYoutubeDeps,
} from "../server/webinarYoutube";

const NOW = Date.parse("2026-11-20T10:00:00.000Z");
const funnel = (over: Record<string, any> = {}) => ({
  id: "wf_1", userId: "u_1", slug: "s", title: "Get your first 10 clients", description: "Live Q&A <b>",
  hostName: null, scheduledAt: new Date("2026-12-01T14:30:00.000Z"), youtubeVideoId: null, ctaText: null, ctaUrl: null,
  status: "draft", createdAt: null, deckUrl: null, replayUrl: null, offerText: null, offerPrice: null, offerExpiresAt: null,
  durationMinutes: 60, remindersEnabled: true, youtubeBroadcastId: null, youtubeStreamId: null, youtubeStreamKey: null,
  youtubeIngestionAddress: null, ...over,
}) as any;

/** A real googleapis youtube client with the network methods replaced by mocks. */
function mockedYoutube(over: { broadcast?: any; stream?: any } = {}) {
  const yt = google.youtube({ version: "v3" });
  const insertBroadcast = mock.method(yt.liveBroadcasts, "insert", async () => ({ data: over.broadcast ?? { id: "bcast123456" } }) as any);
  const insertStream = mock.method(yt.liveStreams, "insert", async () => ({
    data: over.stream ?? { id: "stream_1", cdn: { ingestionInfo: { streamName: "abcd-efgh-ijkl", ingestionAddress: "rtmp://a.rtmp.youtube.com/live2" } } },
  }) as any);
  const bind = mock.method(yt.liveBroadcasts, "bind", async () => ({ data: {} }) as any);
  return { yt, insertBroadcast, insertStream, bind };
}

describe("broadcast request mapping", () => {
  test("maps title, scheduledStartTime, unlisted privacy and monitor stream", () => {
    const req = buildBroadcastRequest(funnel(), NOW);
    assert.deepEqual(req.part, ["snippet", "status", "contentDetails"]);
    assert.equal(req.requestBody.snippet.title, "Get your first 10 clients");
    assert.equal(req.requestBody.snippet.scheduledStartTime, "2026-12-01T14:30:00.000Z");
    assert.equal(req.requestBody.snippet.description, "Live Q&A b"); // YouTube rejects < and >
    assert.equal(req.requestBody.status.privacyStatus, "unlisted");
    assert.equal(req.requestBody.contentDetails.monitorStream.enableMonitorStream, true);
    assert.equal(req.requestBody.contentDetails.recordFromStart, true);
    assert.equal(req.requestBody.contentDetails.enableEmbed, true);
  });

  test("clamps a past go-live time to the near future and truncates long titles", () => {
    const req = buildBroadcastRequest(funnel({ scheduledAt: new Date(NOW - 3_600_000), title: "x".repeat(150) }), NOW);
    assert.equal(req.requestBody.snippet.scheduledStartTime, new Date(NOW + 60_000).toISOString());
    assert.ok(req.requestBody.snippet.title.length <= 100);
    assert.equal(broadcastStartTime("not a date", NOW), new Date(NOW + 60_000).toISOString());
  });

  test("stream request is RTMP 1080p", () => {
    const req = buildStreamRequest(funnel());
    assert.equal(req.requestBody.cdn.ingestionType, "rtmp");
    assert.equal(req.requestBody.cdn.resolution, "1080p");
    assert.ok(req.part.includes("cdn"));
  });

  test("createLiveBroadcast inserts broadcast + stream, binds them, returns ingestion details", async () => {
    const { yt, insertBroadcast, insertStream, bind } = mockedYoutube();
    const out = await createLiveBroadcast(yt as any, funnel(), NOW);

    assert.equal(insertBroadcast.mock.callCount(), 1);
    const bReq: any = insertBroadcast.mock.calls[0].arguments[0];
    assert.equal(bReq.requestBody.status.privacyStatus, "unlisted");
    assert.equal(bReq.requestBody.snippet.scheduledStartTime, "2026-12-01T14:30:00.000Z");

    assert.equal(insertStream.mock.callCount(), 1);
    const sReq: any = insertStream.mock.calls[0].arguments[0];
    assert.equal(sReq.requestBody.cdn.resolution, "1080p");

    assert.equal(bind.mock.callCount(), 1);
    assert.deepEqual(bind.mock.calls[0].arguments[0], { id: "bcast123456", streamId: "stream_1", part: ["id", "contentDetails"] });

    assert.deepEqual(out, {
      broadcastId: "bcast123456",
      streamId: "stream_1",
      streamKey: "abcd-efgh-ijkl",
      ingestionAddress: "rtmp://a.rtmp.youtube.com/live2",
      watchUrl: "https://www.youtube.com/watch?v=bcast123456",
      studioUrl: "https://studio.youtube.com/video/bcast123456/livestreaming",
    });
  });

  test("fails clearly when YouTube returns no ingestion info (and does not bind)", async () => {
    const { yt, bind } = mockedYoutube({ stream: { id: "s" } });
    await assert.rejects(createLiveBroadcast(yt as any, funnel(), NOW), /ingestion/);
    assert.equal(bind.mock.callCount(), 0);
  });

  test("describeYoutubeError maps common failures to actionable messages", () => {
    assert.match(describeYoutubeError({ code: 403, errors: [{ reason: "insufficientPermissions" }] })[1], /Reconnect YouTube/);
    assert.match(describeYoutubeError({ code: 403, errors: [{ reason: "liveStreamingNotEnabled" }] })[1], /youtube\.com\/features/);
    assert.match(describeYoutubeError({ message: "invalid_grant" })[1], /expired/);
  });
});

describe("webinar YouTube endpoints: auth + connection checks", () => {
  let base = "";
  let server: any;
  let connected = false;
  let configured = true;
  const updates: any[] = [];

  before(async () => {
    const app = express();
    app.use(express.json());
    // Same contract as requireAuth in server/routes.ts; tests log in with an x-test-user header.
    app.use((req: any, _res, next) => {
      const uid = req.headers["x-test-user"];
      req.user = uid ? { id: uid } : undefined;
      req.isAuthenticated = () => !!uid;
      next();
    });
    const requireAuth = (req: any, res: any, next: Function) => {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      next();
    };
    const { yt } = mockedYoutube();
    const deps: WebinarYoutubeDeps = {
      getOwnedFunnel: async (id, userId) => (id === "wf_1" && userId === "u_1" ? funnel() : undefined),
      getConnection: async () => (connected ? { channelId: "UC1", channelTitle: "My Channel" } : null),
      getClient: async () => yt as any,
      updateFunnel: async (_id, _u, u) => { updates.push(u); return funnel(u); },
      encrypt: (v) => `enc(${v})`,
      decrypt: (v) => v.replace(/^enc\((.*)\)$/, "$1"),
      isConfigured: () => configured,
      now: () => NOW,
    };
    registerWebinarYoutubeRoutes(app as any, requireAuth, deps);
    await new Promise<void>((r) => { server = app.listen(0, () => r()); });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(() => server?.close());

  const call = (method: string, path: string, user?: string) =>
    fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) }, body: method === "GET" ? undefined : "{}" });

  const endpoints: [string, string][] = [
    ["POST", "/api/webinar-funnels/wf_1/youtube/broadcast"],
    ["GET", "/api/webinar-funnels/wf_1/youtube/status"],
    ["POST", "/api/webinar-funnels/wf_1/youtube/replay"],
  ];

  for (const [method, path] of endpoints) {
    test(`${method} ${path} → 401 without login`, async () => {
      const r = await call(method, path);
      assert.equal(r.status, 401);
    });
    test(`${method} ${path} → 400 "connect YouTube first" without a connected channel`, async () => {
      connected = false;
      const r = await call(method, path, "u_1");
      assert.equal(r.status, 400);
      const body = await r.json();
      assert.equal(body.message, YT_CONNECT_FIRST_MESSAGE);
      assert.equal(body.code, "youtube_not_connected");
    });
  }

  test("returns a clear message when YouTube OAuth isn't configured on the server", async () => {
    configured = false;
    try {
      const r = await call("POST", "/api/webinar-funnels/wf_1/youtube/broadcast", "u_1");
      assert.equal(r.status, 503);
      assert.equal((await r.json()).message, YT_NOT_CONFIGURED_MESSAGE);
    } finally { configured = true; }
  });

  test("another user's webinar → 404", async () => {
    connected = true;
    const r = await call("POST", "/api/webinar-funnels/wf_1/youtube/broadcast", "u_2");
    assert.equal(r.status, 404);
  });

  test("connected owner creates the broadcast; stream key is stored encrypted", async () => {
    connected = true;
    updates.length = 0;
    const r = await call("POST", "/api/webinar-funnels/wf_1/youtube/broadcast", "u_1");
    assert.equal(r.status, 201);
    const body = await r.json();
    assert.equal(body.watchUrl, "https://www.youtube.com/watch?v=bcast123456");
    assert.equal(body.streamKey, "abcd-efgh-ijkl");
    assert.equal(body.ingestionAddress, "rtmp://a.rtmp.youtube.com/live2");
    assert.equal(body.broadcastId, "bcast123456");
    assert.equal(body.studioUrl, "https://studio.youtube.com/video/bcast123456/livestreaming");
    assert.deepEqual(updates[0], {
      youtubeBroadcastId: "bcast123456",
      youtubeStreamId: "stream_1",
      youtubeStreamKey: "enc(abcd-efgh-ijkl)",
      youtubeIngestionAddress: "rtmp://a.rtmp.youtube.com/live2",
      youtubeVideoId: "bcast123456",
    });
  });
});
