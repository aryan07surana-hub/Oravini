import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { isValidCtaUrl } from "@shared/webinarFunnel";
import { countdownParts } from "./eventTime";

export const GOLD = "#d4b461";

export type PublicWebinar = {
  slug: string;
  title: string;
  description: string | null;
  hostName: string | null;
  scheduledAt: string;
  youtubeVideoId: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  status: "published" | "ended";
  deckUrl?: string | null;
  replayVideoId?: string | null;
  offerText?: string | null;
  offerPrice?: string | null;
  offerExpiresAt?: string | null;
  durationMinutes?: number;
};

// ── Attendee identity (localStorage; every access guarded) ─────────────────
export type StoredRegistration = { registrationId?: string; name?: string; email?: string };
export const regKey = (slug: string) => `oravini:webinar-registered:${slug}`;

/** Registration saved by the landing page. Old builds stored "1" — treated as registered with no details. */
export function readRegistration(slug: string): StoredRegistration | null {
  try {
    const raw = localStorage.getItem(regKey(slug));
    if (!raw) return null;
    if (raw === "1") return {};
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch { return null; }
}
export function saveRegistration(slug: string, reg: StoredRegistration) {
  try { localStorage.setItem(regKey(slug), JSON.stringify(reg)); } catch {}
}

/** Stable anonymous id for heartbeat/CTA attribution. Falls back to a per-load id. */
let memoryViewerKey: string | null = null;
export function getViewerKey(): string {
  const make = () => {
    const a = new Uint8Array(12);
    (globalThis.crypto || (window as any).msCrypto).getRandomValues(a);
    return Array.from(a, b => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
  };
  try {
    let k = localStorage.getItem("oravini:webinar-viewer");
    if (!k || !/^[A-Za-z0-9_-]{8,64}$/.test(k)) { k = make(); localStorage.setItem("oravini:webinar-viewer", k); }
    return k;
  } catch {
    return (memoryViewerKey ||= make());
  }
}

/** Fetches public webinar data. `data === null` means not found (404). */
export function usePublicWebinar(slug: string | undefined) {
  return useQuery<PublicWebinar | null>({
    queryKey: ["/api/public/webinars", slug],
    enabled: !!slug,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch(`/api/public/webinars/${encodeURIComponent(slug!)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load webinar");
      return res.json();
    },
  });
}

/** Re-renders every second; returns ms remaining until `target` (never negative). */
export function useCountdown(target: string | Date | undefined) {
  const targetMs = target ? new Date(target).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (isNaN(targetMs)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [targetMs]);
  return isNaN(targetMs) ? 0 : Math.max(0, targetMs - now);
}

export function Countdown({ msLeft, size = "md" }: { msLeft: number; size?: "md" | "sm" }) {
  const { days, hours, minutes, seconds } = countdownParts(msLeft);
  const parts = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];
  const sr = `${days} days, ${hours} hours, ${minutes} minutes`;
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3" data-testid="webinar-countdown" role="timer" aria-label={`Starts in ${sr}`}>
      {parts.map(p => (
        <div key={p.label} className={`rounded-lg text-center bg-white/[0.03] border border-white/[0.08] ${size === "sm" ? "py-2.5" : "py-3.5"}`} aria-hidden>
          <p className={`${size === "sm" ? "text-xl sm:text-2xl" : "text-2xl sm:text-[32px]"} font-semibold text-white tabular-nums leading-none tracking-tight`}>{String(p.value).padStart(2, "0")}</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 mt-2">{p.label}</p>
        </div>
      ))}
    </div>
  );
}

export function PublicShell({ children, width = "max-w-5xl" }: { children: React.ReactNode; width?: string }) {
  return (
    <div className="min-h-screen w-full text-white bg-[#0b0b0e]">
      <main className={`${width} mx-auto px-4 sm:px-6 py-8 sm:py-14`}>{children}</main>
      <footer className="text-center text-xs text-zinc-600 pb-8">
        Powered by <a href="https://oravini.com" className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline">Oravini</a>
      </footer>
    </div>
  );
}

export function PublicLoading() {
  return (
    <div className="min-h-screen bg-[#0b0b0e]" aria-busy="true" aria-label="Loading webinar" data-testid="webinar-loading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-4">
        <div className="h-4 w-32 rounded bg-white/[0.04] animate-pulse" />
        <div className="h-9 w-4/5 max-w-xl rounded-lg bg-white/[0.05] animate-pulse" />
        <div className="h-4 w-60 rounded bg-white/[0.04] animate-pulse" />
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_380px] pt-6">
          <div className="h-64 rounded-xl bg-white/[0.03] animate-pulse" />
          <div className="h-64 rounded-xl bg-white/[0.03] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function WebinarNotFound() {
  return (
    <PublicShell width="max-w-xl">
      <div className="text-center py-20 sm:py-28" data-testid="webinar-not-found">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5 bg-white/[0.04] border border-white/[0.08]">
          <Radio className="w-5 h-5 text-zinc-400" />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 mb-2">Error 404</p>
        <h1 className="text-2xl font-semibold text-white mb-2">Webinar not found</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">This link may be mistyped, or the webinar is no longer available. Check the link in your invitation email.</p>
      </div>
    </PublicShell>
  );
}

/** Network/server failure (not a 404): keep the visitor on the page with a retry. */
export function WebinarLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <PublicShell width="max-w-xl">
      <div className="text-center py-20 sm:py-28" data-testid="webinar-load-error" role="alert">
        <h1 className="text-2xl font-semibold text-white mb-2">We couldn't load this webinar</h1>
        <p className="text-sm text-zinc-500 leading-relaxed mb-6">Check your connection and try again. Your registration, if you made one, is safe.</p>
        <button type="button" onClick={onRetry}
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-semibold bg-white/[0.06] border border-white/[0.12] text-white hover:bg-white/[0.1] outline-none focus-visible:ring-2 focus-visible:ring-[#d4b461]/70">
          Try again
        </button>
      </div>
    </PublicShell>
  );
}

/** CTA links: http(s) URLs or same-site paths like /book/{slug} (never "//host"). */
export function isSafeHttpUrl(url: string | null | undefined): url is string {
  return !!url && (/^https?:\/\//i.test(url) || isValidCtaUrl(url));
}
