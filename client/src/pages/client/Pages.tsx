import React, { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Eye, Users, DollarSign, Edit3, Loader2, Trash2, X,
  Check, ArrowRight, FileText, GitBranch, Sparkles, ExternalLink,
  BarChart2, Zap, Wand2, Play, Star, List, MessageSquare, Timer,
  HelpCircle, Shield, TrendingUp, User, Type, Video, Copy, Globe,
  Mail, Phone, Download, Rocket, QrCode,
} from "lucide-react";
import { PAGE_TEMPLATES, type PageTemplate } from "@/lib/pageTemplates";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";
const SIDEBAR_BG = "#06060b";
const PANEL_BORDER = "rgba(255,255,255,0.07)";

const ACCENT_MAP: Record<string, string> = {
  gold: "#d4b461", purple: "#a855f7", blue: "#3b82f6",
  green: "#22c55e", red: "#ef4444", orange: "#f97316", cyan: "#06b6d4",
};

type Tab = "funnels" | "pages" | "templates" | "leads";

// ── Section wireframe registry ────────────────────────────────────────────────

const SECTION_WIRE: Record<string, { color: string }> = {
  hero:         { color: "#d4b461" },
  video:        { color: "#3b82f6" },
  benefits:     { color: "#22c55e" },
  testimonials: { color: "#a855f7" },
  cta:          { color: "#f97316" },
  form:         { color: "#06b6d4" },
  countdown:    { color: "#ef4444" },
  pricing:      { color: "#d4b461" },
  faq:          { color: "#71717a" },
  bio:          { color: "#a855f7" },
  guarantee:    { color: "#22c55e" },
  order_bump:   { color: "#f97316" },
  urgency_bar:  { color: "#ef4444" },
  stats:        { color: "#06b6d4" },
  press:        { color: "#a855f7" },
  comparison:   { color: "#3b82f6" },
  two_step_form:{ color: "#22c55e" },
  social_proof_popup: { color: "#d4b461" },
  sticky_cta:   { color: "#f97316" },
  exit_intent:  { color: "#ef4444" },
  image:        { color: "#71717a" },
  divider:      { color: "#27272a" },
};

const SECTION_HEIGHTS: Record<string, number> = {
  hero: 32, video: 24, benefits: 20, testimonials: 20, cta: 12,
  form: 24, countdown: 12, pricing: 24, faq: 20, bio: 20,
  guarantee: 14, order_bump: 14, urgency_bar: 8, stats: 14,
  press: 10, comparison: 20, two_step_form: 24, social_proof_popup: 8,
  sticky_cta: 8, exit_intent: 10, image: 16, divider: 4,
};

const WIRE_RENDERS: Record<string, (color: string) => React.ReactNode> = {
  hero: (c) => (
    <div className="flex flex-col gap-0.5 px-1.5 pt-1 pb-0.5">
      <div className="h-1.5 rounded-full w-3/4" style={{ background: `${c}70` }} />
      <div className="h-1 rounded-full w-1/2" style={{ background: `${c}35` }} />
      <div className="mt-0.5 w-12 h-3 rounded-md" style={{ background: `${c}50` }} />
    </div>
  ),
  form: (c) => (
    <div className="flex flex-col gap-0.5 px-1.5 pt-0.5">
      <div className="h-1.5 rounded w-full" style={{ background: `${c}20`, border: `1px solid ${c}40` }} />
      <div className="h-1.5 rounded w-full" style={{ background: `${c}20`, border: `1px solid ${c}40` }} />
      <div className="h-2.5 rounded w-2/3 mt-0.5" style={{ background: `${c}55` }} />
    </div>
  ),
  benefits: (c) => (
    <div className="flex flex-col gap-0.5 px-1.5 pt-0.5">
      {[0.75, 0.9, 0.65].map((w, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: `${c}70` }} />
          <div className="h-0.5 rounded-full flex-1" style={{ background: `${c}35`, width: `${w * 100}%` }} />
        </div>
      ))}
    </div>
  ),
  testimonials: (c) => (
    <div className="flex gap-0.5 px-1.5 pt-0.5 items-start">
      {[1, 0.8].map((_, i) => (
        <div key={i} className="flex-1 rounded p-0.5" style={{ background: `${c}12`, border: `1px solid ${c}25` }}>
          <div className="h-0.5 rounded-full mb-0.5" style={{ background: `${c}40`, width: "80%" }} />
          <div className="h-0.5 rounded-full" style={{ background: `${c}25`, width: "60%" }} />
        </div>
      ))}
    </div>
  ),
  pricing: (c) => (
    <div className="flex gap-0.5 px-1.5 pt-0.5">
      {[1, 1.2, 0.8].map((scale, i) => (
        <div key={i} className="flex-1 rounded flex flex-col items-center py-0.5"
          style={{ background: i === 1 ? `${c}22` : `${c}0a`, border: `1px solid ${c}${i === 1 ? "45" : "18"}`, transform: `scaleY(${scale})`, transformOrigin: "bottom" }}>
          <div className="h-1.5 w-1.5 rounded-full mb-0.5" style={{ background: `${c}${i === 1 ? "80" : "40"}` }} />
          <div className="h-0.5 rounded-full w-3/4" style={{ background: `${c}30` }} />
        </div>
      ))}
    </div>
  ),
  stats: (c) => (
    <div className="flex gap-0.5 px-1.5 pt-0.5">
      {[1, 0.7, 0.9, 0.6].map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="h-2 w-full rounded-sm" style={{ background: `${c}${h > 0.8 ? "60" : "30"}` }} />
          <div className="h-0.5 rounded-full w-2/3" style={{ background: `${c}25` }} />
        </div>
      ))}
    </div>
  ),
  cta: (c) => (
    <div className="flex flex-col items-center gap-0.5 px-1.5 pt-0.5">
      <div className="h-1 rounded-full w-2/3" style={{ background: `${c}50` }} />
      <div className="h-2.5 rounded-md w-1/2" style={{ background: `${c}70` }} />
    </div>
  ),
};

function WireframePreview({ sections }: { sections: Array<{ type: string }> }) {
  return (
    <div className="flex flex-col gap-0.5 w-full h-full overflow-hidden">
      {sections.slice(0, 7).map((s, i) => {
        const color = SECTION_WIRE[s.type]?.color || "#27272a";
        const h = Math.min(SECTION_HEIGHTS[s.type] || 12, 30);
        const CustomRender = WIRE_RENDERS[s.type];
        return (
          <div key={i} className="w-full rounded-sm overflow-hidden flex-shrink-0 flex items-center"
            style={{ height: h, background: `${color}0c`, borderLeft: `2px solid ${color}45` }}>
            {CustomRender ? CustomRender(color) : (
              <div className="flex-1 px-1.5"><div className="w-3/4 h-1 rounded-full" style={{ background: `${color}30` }} /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onUse }: { tpl: PageTemplate; onUse: (t: PageTemplate) => void }) {
  const accent = ACCENT_MAP[tpl.accent] || GOLD;
  const allSections = tpl.steps.flatMap(s => s.sections);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="rounded-2xl overflow-hidden cursor-pointer group flex flex-col"
      style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}
      onClick={() => onUse(tpl)}>

      {/* Preview */}
      <div className="h-[120px] relative overflow-hidden flex"
        style={{ background: `linear-gradient(160deg, ${accent}10 0%, transparent 60%)` }}>
        <div className="w-10 flex-shrink-0 flex flex-col items-center pt-3 gap-2"
          style={{ background: `${accent}08`, borderRight: `1px solid ${accent}15` }}>
          <div className="text-xl">{tpl.emoji}</div>
        </div>
        <div className="flex-1 p-2 overflow-hidden">
          <WireframePreview sections={allSections} />
        </div>
        {tpl.stepCount > 1 && (
          <div className="absolute top-2 right-2">
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black"
              style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}35` }}>
              {tpl.stepCount} steps
            </span>
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        <p className="text-[11px] font-black text-white leading-tight mb-1">{tpl.name}</p>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${accent}14`, color: accent }}>
            {tpl.subcategory}
          </span>
          <span className="text-[9px] text-zinc-700">{tpl.sectionCount} sections</span>
        </div>
        <p className="text-[10px] text-zinc-600 leading-relaxed flex-1 mb-3 line-clamp-2">{tpl.description}</p>
        <button className="w-full py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all group-hover:gap-2.5"
          style={{ background: `${accent}14`, border: `1px solid ${accent}28`, color: accent }}>
          Use Template <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ── AI Generate Card ──────────────────────────────────────────────────────────

function AIGenerateCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="rounded-2xl overflow-hidden cursor-pointer group flex flex-col"
      style={{ background: "linear-gradient(135deg, #0c0a1a, #0a0c18)", border: "1px solid rgba(168,85,247,0.3)" }}
      onClick={onClick}>
      <div className="h-[120px] relative overflow-hidden flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, rgba(168,85,247,0.1) 0%, rgba(59,130,246,0.04) 100%)" }}>
        <div className="absolute inset-0"
          style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(168,85,247,0.025) 8px, rgba(168,85,247,0.025) 9px)" }} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(168,85,247,0.1) 0%, transparent 70%)" }} />
        <div className="relative text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.35), rgba(59,130,246,0.2))", border: "1px solid rgba(168,85,247,0.45)" }}>
            <Wand2 className="w-5 h-5 animate-pulse" style={{ color: "#a855f7" }} />
          </div>
          <p className="text-[10px] text-zinc-500 font-bold">AI-powered</p>
        </div>
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3" style={{ color: "#a855f7" }} />
          <p className="text-[11px] font-black text-white">Generate with AI</p>
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full ml-auto"
            style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7" }}>NEW</span>
        </div>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7" }}>Any niche</span>
          <span className="text-[9px] text-zinc-700">Real copy</span>
        </div>
        <p className="text-[10px] text-zinc-600 leading-relaxed flex-1 mb-3">
          Describe your goal — AI writes all headlines, copy, and sections in seconds.
        </p>
        <button className="w-full py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all group-hover:gap-2.5"
          style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(59,130,246,0.15))", border: "1px solid rgba(168,85,247,0.45)", color: "#a855f7" }}>
          Generate <Wand2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ── AI Generate Modal ─────────────────────────────────────────────────────────

const GOALS = [
  { id: "leads",     label: "Collect Leads",  icon: User },
  { id: "sales",     label: "Sell Product",   icon: DollarSign },
  { id: "webinar",   label: "Webinar",        icon: Video },
  { id: "event",     label: "Event",          icon: Timer },
  { id: "booking",   label: "Book a Call",    icon: Star },
  { id: "community", label: "Community",      icon: MessageSquare },
];

const EXAMPLE_PROMPTS = [
  "Online fitness coaching for busy moms who want to lose weight",
  "SaaS tool that helps agencies manage client social media",
  "High-ticket consulting for B2B founders scaling to $1M",
  "Digital course teaching copywriting for e-commerce brands",
  "Local real estate agent targeting first-time buyers",
];

const COLOR_OPTIONS = [
  { id: "gold",   hex: "#d4b461" }, { id: "purple", hex: "#a855f7" },
  { id: "blue",   hex: "#3b82f6" }, { id: "green",  hex: "#22c55e" },
  { id: "red",    hex: "#ef4444" }, { id: "orange", hex: "#f97316" },
];

function AIGenerateModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (funnelId: string, stepId: string, isPage: boolean) => void;
}) {
  const [step, setStep]         = useState<"config" | "generating" | "done">("config");
  const [pageType, setPageType] = useState<"page" | "funnel">("page");
  const [goal, setGoal]         = useState("leads");
  const [description, setDesc]  = useState("");
  const [accent, setAccent]     = useState("purple");
  const [progress, setProgress] = useState(0);
  const [genName, setGenName]   = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/pages/ai-generate", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, pageType, goal, accent }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Generation failed"); }
      return r.json();
    },
    onSuccess: (data) => {
      clearInterval(timerRef.current);
      setProgress(100);
      setGenName(data.funnel?.name || "Your page");
      setStep("done");
      setTimeout(() => onCreated(data.funnel.id, data.stepId, data.isPage ?? pageType === "page"), 1200);
    },
    onError: () => { clearInterval(timerRef.current); setStep("config"); },
  });

  const generate = () => {
    if (!description.trim()) return;
    setStep("generating");
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress(p => { if (p >= 88) { clearInterval(timerRef.current); return 88; } return p + Math.random() * 10; });
    }, 450);
    mut.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[520px] rounded-2xl overflow-hidden"
        style={{ background: "#07070f", border: "1px solid rgba(168,85,247,0.35)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: PANEL_BORDER }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.35), rgba(59,130,246,0.2))", border: "1px solid rgba(168,85,247,0.45)" }}>
            <Wand2 className="w-4 h-4" style={{ color: "#a855f7" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">AI Page Generator</p>
            <p className="text-[10px] text-zinc-600">Describe your business — AI writes everything</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Config */}
        {step === "config" && (
          <div className="p-6 space-y-5">
            {/* Type */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">What to build</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "page",   label: "Landing Page", desc: "Single focused page",  icon: FileText },
                  { id: "funnel", label: "Sales Funnel",  desc: "Multi-step journey",  icon: GitBranch },
                ].map(t => (
                  <button key={t.id} onClick={() => setPageType(t.id as any)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: pageType === t.id ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${pageType === t.id ? "rgba(168,85,247,0.4)" : PANEL_BORDER}`,
                    }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <t.icon className="w-3.5 h-3.5" style={{ color: pageType === t.id ? "#a855f7" : "#52525b" }} />
                      <p className="text-xs font-black" style={{ color: pageType === t.id ? "white" : "#71717a" }}>{t.label}</p>
                    </div>
                    <p className="text-[9px] text-zinc-700 pl-5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Goal</p>
              <div className="flex flex-wrap gap-1.5">
                {GOALS.map(g => (
                  <button key={g.id} onClick={() => setGoal(g.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                    style={{
                      background: goal === g.id ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${goal === g.id ? "rgba(168,85,247,0.4)" : PANEL_BORDER}`,
                      color: goal === g.id ? "#a855f7" : "#52525b",
                    }}>
                    <g.icon className="w-3 h-3" />{g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Describe your business</p>
              <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
                placeholder="e.g. Online fitness coaching for busy moms who want to lose weight without going to the gym"
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none transition-colors resize-none"
                style={{ borderColor: description ? "rgba(168,85,247,0.4)" : PANEL_BORDER, background: "rgba(255,255,255,0.03)" }} />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => (
                  <button key={i} onClick={() => setDesc(p)}
                    className="text-[9px] text-zinc-700 hover:text-zinc-400 px-2 py-0.5 rounded-md transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}` }}>
                    {p.length > 40 ? p.slice(0, 40) + "…" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Color theme</p>
              <div className="flex gap-2.5">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => setAccent(c.id)}
                    className="w-6 h-6 rounded-full transition-all"
                    style={{ background: c.hex, transform: accent === c.id ? "scale(1.35)" : "scale(1)", boxShadow: accent === c.id ? `0 0 10px ${c.hex}60` : "none", outline: accent === c.id ? `2px solid ${c.hex}` : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </div>

            {mut.isError && <p className="text-xs text-red-400">{(mut.error as Error).message}</p>}

            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}` }}>Cancel</button>
              <button onClick={generate} disabled={!description.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "white" }}>
                <Wand2 className="w-3.5 h-3.5" />Generate Page
              </button>
            </div>
          </div>
        )}

        {/* Generating */}
        {step === "generating" && (
          <div className="p-10 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.1))", border: "1px solid rgba(168,85,247,0.3)" }}>
                <Wand2 className="w-8 h-8 animate-pulse" style={{ color: "#a855f7" }} />
              </div>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full" style={{ background: "#a855f7" }} />
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: "#6366f1" }} />
              </motion.div>
            </div>
            <div className="text-center">
              <p className="text-base font-black text-white mb-1">AI is building your page</p>
              <p className="text-xs text-zinc-600">Writing headlines, copy, and sections…</p>
            </div>
            <div className="w-full">
              <div className="flex justify-between mb-1.5">
                {["Analyzing niche", "Writing copy", "Building sections", "Optimizing CTAs"].map((s, i) => (
                  <p key={i} className="text-[9px] font-bold transition-colors"
                    style={{ color: progress > i * 26 ? "#a855f7" : "#3f3f46" }}>{s}</p>
                ))}
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div animate={{ width: `${Math.min(progress, 98)}%` }} transition={{ duration: 0.45, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #a855f7, #6366f1, #3b82f6)" }} />
              </div>
            </div>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="p-10 flex flex-col items-center gap-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }}>
              <Check className="w-9 h-9" style={{ color: "#22c55e" }} />
            </motion.div>
            <p className="text-base font-black text-white text-center">"{genName}" is ready!</p>
            <p className="text-xs text-zinc-600">Opening builder…</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Create-from-Template Modal ────────────────────────────────────────────────

function CreateModal({ template, onClose, onCreated }: {
  template: PageTemplate;
  onClose: () => void;
  onCreated: (funnelId: string, stepId: string, isPage: boolean) => void;
}) {
  const [name, setName] = useState(template.name);
  const accent = ACCENT_MAP[template.accent] || GOLD;
  const allSections = template.steps.flatMap(s => s.sections);

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/pages/from-template", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, accent: template.accent, isPage: template.category === "page", steps: template.steps }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
      return r.json();
    },
    onSuccess: (data) => onCreated(data.funnel.id, data.stepId, template.category === "page"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(12px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#09090f", border: `1px solid ${accent}32` }}>

        <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: PANEL_BORDER }}>
          <div className="text-3xl">{template.emoji}</div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">{template.name}</p>
            <p className="text-[10px] text-zinc-600">
              {template.stepCount === 1 ? "Single page" : `${template.stepCount}-step funnel`} · {template.sectionCount} sections
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Name</p>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && name && mut.mutate()}
              className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white bg-white/5 border outline-none"
              style={{ borderColor: name ? `${accent}42` : PANEL_BORDER }}
              autoFocus />
          </div>

          {template.steps.length > 1 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Steps included</p>
              <div className="flex flex-wrap gap-1.5">
                {template.steps.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                    style={{ background: `${accent}0e`, color: accent }}>
                    {i + 1}. {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Sections</p>
            <div className="flex flex-wrap gap-1">
              {allSections.slice(0, 12).map((s, i) => {
                const color = SECTION_WIRE[s.type]?.color || "#52525b";
                return (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded font-bold capitalize"
                    style={{ background: `${color}14`, color }}>
                    {s.type.replace(/_/g, " ")}
                  </span>
                );
              })}
              {allSections.length > 12 && (
                <span className="text-[9px] text-zinc-600 px-1 py-0.5">+{allSections.length - 12} more</span>
              )}
            </div>
          </div>

          {mut.isError && <p className="text-xs text-red-400">{(mut.error as Error).message}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}` }}>Cancel</button>
            <button onClick={() => mut.mutate()} disabled={!name || mut.isPending}
              className="flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "#040406" }}>
              {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" />Create</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Publish Modal ─────────────────────────────────────────────────────────────

function PublishModal({ item, onClose, onStatusChange }: {
  item: any; onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const isLive = item.status === "active";
  const liveUrl = `${window.location.origin}/f/${item.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=d4b461&bgcolor=040406&data=${encodeURIComponent(liveUrl)}`;
  const accent = ACCENT_MAP[item.accent_color] || GOLD;

  const toggleMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/funnels/${item.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isLive ? "draft" : "active" }),
      });
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/funnels"] });
      qc.invalidateQueries({ queryKey: ["/api/pages"] });
      onStatusChange(item.id, data.status || (isLive ? "draft" : "active"));
    },
  });

  const copy = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "#09090f", border: `1px solid ${isLive ? "#22c55e30" : PANEL_BORDER}` }}>

        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: PANEL_BORDER }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: isLive ? "#22c55e14" : `${accent}14`, border: `1px solid ${isLive ? "#22c55e30" : `${accent}30`}` }}>
            <Globe className="w-4 h-4" style={{ color: isLive ? "#22c55e" : accent }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white truncate">{item.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: isLive ? "#22c55e" : "#52525b" }} />
              <p className="text-[10px] font-bold" style={{ color: isLive ? "#22c55e" : "#71717a" }}>
                {isLive ? "Published & Live" : "Draft — Not published"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Toggle publish */}
          <button onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending}
            className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: isLive ? "rgba(239,68,68,0.12)" : "linear-gradient(135deg, #22c55e, #16a34a)", color: isLive ? "#ef4444" : "#040406", border: isLive ? "1px solid rgba(239,68,68,0.3)" : "none" }}>
            {toggleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isLive ? <><X className="w-4 h-4" />Unpublish</> : <><Rocket className="w-4 h-4" />Publish Now</>}
          </button>

          {/* URL box */}
          {isLive && (
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PANEL_BORDER}` }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-[10px] font-mono text-zinc-400 flex-1 truncate">{liveUrl}</p>
                <button onClick={copy} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
                  style={{ background: copied ? "#22c55e14" : `${accent}14`, color: copied ? "#22c55e" : accent, border: `1px solid ${copied ? "#22c55e30" : `${accent}25`}` }}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* QR + actions */}
          {isLive && (
            <div className="flex items-start gap-4">
              <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ border: `1px solid ${PANEL_BORDER}`, background: BG }}>
                <img src={qrUrl} alt="QR Code" width={88} height={88} className="block" />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <a href={liveUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-colors"
                  style={{ background: `${accent}12`, border: `1px solid ${accent}22`, color: accent }}>
                  <ExternalLink className="w-3.5 h-3.5" />View Live Page
                </a>
                <button onClick={copy}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}`, color: "#71717a" }}>
                  <Copy className="w-3.5 h-3.5" />Copy Link
                </button>
              </div>
            </div>
          )}

          {!isLive && (
            <p className="text-[11px] text-zinc-600 text-center">
              Publish to get a shareable URL, QR code, and analytics tracking.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({ item, isPage, onDelete, onPublish }: { item: any; isPage: boolean; onDelete: (id: string) => void; onPublish: (item: any) => void }) {
  const [, nav] = useLocation();
  const accent = ACCENT_MAP[item.accent_color] || GOLD;
  const editUrl = isPage && item.step_id ? `/pages/${item.id}/step/${item.step_id}` : `/funnels/${item.id}/edit`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: CARD, border: `1px solid ${item.status === "active" ? `${accent}22` : PANEL_BORDER}` }}>
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}40)` }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: item.status === "active" ? "#22c55e" : "#52525b" }} />
              <p className="text-sm font-black text-white truncate">{item.name}</p>
            </div>
            <p className="text-[10px] text-zinc-700 font-mono">/f/{item.slug}</p>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: item.status === "active" ? "#22c55e14" : "rgba(255,255,255,0.05)", color: item.status === "active" ? "#22c55e" : "#52525b" }}>
            {item.status === "active" ? "Live" : "Draft"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: Eye, value: (item.visits || 0).toLocaleString(), label: "Views" },
            { icon: Users, value: (item.leads || 0).toLocaleString(), label: "Leads" },
            { icon: DollarSign, value: `$${Number(item.revenue || 0).toFixed(0)}`, label: "Revenue" },
          ].map(s => (
            <div key={s.label} className="text-center p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-xs font-black text-white">{s.value}</p>
              <p className="text-[9px] text-zinc-700">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => nav(editUrl)}
            className="flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
            style={{ background: `${accent}14`, border: `1px solid ${accent}22`, color: accent }}>
            <Edit3 className="w-3 h-3" />Edit
          </button>
          {!isPage && (
            <button onClick={() => nav(`/funnels/${item.id}/analytics`)} title="Analytics"
              className="py-2 px-2.5 rounded-xl text-zinc-500 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}` }}>
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          )}
          {!isPage && (
            <button onClick={() => nav(`/funnels/${item.id}/automations`)} title="Automations"
              className="py-2 px-2.5 rounded-xl text-zinc-500 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}` }}>
              <Zap className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onPublish(item)} title="Publish / Share"
            className="py-2 px-2.5 rounded-xl transition-colors"
            style={{ background: item.status === "active" ? "#22c55e14" : "rgba(255,255,255,0.04)", border: `1px solid ${item.status === "active" ? "#22c55e30" : PANEL_BORDER}`, color: item.status === "active" ? "#22c55e" : "#52525b" }}>
            <Globe className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item.id)}
            className="py-2 px-2.5 rounded-xl text-zinc-600 hover:text-red-400 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}` }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ tab, onCreate }: { tab: Tab; onCreate: () => void }) {
  const cfg = {
    funnels:   { icon: "🚀", title: "No Funnels Yet", desc: "Multi-step sales flows from opt-in to purchase.", cta: "Create Funnel" },
    pages:     { icon: "📄", title: "No Pages Yet", desc: "Standalone landing pages for any goal.", cta: "Create Page" },
    templates: null,
    leads:     null,
  }[tab];
  if (!cfg) return null;
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">{cfg.icon}</div>
      <p className="text-lg font-black text-white mb-2">{cfg.title}</p>
      <p className="text-sm text-zinc-600 mb-6 max-w-xs">{cfg.desc}</p>
      <button onClick={onCreate}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black"
        style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}cc)`, color: BG }}>
        <Plus className="w-4 h-4" />{cfg.cta}
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Pages() {
  const [, nav]    = useLocation();
  const qc         = useQueryClient();
  const [tab, setTab]                           = useState<Tab>("funnels");
  const [search, setSearch]                     = useState("");
  const [templateFilter, setTemplateFilter]     = useState<"all" | "funnel" | "page">("all");
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null);
  const [showAIModal, setShowAIModal]           = useState(false);
  const [publishItem, setPublishItem]           = useState<any | null>(null);
  const [leadsSearch, setLeadsSearch]           = useState("");
  const [leadsFunnelFilter, setLeadsFunnelFilter] = useState("");

  const { data: funnels = [], isLoading: loadingFunnels } = useQuery<any[]>({
    queryKey: ["/api/funnels"],
    queryFn: async () => { const r = await fetch("/api/funnels", { credentials: "include" }); return r.json(); },
  });

  const { data: pages = [], isLoading: loadingPages } = useQuery<any[]>({
    queryKey: ["/api/pages"],
    queryFn: async () => { const r = await fetch("/api/pages", { credentials: "include" }); return r.json(); },
  });

  const { data: leadsData, isLoading: loadingLeads } = useQuery<{ contacts: any[]; total: number }>({
    queryKey: ["/api/contacts", leadsSearch, leadsFunnelFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (leadsSearch) params.set("search", leadsSearch);
      if (leadsFunnelFilter) params.set("funnelId", leadsFunnelFilter);
      params.set("limit", "200");
      const r = await fetch(`/api/contacts?${params}`, { credentials: "include" });
      return r.json();
    },
    enabled: tab === "leads",
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/funnels/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/funnels"] });
      qc.invalidateQueries({ queryKey: ["/api/pages"] });
    },
  });

  const handleCreated = useCallback((funnelId: string, stepId: string, isPage: boolean) => {
    setSelectedTemplate(null);
    setShowAIModal(false);
    qc.invalidateQueries({ queryKey: ["/api/funnels"] });
    qc.invalidateQueries({ queryKey: ["/api/pages"] });
    if (isPage && stepId) nav(`/pages/${funnelId}/step/${stepId}`);
    else nav(`/funnels/${funnelId}/edit`);
  }, [nav, qc]);

  const exportLeadsCSV = () => {
    const contacts = leadsData?.contacts || [];
    const csv = ["Name,Email,Phone,Funnel,Step,Date", ...contacts.map(c =>
      [`"${c.name || ""}"`, `"${c.email}"`, `"${c.phone || ""}"`, `"${c.funnel_name}"`, `"${c.step_name || ""}"`, `"${new Date(c.created_at).toLocaleString()}"`].join(",")
    )].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "leads.csv"; a.click();
  };

  const filteredFunnels   = funnels.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredPages     = pages.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTemplates = PAGE_TEMPLATES.filter(t =>
    (templateFilter === "all" || t.category === templateFilter) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subcategory.toLowerCase().includes(search.toLowerCase()))
  );
  const totalLeads = (funnels.reduce((a, f) => a + (f.leads || 0), 0) + pages.reduce((a, p) => a + (p.leads || 0), 0));

  const TABS = [
    { id: "funnels"   as Tab, label: "Funnels",   icon: GitBranch, count: funnels.length },
    { id: "pages"     as Tab, label: "Pages",     icon: FileText,  count: pages.length },
    { id: "templates" as Tab, label: "Templates", icon: Sparkles },
    { id: "leads"     as Tab, label: "Leads",     icon: Users,     count: totalLeads || undefined },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b" style={{ borderColor: PANEL_BORDER, background: SIDEBAR_BG }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-xl font-black text-white">Pages & Funnels</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">Build, publish, and grow — all in one place</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAIModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black hover:brightness-110 transition-all"
                style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)", color: "#a855f7" }}>
                <Wand2 className="w-3.5 h-3.5" />AI Generate
              </button>
              <button onClick={() => setTab("templates")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black"
                style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}cc)`, color: BG }}>
                <Plus className="w-3.5 h-3.5" />New from Template
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between pb-0">
            <div className="flex items-center gap-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all relative"
                  style={{ color: tab === t.id ? GOLD : "#52525b" }}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                      style={{ background: tab === t.id ? `${GOLD}18` : "rgba(255,255,255,0.06)", color: tab === t.id ? GOLD : "#52525b" }}>
                      {t.count}
                    </span>
                  )}
                  {tab === t.id && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: GOLD }} />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pb-2">
              {tab === "templates" && (
                <div className="flex gap-1">
                  {(["all", "funnel", "page"] as const).map(f => (
                    <button key={f} onClick={() => setTemplateFilter(f)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                      style={{
                        background: templateFilter === f ? `${GOLD}16` : "rgba(255,255,255,0.04)",
                        color: templateFilter === f ? GOLD : "#52525b",
                        border: `1px solid ${templateFilter === f ? `${GOLD}30` : PANEL_BORDER}`,
                      }}>
                      {f === "all" ? "All" : f === "funnel" ? "Funnels" : "Pages"}
                    </button>
                  ))}
                </div>
              )}
              {tab === "leads" && (
                <select value={leadsFunnelFilter} onChange={e => setLeadsFunnelFilter(e.target.value)}
                  className="text-[11px] font-bold px-2 py-1.5 rounded-lg outline-none cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}`, color: leadsFunnelFilter ? GOLD : "#52525b" }}>
                  <option value="">All Funnels</option>
                  {[...funnels, ...pages].map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}` }}>
                <Search className="w-3.5 h-3.5 text-zinc-600" />
                <input
                  value={tab === "leads" ? leadsSearch : search}
                  onChange={e => tab === "leads" ? setLeadsSearch(e.target.value) : setSearch(e.target.value)}
                  placeholder={tab === "leads" ? "Search leads…" : "Search…"}
                  className="bg-transparent text-xs text-white placeholder:text-zinc-700 outline-none w-28" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {tab === "funnels" && (
          loadingFunnels
            ? <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>
            : filteredFunnels.length === 0
              ? <EmptyState tab="funnels" onCreate={() => setTab("templates")} />
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredFunnels.map((f, i) => (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <ItemCard item={f} isPage={false} onDelete={id => deleteMut.mutate(id)} onPublish={setPublishItem} />
                    </motion.div>
                  ))}
                </div>
        )}

        {tab === "pages" && (
          loadingPages
            ? <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>
            : filteredPages.length === 0
              ? <EmptyState tab="pages" onCreate={() => setTab("templates")} />
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredPages.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <ItemCard item={p} isPage={true} onDelete={id => deleteMut.mutate(id)} onPublish={setPublishItem} />
                    </motion.div>
                  ))}
                </div>
        )}

        {tab === "leads" && (
          <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-base font-black text-white">All Leads</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {leadsData?.total ?? "…"} contacts across all funnels and pages
                </p>
              </div>
              <button onClick={exportLeadsCSV} disabled={!leadsData?.contacts.length}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-30"
                style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}30`, color: GOLD }}>
                <Download className="w-3.5 h-3.5" />Export CSV
              </button>
            </div>

            {loadingLeads ? (
              <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>
            ) : !leadsData?.contacts.length ? (
              <div className="flex flex-col items-center py-24 text-center">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-base font-black text-white mb-2">No leads yet</p>
                <p className="text-sm text-zinc-600 max-w-xs">Publish a funnel or page and start collecting contacts.</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${PANEL_BORDER}` }}>
                <div className="grid grid-cols-[1fr_1fr_120px_140px_100px] gap-0 border-b text-[10px] font-black uppercase tracking-wider text-zinc-600 px-5 py-3"
                  style={{ borderColor: PANEL_BORDER, background: "rgba(255,255,255,0.02)" }}>
                  <span>Contact</span><span>Email</span><span>Funnel</span><span>Step</span><span>Date</span>
                </div>
                {leadsData.contacts.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="grid grid-cols-[1fr_1fr_120px_140px_100px] gap-0 items-center px-5 py-3.5 border-b transition-colors hover:bg-white/[0.02]"
                    style={{ borderColor: PANEL_BORDER }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black"
                        style={{ background: `${GOLD}14`, color: GOLD }}>
                        {(c.name || c.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{c.name || "—"}</p>
                        {c.phone && <p className="text-[9px] text-zinc-600 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{c.phone}</p>}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-400 truncate flex items-center gap-1"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 truncate">{c.funnel_name}</p>
                    </div>
                    <div>
                      {c.step_name && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                          style={{ background: `${GOLD}10`, color: GOLD }}>{c.step_name}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "templates" && (
          <div className="space-y-10">
            {/* AI banner */}
            <div className="rounded-2xl overflow-hidden relative cursor-pointer group"
              style={{ background: "linear-gradient(135deg, #0c0a1a 0%, #0a0c18 60%, #0c0a1a 100%)", border: "1px solid rgba(168,85,247,0.35)" }}
              onClick={() => setShowAIModal(true)}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 50% 100% at 0% 50%, rgba(168,85,247,0.1) 0%, transparent 55%)" }} />
              <div className="relative flex items-center gap-6 px-8 py-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.4), rgba(59,130,246,0.2))", border: "1px solid rgba(168,85,247,0.5)" }}>
                  <Wand2 className="w-7 h-7" style={{ color: "#a855f7" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-black text-white">Generate with AI</p>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.4)" }}>NEW</span>
                  </div>
                  <p className="text-sm text-zinc-500 mb-3">
                    Describe your business and goal — AI writes all copy, picks the right sections, and builds your entire page or funnel in seconds.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Any niche", "Real copy — no placeholders", "Landing pages", "Sales funnels"].map(tag => (
                      <span key={tag} className="text-[10px] text-zinc-600 px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}` }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black flex-shrink-0 transition-all group-hover:gap-3"
                  style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "white" }}>
                  Try it <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Funnel templates */}
            {(templateFilter === "all" || templateFilter === "funnel") && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <GitBranch className="w-4 h-4" style={{ color: GOLD }} />
                  <p className="text-sm font-black text-white">Sales Funnel Templates</p>
                  <div className="flex-1 h-px" style={{ background: PANEL_BORDER }} />
                  <p className="text-[10px] text-zinc-600">Multi-step, pre-built sequences</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTemplates.filter(t => t.category === "funnel").map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <TemplateCard tpl={t} onUse={setSelectedTemplate} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Page templates */}
            {(templateFilter === "all" || templateFilter === "page") && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <FileText className="w-4 h-4" style={{ color: GOLD }} />
                  <p className="text-sm font-black text-white">Landing Page Templates</p>
                  <div className="flex-1 h-px" style={{ background: PANEL_BORDER }} />
                  <p className="text-[10px] text-zinc-600">Single-page designs for any goal</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AIGenerateCard onClick={() => setShowAIModal(true)} />
                  {filteredTemplates.filter(t => t.category === "page").map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <TemplateCard tpl={t} onUse={setSelectedTemplate} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {filteredTemplates.length === 0 && (
              <div className="flex flex-col items-center py-20">
                <p className="text-zinc-600 text-sm">No templates match "{search}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedTemplate && (
          <CreateModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)} onCreated={handleCreated} />
        )}
        {showAIModal && (
          <AIGenerateModal onClose={() => setShowAIModal(false)} onCreated={handleCreated} />
        )}
        {publishItem && (
          <PublishModal item={publishItem} onClose={() => setPublishItem(null)}
            onStatusChange={(id, status) => {
              setPublishItem((prev: any) => prev?.id === id ? { ...prev, status } : prev);
              qc.invalidateQueries({ queryKey: ["/api/funnels"] });
              qc.invalidateQueries({ queryKey: ["/api/pages"] });
            }} />
        )}
      </AnimatePresence>
    </div>
  );
}
