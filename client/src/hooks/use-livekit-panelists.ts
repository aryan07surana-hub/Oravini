/**
 * Hook for tracking remote panelists in a LiveKit webinar room.
 * Subscribes to all publishing participants (host + panelists + co-hosts)
 * and exposes their video/audio tracks for rendering in a grid.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Participant,
} from "livekit-client";

export interface PanelistTrack {
  identity: string;
  name: string;
  role: "host" | "co_host" | "panelist" | "attendee";
  videoTrack?: RemoteTrack;
  audioTrack?: RemoteTrack;
  screenShareTrack?: RemoteTrack;
  isMuted: boolean;
  isCameraOff: boolean;
  isLocal: boolean;
  metadata?: any;
}

interface UsePanelistsReturn {
  panelists: PanelistTrack[];
  totalSpeakers: number;
  refresh: () => void;
}

function getRoleFromMetadata(participant: Participant): PanelistTrack["role"] {
  try {
    const meta = participant.metadata ? JSON.parse(participant.metadata) : null;
    if (meta?.role === "host") return "host";
    if (meta?.role === "co_host") return "co_host";
    if (meta?.role === "panelist") return "panelist";
  } catch {}
  // Identity prefix fallback
  if (participant.identity.startsWith("host-")) return "host";
  if (participant.identity.startsWith("panelist-")) return "panelist";
  if (participant.identity.startsWith("co-host-")) return "co_host";
  return "attendee";
}

export function useLiveKitPanelists(room: Room | null): UsePanelistsReturn {
  const [panelists, setPanelists] = useState<PanelistTrack[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const buildPanelistList = useCallback((): PanelistTrack[] => {
    if (!room) return [];

    const list: PanelistTrack[] = [];

    // Add local participant (host or panelist self) if they're publishing
    const localPubs = Array.from(room.localParticipant.trackPublications.values());
    if (localPubs.length > 0) {
      const videoPub = localPubs.find(p => p.kind === Track.Kind.Video && p.source === Track.Source.Camera);
      const audioPub = localPubs.find(p => p.kind === Track.Kind.Audio);
      const screenPub = localPubs.find(p => p.kind === Track.Kind.Video && p.source === Track.Source.ScreenShare);

      list.push({
        identity: room.localParticipant.identity,
        name: room.localParticipant.name || "You",
        role: getRoleFromMetadata(room.localParticipant),
        videoTrack: videoPub?.track as RemoteTrack | undefined,
        audioTrack: audioPub?.track as RemoteTrack | undefined,
        screenShareTrack: screenPub?.track as RemoteTrack | undefined,
        isMuted: !audioPub || audioPub.isMuted,
        isCameraOff: !videoPub || videoPub.isMuted,
        isLocal: true,
        metadata: room.localParticipant.metadata,
      });
    }

    // Add remote participants who are publishing
    room.remoteParticipants.forEach((participant: RemoteParticipant) => {
      const publications = Array.from(participant.trackPublications.values());
      const isPublishing = publications.some(p => p.isSubscribed && p.track);

      if (!isPublishing) return; // Skip pure viewers

      const videoPub = publications.find(p => p.kind === Track.Kind.Video && p.source === Track.Source.Camera);
      const audioPub = publications.find(p => p.kind === Track.Kind.Audio);
      const screenPub = publications.find(p => p.kind === Track.Kind.Video && p.source === Track.Source.ScreenShare);

      list.push({
        identity: participant.identity,
        name: participant.name || participant.identity,
        role: getRoleFromMetadata(participant),
        videoTrack: videoPub?.track as RemoteTrack | undefined,
        audioTrack: audioPub?.track as RemoteTrack | undefined,
        screenShareTrack: screenPub?.track as RemoteTrack | undefined,
        isMuted: !audioPub || audioPub.isMuted,
        isCameraOff: !videoPub || videoPub.isMuted,
        isLocal: false,
        metadata: participant.metadata,
      });
    });

    // Sort: host first, co_hosts next, panelists last
    list.sort((a, b) => {
      const order = { host: 0, co_host: 1, panelist: 2, attendee: 3 };
      return order[a.role] - order[b.role];
    });

    return list;
  }, [room]);

  const refresh = useCallback(() => {
    setRefreshTrigger(t => t + 1);
  }, []);

  useEffect(() => {
    if (!room) {
      setPanelists([]);
      return;
    }

    setPanelists(buildPanelistList());

    const handler = () => setPanelists(buildPanelistList());

    room.on(RoomEvent.ParticipantConnected, handler);
    room.on(RoomEvent.ParticipantDisconnected, handler);
    room.on(RoomEvent.TrackSubscribed, handler);
    room.on(RoomEvent.TrackUnsubscribed, handler);
    room.on(RoomEvent.TrackMuted, handler);
    room.on(RoomEvent.TrackUnmuted, handler);
    room.on(RoomEvent.TrackPublished, handler);
    room.on(RoomEvent.TrackUnpublished, handler);
    room.on(RoomEvent.LocalTrackPublished, handler);
    room.on(RoomEvent.LocalTrackUnpublished, handler);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handler);
      room.off(RoomEvent.ParticipantDisconnected, handler);
      room.off(RoomEvent.TrackSubscribed, handler);
      room.off(RoomEvent.TrackUnsubscribed, handler);
      room.off(RoomEvent.TrackMuted, handler);
      room.off(RoomEvent.TrackUnmuted, handler);
      room.off(RoomEvent.TrackPublished, handler);
      room.off(RoomEvent.TrackUnpublished, handler);
      room.off(RoomEvent.LocalTrackPublished, handler);
      room.off(RoomEvent.LocalTrackUnpublished, handler);
    };
  }, [room, buildPanelistList, refreshTrigger]);

  return {
    panelists,
    totalSpeakers: panelists.length,
    refresh,
  };
}
