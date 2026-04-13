import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, ArrowUpRight, CheckCircle2, Lock, ChevronRight, Settings, Rocket } from "lucide-react";

const PLANS = [
  {
    slug: "free",
    name: "Tier 1",
    subtitle: "Free Community",
    price: "Free",
    period: "",
    credits: "5 credits / day",
    accentColor: "rgba(255,255,255,0.6)",
    cardBg: "rgba(255,255,255,0.03)",
    cardBorder: "rgba(255,255,255,0.08)",
    features: ["Group chat community access", "Free resources & lead magnets", "5 AI credits per day", "Access to all AI tools", "Basic content ideas", "Partial audit preview"],
  },
  {
    slug: "starter",
    name: "Tier 2",
    subtitle: "Starter",
    price: "$29",
    period: "/mo",
    credits: "150 credits / month",
    accentColor: "#818cf8",
    cardBg: "rgba(99,102,241,0.06)",
    cardBorder: "rgba(99,102,241,0.25)",
    features: ["Everything in Tier 1", "150 AI credits per month", "Full audit access", "AI Content Ideas", "Carousel Studio", "Caption Studio", "Story Generator", "Lead Magnet Generator"],
  },
  {
    slug: "growth",
    name: "Tier 3",
    subtitle: "Growth",
    price: "$59",
    period: "/mo",
    credits: "350 credits / month",
    accentColor: "#d4b461",
    cardBg: "rgba(212,180,97,0.07)",
    cardBorder: "rgba(212,180,97,0.35)",
    highlight: true,
    features: ["Everything in Tier 2", "350 AI credits/month", "No watermarks", "Competitor Intelligence (10 credits)", "AI Content Report (8 credits)", "Brand Kit Builder", "ICP Builder", "Audience Psychology Map", "Priority processing"],
  },
  {
    slug: "pro",
    name: "Tier 4",
    subtitle: "Pro",
    price: "$79",
    period: "/mo",
    credits: "700 credits / month",
    accentColor: "#34d399",
    cardBg: "rgba(52,211,153,0.05)",
    cardBorder: "rgba(52,211,153,0.22)",
    features: ["Everything in Tier 3", "700 AI credits/month", "AI Video Editor", "DM Tracker", "Full AI Content Coach", "SOP Generator", "AI Content Planner", "Direct team messaging"],
  },
  {
    slug: "elite",
    name: "Tier 5",
    subtitle: "Work With Us",
    price: "Apply",
    period: "",
    credits: "Unlimited",
    accentColor: "#d4b461",
    cardBg: "rgba(212,180,97,0.07)",
    cardBorder: "rgba(212,180,97,0.40)",
    features: ["Unlimited AI credits", "Done-with-you strategy", "Direct team collaboration", "Priority 1-on-1 support", "Full system access", "High-level growth guidance", "Book 1-on-1 strategy calls"],
  },
];

const PLAN_ORDER = ["free", "starter", "growth", "pro", "elite"];

export default function PlanSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const currentPlan = (user as any)?.plan || "free";
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const currentPlanData = PLANS[currentIdx];

  const WHOP_STARTER_URL = "https://whop.com/checkout/plan_MyQ8imbxSSYqE";
  const WHOP_GROWTH_URL = "https://whop.com/checkout/plan_czIrdl7ryaq6B";

  const handleUpgrade = (targetSlug: string, _targetName: string) => {
    if (targetSlug === "elite") { window.location.href = "/apply"; return; }
    if (targetSlug === "starter") {
      const returnUrl = `${window.location.origin}/select-plan?whop_success=starter`;
      window.location.href = `${WHOP_STARTER_URL}?redirect_uri=${encodeURIComponent(returnUrl)}`;
      return;
    }
    if (targetSlug === "growth") {
      const returnUrl = `${window.location.origin}/select-plan?whop_success=growth`;
      window.location.href = `${WHOP_GROWTH_URL}?redirect_uri=${encodeURIComponent(returnUrl)}`;
      return;
    }
    // Pro tier launching soon
    toast({
      title: "Coming soon! 🚀",
      description: "Pro and Elite tiers are launching shortly.",
    });
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8" data-tour="settings-main">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
            <Settings className="w-4 h-4" style={{ color: "#d4b461" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Your Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your account and subscription</p>
          </div>
        </div>

        {/* Square subsection card — Your Current Plan */}
        <div
          onClick={() => setExpanded(v => !v)}
          data-testid="plan-card-toggle"
          className="rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] select-none mb-4"
          style={{
            background: currentPlanData?.cardBg || "rgba(212,180,97,0.06)",
            border: `1px solid ${expanded ? (currentPlanData?.accentColor || "#d4b461") + "60" : (currentPlanData?.cardBorder || "rgba(212,180,97,0.25)")}`,
            boxShadow: expanded ? `0 0 40px ${currentPlanData?.accentColor || "#d4b461"}14` : "none",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Icon square */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${currentPlanData?.accentColor || "#d4b461"}18`, border: `1px solid ${currentPlanData?.accentColor || "#d4b461"}30` }}>
                <Crown className="w-5 h-5" style={{ color: currentPlanData?.accentColor || "#d4b461" }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Your Current Plan</p>
                <p className="text-base font-black text-white">{currentPlanData?.name} — {currentPlanData?.subtitle}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold" style={{ color: currentPlanData?.accentColor }}>{currentPlanData?.price}{currentPlanData?.period}</span>
                  <span className="text-muted-foreground text-xs">·</span>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" style={{ color: currentPlanData?.accentColor }} />
                    <span className="text-xs font-medium" style={{ color: currentPlanData?.accentColor }}>{currentPlanData?.credits}</span>
                  </div>
                </div>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>

        {/* Expanded: current plan features + all plans */}
        {expanded && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">

            {/* Current plan features */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">What's included</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentPlanData?.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: currentPlanData.accentColor }} />
                    <span className="text-xs text-zinc-300 leading-snug">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* All plans vertical list */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">All Plans — Free During Launch</p>
              <div className="flex flex-col gap-2.5">
                {PLANS.map((plan, i) => {
                  const isCurrent = plan.slug === currentPlan;
                  const isUpgrade = i > currentIdx;
                  const isDowngrade = i < currentIdx;

                  return (
                    <div
                      key={plan.slug}
                      data-testid={`plan-row-${plan.slug}`}
                      className="rounded-xl p-4 flex items-start gap-4 transition-all duration-200"
                      style={{
                        background: isCurrent ? plan.cardBg : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isCurrent ? plan.cardBorder : "rgba(255,255,255,0.06)"}`,
                        opacity: isDowngrade ? 0.4 : 1,
                      }}
                    >
                      {/* Left: plan info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white">{plan.name}</span>
                          <span className="text-xs text-muted-foreground">— {plan.subtitle}</span>
                          {isCurrent && (
                            <Badge className="text-[10px] h-4 px-1.5 border-0" style={{ background: `${plan.accentColor}20`, color: plan.accentColor }}>
                              Active
                            </Badge>
                          )}
                          {plan.highlight && isUpgrade && (
                            <Badge className="text-[10px] h-4 px-1.5 border-0 bg-emerald-500/15 text-emerald-400">Best Value</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-base font-black" style={{ color: isCurrent ? plan.accentColor : "rgba(255,255,255,0.55)" }}>
                            {plan.price}<span className="text-xs font-normal text-muted-foreground">{plan.period}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{plan.credits}</span>
                        </div>
                        {/* Features for this plan */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {plan.features.slice(0, 4).map((f, fi) => (
                            <div key={fi} className="flex items-center gap-1.5">
                              <span className="text-[10px]" style={{ color: plan.accentColor }}>✓</span>
                              <span className="text-[11px] text-muted-foreground">{f}</span>
                            </div>
                          ))}
                          {plan.features.length > 4 && (
                            <span className="text-[11px] text-muted-foreground">+ {plan.features.length - 4} more</span>
                          )}
                        </div>
                      </div>

                      {/* Right: action */}
                      <div className="flex-shrink-0 pt-1">
                        {isCurrent ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: `${plan.accentColor}18` }}>
                            <CheckCircle2 className="w-3 h-3" style={{ color: plan.accentColor }} />
                            <span className="text-xs font-semibold" style={{ color: plan.accentColor }}>Active</span>
                          </div>
                        ) : isDowngrade ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <Lock className="w-3 h-3 text-zinc-600" />
                            <span className="text-xs text-zinc-600">Lower</span>
                          </div>
                        ) : (
                          <button
                            data-testid={`upgrade-btn-${plan.slug}`}
                            onClick={e => { e.stopPropagation(); handleUpgrade(plan.slug, `${plan.name} ${plan.subtitle}`); }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{ background: `${plan.accentColor}18`, border: `1px solid ${plan.accentColor}35`, color: plan.accentColor }}
                          >
                            Upgrade <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Rocket className="w-3.5 h-3.5 text-[#d4b461]" />
              <p className="text-center text-xs text-muted-foreground">Paid upgrades launching soon — all plans are free right now</p>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
