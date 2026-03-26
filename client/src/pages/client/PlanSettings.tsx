import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, ArrowUpRight, CheckCircle2, Lock } from "lucide-react";

const WHOP_LINK = "https://whop.com/brandversee";

const PLANS = [
  {
    slug: "free",
    name: "Tier 1",
    subtitle: "Free Community",
    price: "Free",
    period: "",
    credits: "10 credits / day",
    color: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)",
    accentColor: "rgba(255,255,255,0.5)",
    features: ["Group chat community access", "Free resources & lead magnets", "10 AI credits per day", "Basic content ideas", "Partial audit preview"],
  },
  {
    slug: "starter",
    name: "Tier 2",
    subtitle: "Starter",
    price: "$29",
    period: "/mo",
    credits: "50 credits / week",
    color: "rgba(99,102,241,0.06)",
    border: "rgba(99,102,241,0.25)",
    accentColor: "#818cf8",
    features: ["Everything in Tier 1", "50 AI credits per week", "Full audit access", "AI Content Ideas", "Carousel Studio", "Caption Studio"],
  },
  {
    slug: "growth",
    name: "Tier 3",
    subtitle: "Growth",
    price: "$59",
    period: "/mo",
    credits: "200 credits / month",
    color: "rgba(212,180,97,0.06)",
    border: "rgba(212,180,97,0.35)",
    accentColor: "#d4b461",
    features: ["Everything in Tier 2", "200 AI credits/month", "No watermarks", "Advanced analytics insights", "Priority processing", "Competitor Intelligence"],
    highlight: true,
  },
  {
    slug: "pro",
    name: "Tier 4",
    subtitle: "Pro",
    price: "$79",
    period: "/mo",
    credits: "500 credits / month",
    color: "rgba(52,211,153,0.05)",
    border: "rgba(52,211,153,0.22)",
    accentColor: "#34d399",
    features: ["Everything in Tier 3", "500 AI credits/month", "AI Video Editor", "DM Tracker", "Full AI Content Coach", "Direct team messaging"],
  },
  {
    slug: "elite",
    name: "Tier 5",
    subtitle: "Work With Us",
    price: "Apply",
    period: "",
    credits: "Unlimited",
    color: "rgba(212,180,97,0.07)",
    border: "rgba(212,180,97,0.40)",
    accentColor: "#d4b461",
    features: ["Unlimited AI credits", "Done-with-you strategy", "Direct team collaboration", "Priority 1-on-1 support", "Full system access", "High-level growth guidance"],
  },
];

const PLAN_ORDER = ["free", "starter", "growth", "pro", "elite"];

const PLAN_LABELS: Record<string, string> = {
  free: "Free Community",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  elite: "Elite",
};

export default function PlanSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentPlan = (user as any)?.plan || "free";
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);

  const handleUpgrade = (targetSlug: string, targetName: string) => {
    if (targetSlug === "elite") {
      window.location.href = "/apply";
      return;
    }
    window.open(WHOP_LINK, "_blank");
    toast({
      title: `Upgrading to ${targetName}`,
      description: "You're being redirected to Whop to complete your purchase. Come back after payment to enjoy your new plan.",
    });
  };

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.25)" }}>
              <Crown className="w-4 h-4" style={{ color: "#d4b461" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Your Current Plan</h1>
              <p className="text-xs text-muted-foreground">Manage and upgrade your Brandverse subscription</p>
            </div>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="mb-10 rounded-2xl p-6" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.25)" }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Active Plan</p>
              <h2 className="text-2xl font-black text-white tracking-tight">{PLANS[currentIdx]?.name} — {PLAN_LABELS[currentPlan]}</h2>
              <p className="text-sm text-muted-foreground mt-1">{PLANS[currentIdx]?.price}{PLANS[currentIdx]?.period}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(212,180,97,0.15)", border: "1px solid rgba(212,180,97,0.3)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "#d4b461" }} />
              <span className="text-sm font-semibold" style={{ color: "#d4b461" }}>{PLANS[currentIdx]?.credits}</span>
            </div>
          </div>

          {currentPlan !== "elite" && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-xs text-muted-foreground mb-3">What's included in your plan:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLANS[currentIdx]?.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#d4b461" }} />
                    <span className="text-xs text-zinc-300">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* All Plans */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white mb-1">All Plans</h3>
          <p className="text-xs text-muted-foreground">Upgrade anytime to unlock more credits and features.</p>
        </div>

        <div className="flex flex-col gap-3">
          {PLANS.map((plan, i) => {
            const isCurrent = plan.slug === currentPlan;
            const isUpgrade = i > currentIdx;
            const isDowngrade = i < currentIdx;

            return (
              <div
                key={plan.slug}
                data-testid={`plan-card-${plan.slug}`}
                className="rounded-xl p-5 flex items-center gap-5 transition-all duration-200"
                style={{
                  background: isCurrent ? plan.color : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isCurrent ? plan.border : "rgba(255,255,255,0.06)"}`,
                  opacity: isDowngrade ? 0.45 : 1,
                }}
              >
                {/* Plan info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-white">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">—</span>
                    <span className="text-xs text-muted-foreground">{plan.subtitle}</span>
                    {isCurrent && (
                      <Badge className="text-[10px] h-4 px-1.5 border-0" style={{ background: "rgba(212,180,97,0.18)", color: "#d4b461" }}>
                        Current
                      </Badge>
                    )}
                    {plan.highlight && !isCurrent && isUpgrade && (
                      <Badge className="text-[10px] h-4 px-1.5 border-0 bg-emerald-500/15 text-emerald-400">
                        Best Value
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black" style={{ color: isCurrent ? plan.accentColor : "rgba(255,255,255,0.6)" }}>
                      {plan.price}<span className="text-xs font-normal text-muted-foreground">{plan.period}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{plan.credits}</span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {isCurrent ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(212,180,97,0.12)" }}>
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#d4b461" }} />
                      <span className="text-xs font-semibold" style={{ color: "#d4b461" }}>Active</span>
                    </div>
                  ) : isDowngrade ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <Lock className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="text-xs text-zinc-600">Downgrade</span>
                    </div>
                  ) : (
                    <button
                      data-testid={`upgrade-btn-${plan.slug}`}
                      onClick={() => handleUpgrade(plan.slug, `${plan.name} ${plan.subtitle}`)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{
                        background: plan.slug === "elite" ? "rgba(212,180,97,0.15)" : `${plan.accentColor}18`,
                        border: `1px solid ${plan.accentColor}40`,
                        color: plan.accentColor,
                      }}
                    >
                      Upgrade
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Payments processed securely via Whop · Contact support to downgrade
        </p>
      </div>
    </ClientLayout>
  );
}
