import { useState } from "react";
import { Loader2, Copy, Check, Zap, Anchor, PenLine, Repeat2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuickAction {
  skillId: "hook-library" | "caption-writer" | "content-repurposer";
  label: string;
  icon: typeof Anchor;
  color: string;
  bgColor: string;
  credits: number;
}

const ACTIONS: QuickAction[] = [
  { skillId: "hook-library", label: "Hook It", icon: Anchor, color: "#60a5fa", bgColor: "rgba(96,165,250,0.12)", credits: 1 },
  { skillId: "caption-writer", label: "Caption", icon: PenLine, color: "#4ade80", bgColor: "rgba(74,222,128,0.12)", credits: 1 },
  { skillId: "content-repurposer", label: "Repurpose", icon: Repeat2, color: "#f472b6", bgColor: "rgba(244,114,182,0.12)", credits: 2 },
];

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function QuickResult({ skillId, data }: { skillId: string; data: any }) {
  if (skillId === "hook-library") {
    const hooks: any[] = data.hooks ?? [];
    return (
      <div className="space-y-2">
        {hooks.slice(0, 3).map((h: any, i: number) => (
          <div key={i} className="flex items-start gap-2 rounded-lg bg-blue-500/5 border border-blue-500/15 px-3 py-2">
            <p className="text-xs text-foreground flex-1 leading-snug">"{h.text}"</p>
            <CopyLine text={h.text} />
          </div>
        ))}
      </div>
    );
  }

  if (skillId === "caption-writer") {
    const captions: any[] = data.captions ?? [];
    return (
      <div className="space-y-2">
        {captions.map((c: any, i: number) => (
          <div key={i} className="rounded-lg bg-green-500/5 border border-green-500/15 px-3 py-2">
            <div className="flex items-start gap-2">
              <p className="text-xs text-foreground flex-1 leading-relaxed whitespace-pre-wrap">{c.text}</p>
              <CopyLine text={c.text} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 capitalize">{c.style}</p>
          </div>
        ))}
      </div>
    );
  }

  if (skillId === "content-repurposer") {
    const items: any[] = data.repurposed ?? [];
    return (
      <div className="space-y-2">
        {items.slice(0, 3).map((r: any, i: number) => (
          <div key={i} className="rounded-lg bg-pink-500/5 border border-pink-500/15 px-3 py-2">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-[9px] font-bold text-pink-400 mb-0.5">{r.platform} · {r.format}</p>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{r.content}</p>
              </div>
              <CopyLine text={r.content} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

interface SkillQuickBarProps {
  topic: string;
  content?: string;
}

export default function SkillQuickBar({ topic, content }: SkillQuickBarProps) {
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const run = async (action: QuickAction) => {
    if (loading) return;

    // Toggle off if already showing
    if (activeSkill === action.skillId && results[action.skillId]) {
      setActiveSkill(null);
      return;
    }

    // Use cached result
    if (results[action.skillId]) {
      setActiveSkill(action.skillId);
      return;
    }

    setLoading(action.skillId);
    setActiveSkill(action.skillId);

    const input = action.skillId === "content-repurposer"
      ? (content || topic)
      : topic;

    try {
      const res = await apiRequest("POST", "/api/skills/run", { skillId: action.skillId, input });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 402) {
          toast({ title: "Not enough credits", description: `Need ${action.credits} credit${action.credits > 1 ? "s" : ""}`, variant: "destructive" });
        } else {
          toast({ title: "Skill failed", description: err.message, variant: "destructive" });
        }
        setActiveSkill(null);
        return;
      }
      const data = await res.json();
      setResults(r => ({ ...r, [action.skillId]: data }));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setActiveSkill(null);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      {/* Action pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Zap className="w-3 h-3 text-muted-foreground shrink-0" />
        {ACTIONS.map(action => {
          const Icon = action.icon;
          const isActive = activeSkill === action.skillId;
          const isLoading = loading === action.skillId;
          return (
            <button
              key={action.skillId}
              onClick={() => run(action)}
              disabled={!!loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border disabled:opacity-50"
              style={{
                background: isActive ? action.bgColor : "transparent",
                borderColor: isActive ? action.color + "60" : "rgba(255,255,255,0.08)",
                color: isActive ? action.color : "rgba(255,255,255,0.4)",
              }}
            >
              {isLoading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Icon className="w-3 h-3" />
              }
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Result area */}
      <AnimatePresence>
        {activeSkill && results[activeSkill] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <QuickResult skillId={activeSkill} data={results[activeSkill]} />
              {results[activeSkill]?.creditsUsed && (
                <p className="text-[9px] text-muted-foreground mt-2 text-right">{results[activeSkill].creditsUsed} credit{results[activeSkill].creditsUsed > 1 ? "s" : ""} used</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
