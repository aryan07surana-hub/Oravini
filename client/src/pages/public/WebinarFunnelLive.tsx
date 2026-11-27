import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowUpRight, CalendarClock, CalendarPlus, Clock, FileText, Globe2, HelpCircle, MessageCircle, Mic, Presentation, Users, VideoOff } from "lucide-react";
import { deckEmbed, formatIST, googleCalendarUrl, webinarLivePhase, type WebinarLivePhase } from "@shared/webinarFunnel";
import {
  Countdown, PublicLoading, WebinarLoadError, WebinarNotFound, getViewerKey, isSafeHttpUrl, readRegistration, saveRegistration,
  useCountdown, usePublicWebinar, type PublicWebinar,
} from "@/components/webinar-funnel/shared";
import { ViewerChatPanel, readChatName, useWebinarChat } from "@/components/webinar-funnel/LiveChat";
import { HOST_TIME_ZONE, formatInZone, viewerLocalStart, viewerTimeZone } from "@/components/webinar-funnel/eventTime";
import { btn, focusRing } from "@/components/webinar-funnel/ui";
import { PayBanner } from "@/components/webinar-funnel/PayBanner";

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
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 sm:p-8" data-testid="player-empty">
        <VideoOff className="w-7 h-7 text-zinc-500 mb-3" />
        <p className="text-sm sm:text-base font-semibold text-white">The stream isn't connected yet</p>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-sm">Stay on this page — it'll appear here as soon as the host goes live.</p>
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
  const ist = formatInZone(webinar.scheduledAt, HOST_TIME_ZONE);
  const local = useMemo(() => viewerLocalStart(webinar.scheduledAt, viewerTimeZone()), [webinar.scheduledAt]);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-8 bg-[#0d0d11]"
      data-testid="webinar-starts-soon">
      <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 mb-2 sm:mb-3">Starts in</p>
      <div className="w-full max-w-md"><Countdown msLeft={msLeft} size="sm" /></div>
      <p className="text-xs sm:text-sm text-zinc-300 mt-3 sm:mt-5" data-testid="waiting-start-time">
        {ist ? <>{ist.date} · {ist.time} IST</> : formatIST(webinar.scheduledAt)}
        {local && <span className="hidden sm:inline text-zinc-500"> · {local.time} {local.zone} your time</span>}
      </p>
      <p className="hidden sm:block text-xs text-zinc-500 mt-1.5 max-w-sm">Keep this tab open — the stream starts right here. Say hi in the chat while you wait.</p>
    </div>
  );
}

/** Below-the-stage guidance while waiting: timezone + the visitor's next step. */
function WaitingNextSteps({ webinar, registered }: { webinar: PublicWebinar; registered: boolean }) {
  const tz = useMemo(() => viewerTimeZone(), []);
  const local = viewerLocalStart(webinar.scheduledAt, tz);
  const cal = googleCalendarUrl({
    title: webinar.title, start: webinar.scheduledAt, durationMinutes: webinar.durationMinutes,
    details: typeof window !== "undefined" ? `Join here: ${window.location.origin}/w/${webinar.slug}/live` : undefined,
  });
  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#111115] p-4 sm:p-5" data-testid="waiting-next-steps" aria-labelledby="waiting-heading">
      <h2 id="waiting-heading" className="text-sm font-semibold text-white">Before it starts</h2>
      <ul className="mt-3 space-y-2.5 text-[13px] text-zinc-400">
        <li className="flex gap-2.5"><CalendarClock className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-px" />
          <span>Starts <span className="text-zinc-200">{formatIST(webinar.scheduledAt)}</span>{webinar.durationMinutes ? ` · about ${webinar.durationMinutes} min` : ""}</span></li>
        {local && (
          <li className="flex gap-2.5" data-testid="waiting-local-time"><Globe2 className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-px" />
            <span>That's <span className="text-zinc-200">{local.date}, {local.time} {local.zone}</span> where you are.</span></li>
        )}
        <li className="flex gap-2.5"><Clock className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-px" />
          <span>Keep this page open. The video replaces the countdown automatically — no refresh needed.</span></li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {cal && <a href={cal} target="_blank" rel="noopener noreferrer" className={btn("secondary", "sm")} data-testid="waiting-add-calendar"><CalendarPlus className="w-3.5 h-3.5" /> Add to calendar</a>}
        {!registered && webinar.status === "published" && (
          <Link href={`/w/${webinar.slug}`} className={btn("ghost", "sm")}>Register to save your spot</Link>
        )}
      </div>
    </section>
  );
}

function SlidesPanel({ deckUrl }: { deckUrl: string | null | undefined }) {
  const embed = deckEmbed(deckUrl);
  if (!embed) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6" data-testid="slides-empty">
        <Presentation className="w-6 h-6 mb-2 text-zinc-500" />
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
        <a href={embed.src} target="_blank" rel="noopener noreferrer" className={`hover:text-zinc-300 flex items-center gap-1 rounded ${focusRing}`}>Open in new tab <ArrowUpRight className="w-3 h-3" /></a>
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
    <section className="rounded-xl border border-[#d4b461]/30 bg-[#111115] p-4 sm:p-5" data-testid="webinar-offer" aria-label="Offer">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#d4b461] mb-1.5">{phase === "replay" ? "Offer" : "Today's offer"}</p>
          {webinar.offerText && <p className="text-[15px] text-white font-medium leading-snug whitespace-pre-line break-words" data-testid="offer-text">{webinar.offerText}</p>}
          {(webinar.offerPrice || hasExpiry) && (
            <div className="flex items-center gap-3 flex-wrap mt-2">
              {webinar.offerPrice && <span className="text-lg font-semibold text-white tracking-tight" data-testid="offer-price">{webinar.offerPrice}</span>}
              {hasExpiry && !expired && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 h-6 rounded-md bg-white/[0.05] text-zinc-300 border border-white/[0.1] tabular-nums" data-testid="offer-countdown">
                  <Clock className="w-3 h-3" /> Ends in {fmtLeft(expiresMs)}
                </span>
              )}
              {expired && <span className="text-xs font-medium text-zinc-500">This offer has ended</span>}
            </div>
          )}
        </div>
        {hasCta && !expired && (
          <a
            data-testid="webinar-cta"
            href={webinar.ctaUrl!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCtaClick(webinar.slug, registrationId, email)}
            className={`${btn("primary", "lg")} w-full sm:w-auto flex-shrink-0`}
          >
            {webinar.ctaText} <ArrowUpRight className="w-4 h-4" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </section>
  );
}

export default function WebinarFunnelLive() {
  const { slug } = useParams<{ slug: string }>();
  const { data: webinar, isLoading, isError, refetch } = usePublicWebinar(slug);
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

  const defaultName = useMemo(() => readChatName() || reg?.name || "", [reg?.name]);

  if (isLoading) return <PublicLoading />;
  if (isError) return <WebinarLoadError onRetry={() => refetch()} />;
  if (!webinar || !phase) return <WebinarNotFound />;

  const videoId = phase === "replay" ? (webinar.replayVideoId || webinar.youtubeVideoId) : webinar.youtubeVideoId;
  const tabs: { id: Tab; label: string; icon: typeof MessageCircle; count?: number }[] = [
    { id: "chat", label: "Live chat", icon: MessageCircle },
    { id: "qa", label: "Q&A", icon: HelpCircle, count: chat.messages.filter(m => m.isQuestion && !m.answered).length },
    { id: "slides", label: "Slides", icon: Presentation },
  ];

  return (
    <div className="min-h-screen w-full text-white bg-[#0b0b0e]">
      <style>{`.webinar-scroll::-webkit-scrollbar{width:6px}.webinar-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}`}</style>
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-md border-b border-white/[0.06] bg-[#0b0b0e]/85">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {phase === "live" ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider h-6 px-2 rounded-md bg-red-600 text-white flex-shrink-0" data-testid="badge-live">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider h-6 px-2 rounded-md flex-shrink-0 bg-white/[0.05] text-zinc-300 border border-white/[0.1]"
              data-testid={phase === "replay" ? "badge-replay" : "badge-waiting"}>
              <span className={`w-1.5 h-1.5 rounded-full ${phase === "replay" ? "bg-zinc-400" : "bg-[#d4b461]"}`} aria-hidden /> {phase === "replay" ? "Replay" : "Starting soon"}
            </span>
          )}
          <h1 className="text-sm sm:text-[15px] font-semibold truncate flex-1 min-w-0" data-testid="webinar-title">{webinar.title}</h1>
          {phase === "live" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300 tabular-nums flex-shrink-0" data-testid="viewer-count" aria-label={`${viewers} watching`}>
              <Users className="w-3.5 h-3.5 text-zinc-500" /> <b className="font-semibold">{viewers.toLocaleString()}</b> <span className="hidden sm:inline text-zinc-500">watching</span>
            </span>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-0 sm:px-6 pb-4 sm:py-6 grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Stage */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <div className="relative w-full overflow-hidden sm:rounded-xl bg-black sm:border sm:border-white/[0.08]" style={{ aspectRatio: "16 / 9" }}>
            {phase === "waiting" ? <WaitingStage webinar={webinar} msLeft={msLeft} /> : <Player videoId={videoId} title={webinar.title} />}
          </div>

          <div className="px-4 sm:px-0 space-y-4 sm:space-y-5">
            {phase === "waiting" && <WaitingNextSteps webinar={webinar} registered={!!reg} />}

            <OfferCard webinar={webinar} phase={phase} registrationId={reg?.registrationId} email={reg?.email} />

            {/* Sidebar sits here on mobile (tabs under the video) */}
            <div className="lg:hidden">
              <Sidebar tabs={tabs} tab={tab} setTab={setTab} chat={chat} webinar={webinar} phase={phase} defaultName={defaultName} registrationId={reg?.registrationId} mobile />
            </div>

            <section className="rounded-xl border border-white/[0.08] bg-[#111115] p-4 sm:p-6" aria-labelledby="about-live-heading">
              <h2 id="about-live-heading" className="text-sm font-semibold text-white mb-3">About this session</h2>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-zinc-400 mb-3">
                {webinar.hostName && <span className="flex items-center gap-1.5"><Mic className="w-3.5 h-3.5 text-zinc-500" /> Hosted by <b className="font-medium text-zinc-200">{webinar.hostName}</b></span>}
                <span className="flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-zinc-500" /> {phase === "replay" ? "Recorded " : ""}{formatIST(webinar.scheduledAt)}</span>
              </div>
              {webinar.description ? (
                <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line break-words">{webinar.description}</p>
              ) : (
                <p className="text-sm text-zinc-600">Welcome — glad you're here.</p>
              )}
              {!reg && webinar.status === "published" && phase !== "waiting" && (
                <Link href={`/w/${webinar.slug}`} className={`inline-block mt-4 text-[13px] font-medium text-[#d4b461] hover:underline underline-offset-2 rounded ${focusRing}`}>
                  Not registered yet? Save your spot to get the replay →
                </Link>
              )}
            </section>
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block" aria-label="Chat, questions and slides">
          <div className="sticky top-20 h-[calc(100vh-6.5rem)] max-h-[860px]">
            <Sidebar tabs={tabs} tab={tab} setTab={setTab} chat={chat} webinar={webinar} phase={phase} defaultName={defaultName} registrationId={reg?.registrationId} />
          </div>
        </aside>
      </main>

      <p className="text-center text-xs text-zinc-600 pb-8">
        Powered by <a href="https://oravini.com" className="text-zinc-500 hover:text-zinc-300 hover:underline underline-offset-2">Oravini</a>
      </p>
    </div>
  );
}

function Sidebar({ tabs, tab, setTab, chat, webinar, phase, defaultName, registrationId, mobile }: {
  tabs: { id: Tab; label: string; icon: typeof MessageCircle; count?: number }[];
  tab: Tab; setTab: (t: Tab) => void;
  chat: ReturnType<typeof useWebinarChat>;
  webinar: PublicWebinar; phase: WebinarLivePhase; defaultName: string; registrationId?: string; mobile?: boolean;
}) {
  const idp = mobile ? "m" : "d";
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = tabs.findIndex(t => t.id === tab);
    const n = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[n].id);
    document.getElementById(`${idp}-tab-${tabs[n].id}`)?.focus();
  };
  return (
    <div className={`flex flex-col rounded-xl overflow-hidden border border-white/[0.08] bg-[#111115] ${mobile ? "h-[70vh] min-h-[420px]" : "h-full"}`}
      data-testid={mobile ? "sidebar-mobile" : "sidebar"}>
      <div role="tablist" aria-label="Room panels" onKeyDown={onTabKey} className="flex p-1.5 gap-1 border-b border-white/[0.06]">
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} id={`${idp}-tab-${t.id}`} role="tab" aria-selected={active} aria-controls={`${idp}-panel`} tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-medium transition-colors ${focusRing} ${active ? "text-white bg-white/[0.07]" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"}`}>
              <t.icon className={`w-3.5 h-3.5 ${active ? "text-[#d4b461]" : ""}`} aria-hidden />
              {t.label}
              {!!t.count && <span className="text-[10px] font-semibold px-1.5 rounded-full tabular-nums bg-[#d4b461]/20 text-[#d4b461]" aria-label={`${t.count} open`}>{t.count}</span>}
            </button>
          );
        })}
      </div>
      <PayBanner slug={webinar.slug} registrationId={registrationId} />
      <div className="flex-1 min-h-0" role="tabpanel" id={`${idp}-panel`} aria-labelledby={`${idp}-tab-${tab}`}>
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

