import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import {
  Lock, Play, Clock, ChevronRight, AlertCircle, Download,
  Loader2, Share2, Check, Copy, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AnnotationOverlay, TurnstileOverlay, InteractiveCTAOverlay,
  useActiveInteractive, type InteractiveElement,
} from "@/components/video-marketing/InteractiveOverlays";
import { OraviniBadge, type WatermarkPosition } from "@/components/video-marketing/OraviniBadge";

const GOLD = "#d4b461";

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}?dnt=1`;
  return url;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|mov|webm|ogg|mkv|m4v)(\?.*)?$/i.test(url);
}

function isEmbedUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be") ||
    url.includes("vimeo.com") || url.includes("wistia") || url.includes("loom.com");
}

function UrgencyBar({ text, endsAt }: { text: string; endsAt?: string | null }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("00:00:00"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold" style={{ background: `linear-gradient(90deg, #b45309, ${GOLD}, #b45309)`, color: "#000" }}>
      <Clock className="w-4 h-4 flex-shrink-0" />
      <span>{text.replace("{timer}", timeLeft || "00:00:00")}</span>
    </div>
  );
}

function SocialShare({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareX = () => window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, "_blank");
  const shareLinkedIn = () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>Share</span>
      <button onClick={shareX}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
        style={{ background: "rgba(255,255,255,0.06)", color: "#e1e1e1", border: "1px solid rgba(255,255,255,0.1)" }}>
        𝕏
      </button>
      <button onClick={shareLinkedIn}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
        style={{ background: "rgba(10,102,194,0.15)", color: "#0a66c2", border: "1px solid rgba(10,102,194,0.25)" }}>
        in
      </button>
      <button onClick={copyLink}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
        style={{ background: `${GOLD}12`, color: GOLD, border: `1px solid ${GOLD}28` }}>
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

export default function WatchVideo() {
  const params = useParams<{ id: string }>();
  const videoId = params?.id;

  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [gateForm, setGateForm] = useState({ name: "", email: "" });
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState("");
  const [chapters, setChapters] = useState<any[]>([]);
  const [ctas, setCtas] = useState<any[]>([]);
  const [viewTracked, setViewTracked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [interactive, setInteractive] = useState<InteractiveElement[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [passedTurnstileIds, setPassedTurnstileIds] = useState<Set<string>>(new Set());
  const [dismissedCtaIds, setDismissedCtaIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!videoId) return;
    fetch(`/api/video/${videoId}/public`)
      .then(r => r.json())
      .then(d => {
        if (d.message) setError(d.message);
        else { setVideo(d); if (!d.leadGateEnabled) setGateUnlocked(true); }
        setLoading(false);
      })
      .catch(() => { setError("Could not load video."); setLoading(false); });
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !gateUnlocked) return;
    fetch(`/api/video/${videoId}/chapters`).then(r => r.json()).then(setChapters).catch(() => {});
    fetch(`/api/video/${videoId}/ctas`).then(r => r.json()).then(setCtas).catch(() => {});
    fetch(`/api/video/${videoId}/interactive`).then(r => r.json()).then(setInteractive).catch(() => {});
  }, [videoId, gateUnlocked]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [gateUnlocked]);

  const interactiveState = useActiveInteractive(interactive, currentTime, passedTurnstileIds, dismissedCtaIds);

  useEffect(() => {
    if (interactiveState.type === "turnstile" && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [interactiveState.type]);

  const trackView = useCallback(() => {
    if (!videoId || viewTracked) return;
    setViewTracked(true);
    fetch(`/api/video-events/${videoId}/view`, { method: "POST" }).catch(() => {});
  }, [videoId, viewTracked]);

  const handleGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateForm.name.trim() || !gateForm.email.trim()) { setGateError("Name and email required"); return; }
    setGateLoading(true); setGateError("");
    try {
      const r = await fetch(`/api/video/${videoId}/gate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gateForm),
      });
      if (!r.ok) { const d = await r.json(); setGateError(d.message || "Failed"); return; }
      setGateUnlocked(true);
    } catch { setGateError("Network error. Try again."); }
    finally { setGateLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#040406" }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3" style={{ background: "#040406" }}>
      <AlertCircle className="w-8 h-8 text-zinc-600" />
      <p className="text-zinc-400 text-sm font-medium">{error}</p>
    </div>
  );

  if (!video) return null;

  const isExpired = video.expiresAt && new Date(video.expiresAt) < new Date();
  if (isExpired) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3" style={{ background: "#040406" }}>
      <Clock className="w-8 h-8 text-zinc-600" />
      <p className="text-zinc-400 text-sm font-medium">This video has expired.</p>
    </div>
  );

  const embed   = isEmbedUrl(video.videoUrl);
  const direct  = isDirectVideo(video.videoUrl);
  const hasChapters = chapters.length > 0;
  const showWatermark = video.showOraviniWatermark !== false;
  const brandColor = video.brandColor || GOLD;
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#040406", color: "#fff" }}>
      {video.urgencyText && <UrgencyBar text={video.urgencyText} endsAt={video.urgencyEndsAt} />}

      {/* ── Header strip ── */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${brandColor}, #b8962f)` }}>
            <Play className="w-3 h-3 text-black" />
          </div>
          <span className="text-[11px] font-black tracking-widest uppercase" style={{ color: brandColor }}>ORAVINI</span>
        </div>
        {video.views != null && (
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <Eye className="w-3 h-3" /> {video.views} view{video.views !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* ── Lead Gate ── */}
      {!gateUnlocked ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: `${brandColor}14`, border: `1px solid ${brandColor}30` }}>
              <Lock className="w-7 h-7" style={{ color: brandColor }} />
            </div>
            <h2 className="text-xl font-black text-white text-center mb-1">{video.title}</h2>
            {video.description && <p className="text-sm text-zinc-500 text-center mb-6 leading-relaxed">{video.description}</p>}
            <p className="text-xs text-zinc-400 text-center mb-5">Enter your details to watch this video free.</p>
            <form onSubmit={handleGate} className="space-y-3">
              <Input placeholder="Your name" value={gateForm.name}
                onChange={e => setGateForm(f => ({ ...f, name: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white h-11" />
              <Input type="email" placeholder="Your email" value={gateForm.email}
                onChange={e => setGateForm(f => ({ ...f, email: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white h-11" />
              {gateError && <p className="text-xs text-red-400">{gateError}</p>}
              <Button type="submit" disabled={gateLoading} className="w-full h-11 font-bold text-sm"
                style={{ background: brandColor, color: "#000" }}>
                {gateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" /> Watch Now</>}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className={`flex-1 flex ${hasChapters ? "flex-row" : "flex-col"}`}>

          {/* ── Player area ── */}
          <div className={`${hasChapters ? "flex-1" : "w-full max-w-5xl mx-auto px-0"}`}>

            {/* Video */}
            <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#000" }}>
              {embed ? (
                <iframe src={getEmbedUrl(video.videoUrl)} className="absolute inset-0 w-full h-full"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen title={video.title} onLoad={trackView} />
              ) : direct ? (
                <video ref={videoRef} src={video.videoUrl} className="absolute inset-0 w-full h-full"
                  controls playsInline onPlay={trackView}
                  poster={video.thumbnailUrl || undefined}
                  controlsList={video.allowDownload ? undefined : "nodownload"} />
              ) : (
                <iframe src={video.videoUrl} className="absolute inset-0 w-full h-full"
                  allow="autoplay; fullscreen" allowFullScreen title={video.title} onLoad={trackView} />
              )}

              <OraviniBadge position={(video.oraviniWatermarkPosition || "bottom-right") as WatermarkPosition}
                show={showWatermark} variant="player" />

              {interactiveState.type === "playing" && interactiveState.annotations?.map((el: any) => (
                <AnnotationOverlay key={el.id} element={el} brandColor={brandColor} videoId={videoId} />
              ))}
              {interactiveState.type === "playing" && interactiveState.cta && (
                <InteractiveCTAOverlay element={interactiveState.cta} brandColor={brandColor} videoId={videoId}
                  onDismiss={() => setDismissedCtaIds(prev => new Set([...Array.from(prev), interactiveState.cta!.id]))} />
              )}
              {interactiveState.type === "turnstile" && (
                <TurnstileOverlay element={interactiveState.element} brandColor={brandColor} videoId={videoId}
                  onPass={() => {
                    setPassedTurnstileIds(prev => new Set([...Array.from(prev), interactiveState.element.id]));
                    videoRef.current?.play();
                  }}
                  onSkip={interactiveState.element.skipAllowed ? () => {
                    setPassedTurnstileIds(prev => new Set([...Array.from(prev), interactiveState.element.id]));
                    videoRef.current?.play();
                  } : undefined} />
              )}
            </div>

            {/* ── Info bar below player ── */}
            <div className="px-5 py-4 space-y-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-black text-white leading-tight">{video.title}</h1>
                  {video.description && (
                    <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{video.description}</p>
                  )}
                </div>
                {video.allowDownload && direct && (
                  <a href={video.videoUrl} download
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa" }}>
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                )}
              </div>

              {/* Social share row */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <SocialShare title={video.title} url={pageUrl} />
                {video.views != null && (
                  <span className="text-[10px] text-zinc-700 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {video.views} views
                  </span>
                )}
              </div>
            </div>

            {/* Active CTAs */}
            {ctas.filter((c: any) => c.isActive).map((cta: any) => (
              <div key={cta.id} className="mx-5 my-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                style={{ background: `${brandColor}12`, border: `1px solid ${brandColor}30` }}>
                <p className="text-sm font-semibold text-white truncate">{cta.text}</p>
                <a href={cta.url} target="_blank" rel="noopener noreferrer"
                  onClick={() => fetch(`/api/video-ctas/${cta.id}/click`, { method: "POST" }).catch(() => {})}
                  className="flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-black hover:opacity-90 transition-all"
                  style={{ background: brandColor, color: "#000" }}>
                  {cta.buttonText || "Learn More"}
                </a>
              </div>
            ))}
          </div>

          {/* ── Chapters sidebar ── */}
          {hasChapters && (
            <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
              style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", background: "#0c0c10" }}>
              <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${brandColor}80` }}>Chapters</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chapters.map((ch: any, i: number) => {
                  const start = ch.startSeconds ?? ch.startTimeSec ?? 0;
                  return (
                    <button key={ch.id}
                      onClick={() => { if (videoRef.current && start) videoRef.current.currentTime = start; }}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.04]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span className="text-[10px] font-bold mt-0.5 flex-shrink-0" style={{ color: `${brandColor}70` }}>
                        {start != null ? `${Math.floor(start / 60)}:${String(Math.floor(start % 60)).padStart(2, "0")}` : String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{ch.title}</p>
                        {ch.description && <p className="text-[10px] text-zinc-600 mt-0.5 line-clamp-2">{ch.description}</p>}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0 mt-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-center gap-1.5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962f)` }}>
          <Play className="w-2 h-2 text-black" />
        </div>
        <span className="text-[10px] text-zinc-700">Powered by <span className="font-bold" style={{ color: `${GOLD}60` }}>Oravini</span></span>
      </div>
    </div>
  );
}
