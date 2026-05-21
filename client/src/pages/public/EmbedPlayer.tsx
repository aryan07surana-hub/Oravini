import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import {
  AnnotationOverlay,
  TurnstileOverlay,
  InteractiveCTAOverlay,
  ChapterMarkers,
  ChapterNavStrip,
  useActiveInteractive,
  type InteractiveElement,
  type Chapter,
} from "@/components/video-marketing/InteractiveOverlays";
import { OraviniBadge, type WatermarkPosition } from "@/components/video-marketing/OraviniBadge";

/**
 * Oravini Embed Player — Wistia-style embeddable video player.
 * 
 * This is a lightweight, standalone player designed to be embedded via iframe
 * on any external website. Features:
 * - Custom HTML5 video controls (play/pause, progress, volume, speed, fullscreen)
 * - Oravini watermark branding (bottom-right, like Wistia)
 * - Custom brand color support per video
 * - Lead gate (email capture before watching)
 * - Timed CTA overlays
 * - View tracking & analytics
 * - Responsive 16:9 aspect ratio
 * - No external page chrome — just the player
 */

const GOLD = "#d4b461";

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|mov|webm|ogg|mkv|m4v)(\?.*)?$/i.test(url) || url.startsWith("/uploads/");
}

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&controls=0&showinfo=0`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}?dnt=1&controls=0`;
  return url;
}

function isExternalEmbed(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com") || url.includes("wistia") || url.includes("loom.com");
}

// ── Speed Menu ──────────────────────────────────────────────────────────────

function SpeedMenu({ current, onChange, onClose }: { current: number; onChange: (s: number) => void; onClose: () => void }) {
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  return (
    <div
      className="absolute bottom-12 right-2 rounded-lg overflow-hidden shadow-2xl z-50"
      style={{ background: "rgba(20,20,24,0.96)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Speed</p>
      </div>
      {speeds.map(s => (
        <button
          key={s}
          onClick={() => { onChange(s); onClose(); }}
          className="w-full px-4 py-2 text-left text-xs font-semibold transition-colors hover:bg-white/[0.06] flex items-center justify-between"
          style={{ color: current === s ? GOLD : "rgba(255,255,255,0.7)" }}
        >
          <span>{s === 1 ? "Normal" : `${s}×`}</span>
          {current === s && <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />}
        </button>
      ))}
    </div>
  );
}

// ── Lead Gate ───────────────────────────────────────────────────────────────

function LeadGate({ video, onUnlock }: { video: any; onUnlock: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const brandColor = video.brandColor || GOLD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError("Name and email required"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/video/${video.id}/gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!r.ok) { const d = await r.json(); setError(d.message || "Failed"); return; }
      onUnlock();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-xs px-6">
        {video.thumbnailUrl && (
          <div className="w-full aspect-video rounded-lg overflow-hidden mb-4 opacity-30">
            <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: `${brandColor}20`, border: `1px solid ${brandColor}40` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p className="text-sm font-bold text-white text-center mb-1">{video.title}</p>
        <p className="text-[11px] text-zinc-500 text-center mb-4">Enter your details to watch</p>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input
            type="text" placeholder="Your name" value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-9 px-3 rounded-lg text-xs text-white placeholder-zinc-500 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
          <input
            type="email" placeholder="Your email" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-9 px-3 rounded-lg text-xs text-white placeholder-zinc-500 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
          {error && <p className="text-[10px] text-red-400">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full h-9 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: brandColor, color: "#000" }}
          >
            {loading ? "..." : "▶ Watch Now"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── CTA Overlay ─────────────────────────────────────────────────────────────

function CTAOverlay({ cta, brandColor, videoId }: { cta: any; brandColor: string; videoId: string }) {
  const handleClick = () => {
    fetch(`/api/video-ctas/${cta.id}/click`, { method: "POST" }).catch(() => {});
    if (cta.url) window.open(cta.url, "_blank");
  };

  return (
    <div
      className="absolute left-4 right-4 bottom-16 flex items-center justify-between gap-3 px-4 py-3 rounded-xl z-30 animate-in fade-in slide-in-from-bottom-2"
      style={{ background: "rgba(0,0,0,0.85)", border: `1px solid ${brandColor}40`, backdropFilter: "blur(8px)" }}
    >
      <p className="text-xs font-semibold text-white truncate flex-1">{cta.text}</p>
      <button
        onClick={handleClick}
        className="flex-shrink-0 px-4 py-1.5 rounded-lg text-[11px] font-black transition-all hover:scale-105"
        style={{ background: brandColor, color: "#000" }}
      >
        {cta.buttonText || "Learn More"}
      </button>
    </div>
  );
}

// ── Oravini Watermark ───────────────────────────────────────────────────────

function OraviniWatermark({ position = "bottom-right", show = true }: { position?: string; show?: boolean }) {
  return <OraviniBadge position={position as WatermarkPosition} show={show} variant="player" />;
}

// ── Custom Player Controls ──────────────────────────────────────────────────

function PlayerControls({
  videoRef,
  playing,
  currentTime,
  duration,
  volume,
  muted,
  speed,
  brandColor,
  allowSpeedControl,
  chapters,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onSpeedChange,
  onFullscreen,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  speed: number;
  brandColor: string;
  allowSpeedControl: boolean;
  chapters?: Chapter[];
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
  onSpeedChange: (s: number) => void;
  onFullscreen: () => void;
}) {
  const [showSpeed, setShowSpeed] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    onSeek(x * duration);
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 transition-opacity"
      style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}
      onClick={e => e.stopPropagation()}
    >
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="w-full h-1.5 cursor-pointer group relative mx-0"
        onClick={handleProgressClick}
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: brandColor }}
        />
        {/* Chapter markers */}
        {chapters && chapters.length > 0 && <ChapterMarkers chapters={chapters} duration={duration} brandColor={brandColor} />}
        {/* Scrubber dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${pct}%`, transform: `translate(-50%, -50%)`, background: brandColor, boxShadow: `0 0 6px ${brandColor}80` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Play/Pause */}
        <button onClick={onPlayPause} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M5 3l14 9-14 9V3z" /></svg>
          )}
        </button>

        {/* Time */}
        <span className="text-[11px] font-mono text-zinc-300 min-w-[80px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex-1" />

        {/* Volume */}
        <div className="relative" onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
          <button onClick={onMuteToggle} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
            {muted || volume === 0 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            )}
          </button>
          {showVolume && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-8 h-24 rounded-lg flex items-center justify-center" style={{ background: "rgba(20,20,24,0.96)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <input
                type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                onChange={e => onVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 appearance-none rounded-full cursor-pointer"
                style={{ transform: "rotate(-90deg)", accentColor: brandColor, background: "rgba(255,255,255,0.2)" }}
              />
            </div>
          )}
        </div>

        {/* Speed */}
        {allowSpeedControl && (
          <div className="relative">
            <button
              onClick={() => setShowSpeed(!showSpeed)}
              className="h-7 px-2 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-[11px] font-bold text-zinc-300"
            >
              {speed === 1 ? "1×" : `${speed}×`}
            </button>
            {showSpeed && <SpeedMenu current={speed} onChange={onSpeedChange} onClose={() => setShowSpeed(false)} />}
          </div>
        )}

        {/* Fullscreen */}
        <button onClick={onFullscreen} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Embed Player ───────────────────────────────────────────────────────

// Analytics helper — detects device/browser/referrer info
function getViewerMetadata() {
  const ua = navigator.userAgent;
  let device = "desktop";
  if (/Mobi|Android/i.test(ua)) device = "mobile";
  else if (/Tablet|iPad/i.test(ua)) device = "tablet";

  let browser = "Other";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  let os = "Other";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";

  const referrer = document.referrer || "";
  let referrerDomain = "";
  try { if (referrer) referrerDomain = new URL(referrer).hostname; } catch {}

  // UTM params from parent page
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") || "";
  const utmMedium = params.get("utm_medium") || "";
  const utmCampaign = params.get("utm_campaign") || "";

  return { device, browser, os, screenWidth: window.innerWidth, referrer, referrerDomain, utmSource, utmMedium, utmCampaign };
}

function generateSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function EmbedPlayer() {
  const params = useParams<{ id: string }>();
  const videoId = params?.id;

  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [ctas, setCtas] = useState<any[]>([]);
  const [activeCta, setActiveCta] = useState<any>(null);
  const [viewTracked, setViewTracked] = useState(false);

  // Wistia-style enhancements
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [interactive, setInteractive] = useState<InteractiveElement[]>([]);
  const [passedTurnstileIds, setPassedTurnstileIds] = useState<Set<string>>(new Set());
  const [dismissedCtaIds, setDismissedCtaIds] = useState<Set<string>>(new Set());

  // Player state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const sessionIdRef = useRef<string>(generateSessionId());
  const metadataRef = useRef<ReturnType<typeof getViewerMetadata> | null>(null);
  const lastProgressRef = useRef<number>(0);
  const watchStartRef = useRef<number>(0);
  const totalWatchRef = useRef<number>(0);

  // Initialize metadata on mount
  useEffect(() => {
    metadataRef.current = getViewerMetadata();
  }, []);

  // Analytics tracking function
  const trackEvent = useCallback((eventType: string, position: number, extra?: Record<string, any>) => {
    if (!videoId) return;
    const metadata = { ...metadataRef.current, ...extra };
    fetch("/api/video-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, sessionId: sessionIdRef.current, eventType, position, metadata }),
    }).catch(() => {});
  }, [videoId]);

  // Track progress every 5 seconds of watch time
  useEffect(() => {
    if (!playing || !hasStarted) return;
    const interval = setInterval(() => {
      const pos = videoRef.current?.currentTime || 0;
      const dur = videoRef.current?.duration || 0;
      if (pos - lastProgressRef.current >= 5) {
        lastProgressRef.current = pos;
        totalWatchRef.current += 5;
        const completionPct = dur > 0 ? Math.round((pos / dur) * 100) : 0;
        trackEvent("progress", pos, { totalWatchSeconds: totalWatchRef.current, completionPct });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, hasStarted, trackEvent]);

  // Fetch video data
  useEffect(() => {
    if (!videoId) return;
    fetch(`/api/video/${videoId}/public`)
      .then(r => r.json())
      .then(d => {
        if (d.message) { setError(d.message); }
        else {
          setVideo(d);
          if (!d.leadGateEnabled) setGateUnlocked(true);
          if (d.defaultPlaybackSpeed) setSpeed(d.defaultPlaybackSpeed);
        }
        setLoading(false);
      })
      .catch(() => { setError("Could not load video."); setLoading(false); });
  }, [videoId]);

  // Fetch CTAs
  useEffect(() => {
    if (!videoId || !gateUnlocked) return;
    fetch(`/api/video/${videoId}/ctas`).then(r => r.json()).then(setCtas).catch(() => {});
    fetch(`/api/video/${videoId}/chapters`).then(r => r.json()).then(setChapters).catch(() => {});
    fetch(`/api/video/${videoId}/interactive`).then(r => r.json()).then(setInteractive).catch(() => {});
  }, [videoId, gateUnlocked]);

  // Track view
  const trackView = useCallback(() => {
    if (!videoId || viewTracked) return;
    setViewTracked(true);
    fetch(`/api/video-events/${videoId}/view`, { method: "POST" }).catch(() => {});
    trackEvent("play", 0);
    watchStartRef.current = Date.now();
  }, [videoId, viewTracked, trackEvent]);

  // Time update — check CTAs
  useEffect(() => {
    if (!ctas.length) return;
    const sec = Math.floor(currentTime);
    const active = ctas.find((c: any) => {
      const appear = c.appearAt || 0;
      const disappear = c.disappearAt || Infinity;
      return sec >= appear && sec <= disappear && c.isActive;
    });
    setActiveCta(active || null);
  }, [currentTime, ctas]);

  // Wistia-style interactive elements
  const interactiveState = useActiveInteractive(interactive, currentTime, passedTurnstileIds, dismissedCtaIds);

  // Auto-pause when turnstile shows; resume on dismiss
  useEffect(() => {
    if (interactiveState.type === "turnstile" && playing && videoRef.current) {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [interactiveState.type, playing]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    if (playing) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) setShowControls(true);
    else resetControlsTimer();
  }, [playing, resetControlsTimer]);

  // Player handlers
  const handlePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play(); setPlaying(true);
      if (!hasStarted) { setHasStarted(true); trackView(); }
      else { trackEvent("play", v.currentTime); }
      watchStartRef.current = Date.now();
    } else {
      v.pause(); setPlaying(false);
      trackEvent("pause", v.currentTime);
    }
  }, [hasStarted, trackView, trackEvent]);

  const handleSeek = useCallback((t: number) => {
    if (videoRef.current) {
      const from = videoRef.current.currentTime;
      videoRef.current.currentTime = t;
      trackEvent("seek", t, { seekFrom: from });
    }
  }, [trackEvent]);

  const handleVolumeChange = useCallback((v: number) => {
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = false; }
    setVolume(v); setMuted(false);
  }, []);

  const handleMuteToggle = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
    setMuted(m => !m);
  }, []);

  const handleSpeedChange = useCallback((s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s;
    setSpeed(s);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  }, []);

  // Loading state
  if (loading) return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "#000", aspectRatio: "16/9" }}>
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );

  // Error state
  if (error) return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: "#000", aspectRatio: "16/9" }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
      <p className="text-xs text-zinc-500">{error}</p>
    </div>
  );

  if (!video) return null;

  // Expired
  if (video.expiresAt && new Date(video.expiresAt) < new Date()) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: "#000", aspectRatio: "16/9" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        <p className="text-xs text-zinc-500">This video has expired.</p>
      </div>
    );
  }

  const brandColor = video.brandColor || GOLD;
  const direct = isDirectVideo(video.videoUrl);
  const external = isExternalEmbed(video.videoUrl);
  const showWatermark = video.showOraviniWatermark !== false;
  const watermarkPosition = video.oraviniWatermarkPosition || "bottom-right";
  const allowSpeed = video.allowSpeedControl !== false;

  // External embed (YouTube/Vimeo) — show in iframe with watermark overlay
  if (external) {
    return (
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ aspectRatio: "16/9", background: "#000" }}
      >
        {!gateUnlocked && <LeadGate video={video} onUnlock={() => setGateUnlocked(true)} />}
        <iframe
          src={getEmbedUrl(video.videoUrl)}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          title={video.title}
          onLoad={trackView}
        />
        <OraviniWatermark position={watermarkPosition} show={showWatermark} />
      </div>
    );
  }

  // Direct video — full custom player
  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ aspectRatio: "16/9", background: "#000" }}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
      onClick={handlePlayPause}
    >
      {/* Lead Gate */}
      {!gateUnlocked && <LeadGate video={video} onUnlock={() => setGateUnlocked(true)} />}

      {/* Video element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        poster={video.thumbnailUrl || undefined}
        onTimeUpdate={() => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); }}
        onLoadedMetadata={() => { if (videoRef.current) { setDuration(videoRef.current.duration); videoRef.current.playbackRate = speed; } }}
        onEnded={() => { setPlaying(false); trackEvent("complete", duration, { totalWatchSeconds: totalWatchRef.current, completionPct: 100 }); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Big play button (before first play) */}
      {!hasStarted && gateUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: `${brandColor}dd`, boxShadow: `0 0 40px ${brandColor}40` }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M5 3l14 9-14 9V3z" /></svg>
          </div>
        </div>
      )}

      {/* CTA Overlay (legacy timestamped CTAs from videoCtas table) */}
      {activeCta && gateUnlocked && <CTAOverlay cta={activeCta} brandColor={brandColor} videoId={videoId!} />}

      {/* Wistia-style mid-video annotations */}
      {gateUnlocked && interactiveState.type === "playing" && interactiveState.annotations?.map(el => (
        <AnnotationOverlay key={el.id} element={el} brandColor={brandColor} videoId={videoId} />
      ))}

      {/* Wistia-style mid-video CTA pop-up */}
      {gateUnlocked && interactiveState.type === "playing" && interactiveState.cta && (
        <InteractiveCTAOverlay
          element={interactiveState.cta}
          brandColor={brandColor}
          videoId={videoId}
          onDismiss={() => setDismissedCtaIds(prev => new Set([...Array.from(prev), interactiveState.cta!.id]))}
        />
      )}

      {/* Wistia-style mid-video turnstile gate */}
      {gateUnlocked && interactiveState.type === "turnstile" && (
        <TurnstileOverlay
          element={interactiveState.element}
          brandColor={brandColor}
          videoId={videoId}
          onPass={() => {
            setPassedTurnstileIds(prev => new Set([...Array.from(prev), interactiveState.element.id]));
            videoRef.current?.play();
          }}
          onSkip={interactiveState.element.skipAllowed ? () => {
            setPassedTurnstileIds(prev => new Set([...Array.from(prev), interactiveState.element.id]));
            videoRef.current?.play();
          } : undefined}
        />
      )}

      {/* Oravini Watermark */}
      <OraviniWatermark position={watermarkPosition} show={showWatermark} />

      {/* Custom Controls */}
      {gateUnlocked && hasStarted && (
        <div style={{ opacity: showControls ? 1 : 0, transition: "opacity 0.3s" }}>
          <PlayerControls
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
            playing={playing}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            muted={muted}
            speed={speed}
            brandColor={brandColor}
            allowSpeedControl={allowSpeed}
            chapters={chapters}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={handleMuteToggle}
            onSpeedChange={handleSpeedChange}
            onFullscreen={handleFullscreen}
          />
        </div>
      )}

      {/* Brand logo (user's custom logo) */}
      {video.logoUrl && (
        <div className="absolute top-3 left-3 z-20">
          <img src={video.logoUrl} alt="" className="h-6 w-auto rounded opacity-70" />
        </div>
      )}
    </div>
  );
}
