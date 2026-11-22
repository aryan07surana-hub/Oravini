/**
 * Video hosting: owner-scoped management routes + public viewer routes.
 *
 * Before this module, most per-video management endpoints (read/delete a video,
 * chapters, CTAs, viewers, interactive elements, collections, A/B tests,
 * channels, dubbing, collaboration comments, per-video analytics) took an id from
 * the URL and read or wrote it with no owner check, and several accepted
 * `req.body` verbatim. server/routes/video-hosting.ts duplicated some of them.
 *
 * Rules applied here:
 *  - Management routes require sign-in, and the target must belong to the caller.
 *    For a child resource (chapter, CTA, element, item, episode, comment...) the
 *    child is loaded first and its *actual* parent is checked. A parent/child id
 *    supplied in the URL or body is never trusted on its own.
 *  - Linking resources (video → collection, video → channel, video → A/B test)
 *    requires the caller to own both sides.
 *  - Missing and not-yours both answer 404, so other accounts' ids aren't confirmed.
 *  - Create/update payloads go through allowlists; owner, parent and counter
 *    fields (userId, videoEventId, clicks, plays, subscriberCount...) can't be set.
 *  - Public viewer routes keep working for embeds, but return no management data
 *    (owner id, password, domain whitelist, edit metadata, click/impression
 *    counts), and honour video password protection (see ./videoPassword).
 */

import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { IStorage } from "./storage";
import type { VideoEvent } from "@shared/schema";
import { sanitizeFields, redactVideoForOwner, type FieldSpec } from "./videoEventUpdate";
import {
  isVideoProtected,
  verifyVideoPassword,
  createVideoAccessToken,
  verifyVideoAccessToken,
  VIDEO_ACCESS_TTL_SECONDS,
} from "./videoPassword";

export type VideoManagementStore = Pick<IStorage,
  | "getVideoEvent" | "deleteVideoEvent"
  | "getVideoChapters" | "getVideoChapter" | "createVideoChapter" | "updateVideoChapter" | "deleteVideoChapter"
  | "getVideoCtas" | "getVideoCta" | "createVideoCta" | "updateVideoCta" | "deleteVideoCta"
  | "getVideoViewerSessions" | "getViewerSession" | "createViewerSession" | "updateViewerSession"
  | "getVideoInteractiveElements" | "getVideoInteractiveElement" | "createVideoInteractiveElement"
  | "updateVideoInteractiveElement" | "deleteVideoInteractiveElement"
  | "createVideoCollection" | "getVideoCollection" | "updateVideoCollection" | "deleteVideoCollection"
  | "getVideoCollectionItems" | "getVideoCollectionItem" | "addVideoToCollection" | "removeVideoFromCollection"
  | "createVideoAbTest" | "getVideoAbTest" | "updateVideoAbTest" | "deleteVideoAbTest"
  | "createVideoChannel" | "getVideoChannel" | "updateVideoChannel" | "deleteVideoChannel"
  | "getChannelEpisodes" | "getChannelEpisode" | "addChannelEpisode" | "removeChannelEpisode"
  | "getVideoDubbingJobs" | "createVideoDubbingJob"
  | "getVideoCollabComments" | "getVideoCollabComment" | "createVideoCollabComment"
  | "updateVideoCollabComment" | "deleteVideoCollabComment"
  | "getVideoHeatmap" | "getVideoViewerProfiles" | "getVideoDailyStats"
  | "getVideoAnalyticsEvents" | "getVideoAnalyticsSummary"
>;

// ── Allowed fields per resource ────────────────────────────────────────────

export const CHAPTER_FIELDS: FieldSpec = { title: "text", description: "nullableText", startSeconds: "intRequired" };
export const CTA_FIELDS: FieldSpec = {
  text: "text", url: "nullableText", type: "text", style: "text",
  appearAt: "intRequired", disappearAt: "int", isActive: "bool",
};
export const INTERACTIVE_FIELDS: FieldSpec = {
  type: "text", timestamp: "intRequired", endTimestamp: "int", text: "nullableText", url: "nullableText",
  requireEmail: "bool", requireName: "bool", skipAllowed: "bool",
  ctaType: "nullableText", ctaText: "nullableText", ctaButtonText: "nullableText", ctaButtonUrl: "nullableText",
  ctaImageUrl: "nullableText", ctaHtml: "nullableText", ctaPosition: "nullableText", isActive: "bool",
};
export const COLLECTION_FIELDS: FieldSpec = {
  title: "text", description: "nullableText", thumbnailUrl: "nullableText", isPublic: "bool",
};
export const AB_TEST_FIELDS: FieldSpec = {
  name: "text", testType: "text", videoAId: "ref", videoBId: "ref",
  variantAConfig: "nullableText", variantBConfig: "nullableText",
  splitRatio: "intRequired", status: "text", endedAt: "date",
};
export const CHANNEL_FIELDS: FieldSpec = {
  name: "text", description: "nullableText", slug: "ref", theme: "text", accentColor: "nullableText",
  coverUrl: "nullableText", logoUrl: "nullableText", subscribable: "bool", isPublic: "bool",
};
export const COLLAB_COMMENT_FIELDS: FieldSpec = { text: "text", timestamp: "int", resolved: "bool" };
export const VIEWER_SESSION_CREATE_FIELDS: FieldSpec = {
  videoEventId: "ref", visitorId: "text", watchedSeconds: "intRequired", completionPct: "intRequired",
  heatmapData: "nullableText", ctaClicked: "bool", country: "nullableText", referrer: "nullableText",
};
export const VIEWER_SESSION_PROGRESS_FIELDS: FieldSpec = {
  watchedSeconds: "intRequired", completionPct: "intRequired", heatmapData: "nullableText", ctaClicked: "bool",
};

const AB_STATUSES = new Set(["running", "paused", "ended"]);

// ── Helpers ────────────────────────────────────────────────────────────────

function param(req: Request, name: string): string {
  const v = (req.params as any)[name];
  return Array.isArray(v) ? v[0] : v;
}

function intParam(req: Request, name: string): number | null {
  const s = param(req, name);
  if (!s || !/^\d{1,10}$/.test(s)) return null;
  return Number(s);
}

function userId(req: Request): string | null {
  const u = req.user as { id?: string } | undefined;
  return u?.id ? String(u.id) : null;
}

const notFound = (res: Response, what = "Not found") => res.status(404).json({ message: what });

function owns(row: { userId?: string | null } | undefined | null, uid: string): boolean {
  return !!row && String(row.userId) === uid;
}

/** Wrap an owner-only handler: 401 when signed out, 500 on unexpected errors. */
function authed(fn: (req: Request, res: Response, uid: string) => Promise<unknown>): RequestHandler {
  return async (req, res) => {
    try {
      const uid = userId(req);
      if (!uid) return res.status(401).json({ message: "Unauthorized" });
      await fn(req, res, uid);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };
}

function publicRoute(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return async (req, res) => {
    try { await fn(req, res); } catch (err: any) { res.status(500).json({ message: err.message }); }
  };
}

function bad(res: Response, message: string) {
  return res.status(400).json({ message });
}

// ── Public payload shaping ─────────────────────────────────────────────────

const PRIVATE_VIDEO_FIELDS = ["userId", "passwordHash", "domainWhitelist", "editMetadata", "approvalStatus"] as const;

function readAccessToken(req: Request): unknown {
  return req.header("x-video-access") ?? (typeof req.query.access === "string" ? req.query.access : undefined);
}

/** True when a viewer may see the video's media/content (unprotected, or valid unlock token). */
export function viewerUnlocked(video: VideoEvent, req: Request): boolean {
  if (!isVideoProtected(video.passwordHash)) return true;
  return verifyVideoAccessToken(video.id, video.passwordHash, readAccessToken(req));
}

export function publicVideoPayload(video: VideoEvent, unlocked: boolean) {
  const safe: Record<string, unknown> = { ...video };
  for (const k of PRIVATE_VIDEO_FIELDS) delete safe[k];
  const passwordRequired = isVideoProtected(video.passwordHash) && !unlocked;
  if (passwordRequired) {
    // Empty string (not undefined) so existing players render a blank state instead of crashing.
    safe.videoUrl = "";
    safe.captionUrl = null;
  }
  safe.passwordRequired = passwordRequired;
  return safe;
}

function stripCounters<T extends Record<string, any>>(row: T, keys: string[]): Omit<T, never> {
  const out: Record<string, any> = { ...row };
  for (const k of keys) delete out[k];
  return out as T;
}

// ── Registration ───────────────────────────────────────────────────────────

export interface VideoManagementOptions {
  /** Rate limiter for POST /api/video/:id/unlock (tests may pass a pass-through). */
  unlockLimiter?: RequestHandler;
}

export function defaultUnlockLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many password attempts. Please try again in 15 minutes." },
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}-video-${String((req.params as any).id ?? "")}`,
  });
}

export function registerVideoManagementRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => unknown,
  store: VideoManagementStore,
  opts: VideoManagementOptions = {},
) {
  const ownedVideo = async (id: string | null | undefined, uid: string) => {
    if (!id) return undefined;
    const v = await store.getVideoEvent(id);
    return owns(v, uid) ? v : undefined;
  };

  // ── Video read / delete ──────────────────────────────────────────────────
  app.get("/api/video-events/:id", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    res.json(redactVideoForOwner(video));
  }));

  app.delete("/api/video-events/:id", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    await store.deleteVideoEvent(video.id);
    res.json({ message: "Deleted" });
  }));

  // ── Chapters ─────────────────────────────────────────────────────────────
  app.get("/api/video-events/:id/chapters", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    res.json(await store.getVideoChapters(video.id));
  }));

  app.post("/api/video-events/:id/chapters", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    const r = sanitizeFields<any>(req.body, CHAPTER_FIELDS, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    if (!r.data.title) return bad(res, "title required");
    const chapter = await store.createVideoChapter({
      videoEventId: video.id, title: r.data.title,
      description: r.data.description ?? null, startSeconds: r.data.startSeconds ?? 0,
    });
    res.status(201).json(chapter);
  }));

  const ownedChapter = async (req: Request, uid: string) => {
    const id = intParam(req, "id");
    const chapter = id === null ? undefined : await store.getVideoChapter(id);
    return chapter && (await ownedVideo(chapter.videoEventId, uid)) ? chapter : undefined;
  };

  app.patch("/api/video-chapters/:id", requireAuth, authed(async (req, res, uid) => {
    const chapter = await ownedChapter(req, uid);
    if (!chapter) return notFound(res);
    const r = sanitizeFields<any>(req.body, CHAPTER_FIELDS);
    if (!r.ok) return bad(res, r.message);
    res.json(await store.updateVideoChapter(chapter.id, r.data));
  }));

  app.delete("/api/video-chapters/:id", requireAuth, authed(async (req, res, uid) => {
    const chapter = await ownedChapter(req, uid);
    if (!chapter) return notFound(res);
    await store.deleteVideoChapter(chapter.id);
    res.json({ ok: true });
  }));

  // ── CTAs ─────────────────────────────────────────────────────────────────
  app.get("/api/video-events/:id/ctas", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    res.json(await store.getVideoCtas(video.id));
  }));

  app.post("/api/video-events/:id/ctas", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    const r = sanitizeFields<any>(req.body, CTA_FIELDS, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    if (!r.data.text) return bad(res, "text required");
    const cta = await store.createVideoCta({
      videoEventId: video.id, text: r.data.text, url: r.data.url ?? null,
      type: r.data.type || "button", style: r.data.style || "gold",
      appearAt: r.data.appearAt ?? 0, disappearAt: r.data.disappearAt ?? null, isActive: r.data.isActive ?? true,
    });
    res.status(201).json(cta);
  }));

  const ownedCta = async (req: Request, uid: string) => {
    const id = intParam(req, "id");
    const cta = id === null ? undefined : await store.getVideoCta(id);
    return cta && (await ownedVideo(cta.videoEventId, uid)) ? cta : undefined;
  };

  app.patch("/api/video-ctas/:id", requireAuth, authed(async (req, res, uid) => {
    const cta = await ownedCta(req, uid);
    if (!cta) return notFound(res);
    const r = sanitizeFields<any>(req.body, CTA_FIELDS);
    if (!r.ok) return bad(res, r.message);
    res.json(await store.updateVideoCta(cta.id, r.data));
  }));

  app.delete("/api/video-ctas/:id", requireAuth, authed(async (req, res, uid) => {
    const cta = await ownedCta(req, uid);
    if (!cta) return notFound(res);
    await store.deleteVideoCta(cta.id);
    res.json({ ok: true });
  }));

  // ── Viewer sessions ──────────────────────────────────────────────────────
  app.get("/api/video-events/:id/viewers", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    res.json(await store.getVideoViewerSessions(video.id));
  }));

  // Public: a viewer starts a session on a video that exists.
  app.post("/api/video-viewer-sessions", publicRoute(async (req, res) => {
    const r = sanitizeFields<any>(req.body, VIEWER_SESSION_CREATE_FIELDS, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    if (!r.data.videoEventId || !r.data.visitorId) return bad(res, "videoEventId and visitorId required");
    const video = await store.getVideoEvent(r.data.videoEventId);
    if (!video) return notFound(res, "Video not found");
    const session = await store.createViewerSession({ ...r.data, videoEventId: video.id });
    res.status(201).json(session);
  }));

  // Public: progress update. The caller must name the session's real video and
  // visitor, and only progress fields can change.
  app.patch("/api/video-viewer-sessions/:id", publicRoute(async (req, res) => {
    const id = intParam(req, "id");
    const session = id === null ? undefined : await store.getViewerSession(id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!session || body.videoEventId !== session.videoEventId || body.visitorId !== session.visitorId) {
      return notFound(res);
    }
    const r = sanitizeFields<any>(body, VIEWER_SESSION_PROGRESS_FIELDS);
    if (!r.ok) return bad(res, r.message);
    await store.updateViewerSession(session.id, { ...r.data, lastSeenAt: new Date() } as any);
    res.json({ ok: true });
  }));

  // ── Interactive elements ─────────────────────────────────────────────────
  app.get("/api/video-events/:id/interactive", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    res.json(await store.getVideoInteractiveElements(video.id));
  }));

  app.post("/api/video-events/:id/interactive", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    const r = sanitizeFields<any>(req.body, INTERACTIVE_FIELDS, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    if (!r.data.type) return bad(res, "type required");
    const el = await store.createVideoInteractiveElement({
      ...r.data, timestamp: r.data.timestamp ?? 0, videoEventId: video.id,
    });
    res.status(201).json(el);
  }));

  const ownedElement = async (req: Request, uid: string) => {
    const id = param(req, "id");
    const el = id ? await store.getVideoInteractiveElement(id) : undefined;
    return el && (await ownedVideo(el.videoEventId, uid)) ? el : undefined;
  };

  app.patch("/api/video-interactive/:id", requireAuth, authed(async (req, res, uid) => {
    const el = await ownedElement(req, uid);
    if (!el) return notFound(res);
    const r = sanitizeFields<any>(req.body, INTERACTIVE_FIELDS);
    if (!r.ok) return bad(res, r.message);
    res.json(await store.updateVideoInteractiveElement(el.id, r.data));
  }));

  app.delete("/api/video-interactive/:id", requireAuth, authed(async (req, res, uid) => {
    const el = await ownedElement(req, uid);
    if (!el) return notFound(res);
    await store.deleteVideoInteractiveElement(el.id);
    res.json({ ok: true });
  }));

  // ── Collections ──────────────────────────────────────────────────────────
  app.post("/api/video-collections", requireAuth, authed(async (req, res, uid) => {
    const r = sanitizeFields<any>(req.body, COLLECTION_FIELDS, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    if (!r.data.title) return bad(res, "title required");
    res.json(await store.createVideoCollection({ ...r.data, userId: uid }));
  }));

  const ownedCollection = async (id: number | null, uid: string) => {
    const c = id === null ? undefined : await store.getVideoCollection(id);
    return owns(c, uid) ? c : undefined;
  };

  app.patch("/api/video-collections/:id", requireAuth, authed(async (req, res, uid) => {
    const c = await ownedCollection(intParam(req, "id"), uid);
    if (!c) return notFound(res);
    const r = sanitizeFields<any>(req.body, COLLECTION_FIELDS);
    if (!r.ok) return bad(res, r.message);
    res.json(await store.updateVideoCollection(c.id, r.data));
  }));

  app.delete("/api/video-collections/:id", requireAuth, authed(async (req, res, uid) => {
    const c = await ownedCollection(intParam(req, "id"), uid);
    if (!c) return notFound(res);
    await store.deleteVideoCollection(c.id);
    res.json({ message: "Deleted" });
  }));

  app.get("/api/video-collections/:id/items", requireAuth, authed(async (req, res, uid) => {
    const c = await ownedCollection(intParam(req, "id"), uid);
    if (!c) return notFound(res);
    res.json(await store.getVideoCollectionItems(c.id));
  }));

  app.post("/api/video-collections/:id/items", requireAuth, authed(async (req, res, uid) => {
    const c = await ownedCollection(intParam(req, "id"), uid);
    if (!c) return notFound(res);
    const r = sanitizeFields<any>(req.body, { videoEventId: "ref", sortOrder: "intRequired" }, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    const video = await ownedVideo(r.data.videoEventId, uid);
    if (!video) return notFound(res, "Video not found");
    res.json(await store.addVideoToCollection(c.id, video.id, r.data.sortOrder ?? 0));
  }));

  app.delete("/api/video-collection-items/:id", requireAuth, authed(async (req, res, uid) => {
    const id = intParam(req, "id");
    const item = id === null ? undefined : await store.getVideoCollectionItem(id);
    if (!item || !(await ownedCollection(item.collectionId, uid))) return notFound(res);
    await store.removeVideoFromCollection(item.id);
    res.json({ message: "Removed" });
  }));

  // ── A/B tests ────────────────────────────────────────────────────────────
  const checkAbVideos = async (data: Record<string, any>, uid: string): Promise<string | null> => {
    for (const k of ["videoAId", "videoBId"]) {
      if (data[k] != null && !(await ownedVideo(data[k], uid))) return "Video not found";
    }
    if (data.splitRatio != null && (data.splitRatio < 0 || data.splitRatio > 100)) return "splitRatio must be 0-100";
    if (data.status != null && !AB_STATUSES.has(data.status)) return "Invalid status";
    return null;
  };

  app.post("/api/video-ab-tests", requireAuth, authed(async (req, res, uid) => {
    const r = sanitizeFields<any>(req.body, AB_TEST_FIELDS, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    if (!r.data.name) return bad(res, "name required");
    const problem = await checkAbVideos(r.data, uid);
    if (problem === "Video not found") return notFound(res, problem);
    if (problem) return bad(res, problem);
    const test = await store.createVideoAbTest({ ...r.data, userId: uid, status: "running" });
    res.status(201).json(test);
  }));

  const ownedAbTest = async (req: Request, uid: string) => {
    const id = param(req, "id");
    const t = id ? await store.getVideoAbTest(id) : undefined;
    return owns(t, uid) ? t : undefined;
  };

  app.patch("/api/video-ab-tests/:id", requireAuth, authed(async (req, res, uid) => {
    const t = await ownedAbTest(req, uid);
    if (!t) return notFound(res);
    const r = sanitizeFields<any>(req.body, AB_TEST_FIELDS);
    if (!r.ok) return bad(res, r.message);
    const problem = await checkAbVideos(r.data, uid);
    if (problem === "Video not found") return notFound(res, problem);
    if (problem) return bad(res, problem);
    res.json(await store.updateVideoAbTest(t.id, r.data));
  }));

  app.delete("/api/video-ab-tests/:id", requireAuth, authed(async (req, res, uid) => {
    const t = await ownedAbTest(req, uid);
    if (!t) return notFound(res);
    await store.deleteVideoAbTest(t.id);
    res.json({ ok: true });
  }));

  // ── Channels & episodes ──────────────────────────────────────────────────
  app.post("/api/video-channels", requireAuth, authed(async (req, res, uid) => {
    const r = sanitizeFields<any>(req.body, CHANNEL_FIELDS, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    if (!r.data.name) return bad(res, "name required");
    res.status(201).json(await store.createVideoChannel({ ...r.data, userId: uid }));
  }));

  const ownedChannel = async (id: string | null | undefined, uid: string) => {
    const ch = id ? await store.getVideoChannel(id) : undefined;
    return owns(ch, uid) ? ch : undefined;
  };

  app.get("/api/video-channels/:id", requireAuth, authed(async (req, res, uid) => {
    const ch = await ownedChannel(param(req, "id"), uid);
    if (!ch) return notFound(res);
    res.json(ch);
  }));

  app.patch("/api/video-channels/:id", requireAuth, authed(async (req, res, uid) => {
    const ch = await ownedChannel(param(req, "id"), uid);
    if (!ch) return notFound(res);
    const r = sanitizeFields<any>(req.body, CHANNEL_FIELDS);
    if (!r.ok) return bad(res, r.message);
    res.json(await store.updateVideoChannel(ch.id, r.data));
  }));

  app.delete("/api/video-channels/:id", requireAuth, authed(async (req, res, uid) => {
    const ch = await ownedChannel(param(req, "id"), uid);
    if (!ch) return notFound(res);
    await store.deleteVideoChannel(ch.id);
    res.json({ ok: true });
  }));

  // Public for public channels; private channels only for their owner.
  app.get("/api/video-channels/:id/episodes", publicRoute(async (req, res) => {
    const ch = await store.getVideoChannel(param(req, "id"));
    const uid = userId(req);
    if (!ch || (!ch.isPublic && !(uid && owns(ch, uid)))) return notFound(res);
    res.json(await store.getChannelEpisodes(ch.id));
  }));

  app.post("/api/video-channels/:id/episodes", requireAuth, authed(async (req, res, uid) => {
    const ch = await ownedChannel(param(req, "id"), uid);
    if (!ch) return notFound(res);
    const r = sanitizeFields<any>(req.body, { videoEventId: "ref", section: "nullableText", sortOrder: "intRequired" }, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    const video = await ownedVideo(r.data.videoEventId, uid);
    if (!video) return notFound(res, "Video not found");
    const ep = await store.addChannelEpisode(ch.id, video.id, r.data.section ?? undefined, r.data.sortOrder ?? undefined);
    res.status(201).json(ep);
  }));

  app.delete("/api/video-channel-episodes/:id", requireAuth, authed(async (req, res, uid) => {
    const id = intParam(req, "id");
    const ep = id === null ? undefined : await store.getChannelEpisode(id);
    if (!ep || !(await ownedChannel(ep.channelId, uid))) return notFound(res);
    await store.removeChannelEpisode(ep.id);
    res.json({ ok: true });
  }));

  // ── Dubbing & caption translation jobs ───────────────────────────────────
  app.get("/api/video-events/:id/dubbing-jobs", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    res.json(await store.getVideoDubbingJobs(uid, video.id));
  }));

  const createJobs = (jobType: "dub" | "captions") => authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    const languages = (req.body ?? {}).languages;
    if (!Array.isArray(languages) || !languages.length || languages.length > 50
      || !languages.every((l: unknown) => typeof l === "string" && l.length > 0 && l.length <= 32)) {
      return bad(res, "languages array required");
    }
    const jobs = await Promise.all(languages.map((language: string) =>
      store.createVideoDubbingJob({ userId: uid, videoEventId: video.id, language, jobType, status: "processing" })));
    res.status(201).json({ jobs });
  });
  app.post("/api/video-events/:id/dub", requireAuth, createJobs("dub"));
  app.post("/api/video-events/:id/translate-captions", requireAuth, createJobs("captions"));

  // ── Collaboration comments (no collaborator model exists: video owner only) ─
  app.get("/api/video-events/:id/collab-comments", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    res.json(await store.getVideoCollabComments(video.id));
  }));

  app.post("/api/video-events/:id/collab-comments", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "id"), uid);
    if (!video) return notFound(res, "Video not found");
    const r = sanitizeFields<any>(req.body, { text: "text", timestamp: "int" }, { requireAny: false });
    if (!r.ok) return bad(res, r.message);
    if (!r.data.text) return bad(res, "text required");
    const user = req.user as any;
    const c = await store.createVideoCollabComment({
      videoEventId: video.id, authorId: uid, authorName: user.name || user.email || "User",
      timestamp: r.data.timestamp ?? null, text: r.data.text, resolved: false,
    });
    res.status(201).json(c);
  }));

  const ownedComment = async (req: Request, uid: string) => {
    const id = param(req, "id");
    const c = id ? await store.getVideoCollabComment(id) : undefined;
    return c && (await ownedVideo(c.videoEventId, uid)) ? c : undefined;
  };

  app.patch("/api/video-collab-comments/:id", requireAuth, authed(async (req, res, uid) => {
    const c = await ownedComment(req, uid);
    if (!c) return notFound(res);
    const r = sanitizeFields<any>(req.body, COLLAB_COMMENT_FIELDS);
    if (!r.ok) return bad(res, r.message);
    res.json(await store.updateVideoCollabComment(c.id, r.data));
  }));

  app.delete("/api/video-collab-comments/:id", requireAuth, authed(async (req, res, uid) => {
    const c = await ownedComment(req, uid);
    if (!c) return notFound(res);
    await store.deleteVideoCollabComment(c.id);
    res.json({ ok: true });
  }));

  // ── Per-video analytics (owner only) ─────────────────────────────────────
  app.get("/api/video-analytics/:videoId/heatmap", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "videoId"), uid);
    if (!video) return notFound(res, "Video not found");
    res.json(await store.getVideoHeatmap(video.id));
  }));

  app.get("/api/video-analytics/:videoId/viewers", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "videoId"), uid);
    if (!video) return notFound(res, "Video not found");
    res.json(await store.getVideoViewerProfiles(video.id));
  }));

  app.get("/api/video-analytics/:videoId/daily", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "videoId"), uid);
    if (!video) return notFound(res, "Video not found");
    const raw = Number(req.query.days);
    const days = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 366) : 30;
    res.json(await store.getVideoDailyStats(video.id, days));
  }));

  app.get("/api/video-analytics/:videoId", requireAuth, authed(async (req, res, uid) => {
    const video = await ownedVideo(param(req, "videoId"), uid);
    if (!video) return notFound(res, "Video not found");
    const [events, summary] = await Promise.all([
      store.getVideoAnalyticsEvents(video.id),
      store.getVideoAnalyticsSummary(video.id),
    ]);
    res.json({ events, summary });
  }));

  // ── Public viewer routes (embed / watch pages) ───────────────────────────
  app.get("/api/video/:id/public", publicRoute(async (req, res) => {
    const video = await store.getVideoEvent(param(req, "id"));
    if (!video) return notFound(res, "Video not found");
    res.json(publicVideoPayload(video, viewerUnlocked(video, req)));
  }));

  /** Content lists for viewers: empty for unknown or still-locked videos. */
  const viewerContent = async (req: Request) => {
    const video = await store.getVideoEvent(param(req, "id"));
    return video && viewerUnlocked(video, req) ? video : undefined;
  };

  app.get("/api/video/:id/chapters", publicRoute(async (req, res) => {
    const video = await viewerContent(req);
    res.json(video ? await store.getVideoChapters(video.id) : []);
  }));

  app.get("/api/video/:id/ctas", publicRoute(async (req, res) => {
    const video = await viewerContent(req);
    if (!video) return res.json([]);
    const ctas = await store.getVideoCtas(video.id);
    res.json(ctas.filter(c => c.isActive).map(c => stripCounters(c, ["clicks"])));
  }));

  app.get("/api/video/:id/interactive", publicRoute(async (req, res) => {
    const video = await viewerContent(req);
    if (!video) return res.json([]);
    const els = await store.getVideoInteractiveElements(video.id);
    res.json(els.filter(e => e.isActive).map(e => stripCounters(e, ["clicks", "impressions"])));
  }));

  // Public: exchange the video password for a short-lived access token.
  app.post("/api/video/:id/unlock", opts.unlockLimiter ?? defaultUnlockLimiter(), publicRoute(async (req, res) => {
    const video = await store.getVideoEvent(param(req, "id"));
    if (!video) return notFound(res, "Video not found");
    if (!isVideoProtected(video.passwordHash)) return res.json({ ok: true, passwordRequired: false });
    if (!verifyVideoPassword(video.passwordHash, (req.body ?? {}).password)) {
      return res.status(401).json({ message: "Incorrect password" });
    }
    res.json({
      ok: true,
      passwordRequired: true,
      token: createVideoAccessToken(video.id, video.passwordHash as string),
      expiresIn: VIDEO_ACCESS_TTL_SECONDS,
    });
  }));
}
