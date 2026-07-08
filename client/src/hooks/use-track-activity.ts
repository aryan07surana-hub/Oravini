import { useCallback, useRef } from "react";
import { useAuth } from "./use-auth";

export type ActivityEventType =
  | "page_view"
  | "feature_used"
  | "ai_prompt"
  | "content_created"
  | "note_created"
  | "vault_action"
  | "tool_opened"
  | "search"
  | "export"
  | "share";

export interface TrackPayload {
  eventType: ActivityEventType;
  feature?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

// Session ID — stable per browser tab, regenerates on reload
const SESSION_ID = Math.random().toString(36).slice(2);

// Dedupe identical events within this window (ms)
const DEDUPE_MS = 3000;

export function useTrackActivity() {
  const { user } = useAuth();
  const lastRef = useRef<Map<string, number>>(new Map());

  const track = useCallback(
    (payload: TrackPayload) => {
      if (!user) return;

      // Dedupe: skip if same key fired within DEDUPE_MS
      const key = `${payload.eventType}:${payload.feature ?? ""}:${payload.action ?? ""}`;
      const last = lastRef.current.get(key) ?? 0;
      if (Date.now() - last < DEDUPE_MS) return;
      lastRef.current.set(key, Date.now());

      // Fire-and-forget — never block UI
      fetch("/api/activity/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, sessionId: SESSION_ID }),
        keepalive: true,
      }).catch(() => {});
    },
    [user]
  );

  return { track };
}

/* ─── Convenience wrappers ─── */

export function trackPageView(path: string) {
  fetch("/api/activity/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "page_view",
      feature: path,
      action: "view",
      sessionId: SESSION_ID,
    }),
    keepalive: true,
  }).catch(() => {});
}

export function trackFeature(feature: string, action: string, metadata?: Record<string, unknown>) {
  fetch("/api/activity/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType: "feature_used", feature, action, metadata, sessionId: SESSION_ID }),
    keepalive: true,
  }).catch(() => {});
}

export function trackAiPrompt(feature: string, promptExcerpt?: string) {
  fetch("/api/activity/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "ai_prompt",
      feature,
      action: "generate",
      metadata: promptExcerpt ? { excerpt: promptExcerpt.slice(0, 80) } : undefined,
      sessionId: SESSION_ID,
    }),
    keepalive: true,
  }).catch(() => {});
}

export function trackContentCreated(feature: string, contentType: string, platform?: string) {
  fetch("/api/activity/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "content_created",
      feature,
      action: contentType,
      metadata: platform ? { platform } : undefined,
      sessionId: SESSION_ID,
    }),
    keepalive: true,
  }).catch(() => {});
}
