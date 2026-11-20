/**
 * YouTube Live integration for Webinar Funnels (per user).
 *
 *   POST /api/webinar-funnels/:id/youtube/broadcast  create (or re-sync) the caller's liveBroadcast + liveStream
 *   GET  /api/webinar-funnels/:id/youtube/status     broadcast lifeCycleStatus + stream status/health
 *   POST /api/webinar-funnels/:id/youtube/replay     after the webinar ends, store the recording as the replay
 *
 * Every call uses the caller's own youtube_tokens row (see getAuthedYoutubeClient in
 * routes.ts). This module has no DB/googleapis imports so it can be unit-tested
 * with a mocked YouTube client: everything external comes in through `deps`.
 */
import type { Express, Request, Response } from "express";
import type { WebinarFunnel } from "@shared/schema";

type RequireAuth = (req: Request, res: Response, next: Function) => any;

/** The subset of googleapis' youtube_v3.Youtube that we use (lets tests pass a plain mock). */
export interface YoutubeLiveClient {
  liveBroadcasts: {
    insert(params: any): Promise<{ data: any }>;
    update(params: any): Promise<{ data: any }>;
    bind(params: any): Promise<{ data: any }>;
    list(params: any): Promise<{ data: any }>;
  };
  liveStreams: {
    insert(params: any): Promise<{ data: any }>;
    list(params: any): Promise<{ data: any }>;
  };
  videos: {
    list(params: any): Promise<{ data: any }>;
  };
}

export type WebinarYoutubeUpdates = Partial<Pick<WebinarFunnel,
  "youtubeVideoId" | "replayUrl" | "youtubeBroadcastId" | "youtubeStreamId" | "youtubeStreamKey" | "youtubeIngestionAddress">>;

export interface WebinarYoutubeDeps {
  getOwnedFunnel(id: string, userId: string): Promise<WebinarFunnel | undefined>;
  /** Connected channel for the user, or null when they haven't connected YouTube. */
  getConnection(userId: string): Promise<{ channelId: string | null; channelTitle: string | null } | null>;
  /** Authenticated client for the user (refreshes expired access tokens). */
  getClient(userId: string): Promise<YoutubeLiveClient>;
  updateFunnel(id: string, userId: string, updates: WebinarYoutubeUpdates): Promise<WebinarFunnel | undefined>;
  encrypt(v: string): string;
  decrypt(v: string): string;
  isConfigured(): boolean;
  now?: () => number;
}

export const YT_NOT_CONFIGURED_MESSAGE =
  "YouTube integration isn't configured on this server yet (YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET missing). Ask the Oravini admin to add them.";
export const YT_CONNECT_FIRST_MESSAGE =
  "Connect YouTube first — go to Settings → Connections (or click “Connect YouTube”) and sign in with the channel you'll stream from.";

export const watchUrlFor = (broadcastId: string) => `https://www.youtube.com/watch?v=${broadcastId}`;
export const studioUrlFor = (broadcastId: string) => `https://studio.youtube.com/video/${broadcastId}/livestreaming`;

const MAX_TITLE = 100;   // YouTube rejects broadcast titles over 100 chars
const MAX_DESC = 5000;

/** YouTube refuses broadcasts scheduled in the past, so clamp to "a minute from now". */
export function broadcastStartTime(scheduledAt: Date | string, now = Date.now()): string {
  const t = new Date(scheduledAt).getTime();
  const min = now + 60_000;
  return new Date(Number.isFinite(t) && t > min ? t : min).toISOString();
}

function cleanTitle(title: string) {
  // YouTube also rejects "<" and ">" in titles.
  const t = String(title || "Live webinar").replace(/[<>]/g, "").trim() || "Live webinar";
  return t.length > MAX_TITLE ? t.slice(0, MAX_TITLE - 1).trimEnd() + "…" : t;
}

/** Request body for liveBroadcasts.insert / update. */
export function buildBroadcastRequest(funnel: Pick<WebinarFunnel, "title" | "description" | "scheduledAt">, now = Date.now()) {
  return {
    part: ["snippet", "status", "contentDetails"],
    requestBody: {
      snippet: {
        title: cleanTitle(funnel.title),
        description: (funnel.description || "").replace(/[<>]/g, "").slice(0, MAX_DESC),
        scheduledStartTime: broadcastStartTime(funnel.scheduledAt, now),
      },
      status: {
        privacyStatus: "unlisted",
        selfDeclaredMadeForKids: false,
      },
      contentDetails: {
        enableAutoStart: false,     // host clicks "Go live" in Studio after checking the preview
        enableAutoStop: true,
        enableDvr: true,
        recordFromStart: true,      // needed for the replay
        enableEmbed: true,          // the Oravini watch page embeds this broadcast
        monitorStream: { enableMonitorStream: true },
      },
    },
  };
}

/** Request body for liveStreams.insert (RTMP ingestion, 1080p). */
export function buildStreamRequest(funnel: Pick<WebinarFunnel, "title">) {
  return {
    part: ["snippet", "cdn", "contentDetails", "status"],
    requestBody: {
      snippet: { title: `${cleanTitle(funnel.title).slice(0, 80)} · Oravini` },
      cdn: { ingestionType: "rtmp", resolution: "1080p", frameRate: "30fps" },
      contentDetails: { isReusable: false },
    },
  };
}

export type CreatedBroadcast = {
  broadcastId: string;
  streamId: string;
  streamKey: string;
  ingestionAddress: string;
  watchUrl: string;
  studioUrl: string;
};

/** insert broadcast → insert stream → bind. */
export async function createLiveBroadcast(yt: YoutubeLiveClient, funnel: Pick<WebinarFunnel, "title" | "description" | "scheduledAt">, now = Date.now()): Promise<CreatedBroadcast> {
  const b = await yt.liveBroadcasts.insert(buildBroadcastRequest(funnel, now));
  const broadcastId: string | undefined = b.data?.id;
  if (!broadcastId) throw new Error("YouTube didn't return a broadcast id");

  const s = await yt.liveStreams.insert(buildStreamRequest(funnel));
  const streamId: string | undefined = s.data?.id;
  const ingestion = s.data?.cdn?.ingestionInfo || {};
  if (!streamId || !ingestion.streamName || !ingestion.ingestionAddress) throw new Error("YouTube didn't return stream ingestion details");

  await yt.liveBroadcasts.bind({ id: broadcastId, streamId, part: ["id", "contentDetails"] });

  return {
    broadcastId,
    streamId,
    streamKey: ingestion.streamName,
    ingestionAddress: ingestion.ingestionAddress,
    watchUrl: watchUrlFor(broadcastId),
    studioUrl: studioUrlFor(broadcastId),
  };
}

/** Turns googleapis errors into something a creator can act on. Returns [httpStatus, message]. */
export function describeYoutubeError(err: any): [number, string] {
  const status: number = err?.code ?? err?.status ?? err?.response?.status ?? 500;
  const reasons: string[] = (err?.errors || err?.response?.data?.error?.errors || []).map((e: any) => e?.reason).filter(Boolean);
  const raw: string = err?.response?.data?.error?.message || err?.message || "YouTube request failed";
  const has = (r: string) => reasons.includes(r) || raw.includes(r);

  if (has("invalid_grant") || /token expired|reconnect/i.test(raw) || status === 401) {
    return [400, "Your YouTube connection has expired. Reconnect YouTube and try again."];
  }
  if (has("insufficientPermissions") || has("ACCESS_TOKEN_SCOPE_INSUFFICIENT") || /insufficient.*scope/i.test(raw)) {
    return [400, "Reconnect YouTube to grant Oravini permission to manage live streams (your current connection was made before live streaming was supported)."];
  }
  if (has("liveStreamingNotEnabled") || has("livePermissionBlocked")) {
    return [400, "Live streaming isn't enabled on your YouTube channel yet. Enable it at youtube.com/features (it can take up to 24 hours the first time), then try again."];
  }
  if (has("invalidScheduledStartTime")) return [400, "YouTube rejected the go-live time. Pick a time in the future and try again."];
  if (has("quotaExceeded") || has("rateLimitExceeded") || has("userRateLimitExceeded")) {
    return [429, "YouTube is rate-limiting requests right now. Wait a minute and try again."];
  }
  if (status === 404 || has("liveBroadcastNotFound")) return [404, "That broadcast no longer exists on YouTube. Create a new stream."];
  return [502, `YouTube error: ${raw}`];
}

const p = (v: unknown) => String(Array.isArray(v) ? v[0] : v ?? "");

export function registerWebinarYoutubeRoutes(app: Express, requireAuth: RequireAuth, deps: WebinarYoutubeDeps) {
  const now = () => (deps.now ? deps.now() : Date.now());

  /** Shared guard: config → ownership → connection. Sends the error response and returns null on failure. */
  async function prepare(req: Request, res: Response) {
    if (!deps.isConfigured()) { res.status(503).json({ message: YT_NOT_CONFIGURED_MESSAGE, code: "youtube_not_configured" }); return null; }
    const userId = (req.user as any).id as string;
    const funnel = await deps.getOwnedFunnel(p(req.params.id), userId);
    if (!funnel) { res.status(404).json({ message: "Not found" }); return null; }
    const connection = await deps.getConnection(userId);
    if (!connection) { res.status(400).json({ message: YT_CONNECT_FIRST_MESSAGE, code: "youtube_not_connected" }); return null; }
    return { userId, funnel, connection };
  }

  const fail = (res: Response, tag: string, err: any) => {
    const [status, message] = describeYoutubeError(err);
    console.error(`[webinar-youtube] ${tag}:`, err?.message || err);
    res.status(status).json({ message });
  };

  app.post("/api/webinar-funnels/:id/youtube/broadcast", requireAuth, async (req: Request, res: Response) => {
    const ctx = await prepare(req, res);
    if (!ctx) return;
    const { userId, funnel, connection } = ctx;
    try {
      const yt = await deps.getClient(userId);

      // Already created → keep the same stream key (OBS stays configured) and just
      // re-sync title/time so a rescheduled webinar stays in step with YouTube.
      if (funnel.youtubeBroadcastId && funnel.youtubeStreamKey && req.body?.recreate !== true) {
        const id = funnel.youtubeBroadcastId;
        try {
          const req0 = buildBroadcastRequest(funnel, now());
          await yt.liveBroadcasts.update({ part: ["snippet"], requestBody: { id, snippet: req0.requestBody.snippet } });
        } catch (e: any) {
          // A broadcast that's live or complete can't be rescheduled; that's fine.
          console.warn("[webinar-youtube] re-sync skipped:", e?.message);
        }
        return res.json({
          watchUrl: watchUrlFor(id),
          streamKey: deps.decrypt(funnel.youtubeStreamKey),
          ingestionAddress: funnel.youtubeIngestionAddress,
          broadcastId: id,
          studioUrl: studioUrlFor(id),
          channelTitle: connection.channelTitle,
          reused: true,
        });
      }

      const created = await createLiveBroadcast(yt, funnel, now());
      await deps.updateFunnel(funnel.id, userId, {
        youtubeBroadcastId: created.broadcastId,
        youtubeStreamId: created.streamId,
        youtubeStreamKey: deps.encrypt(created.streamKey),
        youtubeIngestionAddress: created.ingestionAddress,
        youtubeVideoId: created.broadcastId,   // the broadcast id is the watch/embed video id
      });
      res.status(201).json({
        watchUrl: created.watchUrl,
        streamKey: created.streamKey,
        ingestionAddress: created.ingestionAddress,
        broadcastId: created.broadcastId,
        studioUrl: created.studioUrl,
        channelTitle: connection.channelTitle,
      });
    } catch (err: any) {
      fail(res, "broadcast", err);
    }
  });

  app.get("/api/webinar-funnels/:id/youtube/status", requireAuth, async (req: Request, res: Response) => {
    const ctx = await prepare(req, res);
    if (!ctx) return;
    const { userId, funnel, connection } = ctx;
    const base = {
      channelTitle: connection.channelTitle,
      channelId: connection.channelId,
      broadcastId: funnel.youtubeBroadcastId,
      streamKey: funnel.youtubeStreamKey ? deps.decrypt(funnel.youtubeStreamKey) : null,
      ingestionAddress: funnel.youtubeIngestionAddress,
      watchUrl: funnel.youtubeBroadcastId ? watchUrlFor(funnel.youtubeBroadcastId) : null,
      studioUrl: funnel.youtubeBroadcastId ? studioUrlFor(funnel.youtubeBroadcastId) : null,
      replayVideoId: funnel.replayUrl,
    };
    if (!funnel.youtubeBroadcastId) return res.json({ ...base, lifeCycleStatus: null, streamStatus: null, healthStatus: null });
    try {
      const yt = await deps.getClient(userId);
      const [b, s] = await Promise.all([
        yt.liveBroadcasts.list({ part: ["status", "snippet"], id: [funnel.youtubeBroadcastId] }),
        funnel.youtubeStreamId
          ? yt.liveStreams.list({ part: ["status"], id: [funnel.youtubeStreamId] })
          : Promise.resolve({ data: { items: [] } }),
      ]);
      const broadcast = b.data?.items?.[0];
      const stream = s.data?.items?.[0];
      res.json({
        ...base,
        lifeCycleStatus: broadcast?.status?.lifeCycleStatus ?? "deleted",
        privacyStatus: broadcast?.status?.privacyStatus ?? null,
        actualStartTime: broadcast?.snippet?.actualStartTime ?? null,
        actualEndTime: broadcast?.snippet?.actualEndTime ?? null,
        streamStatus: stream?.status?.streamStatus ?? null,
        healthStatus: stream?.status?.healthStatus?.status ?? null,
      });
    } catch (err: any) {
      fail(res, "status", err);
    }
  });

  app.post("/api/webinar-funnels/:id/youtube/replay", requireAuth, async (req: Request, res: Response) => {
    const ctx = await prepare(req, res);
    if (!ctx) return;
    const { userId, funnel } = ctx;
    const broadcastId = funnel.youtubeBroadcastId || funnel.youtubeVideoId;
    if (!broadcastId) return res.status(400).json({ message: "This webinar has no YouTube stream yet." });
    try {
      const yt = await deps.getClient(userId);
      const b = await yt.liveBroadcasts.list({ part: ["status"], id: [broadcastId] }).catch(() => ({ data: { items: [] } }));
      const lifeCycle: string | undefined = b.data?.items?.[0]?.status?.lifeCycleStatus;
      if (funnel.status !== "ended" && lifeCycle !== "complete") {
        return res.status(409).json({ message: "The replay is available once the webinar has ended. End the stream in YouTube Studio (or mark the webinar as ended) and try again.", lifeCycleStatus: lifeCycle ?? null });
      }
      // A live broadcast's recording keeps the broadcast's video id.
      const v = await yt.videos.list({ part: ["status", "processingDetails", "liveStreamingDetails"], id: [broadcastId] });
      const video = v.data?.items?.[0];
      if (!video) {
        return res.status(404).json({ message: "YouTube has no recording for this broadcast. Recordings are only kept for streams under 12 hours with archiving on — upload the replay manually and paste its link." });
      }
      const processing: string | undefined = video.processingDetails?.processingStatus;
      const row = await deps.updateFunnel(funnel.id, userId, { replayUrl: video.id || broadcastId });
      res.json({
        replayVideoId: row?.replayUrl ?? (video.id || broadcastId),
        replayUrl: watchUrlFor(video.id || broadcastId),
        processing: processing && processing !== "succeeded" ? processing : null,
        privacyStatus: video.status?.privacyStatus ?? null,
      });
    } catch (err: any) {
      fail(res, "replay", err);
    }
  });
}
