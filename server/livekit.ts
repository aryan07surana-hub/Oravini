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
import { EgressClient, StreamProtocol, EncodingOptionsPreset } from "livekit-server-sdk";

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

  // Start a Room Composite Egress that publishes to all RTMP destinations
  const egress = await client.startRoomCompositeEgress(roomName, {
    layout: "speaker",
    audioOnly: false,
    videoOnly: false,
    customBaseUrl: undefined,
    encodingOptions: EncodingOptionsPreset.H264_1080P_30,
  } as any, {
    stream: {
      protocol: StreamProtocol.RTMP,
      urls,
    },
  } as any);

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

/**
 * Start cloud recording via Egress — saves the room composite to a file.
 * Returns the egress ID. The recording is uploaded to your configured destination.
 */
export async function startCloudRecording(
  webinarId: string | number,
  uploadConfig?: { s3?: { bucket: string; region: string; accessKey: string; secret: string } },
): Promise<{ egressId: string }> {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit is not configured.");
  }

  const roomName = `webinar-${webinarId}`;
  const client = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  // For now, use a local file output — production should use S3
  const filename = `webinar-${webinarId}-${Date.now()}.mp4`;

  const egress = await client.startRoomCompositeEgress(roomName, {
    layout: "speaker",
    encodingOptions: EncodingOptionsPreset.H264_1080P_30,
  } as any, {
    file: {
      filepath: `/recordings/${filename}`,
      ...(uploadConfig?.s3 ? {
        s3: {
          accessKey: uploadConfig.s3.accessKey,
          secret: uploadConfig.s3.secret,
          bucket: uploadConfig.s3.bucket,
          region: uploadConfig.s3.region,
        },
      } : {}),
    },
  } as any);

  return { egressId: egress.egressId };
}
