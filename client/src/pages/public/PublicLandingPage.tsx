import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Calendar, Clock, Users, CheckCircle, ChevronRight,
  Radio, Play, Star, Globe, ArrowRight, Loader2, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";

function useCountdown(targetDate: Date | null) {
  const [cd, setCd] = useState({ d: 0, h: 0, m: 0, s: 0, past: false });
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) { setCd({ d: 0, h: 0, m: 0, s: 0, past: true }); return; }
      setCd({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        past: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return cd;
}

function Grain() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.032]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }}
    />
  );
}

function FilmStrip({ vertical }: { vertical?: boolean }) {
  const count = vertical ? 18 : 12;
  return (
    <div
      className={`flex ${vertical ? "flex-col" : ""} gap-[3px] opacity-30`}
      style={{ pointerEvents: "none" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: vertical ? 16 : 22,
            height: vertical ? 22 : 16,
            background: i % 2 === 0 ? `${GOLD}22` : "transparent",
            border: `1px solid ${GOLD}15`,
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

function CdUnit({ val, label }: { val: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl text-2xl sm:text-3xl font-black"
        style={{ background: CARD, border: `1px solid ${GOLD}25`, color: "#fff" }}
      >
        {String(val).padStart(2, "0")}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest mt-1.5" style={{ color: `${GOLD}60` }}>{label}</p>
    </div>
  );
}

export default function PublicLandingPage() {
  const [, params] = useRoute("/lp/:slug");
  const slug = params?.slug ?? "";
  const [, nav] = useLocation();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const countdown = useCountdown(
    data?.webinar?.scheduledAt ? new Date(data.webinar.scheduledAt) : null
  );

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/lp/${slug}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.message || "Not found")))
      .then(d => { setData(d); setLoading(false); })
      .catch((e: any) => {
        setError(typeof e === "string" ? e : "This landing page could not be found.");
        setLoading(false);
      });
  }, [slug]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setFormError("Name and email are required."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const r = await fetch(`/api/register/${data.webinar.meetingCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || "Registration failed"); }
      setRegistered(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (ex: any) {
      setFormError(ex.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Grain />
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: BG }}>
        <Grain />
        <AlertCircle className="w-12 h-12" style={{ color: GOLD }} />
        <h1 className="text-2xl font-black text-white">Page Not Found</h1>
        <p className="text-zinc-400 text-sm text-center max-w-sm">{error || "This landing page doesn't exist or has been unpublished."}</p>
        <button onClick={() => nav("/")} className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}25` }}>
          Go Home
        </button>
      </div>
    );
  }

  const { landingPage: lp, webinar: wb } = data;
  const accent = lp.accentColor || GOLD;
  const isLive = wb.status === "live";
  const isCompleted = wb.status === "completed";
  const scheduledDate = wb.scheduledAt ? new Date(wb.scheduledAt) : null;
  const bulletPoints: string[] = lp.bulletPoints || [];

  if (registered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden" style={{ background: BG }}>
        <Grain />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 120% 55% at 50% -5%, ${accent}12 0%, transparent 60%)` }} />
        <div className="relative z-10 max-w-lg w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `${accent}15`, border: `2px solid ${accent}40` }}>
            <CheckCircle className="w-10 h-10" style={{ color: accent }} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: `${accent}60` }}>You're In</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">See You There!</h1>
            <p className="text-zinc-400 leading-relaxed">
              You're registered for <span className="text-white font-semibold">{wb.title}</span>.
              {scheduledDate && !countdown.past && (
                <> It starts on <span className="text-white font-semibold">{format(scheduledDate, "MMMM d, yyyy 'at' h:mm a")}</span>.</>
              )}
            </p>
          </div>
          {isLive && (
            <button
              onClick={() => nav(`/watch/${wb.meetingCode}`)}
              className="w-full py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: "#040406" }}
            >
              <Radio className="w-4 h-4" />
              Join Live Now
            </button>
          )}
          {!isLive && scheduledDate && (
            <div className="p-4 rounded-xl" style={{ background: CARD, border: `1px solid ${accent}20` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: `${accent}60` }}>Starts In</p>
              <div className="flex items-center justify-center gap-3">
                <CdUnit val={countdown.d} label="Days" />
                <span className="text-2xl font-black text-white opacity-40 pb-4">:</span>
                <CdUnit val={countdown.h} label="Hours" />
                <span className="text-2xl font-black text-white opacity-40 pb-4">:</span>
                <CdUnit val={countdown.m} label="Min" />
                <span className="text-2xl font-black text-white opacity-40 pb-4">:</span>
                <CdUnit val={countdown.s} label="Sec" />
              </div>
            </div>
          )}
          <p className="text-xs text-zinc-500">Check your email for confirmation and the watch link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: BG, color: "#fff" }}>
      <Grain />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 160% 55% at 50% -8%, ${accent}10 0%, transparent 60%)` }} />

      {/* Film strips */}
      <div className="fixed left-0 top-0 h-full hidden lg:flex items-center pl-2 z-10 pointer-events-none">
        <FilmStrip vertical />
      </div>
      <div className="fixed right-0 top-0 h-full hidden lg:flex items-center pr-2 z-10 pointer-events-none">
        <FilmStrip vertical />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-16 py-12">

        {/* Logo / branding */}
        <div className="flex items-center gap-2 mb-12">
          <Globe className="w-4 h-4" style={{ color: `${accent}60` }} />
          <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${accent}60` }}>Oravini</span>
        </div>

        {/* LIVE badge */}
        {isLive && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-6" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Now
          </div>
        )}
        {!isLive && !isCompleted && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6" style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: accent }}>
            <Calendar className="w-3 h-3" />
            {scheduledDate ? format(scheduledDate, "MMMM d, yyyy") : "Upcoming"}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-16">
          {/* LEFT — content */}
          <div className="space-y-8">

            {/* Hero image */}
            {lp.heroImageUrl && (
              <div className="relative aspect-[16/7] rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}15` }}>
                <img src={lp.heroImageUrl} alt={lp.headline} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${BG}80 0%, transparent 60%)` }} />
              </div>
            )}

            {/* Headline */}
            <div>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.1] mb-4"
                style={{ background: `linear-gradient(135deg, #fff 0%, ${accent} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {lp.headline}
              </h1>
              {lp.subheadline && (
                <p className="text-lg text-zinc-300 leading-relaxed">{lp.subheadline}</p>
              )}
            </div>

            {/* Date / time / duration */}
            {scheduledDate && (
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: `${accent}70` }} />
                  <span className="text-sm text-zinc-300">{format(scheduledDate, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: `${accent}70` }} />
                  <span className="text-sm text-zinc-300">{format(scheduledDate, "h:mm a")}</span>
                </div>
                {wb.durationMinutes && (
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" style={{ color: `${accent}70` }} />
                    <span className="text-sm text-zinc-300">{wb.durationMinutes} min</span>
                  </div>
                )}
              </div>
            )}

            {/* Countdown */}
            {scheduledDate && !countdown.past && !isLive && !isCompleted && (
              <div className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}14` }}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: `${accent}50` }}>Starting In</p>
                <div className="flex items-center gap-3 sm:gap-4">
                  <CdUnit val={countdown.d} label="Days" />
                  <span className="text-2xl font-black opacity-30 pb-4">:</span>
                  <CdUnit val={countdown.h} label="Hours" />
                  <span className="text-2xl font-black opacity-30 pb-4">:</span>
                  <CdUnit val={countdown.m} label="Min" />
                  <span className="text-2xl font-black opacity-30 pb-4">:</span>
                  <CdUnit val={countdown.s} label="Sec" />
                </div>
              </div>
            )}

            {/* Bullet points */}
            {bulletPoints.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: `${accent}50` }}>What You'll Learn</p>
                <div className="space-y-2.5">
                  {bulletPoints.map((bp, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                        <ChevronRight className="w-3 h-3" style={{ color: accent }} />
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">{bp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body content */}
            {lp.bodyContent && (
              <div className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}10` }}>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{lp.bodyContent}</p>
              </div>
            )}

            {/* Presenter */}
            {(lp.presenterName || wb.presenterName) && (
              <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}14` }}>
                {lp.presenterAvatarUrl ? (
                  <img src={lp.presenterAvatarUrl} alt={lp.presenterName || ""} className="w-14 h-14 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${accent}30` }} />
                ) : (
                  <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-xl font-black" style={{ background: `${accent}15`, border: `2px solid ${accent}30`, color: accent }}>
                    {(lp.presenterName || wb.presenterName || "H").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Star className="w-3 h-3" style={{ color: accent }} />
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accent}60` }}>Your Host</p>
                  </div>
                  <p className="font-black text-white">{lp.presenterName || wb.presenterName}</p>
                  {lp.presenterTitle && <p className="text-xs text-zinc-400 mt-0.5">{lp.presenterTitle}</p>}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — registration card */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${accent}20` }}>
              {/* Card header */}
              <div className="px-6 py-5" style={{ background: `${accent}08`, borderBottom: `1px solid ${accent}15` }}>
                {isLive ? (
                  <div className="flex items-center gap-2 mb-1">
                    <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                    <p className="text-sm font-black text-red-400">Happening Right Now</p>
                  </div>
                ) : (
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-1" style={{ color: `${accent}60` }}>
                    {isCompleted ? "Watch the Replay" : "Reserve Your Spot"}
                  </p>
                )}
                <p className="text-lg font-black text-white leading-snug">{lp.headline}</p>
              </div>

              {/* Form */}
              <form onSubmit={handleRegister} className="px-6 py-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-zinc-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}15`, }}
                      onFocus={e => (e.target.style.borderColor = `${accent}40`)}
                      onBlur={e => (e.target.style.borderColor = `${accent}15`)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-zinc-400">Email Address</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}15` }}
                      onFocus={e => (e.target.style.borderColor = `${accent}40`)}
                      onBlur={e => (e.target.style.borderColor = `${accent}15`)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-zinc-400">Phone <span className="text-zinc-600">(optional)</span></label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}15` }}
                      onFocus={e => (e.target.style.borderColor = `${accent}40`)}
                      onBlur={e => (e.target.style.borderColor = `${accent}15`)}
                    />
                  </div>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {isLive ? "Join Live Now" : isCompleted ? "Watch Replay" : (lp.ctaText || "Register Now — It's Free")}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <CheckCircle className="w-3 h-3" style={{ color: `${accent}50` }} />
                  <p className="text-[11px] text-zinc-500">Free to attend. Unsubscribe any time.</p>
                </div>
              </form>
            </div>

            {/* Social proof */}
            <div className="mt-4 flex items-center gap-2 justify-center">
              <Users className="w-3.5 h-3.5" style={{ color: `${accent}50` }} />
              <p className="text-xs text-zinc-500">Join thousands of attendees</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 flex items-center justify-between" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
          <p className="text-xs text-zinc-600">Powered by <span style={{ color: `${accent}60` }}>Oravini</span></p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="/terms" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}
