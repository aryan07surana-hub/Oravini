import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Calendar, Clock, Users, CheckCircle, ChevronRight,
  Radio, Play, Star, Globe, ArrowRight, Loader2, AlertCircle,
  ChevronDown, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";

const ACCENT_MAP: Record<string, string> = {
  gold: "#d4b461",
  purple: "#a855f7",
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f97316",
  cyan: "#06b6d4",
};

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
    <div className={`flex ${vertical ? "flex-col" : ""} gap-[3px] opacity-30`} style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ width: vertical ? 16 : 22, height: vertical ? 22 : 16, background: i % 2 === 0 ? `${GOLD}22` : "transparent", border: `1px solid ${GOLD}15`, borderRadius: 2, flexShrink: 0 }} />
      ))}
    </div>
  );
}

function CdUnit({ val, label }: { val: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl text-2xl sm:text-3xl font-black" style={{ background: CARD, border: `1px solid ${GOLD}25`, color: "#fff" }}>
        {String(val).padStart(2, "0")}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest mt-1.5" style={{ color: `${GOLD}60` }}>{label}</p>
    </div>
  );
}

// ── Marketing Page Renderer ────────────────────────────────────────────────────

function getEmbedUrl(url: string): string {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function MarketingSection({ section, accent, slug }: { section: any; accent: string; slug: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const cd = useCountdown(section.data?.targetDate ? new Date(section.data.targetDate) : null);

  const s = section.data || {};

  const handleLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const fields: string[] = s.fields || ["name", "email"];
    if (fields.includes("name") && !formData.name.trim()) { setErr("Name required"); return; }
    if (fields.includes("email") && !formData.email.trim()) { setErr("Email required"); return; }
    setSubmitting(true); setErr("");
    try {
      const r = await fetch(`/api/lp/${slug}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, email: formData.email, phone: formData.phone }),
      });
      if (!r.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch { setErr("Something went wrong. Try again."); }
    finally { setSubmitting(false); }
  };

  if (section.type === "hero") return (
    <div className="text-center px-4 py-16 sm:py-24 max-w-4xl mx-auto">
      {s.badge && <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-6" style={{ background: `${accent}18`, border: `1px solid ${accent}35`, color: accent }}>{s.badge}</div>}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] mb-6" style={{ background: `linear-gradient(135deg, #fff 30%, ${accent} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.headline || "Your Headline Here"}</h1>
      {s.subheadline && <p className="text-lg sm:text-xl text-zinc-300 leading-relaxed mb-10 max-w-2xl mx-auto">{s.subheadline}</p>}
      {s.showForm ? (
        <form onSubmit={handleLead} className="max-w-md mx-auto space-y-3">
          {(!s.fields || s.fields.includes("name")) && <input type="text" placeholder="Your name" value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}20` }} />}
          {(!s.fields || s.fields.includes("email")) && <input type="email" placeholder="Email address" value={formData.email} onChange={e => setFormData(f => ({...f, email: e.target.value}))} className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}20` }} />}
          {s.fields?.includes("phone") && <input type="tel" placeholder="Phone (optional)" value={formData.phone} onChange={e => setFormData(f => ({...f, phone: e.target.value}))} className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}20` }} />}
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button type="submit" disabled={submitting || submitted} className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG, opacity: submitting ? 0.7 : 1 }}>
            {submitted ? <><CheckCircle className="w-4 h-4" /> You're in!</> : submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{s.ctaText || "Get Access"} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      ) : s.ctaText && (
        <a href={s.ctaUrl || "#"} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-base transition-opacity hover:opacity-90" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
          {s.ctaText} <ArrowRight className="w-4 h-4" />
        </a>
      )}
    </div>
  );

  if (section.type === "video") {
    const embedUrl = getEmbedUrl(s.videoUrl || "");
    return (
      <div className="px-4 py-12 max-w-4xl mx-auto">
        <div className="relative aspect-video rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}20`, background: CARD }}>
          {embedUrl ? (
            <iframe src={embedUrl} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen title="Video" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${accent}20`, border: `2px solid ${accent}40` }}><Play className="w-7 h-7" style={{ color: accent }} /></div>
              <p className="text-zinc-500 text-sm">Video coming soon</p>
            </div>
          )}
        </div>
        {s.caption && <p className="text-center text-zinc-400 text-sm mt-4">{s.caption}</p>}
      </div>
    );
  }

  if (section.type === "benefits") return (
    <div className="px-4 py-14 max-w-3xl mx-auto">
      {s.title && <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-6 text-center" style={{ color: `${accent}70` }}>{s.title}</p>}
      <div className="space-y-3">
        {(s.items || []).map((item: string, i: number) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: CARD, border: `1px solid ${accent}12` }}>
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}><CheckCircle className="w-3.5 h-3.5" style={{ color: accent }} /></div>
            <p className="text-zinc-200 text-sm leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "testimonials") return (
    <div className="px-4 py-14 max-w-5xl mx-auto">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-8 text-center" style={{ color: `${accent}70` }}>What People Say</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(s.testimonials || []).map((t: any, i: number) => (
          <div key={i} className="p-5 rounded-2xl flex flex-col gap-3" style={{ background: CARD, border: `1px solid ${accent}15` }}>
            <div className="flex gap-1">{[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color: accent }} />)}</div>
            <p className="text-zinc-300 text-sm leading-relaxed flex-1">"{t.quote}"</p>
            <div>
              <p className="text-white font-bold text-sm">{t.name}</p>
              {t.role && <p className="text-zinc-500 text-xs">{t.role}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "cta") return (
    <div className="px-4 py-20 text-center max-w-3xl mx-auto">
      {s.headline && <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{s.headline}</h2>}
      {s.subtext && <p className="text-zinc-400 mb-8 text-lg">{s.subtext}</p>}
      {s.ctaText && (
        <a href={s.ctaUrl || "#"} className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-black text-base transition-opacity hover:opacity-90" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
          {s.ctaText} <ArrowRight className="w-4 h-4" />
        </a>
      )}
    </div>
  );

  if (section.type === "form") return (
    <div className="px-4 py-16 max-w-lg mx-auto">
      <div className="p-8 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}20` }}>
        {s.formTitle && <h2 className="text-2xl font-black text-white mb-2 text-center">{s.formTitle}</h2>}
        {s.formSubtext && <p className="text-zinc-400 text-sm text-center mb-6">{s.formSubtext}</p>}
        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: accent }} />
            <p className="text-white font-bold">You're in!</p>
            <p className="text-zinc-400 text-sm mt-1">Check your email for next steps.</p>
          </div>
        ) : (
          <form onSubmit={handleLead} className="space-y-3">
            {(!s.fields || s.fields.includes("name")) && <input type="text" placeholder="Full name" value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}20` }} />}
            {(!s.fields || s.fields.includes("email")) && <input type="email" placeholder="Email address" value={formData.email} onChange={e => setFormData(f => ({...f, email: e.target.value}))} className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}20` }} />}
            {s.fields?.includes("phone") && <input type="tel" placeholder="Phone (optional)" value={formData.phone} onChange={e => setFormData(f => ({...f, phone: e.target.value}))} className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}20` }} />}
            {err && <p className="text-red-400 text-xs">{err}</p>}
            <button type="submit" disabled={submitting} className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{s.buttonText || "Get Instant Access"} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (section.type === "countdown") return (
    <div className="px-4 py-14 text-center max-w-2xl mx-auto">
      {s.countdownTitle && <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-6" style={{ color: `${accent}70` }}>{s.countdownTitle}</p>}
      <div className="p-6 rounded-2xl inline-flex items-center gap-3 sm:gap-5" style={{ background: CARD, border: `1px solid ${accent}18` }}>
        {[{ v: cd.d, l: "Days" }, { v: cd.h, l: "Hrs" }, { v: cd.m, l: "Min" }, { v: cd.s, l: "Sec" }].map(({ v, l }, i) => (
          <div key={l} className="flex items-center gap-3 sm:gap-5">
            {i > 0 && <span className="text-2xl font-black opacity-30 -mt-4">:</span>}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center rounded-xl text-2xl font-black" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}25`, color: "#fff" }}>{String(v).padStart(2, "0")}</div>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: `${accent}60` }}>{l}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "pricing") return (
    <div className="px-4 py-16 max-w-md mx-auto text-center">
      {s.pricingTitle && <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-6" style={{ color: `${accent}70` }}>{s.pricingTitle}</p>}
      <div className="p-8 rounded-2xl" style={{ background: CARD, border: `2px solid ${accent}30`, boxShadow: `0 0 40px ${accent}12` }}>
        <div className="mb-4">
          {s.originalPrice && <p className="text-zinc-500 line-through text-lg">{s.originalPrice}</p>}
          <p className="text-5xl font-black text-white">{s.price || "$97"}</p>
          <p className="text-zinc-400 text-sm mt-1">one-time payment</p>
        </div>
        <div className="space-y-2 mb-8 text-left">
          {(s.pricingFeatures || []).map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: accent }} /><p className="text-zinc-300 text-sm">{f}</p></div>
          ))}
        </div>
        {s.ctaText && (
          <a href={s.ctaUrl || "#"} className="block w-full py-4 rounded-xl font-black text-base text-center transition-opacity hover:opacity-90" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
            {s.ctaText}
          </a>
        )}
      </div>
    </div>
  );

  if (section.type === "faq") return (
    <div className="px-4 py-14 max-w-3xl mx-auto">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-8 text-center" style={{ color: `${accent}70` }}>Frequently Asked Questions</p>
      <div className="space-y-2">
        {(s.faqs || []).map((f: any, i: number) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${open === i ? accent + "30" : "rgba(255,255,255,0.06)"}` }}>
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
              <p className="text-white font-semibold text-sm">{f.question}</p>
              <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: accent, transform: open === i ? "rotate(180deg)" : "none" }} />
            </button>
            {open === i && <div className="px-5 pb-4"><p className="text-zinc-400 text-sm leading-relaxed">{f.answer}</p></div>}
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "bio") return (
    <div className="px-4 py-14 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}18` }}>
        {s.avatarUrl ? (
          <img src={s.avatarUrl} alt={s.name || ""} className="w-20 h-20 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${accent}40` }} />
        ) : (
          <div className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-2xl font-black" style={{ background: `${accent}18`, border: `2px solid ${accent}35`, color: accent }}>{(s.name || "H").charAt(0).toUpperCase()}</div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-1"><Star className="w-3.5 h-3.5" style={{ color: accent }} /><p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accent}60` }}>Your Host</p></div>
          <p className="text-white font-black text-xl">{s.name || "Host Name"}</p>
          {s.role && <p className="text-zinc-400 text-sm mt-0.5">{s.role}</p>}
          {s.bio && <p className="text-zinc-300 text-sm leading-relaxed mt-3">{s.bio}</p>}
          {(s.socialLinks || []).length > 0 && (
            <div className="flex gap-3 mt-3">
              {s.socialLinks.map((sl: any, i: number) => (
                <a key={i} href={sl.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: `${accent}80` }}>
                  <ExternalLink className="w-3 h-3" />{sl.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (section.type === "divider") return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="h-px" style={{ background: `linear-gradient(to right, transparent, ${accent}30, transparent)` }} />
    </div>
  );

  return null;
}

function MarketingLandingPage({ page, slug }: { page: any; slug: string }) {
  const accent = ACCENT_MAP[page.color_scheme] || GOLD;
  const sections: any[] = page.sections || [];

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: BG, color: "#fff" }}>
      <Grain />
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 160% 55% at 50% -8%, ${accent}10 0%, transparent 60%)` }} />
      <div className="fixed left-0 top-0 h-full hidden lg:flex items-center pl-2 z-10 pointer-events-none"><FilmStrip vertical /></div>
      <div className="fixed right-0 top-0 h-full hidden lg:flex items-center pr-2 z-10 pointer-events-none"><FilmStrip vertical /></div>
      <div className="relative z-10">
        {sections.map((section, i) => (
          <MarketingSection key={section.id || i} section={section} accent={accent} slug={slug} />
        ))}
        <div className="mt-8 pb-8 flex items-center justify-center gap-6" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs text-zinc-600">Powered by <span style={{ color: `${accent}60` }}>Oravini</span></p>
          <a href="/privacy" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy</a>
          <a href="/terms" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms</a>
        </div>
      </div>
    </div>
  );
}

// ── Webinar Landing Page (original) ──────────────────────────────────────────

function WebinarLandingPage({ landingPage: lp, webinar: wb }: { landingPage: any; webinar: any }) {
  const [registered, setRegistered] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [, nav] = useLocation();

  const accent = lp.accentColor || GOLD;
  const isLive = wb.status === "live";
  const isCompleted = wb.status === "completed";
  const scheduledDate = wb.scheduledAt ? new Date(wb.scheduledAt) : null;
  const bulletPoints: string[] = lp.bulletPoints || [];

  const countdown = useCountdown(scheduledDate);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setFormError("Name and email are required."); return; }
    setSubmitting(true); setFormError("");
    try {
      const r = await fetch(`/api/register/${wb.meetingCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || "Registration failed"); }
      setRegistered(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (ex: any) {
      setFormError(ex.message || "Registration failed. Please try again.");
    } finally { setSubmitting(false); }
  }

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
            <p className="text-zinc-400 leading-relaxed">You're registered for <span className="text-white font-semibold">{wb.title}</span>.{scheduledDate && !countdown.past && <> It starts on <span className="text-white font-semibold">{format(scheduledDate, "MMMM d, yyyy 'at' h:mm a")}</span>.</>}</p>
          </div>
          {isLive && (<button onClick={() => nav(`/watch/${wb.meetingCode}`)} className="w-full py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: "#040406" }}><Radio className="w-4 h-4" />Join Live Now</button>)}
          {!isLive && scheduledDate && (
            <div className="p-4 rounded-xl" style={{ background: CARD, border: `1px solid ${accent}20` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: `${accent}60` }}>Starts In</p>
              <div className="flex items-center justify-center gap-3">
                <CdUnit val={countdown.d} label="Days" /><span className="text-2xl font-black text-white opacity-40 pb-4">:</span>
                <CdUnit val={countdown.h} label="Hours" /><span className="text-2xl font-black text-white opacity-40 pb-4">:</span>
                <CdUnit val={countdown.m} label="Min" /><span className="text-2xl font-black text-white opacity-40 pb-4">:</span>
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
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 160% 55% at 50% -8%, ${accent}10 0%, transparent 60%)` }} />
      <div className="fixed left-0 top-0 h-full hidden lg:flex items-center pl-2 z-10 pointer-events-none"><FilmStrip vertical /></div>
      <div className="fixed right-0 top-0 h-full hidden lg:flex items-center pr-2 z-10 pointer-events-none"><FilmStrip vertical /></div>
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-16 py-12">
        <div className="flex items-center gap-2 mb-12"><Globe className="w-4 h-4" style={{ color: `${accent}60` }} /><span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${accent}60` }}>Oravini</span></div>
        {isLive && (<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-6" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }}><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />Live Now</div>)}
        {!isLive && !isCompleted && (<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6" style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: accent }}><Calendar className="w-3 h-3" />{scheduledDate ? format(scheduledDate, "MMMM d, yyyy") : "Upcoming"}</div>)}
        <div className="grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-16">
          <div className="space-y-8">
            {lp.heroImageUrl && (<div className="relative aspect-[16/7] rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}15` }}><img src={lp.heroImageUrl} alt={lp.headline} className="w-full h-full object-cover" /><div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${BG}80 0%, transparent 60%)` }} /></div>)}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.1] mb-4" style={{ background: `linear-gradient(135deg, #fff 0%, ${accent} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{lp.headline}</h1>
              {lp.subheadline && <p className="text-lg text-zinc-300 leading-relaxed">{lp.subheadline}</p>}
            </div>
            {scheduledDate && (<div className="flex flex-wrap gap-4"><div className="flex items-center gap-2"><Calendar className="w-4 h-4" style={{ color: `${accent}70` }} /><span className="text-sm text-zinc-300">{format(scheduledDate, "EEEE, MMMM d, yyyy")}</span></div><div className="flex items-center gap-2"><Clock className="w-4 h-4" style={{ color: `${accent}70` }} /><span className="text-sm text-zinc-300">{format(scheduledDate, "h:mm a")}</span></div>{wb.durationMinutes && (<div className="flex items-center gap-2"><Play className="w-4 h-4" style={{ color: `${accent}70` }} /><span className="text-sm text-zinc-300">{wb.durationMinutes} min</span></div>)}</div>)}
            {scheduledDate && !countdown.past && !isLive && !isCompleted && (<div className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}14` }}><p className="text-[10px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: `${accent}50` }}>Starting In</p><div className="flex items-center gap-3 sm:gap-4"><CdUnit val={countdown.d} label="Days" /><span className="text-2xl font-black opacity-30 pb-4">:</span><CdUnit val={countdown.h} label="Hours" /><span className="text-2xl font-black opacity-30 pb-4">:</span><CdUnit val={countdown.m} label="Min" /><span className="text-2xl font-black opacity-30 pb-4">:</span><CdUnit val={countdown.s} label="Sec" /></div></div>)}
            {bulletPoints.length > 0 && (<div className="space-y-3"><p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: `${accent}50` }}>What You'll Learn</p><div className="space-y-2.5">{bulletPoints.map((bp, i) => (<div key={i} className="flex items-start gap-3"><div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}><ChevronRight className="w-3 h-3" style={{ color: accent }} /></div><p className="text-sm text-zinc-300 leading-relaxed">{bp}</p></div>))}</div></div>)}
            {lp.bodyContent && (<div className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}10` }}><p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{lp.bodyContent}</p></div>)}
            {(lp.presenterName || wb.presenterName) && (<div className="flex items-center gap-4 p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}14` }}>{lp.presenterAvatarUrl ? (<img src={lp.presenterAvatarUrl} alt={lp.presenterName || ""} className="w-14 h-14 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${accent}30` }} />) : (<div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-xl font-black" style={{ background: `${accent}15`, border: `2px solid ${accent}30`, color: accent }}>{(lp.presenterName || wb.presenterName || "H").charAt(0).toUpperCase()}</div>)}<div><div className="flex items-center gap-1.5 mb-0.5"><Star className="w-3 h-3" style={{ color: accent }} /><p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accent}60` }}>Your Host</p></div><p className="font-black text-white">{lp.presenterName || wb.presenterName}</p>{lp.presenterTitle && <p className="text-xs text-zinc-400 mt-0.5">{lp.presenterTitle}</p>}</div></div>)}
          </div>
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${accent}20` }}>
              <div className="px-6 py-5" style={{ background: `${accent}08`, borderBottom: `1px solid ${accent}15` }}>
                {isLive ? (<div className="flex items-center gap-2 mb-1"><Radio className="w-4 h-4 text-red-400 animate-pulse" /><p className="text-sm font-black text-red-400">Happening Right Now</p></div>) : (<p className="text-[10px] font-black uppercase tracking-[0.22em] mb-1" style={{ color: `${accent}60` }}>{isCompleted ? "Watch the Replay" : "Reserve Your Spot"}</p>)}
                <p className="text-lg font-black text-white leading-snug">{lp.headline}</p>
              </div>
              <form onSubmit={handleRegister} className="px-6 py-6 space-y-4">
                <div className="space-y-3">
                  <div><label className="block text-xs font-semibold mb-1.5 text-zinc-400">Full Name</label><input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter your full name" className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}15` }} /></div>
                  <div><label className="block text-xs font-semibold mb-1.5 text-zinc-400">Email Address</label><input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}15` }} /></div>
                  <div><label className="block text-xs font-semibold mb-1.5 text-zinc-400">Phone <span className="text-zinc-600">(optional)</span></label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}15` }} /></div>
                </div>
                {formError && (<div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{formError}</div>)}
                <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
                  {submitting ? (<Loader2 className="w-4 h-4 animate-spin" />) : (<>{isLive ? "Join Live Now" : isCompleted ? "Watch Replay" : (lp.ctaText || "Register Now — It's Free")}<ArrowRight className="w-4 h-4" /></>)}
                </button>
                <div className="flex items-center justify-center gap-1.5 pt-1"><CheckCircle className="w-3 h-3" style={{ color: `${accent}50` }} /><p className="text-[11px] text-zinc-500">Free to attend. Unsubscribe any time.</p></div>
              </form>
            </div>
            <div className="mt-4 flex items-center gap-2 justify-center"><Users className="w-3.5 h-3.5" style={{ color: `${accent}50` }} /><p className="text-xs text-zinc-500">Join thousands of attendees</p></div>
          </div>
        </div>
        <div className="mt-16 pt-6 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs text-zinc-600">Powered by <span style={{ color: `${accent}60` }}>Oravini</span></p>
          <div className="flex items-center gap-4"><a href="/privacy" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy</a><a href="/terms" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms</a></div>
        </div>
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export default function PublicLandingPage() {
  const [, params] = useRoute("/lp/:slug");
  const slug = params?.slug ?? "";
  const [, nav] = useLocation();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/lp/${slug}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.message || "Not found")))
      .then(d => { setData(d); setLoading(false); })
      .catch((e: any) => { setError(typeof e === "string" ? e : "This landing page could not be found."); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <Grain />
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: BG }}>
      <Grain />
      <AlertCircle className="w-12 h-12" style={{ color: GOLD }} />
      <h1 className="text-2xl font-black text-white">Page Not Found</h1>
      <p className="text-zinc-400 text-sm text-center max-w-sm">{error || "This landing page doesn't exist or has been unpublished."}</p>
      <button onClick={() => nav("/")} className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}25` }}>Go Home</button>
    </div>
  );

  if (data.type === "marketing") return <MarketingLandingPage page={data.page} slug={slug} />;
  return <WebinarLandingPage landingPage={data.landingPage} webinar={data.webinar} />;
}
