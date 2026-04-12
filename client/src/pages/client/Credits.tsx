import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { PageTourButton } from "@/components/ui/TourGuide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Zap, TrendingUp, Star, ArrowDownCircle, ArrowUpCircle,
  Sparkles, Brain, Target, RefreshCw, Crown, ArrowLeft, Rocket
} from "lucide-react";
import { useLocation } from "wouter";

const FEATURE_ICONS: Record<string, any> = {
  ai_ideas: Sparkles,
  ai_coach: Brain,
  competitor: Target,
  ai_report: TrendingUp,
  virality: Zap,
  hashtag: Star,
};

const FEATURE_LABELS: Record<string, string> = {
  ai_ideas: "AI Content Ideas",
  ai_coach: "AI Script / Coach",
  competitor: "Competitor Analysis",
  ai_report: "Content Report",
  virality: "Virality Tester",
  hashtag: "Hashtag Suggestions",
};

const PLAN_LABELS: Record<string, string> = { free: "Tier 1 — Free", starter: "Tier 2 — $29/mo", growth: "Tier 3 — $59/mo", pro: "Tier 4 — $79/mo", elite: "Tier 5 — Elite" };
const PLAN_COLORS: Record<string, string> = { free: "text-zinc-400", starter: "text-blue-400", growth: "text-violet-400", pro: "text-emerald-400", elite: "text-[#d4b461]" };

const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 25,
    price: "$9",
    description: "Perfect for a quick top-up",
    icon: Zap,
    color: "from-blue-600/20 to-blue-500/10 border-blue-500/30",
  },
  {
    id: "growth",
    name: "Growth Pack",
    credits: 75,
    price: "$24",
    description: "Most popular — great value",
    icon: TrendingUp,
    color: "from-[#d4b461]/20 to-[#d4b461]/10 border-[#d4b461]/30",
    popular: true,
  },
  {
    id: "power",
    name: "Power Pack",
    credits: 200,
    price: "$59",
    description: "For heavy AI usage",
    icon: Crown,
    color: "from-purple-600/20 to-purple-500/10 border-purple-500/30",
  },
];

export default function Credits() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const plan = (user as any)?.plan || "free";

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/credits"],
  });

  const total = data ? data.balance.monthlyCredits + data.balance.bonusCredits : 0;
  const planAllowance = data?.planAllowance ?? 20;
  const usedPercent = planAllowance > 0 ? Math.max(0, Math.round(((planAllowance - data?.balance.monthlyCredits) / planAllowance) * 100)) : 0;

  const formatTxType = (type: string) => {
    const map: Record<string, string> = {
      monthly_reset: "Monthly Refill",
      period_reset: "Period Refill",
      bonus_added: "Credits Added",
      ai_ideas: "AI Content Ideas",
      ai_coach: "AI Coach / Script",
      competitor: "Competitor Analysis",
      ai_report: "Content Report",
      virality: "Virality Tester",
      hashtag: "Hashtag Suggestions",
    };
    return map[type] || type;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-zinc-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto" data-tour="credits-main">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            data-testid="button-credits-back"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Credits</h1>
            <p className="text-zinc-400 text-sm mt-1">Manage your AI feature credits and purchase top-ups</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PageTourButton pageKey="credits" />
          <Badge
            className={`text-sm px-3 py-1 ${plan === "pro" ? "bg-[#d4b461]/20 text-[#d4b461] border border-[#d4b461]/40" : plan === "starter" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-zinc-700/50 text-zinc-300 border border-zinc-600"}`}
            data-testid="badge-plan"
          >
            {PLAN_LABELS[plan] || plan} Plan
          </Badge>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="credits-balance">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-5">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Total Available</p>
            <p className="text-4xl font-bold text-white" data-testid="text-total-credits">{total}</p>
            <p className="text-zinc-500 text-sm mt-1">credits remaining</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-5">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Monthly Credits</p>
            <p className="text-4xl font-bold text-[#d4b461]" data-testid="text-monthly-credits">{data?.balance.monthlyCredits ?? 0}</p>
            <p className="text-zinc-500 text-sm mt-1">of {planAllowance} this month</p>
            <Progress value={100 - usedPercent} className="mt-2 h-1.5 bg-zinc-700" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-5">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Bonus Credits</p>
            <p className="text-4xl font-bold text-purple-400" data-testid="text-bonus-credits">{data?.balance.bonusCredits ?? 0}</p>
            <p className="text-zinc-500 text-sm mt-1">purchased top-ups</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature costs */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Credit Cost Per Feature</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(data?.featureCosts ?? {}).map(([key, cost]) => {
              const Icon = FEATURE_ICONS[key] || Zap;
              return (
                <div key={key} className="flex items-center gap-3 bg-zinc-800/60 rounded-lg p-3" data-testid={`feature-cost-${key}`}>
                  <div className="w-8 h-8 rounded-lg bg-[#d4b461]/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#d4b461]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{FEATURE_LABELS[key] || key}</p>
                    <p className="text-zinc-400 text-xs">{cost as number} credit{(cost as number) !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Buy Credits — Coming Soon */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Buy Extra Credits</h2>
        <p className="text-zinc-500 text-sm mb-4">Top-up packs are launching soon — enjoy free credits in the meantime.</p>
        <Card className="bg-gradient-to-br from-[#d4b461]/10 to-zinc-900 border border-[#d4b461]/20" data-testid="credits-coming-soon">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#d4b461]/10 flex items-center justify-center">
              <Rocket className="w-7 h-7 text-[#d4b461]" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Paid credit top-ups coming soon</p>
              <p className="text-zinc-400 text-sm mt-1 max-w-sm">
                We're currently on free tier — your 100 welcome credits are on us. Credit packs will be available when paid plans launch.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-1">
              {CREDIT_PACKAGES.map(pkg => (
                <div key={pkg.id} className={`rounded-xl border bg-gradient-to-br ${pkg.color} px-5 py-3 flex items-center gap-2 opacity-50 pointer-events-none select-none`}>
                  <pkg.icon className="w-4 h-4 text-[#d4b461]" />
                  <span className="text-white text-sm font-medium">{pkg.name}</span>
                  <span className="text-zinc-400 text-xs ml-1">{pkg.credits} credits — {pkg.price}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction history */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-zinc-400" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.transactions?.length ? (
            <p className="text-zinc-500 text-sm text-center py-4">No activity yet. Start using AI features to see your history.</p>
          ) : (
            <div className="space-y-2">
              {data.transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0" data-testid={`tx-${tx.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${tx.amount > 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {tx.amount > 0
                        ? <ArrowUpCircle className="w-4 h-4 text-green-400" />
                        : <ArrowDownCircle className="w-4 h-4 text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-white text-sm">{formatTxType(tx.type)}</p>
                      {tx.description && <p className="text-zinc-500 text-xs">{tx.description}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold text-sm ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </span>
                    <p className="text-zinc-600 text-xs">
                      {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA for free/starter */}
      {plan !== "pro" && plan !== "elite" && (
        <Card className="bg-gradient-to-r from-[#d4b461]/10 to-[#d4b461]/5 border border-[#d4b461]/30">
          <CardContent className="pt-5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white font-semibold">Get more credits every month</p>
              <p className="text-zinc-400 text-sm mt-0.5">
                {plan === "free" ? "Upgrade to Starter for 100 credits/month or Pro for 500 credits/month." : "Upgrade to Pro for 500 credits/month — 5× more than Starter."}
              </p>
            </div>
            <Button
              className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold shrink-0"
              onClick={() => navigate("/select-plan")}
              data-testid="button-upgrade-plan"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
