import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, CalendarClock, CheckCircle2, ExternalLink, Loader2, Mic, Radio, VideoOff } from "lucide-react";
import { formatIST } from "@shared/webinarFunnel";
import { getFunnelWebinarPhase, hasOfferCta, type FunnelWebinarPhase, type FunnelWebinarSettings } from "@shared/funnelWebinar";
import { Countdown, useCountdown } from "@/components/webinar-funnel/shared";
import { submitFunnelLead } from "@/lib/funnelLead";

const BG = "#040406";
const CARD = "#0c0c10";

/**
 * Live webinar settings + current phase for a funnel webinar step.
 * Polls a lightweight endpoint (no visit counting) so a host flipping
 * scheduled → live → ended in the builder reaches open pages within ~20s,
 * and re-evaluates the phase every second so the countdown → live switch is instant.
 */
export function useFunnelWebinar(funnelSlug: string, stepSlug: string, initial: FunnelWebinarSettings | null | undefined, poll = true) {
  const { data } = useQuery<FunnelWebinarSettings | null>({
    queryKey: ["/api/f/webinar", funnelSlug, stepSlug],
    enabled: !!initial && poll && !!funnelSlug && !!stepSlug,
    initialData: initial ?? null,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const r = await fetch(`/api/f/${encodeURIComponent(funnelSlug)}/${encodeURIComponent(stepSlug)}/webinar`);
      if (!r.ok) return initial ?? null;
      return (await r.json()).webinar as FunnelWebinarSettings;
    },
  });
  const settings = (poll ? data : initial) ?? null;
  // tick so the phase flips exactly at scheduledAt
  useCountdown(settings?.status === "scheduled" ? settings.scheduledAt : undefined);
  const phase: FunnelWebinarPhase | null = settings ? getFunnelWebinarPhase(settings) : null;
  return { settings, phase };
}

function Embed({ videoId, title, autoplay }: { videoId: string | null; title: string; autoplay: boolean }) {
  if (!videoId) {
    return (
      <div data-testid="webinar-step-no-video" className="rounded-2xl flex flex-col items-center justify-center text-center p-8"
        style={{ aspectRatio: "16 / 9", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <VideoOff className="w-8 h-8 text-zinc-600 mb-3" />
        <p className="text-sm font-bold text-white">The stream isn't connected yet</p>
        <p className="text-xs text-zinc-500 mt-1">Please refresh in a minute.</p>
      </div>
    );
  }
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9", background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}>
      <iframe
        data-testid="webinar-step-player"
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}${autoplay ? "?autoplay=1" : ""}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

function OfferCta({ settings, accent, big }: { settings: FunnelWebinarSettings; accent: string; big?: boolean }) {
  if (!hasOfferCta(settings)) return null;
  return (
    <div className="mt-6 text-center">
      <a data-testid="webinar-step-offer" href={settings.offerCta.url} target="_blank" rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl font-black transition-all hover:scale-[1.03] ${big ? "px-10 py-5 text-lg" : "px-8 py-4 text-base"}`}
        style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG, boxShadow: `0 0 32px ${accent}40` }}>
        {settings.offerCta.label} <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

const regKey = (funnelSlug: string, stepSlug: string) => `oravini:funnel-webinar-registered:${funnelSlug}:${stepSlug}`;

function RegistrationForm({ funnelSlug, stepSlug, accent, preview }: { funnelSlug: string; stepSlug: string; accent: string; preview?: boolean }) {
  const [, nav] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (preview) return;
    try { if (localStorage.getItem(regKey(funnelSlug, stepSlug))) setRegistered(true); } catch {}
  }, [funnelSlug, stepSlug, preview]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) return;
    setError(null);
    if (!form.name.trim()) return setError("Please enter your name");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("Please enter a valid email");
    setSubmitting(true);
    try {
      const res = await submitFunnelLead(funnelSlug, stepSlug, {
        name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined,
      });
      try { localStorage.setItem(regKey(funnelSlug, stepSlug), "1"); } catch {}
      if (res.nextSlug) nav(`/f/${res.funnelSlug}/${res.nextSlug}`);
      else setRegistered(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <div className="text-center py-4" data-testid="webinar-step-registered">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
        <p className="text-xl font-black text-white mb-1">You're registered!</p>
        <p className="text-xs text-zinc-500">Come back to this page at the start time — the live stream will appear right here.</p>
      </div>
    );
  }

  const inputStyle = { background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}30` };
  return (
    <form onSubmit={submit} className="space-y-3" data-testid="webinar-step-form" noValidate>
      <p className="text-base font-black text-white mb-1">Reserve your free spot</p>
      <input data-testid="webinar-step-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" autoComplete="name" maxLength={120}
        className="w-full px-4 py-3.5 rounded-xl text-white outline-none text-sm" style={inputStyle} />
      <input data-testid="webinar-step-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" autoComplete="email" maxLength={254}
        className="w-full px-4 py-3.5 rounded-xl text-white outline-none text-sm" style={inputStyle} />
      <input data-testid="webinar-step-phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone (optional)" autoComplete="tel" maxLength={32}
        className="w-full px-4 py-3.5 rounded-xl text-white outline-none text-sm" style={inputStyle} />
      {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
      <button data-testid="webinar-step-submit" type="submit" disabled={submitting || preview}
        className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Register now <ArrowRight className="w-5 h-5" /></>}
      </button>
    </form>
  );
}

const PHASE_BADGE: Record<FunnelWebinarPhase, { text: string; live?: boolean }> = {
  registration: { text: "Free live webinar" },
  live: { text: "Live now", live: true },
  replay: { text: "Replay" },
  ended: { text: "Webinar ended" },
};

/** The webinar room for a funnel "webinar" step: registration → live → replay/offer. */
export function FunnelWebinarBlock({ settings, phase, funnelSlug, stepSlug, accent, preview }: {
  settings: FunnelWebinarSettings;
  phase: FunnelWebinarPhase;
  funnelSlug: string;
  stepSlug: string;
  accent: string;
  /** builder preview: no form submits, no autoplay */
  preview?: boolean;
}) {
  const msLeft = useCountdown(settings.scheduledAt);
  const badge = PHASE_BADGE[phase];

  return (
    <div className="px-4 sm:px-6 pt-14 pb-10 max-w-3xl mx-auto" data-testid={`webinar-step-${phase}`}>
      <div className="text-center mb-8">
        {badge.live ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5 bg-red-500/15 text-red-300 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> {badge.text}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5"
            style={{ background: `${accent}14`, border: `1px solid ${accent}30`, color: accent }}>
            <Radio className="w-3 h-3" /> {badge.text}
          </span>
        )}
        <h1 className="text-3xl sm:text-5xl font-black text-white leading-[1.08] mb-4" data-testid="webinar-step-title">{settings.title}</h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-5 text-sm text-zinc-400">
          {settings.hostName && <span className="flex items-center gap-1.5"><Mic className="w-4 h-4" style={{ color: accent }} /> Hosted by <b className="text-white">{settings.hostName}</b></span>}
          <span className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4" style={{ color: accent }} /> {formatIST(settings.scheduledAt)}</span>
        </div>
      </div>

      {phase === "registration" && (
        <div className="grid gap-6 md:grid-cols-5 items-start">
          <div className="md:col-span-3">
            <p className="text-center md:text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Starts in</p>
            <Countdown msLeft={msLeft} />
          </div>
          <div className="md:col-span-2 rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${accent}30` }}>
            <RegistrationForm funnelSlug={funnelSlug} stepSlug={stepSlug} accent={accent} preview={preview} />
          </div>
        </div>
      )}

      {phase === "live" && (
        <>
          <Embed videoId={settings.youtubeId} title={settings.title} autoplay={!preview} />
          <OfferCta settings={settings} accent={accent} />
        </>
      )}

      {phase === "replay" && (
        <>
          <Embed videoId={settings.youtubeId} title={`${settings.title} — replay`} autoplay={false} />
          <OfferCta settings={settings} accent={accent} big />
        </>
      )}

      {phase === "ended" && (
        <div className="rounded-2xl p-8 text-center" style={{ background: CARD, border: `1px solid ${accent}25` }}>
          <p className="text-lg font-black text-white mb-1">This webinar has ended</p>
          <p className="text-sm text-zinc-500">{hasOfferCta(settings) ? "You can still grab the offer below." : "Thanks for your interest."}</p>
          <OfferCta settings={settings} accent={accent} big />
        </div>
      )}
    </div>
  );
}
