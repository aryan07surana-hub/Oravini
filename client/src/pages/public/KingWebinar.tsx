// King Astrology webinar funnel — the registration page (/king-astrology, /king).
//
// Left: the invitation, the live countdown and the main VSL.
// Right: the registration card — free General access, or VIP at $15 which goes
// straight to the Whop plan checkout with the registrant's email prefilled.
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CalendarClock, CheckCircle2, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { btn, field, focusRing } from "@/components/king/ui";
import {
  KingCalendarButtons, KingCountdown, KingEyebrow, KingShell, KingVideo, KingWhen, useKingCountdown,
} from "@/components/king/shared";
import { readKingRegistration, saveKingRegistration } from "@/components/king/storage";
import {
  KING_DESCRIPTION, KING_EVENT, KING_HOST, KING_PATHS, KING_TITLE, KING_VIDEOS,
  KING_WHATSAPP, KING_WHOP, kingWhopCheckoutUrl, type KingTier,
} from "@shared/kingWebinar";
import { getUtmParams } from "@/lib/utm";

type Errors = { name?: string; email?: string; form?: string };

const PERKS_GENERAL = [
  "Seat at the live masterclass",
  "The General WhatsApp group",
  "Calendar invite so you don't miss it",
];
const PERKS_VIP = [
  "Everything in General Access",
  "The VIP WhatsApp group",
  "Priority on your questions in the live Q&A",
];

export default function KingWebinar() {
  const [, navigate] = useLocation();
  const { live } = useKingCountdown();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<KingTier>("general");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [existing, setExisting] = useState(() => readKingRegistration());

  useEffect(() => {
    document.title = `${KING_TITLE} — ${KING_EVENT.dateLine}`;
  }, []);

  const joinHref = useMemo(
    () => (existing?.tier === "vip" ? KING_WHATSAPP.vip : KING_WHATSAPP.general),
    [existing?.tier],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Please enter a valid email";
    setErrors(next);
    if (next.name || next.email) {
      document.getElementById(next.name ? "king-name" : "king-email")?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/king/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          tier,
          ...getUtmParams(),
        }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data.message || "Registration failed. Please try again.");

      saveKingRegistration({
        registrationId: data.registrationId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        tier: data.tier === "vip" ? "vip" : "general",
      });

      if (data.tier === "vip") {
        // Same tab, straight to the $15 payment form (email prefilled).
        window.location.assign(data.checkoutUrl || kingWhopCheckoutUrl(email.trim().toLowerCase()));
        return;
      }
      navigate(`${KING_PATHS.general}?r=${encodeURIComponent(data.registrationId || "")}`);
    } catch (err: any) {
      setErrors({ form: err?.message || "Registration failed. Please try again." });
      setSubmitting(false);
    }
  };

  return (
    <KingShell>
      <div className="grid gap-6 md:gap-x-10 md:gap-y-8 md:grid-cols-[minmax(0,1fr)_380px] md:items-start">
        {/* ── Invitation ── */}
        <header className="md:col-start-1 min-w-0">
          <KingEyebrow live={live}>{live ? "Live now" : "Free live masterclass"}</KingEyebrow>
          <h1 className="text-[28px] leading-[1.15] sm:text-4xl sm:leading-[1.1] font-semibold text-white tracking-tight break-words"
            data-testid="king-title">
            {KING_TITLE}
          </h1>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <dt className="sr-only">Date and time</dt>
              <span className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <CalendarClock className="w-4 h-4 text-[#d4b461]" />
              </span>
              <dd className="min-w-0"><KingWhen /></dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="sr-only">Host</dt>
              <span className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <Mic className="w-4 h-4 text-[#d4b461]" />
              </span>
              <dd className="min-w-0">
                <span className="block text-xs text-zinc-500">Hosted by</span>
                <span className="block text-sm font-medium text-white break-words">{KING_HOST}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            <KingCountdown joinHref={joinHref} />
          </div>

          {/* ── The main VSL ── */}
          <div className="mt-8" data-testid="king-vsl-wrap">
            <KingVideo src={KING_VIDEOS.vsl} testid="king-vsl" label="Watch this first — then reserve your seat" />
          </div>
        </header>

        {/* ── Registration card ── */}
        <aside className="min-w-0 md:col-start-2 md:row-start-1 md:row-span-2 md:sticky md:top-8">
          <div className="min-w-0 rounded-xl border border-white/[0.1] bg-[#111115] p-5 sm:p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
            {existing?.registrationId ? (
              <div data-testid="king-already-registered">
                <div className="flex items-center gap-2.5 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <p className="text-lg font-semibold text-white">You're in</p>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  You're registered for {KING_EVENT.dateLine} at {KING_EVENT.label}
                  {existing.tier === "vip" ? " with VIP access" : ""}.
                </p>
                <div className="mt-5 grid gap-2">
                  <a href={`${existing.tier === "vip" ? KING_PATHS.vip : KING_PATHS.general}?r=${encodeURIComponent(existing.registrationId)}`}
                    data-testid="king-go-to-invite" className={`${btn("primary", "lg")} w-full`}>
                    Open your invite <ArrowRight className="w-4 h-4" />
                  </a>
                  {existing.tier !== "vip" && (
                    <a href={kingWhopCheckoutUrl(existing.email)} data-testid="king-upgrade-vip"
                      className={`${btn("secondary", "lg")} w-full`}>
                      Join VIP, {KING_WHOP.price}
                    </a>
                  )}
                  <button type="button" data-testid="king-register-someone-else"
                    onClick={() => setExisting(null)}
                    className={`${btn("ghost", "md")} w-full`}>
                    Register a different person
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" data-testid="king-register-form" noValidate
                aria-describedby={errors.form ? "king-form-error" : undefined}>
                <div>
                  <h2 className="text-lg font-semibold text-white">Reserve your seat</h2>
                  <p className="text-[13px] text-zinc-500 mt-1">
                    General access is free. VIP is {KING_WHOP.price} one-time.
                  </p>
                </div>

                {/* ── Tier picker ── */}
                <div className="grid gap-2" role="radiogroup" aria-label="Choose your access" data-testid="king-tier-picker">
                  <button type="button" role="radio" aria-checked={tier === "general"} onClick={() => setTier("general")}
                    data-testid="king-tier-general"
                    className={`text-left rounded-lg border p-3.5 transition-colors ${focusRing} ${
                      tier === "general" ? "border-[#d4b461]/70 bg-[#d4b461]/[0.06]" : "border-white/[0.1] hover:border-white/[0.18]"}`}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-white">General Access</span>
                      <span className="text-sm font-semibold text-white">Free</span>
                    </span>
                    <ul className="mt-2 space-y-1">
                      {PERKS_GENERAL.map(p => (
                        <li key={p} className="flex items-start gap-1.5 text-xs text-zinc-400">
                          <CheckCircle2 className="w-3 h-3 mt-0.5 text-zinc-600 flex-shrink-0" />{p}
                        </li>
                      ))}
                    </ul>
                  </button>

                  <button type="button" role="radio" aria-checked={tier === "vip"} onClick={() => setTier("vip")}
                    data-testid="king-tier-vip"
                    className={`relative text-left rounded-lg border p-3.5 transition-colors ${focusRing} ${
                      tier === "vip" ? "border-[#d4b461]/70 bg-[#d4b461]/[0.06]" : "border-white/[0.1] hover:border-white/[0.18]"}`}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                        <Sparkles className="w-3.5 h-3.5 text-[#d4b461]" /> VIP Access
                      </span>
                      {/* Plain price. No strikethrough, no discount, no savings badge. */}
                      <span className="text-sm font-semibold text-white" data-testid="king-vip-price">
                        {KING_WHOP.price}
                      </span>
                    </span>
                    <ul className="mt-2 space-y-1">
                      {PERKS_VIP.map(p => (
                        <li key={p} className="flex items-start gap-1.5 text-xs text-zinc-400">
                          <CheckCircle2 className="w-3 h-3 mt-0.5 text-[#d4b461]/70 flex-shrink-0" />{p}
                        </li>
                      ))}
                    </ul>
                    <span className="block mt-2 text-[11px] text-zinc-500">One-time payment · you pay on the next step</span>
                  </button>
                </div>

                <div>
                  <label htmlFor="king-name" className="block text-[13px] font-medium text-zinc-300 mb-1.5">Name</label>
                  <input id="king-name" data-testid="king-input-name" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name" autoComplete="name" maxLength={120}
                    aria-invalid={!!errors.name} aria-describedby={errors.name ? "king-name-error" : undefined}
                    className={field(!!errors.name)} />
                  {errors.name && <p id="king-name-error" className="text-xs text-red-400 mt-1.5" role="alert">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="king-email" className="block text-[13px] font-medium text-zinc-300 mb-1.5">Email</label>
                  <input id="king-email" data-testid="king-input-email" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" maxLength={254}
                    aria-invalid={!!errors.email} aria-describedby={errors.email ? "king-email-error" : undefined}
                    className={field(!!errors.email)} />
                  {errors.email && <p id="king-email-error" className="text-xs text-red-400 mt-1.5" role="alert">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="king-phone" className="flex items-center gap-2 text-[13px] font-medium text-zinc-300 mb-1.5">
                    Phone <span className="text-xs font-normal text-zinc-600">Optional</span>
                  </label>
                  <input id="king-phone" data-testid="king-input-phone" type="tel" value={phone}
                    onChange={e => setPhone(e.target.value)} placeholder="Phone number" autoComplete="tel" maxLength={32}
                    className={field()} />
                </div>

                {errors.form && (
                  <p id="king-form-error" role="alert"
                    className="text-[13px] text-red-300 rounded-lg bg-red-500/[0.06] border border-red-500/20 px-3 py-2">
                    {errors.form}
                  </p>
                )}

                <button type="submit" disabled={submitting} data-testid="king-submit"
                  className={`${btn("primary", "lg")} w-full`}>
                  {submitting
                    ? "One moment..."
                    : tier === "vip" ? `Join VIP, ${KING_WHOP.price}` : "Register free"}
                </button>

                <p className="flex items-start gap-1.5 text-[11px] text-zinc-600 leading-relaxed">
                  <ShieldCheck className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                  {tier === "vip"
                    ? `Secure checkout by Whop. ${KING_WHOP.price} one-time, charged once.`
                    : "No payment needed. You'll get your WhatsApp group link on the next page."}
                </p>
              </form>
            )}
          </div>

          {!existing?.registrationId && (
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <KingCalendarButtons details={`${KING_TITLE} — ${KING_EVENT.dateLine} at ${KING_EVENT.label}.`} />
            </div>
          )}
        </aside>

        {/* ── About ── */}
        <section className="md:col-start-1 border-t border-white/[0.06] pt-6 md:pt-8" aria-labelledby="king-about">
          <h2 id="king-about" className="text-sm font-semibold text-white mb-3">About this masterclass</h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed whitespace-pre-line break-words" data-testid="king-description">
            {KING_DESCRIPTION}
          </p>
        </section>
      </div>

      {/* ── Mobile sticky CTA ── */}
      {!existing?.registrationId && (
        <div data-testid="king-sticky-cta"
          className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-white/[0.1] bg-[#0b0b0e]/95 backdrop-blur p-3 grid grid-cols-2 gap-2">
          <button type="button" className={btn("secondary", "md")}
            onClick={() => { setTier("general"); document.getElementById("king-name")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
            Register free
          </button>
          <button type="button" className={btn("primary", "md")}
            onClick={() => { setTier("vip"); document.getElementById("king-name")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
            VIP {KING_WHOP.price}
          </button>
        </div>
      )}
    </KingShell>
  );
}
