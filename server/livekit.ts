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
