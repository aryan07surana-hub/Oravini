/**
 * PanelistVideoGrid — renders a multi-camera grid for host + panelists.
 *
 * Layouts adapt automatically:
 *   1 person   → fullscreen
 *   2 people   → side-by-side
 *   3-4 people → 2x2 grid
 *   5-6 people → 3x2 grid
 *   7-9 people → 3x3 grid
 *   10+ people → scrollable strip below main speaker
 *
 * If anyone is screen sharing, the screen share takes the main spot
 * and all cameras appear as thumbnails.
 */

import { useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff, Crown, ShieldCheck, Shield, Monitor } from "lucide-react";
import type { PanelistTrack } from "@/hooks/use-livekit-panelists";

const GOLD = "#d4b461";

const ROLE_BADGES = {
  host: { label: "HOST", color: "#d4b461", Icon: Crown },
  co_host: { label: "CO-HOST", color: "#34d399", Icon: ShieldCheck },
  panelist: { label: "PANELIST", color: "#60a5fa", Icon: Shield },
  attendee: { label: "", color: "#a1a1aa", Icon: Shield },
};

interface PanelistTileProps {
  panelist: PanelistTrack;
  isMain?: boolean;
  isThumbnail?: boolean;
}

function PanelistTile({ panelist, isMain, isThumbnail }: PanelistTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const role = ROLE_BADGES[panelist.role];
  const RoleIcon = role.Icon;

  // Attach video track
  useEffect(() => {
    if (!videoRef.current) return;
    const track = panelist.videoTrack;
    if (track && !panelist.isCameraOff) {
      track.attach(videoRef.current);
      return () => { try { track.detach(videoRef.current!); } catch {} };
    }
  }, [panelist.videoTrack, panelist.isCameraOff]);

  // Attach audio track (only for remote — local audio is monitored separately)
  useEffect(() => {
    if (!audioRef.current || panelist.isLocal) return;
    const track = panelist.audioTrack;
    if (track && !panelist.isMuted) {
      track.attach(audioRef.current);
      return () => { try { track.detach(audioRef.current!); } catch {} };
    }
  }, [panelist.audioTrack, panelist.isMuted, panelist.isLocal]);

  const initials = panelist.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const showVideo = !panelist.isCameraOff && panelist.videoTrack;

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-zinc-900 ${
      isMain ? "w-full h-full" : isThumbnail ? "w-full aspect-video" : "w-full h-full"
    }`} style={{ border: panelist.role === "host" ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.06)" }}>
      {showVideo ? (
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted={panelist.isLocal} />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{
          background: `linear-gradient(135deg, hsl(${panelist.name.charCodeAt(0) * 7 % 360}, 30%, 20%) 0%, hsl(${panelist.name.charCodeAt(0) * 7 % 360}, 25%, 15%) 100%)`,
        }}>
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-2xl md:text-3xl font-black text-white"
            style={{ background: `hsl(${panelist.name.charCodeAt(0) * 7 % 360}, 45%, 35%)` }}>
            {initials}
          </div>
        </div>
      )}

      {/* Hidden audio element for remote audio playback */}
      {!panelist.isLocal && <audio ref={audioRef} autoPlay />}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center gap-2"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
        {role.label && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5"
            style={{ background: `${role.color}25`, color: role.color }}>
            <RoleIcon className="w-2.5 h-2.5" /> {role.label}
          </span>
        )}
        <span className="text-xs font-semibold text-white truncate flex-1">
          {panelist.name}{panelist.isLocal && " (You)"}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {panelist.isMuted ? (
            <MicOff className="w-3 h-3 text-red-400" />
          ) : (
            <Mic className="w-3 h-3 text-green-400" />
          )}
          {panelist.isCameraOff && <VideoOff className="w-3 h-3 text-zinc-500" />}
        </div>
      </div>

      {/* Speaking indicator */}
      {!panelist.isMuted && !panelist.isCameraOff && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      )}
    </div>
  );
}

interface PanelistVideoGridProps {
  panelists: PanelistTrack[];
  /** Optional override — render this video element as the main view (for direct host preview) */
  mainVideoOverride?: React.ReactNode;
}

export function PanelistVideoGrid({ panelists, mainVideoOverride }: PanelistVideoGridProps) {
  // Find a screen sharer
  const screenSharer = panelists.find(p => p.screenShareTrack);
  const screenRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!screenRef.current || !screenSharer?.screenShareTrack) return;
    const track = screenSharer.screenShareTrack;
    track.attach(screenRef.current);
    return () => { try { track.detach(screenRef.current!); } catch {} };
  }, [screenSharer?.screenShareTrack]);

  // ── Screen-share mode: screen takes main spot, panelists become a strip ──
  if (screenSharer) {
    return (
      <div className="w-full h-full flex flex-col gap-2 p-2">
        {/* Screen share main */}
        <div className="flex-1 rounded-2xl overflow-hidden relative bg-black" style={{ border: `2px solid ${GOLD}40` }}>
          <video ref={screenRef} className="w-full h-full object-contain" autoPlay playsInline />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ background: `${GOLD}25`, color: GOLD, border: `1px solid ${GOLD}50` }}>
            <Monitor className="w-3 h-3" /> {screenSharer.name} is sharing
          </div>
        </div>
        {/* Panelist strip */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ height: "120px", flexShrink: 0 }}>
          {panelists.map(p => (
            <div key={p.identity} className="flex-shrink-0" style={{ width: "200px", height: "100%" }}>
              <PanelistTile panelist={p} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── No panelists yet: show host preview override ──
  if (panelists.length === 0) {
    return <div className="w-full h-full">{mainVideoOverride}</div>;
  }

  // ── Single panelist: fullscreen ──
  if (panelists.length === 1) {
    return (
      <div className="w-full h-full p-2">
        <PanelistTile panelist={panelists[0]} isMain />
      </div>
    );
  }

  // ── Compute grid dimensions ──
  const count = panelists.length;
  const useStrip = count > 9;
  const visiblePanelists = useStrip ? panelists.slice(0, 9) : panelists;

  let cols = 1;
  let rows = 1;
  if (count === 2) { cols = 2; rows = 1; }
  else if (count <= 4) { cols = 2; rows = 2; }
  else if (count <= 6) { cols = 3; rows = 2; }
  else { cols = 3; rows = 3; }

  return (
    <div className="w-full h-full p-2">
      <div className="w-full h-full grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}>
        {visiblePanelists.map(p => (
          <PanelistTile key={p.identity} panelist={p} />
        ))}
      </div>
      {useStrip && panelists.length > 9 && (
        <div className="mt-2 text-center text-[10px] text-zinc-500">
          +{panelists.length - 9} more panelists
        </div>
      )}
    </div>
  );
}
