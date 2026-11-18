import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { CalendarClock, ExternalLink, Mic, Radio, VideoOff } from "lucide-react";
import { formatIST } from "@shared/webinarFunnel";
import {
  GOLD, Countdown, PublicLoading, PublicShell, WebinarNotFound, isSafeHttpUrl, useCountdown, usePublicWebinar,
} from "@/components/webinar-funnel/shared";

export default function WebinarFunnelLive() {
  const { slug } = useParams<{ slug: string }>();
  const { data: webinar, isLoading, isError } = usePublicWebinar(slug);
  const msLeft = useCountdown(webinar?.scheduledAt);

  useEffect(() => {
    if (webinar?.title) document.title = `${webinar.title} — Live`;
  }, [webinar?.title]);

  if (isLoading) return <PublicLoading />;
  if (isError || !webinar) return <WebinarNotFound />;

  const started = msLeft === 0;
  const showCta = started && !!webinar.ctaText && isSafeHttpUrl(webinar.ctaUrl);

  return (
    <PublicShell>
      <div className="text-center mb-6">
        {started && webinar.status !== "ended" ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4 bg-red-500/15 text-red-300 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live now
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
            style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}30`, color: GOLD }}>
            <Radio className="w-3 h-3" /> {webinar.status === "ended" ? "Replay" : "Starts soon"}
          </span>
        )}
        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3" data-testid="webinar-title">{webinar.title}</h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-5 text-sm text-zinc-400">
          {webinar.hostName && <span className="flex items-center gap-1.5"><Mic className="w-4 h-4" style={{ color: GOLD }} /> {webinar.hostName}</span>}
          <span className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4" style={{ color: GOLD }} /> {formatIST(webinar.scheduledAt)}</span>
        </div>
      </div>

      {!started ? (
        <div className="rounded-2xl p-6 sm:p-8 text-center" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}25` }} data-testid="webinar-starts-soon">
          <p className="text-lg font-black text-white mb-1">The webinar starts soon</p>
          <p className="text-sm text-zinc-500 mb-6">Keep this page open — the stream will appear here when we go live.</p>
          <Countdown msLeft={msLeft} />
          <Link href={`/w/${webinar.slug}`} className="inline-block mt-6 text-xs font-semibold text-zinc-500 hover:text-zinc-300">
            Not registered yet? Reserve your spot →
          </Link>
        </div>
      ) : (
        <>
          {webinar.youtubeVideoId ? (
            <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9", background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}>
              <iframe
                data-testid="webinar-player"
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(webinar.youtubeVideoId)}?autoplay=1`}
                title={webinar.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-2xl flex flex-col items-center justify-center text-center p-8" style={{ aspectRatio: "16 / 9", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <VideoOff className="w-8 h-8 text-zinc-600 mb-3" />
              <p className="text-sm font-bold text-white">The stream isn't connected yet</p>
              <p className="text-xs text-zinc-500 mt-1">Please refresh in a minute.</p>
            </div>
          )}

          {showCta && (
            <div className="mt-6 text-center">
              <a
                data-testid="webinar-cta"
                href={webinar.ctaUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-black transition-all hover:scale-[1.03]"
                style={{ background: GOLD, color: "#0a0910", boxShadow: `0 0 32px ${GOLD}40` }}
              >
                {webinar.ctaText} <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {webinar.description && (
            <p className="mt-8 text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{webinar.description}</p>
          )}
        </>
      )}
    </PublicShell>
  );
}
