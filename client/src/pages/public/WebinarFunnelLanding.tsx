import {safeCommunityLinks,communityProvider} from "@shared/webinarCommunity";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowRight, CalendarClock, CalendarPlus, CheckCircle2, Globe2, Mic, PlayCircle } from "lucide-react";
import { formatIST, googleCalendarUrl } from "@shared/webinarFunnel";
import {
  Countdown, PublicLoading, PublicShell, WebinarLoadError, WebinarNotFound, useCountdown, usePublicWebinar, readRegistration, saveRegistration,
} from "@/components/webinar-funnel/shared";
import { formatInZone, HOST_TIME_ZONE, viewerLocalStart, viewerTimeZone } from "@/components/webinar-funnel/eventTime";
import { btn, focusRing } from "@/components/webinar-funnel/ui";
import { getUtmParams } from "@/lib/utm";

const fieldCls = `w-full h-11 px-3.5 rounded-lg text-sm text-white placeholder:text-zinc-600 bg-white/[0.03] border transition-colors focus:border-[#d4b461]/70 ${focusRing}`;

function VslPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [unmuted, setUnmuted] = useState(false);
  const start = () => {
    const v = ref.current; if (!v) return;
    v.muted = false; v.currentTime = 0; v.controls = true; setUnmuted(true);
    v.play().catch(() => {});
  };
  return (
    <div className="relative mx-auto w-full max-w-[340px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/[0.1] bg-black" data-testid="vsl-player">
      <video ref={ref} src={src} autoPlay muted loop={!unmuted} playsInline preload="auto" controls={unmuted} controlsList="nodownload noplaybackrate" disablePictureInPicture className="absolute inset-0 w-full h-full object-contain" />
      {!unmuted && (
        <button type="button" onClick={start} data-testid="vsl-unmute" aria-label="Watch with sound from the start"
          className="absolute inset-0 flex flex-col items-center justify-end pb-6 bg-gradient-to-t from-black/70 via-transparent to-transparent">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#d4b461] text-black text-sm font-semibold px-5 py-3 shadow-lg animate-pulse">
            <PlayCircle className="w-5 h-5" /> Tap to watch with sound
          </span>
        </button>
      )}
    </div>
  );
}

type Errors = { name?: string; email?: string; form?: string };

export default function WebinarFunnelLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { data: webinar, isLoading, isError, refetch } = usePublicWebinar(slug);
  const msLeft = useCountdown(webinar?.scheduledAt);
  const tz = useMemo(() => viewerTimeZone(), []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [registered, setRegistered] = useState(false);
  const [tier, setTier] = useState<"general" | "vip">("general");

  useEffect(() => {
    if (!slug) return;
    if (readRegistration(slug)) setRegistered(true);
  }, [slug]);

  useEffect(() => {
    if (webinar?.title) document.title = webinar.title;
  }, [webinar?.title]);

  if (isLoading) return <PublicLoading />;
  if (isError) return <WebinarLoadError onRetry={() => refetch()} />;
  if (!webinar) return <WebinarNotFound />;

  const vipUrl = /^https:\/\//i.test(webinar.vipCheckoutUrl || "") ? (webinar.vipCheckoutUrl as string) : "";
  const hasTiers = !!vipUrl;
  const vslUrl = /^https:\/\//i.test(webinar.vslUrl || "") ? (webinar.vslUrl as string) : "";
  const liveHref = `/w/${webinar.slug}/live`;
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
  const calendarHref = googleCalendarUrl({
    title: webinar.title,
    start: webinar.scheduledAt,
    durationMinutes: webinar.durationMinutes,
    details: pageUrl ? `Join here: ${pageUrl}` : undefined,
  });
  const groups=safeCommunityLinks(webinar.communityLinks);
  const started = msLeft === 0;
  const ended = webinar.status === "ended";
  const canRegister = webinar.status === "published";
  const ist = formatInZone(webinar.scheduledAt, HOST_TIME_ZONE);
  const local = viewerLocalStart(webinar.scheduledAt, tz);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Please enter a valid email";
    setErrors(next);
    if (next.name || next.email) {
      document.getElementById(next.name ? "reg-name" : "reg-email")?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/webinar-funnels/${encodeURIComponent(webinar.slug)}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, ...(hasTiers ? { tier } : {}), ...getUtmParams() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Registration failed. Please try again.");
      saveRegistration(webinar.slug, { registrationId: data.registrationId, name: name.trim(), email: email.trim().toLowerCase() });
      setRegistered(true);
      if (hasTiers && tier === "vip") window.location.assign(vipUrl);
    } catch (err: any) {
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const eyebrow = ended ? "Webinar replay" : started && canRegister ? "Live now" : "Free live webinar";

  return (
    <PublicShell>
      <div className="grid gap-6 md:gap-x-10 md:gap-y-8 md:grid-cols-[minmax(0,1fr)_380px] md:items-start">
        {/* ── Invitation header ── */}
        <header className="md:col-start-1">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 mb-4">
            {started && canRegister
              ? <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" aria-hidden />
              : <span className="w-1.5 h-1.5 rounded-full bg-[#d4b461]" aria-hidden />}
            {eyebrow}
          </p>
          <h1 className="text-[28px] leading-[1.15] sm:text-4xl sm:leading-[1.1] font-semibold text-white tracking-tight break-words" data-testid="webinar-title">{webinar.title}</h1>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3" data-testid="webinar-datetime">
              <dt className="sr-only">Date and time</dt>
              <span className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0"><CalendarClock className="w-4 h-4 text-[#d4b461]" /></span>
              <dd className="min-w-0">
                <span className="block text-sm font-medium text-white">{ist ? ist.date : formatIST(webinar.scheduledAt)}</span>
                <span className="block text-sm text-zinc-400">{ist ? `${ist.time} IST` : ""}{webinar.durationMinutes ? ` · ${webinar.durationMinutes} min` : ""}</span>
                {local && (
                  <span className="mt-1 flex items-center gap-1 text-xs text-zinc-500" data-testid="webinar-local-time">
                    <Globe2 className="w-3 h-3" /> {local.date}, {local.time} {local.zone} your time
                  </span>
                )}
              </dd>
            </div>
            {webinar.hostName && (
              <div className="flex items-start gap-3" data-testid="webinar-host">
                <dt className="sr-only">Host</dt>
                <span className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0"><Mic className="w-4 h-4 text-[#d4b461]" /></span>
                <dd className="min-w-0">
                  <span className="block text-xs text-zinc-500">Hosted by</span>
                  <span className="block text-sm font-medium text-white break-words">{webinar.hostName}</span>
                </dd>
              </div>
            )}
          </dl>

          {/* Countdown / started */}
          <div className="mt-8">
            {started ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <p className="text-sm text-zinc-200">
                  {ended ? "This webinar has ended — the replay may be available." : "The webinar has started."}
                </p>
                <Link href={liveHref} className={btn("secondary", "sm")}>
                  <PlayCircle className="w-4 h-4" /> Watch now
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-zinc-500 mb-2.5">Starts in</p>
                <Countdown msLeft={msLeft} />
              </>
            )}
          </div>

          {hasTiers && (
            <div className="mt-8" data-testid="webinar-vsl">
              {vslUrl ? (
                <VslPlayer src={vslUrl} />
              ) : (
                <div className="w-full max-w-[340px] mx-auto aspect-[9/16] rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] flex items-center justify-center text-sm text-zinc-500">
                  <PlayCircle className="w-6 h-6 mr-2" /> Masterclass preview video coming soon
                </div>
              )}
            </div>
          )}
        </header>

        {/* ── Registration card (2nd on mobile, right column on desktop) ── */}
        <aside className="min-w-0 md:col-start-2 md:row-start-1 md:row-span-2 md:sticky md:top-8">
          <div className="min-w-0 rounded-xl border border-white/[0.1] bg-[#111115] p-5 sm:p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
            {registered && ended ? (
              <div className="text-center py-2" data-testid="webinar-ended-replay">
                <PlayCircle className="w-9 h-9 mx-auto mb-3 text-[#d4b461]" />
                <p className="text-lg font-semibold text-white mb-1">This webinar has ended - watch the replay</p>
                <p className="text-sm text-zinc-500 mb-5">The recording is on the webinar page.</p>
                <Link href={liveHref} data-testid="link-replay-page" className={`${btn("primary", "lg")} w-full`}>
                  <PlayCircle className="w-4 h-4" /> Watch the replay
                </Link>
              </div>
            ) : registered ? (
              <div data-testid="webinar-registered">
                <div className="flex items-center gap-2.5 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <p className="text-lg font-semibold text-white">You're in!</p>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Save the date: <span className="text-zinc-200">{formatIST(webinar.scheduledAt)}</span>. Come back to this link when it's time.
                </p>
                {groups.length>0&&<div className="mt-5 space-y-3" data-testid="post-registration-groups"><p className="text-base font-semibold text-white">Next: join the webinar community</p><p className="text-sm text-zinc-400">Join the host's group for webinar updates and discussion. You choose whether to join. No automated email or SMS reminders are sent.</p>{groups.map((group,i)=><a key={group.url+i} href={group.url} target="_blank" rel="noopener noreferrer" data-testid={`join-community-${i}`} className={`${btn(i===0?"primary":"secondary","lg")} w-full h-auto min-h-11 whitespace-normal text-center flex-wrap break-words`}><span className="min-w-0 break-words">{group.label}</span> <span className="text-xs opacity-70">{communityProvider(group.url)}</span><ArrowRight className="w-4 h-4"/></a>)}</div>}
                <ol className="mt-4 space-y-2 text-[13px] text-zinc-400">
                  <li className="flex gap-2"><span className="text-zinc-600 tabular-nums">1.</span> Add it to your calendar so you don't miss it.</li>
                  <li className="flex gap-2"><span className="text-zinc-600 tabular-nums">2.</span> Open the webinar page a few minutes before the start.</li>
                </ol>
                <div className="mt-5 grid gap-2">
                  {hasTiers && (
                    <a href={vipUrl} data-testid="link-vip-checkout" className={`${btn("primary", "lg")} w-full`}>Unlock VIP access {webinar.vipPrice ? `(${webinar.vipPrice})` : ""}</a>
                  )}
                  <Link href={liveHref} data-testid="link-live-page" className={`${btn(groups.length?"secondary":"primary", "lg")} w-full`}>
                    Go to the live page <ArrowRight className="w-4 h-4" />
                  </Link>
                  {calendarHref && (
                    <a href={calendarHref} target="_blank" rel="noopener noreferrer" data-testid="link-add-to-google-calendar" className={`${btn("secondary", "md")} w-full`}>
                      <CalendarPlus className="w-4 h-4" /> Add to Google Calendar
                    </a>
                  )}
                </div>
              </div>
            ) : !canRegister ? (
              <div className="text-center py-2">
                <p className="text-base font-semibold text-white mb-1">Registration is closed.</p>
                <p className="text-sm text-zinc-500 mb-5">You can still open the webinar page.</p>
                <Link href={liveHref} className={`${btn("secondary", "md")} w-full`}>
                  <PlayCircle className="w-4 h-4" /> Go to the webinar page
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" data-testid="webinar-register-form" noValidate aria-describedby={errors.form ? "reg-form-error" : undefined}>
                <div>
                  <h2 className="text-lg font-semibold text-white">Reserve your free spot</h2>
                  <p className="text-[13px] text-zinc-500 mt-1">Free to attend. You'll get the link to the live page as soon as you sign up.</p>
                </div>
                {hasTiers && (
                  <div className="grid gap-2" role="radiogroup" aria-label="Choose your access" data-testid="tier-picker">
                    <button type="button" role="radio" aria-checked={tier === "general"} onClick={() => setTier("general")}
                      className={`text-left rounded-lg border p-3 ${tier === "general" ? "border-[#d4b461]/70 bg-[#d4b461]/[0.06]" : "border-white/[0.1]"}`}>
                      <span className="block text-sm font-semibold text-white">General Access · Free</span>
                      <span className="block text-xs text-zinc-400 mt-0.5">Live webinar, general community, reminders, calendar event.</span>
                    </button>
                    <button type="button" role="radio" aria-checked={tier === "vip"} onClick={() => setTier("vip")}
                      className={`text-left rounded-lg border p-3 ${tier === "vip" ? "border-[#d4b461]/70 bg-[#d4b461]/[0.06]" : "border-white/[0.1]"}`}>
                      <span className="block text-sm font-semibold text-white">VIP Access · {webinar.vipPrice || "Paid"}</span>
                      <span className="block text-xs text-zinc-400 mt-0.5">Everything in General plus the VIP group and priority updates. You pay on the next step.</span>
                    </button>
                  </div>
                )}
                <div>
                  <label htmlFor="reg-name" className="block text-[13px] font-medium text-zinc-300 mb-1.5">Name</label>
                  <input id="reg-name" data-testid="input-reg-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={120}
                    aria-invalid={!!errors.name} aria-describedby={errors.name ? "reg-name-error" : undefined}
                    className={`${fieldCls} ${errors.name ? "border-red-400/60" : "border-white/[0.1]"}`} />
                  {errors.name && <p id="reg-name-error" className="text-xs text-red-400 mt-1.5" role="alert">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-[13px] font-medium text-zinc-300 mb-1.5">Email</label>
                  <input id="reg-email" data-testid="input-reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" maxLength={254}
                    aria-invalid={!!errors.email} aria-describedby={errors.email ? "reg-email-error" : undefined}
                    className={`${fieldCls} ${errors.email ? "border-red-400/60" : "border-white/[0.1]"}`} />
                  {errors.email && <p id="reg-email-error" className="text-xs text-red-400 mt-1.5" role="alert">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="reg-phone" className="flex items-center gap-2 text-[13px] font-medium text-zinc-300 mb-1.5">Phone <span className="text-xs font-normal text-zinc-600">Optional</span></label>
                  <input id="reg-phone" data-testid="input-reg-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" autoComplete="tel" maxLength={32}
                    className={`${fieldCls} border-white/[0.1]`} />
                </div>
                {errors.form && <p id="reg-form-error" className="text-[13px] text-red-300 rounded-lg bg-red-500/[0.06] border border-red-500/20 px-3 py-2" role="alert">{errors.form}</p>}
                <button data-testid="btn-register" type="submit" disabled={submitting} className={`${btn("primary", "lg")} w-full`}>
                  {submitting ? "Registering..." : hasTiers && tier === "vip" ? "Continue to VIP payment" : "Register now"}
                </button>
              </form>
            )}
          </div>
        </aside>

        {/* ── About ── */}
        <section className="md:col-start-1 border-t border-white/[0.06] pt-6 md:pt-8" aria-labelledby="about-heading">
          <h2 id="about-heading" className="text-sm font-semibold text-white mb-3">About this webinar</h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed whitespace-pre-line break-words" data-testid="webinar-description">
            {webinar.description || "Join us live for this session."}
          </p>
        </section>
      </div>
      {hasTiers && canRegister && !registered && (
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-white/[0.1] bg-[#0b0b0e]/95 backdrop-blur p-3 grid grid-cols-2 gap-2" data-testid="sticky-cta">
          <button type="button" className={btn("secondary", "md")} onClick={() => { setTier("general"); document.getElementById("reg-name")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Register free</button>
          <button type="button" className={btn("primary", "md")} onClick={() => { setTier("vip"); document.getElementById("reg-name")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>VIP {webinar.vipPrice || ""}</button>
        </div>
      )}
    </PublicShell>
  );
}
