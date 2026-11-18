/**
 * Glue between LiveKit auto-recording and the webinar recordings library.
 * Every function here is fire-and-forget safe: errors are logged, never thrown,
 * so a recording problem can never break starting or ending a live webinar.
 */

import { storage } from "./storage";
import {
  isAutoRecordingEnabled, createWebinarRoom, startAutoRecording, stopAutoRecording, waitForRecording,
} from "./livekit";

/** Called when a LiveKit webinar goes live. */
export function beginWebinarAutoRecording(webinarId: string): void {
  if (!isAutoRecordingEnabled()) return;
  (async () => {
    // The host connects right after /start; make sure the room exists so egress can attach.
    try { await createWebinarRoom(webinarId); } catch { /* already exists */ }
    await startAutoRecording(webinarId);
  })().catch(err => console.warn(`[auto-record] start failed for ${webinarId}: ${err?.message || err}`));
}

/**
 * Stop recording egress for a webinar. Must be awaited *before* the room is deleted
 * so the egress finalises cleanly. Then registers each finished file in the library
 * in the background.
 */
export async function endWebinarAutoRecording(webinarId: string): Promise<void> {
  if (!isAutoRecordingEnabled()) return;
  let egressIds: string[] = [];
  try {
    // Cap the wait so a slow LiveKit API can't hold up ending the webinar.
    let timer: NodeJS.Timeout | undefined;
    egressIds = await Promise.race([
      stopAutoRecording(webinarId),
      new Promise<string[]>(resolve => {
        timer = setTimeout(() => {
          console.warn(`[auto-record] stopping egress for ${webinarId} timed out`);
          resolve([]);
        }, 10_000);
      }),
    ]).finally(() => clearTimeout(timer));
  } catch (err: any) {
    console.warn(`[auto-record] stop failed for ${webinarId}: ${err?.message || err}`);
    return;
  }
  if (!egressIds.length) return;

  for (const egressId of egressIds) {
    (async () => {
      const done = await waitForRecording(egressId);
      if (!done) return;
      const webinar = await storage.getWebinar(webinarId);
      if (!webinar) return;

      const existing = await storage.getWebinarRecordingsByWebinarId(webinarId);
      if (existing.some(r => r.recordingUrl === done.url)) return;

      const when = webinar.startedAt ? new Date(webinar.startedAt) : new Date();
      await storage.createWebinarRecording({
        webinarId,
        userId: webinar.userId,
        title: `${webinar.title} — ${when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        recordingUrl: done.url,
        thumbnailUrl: null,
        duration: done.durationSeconds,
        fileSize: done.sizeBytes != null ? String(done.sizeBytes) : null,
        shareToken: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        isPublic: false,
      });
      console.log(`[auto-record] Recording saved to library for webinar ${webinarId}: ${done.url}`);
    })().catch(err => console.warn(`[auto-record] could not register recording ${egressId}: ${err?.message || err}`));
  }
}
