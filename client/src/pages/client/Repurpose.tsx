import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat2, Sparkles, Copy, Check, RefreshCw,
  Instagram, Youtube, Linkedin, Twitter,
  Mail, Smartphone, ChevronDown,
  Zap, ArrowRight, FileText,
} from "lucide-react";

/* ── Tokens ────────────────────────────────────────────────────── */
const GOLD        = "#d4b461";
const GOLD_BG     = "rgba(212,180,97,0.08)";
const GOLD_BORDER = "rgba(212,180,97,0.22)";
const CARD        = "rgba(16,16,26,0.92)";
const BORDER      = "rgba(255,255,255,0.06)";
const BORDER_MED  = "rgba(255,255,255,0.10)";
const SURFACE     = "rgba(10,10,18,0.98)";

/* ── Platform config ───────────────────────────────────────────── */
const PLATFORMS = [
  { id: "instagram", label: "Instagram",  icon: "📸", color: "#e1306c", bg: "rgba(225,48,108,0.12)"  },
  { id: "twitter",   label: "X / Twitter",icon: "🐦", color: "#1da1f2", bg: "rgba(29,161,242,0.12)"  },
  { id: "linkedin",  label: "LinkedIn",   icon: "💼", color: "#0077b5", bg: "rgba(0,119,181,0.12)"   },
  { id: "youtube",   label: "Shorts Script",icon: "🎬",color: "#ff4444", bg: "rgba(255,68,68,0.12)"  },
  { id: "email",     label: "Email",      icon: "📧", color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  { id: "tiktok",    label: "TikTok / Reel", icon: "🎥", color: "#ee1d52", bg: "rgba(238,29,82,0.12)" },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

interface RepurposeResult {
  platform: PlatformId;
  label: string;
  icon: string;
  content: string;
  error?: boolean;
}

/* ── Copy button ───────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={copied
        ? { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
        : { background: "rgba(255,255,255,0.04)", color: "#71717a", border: `1px solid ${BORDER_MED}` }
      }>
      {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
    </button>
  );
}

/* ── Result card ───────────────────────────────────────────────── */
function ResultCard({ result, onRegenerate, regenerating }: {
  result: RepurposeResult;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const plat = PLATFORMS.find(p => p.id === result.platform);
  const [expanded, setExpanded] = useState(true);
  const lines = result.content.split("\n").length;
  const isLong = lines > 12;

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden" style={{ background: CARD, borderColor: BORDER_MED }}>
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: BORDER }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: plat?.bg || GOLD_BG }}>
          {result.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">{result.label}</p>
          {!result.error && (
            <p className="text-[10px] text-zinc-600">{result.content.length} chars · {lines} lines</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!result.error && <CopyBtn text={result.content} />}
          <button onClick={onRegenerate} disabled={regenerating}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.04)", color: "#71717a", border: `1px solid ${BORDER_MED}` }}>
            <RefreshCw className={`w-3 h-3 ${regenerating ? "animate-spin" : ""}`} />
          </button>
          {isLong && (
            <button onClick={() => setExpanded(o => !o)}
              className="p-1.5 rounded-lg transition-all hover:bg-white/5" style={{ color: "#52525b" }}>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {(!isLong || expanded) && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            style={{ overflow: "hidden" }}>
            {result.error ? (
              <div className="p-4 text-xs text-red-400 flex items-center gap-2">
                <span>Generation failed for this platform.</span>
                <button onClick={onRegenerate} className="underline hover:text-red-300">Retry</button>
              </div>
            ) : (
              <pre className="p-4 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans" style={{ maxHeight: 400, overflowY: "auto" }}>
                {result.content}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {isLong && !expanded && (
        <button onClick={() => setExpanded(true)} className="w-full py-2 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          style={{ borderTop: `1px solid ${BORDER}` }}>
          Show full content
        </button>
      )}
    </motion.div>
  );
}

/* ── Tone selector ─────────────────────────────────────────────── */
const TONES = [
  { id: "match",        label: "Match original", desc: "Same tone as input"     },
  { id: "casual",       label: "Casual",         desc: "Conversational, warm"   },
  { id: "professional", label: "Professional",   desc: "Authoritative, polished" },
] as const;

/* ── MAIN PAGE ─────────────────────────────────────────────────── */
export default function RepurposePage() {
  const { toast } = useToast();
  const [content, setContent]       = useState("");
  const [selected, setSelected]     = useState<Set<PlatformId>>(new Set(["instagram", "twitter", "linkedin"]));
  const [tone, setTone]             = useState<string>("match");
  const [results, setResults]       = useState<RepurposeResult[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  function togglePlatform(id: PlatformId) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  }

  const repurposeMutation = useMutation({
    mutationFn: (platforms: PlatformId[]) =>
      apiRequest("POST", "/api/ai/repurpose", { content, platforms, tone }).then(r => r.json()),
    onSuccess: (data: { results: RepurposeResult[] }) => {
      setResults(data.results);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  async function regenerateSingle(platform: PlatformId) {
    setRegeneratingId(platform);
    try {
      const res = await apiRequest("POST", "/api/ai/repurpose", { content, platforms: [platform], tone });
      const data: { results: RepurposeResult[] } = await res.json();
      if (data.results[0]) {
        setResults(prev => prev.map(r => r.platform === platform ? data.results[0] : r));
      }
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegeneratingId(null);
    }
  }

  const canRun = content.trim().length >= 20 && !repurposeMutation.isPending;

  return (
    <ClientLayout>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#08080f" }}>

        {/* Header */}
        <div className="flex items-center gap-4 px-6 h-[52px] flex-shrink-0 border-b"
          style={{ background: "rgba(8,8,15,0.98)", borderColor: BORDER }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: GOLD_BG }}>
              <Repeat2 className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <span className="text-[13px] font-bold text-white tracking-tight">Content Repurposer</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: GOLD_BG, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
              AI
            </span>
          </div>
          {results.length > 0 && (
            <span className="ml-auto text-[10px] text-zinc-600">
              {results.filter(r => !r.error).length} versions generated
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">

          {/* Left panel — input */}
          <div className="w-[380px] flex-shrink-0 flex flex-col border-r p-5 gap-5 overflow-y-auto"
            style={{ borderColor: BORDER }}>

            {/* Content input */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                Your Content
              </label>
              <div className="relative">
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={`Paste any content to repurpose:\n• A YouTube script\n• A blog post\n• A tweet or thread\n• A voice memo transcript\n• A raw idea or outline`}
                  className="min-h-[220px] text-sm resize-none leading-relaxed font-mono"
                  style={{ background: "rgba(0,0,0,0.4)", borderColor: BORDER_MED, color: "#e4e4e7" }}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-zinc-700 font-mono">{content.length} chars</span>
                  {content.length > 0 && (
                    <button onClick={() => setContent("")} className="text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors">Clear</button>
                  )}
                </div>
              </div>
            </div>

            {/* Platform selector */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                Target Platforms
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(p => {
                  const active = selected.has(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePlatform(p.id)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left"
                      style={active
                        ? { background: p.bg, borderColor: p.color + "55", color: p.color }
                        : { background: "rgba(255,255,255,0.025)", borderColor: BORDER, color: "#52525b" }
                      }>
                      <span className="text-base">{p.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{p.label}</span>
                      {active && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                Output Tone
              </label>
              <div className="flex flex-col gap-1.5">
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-left"
                    style={tone === t.id
                      ? { background: GOLD_BG, borderColor: GOLD_BORDER, color: GOLD }
                      : { background: "rgba(255,255,255,0.025)", borderColor: BORDER, color: "#52525b" }
                    }>
                    <div className={`w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center`}
                      style={tone === t.id ? { background: GOLD, borderColor: GOLD } : { borderColor: "#52525b" }}>
                      {tone === t.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{t.label}</p>
                      <p className="text-[10px] opacity-70">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Repurpose button */}
            <button
              onClick={() => repurposeMutation.mutate([...selected] as PlatformId[])}
              disabled={!canRun}
              className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 hover:brightness-105"
              style={{ background: GOLD, color: "#000" }}
            >
              {repurposeMutation.isPending
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Repurposing {selected.size} platforms...</>
                : <><Repeat2 className="w-4 h-4" />Repurpose to {selected.size} Platform{selected.size !== 1 ? "s" : ""}<ArrowRight className="w-4 h-4" /></>
              }
            </button>

            {/* Tips */}
            <div className="rounded-xl border p-3.5" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Tips</p>
              {[
                "Longer input = better output. Full scripts work best.",
                "Select only platforms you actually post on.",
                "Each output is platform-native — not just copied.",
                "Regenerate individual platforms without re-running all.",
              ].map(t => <p key={t} className="text-[10px] text-zinc-700 leading-relaxed">• {t}</p>)}
            </div>
          </div>

          {/* Right panel — results */}
          <div className="flex-1 overflow-y-auto p-5">
            {repurposeMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-full gap-5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: GOLD + "30" }} />
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: GOLD_BG }}>
                    <Repeat2 className="w-6 h-6 animate-pulse" style={{ color: GOLD }} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">Repurposing your content...</p>
                  <p className="text-zinc-500 text-sm mt-1">Generating {selected.size} platform-native versions</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  {[...selected].map(id => {
                    const p = PLATFORMS.find(x => x.id === id)!;
                    return (
                      <motion.span key={id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5"
                        style={{ background: p.bg, color: p.color }}>
                        {p.icon} {p.label}
                      </motion.span>
                    );
                  })}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                  <Repeat2 className="w-9 h-9" style={{ color: GOLD }} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white mb-1">One piece. Many platforms.</h2>
                  <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
                    Paste any content on the left, select platforms, and get platform-native versions in seconds.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {PLATFORMS.map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: p.bg }}>
                      <span className="text-sm">{p.icon}</span>
                      <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-5xl">
                <AnimatePresence>
                  {results.map(r => (
                    <ResultCard
                      key={r.platform}
                      result={r}
                      onRegenerate={() => regenerateSingle(r.platform as PlatformId)}
                      regenerating={regeneratingId === r.platform}
                    />
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
