import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls, motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Loader2, Monitor, Smartphone,
  Sparkles, GripVertical, X, Check, ArrowRight,
  Play, Star, CheckCircle, ChevronDown as ChevronDownIcon,
  Type, Video, List, MessageSquare, Zap, Timer,
  DollarSign, HelpCircle, User, Minus, Image, Send,
  Shield, TrendingUp, CornerDownRight, RefreshCw,
  MousePointer, Layers, ChevronRight,
} from "lucide-react";

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

type SectionType = "hero"|"video"|"benefits"|"testimonials"|"cta"|"form"|"countdown"|"pricing"|"faq"|"bio"|"guarantee"|"order_bump"|"urgency_bar"|"divider"|"stats"|"press"|"comparison"|"two_step_form"|"image"|"social_proof_popup"|"sticky_cta"|"exit_intent";
type Section = { id: string; type: SectionType; data: Record<string,any> };

type ChatMessage = {
  id: string; role: "user"|"ai"; text: string;
  changes?: string[]; timestamp: number;
};

const SECTION_META: Record<SectionType, { label: string; icon: any; color: string }> = {
  hero:        { label: "Hero",         icon: Type,         color: "#d4b461" },
  video:       { label: "Video",        icon: Video,        color: "#3b82f6" },
  benefits:    { label: "Benefits",     icon: List,         color: "#22c55e" },
  testimonials:{ label: "Testimonials", icon: MessageSquare,color: "#a855f7" },
  cta:         { label: "CTA",          icon: Zap,          color: "#f97316" },
  form:        { label: "Opt-in Form",  icon: User,         color: "#06b6d4" },
  countdown:   { label: "Countdown",    icon: Timer,        color: "#ef4444" },
  pricing:     { label: "Pricing",      icon: DollarSign,   color: "#d4b461" },
  faq:         { label: "FAQ",          icon: HelpCircle,   color: "#71717a" },
  bio:         { label: "Bio",          icon: Image,        color: "#a855f7" },
  guarantee:          { label: "Guarantee",         icon: Shield,       color: "#22c55e" },
  order_bump:         { label: "Order Bump",        icon: TrendingUp,   color: "#f97316" },
  urgency_bar:        { label: "Urgency Bar",       icon: TrendingUp,   color: "#ef4444" },
  divider:            { label: "Divider",           icon: Minus,        color: "#27272a" },
  stats:              { label: "Stats / Numbers",   icon: TrendingUp,   color: "#06b6d4" },
  press:              { label: "Press / As Seen In",icon: Star,         color: "#a855f7" },
  comparison:         { label: "Comparison Table",  icon: List,         color: "#3b82f6" },
  two_step_form:      { label: "2-Step Opt-In",     icon: CornerDownRight, color: "#22c55e" },
  image:              { label: "Image / Banner",    icon: Image,        color: "#71717a" },
  social_proof_popup: { label: "Social Proof Popup",icon: MessageSquare,color: "#d4b461" },
  sticky_cta:         { label: "Sticky CTA Bar",    icon: Zap,          color: "#f97316" },
  exit_intent:        { label: "Exit Intent Popup", icon: RefreshCw,    color: "#ef4444" },
};

const QUICK_PROMPTS = [
  { label: "Urgent headline",    prompt: "Rewrite the headline to be more urgent and benefit-driven" },
  { label: "Add testimonials",   prompt: "Add 3 specific, believable testimonials with measurable results" },
  { label: "Add guarantee",      prompt: "Add a strong 30-day money-back guarantee section" },
  { label: "Stronger CTA",       prompt: "Make the call-to-action more compelling and specific" },
  { label: "Add stats",          prompt: "Add a stats section with 4 impressive numbers that build credibility" },
  { label: "Add press logos",    prompt: "Add a press / as-seen-in section with recognizable publication names" },
  { label: "Add comparison",     prompt: "Add a comparison table showing why we beat alternatives on 5 key features" },
  { label: "Add FAQ",            prompt: "Add a FAQ section addressing the top 4 objections" },
  { label: "Add exit popup",     prompt: "Add an exit intent popup to recover abandoning visitors" },
  { label: "Add sticky CTA",     prompt: "Add a sticky CTA bar that stays at the bottom as users scroll" },
  { label: "Add urgency",        prompt: "Add a countdown timer and scarcity urgency bar" },
  { label: "Add pricing",        prompt: "Add a compelling pricing section with full value stack" },
];

function genId() { return Math.random().toString(36).slice(2, 10); }

function defaultSection(type: SectionType): Section {
  const defaults: Record<SectionType, any> = {
    hero:        { headline: "Your Compelling Headline Here", subheadline: "Describe the transformation you deliver.", ctaText: "Get Started Now", badge: "" },
    video:       { videoUrl: "", caption: "Watch this short video to see how it works" },
    benefits:    { title: "What You'll Get", items: ["Benefit one — specific outcome", "Benefit two — specific outcome", "Benefit three — specific outcome"] },
    testimonials:{ testimonials: [{ name: "Happy Client", role: "Entrepreneur", quote: "This completely transformed my results." }] },
    cta:         { headline: "Ready to Get Started?", subtext: "Join hundreds of people already getting results.", ctaText: "Yes, I'm Ready!", ctaUrl: "" },
    form:        { formTitle: "Get Instant Access", formSubtext: "Enter your details for immediate access.", buttonText: "Get Instant Access →", fields: ["name","email"] },
    countdown:   { countdownTitle: "This Offer Expires In", targetDate: new Date(Date.now()+3*86400000).toISOString().slice(0,16) },
    pricing:     { pricingTitle: "Simple, One-Time Investment", price: "$97", originalPrice: "$297", pricingFeatures: ["Full program access","Lifetime updates","Private community","Done-for-you templates","30-day guarantee"], ctaText: "Get Instant Access →" },
    faq:         { faqs: [{ question: "Is this right for me?", answer: "This is perfect if you [target audience] who want [outcome]." },{ question: "What happens after I buy?", answer: "You get immediate access to everything in your private member area." },{ question: "Is there a guarantee?", answer: "Yes — 30-day money-back guarantee, no questions asked." },{ question: "How long until I see results?", answer: "Most members see [specific result] within [timeframe]." }] },
    bio:         { name: "Your Name", role: "Founder & Expert", bio: "Your background and why you're uniquely qualified to help." },
    guarantee:   { title: "30-Day Money-Back Guarantee", body: "If you're not completely satisfied within 30 days, we'll refund every penny. No questions asked.", badgeText: "100% Risk-Free" },
    order_bump:         { title: "⚡ One-Time Add-On: VIP Upgrade", description: "Add this exclusive bonus to your order for maximum results.", price: "$27", ctaText: "Yes, add this to my order!" },
    urgency_bar:        { text: "⏰ Special Offer Ends Soon", subtext: "Price increases when the timer hits zero" },
    divider:            {},
    stats:              { label: "Trusted by thousands", stats: [{ number: "10,000+", desc: "Members" }, { number: "$2.4M", desc: "Revenue Generated" }, { number: "94%", desc: "Success Rate" }, { number: "4.9★", desc: "Average Rating" }] },
    press:              { label: "AS SEEN IN", logos: ["Forbes", "Entrepreneur", "Inc.", "Business Insider", "TechCrunch"] },
    comparison:         { title: "Why Choose Us?", headers: ["Feature", "Us", "Others"], rows: [["Full Training Program", "✅", "❌"], ["Live Support", "✅", "❌"], ["Lifetime Access", "✅", "❌"], ["Money-Back Guarantee", "✅", "❌"]] },
    two_step_form:      { headline: "Get Instant Access — Free", buttonText: "Yes! Send Me Access →", formTitle: "Enter your details below", buttonText2: "Get Instant Access →", fields: ["name", "email"] },
    image:              { src: "", alt: "Banner image", caption: "" },
    social_proof_popup: { name: "John D.", location: "Texas, USA", action: "just signed up", delay: 5, interval: 30, names: ["Sarah M.", "Mike R.", "Emma L.", "David K.", "Lisa P."], locations: ["New York", "California", "Texas", "Florida", "Ohio"] },
    sticky_cta:         { text: "Limited spots available — Join now before the price increases", ctaText: "Get Instant Access →", showAfterScroll: 300 },
    exit_intent:        { headline: "Wait! Don't Miss Out", body: "Before you go — grab our free [resource] that shows you exactly how to [outcome].", ctaText: "Yes, Give Me Access!", dismissText: "No thanks, I don't want this" },
  };
  return { id: genId(), type, data: defaults[type] || {} };
}

// ── Inline Editable ───────────────────────────────────────────────────────────

type ET_Tag = "span"|"p"|"h1"|"h2"|"h3"|"div";
function ET({ value, onChange, as: Tag="span", className, style, placeholder }: {
  value: string; onChange: (v:string)=>void; as?: ET_Tag;
  className?: string; style?: React.CSSProperties; placeholder?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const focused = useRef(false);
  useLayoutEffect(() => { if (ref.current && !focused.current) ref.current.innerText = value||""; }, [value]);
  const El = Tag as any;
  return <El ref={ref} contentEditable suppressContentEditableWarning
    data-placeholder={placeholder||"Click to edit…"}
    onFocus={() => { focused.current = true; }}
    onBlur={(e: React.FocusEvent<HTMLElement>) => { focused.current = false; onChange(e.currentTarget.innerText||""); }}
    onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.currentTarget.blur();} }}
    onClick={(e: React.MouseEvent) => e.stopPropagation()}
    className={className} style={{ outline:"none", cursor:"text", minWidth:20, ...style }} />;
}

// ── Section Previews ──────────────────────────────────────────────────────────

function PreviewSection({ section, accent, isSelected, onClick, onFieldChange, onSelect }: {
  section: Section; accent: string; isSelected: boolean;
  onClick: ()=>void; onFieldChange: (f:string,v:any)=>void;
  onSelect: (type: string)=>void;
}) {
  const s = section.data;
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const up = (k:string,v:any) => onFieldChange(k,v);
  const ring: React.CSSProperties = {
    outline: isSelected ? `2px solid ${accent}70` : "none",
    outlineOffset: -2, position: "relative" as const,
  };

  const handleClick = () => { onClick(); onSelect(section.type); };

  // Urgency Bar
  if (section.type === "urgency_bar") return (
    <div onClick={handleClick} className="px-6 py-3 text-center" style={{ background: `linear-gradient(90deg, ${accent}20, ${accent}10)`, borderTop: `1px solid ${accent}30`, borderBottom: `1px solid ${accent}30`, ...ring }}>
      <ET as="p" value={s.text||""} onChange={v=>up("text",v)} className="font-black text-sm block" style={{ color: accent }} />
      {(s.subtext||isSelected) && <ET as="p" value={s.subtext||""} onChange={v=>up("subtext",v)} className="text-xs text-zinc-400 block mt-0.5" />}
    </div>
  );

  // Guarantee
  if (section.type === "guarantee") return (
    <div style={ring} onClick={handleClick} className="px-6 py-10 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl text-center sm:text-left" style={{ background: CARD, border: `1px solid ${accent}20` }}>
        <div className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `${accent}12`, border: `2px solid ${accent}30` }}>
          <Shield className="w-9 h-9" style={{ color: accent }} />
        </div>
        <div>
          <ET as="p" value={s.badgeText||""} onChange={v=>up("badgeText",v)} className="text-[10px] font-black uppercase tracking-widest mb-1 block" style={{ color: accent }} />
          <ET as="h3" value={s.title||""} onChange={v=>up("title",v)} className="text-white font-black text-xl mb-2 block" />
          <ET as="p" value={s.body||""} onChange={v=>up("body",v)} className="text-zinc-400 text-sm leading-relaxed block" />
        </div>
      </div>
    </div>
  );

  // Order Bump
  if (section.type === "order_bump") return (
    <div style={ring} onClick={handleClick} className="px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4 p-5 rounded-xl" style={{ background: `${accent}08`, border: `2px dashed ${accent}40` }}>
        <div className="w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: `${accent}20`, border: `2px solid ${accent}50` }}>
          <Check className="w-3 h-3" style={{ color: accent }} />
        </div>
        <div className="flex-1">
          <ET as="p" value={s.title||""} onChange={v=>up("title",v)} className="font-black text-white text-sm mb-1 block" />
          <ET as="p" value={s.description||""} onChange={v=>up("description",v)} className="text-zinc-400 text-xs leading-relaxed mb-2 block" />
          <ET as="p" value={s.ctaText||""} onChange={v=>up("ctaText",v)} className="text-xs font-bold block" style={{ color: accent }} />
        </div>
        <div className="text-right flex-shrink-0">
          <ET as="p" value={s.price||""} onChange={v=>up("price",v)} className="font-black text-white text-lg block" />
          <p className="text-zinc-600 text-xs">add-on</p>
        </div>
      </div>
    </div>
  );

  if (section.type === "hero") return (
    <div style={ring} onClick={handleClick} className="text-center px-6 py-16 sm:py-24 relative group/section">
      {isSelected && <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full z-10" style={{ background: `${accent}20`, color: accent }}><MousePointer className="w-2.5 h-2.5" />Click text to edit inline</div>}
      {(s.badge||isSelected) && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-5" style={{ background:`${accent}18`, border:`1px solid ${accent}35`, color:accent }}>
          <ET value={s.badge||""} onChange={v=>up("badge",v)} placeholder="Badge…" style={{ color:accent, fontSize:11, fontWeight:900, textTransform:"uppercase" }} />
        </div>
      )}
      <div className="mb-5">
        <ET as="h1" value={s.headline||""} onChange={v=>up("headline",v)} placeholder="Headline…" className="text-3xl sm:text-5xl font-black leading-[1.08] text-white block" />
      </div>
      {(s.subheadline||isSelected) && <ET as="p" value={s.subheadline||""} onChange={v=>up("subheadline",v)} placeholder="Subheadline…" className="text-lg text-zinc-300 leading-relaxed mb-8 max-w-2xl mx-auto block" />}
      <div className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-base" style={{ background:`linear-gradient(135deg,${accent} 0%,${accent}cc 100%)`, color:BG }}>
        <ET value={s.ctaText||""} onChange={v=>up("ctaText",v)} style={{ color:BG }} />
        <ArrowRight className="w-4 h-4 flex-shrink-0" />
      </div>
    </div>
  );

  if (section.type === "video") {
    const embed = s.videoUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]
      ? `https://www.youtube.com/embed/${s.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)[1]}?rel=0`
      : s.videoUrl;
    return (
      <div style={ring} onClick={handleClick} className="px-6 py-10 max-w-4xl mx-auto">
        <div className="aspect-video rounded-2xl overflow-hidden flex items-center justify-center" style={{ border:`1px solid ${accent}20`, background:CARD }}>
          {embed ? <iframe src={embed} className="w-full h-full" title="preview" allow="fullscreen" /> : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:`${accent}18`, border:`2px solid ${accent}35` }}><Play className="w-6 h-6" style={{ color:accent }} /></div>
              <p className="text-zinc-500 text-sm">Paste YouTube/Vimeo URL in settings</p>
            </div>
          )}
        </div>
        {(s.caption||isSelected) && <ET as="p" value={s.caption||""} onChange={v=>up("caption",v)} placeholder="Caption…" className="text-center text-zinc-400 text-sm mt-4 block" />}
      </div>
    );
  }

  if (section.type === "benefits") return (
    <div style={ring} onClick={handleClick} className="px-6 py-12 max-w-3xl mx-auto">
      {(s.title||isSelected) && <ET as="p" value={s.title||""} onChange={v=>up("title",v)} placeholder="Section title…" className="text-[11px] font-black uppercase tracking-[0.22em] mb-6 text-center block" style={{ color:`${accent}70` }} />}
      <div className="space-y-3">
        {(s.items||[]).map((item:string,i:number)=>(
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl group/item" style={{ background:CARD, border:`1px solid ${accent}12` }}>
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background:`${accent}18` }}><CheckCircle className="w-3.5 h-3.5" style={{ color:accent }} /></div>
            <ET value={item} onChange={v=>{const a=[...(s.items||[])];a[i]=v;up("items",a);}} placeholder="Benefit…" className="text-zinc-200 text-sm leading-relaxed flex-1 block" />
            {isSelected && <button onClick={e=>{e.stopPropagation();const a=[...(s.items||[])];a.splice(i,1);up("items",a);}} className="opacity-0 group-hover/item:opacity-100 text-zinc-600 hover:text-red-400 p-1"><X className="w-3 h-3" /></button>}
          </div>
        ))}
        {isSelected && <button onClick={e=>{e.stopPropagation();up("items",[...(s.items||[]),"New benefit…"]);}} className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm" style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${accent}30`, color:`${accent}70` }}><Plus className="w-3.5 h-3.5" />Add benefit</button>}
      </div>
    </div>
  );

  if (section.type === "testimonials") return (
    <div style={ring} onClick={handleClick} className="px-6 py-12 max-w-5xl mx-auto">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-8 text-center" style={{ color:`${accent}70` }}>What People Say</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(s.testimonials||[]).map((t:any,i:number)=>(
          <div key={i} className="p-5 rounded-2xl flex flex-col gap-3 relative group/t" style={{ background:CARD, border:`1px solid ${accent}15` }}>
            {isSelected && <button onClick={e=>{e.stopPropagation();const a=[...(s.testimonials||[])];a.splice(i,1);up("testimonials",a);}} className="absolute top-2 right-2 opacity-0 group-hover/t:opacity-100 text-zinc-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>}
            <div className="flex gap-1">{[...Array(5)].map((_,j)=><Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color:accent }} />)}</div>
            <ET value={t.quote} onChange={v=>{const a=[...(s.testimonials||[])];a[i]={...a[i],quote:v};up("testimonials",a);}} placeholder="Quote…" className="text-zinc-300 text-sm leading-relaxed flex-1 block" />
            <div>
              <ET value={t.name} onChange={v=>{const a=[...(s.testimonials||[])];a[i]={...a[i],name:v};up("testimonials",a);}} placeholder="Name" className="text-white font-bold text-sm block" />
              <ET value={t.role} onChange={v=>{const a=[...(s.testimonials||[])];a[i]={...a[i],role:v};up("testimonials",a);}} placeholder="Role" className="text-zinc-500 text-xs block" />
            </div>
          </div>
        ))}
        {isSelected && <button onClick={e=>{e.stopPropagation();up("testimonials",[...(s.testimonials||[]),{name:"New Client",role:"Title",quote:"Amazing results!"}]);}} className="flex items-center justify-center gap-2 p-5 rounded-2xl text-sm" style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${accent}30`, color:`${accent}70`, minHeight:120 }}><Plus className="w-4 h-4" />Add</button>}
      </div>
    </div>
  );

  if (section.type === "cta") return (
    <div style={ring} onClick={handleClick} className="px-6 py-20 text-center max-w-3xl mx-auto">
      <ET as="h2" value={s.headline||""} onChange={v=>up("headline",v)} placeholder="CTA headline…" className="text-3xl sm:text-4xl font-black text-white mb-4 block" />
      <ET as="p" value={s.subtext||""} onChange={v=>up("subtext",v)} placeholder="Subtext…" className="text-zinc-400 mb-8 text-lg block" />
      <div className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-black text-base" style={{ background:`linear-gradient(135deg,${accent} 0%,${accent}cc 100%)`, color:BG }}>
        <ET value={s.ctaText||""} onChange={v=>up("ctaText",v)} style={{ color:BG }} />
        <ArrowRight className="w-4 h-4 flex-shrink-0" />
      </div>
    </div>
  );

  if (section.type === "form") return (
    <div style={ring} onClick={handleClick} className="px-6 py-14 max-w-lg mx-auto">
      <div className="p-8 rounded-2xl" style={{ background:CARD, border:`1px solid ${accent}20` }}>
        <ET as="h2" value={s.formTitle||""} onChange={v=>up("formTitle",v)} placeholder="Form title…" className="text-2xl font-black text-white mb-2 text-center block" />
        <ET as="p" value={s.formSubtext||""} onChange={v=>up("formSubtext",v)} placeholder="Subtext…" className="text-zinc-400 text-sm text-center mb-6 block" />
        <div className="space-y-3">
          {(!s.fields||s.fields.includes("name"))&&<div className="px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${accent}20` }}>Full name</div>}
          {(!s.fields||s.fields.includes("email"))&&<div className="px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${accent}20` }}>Email address</div>}
          {s.fields?.includes("phone")&&<div className="px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${accent}20` }}>Phone number</div>}
          <div className="w-full py-4 rounded-xl font-black text-base text-center" style={{ background:`linear-gradient(135deg,${accent} 0%,${accent}cc 100%)`, color:BG }}>
            <ET value={s.buttonText||""} onChange={v=>up("buttonText",v)} style={{ color:BG, display:"inline" }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (section.type === "countdown") return (
    <div style={ring} onClick={handleClick} className="px-6 py-14 text-center max-w-2xl mx-auto">
      <ET as="p" value={s.countdownTitle||""} onChange={v=>up("countdownTitle",v)} className="text-[11px] font-black uppercase tracking-[0.22em] mb-6 block" style={{ color:`${accent}70` }} />
      <div className="p-6 rounded-2xl inline-flex items-center gap-4" style={{ background:CARD, border:`1px solid ${accent}18` }}>
        {["00","00","00","00"].map((v,i)=>(
          <div key={i} className="flex items-center gap-4">
            {i>0&&<span className="text-2xl font-black opacity-30 -mt-4">:</span>}
            <div className="flex flex-col items-center"><div className="w-14 h-14 flex items-center justify-center rounded-xl text-2xl font-black" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${accent}25`, color:"#fff" }}>{v}</div><p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color:`${accent}60` }}>{["Days","Hrs","Min","Sec"][i]}</p></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (section.type === "pricing") return (
    <div style={ring} onClick={handleClick} className="px-6 py-16 max-w-md mx-auto text-center">
      <ET as="p" value={s.pricingTitle||""} onChange={v=>up("pricingTitle",v)} className="text-[11px] font-black uppercase tracking-[0.22em] mb-6 block" style={{ color:`${accent}70` }} />
      <div className="p-8 rounded-2xl" style={{ background:CARD, border:`2px solid ${accent}30`, boxShadow:`0 0 40px ${accent}10` }}>
        <ET as="p" value={s.originalPrice||""} onChange={v=>up("originalPrice",v)} className="text-zinc-500 line-through text-lg block" />
        <ET as="p" value={s.price||""} onChange={v=>up("price",v)} className="text-5xl font-black text-white my-2 block" />
        <p className="text-zinc-400 text-sm mb-6">one-time payment</p>
        <div className="space-y-2 mb-8 text-left">
          {(s.pricingFeatures||[]).map((f:string,i:number)=>(
            <div key={i} className="flex items-center gap-2 group/pf">
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color:accent }} />
              <ET value={f} onChange={v=>{const a=[...(s.pricingFeatures||[])];a[i]=v;up("pricingFeatures",a);}} className="text-zinc-300 text-sm flex-1" />
              {isSelected&&<button onClick={e=>{e.stopPropagation();const a=[...(s.pricingFeatures||[])];a.splice(i,1);up("pricingFeatures",a);}} className="opacity-0 group-hover/pf:opacity-100 text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>}
            </div>
          ))}
          {isSelected&&<button onClick={e=>{e.stopPropagation();up("pricingFeatures",[...(s.pricingFeatures||[]),"New feature"]);}} className="flex items-center gap-2 text-xs w-full mt-2" style={{ color:`${accent}60` }}><Plus className="w-3 h-3" />Add</button>}
        </div>
        <div className="w-full py-4 rounded-xl font-black text-base text-center" style={{ background:`linear-gradient(135deg,${accent} 0%,${accent}cc 100%)`, color:BG }}>
          <ET value={s.ctaText||""} onChange={v=>up("ctaText",v)} style={{ color:BG, display:"inline" }} />
        </div>
      </div>
    </div>
  );

  if (section.type === "faq") return (
    <div style={ring} onClick={handleClick} className="px-6 py-12 max-w-3xl mx-auto">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-8 text-center" style={{ color:`${accent}70` }}>Frequently Asked Questions</p>
      <div className="space-y-2">
        {(s.faqs||[]).map((f:any,i:number)=>(
          <div key={i} className="rounded-xl overflow-hidden" style={{ background:CARD, border:`1px solid ${openFaq===i?accent+"30":"rgba(255,255,255,0.06)"}` }}>
            <div className="flex items-center px-5 py-4">
              <ET value={f.question} onChange={v=>{const a=[...(s.faqs||[])];a[i]={...a[i],question:v};up("faqs",a);}} className="text-white font-semibold text-sm flex-1 block" />
              <button onClick={e=>{e.stopPropagation();setOpenFaq(openFaq===i?null:i);}} className="ml-2 flex-shrink-0"><ChevronDownIcon className="w-4 h-4 transition-transform" style={{ color:accent, transform:openFaq===i?"rotate(180deg)":"none" }} /></button>
              {isSelected&&<button onClick={e=>{e.stopPropagation();const a=[...(s.faqs||[])];a.splice(i,1);up("faqs",a);}} className="ml-2 flex-shrink-0 text-zinc-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>}
            </div>
            {openFaq===i&&<div className="px-5 pb-4"><ET as="p" value={f.answer} onChange={v=>{const a=[...(s.faqs||[])];a[i]={...a[i],answer:v};up("faqs",a);}} className="text-zinc-400 text-sm leading-relaxed block" /></div>}
          </div>
        ))}
        {isSelected&&<button onClick={e=>{e.stopPropagation();up("faqs",[...(s.faqs||[]),{question:"New question?",answer:"Answer here."}]);}} className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm" style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${accent}30`, color:`${accent}70` }}><Plus className="w-3.5 h-3.5" />Add FAQ</button>}
      </div>
    </div>
  );

  if (section.type === "bio") return (
    <div style={ring} onClick={handleClick} className="px-6 py-12 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-2xl" style={{ background:CARD, border:`1px solid ${accent}18` }}>
        <div className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-2xl font-black" style={{ background:`${accent}18`, border:`2px solid ${accent}35`, color:accent }}>{(s.name||"H").charAt(0)}</div>
        <div className="flex-1">
          <ET as="p" value={s.name||""} onChange={v=>up("name",v)} className="text-white font-black text-xl block" />
          <ET as="p" value={s.role||""} onChange={v=>up("role",v)} className="text-zinc-400 text-sm mt-0.5 block" />
          <ET as="p" value={s.bio||""} onChange={v=>up("bio",v)} className="text-zinc-300 text-sm leading-relaxed mt-3 block" />
        </div>
      </div>
    </div>
  );

  if (section.type === "divider") return (
    <div style={ring} onClick={handleClick} className="px-6 py-4"><div className="h-px" style={{ background:`linear-gradient(to right,transparent,${accent}30,transparent)` }} /></div>
  );

  // Stats / Numbers
  if (section.type === "stats") return (
    <div style={ring} onClick={handleClick} className="px-6 py-12">
      {(s.label||isSelected) && <ET as="p" value={s.label||""} onChange={v=>up("label",v)} className="text-[10px] font-black uppercase tracking-[0.22em] text-center mb-8 block" style={{ color:`${accent}70` }} />}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {(s.stats||[]).map((stat:any,i:number)=>(
          <div key={i} className="text-center p-5 rounded-2xl group/stat relative" style={{ background:CARD, border:`1px solid ${accent}15` }}>
            {isSelected && <button onClick={e=>{e.stopPropagation();const a=[...(s.stats||[])];a.splice(i,1);up("stats",a);}} className="absolute top-1.5 right-1.5 opacity-0 group-hover/stat:opacity-100 text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>}
            <ET as="p" value={stat.number} onChange={v=>{const a=[...(s.stats||[])];a[i]={...a[i],number:v};up("stats",a);}} className="text-3xl font-black block" style={{ color:accent }} />
            <ET as="p" value={stat.desc} onChange={v=>{const a=[...(s.stats||[])];a[i]={...a[i],desc:v};up("stats",a);}} className="text-zinc-400 text-xs mt-1 block" />
          </div>
        ))}
        {isSelected && <button onClick={e=>{e.stopPropagation();up("stats",[...(s.stats||[]),{number:"1,000+",desc:"New stat"}]);}} className="flex items-center justify-center p-5 rounded-2xl text-xs" style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${accent}30`, color:`${accent}60`, minHeight:88 }}><Plus className="w-3.5 h-3.5 mr-1" />Add</button>}
      </div>
    </div>
  );

  // Press / As Seen In
  if (section.type === "press") return (
    <div style={ring} onClick={handleClick} className="px-6 py-10">
      {(s.label||isSelected) && <ET as="p" value={s.label||""} onChange={v=>up("label",v)} className="text-[10px] font-black uppercase tracking-[0.22em] text-center mb-6 block" style={{ color:`rgba(255,255,255,0.2)` }} />}
      <div className="flex flex-wrap items-center justify-center gap-6 max-w-4xl mx-auto">
        {(s.logos||[]).map((logo:string,i:number)=>(
          <div key={i} className="group/logo relative flex items-center justify-center px-5 py-3 rounded-xl" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
            {isSelected && <button onClick={e=>{e.stopPropagation();const a=[...(s.logos||[])];a.splice(i,1);up("logos",a);}} className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/logo:opacity-100 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"><X className="w-2.5 h-2.5 text-white" /></button>}
            <ET value={logo} onChange={v=>{const a=[...(s.logos||[])];a[i]=v;up("logos",a);}} className="text-sm font-black" style={{ color:"rgba(255,255,255,0.3)" }} />
          </div>
        ))}
        {isSelected && <button onClick={e=>{e.stopPropagation();up("logos",[...(s.logos||[]),"Publication"]);}} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs" style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${accent}30`, color:`${accent}60` }}><Plus className="w-3 h-3" />Add</button>}
      </div>
    </div>
  );

  // Comparison Table
  if (section.type === "comparison") return (
    <div style={ring} onClick={handleClick} className="px-6 py-12 max-w-3xl mx-auto">
      {(s.title||isSelected) && <ET as="h2" value={s.title||""} onChange={v=>up("title",v)} className="text-2xl font-black text-white text-center mb-8 block" />}
      <div className="rounded-2xl overflow-hidden" style={{ border:`1px solid ${accent}20` }}>
        {/* Header */}
        <div className="grid grid-cols-3" style={{ background:`${accent}12`, borderBottom:`1px solid ${accent}20` }}>
          {(s.headers||["Feature","Us","Others"]).map((h:string,i:number)=>(
            <div key={i} className={`px-4 py-3 text-xs font-black uppercase tracking-wider ${i===1?"text-center":"text-center"}`} style={{ color:i===1?accent:"rgba(255,255,255,0.4)" }}>
              <ET value={h} onChange={v=>{const a=[...(s.headers||[])];a[i]=v;up("headers",a);}} />
            </div>
          ))}
        </div>
        {/* Rows */}
        {(s.rows||[]).map((row:string[],i:number)=>(
          <div key={i} className="grid grid-cols-3 group/row relative" style={{ borderBottom:`1px solid rgba(255,255,255,0.05)`, background:i%2===0?"rgba(255,255,255,0.02)":"transparent" }}>
            {row.map((cell:string,j:number)=>(
              <div key={j} className={`px-4 py-3 text-sm text-center ${j===0?"text-left text-zinc-300":j===1?"text-green-400 font-black":"text-zinc-600"}`}>
                <ET value={cell} onChange={v=>{const rows=[...(s.rows||[])];rows[i]=[...rows[i]];rows[i][j]=v;up("rows",rows);}} className={j===1?"text-green-400 font-black text-base":"text-sm"} />
              </div>
            ))}
            {isSelected && <button onClick={e=>{e.stopPropagation();const rows=[...(s.rows||[])];rows.splice(i,1);up("rows",rows);}} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 text-zinc-600 hover:text-red-400 p-1"><X className="w-3 h-3" /></button>}
          </div>
        ))}
        {isSelected && <button onClick={e=>{e.stopPropagation();up("rows",[...(s.rows||[]),["New feature","✅","❌"]]);}} className="w-full py-2.5 text-xs flex items-center justify-center gap-1.5" style={{ color:`${accent}60` }}><Plus className="w-3 h-3" />Add row</button>}
      </div>
    </div>
  );

  // 2-Step Opt-In
  if (section.type === "two_step_form") {
    const [step2Open, setStep2Open] = useState(false);
    return (
      <div style={ring} onClick={handleClick} className="px-6 py-16 max-w-xl mx-auto text-center">
        <ET as="h2" value={s.headline||""} onChange={v=>up("headline",v)} className="text-2xl sm:text-3xl font-black text-white mb-6 block" />
        {!step2Open ? (
          <button onClick={e=>{e.stopPropagation();setStep2Open(true);}}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-base"
            style={{ background:`linear-gradient(135deg,${accent},${accent}cc)`, color:BG }}>
            <ET value={s.buttonText||""} onChange={v=>up("buttonText",v)} style={{ color:BG }} />
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </button>
        ) : (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="p-6 rounded-2xl text-left" style={{ background:CARD, border:`1px solid ${accent}25` }}>
            <ET as="p" value={s.formTitle||""} onChange={v=>up("formTitle",v)} className="text-lg font-black text-white mb-4 text-center block" />
            <div className="space-y-3">
              {(!s.fields||s.fields.includes("name"))&&<div className="px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${accent}20` }}>Full name</div>}
              <div className="px-4 py-3 rounded-xl text-sm text-zinc-500" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${accent}20` }}>Email address</div>
              <div className="w-full py-4 rounded-xl font-black text-base text-center" style={{ background:`linear-gradient(135deg,${accent},${accent}cc)`, color:BG }}>
                <ET value={s.buttonText2||""} onChange={v=>up("buttonText2",v)} style={{ color:BG, display:"inline" }} />
              </div>
            </div>
          </motion.div>
        )}
        {isSelected && <p className="text-[10px] text-zinc-600 mt-3">Click button above to preview step 2</p>}
      </div>
    );
  }

  // Image / Banner
  if (section.type === "image") return (
    <div style={ring} onClick={handleClick} className="px-6 py-6 max-w-4xl mx-auto">
      {s.src ? (
        <img src={s.src} alt={s.alt||""} className="w-full rounded-2xl object-cover" style={{ maxHeight:480 }} />
      ) : (
        <div className="w-full rounded-2xl flex flex-col items-center justify-center gap-3" style={{ height:200, background:CARD, border:`1px dashed ${accent}30` }}>
          <Image className="w-8 h-8" style={{ color:`${accent}40` }} />
          <p className="text-zinc-600 text-sm">Enter image URL in AI chat</p>
        </div>
      )}
      {isSelected && (
        <input value={s.src||""} onChange={e=>up("src",e.target.value)} placeholder="https://... image URL"
          className="w-full mt-2 px-3 py-2 rounded-lg text-xs text-white outline-none"
          style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${accent}20` }}
          onClick={e=>e.stopPropagation()} />
      )}
      {(s.caption||isSelected) && <ET as="p" value={s.caption||""} onChange={v=>up("caption",v)} placeholder="Caption…" className="text-center text-zinc-500 text-xs mt-3 block" />}
    </div>
  );

  // Social Proof Popup (overlay preview)
  if (section.type === "social_proof_popup") return (
    <div style={ring} onClick={handleClick} className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-start gap-3 p-4 rounded-xl max-w-xs" style={{ background:"#1a1a2e", border:"1px solid rgba(255,255,255,0.12)", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm" style={{ background:`${accent}20`, color:accent }}>
          {(s.names?.[0]||"J").charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-xs">{s.names?.[0]||"Sarah M."} from {s.locations?.[0]||"New York"}</p>
          <ET as="p" value={s.action||""} onChange={v=>up("action",v)} className="text-zinc-400 text-[11px] block" />
          <p className="text-zinc-600 text-[10px] mt-0.5">Just now</p>
        </div>
        <X className="w-3 h-3 text-zinc-600 flex-shrink-0" />
      </div>
      <p className="text-zinc-600 text-xs mt-3">
        ↑ Popup appears bottom-left every {s.interval||30}s after {s.delay||5}s delay
        {isSelected && " · Edit names/locations via AI chat"}
      </p>
    </div>
  );

  // Sticky CTA (overlay preview)
  if (section.type === "sticky_cta") return (
    <div style={ring} onClick={handleClick} className="px-6 py-6">
      <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-xl" style={{ background:`linear-gradient(90deg,${accent}18,${accent}10)`, border:`1px solid ${accent}30` }}>
        <ET as="p" value={s.text||""} onChange={v=>up("text",v)} className="text-zinc-300 text-sm font-semibold flex-1 block" />
        <div className="flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-xs whitespace-nowrap" style={{ background:`linear-gradient(135deg,${accent},${accent}cc)`, color:BG }}>
          <ET value={s.ctaText||""} onChange={v=>up("ctaText",v)} style={{ color:BG }} />
        </div>
      </div>
      <p className="text-zinc-600 text-[10px] mt-2">↑ Appears fixed at bottom after {s.showAfterScroll||300}px scroll</p>
    </div>
  );

  // Exit Intent Popup (overlay preview)
  if (section.type === "exit_intent") return (
    <div style={ring} onClick={handleClick} className="px-6 py-8 max-w-3xl mx-auto">
      <div className="max-w-sm mx-auto p-6 rounded-2xl text-center" style={{ background:"#0f0f1a", border:`1px solid ${accent}25`, boxShadow:`0 0 40px ${accent}10` }}>
        <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background:`${accent}18`, border:`1px solid ${accent}30` }}>
          <Sparkles className="w-5 h-5" style={{ color:accent }} />
        </div>
        <ET as="h3" value={s.headline||""} onChange={v=>up("headline",v)} className="text-xl font-black text-white mb-2 block" />
        <ET as="p" value={s.body||""} onChange={v=>up("body",v)} className="text-zinc-400 text-sm leading-relaxed mb-5 block" />
        <div className="px-6 py-3 rounded-xl font-black text-sm mb-2" style={{ background:`linear-gradient(135deg,${accent},${accent}cc)`, color:BG }}>
          <ET value={s.ctaText||""} onChange={v=>up("ctaText",v)} style={{ color:BG, display:"inline" }} />
        </div>
        <ET as="p" value={s.dismissText||""} onChange={v=>up("dismissText",v)} className="text-zinc-600 text-xs block mt-2" />
      </div>
      <p className="text-zinc-600 text-[10px] text-center mt-3">↑ Triggers when visitor moves mouse toward browser close button</p>
    </div>
  );

  return null;
}

// ── Section List Item ─────────────────────────────────────────────────────────

function SectionItem({ section, accent, isSelected, onClick, onDelete }: {
  section: Section; accent: string; isSelected: boolean;
  onClick: ()=>void; onDelete: ()=>void;
}) {
  const controls = useDragControls();
  const meta = SECTION_META[section.type];
  const Icon = meta?.icon || Type;
  return (
    <Reorder.Item value={section} dragListener={false} dragControls={controls} className="select-none">
      <div className="group flex items-center gap-2 px-2 py-2.5 rounded-xl cursor-pointer transition-all"
        style={{ background: isSelected ? `${meta?.color||accent}14` : "transparent", border:`1px solid ${isSelected?(meta?.color||accent)+"35":"transparent"}` }}
        onClick={onClick}>
        <div className="cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 flex-shrink-0 touch-none" onPointerDown={e=>controls.start(e)}><GripVertical className="w-3.5 h-3.5" /></div>
        <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: isSelected ? `${meta?.color||accent}20` : "rgba(255,255,255,0.06)" }}><Icon className="w-3.5 h-3.5" style={{ color: isSelected ? meta?.color||accent : "#52525b" }} /></div>
        <span className="text-xs font-bold flex-1 truncate" style={{ color: isSelected ? "#fff" : "#71717a" }}>{meta?.label||section.type}</span>
        <button onClick={e=>{e.stopPropagation();onDelete();}} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all p-0.5"><Trash2 className="w-3 h-3" /></button>
      </div>
    </Reorder.Item>
  );
}

// ── AI Chat Panel ─────────────────────────────────────────────────────────────

function AIChatPanel({ funnelId, stepId, sections, selectedSectionType, accent, onSectionsUpdate }: {
  funnelId: string; stepId: string; sections: Section[];
  selectedSectionType: string | null; accent: string;
  onSectionsUpdate: (sections: Section[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      text: "I'm your AI editor. Tell me what to change — click any element in the preview to focus it, then describe what you want.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When selected section changes, show context hint
  useEffect(() => {
    if (selectedSectionType) {
      const meta = SECTION_META[selectedSectionType as SectionType];
      if (meta) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "ai" && last.text.startsWith("Focused on:")) return prev;
          return [...prev, {
            id: genId(), role: "ai",
            text: `Focused on: **${meta.label}** section. What would you like to change?`,
            timestamp: Date.now(),
          }];
        });
      }
    }
  }, [selectedSectionType]);

  const send = async (msg?: string) => {
    const text = (msg || input).trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMessage = { id: genId(), role: "user", text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const r = await fetch(`/api/funnels/${funnelId}/steps/${stepId}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, sections, selectedSectionType }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Failed");
      onSectionsUpdate(data.sections);
      setMessages(prev => [...prev, {
        id: genId(), role: "ai",
        text: data.reply || "Done!",
        changes: data.changes || [],
        timestamp: Date.now(),
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: genId(), role: "ai",
        text: `Error: ${e.message}`,
        timestamp: Date.now(),
      }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2.5" style={{ borderColor: PANEL_BORDER }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
        <div>
          <p className="text-xs font-black text-white">AI Editor</p>
          <p className="text-[10px] text-zinc-600">Describe any change</p>
        </div>
        {selectedSectionType && (
          <div className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}25` }}>
            {SECTION_META[selectedSectionType as SectionType]?.label || selectedSectionType}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && (
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                <Sparkles className="w-3 h-3" style={{ color: accent }} />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
              style={{
                background: msg.role === "user" ? `${accent}18` : "rgba(255,255,255,0.05)",
                border: `1px solid ${msg.role === "user" ? accent + "30" : "rgba(255,255,255,0.08)"}`,
                color: msg.role === "user" ? "#fff" : "#d4d4d8",
              }}>
              {msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}
              {msg.changes && msg.changes.length > 0 && (
                <div className="mt-2 space-y-1 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  {msg.changes.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-zinc-400 text-[10px]">{c}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
              <Sparkles className="w-3 h-3" style={{ color: accent }} />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex gap-1 items-center h-4">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: accent, animationDelay: `${i*0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-1">
          {QUICK_PROMPTS.slice(0, 4).map(q => (
            <button key={q.label} onClick={() => send(q.prompt)}
              disabled={loading}
              className="text-[10px] px-2 py-1 rounded-lg font-bold transition-colors disabled:opacity-40 hover:bg-white/8"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}>
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex gap-2 items-end rounded-xl p-2" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${input ? accent + "40" : "rgba(255,255,255,0.1)"}`, transition: "border-color 0.2s" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Make the headline more urgent…"
            disabled={loading}
            rows={1}
            className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 outline-none resize-none leading-relaxed"
            style={{ maxHeight: 80, overflow: "auto" }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: input.trim() ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : "rgba(255,255,255,0.06)" }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: accent }} /> : <Send className="w-3.5 h-3.5" style={{ color: input.trim() ? BG : "#52525b" }} />}
          </button>
        </div>
        <p className="text-[10px] text-zinc-700 text-center mt-1.5">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}

// ── Add Section Menu ──────────────────────────────────────────────────────────

const ADD_SECTION_GROUPS = [
  { group: "Layout",      types: ["hero","image","divider"] as SectionType[] },
  { group: "Content",     types: ["benefits","bio","video","stats","comparison"] as SectionType[] },
  { group: "Proof",       types: ["testimonials","press","faq"] as SectionType[] },
  { group: "Convert",     types: ["cta","form","two_step_form","pricing"] as SectionType[] },
  { group: "Urgency",     types: ["countdown","urgency_bar"] as SectionType[] },
  { group: "Sales Tools", types: ["guarantee","order_bump"] as SectionType[] },
  { group: "Overlays",    types: ["social_proof_popup","sticky_cta","exit_intent"] as SectionType[] },
];

// ── Color Options ─────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { id:"gold",hex:"#d4b461" },{ id:"purple",hex:"#a855f7" },{ id:"blue",hex:"#3b82f6" },
  { id:"green",hex:"#22c55e" },{ id:"red",hex:"#ef4444" },{ id:"orange",hex:"#f97316" },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FunnelStepBuilder() {
  const [matchFunnel, funnelParams] = useRoute("/funnels/:funnelId/steps/:stepId/edit");
  const [matchPage, pageParams]     = useRoute("/pages/:funnelId/step/:stepId");
  const params   = matchFunnel ? funnelParams : pageParams;
  const funnelId = params?.funnelId ?? "";
  const stepId   = params?.stepId ?? "";
  const backUrl  = matchPage ? "/pages" : `/funnels/${funnelId}/edit`;
  const [,nav] = useLocation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/funnels/${funnelId}`],
    queryFn: async () => { const r = await fetch(`/api/funnels/${funnelId}`,{credentials:"include"}); return r.json(); },
    enabled: !!funnelId,
  });

  const step = data?.steps?.find((s:any) => s.id === stepId);

  const [sections, setSections] = useState<Section[]>([]);
  const [colorScheme, setColorScheme] = useState("gold");
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [selectedSectionType, setSelectedSectionType] = useState<string|null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop"|"mobile">("desktop");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (step) {
      setSections(Array.isArray(step.sections) ? step.sections : []);
      setColorScheme(step.color_scheme || "gold");
    }
  }, [step]);

  const accent = ACCENT_MAP[colorScheme] || GOLD;

  const save = useCallback(async (secs?: Section[], cs?: string) => {
    setSaving(true);
    try {
      await fetch(`/api/funnels/${funnelId}/steps/${stepId}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"}, credentials:"include",
        body: JSON.stringify({ sections: secs ?? sections, color_scheme: cs ?? colorScheme }),
      });
      setSaved(true); setDirty(false);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: [`/api/funnels/${funnelId}`] });
    } finally { setSaving(false); }
  }, [funnelId, stepId, sections, colorScheme, qc]);

  const autoSave = useCallback((next: Section[]) => {
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(next), 1500);
  }, [save]);

  const updateSections = (next: Section[]) => { setSections(next); autoSave(next); };
  const updateField = (secId: string, field: string, value: any) => {
    const next = sections.map(s => s.id === secId ? { ...s, data: { ...s.data, [field]: value } } : s);
    updateSections(next);
  };
  const addSection = (type: SectionType) => {
    const s = defaultSection(type);
    const next = [...sections, s];
    updateSections(next);
    setSelectedId(s.id); setSelectedSectionType(s.type);
    setShowAddMenu(false);
  };
  const deleteSection = (secId: string) => {
    updateSections(sections.filter(s => s.id !== secId));
    if (selectedId === secId) { setSelectedId(null); setSelectedSectionType(null); }
  };

  const handleAIUpdate = (newSections: Section[]) => {
    setSections(newSections);
    autoSave(newSections);
  };

  if (isLoading || !step) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background:BG }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color:GOLD }} />
    </div>
  );

  const meta = step ? (SECTION_META[step.type as SectionType] || null) : null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:BG }}>

      {/* ── Left: Section List ───────────────────────────────────────── */}
      <div className="w-[200px] flex-shrink-0 flex flex-col" style={{ background:SIDEBAR_BG, borderRight:`1px solid ${PANEL_BORDER}` }}>
        {/* Back + title */}
        <div className="px-3 py-3 border-b flex items-center gap-2" style={{ borderColor:PANEL_BORDER }}>
          <button onClick={() => nav(backUrl)} className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider truncate" style={{ color:`${GOLD}50` }}>{data?.name}</p>
            <p className="text-xs font-black text-white truncate">{step.name}</p>
          </div>
        </div>

        {/* Color scheme */}
        <div className="px-3 pt-3 pb-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Accent</p>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_OPTIONS.map(c=>(
              <button key={c.id} onClick={() => { setColorScheme(c.id); save(sections, c.id); }}
                className="w-5 h-5 rounded-full transition-all"
                style={{ background:c.hex, transform:colorScheme===c.id?"scale(1.3)":"scale(1)", boxShadow:colorScheme===c.id?`0 0 8px ${c.hex}60`:"none", outline:colorScheme===c.id?`2px solid ${c.hex}`:"none", outlineOffset:2 }} />
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <p className="text-[10px] font-black uppercase tracking-wider px-2 py-2" style={{ color:"rgba(255,255,255,0.15)" }}>Sections</p>
          <Reorder.Group axis="y" values={sections} onReorder={updateSections} className="space-y-0.5">
            {sections.map(s => (
              <SectionItem key={s.id} section={s} accent={accent}
                isSelected={selectedId === s.id}
                onClick={() => { setSelectedId(selectedId===s.id?null:s.id); setSelectedSectionType(selectedId===s.id?null:s.type); }}
                onDelete={() => deleteSection(s.id)} />
            ))}
          </Reorder.Group>

          {/* Add section */}
          <div className="relative mt-1">
            <button onClick={() => setShowAddMenu(v => !v)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold mt-1 transition-colors hover:bg-white/5"
              style={{ color:GOLD, border:`1px dashed ${GOLD}28` }}>
              <Plus className="w-3.5 h-3.5" />Add Section
            </button>
            <AnimatePresence>
              {showAddMenu && (
                <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                  className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                  style={{ background:"#0e0e18", border:`1px solid ${PANEL_BORDER}`, boxShadow:"0 20px 60px rgba(0,0,0,0.8)" }}>
                  <div className="max-h-72 overflow-y-auto p-1.5 space-y-2">
                    {ADD_SECTION_GROUPS.map(group => (
                      <div key={group.group}>
                        <p className="text-[9px] font-black uppercase tracking-wider px-2 py-1 text-zinc-600">{group.group}</p>
                        {group.types.map(type => {
                          const m = SECTION_META[type];
                          const Icon = m.icon;
                          return (
                            <button key={type} onClick={() => addSection(type)}
                              className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-left transition-colors hover:bg-white/5">
                              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background:`${m.color}14` }}><Icon className="w-3 h-3" style={{ color:m.color }} /></div>
                              <p className="text-xs font-bold text-zinc-300">{m.label}</p>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status */}
        <div className="px-3 py-2.5 border-t flex items-center gap-2 text-xs" style={{ borderColor:PANEL_BORDER }}>
          {saving&&<><Loader2 className="w-3 h-3 animate-spin" style={{ color:GOLD }} /><span style={{ color:`${GOLD}70` }}>Saving…</span></>}
          {!saving&&saved&&<><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Saved</span></>}
          {!saving&&!saved&&dirty&&<><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /><span className="text-zinc-500">Unsaved</span></>}
          {!saving&&!saved&&!dirty&&<><div className="w-1.5 h-1.5 rounded-full bg-zinc-700" /><span className="text-zinc-600">Auto-save on</span></>}
        </div>
      </div>

      {/* ── Center: Preview ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor:PANEL_BORDER, background:SIDEBAR_BG }}>
          <div className="flex items-center gap-1">
            <button onClick={() => setPreviewMode("desktop")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors" style={{ background:previewMode==="desktop"?`${accent}16`:"transparent", color:previewMode==="desktop"?accent:"#52525b" }}>
              <Monitor className="w-3.5 h-3.5" />Desktop
            </button>
            <button onClick={() => setPreviewMode("mobile")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors" style={{ background:previewMode==="mobile"?`${accent}16`:"transparent", color:previewMode==="mobile"?accent:"#52525b" }}>
              <Smartphone className="w-3.5 h-3.5" />Mobile
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <MousePointer className="w-3 h-3" />Click any text to edit inline · Chat to AI for anything else
          </div>
          <button onClick={() => save()} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all"
            style={{ background:`linear-gradient(135deg,${accent},${accent}cc)`, color:BG }}>
            {saving?<Loader2 className="w-3.5 h-3.5 animate-spin" />:<>Save</>}
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-4 flex justify-center" style={{ background:"#020204" }}
          onClick={() => { setSelectedId(null); setSelectedSectionType(null); setShowAddMenu(false); }}>
          <div className="w-full transition-all duration-300 rounded-2xl overflow-hidden"
            style={{ maxWidth:previewMode==="mobile"?390:"100%", background:BG, border:`1px solid ${PANEL_BORDER}`, boxShadow:`0 0 80px rgba(0,0,0,0.6), inset 0 0 0 1px ${accent}08`, minHeight:600 }}>
            {/* Glow */}
            <div style={{ height:0, overflow:"visible", pointerEvents:"none" }}>
              <div style={{ height:500, background:`radial-gradient(ellipse 140% 50% at 50% 0%,${accent}10 0%,transparent 65%)`, pointerEvents:"none" }} />
            </div>
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 gap-4" style={{ marginTop:-500 }}>
                <Layers className="w-10 h-10" style={{ color:`${GOLD}25` }} />
                <p className="text-zinc-600 text-sm text-center max-w-xs">Add sections from the left, or tell the AI what you need in the chat →</p>
              </div>
            ) : (
              <div style={{ marginTop:-500 }}>
                {sections.map(section => (
                  <PreviewSection
                    key={section.id} section={section} accent={accent}
                    isSelected={selectedId === section.id}
                    onClick={() => { setSelectedId(selectedId===section.id?null:section.id); }}
                    onFieldChange={(field,value) => updateField(section.id,field,value)}
                    onSelect={(type) => setSelectedSectionType(type)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: AI Chat ────────────────────────────────────────────── */}
      <div className="w-[300px] flex-shrink-0 flex flex-col" style={{ background:SIDEBAR_BG, borderLeft:`1px solid ${PANEL_BORDER}` }}>
        <AIChatPanel
          funnelId={funnelId}
          stepId={stepId}
          sections={sections}
          selectedSectionType={selectedSectionType}
          accent={accent}
          onSectionsUpdate={handleAIUpdate}
        />
      </div>
    </div>
  );
}
