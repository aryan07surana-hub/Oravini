import { useState, useEffect, useMemo } from "react";
import { Lock, ExternalLink, X, Mail, ArrowRight } from "lucide-react";

const GOLD = "#d4b461";

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export type InteractiveElement = {
  id: string;
  type: "annotation" | "turnstile" | "cta";
  timestamp: number;
  endTimestamp?: number | null;
  // Annotation
  text?: string | null;
  url?: string | null;
  // Turnstile
  requireEmail?: boolean | null;
  requireName?: boolean | null;
  skipAllowed?: boolean | null;
  // CTA
  ctaType?: "text" | "image" | "html" | null;
  ctaText?: string | null;
  ctaButtonText?: string | null;
  ctaButtonUrl?: string | null;
  ctaImageUrl?: string | null;
  ctaHtml?: string | null;
  ctaPosition?: "center" | "top" | "bottom" | null;
  isActive?: boolean | null;
};

export type Chapter = {
  id: number | string;
  title: string;
  description?: string | null;
  startSeconds?: number | null;
  // backwards-compat fallback
  startTimeSec?: number | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Annotation overlay (clickable link mid-video)
// ─────────────────────────────────────────────────────────────────────────────

export function AnnotationOverlay({ element, brandColor = GOLD, videoId, onClick }: { element: InteractiveElement; brandColor?: string; videoId?: string; onClick?: () => void }) {
  if (!element.url || !element.text) return null;

  const handleClick = () => {
    onClick?.();
    if (videoId) fetch(`/api/video-interactive/${element.id}/click`, { method: "POST" }).catch(() => {});
  };

  return (
    <a
      href={element.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="absolute z-30 group"
      style={{ bottom: "15%", left: "50%", transform: "translateX(-50%)", pointerEvents: "auto" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:scale-105 cursor-pointer"
        style={{
          background: `${brandColor}dd`,
          color: "#000",
          boxShadow: `0 8px 32px ${brandColor}40, 0 0 0 1px ${brandColor}20`,
          backdropFilter: "blur(12px)",
          animation: "annotation-fade-in 0.4s ease",
        }}
      >
        <span className="text-sm font-bold">{element.text}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </div>
      <style>{`
        @keyframes annotation-fade-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Turnstile mid-video email gate
// ─────────────────────────────────────────────────────────────────────────────

export function TurnstileOverlay({
  element, brandColor = GOLD, videoId, onPass, onSkip,
}: {
  element: InteractiveElement;
  brandColor?: string;
  videoId?: string;
  onPass: () => void;
  onSkip?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (element.requireEmail && !email.trim()) { setErr("Email required"); return; }
    if (element.requireName && !name.trim()) { setErr("Name required"); return; }
    setSubmitting(true);
    setErr("");
    try {
      if (videoId) {
        await fetch(`/api/video/${videoId}/gate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name }),
        });
      }
      onPass();
    } catch {
      setErr("Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", animation: "turnstile-fade-in 0.3s ease" }}
    >
      <div className="w-full max-w-sm mx-auto px-6">
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(12,12,16,0.92)",
            border: `1px solid ${brandColor}30`,
            boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 60px ${brandColor}15`,
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `${brandColor}18`, border: `1px solid ${brandColor}40` }}
          >
            <Lock className="w-6 h-6" style={{ color: brandColor }} />
          </div>
          <h3 className="text-lg font-black text-white text-center mb-1">Keep watching</h3>
          <p className="text-xs text-zinc-400 text-center mb-5">Enter your details to continue.</p>
          <form onSubmit={submit} className="space-y-2.5">
            {element.requireName && (
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg text-sm bg-zinc-800/80 text-white border border-zinc-700 outline-none placeholder:text-zinc-500"
                style={{ borderColor: name ? `${brandColor}55` : undefined }}
              />
            )}
            {(element.requireEmail !== false) && (
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg text-sm bg-zinc-800/80 text-white border border-zinc-700 outline-none placeholder:text-zinc-500"
                style={{ borderColor: email ? `${brandColor}55` : undefined }}
              />
            )}
            {err && <p className="text-[10px] text-red-400">{err}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
                color: "#000",
                boxShadow: `0 0 20px ${brandColor}40`,
              }}
            >
              {submitting ? "..." : <>Continue <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
            {element.skipAllowed && onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full h-8 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Skip for now
              </button>
            )}
          </form>
        </div>
      </div>
      <style>{`
        @keyframes turnstile-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA overlay (text/image/html pop-up)
// ─────────────────────────────────────────────────────────────────────────────

export function InteractiveCTAOverlay({
  element, brandColor = GOLD, videoId, onDismiss,
}: {
  element: InteractiveElement;
  brandColor?: string;
  videoId?: string;
  onDismiss?: () => void;
}) {
  const trackClick = () => {
    if (videoId) fetch(`/api/video-interactive/${element.id}/click`, { method: "POST" }).catch(() => {});
  };

  const positionStyle: React.CSSProperties = useMemo(() => {
    const pos = element.ctaPosition || "center";
    if (pos === "top") return { top: "8%", left: "50%", transform: "translateX(-50%)" };
    if (pos === "bottom") return { bottom: "12%", left: "50%", transform: "translateX(-50%)" };
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }, [element.ctaPosition]);

  return (
    <div
      className="absolute z-30 max-w-md w-[92%]"
      style={{ ...positionStyle, animation: "cta-fade-in 0.4s ease" }}
    >
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: "rgba(12,12,16,0.92)",
          border: `1px solid ${brandColor}40`,
          backdropFilter: "blur(20px)",
          boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 60px ${brandColor}25`,
        }}
      >
        {/* Close button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 z-10"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        )}

        {/* Content */}
        {element.ctaType === "image" && element.ctaImageUrl ? (
          <a href={element.ctaButtonUrl || "#"} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
            <img src={element.ctaImageUrl} alt="" className="w-full h-auto" />
          </a>
        ) : element.ctaType === "html" && element.ctaHtml ? (
          <div className="p-5" dangerouslySetInnerHTML={{ __html: element.ctaHtml }} />
        ) : (
          <div className="p-5">
            {element.ctaText && (
              <p className="text-base font-black text-white mb-3 leading-tight">{element.ctaText}</p>
            )}
            {element.ctaButtonText && element.ctaButtonUrl && (
              <a
                href={element.ctaButtonUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
                  color: "#000",
                  boxShadow: `0 0 20px ${brandColor}40`,
                }}
              >
                {element.ctaButtonText} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes cta-fade-in {
          from { opacity: 0; transform: ${positionStyle.transform} scale(0.9); }
          to { opacity: 1; transform: ${positionStyle.transform} scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: derive the currently-active interactive element from playhead time
// ─────────────────────────────────────────────────────────────────────────────

export function useActiveInteractive(
  elements: InteractiveElement[],
  currentTime: number,
  passedTurnstileIds: Set<string>,
  dismissedCtaIds: Set<string>,
) {
  return useMemo(() => {
    const sec = Math.floor(currentTime);

    // Turnstile takes priority (blocks playback)
    const turnstile = elements.find(el =>
      el.type === "turnstile" &&
      el.isActive !== false &&
      sec >= (el.timestamp || 0) &&
      !passedTurnstileIds.has(el.id)
    );
    if (turnstile) return { type: "turnstile" as const, element: turnstile };

    // Active CTA (one at a time, lasts until endTimestamp or 8 seconds)
    const cta = elements.find(el => {
      if (el.type !== "cta" || el.isActive === false) return false;
      if (dismissedCtaIds.has(el.id)) return false;
      const start = el.timestamp || 0;
      const end = el.endTimestamp || (start + 8);
      return sec >= start && sec <= end;
    });

    // Active annotations (multiple can show simultaneously)
    const annotations = elements.filter(el => {
      if (el.type !== "annotation" || el.isActive === false) return false;
      const start = el.timestamp || 0;
      const end = el.endTimestamp || (start + 6);
      return sec >= start && sec <= end;
    });

    return { type: "playing" as const, cta, annotations };
  }, [elements, currentTime, passedTurnstileIds, dismissedCtaIds]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter markers on a progress bar
// ─────────────────────────────────────────────────────────────────────────────

export function ChapterMarkers({ chapters, duration, brandColor = GOLD }: { chapters: Chapter[]; duration: number; brandColor?: string }) {
  if (!chapters.length || !duration) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {chapters.map(ch => {
        const start = ch.startSeconds ?? ch.startTimeSec ?? 0;
        const pct = Math.min((start / duration) * 100, 100);
        return (
          <div
            key={ch.id}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-sm"
            style={{
              left: `${pct}%`,
              background: brandColor,
              boxShadow: `0 0 4px ${brandColor}`,
              opacity: 0.85,
            }}
            title={ch.title}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter nav strip (compact)
// ─────────────────────────────────────────────────────────────────────────────

export function ChapterNavStrip({
  chapters, currentTime, brandColor = GOLD, onJump,
}: {
  chapters: Chapter[];
  currentTime: number;
  brandColor?: string;
  onJump: (sec: number) => void;
}) {
  if (!chapters.length) return null;

  // Find current chapter
  const sortedChapters = [...chapters].sort((a, b) => (a.startSeconds ?? a.startTimeSec ?? 0) - (b.startSeconds ?? b.startTimeSec ?? 0));
  let activeIdx = -1;
  for (let i = 0; i < sortedChapters.length; i++) {
    const start = sortedChapters[i].startSeconds ?? sortedChapters[i].startTimeSec ?? 0;
    if (start <= currentTime) activeIdx = i;
    else break;
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 px-3" style={{ scrollbarWidth: "none" }}>
      {sortedChapters.map((ch, i) => {
        const isActive = i === activeIdx;
        const start = ch.startSeconds ?? ch.startTimeSec ?? 0;
        return (
          <button
            key={ch.id}
            onClick={() => onJump(start)}
            className="flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all hover:scale-105"
            style={{
              background: isActive ? `${brandColor}30` : "rgba(255,255,255,0.06)",
              color: isActive ? brandColor : "rgba(255,255,255,0.65)",
              border: `1px solid ${isActive ? brandColor + "60" : "transparent"}`,
            }}
            title={ch.title}
          >
            {ch.title}
          </button>
        );
      })}
    </div>
  );
}
