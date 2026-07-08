import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine, Copy, Check, RefreshCw, Sparkles,
  ArrowRight, RotateCcw, ChevronDown, ChevronUp,
  Instagram, Twitter, Linkedin, Hash,
} from "lucide-react";

/* ── Tokens ────────────────────────────────────────────────────── */
const GOLD        = "#d4b461";
const GOLD_BG     = "rgba(212,180,97,0.08)";
const GOLD_BORDER = "rgba(212,180,97,0.22)";
const CARD        = "rgba(16,16,26,0.92)";
const BORDER      = "rgba(255,255,255,0.06)";
const BORDER_MED  = "rgba(255,255,255,0.10)";

/* ── Config ────────────────────────────────────────────────────── */
const PLATFORMS = [
  { id: "instagram", label: "Instagram",  color: "#e1306c" },
  { id: "linkedin",  label: "LinkedIn",   color: "#0077b5" },
  { id: "twitter",   label: "X / Twitter",color: "#1da1f2" },
  { id: "facebook",  label: "Facebook",   color: "#1877f2" },
  { id: "tiktok",    label: "TikTok",     color: "#ee1d52" },
];

const TONES = ["engaging", "educational", "inspirational", "humorous", "professional", "conversational", "bold"];
const GOALS = ["saves & shares", "comments", "profile visits", "link clicks", "DMs", "brand awareness", "conversions"];

const ANGLE_COLORS: Record<string, string> = {
  "Story-driven":    "#a78bfa",
  "Tutorial":        "#60a5fa",
  "Controversy":     "#fb923c",
  "Question":        "#fbbf24",
  "Transformation":  "#4ade80",
  "Social Proof":    "#34d399",
  "Relatable":       "#e879f9",
};

interface Caption {
  angle: string;
  hookType: string;
  caption: string;
  hookLine: string;
}

/* ── Copy button ───────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={copied
        ? { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
        : { background: "rgba(255,255,255,0.04)", color: "#71717a", border: `1px solid ${BORDER_MED}` }
      }>
      {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
    </button>
  );
}

/* ── Caption card ──────────────────────────────────────────────── */
function CaptionCard({ caption, index, onRegenerate, regenerating }: {
  caption: Caption;
  index: number;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const color = ANGLE_COLORS[caption.angle] || GOLD;
  const lines = caption.caption.split("\n").length;
  const isLong = lines > 10;

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
      className="rounded-2xl border overflow-hidden" style={{ background: CARD, borderColor: BORDER_MED }}>
      {/* Top stripe */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: BORDER }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: color + "18", color }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">{caption.angle}</p>
          <p className="text-[10px] text-zinc-600">{caption.hookType}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0 items-center">
          <CopyBtn text={caption.caption} />
          <button onClick={onRegenerate} disabled={regenerating}
            className="p-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ color: "#52525b", border: `1px solid ${BORDER_MED}` }}>
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
          </button>
          {isLong && (
            <button onClick={() => setExpanded(o => !o)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "#52525b" }}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Hook line highlight */}
      <div className="px-4 py-2.5 border-b" style={{ borderColor: BORDER, background: color + "08" }}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color }}>Hook Line</p>
        <p className="text-xs font-semibold text-white leading-relaxed">"{caption.hookLine}"</p>
      </div>

      {/* Full caption */}
      <AnimatePresence initial={false}>
        {(!isLong || expanded) && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
            <pre className="px-4 py-3 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans"
              style={{ maxHeight: 320, overflowY: "auto" }}>
              {caption.caption}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
      {isLong && !expanded && (
        <button onClick={() => setExpanded(true)} className="w-full py-2 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          style={{ borderTop: `1px solid ${BORDER}` }}>
          Show full caption ({caption.caption.length} chars)
        </button>
      )}

      {/* Footer stats */}
      <div className="px-4 py-2.5 flex items-center gap-3 border-t" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.01)" }}>
        <span className="text-[10px] text-zinc-700">{caption.caption.length} chars</span>
        <span className="text-[10px] text-zinc-700">{caption.caption.split("\n").length} lines</span>
        <span className="text-[10px] text-zinc-700">
          {(caption.caption.match(/#\w+/g) || []).length} hashtags
        </span>
      </div>
    </motion.div>
  );
}

/* ── MAIN PAGE ─────────────────────────────────────────────────── */
export default function CaptionWriterPage() {
  const { toast } = useToast();
  const [topic, setTopic]       = useState("");
  const [context, setContext]   = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone]         = useState("engaging");
  const [goal, setGoal]         = useState("saves & shares");
  const [variations, setVariations] = useState(3);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);

  const generateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/ai/caption-writer", { topic, context, platform, tone, goal, variations }).then(r => r.json()),
    onSuccess: (data: { captions: Caption[] }) => setCaptions(data.captions),
    onError: (err: any) => toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
  });

  async function regenerateOne(idx: number) {
    setRegeneratingIdx(idx);
    try {
      const res = await apiRequest("POST", "/api/ai/caption-writer", { topic, context, platform, tone, goal, variations: 1 });
      const data: { captions: Caption[] } = await res.json();
      if (data.captions[0]) {
        setCaptions(prev => prev.map((c, i) => i === idx ? data.captions[0] : c));
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setRegeneratingIdx(null);
    }
  }

  const canGenerate = topic.trim().length >= 3 && !generateMutation.isPending;

  return (
    <ClientLayout>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#08080f" }}>

        {/* Header */}
        <div className="flex items-center gap-4 px-6 h-[52px] flex-shrink-0 border-b"
          style={{ background: "rgba(8,8,15,0.98)", borderColor: BORDER }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: GOLD_BG }}>
              <PenLine className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <span className="text-[13px] font-bold text-white tracking-tight">Caption Writer</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: GOLD_BG, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
              {variations} Variations
            </span>
          </div>
          {captions.length > 0 && (
            <button onClick={() => setCaptions([])}
              className="ml-auto flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">

          {/* Left — inputs */}
          <div className="w-[340px] flex-shrink-0 border-r flex flex-col gap-4 p-5 overflow-y-auto"
            style={{ borderColor: BORDER }}>

            {/* Topic */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Topic *</label>
              <Input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Morning routine that doubled my productivity"
                className="h-9 text-sm"
                style={{ background: "rgba(0,0,0,0.4)", borderColor: BORDER_MED, color: "#e4e4e7" }} />
            </div>

            {/* Context */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Extra Context</label>
              <Textarea value={context} onChange={e => setContext(e.target.value)}
                placeholder="Add any details, key points, story elements, or specific phrases to include..."
                className="min-h-[90px] text-xs resize-none"
                style={{ background: "rgba(0,0,0,0.4)", borderColor: BORDER_MED, color: "#e4e4e7" }} />
            </div>

            {/* Platform */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Platform</label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all"
                    style={platform === p.id
                      ? { background: p.color + "18", color: p.color, borderColor: p.color + "40" }
                      : { background: "rgba(255,255,255,0.03)", color: "#52525b", borderColor: BORDER }
                    }>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone + Goal */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(0,0,0,0.4)", borderColor: BORDER_MED, color: "#e4e4e7" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0f0f1a", borderColor: BORDER_MED }}>
                    {TONES.map(t => (
                      <SelectItem key={t} value={t} className="text-zinc-200 focus:bg-zinc-800 capitalize text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Goal</label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: "rgba(0,0,0,0.4)", borderColor: BORDER_MED, color: "#e4e4e7" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0f0f1a", borderColor: BORDER_MED }}>
                    {GOALS.map(g => (
                      <SelectItem key={g} value={g} className="text-zinc-200 focus:bg-zinc-800 capitalize text-xs">{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variations slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Variations</label>
                <span className="text-xs font-bold" style={{ color: GOLD }}>{variations}</span>
              </div>
              <input type="range" min={1} max={5} value={variations} onChange={e => setVariations(Number(e.target.value))}
                className="w-full accent-yellow-500 h-1.5" />
              <div className="flex justify-between mt-1">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className="text-[9px] text-zinc-700">{n}</span>
                ))}
              </div>
            </div>

            {/* Generate */}
            <button onClick={() => generateMutation.mutate()} disabled={!canGenerate}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 hover:brightness-105 mt-1"
              style={{ background: GOLD, color: "#000" }}>
              {generateMutation.isPending
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating {variations} captions...</>
                : <><Sparkles className="w-4 h-4" />Generate {variations} Caption{variations > 1 ? "s" : ""}<ArrowRight className="w-4 h-4" /></>
              }
            </button>

            {/* Quick tips */}
            <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Quick Tips</p>
              {["Be specific in your topic — 'productivity hack' → 'morning routine'",
                "Add context: key points, story beats, or quotes to include",
                "Each variation uses a different angle & hook type",
                "Regenerate individual captions without losing the rest",
              ].map(t => <p key={t} className="text-[9px] text-zinc-700 leading-relaxed mb-0.5">• {t}</p>)}
            </div>
          </div>

          {/* Right — results */}
          <div className="flex-1 overflow-y-auto p-5">
            {generateMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-full gap-5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: GOLD + "30" }} />
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: GOLD_BG }}>
                    <PenLine className="w-6 h-6 animate-pulse" style={{ color: GOLD }} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">Writing {variations} caption{variations > 1 ? "s" : ""}...</p>
                  <p className="text-zinc-500 text-sm mt-1">Different angles, hooks, and structures</p>
                </div>
              </div>
            ) : captions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                  <PenLine className="w-9 h-9" style={{ color: GOLD }} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white mb-1">Multi-angle captions, instantly</h2>
                  <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                    Each variation uses a different hook style and angle so you can pick what fits your brand best.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {["Story-driven", "Tutorial", "Controversy", "Question", "Social Proof"].map(angle => (
                    <span key={angle} className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: (ANGLE_COLORS[angle] || GOLD) + "18", color: ANGLE_COLORS[angle] || GOLD }}>
                      {angle}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-4xl">
                <AnimatePresence>
                  {captions.map((c, i) => (
                    <CaptionCard key={i} caption={c} index={i}
                      onRegenerate={() => regenerateOne(i)}
                      regenerating={regeneratingIdx === i} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
