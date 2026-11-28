// Shared pieces of the King Astrology webinar funnel: the countdown, the
// vertical video player and the calendar buttons. Self-contained — these build
// only on components/king/ui, so no other product's styling reaches these pages.
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Globe2, Radio, Volume2 } from "lucide-react";
import { btn, focusRing } from "@/components/king/ui";
import {
  KING_EVENT, KING_JOIN_URL, kingCountdownParts, kingGoogleCalendarUrl,
  kingMsUntilStart, kingOutlookCalendarUrl, kingViewerLocal, kingViewerTimeZone,
} from "@shared/kingWebinar";

export const GOLD = "#d4b461";

/**
 * Milliseconds until the event, ticking once a second.
 *
 * Derived from the fixed UTC instant in shared/kingWebinar.ts, so the number
 * is the same for every visitor regardless of their timezone. A device whose
 * clock is wrong only shifts its own countdown, never the event.
 */
export function useKingCountdown(): { msLeft: number; live: boolean } {
  const [msLeft, setMsLeft] = useState(() => kingMsUntilStart());
  useEffect(() => {
    const tick = () => setMsLeft(kingMsUntilStart());
    tick();
    const t = setInterval(tick, 1000);
    // A phone that slept through the start would otherwise show a stale clock.
    const onWake = () => tick();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, []);
  return { msLeft, live: msLeft <= 0 };
}

/** "Saturday, December 5, 2026 · 1:00 PM ET" plus the visitor's own time. */
export function KingWhen({ compact = false }: { compact?: boolean }) {
  const local = useMemo(() => kingViewerLocal(kingViewerTimeZone()), []);
  return (
    <div data-testid="king-when" className="min-w-0">
      <p className={`${compact ? "text-sm" : "text-[15px]"} font-medium text-white`}>
        {KING_EVENT.dateLine}
      </p>
      <p className={`${compact ? "text-[13px]" : "text-sm"} text-zinc-400`}>
        {KING_EVENT.label} · {KING_EVENT.durationMinutes} min
      </p>
      {local && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500" data-testid="king-local-time">
          <Globe2 className="w-3 h-3 flex-shrink-0" />
          <span className="min-w-0 break-words">
            {local.date}, {local.time} {local.zone} your time
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * The countdown. Shows days/hours/minutes/seconds with the "1:00 PM ET" label
 * beside it and the same moment in the visitor's timezone underneath. Once the
 * start instant passes it becomes a "Live now" panel with a join button.
 */
export function KingCountdown({ joinHref, heading = "Starts in" }: { joinHref?: string; heading?: string }) {
  const { msLeft, live } = useKingCountdown();
  const { days, hours, minutes, seconds } = kingCountdownParts(msLeft);
  const local = useMemo(() => kingViewerLocal(kingViewerTimeZone()), []);
  const href = joinHref || KING_JOIN_URL;

  if (live) {
    return (
      <div data-testid="king-live-now"
        className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" aria-hidden />
            Live now
          </p>
          <p className="text-[13px] text-zinc-300 mt-1">
            The masterclass has started — {KING_EVENT.label}
            {local ? ` · ${local.time} ${local.zone} your time` : ""}.
          </p>
        </div>
        {href ? (
          <a href={href} target={/^https?:/i.test(href) ? "_blank" : undefined}
            rel={/^https?:/i.test(href) ? "noopener noreferrer" : undefined}
            data-testid="king-join-live" className={`${btn("primary", "lg")} flex-shrink-0`}>
            <Radio className="w-4 h-4" /> Join the webinar
          </a>
        ) : (
          <span data-testid="king-join-live-placeholder"
            className={`${btn("primary", "lg")} flex-shrink-0 opacity-70 cursor-default`} aria-disabled="true">
            <Radio className="w-4 h-4" /> Join the webinar
          </span>
        )}
      </div>
    );
  }

  const parts = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];

  return (
    <div data-testid="king-countdown-block">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2.5">
        <p className="text-xs font-medium text-zinc-500">{heading}</p>
        <span className="inline-flex items-center h-[20px] px-2 rounded-md border border-[#d4b461]/30 bg-[#d4b461]/[0.08] text-[11px] font-semibold tracking-wide text-[#d4b461]"
          data-testid="king-et-label">
          {KING_EVENT.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer"
        aria-label={`Starts in ${days} days, ${hours} hours, ${minutes} minutes`} data-testid="king-countdown">
        {parts.map(p => (
          <div key={p.label} className="rounded-lg text-center bg-white/[0.03] border border-white/[0.08] py-3.5" aria-hidden>
            <p className="text-2xl sm:text-[32px] font-semibold text-white tabular-nums leading-none tracking-tight">
              {String(p.value).padStart(2, "0")}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 mt-2">{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Vertical (9:16) video, the shape these were filmed in. Autoplays muted so it
 * is moving when the page lands — browsers block autoplay with sound — and one
 * tap restarts it from the top with sound and real controls.
 */
export function KingVideo({ src, label, testid = "king-video", poster }: {
  src: string; label: string; testid?: string; poster?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [unmuted, setUnmuted] = useState(false);
  const start = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    v.controls = true;
    setUnmuted(true);
    v.play().catch(() => {});
  };
  return (
    <figure className="m-0">
      <div data-testid={testid}
        className="relative mx-auto w-full max-w-[340px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/[0.1] bg-black shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
        <video ref={ref} src={src} poster={poster} autoPlay muted loop={!unmuted} playsInline preload="metadata"
          controls={unmuted} controlsList="nodownload noplaybackrate" disablePictureInPicture
          className="absolute inset-0 w-full h-full object-contain" />
        {!unmuted && (
          <button type="button" onClick={start} data-testid={`${testid}-unmute`}
            aria-label={`Play ${label} with sound from the start`}
            className={`absolute inset-0 flex flex-col items-center justify-end pb-6 bg-gradient-to-t from-black/70 via-transparent to-transparent ${focusRing}`}>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#d4b461] text-[#14110a] text-sm font-semibold px-5 py-3 shadow-lg">
              <Volume2 className="w-4 h-4" /> Tap to watch with sound
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3 text-center text-xs text-zinc-500">{label}</figcaption>
    </figure>
  );
}

/** Add to Google · Apple · Outlook. Apple and Outlook desktop take the .ics. */
export function KingCalendarButtons({ details }: { details?: string }) {
  const google = kingGoogleCalendarUrl({ details });
  const outlook = kingOutlookCalendarUrl({ details });
  return (
    <div data-testid="king-calendar-buttons">
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-300 mb-2">
        <CalendarPlus className="w-3.5 h-3.5 text-[#d4b461]" /> Add it to your calendar
      </p>
      <div className="grid grid-cols-3 gap-2">
        <a href={google} target="_blank" rel="noopener noreferrer" data-testid="king-cal-google" className={btn("secondary", "md")}>
          Google
        </a>
        {/* Same .ics for both: Apple Calendar and the Outlook desktop app both import it. */}
        <a href="/api/king/invite.ics" download="king-astrology-webinar.ics" data-testid="king-cal-apple" className={btn("secondary", "md")}>
          Apple
        </a>
        <a href={outlook} target="_blank" rel="noopener noreferrer" data-testid="king-cal-outlook" className={btn("secondary", "md")}>
          Outlook
        </a>
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-600">
        Outlook desktop? Use <a href="/api/king/invite.ics" download="king-astrology-webinar.ics" className="underline underline-offset-2 hover:text-zinc-400">the .ics file</a>.
      </p>
    </div>
  );
}

/** Page frame: dark shell, centred column, small footer. */
export function KingShell({ children, width = "max-w-5xl" }: { children: React.ReactNode; width?: string }) {
  return (
    <div className="min-h-screen w-full text-white bg-[#0b0b0e]">
      {/* Soft gold wash behind the fold — decorative only. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px]"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(212,180,97,0.10) 0%, rgba(212,180,97,0) 70%)" }} />
      <main className={`relative ${width} mx-auto px-4 sm:px-6 py-8 sm:py-14`}>{children}</main>
      <footer className="relative text-center pb-10">
        <p className="text-[13px] font-medium tracking-[0.18em] uppercase text-[#d4b461]/70">King Astrology</p>
        <p className="mt-1.5 text-xs text-zinc-600">{KING_EVENT.dateLine} · {KING_EVENT.label}</p>
      </footer>
    </div>
  );
}

/** Small gold-dot eyebrow used above the page titles. */
export function KingEyebrow({ children, live = false }: { children: React.ReactNode; live?: boolean }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 mb-4">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${live ? "bg-red-400 animate-pulse" : "bg-[#d4b461]"}`} aria-hidden />
      {children}
    </p>
  );
}
