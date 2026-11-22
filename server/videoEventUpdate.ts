/**
 * Owner-only updates for hosted videos (video_events).
 *
 * Serves both PATCH /api/video-events/:id and its alias
 * PATCH /api/video-events/:id/settings. Previously both called
 * storage.updateVideoEvent(id, req.body) directly, so any signed-in user could
 * edit any video, including reassigning `userId`.
 *
 * Rules:
 * - Must be signed in (401 otherwise).
 * - Video must exist AND belong to the caller. Otherwise the reply is 404, so
 *   other accounts' video ids aren't confirmed.
 * - Only fields in VIDEO_EVENT_EDITABLE_FIELDS are written. Identity, ownership
 *   and system fields (id, userId, views, createdAt, approvalStatus) and unknown
 *   keys are ignored. Clients that send the whole video object back still work,
 *   but can never reassign it.
 * - Values are type-checked; ISO date strings become Date objects.
 * - A video password sent as `passwordHash` (the field the existing UI uses) is
 *   stored as a scrypt hash; null/"" removes protection. Responses never include
 *   the stored value, only `passwordProtected: boolean`.
 */

import type { Express, Request, Response } from "express";
import type { VideoEvent, InsertVideoEvent } from "@shared/schema";
import { isVideoProtected, passwordFieldForStorage } from "./videoPassword";

/**
 * text: non-empty string · nullableText: string|null (objects are JSON-stringified)
 * ref: id string, ""/null → null · bool
 * int: nullable integer, ""/null → null · intRequired: integer, never null · number
 * (numeric strings accepted for all numeric kinds, as HTML number inputs send them)
 * stringArray · date: ISO string → Date, ""/null → null · password: hashed before storage
 */
export type FieldKind = "text" | "nullableText" | "ref" | "bool" | "int" | "intRequired" | "number" | "stringArray" | "date" | "password";
export type FieldSpec = Record<string, FieldKind>;

/** Every owner-editable column of video_events, with its value type. */
export const VIDEO_EVENT_EDITABLE_FIELDS: FieldSpec = {
  title: "text",
  description: "nullableText",
  videoUrl: "text",
  thumbnailUrl: "nullableText",
  duration: "int",
  category: "nullableText",
  tags: "stringArray",
  isPublic: "bool",
  allowDownload: "bool",
  videoType: "text",
  progressBarConfig: "nullableText",
  leadGateEnabled: "bool",
  brandColor: "nullableText",
  logoUrl: "nullableText",
  captionUrl: "nullableText",
  resumeEnabled: "bool",
  autoplayNextEnabled: "bool",
  domainWhitelist: "stringArray",
  expiresAt: "date",
  // The existing UI sends the raw password in this field; it is hashed before storage.
  passwordHash: "password",
  urgencyText: "nullableText",
  urgencyEndsAt: "date",
  defaultPlaybackSpeed: "number",
  allowSpeedControl: "bool",
  allowQualityControl: "bool",
  showOraviniWatermark: "bool",
  oraviniWatermarkPosition: "text",
  animatedThumbnailUrl: "nullableText",
  seoTitle: "nullableText",
  seoDescription: "nullableText",
  editMetadata: "nullableText",
  endScreenConfig: "nullableText",
  socialShareEnabled: "bool",
};

/** Columns that can never be set through this endpoint. */
export const VIDEO_EVENT_PROTECTED_FIELDS = ["id", "userId", "views", "createdAt", "approvalStatus"] as const;

export type SanitizeResult<T = Partial<InsertVideoEvent>> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function coerce(kind: FieldKind, value: unknown): { ok: true; value: unknown } | { ok: false } {
  switch (kind) {
    case "text":
      return typeof value === "string" && value.trim() !== "" ? { ok: true, value } : { ok: false };
    case "nullableText":
      if (value === null) return { ok: true, value: null };
      if (typeof value === "string") return { ok: true, value };
      // JSON-ish settings are stored as text; accept objects and stringify them.
      if (typeof value === "object") return { ok: true, value: JSON.stringify(value) };
      return { ok: false };
    case "ref":
      if (value === null || value === "") return { ok: true, value: null };
      return typeof value === "string" && value.length <= 128 ? { ok: true, value } : { ok: false };
    case "bool":
      return typeof value === "boolean" ? { ok: true, value } : { ok: false };
    case "int":
    case "intRequired":
    case "number": {
      if (kind === "int" && (value === null || value === "")) return { ok: true, value: null };
      const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      if (typeof n !== "number" || !Number.isFinite(n)) return { ok: false };
      return { ok: true, value: kind === "number" ? n : Math.round(n) };
    }
    case "stringArray":
      if (value === null) return { ok: true, value: [] };
      return Array.isArray(value) && value.every(v => typeof v === "string") ? { ok: true, value } : { ok: false };
    case "password":
      if (value === null || value === "") return { ok: true, value: null };
      if (typeof value !== "string" || value.length > 512) return { ok: false };
      return { ok: true, value: passwordFieldForStorage(value) };
    case "date": {
      if (value === null || value === "") return { ok: true, value: null };
      if (typeof value !== "string" && !(value instanceof Date)) return { ok: false };
      const d = new Date(value as string);
      return Number.isNaN(d.getTime()) ? { ok: false } : { ok: true, value: d };
    }
  }
}

/**
 * Keep only the fields named in `spec`, type-checked. Unknown/protected keys are
 * ignored; a wrong type for an allowed key is an error. With `requireAny`, a body
 * with no allowed fields is an error too.
 */
export function sanitizeFields<T = Record<string, unknown>>(
  body: unknown,
  spec: FieldSpec,
  opts: { requireAny?: boolean } = { requireAny: true },
): SanitizeResult<T> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const kind = Object.prototype.hasOwnProperty.call(spec, key) ? spec[key] : undefined;
    if (!kind || value === undefined) continue; // protected or unknown field: ignore
    const r = coerce(kind, value);
    if (!r.ok) return { ok: false, message: `Invalid value for "${key}".` };
    data[key] = r.value;
  }
  if (opts.requireAny !== false && Object.keys(data).length === 0) {
    return { ok: false, message: "No editable fields in request." };
  }
  return { ok: true, data: data as T };
}

/** Build a safe video update payload from an untrusted request body. */
export function sanitizeVideoEventUpdate(body: unknown): SanitizeResult {
  return sanitizeFields<Partial<InsertVideoEvent>>(body, VIDEO_EVENT_EDITABLE_FIELDS);
}

/** Owner-facing video payload: never includes the stored password value. */
export function redactVideoForOwner<T extends Record<string, any> | undefined>(video: T): T {
  if (!video) return video;
  const { passwordHash, ...rest } = video as Record<string, any>;
  return { ...rest, passwordProtected: isVideoProtected(passwordHash) } as unknown as T;
}

export interface VideoEventUpdateStore {
  getVideoEvent(id: string): Promise<VideoEvent | undefined>;
  updateVideoEvent(id: string, data: Partial<InsertVideoEvent>): Promise<VideoEvent | undefined>;
}

export function makeVideoEventPatchHandler(store: VideoEventUpdateStore) {
  return async (req: Request, res: Response) => {
    try {
      const user = req.user as { id?: string } | undefined;
      if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ message: "Missing video id" });

      const video = await store.getVideoEvent(id);
      if (!video || String(video.userId) !== String(user.id)) {
        return res.status(404).json({ message: "Video not found" });
      }

      const result = sanitizeVideoEventUpdate(req.body);
      if (!result.ok) return res.status(400).json({ message: result.message });

      const updated = await store.updateVideoEvent(video.id, result.data);
      if (!updated) return res.status(404).json({ message: "Video not found" });
      res.json(redactVideoForOwner(updated));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };
}

/** Register the owner-only PATCH endpoints (main path + /settings alias). */
export function registerVideoEventUpdateRoutes(app: Express, requireAuth: any, store: VideoEventUpdateStore) {
  const handler = makeVideoEventPatchHandler(store);
  app.patch("/api/video-events/:id/settings", requireAuth, handler);
  app.patch("/api/video-events/:id", requireAuth, handler);
}
