/**
 * PanelistStudio — view for invited co-hosts and panelists.
 *
 * They join the same LiveKit room as the host and publish their camera/mic.
 * They see the multi-panelist grid and can chat with other panelists via the backstage.
 * Their permissions (screen share, mute others, etc.) are controlled by the host.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  ArrowLeft, Radio, Square, Crown, ShieldCheck, Shield, Users,
} from "lucide-react";
import { Room, RoomEvent, Track, LocalVideoTrack, LocalAudioTrack, VideoPresets, createLocalTracks } from "livekit-client";
import { PanelistVideoGrid } from "@/components/webinar/PanelistVideoGrid";
import { useLiveKitPanelists } from "@/hooks/use-livekit-panelists";

const GOLD = "#d4b461";

const ROLE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  host: { label: "Host", icon: Crown, color: "#d4b461" },
  co_host: { label: "Co-Host", icon: ShieldCheck, color: "#34d399" },
  panelist: { label: "Panelist", icon: Shield, color: "#60a5fa" },
};

export default function PanelistStudio() {
  const params = useParams<{ id: string }>();
  const [, nav] = useLocation();
  const webinarId = params?.id;

  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [panelistInfo, setPanelistInfo] = useState<{ name: string; role: string; permissions: any } | null>(null);

  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const screenTrackRef = useRef<LocalVideoTrack | null>(null);

  const { panelists } = useLiveKitPanelists(room);

  // Connect to LiveKit using the panelist token from sessionStorage
  const connect = useCallback(async () => {
    if (!webinarId) return;

    const stored = sessionStorage.getItem(`panelist-token-${webinarId}`);
    if (!stored) {
      setError("No panelist credentials found. Please use your invitation link.");
      return;
    }

    try {
      const data = JSON.parse(stored);
      setPanelistInfo({ name: data.panelistName, role: data.role, permissions: data.permissions });

      const r = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
      });

      r.on(RoomEvent.Disconnected, () => {
        setConnected(false);
      });

      await r.connect(data.url, data.token);
      setRoom(r);
      setConnected(true);

      // Auto-publish camera + mic
      const tracks = await createLocalTracks({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: { resolution: VideoPresets.h720.resolution },
      });

      for (const track of tracks) {
        if (track.kind === Track.Kind.Video) {
          localVideoTrackRef.current = track as LocalVideoTrack;
          await r.localParticipant.publishTrack(track);
        } else if (track.kind === Track.Kind.Audio) {
          localAudioTrackRef.current = track as LocalAudioTrack;
          await r.localParticipant.publishTrack(track);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    }
  }, [webinarId]);

  useEffect(() => {
    connect();
    return () => {
      if (localVideoTrackRef.current) localVideoTrackRef.current.stop();
      if (localAudioTrackRef.current) localAudioTrackRef.current.stop();
      if (screenTrackRef.current) screenTrackRef.current.stop();
      if (room) room.disconnect();
    };
  }, []);

  const toggleMic = () => {
    if (!localAudioTrackRef.current) return;
    if (micOn) localAudioTrackRef.current.mute();
    else localAudioTrackRef.current.unmute();
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    if (!localVideoTrackRef.current) return;
    if (camOn) localVideoTrackRef.current.mute();
    else localVideoTrackRef.current.unmute();
    setCamOn(!camOn);
  };

  const startScreenShare = async () => {
    if (!room || !panelistInfo?.permissions?.canShareScreen) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true,
      });

      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        const localTrack = new LocalVideoTrack(videoTrack);
        screenTrackRef.current = localTrack;
        await room.localParticipant.publishTrack(localTrack, {
          source: Track.Source.ScreenShare,
        });
        setScreenSharing(true);

        videoTrack.addEventListener("ended", () => stopScreenShare());
      }
    } catch (err: any) {
      console.error("Screen share failed:", err);
    }
  };

  const stopScreenShare = () => {
    if (screenTrackRef.current && room) {
      room.localParticipant.unpublishTrack(screenTrackRef.current);
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    setScreenSharing(false);
  };

  const leave = () => {
    if (room) room.disconnect();
    if (webinarId) sessionStorage.removeItem(`panelist-token-${webinarId}`);
    nav("/");
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#040406" }}>
        <div className="text-center px-6 max-w-md">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-500/15">
            <Radio className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Connection Error</h2>
          <p className="text-sm text-zinc-400 mb-6">{error}</p>
          <Button onClick={() => nav("/")} variant="ghost" className="text-zinc-400">← Back</Button>
        </div>
      </div>
    );
  }

  const role = panelistInfo?.role ? ROLE_INFO[panelistInfo.role] : ROLE_INFO.panelist;
  const RoleIcon = role.icon;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#040406", color: "#fff" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}14`, background: "rgba(4,4,6,0.98)" }}>
        <div className="flex items-center gap-3">
          <button onClick={leave} className="text-zinc-500 hover:text-white p-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-white">Panelist Studio</p>
            {panelistInfo && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: `${role.color}20`, color: role.color }}>
                  <RoleIcon className="w-2.5 h-2.5" /> {role.label}
                </span>
                <span className="text-[10px] text-zinc-500">{panelistInfo.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connected && (
            <span className="flex items-center gap-1 text-xs font-bold text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Connected
            </span>
          )}
          {panelists.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <Users className="w-3.5 h-3.5" /> {panelists.length} on stage
            </span>
          )}
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {!connected ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
          </div>
        ) : (
          <PanelistVideoGrid panelists={panelists} />
        )}
      </div>

      {/* Controls */}
      {connected && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${GOLD}12`, background: "#040406" }}>
          <button onClick={toggleMic}
            className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
            style={{
              background: !micOn ? "#ef444428" : "rgba(255,255,255,0.06)",
              border: `1px solid ${!micOn ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
            }}>
            {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-red-400" />}
            <span className="text-[9px] text-zinc-500">{micOn ? "Mute" : "Muted"}</span>
          </button>

          <button onClick={toggleCam}
            className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
            style={{
              background: !camOn ? "#ef444428" : "rgba(255,255,255,0.06)",
              border: `1px solid ${!camOn ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
            }}>
            {camOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-red-400" />}
            <span className="text-[9px] text-zinc-500">{camOn ? "Camera" : "Off"}</span>
          </button>

          {panelistInfo?.permissions?.canShareScreen && (
            <button onClick={screenSharing ? stopScreenShare : startScreenShare}
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
              style={{
                background: screenSharing ? `${GOLD}20` : "rgba(255,255,255,0.06)",
                border: `1px solid ${screenSharing ? GOLD : "rgba(255,255,255,0.1)"}`,
              }}>
              {screenSharing ? <MonitorOff className="w-5 h-5" style={{ color: GOLD }} /> : <Monitor className="w-5 h-5 text-white" />}
              <span className="text-[9px] text-zinc-500">{screenSharing ? "Unshare" : "Screen"}</span>
            </button>
          )}

          <div className="w-px h-8 bg-zinc-800 mx-1" />

          <Button onClick={leave} className="gap-1.5 font-semibold h-10 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
            <Square className="w-3.5 h-3.5" /> Leave
          </Button>
        </div>
      )}
    </div>
  );
}
