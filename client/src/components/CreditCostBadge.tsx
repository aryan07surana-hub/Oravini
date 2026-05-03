import { Zap } from "lucide-react";

const LEVEL_STYLES = {
  light:  { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.25)",  color: "#4ade80" },
  medium: { bg: "rgba(212,180,97,0.1)", border: "rgba(212,180,97,0.25)", color: "#d4b461" },
  heavy:  { bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)",  color: "#f87171" },
};

interface CreditCostBadgeProps {
  cost: number;
  level?: "light" | "medium" | "heavy";
  className?: string;
}

export default function CreditCostBadge({ cost, level = "light", className = "" }: CreditCostBadgeProps) {
  const s = LEVEL_STYLES[level];
  return (
    <span
      data-testid="credit-cost-badge"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      <Zap className="w-2.5 h-2.5" />
      {cost} credit{cost !== 1 ? "s" : ""}
    </span>
  );
}
