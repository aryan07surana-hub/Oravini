import { useState, useEffect, useCallback, useRef, useLayoutEffect, forwardRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  Eye, Globe, Copy, Check, ExternalLink, Loader2,
  Monitor, Smartphone, Save,
  Play, Star, CheckCircle, ArrowRight, ChevronDown as ChevronDownIcon,
  X, Image, Type, Video, List, MessageSquare, Zap,
  Timer, DollarSign, HelpCircle, User, Minus,
  Sparkles, GripVertical, Settings, Send,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";
const SIDEBAR_BG = "#06060b";
const PANEL_BORDER = "rgba(255,255,255,0.07)";

const ACCENT_MAP: Record<string, string> = {
  gold: "#d4b461", purple: "#a855f7", blue: "#3b82f6",
  green: "#22c55e", red: "#ef4444", orange: "#f97316", cyan: "#06b6d4",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionType = "hero" | "video" | "benefits" | "testimonials" | "cta" | "form" | "countdown" | "pricing" | "faq" | "bio" | "divider";

type Section = { id: string; type: SectionType; data: Record<string, any> };
type ChatMessage = { id: string; role: "user" | "ai"; text: string; changes?: string[]; timestamp: number };

const QUICK_PROMPTS = [
  "Stronger headline", "More urgency", "Add testimonials", "Add guarantee",
  "Stronger CTA", "Add FAQ", "Shorten the page", "Add pricing",
];

const SECTION_META: Record<SectionType, { label: string; icon: any; desc: string }> = {
  hero:         { label: "Hero",         icon: Type,          desc: "Headline + CTA" },
  video:        { label: "Video",        icon: Video,         desc: "YouTube / Vimeo embed" },
  benefits:     { label: "Benefits",     icon: List,          desc: "Bullet list" },
  testimonials: { label: "Testimonials", icon: MessageSquare, desc: "Social proof" },
  cta:          { label: "CTA",          icon: Zap,           desc: "Call to action" },
  form:         { label: "Opt-in Form",  icon: User,          desc: "Lead capture" },
  countdown:    { label: "Countdown",    icon: Timer,         desc: "Live timer" },
  pricing:      { label: "Pricing",      icon: DollarSign,    desc: "Price card" },
  faq:          { label: "FAQ",          icon: HelpCircle,    desc: "Q&A accordion" },
  bio:          { label: "Bio",          icon: Image,         desc: "Host / presenter" },
  divider:      { label: "Divider",      icon: Minus,         desc: "Separator" },
};

function genId() { return Math.random().toString(36).slice(2, 10); }

function defaultSection(type: SectionType): Section {
  const d: Record<SectionType, Record<string, any>> = {
    hero:         { headline: "Your Compelling Headline Here", subheadline: "Describe the transformation you offer in one sentence.", ctaText: "Get Started", badge: "" },
    video:        { videoUrl: "", caption: "Watch this short video to see how it works" },
    benefits:     { title: "What You'll Get", items: ["Benefit one: explain the value", "Benefit two: explain the value", "Benefit three: explain the value"] },
    testimonials: { testimonials: [{ name: "Happy Client", role: "Entrepreneur", quote: "This completely transformed my results. Highly recommend!" }] },
    cta:          { headline: "Ready to Get Started?", subtext: "Join hundreds of people who've already made the switch.", ctaText: "Yes, Let's Go!", ctaUrl: "" },
    form:         { formTitle: "Grab Your Free Access", formSubtext: "Enter your details below to get instant access.", buttonText: "Get Instant Access", fields: ["name", "email"] },
    countdown:    { countdownTitle: "Offer Ends In", targetDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16) },
    pricing:      { pricingTitle: "Simple Pricing", price: "$97", originalPrice: "$197", pricingFeatures: ["Full access", "Lifetime updates", "Community access", "30-day guarantee"], ctaText: "Get Instant Access", ctaUrl: "" },
    faq:          { faqs: [{ question: "Who is this for?", answer: "This is for [target audience] who want to [outcome]." }, { question: "What do I get?", answer: "You get [list main deliverables here]." }] },
    bio:          { name: "Your Name", role: "Founder & Expert", bio: "Brief bio explaining your background and why you're the right person to help.", avatarUrl: "", socialLinks: [] },
    divider:      {},
  };
  return { id: genId(), type, data: d[type] || {} };
}

// ── Inline Editable Text ──────────────────────────────────────────────────────

type ET_Tag = "span" | "p" | "h1" | "h2" | "h3" | "div";

type ET_Props = {
  value: string;
  onChange: (v: string) => void;
  as?: ET_Tag;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
};

function ET({ value, onChange, as: Tag = "span", className, style, placeholder }: ET_Props) {
  const ref = useRef<HTMLElement>(null);
  const hasFocus = useRef(false);

  useLayoutEffect(() => {
    if (ref.current && !hasFocus.current) {
      ref.current.innerText = value || "";
    }
  }, [value]);

  const El = Tag as any;
  return (
    <El
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder || "Click to edit…"}
      onFocus={() => { hasFocus.current = true; }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        hasFocus.current = false;
        onChange(e.currentTarget.innerText || "");
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      className={className}
      style={{
        outline: "none",
        cursor: "text",
        minWidth: 20,
        WebkitTextFillColor: "unset",
        ...style,
      }}
    />
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function getEmbedUrl(url: string): string {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function useCountdownTick(iso: string) {
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

// ── Section Preview with Inline Editing ───────────────────────────────────────

function PreviewSection({ section, accent, isSelected, onClick, onFieldChange }: {
  section: Section; accent: string; isSelected: boolean;
  onClick: () => void;
  onFieldChange: (field: string, value: any) => void;
}) {
  const s = section.data;
  const cd = useCountdownTick(s.targetDate || new Date(Date.now() + 86400000).toISOString());
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const up = (k: string, v: any) => onFieldChange(k, v);

  const ring: React.CSSProperties = {
    outline: isSelected ? `2px solid ${accent}70` : "none",
    outlineOffset: -2,
    cursor: "default",
    position: "relative" as const,
  };

  const hoverRing: React.CSSProperties = {
    ...ring,
    // CSS :hover via className instead
  };

  const etStyle: React.CSSProperties = {
    display: "block",
  };

  if (section.type === "hero") return (
    <div style={ring} onClick={onClick} className="group text-center px-6 py-16 sm:py-24 relative">
      {isSelected && <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full z-10" style={{ background: `${accent}25`, color: accent }}>Editing — click text to change</div>}
      {(s.badge || isSelected) && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-5" style={{ background: `${accent}18`, border: `1px solid ${accent}35`, color: accent }}>
          <ET value={s.badge || ""} onChange={v => up("badge", v)} placeholder="Add badge label…" style={{ color: accent, fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }} />
        </div>
      )}
      <div className="mb-5">
        <ET
          as="h1"
          value={s.headline || ""}
          onChange={v => up("headline", v)}
          placeholder="Click to write your headline…"
          className="text-3xl sm:text-5xl font-black leading-[1.08] text-white"
          style={etStyle}
        />
      </div>
      {(s.subheadline || isSelected) && (
        <ET
          as="p"
          value={s.subheadline || ""}
          onChange={v => up("subheadline", v)}
          placeholder="Add a subheadline…"
          className="text-lg text-zinc-300 leading-relaxed mb-8 max-w-2xl mx-auto"
          style={etStyle}
        />
      )}
      {s.showForm ? (
        <div className="max-w-sm mx-auto space-y-3">
          {(!s.fields || s.fields.includes("name")) && <div className="w-full px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}20` }}>Your name</div>}
          {(!s.fields || s.fields.includes("email")) && <div className="w-full px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}20` }}>Email address</div>}
          <div className="w-full py-3.5 rounded-xl font-black text-sm text-center" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>{s.ctaText || "Get Access"}</div>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-base" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
          <ET value={s.ctaText || ""} onChange={v => up("ctaText", v)} placeholder="Button text…" style={{ color: BG }} />
          <ArrowRight className="w-4 h-4 flex-shrink-0" />
        </div>
      )}
    </div>
  );

  if (section.type === "video") {
    const embed = getEmbedUrl(s.videoUrl || "");
    return (
      <div style={ring} onClick={onClick} className="px-6 py-10 max-w-4xl mx-auto">
        <div className="relative aspect-video rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}20`, background: CARD }}>
          {embed ? <iframe src={embed} className="w-full h-full" title="preview" allow="fullscreen" /> : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${accent}18`, border: `2px solid ${accent}35` }}><Play className="w-6 h-6" style={{ color: accent }} /></div>
              <p className="text-zinc-500 text-sm">Paste a YouTube or Vimeo URL in the panel →</p>
            </div>
          )}
        </div>
        {(s.caption || isSelected) && <ET as="p" value={s.caption || ""} onChange={v => up("caption", v)} placeholder="Add a caption…" className="text-center text-zinc-400 text-sm mt-4 block" />}
      </div>
    );
  }

  if (section.type === "benefits") return (
    <div style={ring} onClick={onClick} className="px-6 py-12 max-w-3xl mx-auto">
      {(s.title || isSelected) && <ET as="p" value={s.title || ""} onChange={v => up("title", v)} placeholder="Section title…" className="text-[11px] font-black uppercase tracking-[0.22em] mb-6 text-center block" style={{ color: `${accent}70` }} />}
      <div className="space-y-3">
        {(s.items || []).map((item: string, i: number) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl group/item" style={{ background: CARD, border: `1px solid ${accent}12` }}>
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}><CheckCircle className="w-3.5 h-3.5" style={{ color: accent }} /></div>
            <ET
              value={item}
              onChange={v => { const arr = [...(s.items || [])]; arr[i] = v; up("items", arr); }}
              placeholder="Describe this benefit…"
              className="text-zinc-200 text-sm leading-relaxed flex-1 block"
            />
            {isSelected && <button onClick={e => { e.stopPropagation(); const arr = [...(s.items || [])]; arr.splice(i, 1); up("items", arr); }} className="opacity-0 group-hover/item:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1"><X className="w-3 h-3" /></button>}
          </div>
        ))}
        {isSelected && <button onClick={e => { e.stopPropagation(); up("items", [...(s.items || []), "New benefit…"]); }} className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ background: "rgba(255,255,255,0.03)", border: `1px dashed ${accent}30`, color: `${accent}70` }}><Plus className="w-3.5 h-3.5" />Add benefit</button>}
      </div>
    </div>
  );

  if (section.type === "testimonials") return (
    <div style={ring} onClick={onClick} className="px-6 py-12 max-w-5xl mx-auto">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-8 text-center" style={{ color: `${accent}70` }}>What People Say</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(s.testimonials || []).map((t: any, i: number) => (
          <div key={i} className="p-5 rounded-2xl flex flex-col gap-3 relative group/t" style={{ background: CARD, border: `1px solid ${accent}15` }}>
            {isSelected && <button onClick={e => { e.stopPropagation(); const arr = [...(s.testimonials || [])]; arr.splice(i, 1); up("testimonials", arr); }} className="absolute top-2 right-2 opacity-0 group-hover/t:opacity-100 text-zinc-600 hover:text-red-400 transition-all"><X className="w-3.5 h-3.5" /></button>}
            <div className="flex gap-1">{[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color: accent }} />)}</div>
            <ET value={t.quote} onChange={v => { const arr = [...(s.testimonials || [])]; arr[i] = { ...arr[i], quote: v }; up("testimonials", arr); }} placeholder="Quote…" className="text-zinc-300 text-sm leading-relaxed flex-1 block" />
            <div>
              <ET value={t.name} onChange={v => { const arr = [...(s.testimonials || [])]; arr[i] = { ...arr[i], name: v }; up("testimonials", arr); }} placeholder="Name" className="text-white font-bold text-sm block" />
              <ET value={t.role} onChange={v => { const arr = [...(s.testimonials || [])]; arr[i] = { ...arr[i], role: v }; up("testimonials", arr); }} placeholder="Role / Company" className="text-zinc-500 text-xs block" />
            </div>
          </div>
        ))}
        {isSelected && <button onClick={e => { e.stopPropagation(); up("testimonials", [...(s.testimonials || []), { name: "New Client", role: "Title", quote: "Great results!" }]); }} className="flex items-center justify-center gap-2 p-5 rounded-2xl text-sm transition-colors" style={{ background: "rgba(255,255,255,0.03)", border: `1px dashed ${accent}30`, color: `${accent}70`, minHeight: 120 }}><Plus className="w-4 h-4" />Add testimonial</button>}
      </div>
    </div>
  );

  if (section.type === "cta") return (
    <div style={ring} onClick={onClick} className="px-6 py-20 text-center max-w-3xl mx-auto">
      <ET as="h2" value={s.headline || ""} onChange={v => up("headline", v)} placeholder="Your CTA headline…" className="text-3xl sm:text-4xl font-black text-white mb-4 block" />
      <ET as="p" value={s.subtext || ""} onChange={v => up("subtext", v)} placeholder="Supporting subtext…" className="text-zinc-400 mb-8 text-lg block" />
      <div className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-black text-base" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
        <ET value={s.ctaText || ""} onChange={v => up("ctaText", v)} placeholder="Button text…" style={{ color: BG }} />
        <ArrowRight className="w-4 h-4 flex-shrink-0" />
      </div>
    </div>
  );

  if (section.type === "form") return (
    <div style={ring} onClick={onClick} className="px-6 py-14 max-w-lg mx-auto">
      <div className="p-8 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}20` }}>
        <ET as="h2" value={s.formTitle || ""} onChange={v => up("formTitle", v)} placeholder="Form headline…" className="text-2xl font-black text-white mb-2 text-center block" />
        <ET as="p" value={s.formSubtext || ""} onChange={v => up("formSubtext", v)} placeholder="Supporting text…" className="text-zinc-400 text-sm text-center mb-6 block" />
        <div className="space-y-3">
          {(!s.fields || s.fields.includes("name")) && <div className="w-full px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}20` }}>Full name</div>}
          {(!s.fields || s.fields.includes("email")) && <div className="w-full px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}20` }}>Email address</div>}
          {s.fields?.includes("phone") && <div className="w-full px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}20` }}>Phone number</div>}
          <div className="w-full py-4 rounded-xl font-black text-base text-center" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
            <ET value={s.buttonText || ""} onChange={v => up("buttonText", v)} placeholder="Button text…" style={{ color: BG, display: "inline" }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (section.type === "countdown") return (
    <div style={ring} onClick={onClick} className="px-6 py-14 text-center max-w-2xl mx-auto">
      <ET as="p" value={s.countdownTitle || ""} onChange={v => up("countdownTitle", v)} placeholder="Label…" className="text-[11px] font-black uppercase tracking-[0.22em] mb-6 block" style={{ color: `${accent}70` }} />
      <div className="p-6 rounded-2xl inline-flex items-center gap-4" style={{ background: CARD, border: `1px solid ${accent}18` }}>
        {[{ v: cd.d, l: "Days" }, { v: cd.h, l: "Hrs" }, { v: cd.m, l: "Min" }, { v: cd.s, l: "Sec" }].map(({ v, l }, i) => (
          <div key={l} className="flex items-center gap-4">
            {i > 0 && <span className="text-2xl font-black opacity-30 -mt-4">:</span>}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-xl text-2xl font-black" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}25`, color: "#fff" }}>{String(v).padStart(2, "0")}</div>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: `${accent}60` }}>{l}</p>
            </div>
          </div>
        ))}
      </div>
      {isSelected && (
        <div className="mt-4">
          <label className="text-xs text-zinc-500 block mb-1">Target date & time</label>
          <input type="datetime-local" value={s.targetDate ? s.targetDate.slice(0, 16) : ""} onChange={e => { e.stopPropagation(); up("targetDate", e.target.value); }} onClick={e => e.stopPropagation()} className="px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${accent}25` }} />
        </div>
      )}
    </div>
  );

  if (section.type === "pricing") return (
    <div style={ring} onClick={onClick} className="px-6 py-16 max-w-md mx-auto text-center">
      <ET as="p" value={s.pricingTitle || ""} onChange={v => up("pricingTitle", v)} placeholder="Section label…" className="text-[11px] font-black uppercase tracking-[0.22em] mb-6 block" style={{ color: `${accent}70` }} />
      <div className="p-8 rounded-2xl" style={{ background: CARD, border: `2px solid ${accent}30`, boxShadow: `0 0 40px ${accent}10` }}>
        <ET as="p" value={s.originalPrice || ""} onChange={v => up("originalPrice", v)} placeholder="Original price…" className="text-zinc-500 line-through text-lg block" />
        <ET as="p" value={s.price || ""} onChange={v => up("price", v)} placeholder="$97" className="text-5xl font-black text-white my-2 block" />
        <p className="text-zinc-400 text-sm mb-6">one-time payment</p>
        <div className="space-y-2 mb-8 text-left">
          {(s.pricingFeatures || []).map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-2 group/pf">
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
              <ET value={f} onChange={v => { const arr = [...(s.pricingFeatures || [])]; arr[i] = v; up("pricingFeatures", arr); }} placeholder="Feature…" className="text-zinc-300 text-sm flex-1" />
              {isSelected && <button onClick={e => { e.stopPropagation(); const arr = [...(s.pricingFeatures || [])]; arr.splice(i, 1); up("pricingFeatures", arr); }} className="opacity-0 group-hover/pf:opacity-100 text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>}
            </div>
          ))}
          {isSelected && <button onClick={e => { e.stopPropagation(); up("pricingFeatures", [...(s.pricingFeatures || []), "New feature"]); }} className="flex items-center gap-2 text-xs w-full mt-2" style={{ color: `${accent}60` }}><Plus className="w-3 h-3" />Add feature</button>}
        </div>
        <div className="w-full py-4 rounded-xl font-black text-base text-center" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
          <ET value={s.ctaText || ""} onChange={v => up("ctaText", v)} placeholder="Button text…" style={{ color: BG, display: "inline" }} />
        </div>
      </div>
    </div>
  );

  if (section.type === "faq") return (
    <div style={ring} onClick={onClick} className="px-6 py-12 max-w-3xl mx-auto">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-8 text-center" style={{ color: `${accent}70` }}>Frequently Asked Questions</p>
      <div className="space-y-2">
        {(s.faqs || []).map((f: any, i: number) => (
          <div key={i} className="rounded-xl overflow-hidden group/faq" style={{ background: CARD, border: `1px solid ${openFaq === i ? accent + "30" : "rgba(255,255,255,0.06)"}` }}>
            <div className="flex items-center px-5 py-4">
              <ET value={f.question} onChange={v => { const arr = [...(s.faqs || [])]; arr[i] = { ...arr[i], question: v }; up("faqs", arr); }} placeholder="Question…" className="text-white font-semibold text-sm flex-1 block" />
              <button onClick={e => { e.stopPropagation(); setOpenFaq(openFaq === i ? null : i); }} className="ml-2 flex-shrink-0"><ChevronDownIcon className="w-4 h-4 transition-transform" style={{ color: accent, transform: openFaq === i ? "rotate(180deg)" : "none" }} /></button>
              {isSelected && <button onClick={e => { e.stopPropagation(); const arr = [...(s.faqs || [])]; arr.splice(i, 1); up("faqs", arr); }} className="ml-2 flex-shrink-0 text-zinc-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>}
            </div>
            {openFaq === i && <div className="px-5 pb-4"><ET as="p" value={f.answer} onChange={v => { const arr = [...(s.faqs || [])]; arr[i] = { ...arr[i], answer: v }; up("faqs", arr); }} placeholder="Answer…" className="text-zinc-400 text-sm leading-relaxed block" /></div>}
          </div>
        ))}
        {isSelected && <button onClick={e => { e.stopPropagation(); up("faqs", [...(s.faqs || []), { question: "New question?", answer: "Answer here." }]); }} className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ background: "rgba(255,255,255,0.03)", border: `1px dashed ${accent}30`, color: `${accent}70` }}><Plus className="w-3.5 h-3.5" />Add question</button>}
      </div>
    </div>
  );

  if (section.type === "bio") return (
    <div style={ring} onClick={onClick} className="px-6 py-12 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-2xl" style={{ background: CARD, border: `1px solid ${accent}18` }}>
        <div className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-2xl font-black" style={{ background: `${accent}18`, border: `2px solid ${accent}35`, color: accent }}>{(s.name || "H").charAt(0).toUpperCase()}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1"><Star className="w-3.5 h-3.5" style={{ color: accent }} /><p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accent}60` }}>Your Host</p></div>
          <ET as="p" value={s.name || ""} onChange={v => up("name", v)} placeholder="Your Name" className="text-white font-black text-xl block" />
          <ET as="p" value={s.role || ""} onChange={v => up("role", v)} placeholder="Founder & Expert" className="text-zinc-400 text-sm mt-0.5 block" />
          <ET as="p" value={s.bio || ""} onChange={v => up("bio", v)} placeholder="Write your bio here…" className="text-zinc-300 text-sm leading-relaxed mt-3 block" />
        </div>
      </div>
    </div>
  );

  if (section.type === "divider") return (
    <div style={ring} onClick={onClick} className="px-6 py-4">
      <div className="h-px" style={{ background: `linear-gradient(to right, transparent, ${accent}30, transparent)` }} />
    </div>
  );

  return null;
}

// ── Drag-Reorderable Section Item ─────────────────────────────────────────────

function SectionItem({ section, accent, isSelected, onClick, onDelete, onMoveUp, onMoveDown, canUp, canDown }: {
  section: Section; accent: string; isSelected: boolean;
  onClick: () => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  canUp: boolean; canDown: boolean;
}) {
  const controls = useDragControls();
  const meta = SECTION_META[section.type];
  const Icon = meta?.icon || Type;

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      className="select-none"
    >
      <div
        className="group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all"
        style={{
          background: isSelected ? `${accent}14` : "transparent",
          border: `1px solid ${isSelected ? accent + "35" : "transparent"}`,
        }}
        onClick={onClick}
      >
        <div
          className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0 touch-none"
          onPointerDown={e => controls.start(e)}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center" style={{ background: isSelected ? `${accent}20` : "rgba(255,255,255,0.06)" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? accent : "#71717a" }} />
        </div>
        <span className="text-xs font-semibold flex-1 truncate" style={{ color: isSelected ? "#fff" : "#a1a1aa" }}>{meta?.label || section.type}</span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-0.5 rounded text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    </Reorder.Item>
  );
}

// ── AI Generate Panel ─────────────────────────────────────────────────────────

function AIPanel({ template, accent, onGenerate, onClose }: {
  template: string; accent: string;
  onGenerate: (sections: Section[], title: string) => void;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/marketing-landing-pages/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: prompt.trim(), template }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Generation failed");
      if (!Array.isArray(data.sections)) throw new Error("Invalid response");
      onGenerate(data.sections, data.pageTitle || "");
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-3 mb-3 rounded-xl overflow-hidden"
      style={{ background: "#0e0e18", border: `1px solid ${accent}30`, boxShadow: `0 8px 40px ${accent}18` }}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: `${accent}20`, background: `${accent}08` }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
          <p className="text-xs font-black" style={{ color: accent }}>AI Generate</p>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-4 space-y-3">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={"Describe your offer...\n\ne.g. \"I'm a fitness coach selling a 12-week transformation program for busy moms who want to lose 20 lbs without giving up their life\""}
          className="w-full rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none resize-none"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}20`, padding: "10px 12px", minHeight: 100, lineHeight: 1.5 }}
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey) generate(); }}
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Writing your page…</>
          ) : (
            <><Sparkles className="w-4 h-4" />Generate Full Page</>
          )}
        </button>
        <p className="text-[10px] text-zinc-600 text-center">⌘ + Enter to generate</p>
      </div>
    </motion.div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { id: "gold", hex: "#d4b461" }, { id: "purple", hex: "#a855f7" }, { id: "blue", hex: "#3b82f6" },
  { id: "green", hex: "#22c55e" }, { id: "red", hex: "#ef4444" }, { id: "orange", hex: "#f97316" },
];

function SettingsPanel({ title, slug, colorScheme, published, accent, saving, onSave, onTitleChange, onSlugChange, onColorChange, onPublishToggle, onCopyLink, copied }: {
  title: string; slug: string; colorScheme: string; published: boolean; accent: string; saving: boolean; copied: boolean;
  onSave: () => void; onTitleChange: (v: string) => void; onSlugChange: (v: string) => void;
  onColorChange: (v: string) => void; onPublishToggle: () => void; onCopyLink: () => void;
}) {
  return (
    <div className="p-4 space-y-5">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Page Title</label>
        <input type="text" value={title} onChange={e => onTitleChange(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Page URL</label>
        <div className="flex items-center gap-1 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <span className="text-zinc-600 text-xs flex-shrink-0">/lp/</span>
          <input type="text" value={slug} onChange={e => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="flex-1 bg-transparent text-sm text-white outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Accent Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map(c => (
            <button key={c.id} onClick={() => onColorChange(c.id)} className="w-7 h-7 rounded-full transition-all" style={{ background: c.hex, transform: colorScheme === c.id ? "scale(1.25)" : "scale(1)", boxShadow: colorScheme === c.id ? `0 0 14px ${c.hex}70` : "none", outline: colorScheme === c.id ? `2px solid ${c.hex}` : "none", outlineOffset: 2 }} />
          ))}
        </div>
      </div>
      <button onClick={onSave} disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: BG }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />Save Settings</>}
      </button>
      <div className="pt-3 border-t" style={{ borderColor: PANEL_BORDER }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white">Publish</p>
          <button onClick={onPublishToggle} className="w-10 h-6 rounded-full transition-colors relative" style={{ background: published ? "#22c55e" : "rgba(255,255,255,0.1)" }}>
            <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: published ? "calc(100% - 20px)" : 4 }} />
          </button>
        </div>
        <p className="text-xs text-zinc-500">{published ? `Live at /lp/${slug}` : "Not visible yet"}</p>
        {published && (
          <button onClick={onCopyLink} className="mt-3 flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            {copied ? <><Check className="w-3.5 h-3.5 text-green-400" />Link Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy Page Link</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── AI Chat Panel ─────────────────────────────────────────────────────────────

function AIChatPanel({ pageId, sections, selectedSectionType, accent, onSectionsUpdate }: {
  pageId: string; sections: Section[]; selectedSectionType: SectionType | null;
  accent: string; onSectionsUpdate: (s: Section[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "ai", text: "I'm your AI page editor. Tell me what you want to change — I'll rewrite the copy, add sections, or restructure the page in seconds.", timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (selectedSectionType) {
      const label = SECTION_META[selectedSectionType]?.label || selectedSectionType;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "ai" && last.text.startsWith("Focused on:")) {
          return [...prev.slice(0, -1), { id: Date.now().toString(), role: "ai", text: `Focused on: **${label}** section. What would you like to change?`, timestamp: Date.now() }];
        }
        return [...prev, { id: Date.now().toString(), role: "ai", text: `Focused on: **${label}** section. What would you like to change?`, timestamp: Date.now() }];
      });
    }
  }, [selectedSectionType]);

  const send = async (msg?: string) => {
    const text = msg || input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const r = await fetch(`/api/marketing-landing-pages/${pageId}/ai-chat`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ message: text, sections, selectedSectionType }),
      });
      const data = await r.json();
      if (data.sections) onSectionsUpdate(data.sections);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: "ai",
        text: data.reply || "Done! Page updated.",
        changes: data.changes || [],
        timestamp: Date.now(),
      }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "ai", text: "Couldn't reach AI. Check your connection.", timestamp: Date.now() }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: PANEL_BORDER }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
        <div>
          <p className="text-xs font-black text-white">AI Editor</p>
          <p className="text-[10px] text-zinc-600">Natural language page editing</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
              style={msg.role === "user"
                ? { background: `${accent}18`, border: `1px solid ${accent}28`, color: "#fff" }
                : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "#d4d4d8" }}
            >
              <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
              {msg.changes && msg.changes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
                  {msg.changes.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-green-400">
                      <Check className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />{c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => send(p)} disabled={loading}
            className="px-2 py-1 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#a1a1aa" }}>
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex gap-2 items-end p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.1)` }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Describe what to change…"
            rows={2}
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-600 resize-none outline-none"
            style={{ lineHeight: "1.5" }}
            disabled={loading}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: accent, color: BG }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-center text-[9px] text-zinc-700 mt-1.5">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}

// ── Main Builder ──────────────────────────────────────────────────────────────

const ADD_TYPES: SectionType[] = ["hero", "video", "benefits", "testimonials", "cta", "form", "countdown", "pricing", "faq", "bio", "divider"];

export default function LandingPageBuilder() {
  const [, params] = useRoute("/landing-pages/:id/edit");
  const id = params?.id ?? "";
  const [, nav] = useLocation();
  const qc = useQueryClient();

  const { data: pageData, isLoading } = useQuery<any>({
    queryKey: [`/api/marketing-landing-pages/${id}`],
    queryFn: async () => {
      const r = await fetch(`/api/marketing-landing-pages/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    enabled: !!id,
  });

  const [sections, setSections] = useState<Section[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [colorScheme, setColorScheme] = useState("gold");
  const [published, setPublished] = useState(false);
  const [template, setTemplate] = useState("vsl");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSectionType, setSelectedSectionType] = useState<SectionType | null>(null);
  const [rightTab, setRightTab] = useState<"ai" | "settings">("ai");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (pageData) {
      setSections(pageData.sections || []);
      setTitle(pageData.title || "");
      setSlug(pageData.slug || "");
      setColorScheme(pageData.color_scheme || "gold");
      setPublished(pageData.published || false);
      setTemplate(pageData.template || "vsl");
    }
  }, [pageData]);

  const accent = ACCENT_MAP[colorScheme] || GOLD;
  const selectedSection = sections.find(s => s.id === selectedId) || null;

  const save = useCallback(async (data: Partial<{ sections: Section[]; title: string; slug: string; color_scheme: string; published: boolean }>) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/marketing-landing-pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (r.ok) {
        const updated = await r.json();
        setPublished(updated.published);
        qc.invalidateQueries({ queryKey: ["/api/marketing-landing-pages"] });
        setSaved(true); setDirty(false);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally { setSaving(false); }
  }, [id, qc]);

  const autoSave = useCallback((next: Section[]) => {
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save({ sections: next }), 1200);
  }, [save]);

  const updateSections = (next: Section[]) => { setSections(next); autoSave(next); };
  const updateSectionField = (secId: string, field: string, value: any) => {
    const next = sections.map(s => s.id === secId ? { ...s, data: { ...s.data, [field]: value } } : s);
    updateSections(next);
  };

  const addSection = (type: SectionType) => {
    const s = defaultSection(type);
    const next = [...sections, s];
    updateSections(next);
    setSelectedId(s.id);
    setShowAddMenu(false);
  };

  const deleteSection = (secId: string) => {
    updateSections(sections.filter(s => s.id !== secId));
    if (selectedId === secId) setSelectedId(null);
  };

  const handleAIGenerate = (newSections: Section[], newTitle: string) => {
    setSections(newSections);
    if (newTitle) setTitle(newTitle);
    autoSave(newSections);
    if (newTitle) save({ title: newTitle, sections: newSections });
  };

  const saveSettings = () => save({ title, slug, color_scheme: colorScheme });
  const togglePublish = () => { save({ published: !published, sections, title, slug, color_scheme: colorScheme }); setPublished(p => !p); };
  const copyLink = () => { navigator.clipboard.writeText(`${window.location.origin}/lp/${slug}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: BG }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>

      {/* ── Left Panel ───────────────────────────────────────────────────── */}
      <div className="w-[220px] flex-shrink-0 flex flex-col" style={{ background: SIDEBAR_BG, borderRight: `1px solid ${PANEL_BORDER}` }}>
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center gap-2.5" style={{ borderColor: PANEL_BORDER }}>
          <button onClick={() => nav("/landing-pages")} className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${GOLD}50` }}>Builder</p>
            <p className="text-xs font-bold text-white truncate">{title || "Untitled"}</p>
          </div>
        </div>

        {/* AI Button */}
        <div className="px-3 pt-3">
          <button onClick={() => setShowAI(s => !s)} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all" style={{ background: showAI ? `${accent}22` : `${accent}12`, border: `1px solid ${showAI ? accent + "50" : accent + "28"}`, color: accent, boxShadow: showAI ? `0 0 20px ${accent}20` : "none" }}>
            <Sparkles className="w-3.5 h-3.5" />Generate with AI
          </button>
        </div>

        {/* AI Panel */}
        <AnimatePresence>
          {showAI && (
            <div className="mt-2">
              <AIPanel template={template} accent={accent} onGenerate={handleAIGenerate} onClose={() => setShowAI(false)} />
            </div>
          )}
        </AnimatePresence>

        {/* Sections List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2">
          <p className="text-[10px] font-black uppercase tracking-wider px-2 py-1.5" style={{ color: "rgba(255,255,255,0.18)" }}>Sections</p>
          <Reorder.Group axis="y" values={sections} onReorder={updateSections} className="space-y-1">
            {sections.map((s, i) => (
              <SectionItem
                key={s.id}
                section={s}
                accent={accent}
                isSelected={selectedId === s.id}
                onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                onDelete={() => deleteSection(s.id)}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                canUp={i > 0}
                canDown={i < sections.length - 1}
              />
            ))}
          </Reorder.Group>

          {/* Add section */}
          <div className="relative mt-2">
            <button onClick={() => setShowAddMenu(s => !s)} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-white/5" style={{ color: GOLD, border: `1px dashed ${GOLD}28` }}>
              <Plus className="w-3.5 h-3.5" />Add Section
            </button>
            <AnimatePresence>
              {showAddMenu && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50" style={{ background: "#0e0e18", border: `1px solid ${PANEL_BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {ADD_TYPES.map(type => {
                      const meta = SECTION_META[type];
                      const Icon = meta.icon;
                      return (
                        <button key={type} onClick={() => addSection(type)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/5">
                          <div className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center" style={{ background: `${GOLD}14` }}><Icon className="w-3.5 h-3.5" style={{ color: GOLD }} /></div>
                          <div><p className="text-xs font-bold text-white">{meta.label}</p><p className="text-[10px] text-zinc-600">{meta.desc}</p></div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-4 py-2.5 border-t flex items-center gap-2 text-xs" style={{ borderColor: PANEL_BORDER }}>
          {saving && <><Loader2 className="w-3 h-3 animate-spin" style={{ color: GOLD }} /><span style={{ color: `${GOLD}70` }}>Saving…</span></>}
          {!saving && saved && <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Saved</span></>}
          {!saving && !saved && dirty && <><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /><span className="text-zinc-500">Unsaved</span></>}
          {!saving && !saved && !dirty && <><div className="w-1.5 h-1.5 rounded-full" style={{ background: published ? "#22c55e" : "#52525b" }} /><span style={{ color: published ? "#22c55e" : "#52525b" }}>{published ? "Live" : "Draft"}</span></>}
        </div>
      </div>

      {/* ── Center: Preview ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: PANEL_BORDER, background: SIDEBAR_BG }}>
          <div className="flex items-center gap-1">
            <button onClick={() => setPreviewMode("desktop")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors" style={{ background: previewMode === "desktop" ? `${accent}16` : "transparent", color: previewMode === "desktop" ? accent : "#71717a" }}>
              <Monitor className="w-3.5 h-3.5" />Desktop
            </button>
            <button onClick={() => setPreviewMode("mobile")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors" style={{ background: previewMode === "mobile" ? `${accent}16` : "transparent", color: previewMode === "mobile" ? accent : "#71717a" }}>
              <Smartphone className="w-3.5 h-3.5" />Mobile
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => save({ sections, title, slug, color_scheme: colorScheme })} disabled={saving} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
              <Save className="w-3.5 h-3.5" />Save
            </button>
            {published && (
              <>
                <button onClick={copyLink} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy Link</>}
                </button>
                <a href={`/lp/${slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />View
                </a>
              </>
            )}
            <button onClick={() => setRightTab("settings")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
              <Settings className="w-3.5 h-3.5" />Settings
            </button>
            <button onClick={togglePublish} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all" style={{ background: published ? "rgba(239,68,68,0.12)" : `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, color: published ? "#f87171" : BG, border: published ? "1px solid rgba(239,68,68,0.28)" : "none" }}>
              <Globe className="w-3.5 h-3.5" />
              {published ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-4 flex justify-center" style={{ background: "#020204" }}>
          <div
            className="w-full transition-all duration-300 rounded-2xl overflow-hidden"
            style={{
              maxWidth: previewMode === "mobile" ? 390 : "100%",
              background: BG,
              border: `1px solid ${PANEL_BORDER}`,
              boxShadow: `0 0 80px rgba(0,0,0,0.6), 0 0 1px ${accent}20`,
              minHeight: 600,
            }}
            onClick={() => { setSelectedId(null); setShowAddMenu(false); }}
          >
            {/* Page glow */}
            <div className="pointer-events-none" style={{ height: 0, overflow: "visible" }}>
              <div style={{ height: 500, marginTop: 0, background: `radial-gradient(ellipse 140% 50% at 50% 0%, ${accent}10 0%, transparent 65%)`, pointerEvents: "none" }} />
            </div>
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 gap-4" style={{ marginTop: -500 }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
                  <Sparkles className="w-8 h-8" style={{ color: GOLD }} />
                </div>
                <p className="text-zinc-500 text-sm text-center max-w-xs">Use <span style={{ color: GOLD }}>Generate with AI</span> to build your page, or add sections from the left panel</p>
              </div>
            ) : (
              <div style={{ marginTop: -500 }}>
                {sections.map(section => (
                  <PreviewSection
                    key={section.id}
                    section={section}
                    accent={accent}
                    isSelected={selectedId === section.id}
                    onClick={() => {
                      const toggled = selectedId === section.id ? null : section.id;
                      setSelectedId(toggled);
                      setSelectedSectionType(toggled ? section.type : null);
                      if (toggled) setRightTab("ai");
                    }}
                    onFieldChange={(field, value) => updateSectionField(section.id, field, value)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Panel: AI Chat + Settings ──────────────────────────────── */}
      <div className="w-[280px] flex-shrink-0 flex flex-col" style={{ background: SIDEBAR_BG, borderLeft: `1px solid ${PANEL_BORDER}` }}>
        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: PANEL_BORDER }}>
          <button onClick={() => setRightTab("ai")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black transition-colors"
            style={{ color: rightTab === "ai" ? accent : "#52525b", borderBottom: rightTab === "ai" ? `2px solid ${accent}` : "2px solid transparent" }}>
            <Sparkles className="w-3 h-3" />AI Chat
          </button>
          <button onClick={() => setRightTab("settings")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black transition-colors"
            style={{ color: rightTab === "settings" ? accent : "#52525b", borderBottom: rightTab === "settings" ? `2px solid ${accent}` : "2px solid transparent" }}>
            <Settings className="w-3 h-3" />Settings
          </button>
        </div>

        {rightTab === "ai" ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <AIChatPanel
              pageId={id}
              sections={sections}
              selectedSectionType={selectedSectionType}
              accent={accent}
              onSectionsUpdate={updateSections}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <SettingsPanel
              title={title} slug={slug} colorScheme={colorScheme} published={published}
              accent={accent} saving={saving} copied={copied}
              onSave={saveSettings} onTitleChange={setTitle} onSlugChange={setSlug}
              onColorChange={c => { setColorScheme(c); }}
              onPublishToggle={togglePublish} onCopyLink={copyLink}
            />
            {/* Section-specific helpers */}
            {selectedSection && selectedSection.type === "hero" && (
              <div className="border-t p-4 space-y-3" style={{ borderColor: PANEL_BORDER }}>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Hero Options</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateSectionField(selectedSection.id, "showForm", !selectedSection.data.showForm)} className="w-9 h-5 rounded-full transition-colors relative flex-shrink-0" style={{ background: selectedSection.data.showForm ? accent : "rgba(255,255,255,0.1)" }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: selectedSection.data.showForm ? "calc(100% - 18px)" : 2 }} />
                  </button>
                  <span className="text-xs text-zinc-400">Inline opt-in form</span>
                </div>
                {selectedSection.data.showForm && (
                  <div className="space-y-1">
                    {["name", "email", "phone"].map(f => (
                      <label key={f} className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer capitalize">
                        <input type="checkbox" checked={(selectedSection.data.fields || ["name", "email"]).includes(f)} onChange={e => {
                          const curr = selectedSection.data.fields || ["name", "email"];
                          updateSectionField(selectedSection.id, "fields", e.target.checked ? [...curr, f] : curr.filter((x: string) => x !== f));
                        }} className="rounded" />
                        {f}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedSection && selectedSection.type === "video" && (
              <div className="border-t p-4 space-y-3" style={{ borderColor: PANEL_BORDER }}>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Video URL</p>
                <input
                  type="text"
                  value={selectedSection.data.videoUrl || ""}
                  onChange={e => updateSectionField(selectedSection.id, "videoUrl", e.target.value)}
                  placeholder="YouTube or Vimeo URL"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            )}
            {selectedSection && selectedSection.type === "form" && (
              <div className="border-t p-4 space-y-3" style={{ borderColor: PANEL_BORDER }}>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Form Fields</p>
                {["name", "email", "phone"].map(f => (
                  <label key={f} className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer capitalize">
                    <input type="checkbox" checked={(selectedSection.data.fields || ["name", "email"]).includes(f)} onChange={e => {
                      const curr = selectedSection.data.fields || ["name", "email"];
                      updateSectionField(selectedSection.id, "fields", e.target.checked ? [...curr, f] : curr.filter((x: string) => x !== f));
                    }} className="rounded" />
                    {f}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
