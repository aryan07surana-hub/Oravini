/**
 * LiveKit Integration for Webinar Hosting
 * 
 * Provides unlimited attendees, unlimited duration, and 4K streaming
 * via LiveKit's SFU (Selective Forwarding Unit) architecture.
 * 
 * Environment variables required:
 *   LIVEKIT_API_KEY    - Your LiveKit API key
 *   LIVEKIT_API_SECRET - Your LiveKit API secret
 *   LIVEKIT_URL        - Your LiveKit server URL (e.g. wss://your-app.livekit.cloud)
 */

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import {
  EgressClient, StreamProtocol, EncodingOptionsPreset, EncodedFileOutput, EncodedFileType,
  S3Upload, StreamOutput, EgressStatus, type EgressInfo,
} from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "";

// Validate config on import
export function isLiveKitConfigured(): boolean {
  return !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL);
}

/**
 * Get the LiveKit WebSocket URL for client connections
 */
export function getLiveKitUrl(): string {
  return LIVEKIT_URL;
}

/**
 * Generate a LiveKit access token for a webinar host.
 * Grants: room create, join, publish, subscribe, admin.
 */
export async function createHostToken(
  webinarId: string | number,
  hostIdentity: string,
  hostName: string,
): Promise<string> {
  const roomName = `webinar-${webinarId}`;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: hostIdentity,
    name: hostName,
    ttl: "24h", // Unlimited duration — 24h max token, can be refreshed
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    roomCreate: true,
    roomAdmin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Generate a LiveKit access token for a webinar viewer.
 * Grants: join, subscribe only (no publish).
 */
export async function createViewerToken(
  webinarId: string | number,
  viewerIdentity: string,
  viewerName: string,
): Promise<string> {
  const roomName = `webinar-${webinarId}`;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: viewerIdentity,
    name: viewerName,
    ttl: "24h",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    roomCreate: false,
    roomAdmin: false,
    canPublish: false,
    canSubscribe: true,
    canPublishData: true, // Allow data messages for chat/reactions
  });

  return await at.toJwt();
}

/**
 * Generate a LiveKit access token for a webinar panelist.
 * Grants: join, publish (camera/mic/screen), subscribe.
 * Co-hosts get additional admin permissions.
 */
export async function createPanelistToken(
  webinarId: string | number,
  panelistIdentity: string,
  panelistName: string,
  role: "co_host" | "panelist" = "panelist",
  permissions?: {
    canShareScreen?: boolean;
    canChat?: boolean;
    canMuteOthers?: boolean;
  },
): Promise<string> {
  const roomName = `webinar-${webinarId}`;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: panelistIdentity,
    name: panelistName,
    ttl: "24h",
    metadata: JSON.stringify({ role, permissions: permissions || {} }),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    roomCreate: false,
    roomAdmin: role === "co_host",
    canPublish: true,
    canPublishSources: permissions?.canShareScreen === false
      ? ["camera", "microphone"] as any
      : ["camera", "microphone", "screen_share", "screen_share_audio"] as any,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  return await at.toJwt();
}

/**
 * Create a breakout room for a webinar.
 */
export async function createBreakoutRoom(
  webinarId: string | number,
  breakoutRoomId: string,
): Promise<any> {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit is not configured.");
  }

  const roomName = `webinar-${webinarId}-breakout-${breakoutRoomId}`;
  const svc = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  return await svc.createRoom({
    name: roomName,
    emptyTimeout: 30 * 60, // 30 min after last person leaves
    maxParticipants: 0,
  });
}

/**
 * Generate a token for joining a breakout room (everyone can publish in breakout).
 */
export async function createBreakoutToken(
  webinarId: string | number,
  breakoutRoomId: string,
  participantIdentity: string,
  participantName: string,
): Promise<string> {
  const roomName = `webinar-${webinarId}-breakout-${breakoutRoomId}`;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    ttl: "8h",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Delete a breakout room.
 */
export async function deleteBreakoutRoom(
  webinarId: string | number,
  breakoutRoomId: string,
): Promise<void> {
  if (!isLiveKitConfigured()) return;

  const roomName = `webinar-${webinarId}-breakout-${breakoutRoomId}`;
  const svc = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  try {
    await svc.deleteRoom(roomName);
  } catch {}
}

/**
 * Promote a viewer to panelist (requires re-issuing a publisher token).
 * The viewer must reconnect with the new token.
 */
export async function promoteViewerToPanelist(
  webinarId: string | number,
  viewerIdentity: string,
  viewerName: string,
): Promise<string> {
  // Re-issue token with publisher permissions
  return createPanelistToken(webinarId, viewerIdentity, viewerName, "panelist", {
    canShareScreen: false, // Promoted attendees can't screen-share by default
    canChat: true,
  });
}

/**
 * Create a LiveKit room with optimal settings for webinar streaming.
 * No participant limit — LiveKit SFU handles unlimited viewers.
 */
export async function createWebinarRoom(webinarId: string | number): Promise<any> {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL.");
  }

  const roomName = `webinar-${webinarId}`;
  const svc = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  const room = await svc.createRoom({
    name: roomName,
    emptyTimeout: 60 * 60, // Keep room alive 1 hour after last participant leaves
    maxParticipants: 0, // 0 = unlimited
  });

  return room;
}

/**
 * Delete a LiveKit room (cleanup after webinar ends).
 */
export async function deleteWebinarRoom(webinarId: string | number): Promise<void> {
  if (!isLiveKitConfigured()) return;

  const roomName = `webinar-${webinarId}`;
  const svc = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  try {
    await svc.deleteRoom(roomName);
  } catch {
    // Room may already be gone — that's fine
  }
}

/**
 * Get the number of participants currently in a webinar room.
 */
export async function getWebinarParticipantCount(webinarId: string | number): Promise<number> {
  if (!isLiveKitConfigured()) return 0;

  const roomName = `webinar-${webinarId}`;
  const svc = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  try {
    const participants = await svc.listParticipants(roomName);
    return participants.length;
  } catch {
    return 0;
  }
}

/**
 * List all participants in a webinar room.
 */
export async function listWebinarParticipants(webinarId: string | number): Promise<any[]> {
  if (!isLiveKitConfigured()) return [];

  const roomName = `webinar-${webinarId}`;
  const svc = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  try {
    return await svc.listParticipants(roomName);
  } catch {
    return [];
  }
}


// ── EGRESS / SIMULCAST ─────────────────────────────────────────────────────
// In-memory tracking of active egresses per webinar
const activeEgresses = new Map<string, string[]>(); // webinarId → egressIds[]

/**
 * Start RTMP simulcast — streams the LiveKit room to multiple external RTMP destinations
 * (YouTube Live, Facebook Live, LinkedIn Live, Twitch, custom RTMP).
 *
 * destinations: array of { rtmpUrl, streamKey } — full URL = `${rtmpUrl}/${streamKey}`
 */
export async function startSimulcast(
  webinarId: string | number,
  destinations: { rtmpUrl: string; streamKey: string }[],
): Promise<{ egressId: string }> {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit is not configured.");
  }

  if (!destinations.length) {
    throw new Error("At least one destination required");
  }

  const roomName = `webinar-${webinarId}`;
  const client = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  // Build full RTMP URLs (combine base + key)
  const urls = destinations.map(d => {
    const base = d.rtmpUrl.endsWith("/") ? d.rtmpUrl.slice(0, -1) : d.rtmpUrl;
    return `${base}/${d.streamKey}`;
  });

  // Start a Room Composite Egress that publishes to all RTMP destinations.
  // Signature is (roomName, output, options).
  const egress = await client.startRoomCompositeEgress(
    roomName,
    new StreamOutput({ protocol: StreamProtocol.RTMP, urls }),
    { layout: "speaker", encodingOptions: EncodingOptionsPreset.H264_1080P_30 },
  );

  const list = activeEgresses.get(String(webinarId)) || [];
  list.push(egress.egressId);
  activeEgresses.set(String(webinarId), list);

  return { egressId: egress.egressId };
}

/**
 * Stop all simulcast egresses for a webinar.
 */
export async function stopSimulcast(webinarId: string | number): Promise<void> {
  if (!isLiveKitConfigured()) return;

  const ids = activeEgresses.get(String(webinarId)) || [];
  if (!ids.length) return;

  const client = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  for (const egressId of ids) {
    try {
      await client.stopEgress(egressId);
    } catch (e: any) {
      console.error(`[livekit] Failed to stop egress ${egressId}: ${e.message}`);
    }
  }

  activeEgresses.delete(String(webinarId));
}

/**
 * Get active egress IDs for a webinar.
 */
export function getActiveEgresses(webinarId: string | number): string[] {
  return activeEgresses.get(String(webinarId)) || [];
}

// ── AUTOMATIC RECORDING (Room Composite → MP4 file) ────────────────────────
//
// LiveKit file egress needs somewhere to upload the MP4. Supported setups:
//
//   1. S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, MinIO, …):
//        LIVEKIT_EGRESS_S3_BUCKET, LIVEKIT_EGRESS_S3_ACCESS_KEY, LIVEKIT_EGRESS_S3_SECRET
//        optional: LIVEKIT_EGRESS_S3_REGION, LIVEKIT_EGRESS_S3_ENDPOINT,
//                  LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE=true,
//                  LIVEKIT_RECORDING_PUBLIC_BASE_URL (public URL prefix for playback)
//   2. Storage configured on the LiveKit project itself (LiveKit Cloud plans that
//      provide default egress storage, or a self-hosted egress with storage in its
//      config): set LIVEKIT_RECORDING_USE_PROJECT_STORAGE=true.
//
// With neither, auto-recording is skipped with a warning. Set LIVEKIT_AUTO_RECORD=false
// to turn it off entirely. Recording failures never affect the live webinar.

type RecordingStorage =
  | { kind: "s3"; s3: S3Upload; publicBaseUrl: string | null }
  | { kind: "project"; publicBaseUrl: string | null };

export function getRecordingStorage(): RecordingStorage | null {
  const publicBaseUrl = (process.env.LIVEKIT_RECORDING_PUBLIC_BASE_URL || "").replace(/\/+$/, "") || null;
  const bucket = process.env.LIVEKIT_EGRESS_S3_BUCKET;
  const accessKey = process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY;
  const secret = process.env.LIVEKIT_EGRESS_S3_SECRET;
  if (bucket && accessKey && secret) {
    return {
      kind: "s3",
      publicBaseUrl,
      s3: new S3Upload({
        bucket,
        accessKey,
        secret,
        region: process.env.LIVEKIT_EGRESS_S3_REGION || "auto",
        endpoint: process.env.LIVEKIT_EGRESS_S3_ENDPOINT || "",
        forcePathStyle: process.env.LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE === "true",
      }),
    };
  }
  if (process.env.LIVEKIT_RECORDING_USE_PROJECT_STORAGE === "true") {
    return { kind: "project", publicBaseUrl };
  }
  return null;
}

export function isAutoRecordingEnabled(): boolean {
  return isLiveKitConfigured() && process.env.LIVEKIT_AUTO_RECORD !== "false";
}

// webinarId → file egress IDs started by auto-recording (kept separate from simulcast)
const activeRecordings = new Map<string, string[]>();

function buildFileOutput(webinarId: string | number, storage: RecordingStorage): EncodedFileOutput {
  const filepath = `webinar-recordings/webinar-${webinarId}-${Date.now()}.mp4`;
  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: storage.kind === "s3" ? { case: "s3", value: storage.s3 } : { case: undefined },
  });
}

/**
 * Start recording the webinar room to an MP4 file. Returns the egress ID, or null
 * when recording is not possible (no storage, LiveKit down, …). Never throws.
 */
export async function startAutoRecording(webinarId: string | number): Promise<string | null> {
  if (!isAutoRecordingEnabled()) return null;

  const storage = getRecordingStorage();
  if (!storage) {
    console.warn(
      `[livekit] Auto-recording skipped for webinar ${webinarId}: file egress needs storage. ` +
      `Set LIVEKIT_EGRESS_S3_BUCKET/ACCESS_KEY/SECRET (any S3-compatible bucket) or ` +
      `LIVEKIT_RECORDING_USE_PROJECT_STORAGE=true if your LiveKit project has egress storage configured.`,
    );
    return null;
  }

  if ((activeRecordings.get(String(webinarId)) || []).length) {
    return activeRecordings.get(String(webinarId))![0];
  }

  try {
    const client = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    const egress = await client.startRoomCompositeEgress(
      `webinar-${webinarId}`,
      buildFileOutput(webinarId, storage),
      { layout: "speaker", encodingOptions: EncodingOptionsPreset.H264_1080P_30 },
    );
    activeRecordings.set(String(webinarId), [egress.egressId]);
    console.log(`[livekit] Auto-recording started for webinar ${webinarId} (egress ${egress.egressId}, storage: ${storage.kind})`);
    return egress.egressId;
  } catch (err: any) {
    console.warn(`[livekit] Auto-recording could not start for webinar ${webinarId}: ${err?.message || err}`);
    return null;
  }
}

/**
 * Stop the webinar's recording egress(es). Also discovers active file egresses for
 * the room via the API, so recordings survive a server restart. Returns the IDs stopped.
 */
export async function stopAutoRecording(webinarId: string | number): Promise<string[]> {
  if (!isLiveKitConfigured()) return [];
  const key = String(webinarId);
  const ids = new Set(activeRecordings.get(key) || []);
  const client = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  const simulcastIds = new Set(activeEgresses.get(key) || []);

  try {
    const active = await client.listEgress({ roomName: `webinar-${webinarId}`, active: true });
    for (const e of active) {
      const isFile = e.request?.case === "roomComposite"
        && (e.request.value.fileOutputs?.length || e.request.value.output?.case === "file");
      if (isFile && !simulcastIds.has(e.egressId)) ids.add(e.egressId);
    }
  } catch (err: any) {
    console.warn(`[livekit] Could not list egresses for webinar ${webinarId}: ${err?.message || err}`);
  }

  for (const egressId of Array.from(ids)) {
    try {
      await client.stopEgress(egressId);
    } catch (err: any) {
      // Already stopped/ended (e.g. room closed) — results can still be collected.
      console.warn(`[livekit] stopEgress ${egressId}: ${err?.message || err}`);
    }
  }
  activeRecordings.delete(key);
  return Array.from(ids);
}

export interface CompletedRecording {
  egressId: string;
  url: string;
  durationSeconds: number | null;
  sizeBytes: number | null;
}

/**
 * Poll an egress until it finishes uploading, then return the playback URL.
 * Returns null on failure/timeout. Never throws.
 */
export async function waitForRecording(
  egressId: string,
  timeoutMs = 15 * 60 * 1000,
  intervalMs = 10_000,
): Promise<CompletedRecording | null> {
  if (!isLiveKitConfigured()) return null;
  const client = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  const deadline = Date.now() + timeoutMs;
  const storage = getRecordingStorage();

  while (Date.now() < deadline) {
    try {
      const [info] = await client.listEgress({ egressId });
      if (info) {
        if (info.status === EgressStatus.EGRESS_COMPLETE) return toCompleted(info, storage);
        if (info.status === EgressStatus.EGRESS_FAILED || info.status === EgressStatus.EGRESS_ABORTED) {
          console.warn(`[livekit] Recording egress ${egressId} ended with status ${EgressStatus[info.status]}: ${info.error || "no details"}`);
          return null;
        }
      }
    } catch (err: any) {
      console.warn(`[livekit] Polling egress ${egressId}: ${err?.message || err}`);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  console.warn(`[livekit] Timed out waiting for recording egress ${egressId} to finish.`);
  return null;
}

function toCompleted(info: EgressInfo, storage: RecordingStorage | null): CompletedRecording | null {
  const file = info.fileResults?.[0] ?? (info.result?.case === "file" ? info.result.value : undefined);
  if (!file) {
    console.warn(`[livekit] Recording egress ${info.egressId} completed without file results.`);
    return null;
  }
  let url = file.location;
  if (storage?.publicBaseUrl && file.filename) {
    url = `${storage.publicBaseUrl}/${file.filename.replace(/^\/+/, "")}`;
  }
  if (!url) return null;
  const durationNs = Number(file.duration || BigInt(0));
  const size = Number(file.size || BigInt(0));
  return {
    egressId: info.egressId,
    url,
    durationSeconds: durationNs > 0 ? Math.round(durationNs / 1e9) : null,
    sizeBytes: size > 0 ? size : null,
  };
}

/**
 * Manually start a cloud recording (used by /cloud-recording/start).
 * Uses the same storage configuration as auto-recording.
 */
export async function startCloudRecording(webinarId: string | number): Promise<{ egressId: string }> {
  if (!isLiveKitConfigured()) throw new Error("LiveKit is not configured.");
  if (!getRecordingStorage()) {
    throw new Error("Cloud recording needs storage: set LIVEKIT_EGRESS_S3_* or LIVEKIT_RECORDING_USE_PROJECT_STORAGE=true.");
  }
  const egressId = await startAutoRecording(webinarId);
  if (!egressId) throw new Error("Could not start cloud recording — check server logs.");
  return { egressId };
}
