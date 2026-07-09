import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, ArrowRight, CheckCircle, Star, Play, Timer, DollarSign, X, Shield, Sparkles, ChevronDown } from "lucide-react";

const BG = "#040406";
const CARD = "#0c0c10";

const ACCENT_MAP: Record<string, string> = {
  gold: "#d4b461", purple: "#a855f7", blue: "#3b82f6",
  green: "#22c55e", red: "#ef4444", orange: "#f97316", cyan: "#06b6d4",
};

function getEmbedUrl(url: string) {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function useCountdown(iso: string) {
  const [cd, setCd] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(iso).getTime() - Date.now();
      if (diff <= 0) { setCd({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setCd({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [iso]);
  return cd;
}

// ── Section Renderer ──────────────────────────────────────────────────────────

function Section({ section, accent, funnelSlug, stepSlug }: { section: any; accent: string; funnelSlug: string; stepSlug: string }) {
  const s = section.data || {};
  const cd = useCountdown(s.targetDate || new Date(Date.now() + 86400000).toISOString());
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [, nav] = useLocation();

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch(`/api/f/${funnelSlug}/${stepSlug}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (data.nextSlug) nav(`/f/${data.funnelSlug}/${data.nextSlug}`);
    } finally { setSubmitting(false); }
  };

  if (section.type === "hero") return (
    <div className="text-center px-6 py-20 sm:py-28 relative">
      {s.badge && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-6" style={{ background: `${accent}18`, border: `1px solid ${accent}35`, color: accent }}>
          {s.badge}
        </div>
      )}
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.06] mb-6 max-w-4xl mx-auto">{s.headline}</h1>
      {s.subheadline && <p className="text-xl text-zinc-300 leading-relaxed mb-10 max-w-2xl mx-auto">{s.subheadline}</p>}
      {s.showForm ? (
        <form onSubmit={submitForm} className="max-w-sm mx-auto space-y-3">
          {(!s.fields || s.fields.includes("name")) && <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" className="w-full px-4 py-4 rounded-xl text-white outline-none text-sm" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}30` }} />}
          {(!s.fields || s.fields.includes("email")) && <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" className="w-full px-4 py-4 rounded-xl text-white outline-none text-sm" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}30` }} />}
          {s.fields?.includes("phone") && <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" className="w-full px-4 py-4 rounded-xl text-white outline-none text-sm" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}30` }} />}
          <button type="submit" disabled={submitting} className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{s.ctaText || "Get Instant Access"}<ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>
      ) : (
        <a href={s.ctaUrl || "#"} className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-black text-lg" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
          {s.ctaText || "Get Started"}<ArrowRight className="w-5 h-5" />
        </a>
      )}
    </div>
  );

  if (section.type === "video") {
    const embed = getEmbedUrl(s.videoUrl || "");
    return (
      <div className="px-6 py-12 max-w-4xl mx-auto">
        <div className="aspect-video rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}20`, background: CARD }}>
          {embed ? <iframe src={embed} className="w-full h-full" title="video" allow="fullscreen" /> : (
            <div className="w-full h-full flex items-center justify-center"><Play className="w-12 h-12 text-zinc-700" /></div>
          )}
        </div>
        {s.caption && <p className="text-center text-zinc-400 text-sm mt-4">{s.caption}</p>}
      </div>
    );
  }

  if (section.type === "benefits") return (
    <div className="px-6 py-14 max-w-3xl mx-auto">
      {s.title && <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-6 text-center" style={{ color: `${accent}70` }}>{s.title}</p>}
      <div className="space-y-3">
        {(s.items || []).map((item: string, i: number) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: CARD, border: `1px solid ${accent}12` }}>
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: `${accent}18` }}><CheckCircle className="w-3.5 h-3.5" style={{ color: accent }} /></div>
            <p className="text-zinc-200 text-sm leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "testimonials") return (
    <div className="px-6 py-14 max-w-5xl mx-auto">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-8 text-center" style={{ color: `${accent}70` }}>What People Say</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(s.testimonials || []).map((t: any, i: number) => (
          <div key={i} className="p-5 rounded-2xl flex flex-col gap-3" style={{ background: CARD, border: `1px solid ${accent}15` }}>
            <div className="flex gap-1">{[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color: accent }} />)}</div>
            <p className="text-zinc-300 text-sm leading-relaxed flex-1">{t.quote}</p>
            <div><p className="text-white font-bold text-sm">{t.name}</p><p className="text-zinc-500 text-xs">{t.role}</p></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "cta") return (
    <div className="px-6 py-20 text-center max-w-3xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{s.headline}</h2>
      <p className="text-zinc-400 mb-8 text-lg">{s.subtext}</p>
      <a href={s.ctaUrl || "#"} className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-black text-lg" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
        {s.ctaText || "Get Started"}<ArrowRight className="w-5 h-5" />
      </a>
    </div>
  );

  if (section.type === "form") return (
    <div className="px-6 py-14 max-w-lg mx-auto">
      <div className="p-8 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}20` }}>
        <h2 className="text-2xl font-black text-white mb-2 text-center">{s.formTitle}</h2>
        <p className="text-zinc-400 text-sm text-center mb-6">{s.formSubtext}</p>
        <form onSubmit={submitForm} className="space-y-3">
          {(!s.fields || s.fields.includes("name")) && <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="w-full px-4 py-3.5 rounded-xl text-white outline-none text-sm" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}20` }} />}
          {(!s.fields || s.fields.includes("email")) && <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" className="w-full px-4 py-3.5 rounded-xl text-white outline-none text-sm" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}20` }} />}
          {s.fields?.includes("phone") && <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" className="w-full px-4 py-3.5 rounded-xl text-white outline-none text-sm" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}20` }} />}
          <button type="submit" disabled={submitting} className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{s.buttonText || "Get Instant Access"}<ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>
      </div>
    </div>
  );

  if (section.type === "countdown") return (
    <div className="px-6 py-14 text-center max-w-2xl mx-auto">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-6" style={{ color: `${accent}70` }}>{s.countdownTitle || "Offer Ends In"}</p>
      <div className="p-6 rounded-2xl inline-flex items-center gap-4" style={{ background: CARD, border: `1px solid ${accent}18` }}>
        {[{ v: cd.d, l: "Days" }, { v: cd.h, l: "Hrs" }, { v: cd.m, l: "Min" }, { v: cd.s, l: "Sec" }].map(({ v, l }, i) => (
          <div key={l} className="flex items-center gap-4">
            {i > 0 && <span className="text-2xl font-black opacity-30 -mt-4">:</span>}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 flex items-center justify-center rounded-xl text-2xl font-black" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}25`, color: "#fff" }}>{String(v).padStart(2, "0")}</div>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: `${accent}60` }}>{l}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "pricing") return (
    <div className="px-6 py-16 max-w-md mx-auto text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-6" style={{ color: `${accent}70` }}>{s.pricingTitle}</p>
      <div className="p-8 rounded-2xl" style={{ background: CARD, border: `2px solid ${accent}30`, boxShadow: `0 0 40px ${accent}10` }}>
        {s.originalPrice && <p className="text-zinc-500 line-through text-lg">{s.originalPrice}</p>}
        <p className="text-5xl font-black text-white my-2">{s.price}</p>
        <p className="text-zinc-400 text-sm mb-6">one-time payment</p>
        <div className="space-y-2 mb-8 text-left">
          {(s.pricingFeatures || []).map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: accent }} /><p className="text-zinc-300 text-sm">{f}</p></div>
          ))}
        </div>
        <a href={s.ctaUrl || "#"} className="block w-full py-4 rounded-xl font-black text-base text-center" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
          {s.ctaText || "Get Instant Access"}
        </a>
      </div>
    </div>
  );

  if (section.type === "faq") return (
    <div className="px-6 py-12 max-w-3xl mx-auto">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-8 text-center" style={{ color: `${accent}70` }}>Frequently Asked Questions</p>
      <div className="space-y-2">
        {(s.faqs || []).map((f: any, i: number) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${openFaq === i ? accent + "30" : "rgba(255,255,255,0.06)"}` }}>
            <button className="flex items-center justify-between w-full px-5 py-4" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <p className="text-white font-semibold text-sm text-left">{f.question}</p>
              <span className="text-zinc-500 ml-4 flex-shrink-0" style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
            </button>
            {openFaq === i && <div className="px-5 pb-4"><p className="text-zinc-400 text-sm leading-relaxed">{f.answer}</p></div>}
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "bio") return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}18` }}>
        <div className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-2xl font-black" style={{ background: `${accent}18`, border: `2px solid ${accent}35`, color: accent }}>{(s.name || "H").charAt(0).toUpperCase()}</div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-white font-black text-xl">{s.name}</p>
          <p className="text-zinc-400 text-sm mt-0.5 mb-3">{s.role}</p>
          <p className="text-zinc-300 text-sm leading-relaxed">{s.bio}</p>
        </div>
      </div>
    </div>
  );

  if (section.type === "divider") return (
    <div className="px-6 py-4"><div className="h-px" style={{ background: `linear-gradient(to right, transparent, ${accent}30, transparent)` }} /></div>
  );

  if (section.type === "guarantee") return (
    <div className="px-6 py-10 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl text-center sm:text-left" style={{ background: CARD, border: `1px solid ${accent}20` }}>
        <div className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `${accent}12`, border: `2px solid ${accent}30` }}>
          <Shield className="w-9 h-9" style={{ color: accent }} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: accent }}>{s.badgeText || "100% Risk-Free"}</p>
          <p className="text-white font-black text-xl mb-2">{s.title}</p>
          <p className="text-zinc-400 text-sm leading-relaxed">{s.body}</p>
        </div>
      </div>
    </div>
  );

  if (section.type === "order_bump") return (
    <div className="px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4 p-5 rounded-xl" style={{ background: `${accent}08`, border: `2px dashed ${accent}40` }}>
        <div className="w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: `${accent}20`, border: `2px solid ${accent}50` }}>
          <CheckCircle className="w-3 h-3" style={{ color: accent }} />
        </div>
        <div className="flex-1">
          <p className="font-black text-white text-sm mb-1">{s.title}</p>
          <p className="text-zinc-400 text-xs leading-relaxed mb-2">{s.description}</p>
          <p className="text-xs font-bold" style={{ color: accent }}>{s.ctaText}</p>
        </div>
        <p className="font-black text-white text-lg flex-shrink-0">{s.price}</p>
      </div>
    </div>
  );

  if (section.type === "urgency_bar") return (
    <div className="px-6 py-3 text-center" style={{ background: `linear-gradient(90deg, ${accent}20, ${accent}10)`, borderTop: `1px solid ${accent}30`, borderBottom: `1px solid ${accent}30` }}>
      <p className="font-black text-sm" style={{ color: accent }}>{s.text}</p>
      {s.subtext && <p className="text-xs text-zinc-400 mt-0.5">{s.subtext}</p>}
    </div>
  );

  if (section.type === "stats") return (
    <div className="px-6 py-12">
      {s.label && <p className="text-[10px] font-black uppercase tracking-[0.22em] text-center mb-8" style={{ color: `${accent}70` }}>{s.label}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {(s.stats || []).map((stat: any, i: number) => (
          <div key={i} className="text-center p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}15` }}>
            <p className="text-3xl font-black" style={{ color: accent }}>{stat.number}</p>
            <p className="text-zinc-400 text-xs mt-1">{stat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "press") return (
    <div className="px-6 py-10">
      {s.label && <p className="text-[10px] font-black uppercase tracking-[0.22em] text-center mb-6" style={{ color: "rgba(255,255,255,0.2)" }}>{s.label}</p>}
      <div className="flex flex-wrap items-center justify-center gap-6 max-w-4xl mx-auto">
        {(s.logos || []).map((logo: string, i: number) => (
          <div key={i} className="px-5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-sm font-black" style={{ color: "rgba(255,255,255,0.3)" }}>{logo}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "comparison") return (
    <div className="px-6 py-12 max-w-3xl mx-auto">
      {s.title && <h2 className="text-2xl font-black text-white text-center mb-8">{s.title}</h2>}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}20` }}>
        <div className="grid grid-cols-3" style={{ background: `${accent}12`, borderBottom: `1px solid ${accent}20` }}>
          {(s.headers || ["Feature", "Us", "Others"]).map((h: string, i: number) => (
            <div key={i} className="px-4 py-3 text-xs font-black uppercase tracking-wider text-center" style={{ color: i === 1 ? accent : "rgba(255,255,255,0.4)" }}>{h}</div>
          ))}
        </div>
        {(s.rows || []).map((row: string[], i: number) => (
          <div key={i} className="grid grid-cols-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
            {row.map((cell: string, j: number) => (
              <div key={j} className={`px-4 py-3 text-sm text-center ${j === 0 ? "text-left text-zinc-300" : j === 1 ? "text-green-400 font-black text-base" : "text-zinc-600"}`}>{cell}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "two_step_form") {
    const [step2, setStep2] = useState(false);
    return (
      <div className="px-6 py-16 max-w-xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">{s.headline}</h2>
        {!step2 ? (
          <button onClick={() => setStep2(true)}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-base"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "#040406" }}>
            {s.buttonText}<ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={submitForm} className="p-6 rounded-2xl text-left" style={{ background: CARD, border: `1px solid ${accent}25` }}>
            <p className="text-lg font-black text-white mb-4 text-center">{s.formTitle}</p>
            <div className="space-y-3">
              {(!s.fields || s.fields.includes("name")) && <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" required className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border outline-none" style={{ borderColor: `${accent}30` }} />}
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email address" required className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border outline-none" style={{ borderColor: `${accent}30` }} />
              <button type="submit" disabled={submitting}
                className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "#040406" }}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{s.buttonText2}<ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    );
  }

  if (section.type === "image") return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      {s.src && <img src={s.src} alt={s.alt || ""} className="w-full rounded-2xl object-cover" style={{ maxHeight: 480 }} />}
      {s.caption && <p className="text-center text-zinc-500 text-xs mt-3">{s.caption}</p>}
    </div>
  );

  // Overlay types — render nothing inline (they render as overlays in the page wrapper)
  if (section.type === "social_proof_popup" || section.type === "sticky_cta" || section.type === "exit_intent") return null;

  return null;
}

// ── Upsell/Downsell Overlay ───────────────────────────────────────────────────

function UpsellOverlay({ step, funnelSlug, accent }: { step: any; funnelSlug: string; accent: string }) {
  const [loading, setLoading] = useState<"yes" | "no" | null>(null);
  const [, nav] = useLocation();

  const respond = async (choice: "lead" | "decline") => {
    const btn = choice === "lead" ? "yes" : "no";
    setLoading(btn);
    const r = await fetch(`/api/f/${funnelSlug}/${step.slug}/${choice}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await r.json();
    if (data.nextSlug) nav(`/f/${data.funnelSlug}/${data.nextSlug}`);
    setLoading(null);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: `linear-gradient(to top, ${BG}f0, transparent)` }}>
      <div className="max-w-xl mx-auto space-y-3">
        {step.price && (
          <div className="p-4 rounded-2xl text-center" style={{ background: CARD, border: `1px solid ${accent}30` }}>
            <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: accent }}>Special One-Time Offer</p>
            <p className="text-white font-black text-2xl">${step.price}{step.product_name && ` — ${step.product_name}`}</p>
          </div>
        )}
        <button onClick={() => respond("lead")} disabled={loading !== null}
          className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
          {loading === "yes" ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{step.yes_button_text || "Yes! Add This To My Order"}<ArrowRight className="w-5 h-5" /></>}
        </button>
        <button onClick={() => respond("decline")} disabled={loading !== null}
          className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">
          {loading === "no" ? <Loader2 className="w-4 h-4 animate-spin inline" /> : (step.no_button_text || "No thanks, I don't want this upgrade")}
        </button>
      </div>
    </div>
  );
}

// ── Overlay: Social Proof Popup ───────────────────────────────────────────────

function SocialProofPopup({ config, accent }: { config: any; accent: string }) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const names: string[] = config.names || ["Sarah M.", "Mike R.", "Emma L.", "David K."];
  const locations: string[] = config.locations || ["New York", "California", "Texas", "Florida"];
  const delay = (config.delay || 5) * 1000;
  const interval = (config.interval || 30) * 1000;

  useEffect(() => {
    const show = setTimeout(() => {
      setVisible(true);
      const cycle = setInterval(() => {
        setVisible(false);
        setTimeout(() => { setCurrent(i => (i + 1) % names.length); setVisible(true); }, 600);
      }, interval);
      return () => clearInterval(cycle);
    }, delay);
    return () => clearTimeout(show);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -20, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed bottom-6 left-4 z-50 max-w-xs"
        >
          <div className="flex items-start gap-3 p-3.5 rounded-2xl shadow-2xl" style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm" style={{ background: `${accent}20`, color: accent }}>
              {names[current].charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-xs">{names[current]} from {locations[current % locations.length]}</p>
              <p className="text-zinc-400 text-[11px]">{config.action || "just signed up"}</p>
              <p className="text-zinc-600 text-[10px] mt-0.5">Just now</p>
            </div>
            <button onClick={() => setVisible(false)} className="text-zinc-600 hover:text-zinc-400 flex-shrink-0"><X className="w-3 h-3" /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Overlay: Sticky CTA Bar ───────────────────────────────────────────────────

function StickyCTABar({ config, accent }: { config: any; accent: string }) {
  const [show, setShow] = useState(false);
  const threshold = config.showAfterScroll || 300;

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2"
          style={{ background: `linear-gradient(to top, ${BG}f8, transparent)` }}
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 px-5 py-3 rounded-2xl"
            style={{ background: "#0a0a14", border: `1px solid ${accent}35`, boxShadow: `0 0 40px ${accent}15` }}>
            <p className="text-zinc-300 text-sm font-semibold flex-1">{config.text}</p>
            <button className="flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "#040406" }}>
              {config.ctaText || "Get Instant Access →"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Overlay: Exit Intent Popup ────────────────────────────────────────────────

function ExitIntentPopup({ config, accent }: { config: any; accent: string }) {
  const [show, setShow] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    const onMouseOut = (e: MouseEvent) => {
      if (fired.current || e.clientY > 20) return;
      fired.current = true;
      setShow(true);
    };
    document.addEventListener("mouseleave", onMouseOut);
    return () => document.removeEventListener("mouseleave", onMouseOut);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92 }}
            className="max-w-sm w-full p-8 rounded-2xl text-center"
            style={{ background: "#0f0f1a", border: `1px solid ${accent}25`, boxShadow: `0 0 60px ${accent}15` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
              <Sparkles className="w-6 h-6" style={{ color: accent }} />
            </div>
            <h3 className="text-xl font-black text-white mb-2">{config.headline || "Wait! Don't Miss Out"}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">{config.body}</p>
            <button className="w-full py-3.5 rounded-xl font-black text-sm mb-3"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "#040406" }}>
              {config.ctaText || "Yes, Give Me Access!"}
            </button>
            <button onClick={() => setShow(false)} className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">
              {config.dismissText || "No thanks"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Public Funnel Step Page ───────────────────────────────────────────────────

export default function PublicFunnelStep() {
  const [match1, params1] = useRoute("/f/:slug");
  const [match2, params2] = useRoute("/f/:slug/:stepSlug");
  const funnelSlug = (params1?.slug || params2?.slug) ?? "";
  const stepSlug = params2?.stepSlug;

  const { data, isLoading, isError } = useQuery<{ funnel: any; step: any }>({
    queryKey: [`/api/f/${funnelSlug}/${stepSlug || ""}`],
    queryFn: async () => {
      const url = stepSlug ? `/api/f/${funnelSlug}/${stepSlug}` : `/api/f/${funnelSlug}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    enabled: !!funnelSlug,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: BG }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#d4b461" }} />
    </div>
  );

  if (isError || !data) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: BG }}>
      <p className="text-zinc-500">Funnel not found</p>
    </div>
  );

  const { funnel, step } = data;
  const accent = ACCENT_MAP[step.color_scheme || "gold"] || "#d4b461";
  const sections: any[] = Array.isArray(step.sections) ? step.sections : [];
  const isOffer = ["upsell", "downsell", "sales"].includes(step.type);

  // Extract overlay configs from sections
  const socialProofCfg = sections.find((s: any) => s.type === "social_proof_popup")?.data;
  const stickyCfg = sections.find((s: any) => s.type === "sticky_cta")?.data;
  const exitCfg = sections.find((s: any) => s.type === "exit_intent")?.data;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Gradient glow */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 h-96" style={{ background: `radial-gradient(ellipse 120% 40% at 50% 0%, ${accent}10 0%, transparent 65%)` }} />

      <div className="relative z-10 max-w-5xl mx-auto pb-32">
        {sections.length > 0 ? (
          sections.map((s: any) => <Section key={s.id} section={s} accent={accent} funnelSlug={funnelSlug} stepSlug={step.slug} />)
        ) : (
          <div className="flex items-center justify-center h-80">
            <p className="text-zinc-600 text-sm">This step has no content yet.</p>
          </div>
        )}
      </div>

      {/* Upsell / Downsell sticky CTA */}
      {isOffer && <UpsellOverlay step={step} funnelSlug={funnelSlug} accent={accent} />}

      {/* Conversion overlays */}
      {socialProofCfg && <SocialProofPopup config={socialProofCfg} accent={accent} />}
      {stickyCfg && !isOffer && <StickyCTABar config={stickyCfg} accent={accent} />}
      {exitCfg && <ExitIntentPopup config={exitCfg} accent={accent} />}
    </div>
  );
}
