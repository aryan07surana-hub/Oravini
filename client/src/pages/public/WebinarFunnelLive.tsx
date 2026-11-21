import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowUpRight, CalendarClock, Clock, FileText, HelpCircle, MessageCircle, Mic, Presentation, Radio, Users, VideoOff } from "lucide-react";
import { deckEmbed, formatIST, webinarLivePhase, type WebinarLivePhase } from "@shared/webinarFunnel";
import {
  GOLD, Countdown, PublicLoading, WebinarNotFound, getViewerKey, isSafeHttpUrl, readRegistration, saveRegistration,
  useCountdown, usePublicWebinar, type PublicWebinar,
} from "@/components/webinar-funnel/shared";
import { ViewerChatPanel, readChatName, useWebinarChat } from "@/components/webinar-funnel/LiveChat";
import { ViewerPollCard, useActivePoll } from "@/components/webinar-funnel/Polls";

const HEARTBEAT_MS = 15_000;
type Tab = "chat" | "qa" | "slides";

/** POSTs a heartbeat every 15s while the tab is visible and the room is live/replay. */
function useHeartbeat(slug: string | undefined, phase: WebinarLivePhase | null, registrationId?: string, email?: string) {
  const [viewers, setViewers] = useState<number | null>(null);
  useEffect(() => {
    if (!slug || !phase || phase === "waiting") return;
    const viewerKey = getViewerKey();
    let stopped = false;
    const beat = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/public/webinars/${encodeURIComponent(slug)}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ viewerKey, registrationId, email }),
        });
        if (res.ok) { const d = await res.json(); if (typeof d.viewers === "number") setViewers(d.viewers); }
      } catch { /* retry next tick */ }
    };
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    const onVis = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stopped = true; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [slug, phase, registrationId, email]);
  return viewers;
}

function trackCtaClick(slug: string, registrationId?: string, email?: string) {
  try {
    fetch(`/api/public/webinars/${encodeURIComponent(slug)}/cta-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewerKey: getViewerKey(), registrationId, email }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function fmtLeft(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const hms = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return d ? `${d}d ${hms}` : hms;
}

function Player({ videoId, title }: { videoId: string | null | undefined; title: string }) {
  if (!videoId) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
        <VideoOff className="w-8 h-8 text-zinc-600 mb-3" />
        <p className="text-sm font-bold text-white">The stream isn't connected yet</p>
        <p className="text-xs text-zinc-500 mt-1">Stay on this page — it'll appear here as soon as the host goes live.</p>
      </div>
    );
  }
  return (
    <iframe
      data-testid="webinar-player"
      className="absolute inset-0 w-full h-full"
      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}

function WaitingStage({ webinar, msLeft }: { webinar: PublicWebinar; msLeft: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${GOLD}18, transparent 60%), #08070c` }}
      data-testid="webinar-starts-soon">
      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: GOLD }}>Doors open in</p>
      <div className="w-full max-w-md"><Countdown msLeft={msLeft} /></div>
      <p className="text-xs text-zinc-500 mt-4 max-w-sm">Keep this tab open — the stream starts right here at {formatIST(webinar.scheduledAt)}. Say hi in the chat while you wait.</p>
    </div>
  );
}

function SlidesPanel({ deckUrl }: { deckUrl: string | null | undefined }) {
  const embed = deckEmbed(deckUrl);
  if (!embed) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6" data-testid="slides-empty">
        <Presentation className="w-6 h-6 mb-2" style={{ color: `${GOLD}80` }} />
        <p className="text-sm font-semibold text-zinc-300">No slides for this session</p>
        <p className="text-xs text-zinc-600 mt-1 max-w-[220px]">Everything you need is in the stream.</p>
      </div>
    );
  }
  const src = embed.kind === "pdf" ? `${embed.src}#view=FitH&navpanes=0` : embed.src;
  return (
    <div className="h-full flex flex-col min-h-0" data-testid="slides-panel">
      <div className="flex-1 min-h-0 p-2">
        <iframe src={src} title="Slides" className="w-full h-full rounded-lg bg-black/40" allowFullScreen
          allow="fullscreen" referrerPolicy="strict-origin-when-cross-origin" data-testid="slides-frame" />
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> {embed.label}</span>
        <a href={embed.src} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 flex items-center gap-1">Full screen <ArrowUpRight className="w-3 h-3" /></a>
      </div>
    </div>
  );
}

function OfferCard({ webinar, phase, registrationId, email }: { webinar: PublicWebinar; phase: WebinarLivePhase; registrationId?: string; email?: string }) {
  const expiresMs = useCountdown(webinar.offerExpiresAt || undefined);
  const hasExpiry = !!webinar.offerExpiresAt;
  const expired = hasExpiry && expiresMs === 0;
  const hasCta = !!webinar.ctaText && isSafeHttpUrl(webinar.ctaUrl);
  if (phase === "waiting" || (!hasCta && !webinar.offerText && !webinar.offerPrice)) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl p-5 sm:p-6" data-testid="webinar-offer"
      style={{ background: `linear-gradient(135deg, ${GOLD}14, rgba(255,255,255,0.015) 55%)`, border: `1px solid ${GOLD}35` }}>
      <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: `${GOLD}18` }} />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: GOLD }}>Today's offer</p>
          {webinar.offerText && <p className="text-[15px] sm:text-base text-white font-semibold leading-snug whitespace-pre-line" data-testid="offer-text">{webinar.offerText}</p>}
          <div className="flex items-center gap-3 flex-wrap mt-2">
            {webinar.offerPrice && <span className="text-xl font-black text-white tracking-tight" data-testid="offer-price">{webinar.offerPrice}</span>}
            {hasExpiry && !expired && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md bg-red-500/10 text-red-300 border border-red-500/20 tabular-nums" data-testid="offer-countdown">
                <Clock className="w-3 h-3" /> Ends in {fmtLeft(expiresMs)}
              </span>
            )}
            {expired && <span className="text-[11px] font-semibold text-zinc-500">This offer has ended</span>}
          </div>
        </div>
        {hasCta && !expired && (
          <a
            data-testid="webinar-cta"
            href={webinar.ctaUrl!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCtaClick(webinar.slug, registrationId, email)}
            className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-[15px] font-black transition-all hover:-translate-y-0.5 flex-shrink-0"
            style={{ background: GOLD, color: "#0a0910", boxShadow: `0 10px 40px -10px ${GOLD}90` }}
          >
            {webinar.ctaText} <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        )}
      </div>
    </section>
  );
}

export default function WebinarFunnelLive() {
  const { slug } = useParams<{ slug: string }>();
  const { data: webinar, isLoading, isError } = usePublicWebinar(slug);
  const msLeft = useCountdown(webinar?.scheduledAt);
  const chat = useWebinarChat(webinar ? slug : undefined);
  const [tab, setTab] = useState<Tab>("chat");
  const [reg, setReg] = useState(() => (slug ? readRegistration(slug) : null));

  // Email links carry ?r=<registrationId>: remember it, prefill the chat name, then clean the URL.
  useEffect(() => {
    if (!slug) return;
    const r = new URLSearchParams(window.location.search).get("r");
    if (!r) return;
    fetch(`/api/public/webinars/${encodeURIComponent(slug)}/attendee?r=${encodeURIComponent(r)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(d => {
        if (!d) return;
        const next = { ...(readRegistration(slug) || {}), registrationId: d.registrationId, name: d.name };
        saveRegistration(slug, next);
        setReg(next);
      })
      .catch(() => {})
      .finally(() => {
        try { window.history.replaceState(null, "", window.location.pathname); } catch {}
      });
  }, [slug]);

  useEffect(() => {
    if (webinar?.title) document.title = `${webinar.title} — Live`;
  }, [webinar?.title]);

  // Chat poll carries the live status, so "Mark ended" flips viewers to the replay without a reload.
  const status = (chat.status as PublicWebinar["status"] | null) || webinar?.status || "published";
  const phase: WebinarLivePhase | null = webinar ? (msLeft === 0 || status === "ended" ? webinarLivePhase(status, webinar.scheduledAt) : "waiting") : null;
  const beatViewers = useHeartbeat(webinar ? slug : undefined, phase, reg?.registrationId, reg?.email);
  const viewers = Math.max(beatViewers ?? 0, chat.viewers);

  const poll = useActivePoll(webinar ? slug : undefined, reg?.registrationId);

  const defaultName = useMemo(() => readChatName() || reg?.name || "", [reg?.name]);

  if (isLoading) return <PublicLoading />;
  if (isError || !webinar || !phase) return <WebinarNotFound />;

  const videoId = phase === "replay" ? (webinar.replayVideoId || webinar.youtubeVideoId) : webinar.youtubeVideoId;
  const tabs: { id: Tab; label: string; icon: typeof MessageCircle; count?: number }[] = [
    { id: "chat", label: "Live chat", icon: MessageCircle },
    { id: "qa", label: "Q&A", icon: HelpCircle, count: chat.messages.filter(m => m.isQuestion && !m.answered).length },
    { id: "slides", label: "Slides", icon: Presentation },
  ];

  return (
    <div className="min-h-screen w-full text-white" style={{ background: "#0a0910" }}>
      <style>{`.webinar-scroll::-webkit-scrollbar{width:6px}.webinar-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}`}</style>
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-md border-b border-white/[0.06]" style={{ background: "rgba(10,9,16,0.82)" }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {phase === "live" ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-red-500 text-white flex-shrink-0" data-testid="badge-live">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md flex-shrink-0"
              style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}35` }} data-testid={phase === "replay" ? "badge-replay" : "badge-waiting"}>
              <Radio className="w-3 h-3" /> {phase === "replay" ? "Replay" : "Starting soon"}
            </span>
          )}
          <h1 className="text-sm sm:text-[15px] font-bold truncate flex-1 min-w-0" data-testid="webinar-title">{webinar.title}</h1>
          {phase === "live" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300 tabular-nums flex-shrink-0" data-testid="viewer-count">
              <Users className="w-3.5 h-3.5" style={{ color: GOLD }} /> <b>{viewers.toLocaleString()}</b> <span className="hidden sm:inline text-zinc-500">watching</span>
            </span>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Stage */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9", background: "#000", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 30px 80px -40px rgba(0,0,0,.9)" }}>
            {phase === "waiting" ? <WaitingStage webinar={webinar} msLeft={msLeft} /> : <Player videoId={videoId} title={webinar.title} />}
          </div>

          <OfferCard webinar={webinar} phase={phase} registrationId={reg?.registrationId} email={reg?.email} />

          {/* Sidebar sits here on mobile (tabs under the video) */}
          <div className="lg:hidden">
            <Sidebar tabs={tabs} tab={tab} setTab={setTab} chat={chat} webinar={webinar} phase={phase} defaultName={defaultName} registrationId={reg?.registrationId} email={reg?.email} poll={poll} mobile />
          </div>

          <section className="rounded-2xl p-5 sm:p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-zinc-400 mb-3">
              {webinar.hostName && <span className="flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" style={{ color: GOLD }} /> Hosted by <b className="text-zinc-200">{webinar.hostName}</b></span>}
              <span className="flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" style={{ color: GOLD }} /> {formatIST(webinar.scheduledAt)}</span>
            </div>
            {webinar.description ? (
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{webinar.description}</p>
            ) : (
              <p className="text-sm text-zinc-600">Welcome — glad you're here.</p>
            )}
            {!reg && webinar.status === "published" && (
              <Link href={`/w/${webinar.slug}`} className="inline-block mt-4 text-xs font-semibold hover:brightness-125" style={{ color: GOLD }}>
                Not registered yet? Save your spot to get the replay →
              </Link>
            )}
          </section>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 h-[calc(100vh-6.5rem)] max-h-[860px]">
            <Sidebar tabs={tabs} tab={tab} setTab={setTab} chat={chat} webinar={webinar} phase={phase} defaultName={defaultName} registrationId={reg?.registrationId} email={reg?.email} poll={poll} />
          </div>
        </aside>
      </main>

      <p className="text-center text-[11px] text-zinc-700 pb-8">
        Powered by <a href="https://oravini.com" className="hover:text-zinc-400" style={{ color: `${GOLD}99` }}>Oravini</a>
      </p>
    </div>
  );
}

function Sidebar({ tabs, tab, setTab, chat, webinar, phase, defaultName, registrationId, email, poll, mobile }: {
  tabs: { id: Tab; label: string; icon: typeof MessageCircle; count?: number }[];
  tab: Tab; setTab: (t: Tab) => void;
  chat: ReturnType<typeof useWebinarChat>;
  webinar: PublicWebinar; phase: WebinarLivePhase; defaultName: string; registrationId?: string; email?: string;
  poll: ReturnType<typeof useActivePoll>; mobile?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden ${mobile ? "h-[70vh] min-h-[420px]" : "h-full"}`}
      style={{ background: "#0e0d13", border: "1px solid rgba(255,255,255,0.07)" }} data-testid={mobile ? "sidebar-mobile" : "sidebar"}>
      <ViewerPollCard slug={webinar.slug} registrationId={registrationId} email={email} poll={poll} />
      <div role="tablist" className="flex p-1.5 gap-1 border-b border-white/[0.06]">
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} role="tab" aria-selected={active} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all ${active ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              style={active ? { background: "rgba(255,255,255,0.06)", boxShadow: `inset 0 -2px 0 ${GOLD}` } : undefined}>
              <t.icon className="w-3.5 h-3.5" style={active ? { color: GOLD } : undefined} />
              {t.label}
              {!!t.count && <span className="text-[10px] font-bold px-1.5 rounded-full tabular-nums" style={{ background: `${GOLD}25`, color: GOLD }}>{t.count}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0">
        {tab === "slides" ? (
          <SlidesPanel deckUrl={webinar.deckUrl} />
        ) : (
          <ViewerChatPanel
            mode={tab}
            messages={chat.messages}
            loaded={chat.loaded}
            closed={phase === "replay"}
            defaultName={defaultName}
            registrationId={registrationId}
            send={chat.send}
          />
        )}
      </div>
    </div>
  );
}
