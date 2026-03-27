import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Wand2, Undo2 } from "lucide-react";

interface Props {
  text: string;
  onChange: (text: string) => void;
  context: string;
  className?: string;
}

export default function WriteWithAI({ text, onChange, context, className = "" }: Props) {
  const [loading, setLoading] = useState(false);
  const [prev, setPrev] = useState<string | null>(null);

  const enhance = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setPrev(text);
    try {
      const result: { enhanced: string } = await apiRequest("POST", "/api/ai/enhance-text", { text, context });
      onChange(result.enhanced);
    } catch {
      setPrev(null);
    } finally {
      setLoading(false);
    }
  };

  const undo = () => {
    if (prev !== null) { onChange(prev); setPrev(null); }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={enhance}
        disabled={!text.trim() || loading}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all px-2.5 py-1 rounded-lg border border-zinc-700 hover:border-primary/40 bg-zinc-900 hover:bg-zinc-800/80"
      >
        {loading
          ? <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
          : <Wand2 className="w-3 h-3" />
        }
        {loading ? "Improving…" : "Write better with AI"}
      </button>
      {prev !== null && !loading && (
        <button
          type="button"
          onClick={undo}
          className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <Undo2 className="w-3 h-3" />Undo
        </button>
      )}
    </div>
  );
}
