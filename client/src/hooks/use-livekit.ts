/**
 * LiveKit integration hook for webinar hosting.
 * 
 * Provides unlimited attendees, unlimited duration, and 4K streaming
 * via LiveKit's SFU architecture. Falls back to legacy WebRTC P2P
 * if LiveKit is not configured on the server.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Room,
  RoomEvent,
  Track,
  LocalTrack,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  VideoPresets,
  createLocalTracks,
  ConnectionState,
} from "livekit-client";
import { apiRequest } from "@/lib/queryClient";

export type LiveKitStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface UseLiveKitHostOptions {
  webinarId: string | number;
  onParticipantJoined?: (participant: RemoteParticipant) => void;
  onParticipantLeft?: (participant: RemoteParticipant) => void;
  onParticipantCountChanged?: (count: number) => void;
  onDataReceived?: (data: Uint8Array, participant?: RemoteParticipant) => void;
}

interface UseLiveKitHostReturn {
  status: LiveKitStatus;
  room: Room | null;
  participantCount: number;
  isLiveKitAvailable: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  publishCamera: (deviceId?: string, quality?: "720p" | "1080p" | "4k") => Promise<void>;
  publishScreen: () => Promise<void>;
  unpublishCamera: () => void;
  unpublishScreen: () => void;
  toggleMic: (enabled: boolean) => void;
  toggleCam: (enabled: boolean) => void;
  sendData: (data: string) => void;
  error: string | null;
}

const QUALITY_MAP = {
  "720p": VideoPresets.h720,
  "1080p": VideoPresets.h1080,
  "4k": VideoPresets.h2160,
};

export function useLiveKitHost(options: UseLiveKitHostOptions): UseLiveKitHostReturn {
  const { webinarId, onParticipantJoined, onParticipantLeft, onParticipantCountChanged, onDataReceived } = options;

  const [status, setStatus] = useState<LiveKitStatus>("idle");
  const [participantCount, setParticipantCount] = useState(0);
  const [isLiveKitAvailable, setIsLiveKitAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const screenTrackRef = useRef<LocalVideoTrack | null>(null);

  // Check if LiveKit is configured on mount
  useEffect(() => {
    fetch("/api/livekit/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => setIsLiveKitAvailable(d.configured))
      .catch(() => setIsLiveKitAvailable(false));
  }, []);

  const updateParticipantCount = useCallback(() => {
    if (!roomRef.current) return;
    // Subtract 1 for the host
    const count = roomRef.current.numParticipants;
    setParticipantCount(count);
    onParticipantCountChanged?.(count);
  }, [onParticipantCountChanged]);

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      setStatus("connecting");
      setError(null);

      // Get token from server
      const resp = await apiRequest("POST", `/api/webinars/${webinarId}/livekit/host-token`);
      const { token, url } = await resp.json();

      // Create and connect room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h1080.resolution,
        },
      });

      roomRef.current = room;

      // Set up event listeners
      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        updateParticipantCount();
        onParticipantJoined?.(participant);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        updateParticipantCount();
        onParticipantLeft?.(participant);
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        onDataReceived?.(payload, participant);
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Connected) setStatus("connected");
        else if (state === ConnectionState.Disconnected) setStatus("disconnected");
        else if (state === ConnectionState.Reconnecting) setStatus("connecting");
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus("disconnected");
      });

      await room.connect(url, token);
      setStatus("connected");
      updateParticipantCount();
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to connect to LiveKit");
      setStatus("error");
      return false;
    }
  }, [webinarId, updateParticipantCount, onParticipantJoined, onParticipantLeft, onDataReceived]);

  const disconnect = useCallback(() => {
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current = null;
    }
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setStatus("disconnected");
    setParticipantCount(0);
  }, []);

  const publishCamera = useCallback(async (deviceId?: string, quality: "720p" | "1080p" | "4k" = "1080p") => {
    if (!roomRef.current) throw new Error("Not connected");

    const preset = QUALITY_MAP[quality];
    const tracks = await createLocalTracks({
      audio: { deviceId: deviceId ? undefined : undefined, echoCancellation: true, noiseSuppression: true },
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        resolution: preset.resolution,
      },
    });

    for (const track of tracks) {
      if (track.kind === Track.Kind.Video) {
        localVideoTrackRef.current = track as LocalVideoTrack;
        await roomRef.current.localParticipant.publishTrack(track, {
          videoEncoding: preset.encoding,
          simulcast: true, // Enable simulcast for adaptive quality
          videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
        });
      } else if (track.kind === Track.Kind.Audio) {
        localAudioTrackRef.current = track as LocalAudioTrack;
        await roomRef.current.localParticipant.publishTrack(track);
      }
    }
  }, []);

  const publishScreen = useCallback(async () => {
    if (!roomRef.current) throw new Error("Not connected");

    const tracks = await createLocalTracks({
      audio: false,
      video: false,
    });

    // Use getDisplayMedia for screen sharing
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 } },
      audio: true,
    });

    const videoTrack = screenStream.getVideoTracks()[0];
    if (videoTrack) {
      const localTrack = new LocalVideoTrack(videoTrack, undefined, false);
      screenTrackRef.current = localTrack;
      await roomRef.current.localParticipant.publishTrack(localTrack, {
        source: Track.Source.ScreenShare,
        simulcast: false, // Screen share doesn't need simulcast
        videoEncoding: { maxBitrate: 8_000_000, maxFramerate: 30 }, // High bitrate for 4K screen
      });

      // Handle when user stops sharing via browser UI
      videoTrack.addEventListener("ended", () => {
        unpublishScreen();
      });
    }

    // Publish screen audio if available
    const audioTrack = screenStream.getAudioTracks()[0];
    if (audioTrack) {
      const localAudio = new LocalAudioTrack(audioTrack, undefined, false);
      await roomRef.current.localParticipant.publishTrack(localAudio, {
        source: Track.Source.ScreenShareAudio,
      });
    }
  }, []);

  const unpublishCamera = useCallback(() => {
    if (localVideoTrackRef.current && roomRef.current) {
      roomRef.current.localParticipant.unpublishTrack(localVideoTrackRef.current);
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current = null;
    }
    if (localAudioTrackRef.current && roomRef.current) {
      roomRef.current.localParticipant.unpublishTrack(localAudioTrackRef.current);
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
    }
  }, []);

  const unpublishScreen = useCallback(() => {
    if (screenTrackRef.current && roomRef.current) {
      roomRef.current.localParticipant.unpublishTrack(screenTrackRef.current);
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
  }, []);

  const toggleMic = useCallback((enabled: boolean) => {
    if (localAudioTrackRef.current) {
      if (enabled) {
        localAudioTrackRef.current.unmute();
      } else {
        localAudioTrackRef.current.mute();
      }
    }
  }, []);

  const toggleCam = useCallback((enabled: boolean) => {
    if (localVideoTrackRef.current) {
      if (enabled) {
        localVideoTrackRef.current.unmute();
      } else {
        localVideoTrackRef.current.mute();
      }
    }
  }, []);

  const sendData = useCallback((data: string) => {
    if (!roomRef.current) return;
    const encoder = new TextEncoder();
    roomRef.current.localParticipant.publishData(encoder.encode(data), { reliable: true });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    room: roomRef.current,
    participantCount,
    isLiveKitAvailable,
    connect,
    disconnect,
    publishCamera,
    publishScreen,
    unpublishCamera,
    unpublishScreen,
    toggleMic,
    toggleCam,
    sendData,
    error,
  };
}

// ── Viewer Hook ──────────────────────────────────────────────────────────────

interface UseLiveKitViewerOptions {
  webinarId: string | number;
  viewerName: string;
  viewerId: string;
  onTrackSubscribed?: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  onDataReceived?: (data: Uint8Array, participant?: RemoteParticipant) => void;
  onDisconnected?: () => void;
}

interface UseLiveKitViewerReturn {
  status: LiveKitStatus;
  room: Room | null;
  isLiveKitAvailable: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendData: (data: string) => void;
  error: string | null;
  videoElement: HTMLVideoElement | null;
  attachVideo: (element: HTMLVideoElement) => void;
}

export function useLiveKitViewer(options: UseLiveKitViewerOptions): UseLiveKitViewerReturn {
  const { webinarId, viewerName, viewerId, onTrackSubscribed, onDataReceived, onDisconnected } = options;

  const [status, setStatus] = useState<LiveKitStatus>("idle");
  const [isLiveKitAvailable, setIsLiveKitAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const roomRef = useRef<Room | null>(null);

  // Check if LiveKit is configured
  useEffect(() => {
    fetch("/api/livekit/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => setIsLiveKitAvailable(d.configured))
      .catch(() => setIsLiveKitAvailable(false));
  }, []);

  const attachVideo = useCallback((element: HTMLVideoElement) => {
    setVideoElement(element);
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      setStatus("connecting");
      setError(null);

      // Get viewer token from server
      const resp = await fetch(`/api/webinars/${webinarId}/livekit/viewer-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: viewerName, viewerId }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || "Failed to get token");
      }

      const { token, url } = await resp.json();

      // Create and connect room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      // Handle incoming tracks
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Video) {
          // Attach video to element
          const element = track.attach();
          element.style.width = "100%";
          element.style.height = "100%";
          element.style.objectFit = "contain";
          // Dispatch custom event so the component can pick it up
          window.dispatchEvent(new CustomEvent("livekit-video-attached", { detail: { element, source: publication.source } }));
        }
        if (track.kind === Track.Kind.Audio) {
          track.attach(); // Audio auto-plays
        }
        onTrackSubscribed?.(track, publication, participant);
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        onDataReceived?.(payload, participant);
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Connected) setStatus("connected");
        else if (state === ConnectionState.Disconnected) setStatus("disconnected");
        else if (state === ConnectionState.Reconnecting) setStatus("connecting");
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus("disconnected");
        onDisconnected?.();
      });

      await room.connect(url, token);
      setStatus("connected");
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to connect");
      setStatus("error");
      return false;
    }
  }, [webinarId, viewerName, viewerId, onTrackSubscribed, onDataReceived, onDisconnected]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const sendData = useCallback((data: string) => {
    if (!roomRef.current) return;
    const encoder = new TextEncoder();
    roomRef.current.localParticipant.publishData(encoder.encode(data), { reliable: true });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    room: roomRef.current,
    isLiveKitAvailable,
    connect,
    disconnect,
    sendData,
    error,
    videoElement,
    attachVideo,
  };
}
