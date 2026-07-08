import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Zap, Copy, Check, Loader2, ChevronDown, ExternalLink } from "lucide-react";
import { useActiveSkills } from "@/hooks/use-active-skills";
import { apiRequest } from "@/lib/queryClient";
import type { Skill } from "@/lib/skills";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";

// ── Output renderers ──────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1"
    >
      {copied ? <><Check className="w-3 h-3 text-green-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
    </button>
  );
}

function HooksOutput({ data }: { data: any }) {
  const hooks: any[] = data.hooks ?? [];
  return (
    <div className="space-y-3">
      {hooks.map((h: any, i: number) => (
        <div key={i} className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{h.style}</span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">"{h.text}"</p>
          {h.why && <p className="text-[10px] text-muted-foreground mt-1">{h.why}</p>}
          <CopyBtn text={h.text} />
        </div>
      ))}
    </div>
  );
}

function CaptionsOutput({ data }: { data: any }) {
  const captions: any[] = data.captions ?? [];
  return (
    <div className="space-y-3">
      {captions.map((c: any, i: number) => (
        <div key={i} className="rounded-xl border border-border bg-muted/20 p-3">
          <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{c.style}</span>
          <p className="text-xs text-foreground leading-relaxed mt-1 whitespace-pre-wrap">{c.text}</p>
          {c.cta && <p className="text-[10px] text-blue-400 mt-1">CTA: {c.cta}</p>}
          <CopyBtn text={c.text} />
        </div>
      ))}
    </div>
  );
}

function RepurposedOutput({ data }: { data: any }) {
  const items: any[] = data.repurposed ?? [];
  return (
    <div className="space-y-3">
      {items.map((r: any, i: number) => (
        <div key={i} className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{r.platform} · {r.format}</span>
          </div>
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{r.content}</p>
          {r.tip && <p className="text-[10px] text-amber-400 mt-1">💡 {r.tip}</p>}
          <CopyBtn text={r.content} />
        </div>
      ))}
    </div>
  );
}

function AnalysisOutput({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.score != null && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
          <div className="text-center">
            <p className="text-2xl font-black" style={{ color: data.score >= 70 ? "#4ade80" : data.score >= 40 ? GOLD : "#f87171" }}>
              {data.score}
            </p>
            <p className="text-[9px] text-muted-foreground">SCORE</p>
          </div>
          <div className="flex-1 space-y-1">
            {data.retentionRisk && (
              <p className="text-[10px]">Retention risk: <span className={`font-bold ${data.retentionRisk === "low" ? "text-green-400" : data.retentionRisk === "medium" ? "text-amber-400" : "text-red-400"}`}>{data.retentionRisk}</span></p>
            )}
            {data.hookStrength != null && <p className="text-[10px] text-muted-foreground">Hook strength: {data.hookStrength}/10</p>}
          </div>
        </div>
      )}
      {data.rewrittenHook && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-[9px] font-black text-amber-400 tracking-wider mb-1">IMPROVED HOOK</p>
          <p className="text-sm font-semibold text-foreground">"{data.rewrittenHook}"</p>
          <CopyBtn text={data.rewrittenHook} />
        </div>
      )}
      {data.strengths?.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-green-400 tracking-wider mb-1">STRENGTHS</p>
          {data.strengths.map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground">✓ {s}</p>)}
        </div>
      )}
      {data.improvements?.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-red-400 tracking-wider mb-1 mt-2">IMPROVEMENTS</p>
          {data.improvements.map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground">→ {s}</p>)}
        </div>
      )}
      {/* Niche intelligence fields */}
      {data.painPoints?.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-red-400 tracking-wider mb-1">PAIN POINTS</p>
          {data.painPoints.map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground">• {s}</p>)}
        </div>
      )}
      {data.trendingAngles?.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-blue-400 tracking-wider mb-1 mt-2">TRENDING ANGLES</p>
          {data.trendingAngles.map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground">• {s}</p>)}
        </div>
      )}
      {data.contentGaps?.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-amber-400 tracking-wider mb-1 mt-2">CONTENT GAPS</p>
          {data.contentGaps.map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground">• {s}</p>)}
        </div>
      )}
      {data.audienceInsight && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 mt-2">
          <p className="text-[9px] font-black text-muted-foreground tracking-wider mb-1">AUDIENCE INSIGHT</p>
          <p className="text-xs text-foreground leading-relaxed">{data.audienceInsight}</p>
        </div>
      )}
      {data.topHooks?.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-green-400 tracking-wider mb-1 mt-2">TOP HOOK ANGLES</p>
          {data.topHooks.map((s: string, i: number) => (
            <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
              <span className="text-green-400 shrink-0">→</span> {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanOutput({ data }: { data: any }) {
  const plan: any[] = data.editingPlan ?? [];
  return (
    <div className="space-y-3">
      {data.hookEdit && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-[9px] font-black text-amber-400 tracking-wider mb-1">HOOK EDIT</p>
          <p className="text-xs text-foreground">{data.hookEdit}</p>
        </div>
      )}
      {plan.map((step: any, i: number) => (
        <div key={i} className="flex gap-2.5">
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[9px] font-black text-muted-foreground">{i + 1}</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground">{step.timestamp}</p>
            <p className="text-xs text-foreground">{step.action}</p>
            {step.reason && <p className="text-[10px] text-muted-foreground">{step.reason}</p>}
          </div>
        </div>
      ))}
      {data.pacing && (
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-[9px] font-black text-muted-foreground tracking-wider mb-1">PACING</p>
          <p className="text-xs text-foreground">{data.pacing}</p>
        </div>
      )}
      {data.overlays?.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-blue-400 tracking-wider mb-1">TEXT OVERLAYS</p>
          {data.overlays.map((o: string, i: number) => <p key={i} className="text-xs text-muted-foreground">• {o}</p>)}
        </div>
      )}
      {data.music && (
        <p className="text-xs text-muted-foreground">🎵 Music: {data.music}</p>
      )}
    </div>
  );
}

function SkillOutput({ skill, data }: { skill: Skill; data: any }) {
  switch (skill.outputType) {
    case "hooks": return <HooksOutput data={data} />;
    case "captions": return <CaptionsOutput data={data} />;
    case "repurposed": return <RepurposedOutput data={data} />;
    case "analysis": return <AnalysisOutput data={data} />;
    case "plan": return <PlanOutput data={data} />;
  }
}

// ── Single skill card inside the panel ───────────────────────────────────────

function SkillCard({ skill }: { skill: Skill }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();

  const run = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await apiRequest("POST", "/api/skills/run", { skillId: skill.id, input: input.trim() });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 402) {
          toast({ title: "Not enough credits", description: `Need ${skill.credits} credit${skill.credits > 1 ? "s" : ""}`, variant: "destructive" });
        } else {
          setError(err.message || "Something went wrong");
        }
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: skill.bgColor }}>
          <Zap className="w-3.5 h-3.5" style={{ color: skill.color }} />
        </div>
        <span className="text-sm font-bold text-foreground flex-1 text-left">{skill.label}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: skill.bgColor, color: skill.color }}>
          {skill.credits}cr
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{skill.inputLabel}</label>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={skill.inputPlaceholder}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
                />
              </div>
              <button
                onClick={run}
                disabled={!input.trim() || loading}
                className="w-full h-9 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: GOLD, color: "#000" }}
              >
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</span> : `Run ${skill.label}`}
              </button>

              {error && <p className="text-xs text-red-400 text-center">{error}</p>}

              {result && (
                <div className="pt-1 border-t border-border">
                  <SkillOutput skill={skill} data={result} />
                  {result.creditsUsed && (
                    <p className="text-[9px] text-muted-foreground mt-3 text-right">{result.creditsUsed} credit{result.creditsUsed > 1 ? "s" : ""} used</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main floating panel ───────────────────────────────────────────────────────

export default function SkillPanel() {
  const skills = useActiveSkills();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!skills.length) return null;

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl flex flex-col"
          >
            {/* Panel header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-foreground">Active Skills</p>
                <p className="text-[10px] text-muted-foreground">{skills.length} skill{skills.length > 1 ? "s" : ""} ready on this page</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg hover:bg-muted/40 flex items-center justify-center transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Skill cards */}
            <div className="p-3 space-y-2 overflow-y-auto">
              {skills.map(skill => <SkillCard key={skill.id} skill={skill} />)}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border shrink-0">
              <a href="/skills" className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink className="w-3 h-3" />
                Manage skills in Skills Store
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger chip */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg font-bold text-sm transition-all hover:scale-105 active:scale-95"
        style={{ background: GOLD, color: "#000" }}
      >
        <Zap className="w-4 h-4" />
        {skills.length} Skill{skills.length > 1 ? "s" : ""} Active
      </button>
    </div>
  );
}
