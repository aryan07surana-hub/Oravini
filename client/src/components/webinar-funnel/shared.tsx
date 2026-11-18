import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";

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
};

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

export function Countdown({ msLeft }: { msLeft: number }) {
  const total = Math.floor(msLeft / 1000);
  const parts = [
    { label: "Days", value: Math.floor(total / 86400) },
    { label: "Hours", value: Math.floor((total % 86400) / 3600) },
    { label: "Minutes", value: Math.floor((total % 3600) / 60) },
    { label: "Seconds", value: total % 60 },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3" data-testid="webinar-countdown" aria-live="polite">
      {parts.map(p => (
        <div key={p.label} className="rounded-xl py-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}25` }}>
          <p className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none">{String(p.value).padStart(2, "0")}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mt-1.5">{p.label}</p>
        </div>
      ))}
    </div>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full text-white" style={{ background: "#0a0910" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">{children}</div>
      <p className="text-center text-[11px] text-zinc-600 pb-8">
        Powered by <a href="https://oravini.com" className="hover:text-zinc-400" style={{ color: `${GOLD}aa` }}>Oravini</a>
      </p>
    </div>
  );
}

export function PublicLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#0a0910" }}>
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );
}

export function WebinarNotFound() {
  return (
    <PublicShell>
      <div className="text-center py-24" data-testid="webinar-not-found">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}25` }}>
          <Radio className="w-7 h-7" style={{ color: GOLD }} />
        </div>
        <p className="text-5xl font-black text-white mb-2">404</p>
        <p className="text-lg font-bold text-white mb-1">Webinar not found</p>
        <p className="text-sm text-zinc-500">This link may be wrong, or the webinar is no longer available.</p>
      </div>
    </PublicShell>
  );
}

export function isSafeHttpUrl(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}
