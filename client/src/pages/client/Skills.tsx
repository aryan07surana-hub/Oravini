import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Search, Plus, Check, Trash2, Edit2,
  Upload, Sparkles, X, Brain, Download,
  MessageSquare, Mail, Smartphone, Megaphone,
  Star, RefreshCw, ToggleRight, ToggleLeft,
  ArrowRight, BrainCircuit, Wand2, Globe,
  Shield, Mic2, Layers, Package, AlertTriangle,
  ChevronDown, ChevronUp, Clock, Send, Play,
  FileText, Lightbulb, Activity,
} from "lucide-react";

/* ── Design tokens ─────────────────────────────────────────────── */
const GOLD        = "#d4b461";
const GOLD_BG     = "rgba(212,180,97,0.08)";
const GOLD_BORDER = "rgba(212,180,97,0.22)";
const SURFACE     = "rgba(12,12,20,0.98)";
const CARD        = "rgba(16,16,26,0.92)";
const BORDER      = "rgba(255,255,255,0.06)";
const BORDER_MED  = "rgba(255,255,255,0.10)";

/* ── Category metadata ─────────────────────────────────────────── */
const CAT: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  content: { label: "Content",  icon: Sparkles,      color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  dm:      { label: "DM",       icon: MessageSquare, color: "#2dd4bf", bg: "rgba(45,212,191,0.12)"  },
  email:   { label: "Email",    icon: Mail,          color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  sms:     { label: "SMS",      icon: Smartphone,    color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  ads:     { label: "Ads",      icon: Megaphone,     color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  brand:   { label: "Brand",    icon: Shield,        color: "#d4b461", bg: "rgba(212,180,97,0.12)"  },
  voice:   { label: "Voice",    icon: Mic2,          color: "#e879f9", bg: "rgba(232,121,249,0.12)" },
};

const PLAT_META: Record<string, { color: string; bg: string; label: string }> = {
  instagram: { color: "#e1306c", bg: "rgba(225,48,108,0.12)", label: "Instagram"  },
  youtube:   { color: "#ff4444", bg: "rgba(255,68,68,0.12)",  label: "YouTube"    },
  twitter:   { color: "#1da1f2", bg: "rgba(29,161,242,0.12)", label: "X / Twitter"},
  linkedin:  { color: "#0077b5", bg: "rgba(0,119,181,0.12)",  label: "LinkedIn"   },
  all:       { color: "#6b7280", bg: "rgba(107,114,128,0.10)", label: "All"       },
};

const ALL_PLATFORMS = ["all", "instagram", "youtube", "twitter", "linkedin"] as const;

/* ── Conflict detection ────────────────────────────────────────── */
const CONFLICT_PAIRS = [
  ["formal", "casual"], ["formal", "gen z"], ["professional", "gen z"],
  ["long-form", "short"], ["concise", "detailed"], ["corporate", "personal"],
  ["friendly", "professional authority"], ["serious", "humorous"],
];

function detectConflicts(skills: Skill[]): string[] {
  const combined = skills.map(s => s.instructions.toLowerCase()).join(" ");
  return CONFLICT_PAIRS
    .filter(([a, b]) => combined.includes(a) && combined.includes(b))
    .map(([a, b]) => `"${a}" vs "${b}"`);
}

/* ── Helpers ───────────────────────────────────────────────────── */
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "Never used";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Skill {
  id: string; name: string; slug: string; description: string;
  category: string; platforms: string[]; instructions: string;
  icon: string; tags: string[]; isSystem: boolean; isPublic: boolean;
  usageCount: number; installed?: boolean; isActive?: boolean; createdBy?: string;
  lastUsedAt?: string; useCount?: number;
}

/* ── Try It sandbox (inside drawer) ───────────────────────────── */
function TryItPanel({ skill }: { skill: Skill }) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function run() {
    if (prompt.trim().length < 3) return;
    setLoading(true); setResult(null);
    try {
      const res = await apiRequest("POST", `/api/skills/${skill.id}/try`, { prompt });
      const data = await res.json();
      setResult(data.result || "");
    } catch (err: any) {
      toast({ title: "Try failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER_MED }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.02)" }}>
        <Play className="w-3 h-3" style={{ color: GOLD }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>Try It Live</span>
        <span className="text-[9px] text-zinc-600 ml-auto">Test before you install</span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && run()}
            placeholder="Type a prompt... e.g. 'Write a caption about productivity'"
            className="text-xs h-8 flex-1"
            style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)", color: "#e4e4e7" }}
          />
          <button
            onClick={run}
            disabled={loading || prompt.trim().length < 3}
            className="px-3 h-8 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
            style={{ background: GOLD_BG, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Run
          </button>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "rgba(212,180,97,0.06)", border: `1px solid ${GOLD_BORDER}` }}>
              <Brain className="w-3.5 h-3.5 animate-pulse" style={{ color: GOLD }} />
              <span className="text-xs text-zinc-400">Generating with skill applied...</span>
            </motion.div>
          )}
          {result !== null && !loading && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg p-3 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto"
              style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${BORDER_MED}`, maxHeight: 200 }}>
              {result}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Conflict banner ───────────────────────────────────────────── */
function ConflictBanner({ conflicts }: { conflicts: string[] }) {
  const [open, setOpen] = useState(false);
  if (!conflicts.length) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border px-4 py-3 flex flex-col gap-1.5"
      style={{ background: "rgba(251,146,60,0.06)", borderColor: "rgba(251,146,60,0.25)" }}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 w-full text-left">
        <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
        <span className="text-xs font-bold text-orange-300">
          {conflicts.length} potential conflict{conflicts.length > 1 ? "s" : ""} detected in active skills
        </span>
        {open ? <ChevronUp className="w-3 h-3 text-orange-400 ml-auto" /> : <ChevronDown className="w-3 h-3 text-orange-400 ml-auto" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5 pt-1">
            {conflicts.map(c => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-md font-mono text-orange-300"
                style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)" }}>
                {c}
              </span>
            ))}
            <p className="w-full text-[10px] text-orange-500 mt-1">Conflicting instructions may reduce AI output quality. Consider deactivating one.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Category filter pills ─────────────────────────────────────── */
function CategoryPills({ active, onChange, counts }: {
  active: string; onChange: (c: string) => void; counts: Record<string, number>;
}) {
  const all = [
    { key: "all", label: "All", icon: Layers, color: "#94a3b8" },
    ...Object.entries(CAT).map(([k, v]) => ({ key: k, label: v.label, icon: v.icon, color: v.color })),
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {all.map(({ key, label, icon: Icon, color }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isActive ? "border-transparent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
            }`}
            style={isActive ? { background: color + "20", color, border: `1px solid ${color}33` } : {}}
          >
            <Icon className="w-3 h-3" />
            {label}
            {counts[key] > 0 && (
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${isActive ? "bg-white/15" : "bg-zinc-800 text-zinc-500"}`}>
                {counts[key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Skill card ────────────────────────────────────────────────── */
function SkillCard({
  skill, mode, onInstall, onUninstall, onToggle, onEdit, onDelete, onPreview, installing,
}: {
  skill: Skill; mode: "browse" | "mine";
  onInstall?: () => void; onUninstall?: () => void; onToggle?: () => void;
  onEdit?: () => void; onDelete?: () => void; onPreview: () => void;
  installing?: boolean;
}) {
  const cat = CAT[skill.category] || CAT.content;
  const CatIcon = cat.icon;
  const inactive = mode === "mine" && !skill.isActive;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: inactive ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.16 }}
      onClick={onPreview}
      className="group relative flex flex-col rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden hover:border-zinc-700"
      style={{
        background: CARD,
        borderColor: skill.isActive && mode === "mine" ? GOLD_BORDER : BORDER,
        boxShadow: skill.isActive && mode === "mine" ? `0 0 0 1px ${GOLD_BORDER}, 0 4px 24px rgba(212,180,97,0.06)` : "none",
      }}
    >
      {/* Category color stripe */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${cat.color}80, transparent)` }} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: cat.bg }}>
              {skill.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white leading-tight truncate">{skill.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CatIcon className="w-3 h-3 flex-shrink-0" style={{ color: cat.color }} />
                <span className="text-[10px] font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                {skill.isSystem && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(212,180,97,0.12)", color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
                    OFFICIAL
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mine-mode hover actions */}
          {mode === "mine" && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={e => e.stopPropagation()}>
              {!skill.isSystem && onEdit && (
                <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/8 text-zinc-600 hover:text-zinc-200 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
              {onToggle && (
                <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/8 transition-colors">
                  {skill.isActive
                    ? <ToggleRight className="w-4 h-4 text-green-400" />
                    : <ToggleLeft className="w-4 h-4 text-zinc-600" />}
                </button>
              )}
              {!skill.isSystem && onDelete && (
                <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-900/20 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{skill.description}</p>

        {/* Platforms */}
        <div className="flex flex-wrap gap-1">
          {skill.platforms.slice(0, 4).map(p => {
            const pm = PLAT_META[p] || PLAT_META.all;
            return (
              <span key={p} className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                style={{ background: pm.bg, color: pm.color }}>
                {p}
              </span>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t" style={{ borderColor: BORDER }}>
          {mode === "browse" ? (
            skill.installed ? (
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" /> Installed
                </div>
                <button onClick={e => { e.stopPropagation(); onUninstall?.(); }}
                  className="ml-auto text-[10px] text-zinc-600 hover:text-red-400 transition-colors">
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onInstall?.(); }}
                disabled={installing}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
                style={{ background: GOLD_BG, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}
              >
                {installing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Install
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${skill.isActive ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-zinc-700"}`} />
              <span className="text-[10px] font-medium text-zinc-600">{skill.isActive ? "Active" : "Inactive"}</span>
              {skill.lastUsedAt && (
                <span className="text-[9px] text-zinc-700 flex items-center gap-0.5 ml-1">
                  <Clock className="w-2.5 h-2.5" />{timeAgo(skill.lastUsedAt)}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 text-zinc-700 text-[10px]">
            {mode === "mine" && skill.useCount != null && skill.useCount > 0 ? (
              <span className="flex items-center gap-0.5 text-zinc-600">
                <Activity className="w-2.5 h-2.5" />{skill.useCount} uses
              </span>
            ) : (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3" />{skill.usageCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Skill detail drawer ───────────────────────────────────────── */
function SkillDrawer({ skill, onClose, onInstall, onUninstall, onToggle, mode }: {
  skill: Skill | null; onClose: () => void;
  onInstall?: () => void; onUninstall?: () => void; onToggle?: () => void;
  mode: "browse" | "mine";
}) {
  const cat = skill ? (CAT[skill.category] || CAT.content) : CAT.content;
  const CatIcon = cat.icon;
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <AnimatePresence>
      {skill && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[500px] flex flex-col"
            style={{ background: SURFACE, borderLeft: `1px solid ${BORDER_MED}` }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 p-6 border-b flex-shrink-0" style={{ borderColor: BORDER }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: cat.bg }}>
                {skill.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white leading-tight">{skill.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    <CatIcon className="w-3 h-3" style={{ color: cat.color }} />
                    <span className="text-[10px] font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                  </div>
                  {skill.isSystem && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: GOLD_BG, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>OFFICIAL</span>
                  )}
                  <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5" />{skill.usageCount}
                  </span>
                  {mode === "mine" && skill.lastUsedAt && (
                    <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />{timeAgo(skill.lastUsedAt)}
                    </span>
                  )}
                  {mode === "mine" && skill.useCount != null && skill.useCount > 0 && (
                    <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                      <Activity className="w-2.5 h-2.5" />{skill.useCount} AI uses
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/6 text-zinc-500 hover:text-white transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <p className="text-sm text-zinc-300 leading-relaxed">{skill.description}</p>

              {/* Platforms */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Platforms</p>
                <div className="flex flex-wrap gap-1.5">
                  {skill.platforms.map(p => {
                    const pm = PLAT_META[p] || PLAT_META.all;
                    return (
                      <span key={p} className="text-[10px] font-bold uppercase px-2 py-1 rounded-md" style={{ background: pm.bg, color: pm.color }}>
                        {pm.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              {skill.tags?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skill.tags.map(t => (
                      <Badge key={t} className="text-[10px] bg-zinc-900 text-zinc-500 border-zinc-800">#{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions (collapsible) */}
              <div>
                <button onClick={() => setShowInstructions(o => !o)}
                  className="flex items-center gap-2 w-full text-left mb-2 group">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">Instructions</p>
                  {showInstructions ? <ChevronUp className="w-3 h-3 text-zinc-600 ml-auto" /> : <ChevronDown className="w-3 h-3 text-zinc-600 ml-auto" />}
                </button>
                <AnimatePresence>
                  {showInstructions && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <div className="rounded-xl p-4 text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap overflow-x-auto"
                        style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}` }}>
                        {skill.instructions}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Try It sandbox */}
              <TryItPanel skill={skill} />
            </div>

            {/* Footer */}
            <div className="p-5 border-t flex gap-3 flex-shrink-0" style={{ borderColor: BORDER }}>
              {mode === "browse" ? (
                skill.installed ? (
                  <>
                    <button onClick={onUninstall}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border text-zinc-400 hover:text-red-400 hover:border-red-900/50 transition-all"
                      style={{ borderColor: BORDER_MED }}>
                      Remove Skill
                    </button>
                    {onToggle && (
                      <button onClick={onToggle}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                        style={{ background: GOLD_BG, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
                        {skill.isActive ? <><ToggleLeft className="w-4 h-4" />Deactivate</> : <><ToggleRight className="w-4 h-4" />Activate</>}
                      </button>
                    )}
                  </>
                ) : (
                  <button onClick={onInstall}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:brightness-105"
                    style={{ background: GOLD, color: "#000" }}>
                    <Download className="w-4 h-4" /> Install Skill
                  </button>
                )
              ) : (
                <>
                  {onToggle && (
                    <button onClick={onToggle}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                      style={
                        skill.isActive
                          ? { background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }
                          : { background: "rgba(34,197,94,0.10)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }
                      }>
                      {skill.isActive ? <><ToggleLeft className="w-4 h-4" />Deactivate</> : <><ToggleRight className="w-4 h-4" />Activate</>}
                    </button>
                  )}
                  {!skill.isSystem && (
                    <button onClick={onUninstall}
                      className="px-4 py-2.5 rounded-xl text-sm border text-zinc-500 hover:text-red-400 hover:border-red-900/40 transition-all"
                      style={{ borderColor: BORDER_MED }}>
                      Remove
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── DNA upload overlay ────────────────────────────────────────── */
const DNA_EXAMPLE = `Here are some of my best performing posts:

"Stop trying to be consistent. Be obsessed. Nobody remembers consistent."

"3 things that changed my content in 30 days:
1. Stopped filming what I wanted to say
2. Started filming what they needed to hear
3. Reviewed comments before every shoot

Your audience is your best scriptwriter."

"Hot take: the creators winning right now aren't better at content.
They're better at understanding people.
Study psychology. Then study your analytics."

Brand voice: Direct, provocative, backed by data. No fluff. Short sentences. Always gives the reader something they can use today.`;

function DNAOverlay({ onClose, onGenerated }: {
  onClose: () => void;
  onGenerated: (s: Partial<Skill>) => void;
}) {
  const { toast } = useToast();
  const [dna, setDna] = useState("");
  const [phase, setPhase] = useState<"input" | "thinking">("input");
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  async function run() {
    if (dna.trim().length < 50) {
      toast({ title: "Need more content", description: "Paste at least a few posts", variant: "destructive" });
      return;
    }
    setPhase("thinking");
    try {
      const res = await apiRequest("POST", "/api/skills/generate-from-dna", { dnaContent: dna });
      onGenerated(await res.json());
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
      setPhase("input");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!["text/plain", "text/markdown", "application/pdf"].some(t => file.type.startsWith(t.split("/")[0]))) {
      toast({ title: "Unsupported file", description: "Drop a .txt or .md file", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setDna(prev => prev + "\n\n" + (ev.target?.result as string || ""));
    reader.readAsText(file);
  }

  const charQuality = dna.length < 100 ? "weak" : dna.length < 400 ? "ok" : dna.length < 800 ? "good" : "great";
  const charColor   = { weak: "#ef4444", ok: "#fb923c", good: "#facc15", great: "#4ade80" }[charQuality];
  const charLabel   = { weak: "Too short", ok: "Keep going", good: "Good amount", great: "Excellent" }[charQuality];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="w-full max-w-xl rounded-2xl border flex flex-col"
        style={{ background: SURFACE, borderColor: GOLD_BORDER }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD_BG }}>
            <Upload className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Upload Content DNA</p>
            <p className="text-[10px] text-zinc-500">AI extracts your voice, structure, and patterns</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-lg hover:bg-white/6 text-zinc-500"><X className="w-4 h-4" /></button>
        </div>

        {phase === "thinking" ? (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: GOLD + "30" }} />
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: GOLD_BG }}>
                <Brain className="w-6 h-6 animate-pulse" style={{ color: GOLD }} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold">Analyzing your DNA...</p>
              <p className="text-zinc-500 text-sm mt-1">Extracting voice, patterns, CTAs, structure</p>
            </div>
            <div className="flex gap-2">
              {["Voice", "Tone", "Patterns", "CTAs"].map((l, i) => (
                <motion.span key={l} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.35 }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ background: GOLD_BG, color: GOLD }}>{l}</motion.span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-4">
            {/* Input type hints */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { e: "📝", l: "Past posts & captions",  d: "Your top performing content" },
                { e: "🎙️", l: "Scripts & transcripts",  d: "Video or podcast scripts"    },
                { e: "📋", l: "Brand guidelines",        d: "Voice & tone documents"      },
                { e: "✍️", l: "Writing samples",         d: "Emails, threads, copy"       },
              ].map(it => (
                <div key={it.l} className="rounded-xl border p-2.5 flex items-start gap-2"
                  style={{ borderColor: BORDER, background: "rgba(255,255,255,0.015)" }}>
                  <span className="text-base">{it.e}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-300">{it.l}</p>
                    <p className="text-[9px] text-zinc-600">{it.d}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className="relative rounded-xl border-2 border-dashed transition-all"
              style={{ borderColor: dragging ? GOLD : "rgba(255,255,255,0.10)", background: dragging ? GOLD_BG : "transparent" }}
            >
              <Textarea
                value={dna}
                onChange={e => setDna(e.target.value)}
                placeholder={`Paste your content DNA — your best posts, brand voice notes, scripts...\n\nTip: Drag & drop a .txt or .md file here.`}
                className="min-h-[160px] text-sm font-mono resize-none leading-relaxed border-0 bg-transparent focus:ring-0"
                style={{ color: "#e4e4e7" }}
              />
              {dragging && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8" style={{ color: GOLD }} />
                    <span className="text-sm font-bold" style={{ color: GOLD }}>Drop file here</span>
                  </div>
                </div>
              )}
            </div>

            {/* Char quality bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-32 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div className="h-full rounded-full" animate={{ width: `${Math.min((dna.length / 800) * 100, 100)}%` }}
                    style={{ background: charColor }} transition={{ duration: 0.3 }} />
                </div>
                <span className="text-[10px] font-bold" style={{ color: charColor }}>{charLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setDna(DNA_EXAMPLE)}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 underline transition-colors">
                  Load example
                </button>
                <span className="text-[10px] text-zinc-600 font-mono">{dna.length} chars</span>
              </div>
            </div>

            <button onClick={run} disabled={dna.trim().length < 50}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 hover:brightness-105"
              style={{ background: GOLD, color: "#000" }}>
              <Brain className="w-4 h-4" />
              Generate Skill from DNA
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Platform multi-select ─────────────────────────────────────── */
function PlatformSelect({ selected, onChange }: { selected: string[]; onChange: (p: string[]) => void }) {
  function toggle(p: string) {
    if (p === "all") {
      onChange(selected.includes("all") ? [] : ["all"]);
      return;
    }
    const next = selected.filter(x => x !== "all");
    onChange(next.includes(p) ? next.filter(x => x !== p) : [...next, p]);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_PLATFORMS.map(p => {
        const meta = PLAT_META[p];
        const active = selected.includes(p);
        return (
          <button key={p} type="button" onClick={() => toggle(p)}
            className="text-[10px] font-bold px-2 py-1 rounded-md border transition-all"
            style={active
              ? { background: meta.bg, color: meta.color, borderColor: meta.color + "55" }
              : { background: "transparent", color: "#52525b", borderColor: "rgba(255,255,255,0.08)" }
            }>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Instruction tips (collapsible) ───────────────────────────── */
function InstructionTips() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-white/2 transition-colors"
        style={{ background: "rgba(255,255,255,0.015)" }}>
        <Lightbulb className="w-3 h-3 text-yellow-500" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tips for better instructions</span>
        {open ? <ChevronUp className="w-3 h-3 text-zinc-600 ml-auto" /> : <ChevronDown className="w-3 h-3 text-zinc-600 ml-auto" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: "✅ Good", items: ["Always start with a question", "Use casual, short sentences", "Include specific CTAs", "Avoid buzzwords like 'leverage'"] },
                { label: "❌ Avoid", items: ["Be professional", "Write good content", "Keep it short", "Be creative"] },
              ].map(({ label, items }) => (
                <div key={label} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.025)" }}>
                  <p className="text-[10px] font-bold text-zinc-400 mb-1.5">{label}</p>
                  {items.map(item => (
                    <p key={item} className="text-[10px] text-zinc-600 leading-relaxed">• {item}</p>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-700">More specific = better AI output. Describe patterns, not vague qualities.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Skill form overlay (create / edit) ────────────────────────── */
function SkillFormOverlay({ initial, onClose, onSaved }: {
  initial?: Partial<Skill>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<Partial<Skill>>(
    initial || { name: "", description: "", category: "content", platforms: ["all"], instructions: "", icon: "⚡", tags: [], isPublic: false }
  );

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? apiRequest("PUT", `/api/skills/${initial!.id}`, form)
        : apiRequest("POST", "/api/skills", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skills/store"] });
      toast({ title: isEdit ? "Skill updated" : "Skill created & installed ✓" });
      onSaved();
      onClose();
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const cat = CAT[form.category || "content"] || CAT.content;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="w-full max-w-lg rounded-2xl border flex flex-col max-h-[90vh]"
        style={{ background: SURFACE, borderColor: BORDER_MED }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0" style={{ borderColor: BORDER }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD_BG }}>
            <Wand2 className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{isEdit ? "Edit Skill" : initial ? "Review Generated Skill" : "Build Skill"}</p>
            {!isEdit && initial && <p className="text-[10px] text-zinc-500">Customize before saving</p>}
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-lg hover:bg-white/6 text-zinc-500"><X className="w-4 h-4" /></button>
        </div>

        {/* Form body */}
        <div className="overflow-y-auto p-6 flex flex-col gap-4 flex-1">
          {/* Live preview badge */}
          <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.02)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: cat.bg }}>
              {form.icon || "⚡"}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{form.name || "Untitled Skill"}</p>
              <p className="text-[10px] font-semibold" style={{ color: cat.color }}>{cat.label}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-[72px]">
              <label className="text-[10px] text-zinc-600 uppercase font-bold mb-1 block tracking-wider">Icon</label>
              <Input value={form.icon || ""} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className="text-center text-xl h-10" maxLength={4}
                style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)", color: "#e4e4e7" }} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-zinc-600 uppercase font-bold mb-1 block tracking-wider">Name</label>
              <Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. My Twitter Voice" className="h-10"
                style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)", color: "#e4e4e7" }} />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-zinc-600 uppercase font-bold mb-1 block tracking-wider">Description</label>
            <Input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="One sentence: what does this skill do?" className="h-10"
              style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)", color: "#e4e4e7" }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-600 uppercase font-bold mb-1 block tracking-wider">Category</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-10" style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)", color: "#e4e4e7" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "#0f0f1a", borderColor: BORDER_MED }}>
                  {Object.entries(CAT).map(([k, v]) => {
                    const Icon = v.icon;
                    return (
                      <SelectItem key={k} value={k} className="text-zinc-200 focus:bg-zinc-800">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" style={{ color: v.color }} />
                          {v.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-600 uppercase font-bold mb-1 block tracking-wider">Visibility</label>
              <Select value={form.isPublic ? "public" : "private"} onValueChange={v => setForm(f => ({ ...f, isPublic: v === "public" }))}>
                <SelectTrigger className="h-10" style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)", color: "#e4e4e7" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "#0f0f1a", borderColor: BORDER_MED }}>
                  <SelectItem value="private" className="text-zinc-200 focus:bg-zinc-800">Private</SelectItem>
                  <SelectItem value="public"  className="text-zinc-200 focus:bg-zinc-800">Public (share in store)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Platform multi-select */}
          <div>
            <label className="text-[10px] text-zinc-600 uppercase font-bold mb-1.5 block tracking-wider">Platforms</label>
            <PlatformSelect
              selected={form.platforms || ["all"]}
              onChange={p => setForm(f => ({ ...f, platforms: p.length ? p : ["all"] }))}
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-600 uppercase font-bold mb-1 block tracking-wider">Instructions</label>
            <Textarea value={form.instructions || ""} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              placeholder={`When writing content with this skill:\n- Always start with a question or bold claim\n- Use casual Gen Z tone, short punchy sentences\n- Never use corporate buzzwords\n- End every post with a CTA to save or DM...`}
              className="min-h-[140px] text-sm font-mono resize-none leading-relaxed mb-1.5"
              style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)", color: "#e4e4e7" }} />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-700">{(form.instructions || "").length} chars</span>
              <span className="text-[10px]" style={{ color: (form.instructions || "").length > 100 ? "#4ade80" : "#6b7280" }}>
                {(form.instructions || "").length > 100 ? "✓ Good length" : "Add more detail"}
              </span>
            </div>
            <InstructionTips />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0" style={{ borderColor: BORDER }}>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm border text-zinc-500 hover:text-zinc-300 transition-all"
            style={{ borderColor: BORDER_MED }}>
            Cancel
          </button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.instructions}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 hover:brightness-105"
            style={{ background: GOLD, color: "#000" }}>
            {save.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Create & Install Skill"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Browse tab — grouped by category ─────────────────────────── */
function BrowseTab({ skills, loading, onInstall, onUninstall, onPreview, installingId }: {
  skills: Skill[]; loading: boolean;
  onInstall: (id: string) => void; onUninstall: (id: string) => void;
  onPreview: (s: Skill) => void; installingId: string | null;
}) {
  const [category, setCategory] = useState("all");
  const [search, setSearch]     = useState("");

  const filtered = skills.filter(s => {
    const q = search.toLowerCase();
    return (
      (!search || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) &&
      (category === "all" || s.category === category)
    );
  });

  const catCounts: Record<string, number> = { all: skills.length };
  for (const s of skills) catCounts[s.category] = (catCounts[s.category] || 0) + 1;

  // Featured = top-3 most-used official skills
  const featured = skills.filter(s => s.isSystem).sort((a, b) => b.usageCount - a.usageCount).slice(0, 3);

  // Grouped by category
  const grouped: Record<string, Skill[]> = {};
  for (const s of filtered) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  return (
    <div className="p-6 flex flex-col gap-5 max-w-5xl">
      {/* Search + pills */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="pl-8 pr-8 py-2 rounded-xl text-xs border text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors w-full"
            style={{ background: "rgba(0,0,0,0.4)", borderColor: BORDER_MED }} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-zinc-500" />
            </button>
          )}
        </div>
        <CategoryPills active={category} onChange={setCategory} counts={catCounts} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-8 h-8 text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">No skills found</p>
          {search && <button onClick={() => setSearch("")} className="text-xs text-zinc-600 hover:text-zinc-400 mt-2 underline">Clear search</button>}
        </div>
      ) : category !== "all" ? (
        /* Single-category flat grid */
        <div>
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-sm font-bold text-white">{CAT[category]?.label}</h2>
            <span className="text-xs text-zinc-600">{filtered.length} skills</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map(s => (
                <SkillCard key={s.id} skill={s} mode="browse"
                  onPreview={() => onPreview(s)}
                  onInstall={() => onInstall(s.id)}
                  onUninstall={() => onUninstall(s.id)}
                  installing={installingId === s.id} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Grouped view */
        <div className="flex flex-col gap-8">
          {/* Featured section */}
          {!search && featured.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-3.5 h-3.5" style={{ color: GOLD }} />
                <h2 className="text-sm font-bold text-white">Featured</h2>
                <span className="text-xs text-zinc-600">Most used official skills</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {featured.map(s => (
                  <SkillCard key={s.id} skill={s} mode="browse"
                    onPreview={() => onPreview(s)}
                    onInstall={() => onInstall(s.id)}
                    onUninstall={() => onUninstall(s.id)}
                    installing={installingId === s.id} />
                ))}
              </div>
            </section>
          )}

          {/* Per-category sections */}
          {Object.entries(grouped).map(([cat, catSkills]) => {
            const meta = CAT[cat] || CAT.content;
            const CatIcon = meta.icon;
            return (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: meta.bg }}>
                    <CatIcon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                  <span className="text-xs text-zinc-600">{catSkills.length} skill{catSkills.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {catSkills.map(s => (
                      <SkillCard key={s.id} skill={s} mode="browse"
                        onPreview={() => onPreview(s)}
                        onInstall={() => onInstall(s.id)}
                        onUninstall={() => onUninstall(s.id)}
                        installing={installingId === s.id} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── MAIN PAGE ─────────────────────────────────────────────────── */
export default function SkillsPage() {
  const { toast } = useToast();
  const [tab, setTab]             = useState<"mine" | "browse">("mine");
  const [mineSearch, setMineSearch] = useState("");
  const [preview, setPreview]     = useState<Skill | null>(null);
  const [dnaOpen, setDnaOpen]     = useState(false);
  const [formOpen, setFormOpen]   = useState(false);
  const [formInit, setFormInit]   = useState<Partial<Skill> | undefined>();
  const [installingId, setInstallingId] = useState<string | null>(null);

  /* ── Queries ── */
  const browseQ = useQuery<Skill[]>({
    queryKey: ["/api/skills/store"],
    queryFn: async () => (await apiRequest("GET", "/api/skills/store")).json(),
  });

  const mineQ = useQuery<{ installed: Skill[]; created: Skill[] }>({
    queryKey: ["/api/skills/mine"],
    queryFn: async () => (await apiRequest("GET", "/api/skills/mine")).json(),
  });

  /* ── Mutations ── */
  const installM = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/skills/${id}/install`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills/store"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skills/mine"] });
      toast({ title: "Skill installed ✓", description: "Now active across your platform" });
      setInstallingId(null); setPreview(null);
    },
    onError: (err: any) => {
      toast({ title: "Install failed", description: err.message, variant: "destructive" });
      setInstallingId(null);
    },
  });

  const uninstallM = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/skills/${id}/uninstall`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills/store"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skills/mine"] });
      toast({ title: "Skill removed" });
      setPreview(null);
    },
  });

  const toggleM = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/skills/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills/mine"] });
      setPreview(p => p ? { ...p, isActive: !p.isActive } : null);
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/skills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills/mine"] });
      toast({ title: "Skill deleted" });
    },
  });

  // Bulk mutations
  const bulkToggleM = useMutation({
    mutationFn: async (activate: boolean) => {
      const skills = allMine.filter(s => s.isActive !== activate);
      await Promise.all(skills.map(s => apiRequest("PATCH", `/api/skills/${s.id}/toggle`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills/mine"] });
      toast({ title: "Skills updated" });
    },
  });

  /* ── Derived ── */
  const allMine = [
    ...(mineQ.data?.installed || []),
    ...(mineQ.data?.created   || []),
  ].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);

  const activeSkills   = allMine.filter(s => s.isActive);
  const inactiveSkills = allMine.filter(s => !s.isActive);
  const conflicts      = detectConflicts(activeSkills);

  const filteredMine = mineSearch
    ? allMine.filter(s =>
        s.name.toLowerCase().includes(mineSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(mineSearch.toLowerCase()) ||
        s.category.toLowerCase().includes(mineSearch.toLowerCase())
      )
    : null; // null = no search active, show active/inactive sections

  function openCreate(init?: Partial<Skill>) { setFormInit(init); setFormOpen(true); }
  function openEdit(s: Skill) { setFormInit(s); setFormOpen(true); }

  return (
    <ClientLayout>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#08080f" }}>

        {/* ── Top header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-6 h-[52px] flex-shrink-0 border-b"
          style={{ background: "rgba(8,8,15,0.98)", borderColor: BORDER, backdropFilter: "blur(12px)" }}>
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: GOLD_BG }}>
              <BrainCircuit className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <span className="text-[13px] font-bold text-white tracking-tight">Skills</span>
            {activeSkills.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse inline-block" />
                {activeSkills.length} active
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 bg-zinc-900/70 rounded-xl p-1 border ml-2" style={{ borderColor: BORDER }}>
            {(["mine", "browse"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                }`}>
                {t === "mine" ? (
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3 h-3" />My Skills{allMine.length > 0 && ` (${allMine.length})`}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" />Browse</span>
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {tab === "mine" && (
              <>
                {/* My Skills search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <input value={mineSearch} onChange={e => setMineSearch(e.target.value)}
                    placeholder="Search my skills..."
                    className="pl-7 pr-7 py-1.5 rounded-lg text-xs border text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors w-44"
                    style={{ background: "rgba(0,0,0,0.4)", borderColor: BORDER_MED }} />
                  {mineSearch && (
                    <button onClick={() => setMineSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-zinc-500" />
                    </button>
                  )}
                </div>
                <button onClick={() => setDnaOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:brightness-105"
                  style={{ background: GOLD_BG, color: GOLD, borderColor: GOLD_BORDER }}>
                  <Upload className="w-3.5 h-3.5" />Upload DNA
                </button>
                <button onClick={() => openCreate()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:bg-zinc-700"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa", borderColor: BORDER_MED }}>
                  <Plus className="w-3.5 h-3.5" />Build
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* MY SKILLS TAB */}
          {tab === "mine" && (
            <div className="p-6 flex flex-col gap-5 max-w-5xl">

              {/* Conflict banner */}
              <ConflictBanner conflicts={conflicts} />

              {mineQ.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
                  ))}
                </div>
              ) : allMine.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                    <BrainCircuit className="w-9 h-9" style={{ color: GOLD }} />
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1.5">No skills installed yet</h2>
                  <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-7">
                    Skills power every AI feature on the platform. Browse the store or upload your content DNA to build your first skill.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setTab("browse")}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold hover:brightness-105 transition-all"
                      style={{ background: GOLD, color: "#000" }}>
                      Browse Skill Store
                    </button>
                    <button onClick={() => setDnaOpen(true)}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold border hover:bg-zinc-800 transition-all"
                      style={{ borderColor: BORDER_MED, color: "#a1a1aa" }}>
                      Upload DNA
                    </button>
                  </div>
                </div>
              ) : filteredMine !== null ? (
                /* Search results */
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Search className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-400">{filteredMine.length} result{filteredMine.length !== 1 ? "s" : ""} for "{mineSearch}"</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMine.map(s => (
                      <SkillCard key={s.id} skill={s} mode="mine"
                        onPreview={() => setPreview(s)}
                        onToggle={() => toggleM.mutate(s.id)}
                        onEdit={() => openEdit(s)}
                        onDelete={() => deleteM.mutate(s.id)} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-7">
                  {/* Active skills */}
                  {activeSkills.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-4 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                        <p className="text-xs font-bold text-zinc-300">Active Skills</p>
                        <span className="text-[10px] text-zinc-600">{activeSkills.length} skill{activeSkills.length !== 1 ? "s" : ""} powering your AI</span>
                        <button
                          onClick={() => bulkToggleM.mutate(false)}
                          disabled={bulkToggleM.isPending}
                          className="ml-auto text-[10px] text-zinc-600 hover:text-red-400 transition-colors border rounded-lg px-2 py-0.5"
                          style={{ borderColor: BORDER }}>
                          Deactivate all
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                          {activeSkills.map(s => (
                            <SkillCard key={s.id} skill={s} mode="mine"
                              onPreview={() => setPreview(s)}
                              onToggle={() => toggleM.mutate(s.id)}
                              onEdit={() => openEdit(s)}
                              onDelete={() => deleteM.mutate(s.id)} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </section>
                  )}

                  {/* Inactive skills */}
                  {inactiveSkills.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-4 rounded-full bg-zinc-700" />
                        <p className="text-xs font-bold text-zinc-500">Inactive</p>
                        <span className="text-[10px] text-zinc-700">{inactiveSkills.length} installed but off</span>
                        <button
                          onClick={() => bulkToggleM.mutate(true)}
                          disabled={bulkToggleM.isPending}
                          className="ml-auto text-[10px] text-zinc-600 hover:text-green-400 transition-colors border rounded-lg px-2 py-0.5"
                          style={{ borderColor: BORDER }}>
                          Activate all
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                          {inactiveSkills.map(s => (
                            <SkillCard key={s.id} skill={s} mode="mine"
                              onPreview={() => setPreview(s)}
                              onToggle={() => toggleM.mutate(s.id)}
                              onEdit={() => openEdit(s)}
                              onDelete={() => deleteM.mutate(s.id)} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BROWSE TAB */}
          {tab === "browse" && (
            <BrowseTab
              skills={browseQ.data || []}
              loading={browseQ.isLoading}
              onInstall={id => { setInstallingId(id); installM.mutate(id); }}
              onUninstall={id => uninstallM.mutate(id)}
              onPreview={s => setPreview(s)}
              installingId={installingId}
            />
          )}
        </div>
      </div>

      {/* ── Overlays ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {dnaOpen && (
          <DNAOverlay
            onClose={() => setDnaOpen(false)}
            onGenerated={generated => { setDnaOpen(false); openCreate(generated); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formOpen && (
          <SkillFormOverlay
            initial={formInit}
            onClose={() => { setFormOpen(false); setFormInit(undefined); }}
            onSaved={() => { setTab("mine"); }}
          />
        )}
      </AnimatePresence>

      <SkillDrawer
        skill={preview}
        mode={tab}
        onClose={() => setPreview(null)}
        onInstall={() => { if (preview) { setInstallingId(preview.id); installM.mutate(preview.id); } }}
        onUninstall={() => { if (preview) uninstallM.mutate(preview.id); }}
        onToggle={() => { if (preview) toggleM.mutate(preview.id); }}
      />
    </ClientLayout>
  );
}
