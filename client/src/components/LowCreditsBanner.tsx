import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Zap, X, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getPlanCredits, getLowCreditThreshold } from "@shared/planConfig";

const GOLD = "#d4b461";

export default function LowCreditsBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery<any>({
    queryKey: ["/api/credits"],
    staleTime: 60000,
  });

  if (dismissed) return null;
  if (!data || !user) return null;

  const plan = (user as any)?.plan ?? "free";
  if (plan === "elite") return null;

  const total: number = (data.balance?.monthlyCredits ?? 0) + (data.balance?.bonusCredits ?? 0);
  const threshold = getLowCreditThreshold(plan);
  const planMax = getPlanCredits(plan);

  if (total > threshold) return null;

  const pct = Math.round((total / planMax) * 100);
  const isEmpty = total === 0;

  return (
    <div
      data-testid="low-credits-banner"
      style={{
        background: isEmpty
          ? "linear-gradient(90deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)"
          : "linear-gradient(90deg, rgba(212,180,97,0.1) 0%, rgba(212,180,97,0.04) 100%)",
        borderBottom: `1px solid ${isEmpty ? "rgba(239,68,68,0.2)" : "rgba(212,180,97,0.2)"}`,
      }}
      className="w-full px-4 py-2.5 flex items-center gap-3"
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: isEmpty ? "rgba(239,68,68,0.15)" : "rgba(212,180,97,0.12)" }}
      >
        <Zap className="w-3.5 h-3.5" style={{ color: isEmpty ? "#ef4444" : GOLD }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: isEmpty ? "#ef4444" : GOLD }}>
          {isEmpty ? "No credits remaining" : `Only ${total} credits left (${pct}% of your ${planMax}/mo plan)`}
        </p>
        <p className="text-[10px] text-zinc-500 mt-0.5">
          {isEmpty
            ? "You've used all your credits for this period. Upgrade or top up to keep using AI tools."
            : "You're running low. Upgrade your plan or buy bonus credits to stay uninterrupted."}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/settings/plan">
          <button
            data-testid="low-credits-banner-upgrade"
            className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35`, color: GOLD }}
          >
            <ArrowUpRight className="w-3 h-3" />
            Upgrade
          </button>
        </Link>
        <Link href="/credits">
          <button
            data-testid="low-credits-banner-topup"
            className="text-[11px] font-medium text-zinc-400 hover:text-white transition-colors px-2 py-1.5"
          >
            Top up
          </button>
        </Link>
        <button
          data-testid="low-credits-banner-dismiss"
          onClick={() => setDismissed(true)}
          className="text-zinc-600 hover:text-zinc-400 transition-colors p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
