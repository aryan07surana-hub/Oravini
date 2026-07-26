import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus, LayoutTemplate, Loader2, Trash2, Eye, Edit3,
  Users, DollarSign, Zap, ChevronRight, Globe, X,
  Sparkles, ArrowRight, Check, BarChart2,
  Play, Layers,
} from "lucide-react";


const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";

// ── Constants ─────────────────────────────────────────────────────────────────

const FUNNEL_TEMPLATES = [
  { id: "vsl",       name: "VSL Funnel",         desc: "Video sales letter → upsell → downsell → confirmation",       steps: ["Sales Page","OTO Upsell","Downsell","Confirmation"],              color: "#d4b461", icon: "🎬" },
  { id: "launch",    name: "Product Launch",     desc: "Opt-in → sales → upsell → downsell → thank you",             steps: ["Opt-in","Sales","Upsell","Downsell","Thank You"],                 color: "#a855f7", icon: "🚀" },
  { id: "webinar",   name: "Webinar Funnel",     desc: "Registration → thank you → replay/sales",                     steps: ["Registration","Thank You","Replay"],                              color: "#3b82f6", icon: "📡" },
  { id: "lead",      name: "Lead Magnet",        desc: "Opt-in → thank you / delivery page",                         steps: ["Opt-in","Thank You"],                                             color: "#22c55e", icon: "🧲" },
  { id: "tripwire",  name: "Tripwire Funnel",    desc: "Lead magnet → tripwire → upsell → downsell → confirm",        steps: ["Landing","Tripwire","Upsell","Downsell","Confirm"],               color: "#f97316", icon: "⚡" },
  { id: "coaching",  name: "Coaching Funnel",    desc: "Application page → video → booking → confirmation",           steps: ["Application","Strategy Video","Book a Call","Confirmation"],      color: "#d4b461", icon: "🎯" },
  { id: "challenge", name: "Challenge Funnel",   desc: "Opt-in → Day 1–5 content pages → sales → thank you",         steps: ["Opt-in","Day 1","Day 3","Day 5 Sales","Thank You"],               color: "#ef4444", icon: "🔥" },
  { id: "saas",      name: "SaaS Funnel",        desc: "Free trial → onboarding → upgrade → retention",               steps: ["Free Trial","Onboarding","Upgrade Offer","Success Page"],         color: "#06b6d4", icon: "💻" },
  { id: "book",      name: "Book Funnel",        desc: "Free + shipping → OTO → downsell → confirmation",             steps: ["Book Offer","OTO","Downsell","Confirmation"],                     color: "#8b5cf6", icon: "📚" },
  { id: "highticket",name: "High-Ticket Funnel", desc: "Application → VSL + testimonials → call booking → thank you", steps: ["Application","Video & Proof","Book Discovery Call","Thank You"], color: "#22c55e", icon: "💎" },
];

// ── AI Build Modal ─────────────────────────────────────────────────────────────

const AI_PROGRESS_STEPS = [
  { label: "Analyzing your offer…",     duration: 2200 },
  { label: "Crafting your hook & angle…", duration: 2000 },
  { label: "Writing page copy…",        duration: 3500 },
  { label: "Building upsell flow…",     duration: 3000 },
  { label: "Wiring routing logic…",     duration: 1800 },
  { label: "Finalizing your funnel…",   duration: 1500 },
];

function AIBuildModal({ onClose, onDone }: {
  onClose: () => void;
  onDone: (funnelId: string) => void;
}) {
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("vsl");
  const [building, setBuilding] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [error, setError] = useState("");
  const progressTimer = useRef<ReturnType<typeof setTimeout>>();
  const tmpl = FUNNEL_TEMPLATES.find(t => t.id === template)!;

  const advanceProgress = (idx: number) => {
    if (idx >= AI_PROGRESS_STEPS.length - 1) return;
    progressTimer.current = setTimeout(() => {
      setProgressIdx(idx + 1);
      advanceProgress(idx + 1);
    }, AI_PROGRESS_STEPS[idx].duration);
  };

  const build = async () => {
    if (!description.trim()) return;
    setBuilding(true);
    setError("");
    setProgressIdx(0);
    advanceProgress(0);

    try {
      const r = await fetch("/api/funnels/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: description.trim(), template }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Generation failed");
      clearTimeout(progressTimer.current);
      setProgressIdx(AI_PROGRESS_STEPS.length - 1);
      setTimeout(() => onDone(data.funnel.id), 600);
    } catch (e: any) {
      clearTimeout(progressTimer.current);
      setError(e.message);
      setBuilding(false);
      setProgressIdx(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.90)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: CARD, border: `1px solid ${GOLD}25`, boxShadow: `0 0 80px ${GOLD}18` }}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: `${GOLD}08` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35` }}>
              <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-white font-black text-base">Build Funnel with AI</p>
              <p className="text-zinc-500 text-xs">Describe your offer — AI writes every page</p>
            </div>
          </div>
          {!building && <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-400 transition-colors"><X className="w-5 h-5" /></button>}
        </div>

        {building ? (
          /* ── Progress State ──────────────────────────────────────────── */
          <div className="px-8 py-12 flex flex-col items-center gap-8">
            {/* Spinning rings */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full animate-spin" style={{ border: `3px solid ${GOLD}20`, borderTopColor: GOLD }} />
              <div className="absolute inset-2 rounded-full animate-spin" style={{ border: `2px solid ${GOLD}12`, borderBottomColor: `${GOLD}80`, animationDirection: "reverse", animationDuration: "1.5s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-7 h-7" style={{ color: GOLD }} />
              </div>
            </div>

            {/* Steps */}
            <div className="w-full space-y-2 max-w-sm">
              {AI_PROGRESS_STEPS.map((step, i) => (
                <motion.div
                  key={step.label}
                  animate={{ opacity: i <= progressIdx ? 1 : 0.25 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: i < progressIdx ? "#22c55e18" : i === progressIdx ? `${GOLD}18` : "rgba(255,255,255,0.04)", border: `1px solid ${i < progressIdx ? "#22c55e40" : i === progressIdx ? GOLD + "40" : "rgba(255,255,255,0.08)"}` }}>
                    {i < progressIdx
                      ? <Check className="w-2.5 h-2.5 text-green-400" />
                      : i === progressIdx
                        ? <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GOLD }} />
                        : null}
                  </div>
                  <p className="text-sm" style={{ color: i < progressIdx ? "#22c55e" : i === progressIdx ? "#fff" : "#3f3f46" }}>{step.label}</p>
                </motion.div>
              ))}
            </div>

            <p className="text-zinc-600 text-xs text-center">Writing every headline, bullet, and CTA for your entire funnel…</p>
          </div>
        ) : (
          /* ── Input State ─────────────────────────────────────────────── */
          <div className="p-6 space-y-6">
            {/* Offer description */}
            <div>
              <label className="block text-sm font-black text-white mb-2">Describe your offer</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={"e.g. \"I'm a fitness coach selling a $997 12-week transformation program for busy moms who want to lose 20 lbs without giving up their lifestyle. I have testimonials and a VSL.\"\n\nBe specific — the more detail, the better the copy."}
                className="w-full rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none resize-none leading-relaxed"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.1)`, padding: "14px 16px", minHeight: 140 }}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) build(); }}
                autoFocus
              />
            </div>

            {/* Template picker */}
            <div>
              <label className="block text-sm font-black text-white mb-3">Funnel type</label>
              <div className="grid grid-cols-5 gap-2">
                {FUNNEL_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all"
                    style={{
                      background: template === t.id ? `${t.color}14` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${template === t.id ? t.color + "40" : "rgba(255,255,255,0.07)"}`,
                      transform: template === t.id ? "scale(1.03)" : "scale(1)",
                    }}
                  >
                    <span className="text-lg">{t.icon}</span>
                    <p className="text-[9px] font-black leading-tight" style={{ color: template === t.id ? t.color : "#71717a" }}>{t.name}</p>
                  </button>
                ))}
              </div>
              {/* Step preview */}
              <div className="flex items-center gap-1 mt-3 flex-wrap">
                {FUNNEL_TEMPLATES.find(t => t.id === template)!.steps.map((s, i, arr) => (
                  <div key={s} className="flex items-center gap-1">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${tmpl.color}14`, color: tmpl.color }}>{s}</span>
                    {i < arr.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-zinc-700" />}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            <button
              onClick={build}
              disabled={!description.trim()}
              className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-3 transition-all disabled:opacity-30 hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: BG, boxShadow: `0 8px 30px ${GOLD}30` }}
            >
              <Sparkles className="w-5 h-5" />
              Build My Entire Funnel
              <span className="text-xs font-bold opacity-60 ml-1">⌘ + Enter</span>
            </button>

            <p className="text-center text-xs text-zinc-600">AI writes every headline, bullet point, testimonial, FAQ, and CTA across all {FUNNEL_TEMPLATES.find(t => t.id === template)!.steps.length} pages</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Template Picker Modal ─────────────────────────────────────────────────────

function ManualModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (template: string, name: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState("vsl");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const tmpl = FUNNEL_TEMPLATES.find(t => t.id === selected)!;

  const submit = async () => {
    setCreating(true);
    await onCreate(selected, name || tmpl.name);
    setCreating(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.90)", backdropFilter: "blur(14px)" }}>
      <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-5xl rounded-2xl flex flex-col"
        style={{ background: "#07070e", border: `1px solid ${GOLD}22`, boxShadow: `0 0 100px ${GOLD}10`, maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: `${GOLD}06` }}>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: `${GOLD}60` }}>New Funnel</p>
            <h2 className="text-xl font-black text-white mt-0.5">Choose a Funnel Template</h2>
            <p className="text-zinc-500 text-sm mt-0.5">{FUNNEL_TEMPLATES.length} templates — pick one and customize the copy yourself</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-500 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.04)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template grid — all visible */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {FUNNEL_TEMPLATES.map(t => {
              const active = selected === t.id;
              return (
                <button key={t.id} onClick={() => setSelected(t.id)}
                  className="text-left p-5 rounded-2xl transition-all"
                  style={{
                    background: active ? `${t.color}12` : "rgba(255,255,255,0.03)",
                    border: `2px solid ${active ? t.color + "55" : "rgba(255,255,255,0.07)"}`,
                    boxShadow: active ? `0 0 28px ${t.color}18` : "none",
                  }}>
                  {/* Card header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${t.color}18`, border: `1px solid ${t.color}35` }}>
                      {t.icon}
                    </div>
                    <div>
                      <p className="text-base font-black text-white leading-tight">{t.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: `${t.color}80` }}>{t.steps.length} pages in this funnel</p>
                    </div>
                    {active && (
                      <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.color }}>
                        <Check className="w-3 h-3" style={{ color: BG }} />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-zinc-400 text-xs leading-relaxed mb-3">{t.desc}</p>

                  {/* Step flow */}
                  <div className="flex flex-wrap items-center gap-1">
                    {t.steps.map((s, i, arr) => (
                      <div key={s} className="flex items-center gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: `${t.color}18`, color: t.color }}>{s}</span>
                        {i < arr.length - 1 && <span className="text-zinc-700 text-[10px]">→</span>}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center gap-3 px-7 py-5 border-t" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.25)" }}>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder={`Name this funnel… (default: ${tmpl.name})`}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            onKeyDown={e => { if (e.key === "Enter") submit(); }} />
          <button onClick={onClose} className="px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white transition-colors flex-shrink-0">Cancel</button>
          <button onClick={submit} disabled={creating}
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${tmpl.color} 0%, ${tmpl.color}cc 100%)`, color: BG, boxShadow: `0 4px 20px ${tmpl.color}35` }}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" />Create {tmpl.name}</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Funnels Page ─────────────────────────────────────────────────────────

export default function Funnels() {
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const [showAI, setShowAI] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: funnels = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/funnels"],
    queryFn: async () => {
      const r = await fetch("/api/funnels", { credentials: "include" });
      return r.json();
    },
  });

  const create = async (template: string, name: string) => {
    const r = await fetch("/api/funnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, template }),
    });
    const data = await r.json();
    qc.invalidateQueries({ queryKey: ["/api/funnels"] });
    setShowManual(false);
    nav(`/funnels/${data.id}/edit`);
  };

  const deleteFunnel = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/funnels/${id}`, { method: "DELETE", credentials: "include" });
    qc.invalidateQueries({ queryKey: ["/api/funnels"] });
    setDeleting(null);
  };

  const handleAIDone = (funnelId: string) => {
    qc.invalidateQueries({ queryKey: ["/api/funnels"] });
    setShowAI(false);
    nav(`/funnels/${funnelId}/edit`);
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Hero gradient */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-80" style={{ background: `radial-gradient(ellipse 80% 40% at 50% 0%, ${GOLD}08 0%, transparent 70%)` }} />

      <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Funnels</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Complete sales funnels with upsells, downsells & smart routing</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowManual(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <LayoutTemplate className="w-4 h-4" />From Template
            </button>
            <button onClick={() => setShowAI(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: BG, boxShadow: `0 4px 20px ${GOLD}30` }}>
              <Sparkles className="w-4 h-4" />Build with AI
            </button>
          </div>
        </div>

        {/* Stats */}
        {funnels.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Funnels", value: funnels.length, icon: Layers, color: GOLD },
              { label: "Total Visits",  value: funnels.reduce((a: number, f: any) => a + (f.visits || 0), 0).toLocaleString(), icon: Eye, color: "#3b82f6" },
              { label: "Total Leads",   value: funnels.reduce((a: number, f: any) => a + (f.leads || 0), 0).toLocaleString(), icon: Users, color: "#22c55e" },
              { label: "Revenue",       value: `$${funnels.reduce((a: number, f: any) => a + Number(f.revenue || 0), 0).toFixed(0)}`, icon: DollarSign, color: "#a855f7" },
            ].map(stat => (
              <div key={stat.label} className="p-4 rounded-xl" style={{ background: CARD, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-2"><stat.icon className="w-4 h-4" style={{ color: stat.color }} /><p className="text-xs text-zinc-500">{stat.label}</p></div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>
        ) : funnels.length === 0 ? (
          /* ── Empty: big AI CTA ─────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-16 gap-8">
            {/* Hero card */}
            <div className="w-full max-w-xl p-8 rounded-2xl text-center" style={{ background: `linear-gradient(135deg, ${GOLD}10 0%, transparent 60%)`, border: `1px solid ${GOLD}25` }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35` }}>
                <Sparkles className="w-8 h-8" style={{ color: GOLD }} />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Build your first funnel with AI</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Describe your offer in plain English. AI generates every page — headlines, bullets, testimonials, pricing, FAQs, CTAs — across your entire funnel. Ready to publish in seconds.
              </p>
              <button onClick={() => setShowAI(true)}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-black text-base transition-all hover:scale-105 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: BG, boxShadow: `0 8px 40px ${GOLD}30` }}>
                <Sparkles className="w-5 h-5" />Build with AI
              </button>
            </div>

            {/* Template options */}
            <div className="w-full max-w-3xl">
              <div className="flex items-center gap-3 text-zinc-600 text-sm mb-5">
                <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                or start from one of {FUNNEL_TEMPLATES.length} templates
                <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
              </div>
              <div className="grid grid-cols-5 gap-3">
                {FUNNEL_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setShowManual(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 hover:border-opacity-40"
                    style={{ background: CARD, border: `1px solid ${t.color}25` }}>
                    <span className="text-2xl">{t.icon}</span>
                    <p className="text-[10px] font-bold text-center leading-tight" style={{ color: `${t.color}90` }}>{t.name}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowManual(true)}
                className="w-full mt-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                Browse all {FUNNEL_TEMPLATES.length} templates →
              </button>
            </div>
          </div>
        ) : (
          /* ── Funnels Grid ─────────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {funnels.map((funnel: any) => (
              <motion.div key={funnel.id} layout
                className="rounded-2xl overflow-hidden group"
                style={{ background: CARD, border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block ${funnel.status === "active" ? "text-green-400 bg-green-400/10" : "text-zinc-500 bg-white/5"}`}>
                        {funnel.status === "active" ? "● Live" : "○ Draft"}
                      </span>
                      <p className="text-white font-black text-base truncate">{funnel.name}</p>
                      <p className="text-zinc-600 text-xs mt-0.5">/f/{funnel.slug}</p>
                    </div>
                    <button onClick={() => deleteFunnel(funnel.id)} disabled={deleting === funnel.id}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-zinc-600 hover:text-red-400 transition-all p-1">
                      {deleting === funnel.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Step pills */}
                  <div className="flex flex-wrap items-center gap-1">
                    {Array(Math.max(funnel.step_count || 0, 1)).fill(null).map((_: any, i: number) => (
                      <div key={i} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-zinc-700" />}
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                      </div>
                    ))}
                    <span className="text-xs text-zinc-600 ml-1">{funnel.step_count || 0} steps</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 divide-x" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {[
                    { label: "Visits",  value: (funnel.visits || 0).toLocaleString() },
                    { label: "Leads",   value: (funnel.leads || 0).toLocaleString() },
                    { label: "Revenue", value: `$${Number(funnel.revenue || 0).toFixed(0)}` },
                  ].map(s => (
                    <div key={s.label} className="px-4 py-3 text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <p className="text-white font-black text-sm">{s.value}</p>
                      <p className="text-zinc-600 text-[10px]">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 p-4">
                  <button onClick={() => nav(`/funnels/${funnel.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-[1.02]"
                    style={{ background: `${GOLD}14`, color: GOLD, border: `1px solid ${GOLD}28` }}>
                    <Edit3 className="w-3.5 h-3.5" />Edit Funnel
                  </button>
                  {funnel.status === "active" && (
                    <a href={`/f/${funnel.slug}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Globe className="w-3.5 h-3.5" />View
                    </a>
                  )}
                </div>
              </motion.div>
            ))}

            {/* New funnel card */}
            <button onClick={() => setShowAI(true)}
              className="h-56 rounded-2xl border-dashed flex flex-col items-center justify-center gap-3 transition-all hover:border-opacity-60 hover:scale-[1.01]"
              style={{ border: `2px dashed ${GOLD}28` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
                <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-black" style={{ color: `${GOLD}80` }}>Build with AI</p>
                <p className="text-xs text-zinc-700 mt-0.5">one sentence → full funnel</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAI    && <AIBuildModal    onClose={() => setShowAI(false)}    onDone={handleAIDone} />}
        {showManual && <ManualModal    onClose={() => setShowManual(false)} onCreate={create} />}
      </AnimatePresence>
    </div>
  );
}
