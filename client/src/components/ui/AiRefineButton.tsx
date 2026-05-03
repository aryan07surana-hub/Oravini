import { useState } from "react";
import { Sparkles, Check, X, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AiRefineButtonProps {
  text: string;
  onAccept: (refined: string) => void;
  context?: string;
  minLength?: number;
  className?: string;
}

export function AiRefineButton({ text, onAccept, context, minLength = 8, className = "" }: AiRefineButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [refined, setRefined] = useState<string | null>(null);
  const [original, setOriginal] = useState<string>("");

  const show = text.trim().length >= minLength && !refined;

  async function refine() {
    setLoading(true);
    setOriginal(text);
    try {
      const data = await apiRequest("POST", "/api/ai/refine-text", { text: text.trim(), context });
      setRefined(data.refined);
    } catch {
      toast({ title: "Couldn't refine right now", description: "Try again in a moment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function accept() {
    if (refined) { onAccept(refined); setRefined(null); }
  }

  function dismiss() {
    setRefined(null);
    setOriginal("");
  }

  if (refined) return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="rounded-xl border px-3 py-2 text-sm" style={{ background: "rgba(212,180,97,0.06)", borderColor: "rgba(212,180,97,0.3)" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3" style={{ color: "#d4b461" }} />
          <span className="text-[10px] font-semibold" style={{ color: "#d4b461" }}>AI Refined</span>
        </div>
        <p className="text-xs text-white leading-relaxed">{refined}</p>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={accept} data-testid="button-accept-refined"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-black transition-all"
            style={{ background: "#d4b461" }}>
            <Check className="w-3 h-3" /> Use this
          </button>
          <button onClick={dismiss} data-testid="button-dismiss-refined"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/10 text-muted-foreground hover:text-white transition-all">
            <X className="w-3 h-3" /> Keep original
          </button>
          <button onClick={refine} disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-white transition-all disabled:opacity-40">
            <RefreshCw className="w-3 h-3" /> Try again
          </button>
        </div>
      </div>
    </div>
  );

  if (!show) return null;

  return (
    <button onClick={refine} disabled={loading} data-testid="button-refine-ai"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all disabled:opacity-50 ${className}`}
      style={{ borderColor: "rgba(212,180,97,0.25)", color: loading ? "#d4b461" : "rgba(212,180,97,0.75)", background: "rgba(212,180,97,0.06)" }}>
      {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {loading ? "Refining…" : "✨ Refine with AI"}
    </button>
  );
}
