import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, ArrowUpRight, CheckCircle2, Lock, ChevronRight, Settings, Rocket, AlertTriangle, X, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
const PAID_PLANS = ["starter", "growth", "pro"];
const GOLD = "#d4b461";

const WHOP_STARTER_URL = "https://whop.com/checkout/plan_MyQ8imbxSSYqE";
const WHOP_GROWTH_URL = "https://whop.com/checkout/plan_czIrdl7ryaq6B";
const WHOP_PRO_URL = "https://whop.com/checkout/plan_HjKg0jyCVzuG3";
const PLATFORM_URL = "https://oravini.com";
const WHOP_MANAGE_URL = "https://whop.com/manage-membership";

export default function PlanSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const currentPlan = (user as any)?.plan || "free";
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const currentPlanData = PLANS[currentIdx];
  const isPaidPlan = PAID_PLANS.includes(currentPlan);

  const handleUpgrade = (targetSlug: string) => {
    if (targetSlug === "elite") { window.location.href = "/apply"; return; }
    if (targetSlug === "starter") {
      const returnUrl = `${PLATFORM_URL}/select-plan?whop_success=starter`;
      window.location.href = `${WHOP_STARTER_URL}?redirect_uri=${encodeURIComponent(returnUrl)}`;
      return;
    }
    if (targetSlug === "growth") {
      const returnUrl = `${PLATFORM_URL}/select-plan?whop_success=growth`;
      window.location.href = `${WHOP_GROWTH_URL}?redirect_uri=${encodeURIComponent(returnUrl)}`;
      return;
    }
    if (targetSlug === "pro") {
      const returnUrl = `${PLATFORM_URL}/select-plan?whop_success=pro`;
      window.location.href = `${WHOP_PRO_URL}?redirect_uri=${encodeURIComponent(returnUrl)}`;
      return;
    }
    toast({ title: "Coming soon! 🚀", description: "Elite tier is launching shortly." });
  };

  const handleCancelPlan = async () => {
    setCancelling(true);
    try {
      const updated = await apiRequest("POST", "/api/auth/cancel-plan", {});
      queryClient.setQueryData(["/api/auth/me"], updated);
      setCancelConfirm(false);
      toast({
        title: "Plan cancelled",
        description: "You've been moved to the Free plan. Remember to cancel your billing on Whop to stop future charges.",
      });
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8" data-tour="settings-main">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
            <Settings className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Your Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your account and subscription</p>
          </div>
        </div>

        {/* Current Plan Card */}
        <div
          onClick={() => { setExpanded(v => !v); setCancelConfirm(false); }}
          data-testid="plan-card-toggle"
          className="rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] select-none mb-4"
          style={{
            background: currentPlanData?.cardBg || "rgba(212,180,97,0.06)",
            border: `1px solid ${expanded ? (currentPlanData?.accentColor || GOLD) + "60" : (currentPlanData?.cardBorder || "rgba(212,180,97,0.25)")}`,
            boxShadow: expanded ? `0 0 40px ${currentPlanData?.accentColor || GOLD}14` : "none",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${currentPlanData?.accentColor || GOLD}18`, border: `1px solid ${currentPlanData?.accentColor || GOLD}30` }}>
                <Crown className="w-5 h-5" style={{ color: currentPlanData?.accentColor || GOLD }} />
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

        {/* Expanded content */}
        {expanded && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">

            {/* What's included */}
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

            {/* Manage Subscription — only for paid plans */}
            {isPaidPlan && (
              <div className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Manage Subscription</p>

                {!cancelConfirm ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white mb-0.5">Cancel your plan</p>
                      <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
                        You'll be moved to the Free plan immediately. Make sure to also cancel your billing on Whop to stop future charges.
                      </p>
                    </div>
                    <button
                      data-testid="btn-cancel-plan"
                      onClick={() => setCancelConfirm(true)}
                      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel Plan
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-white mb-1">Are you sure you want to cancel?</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Your plan will drop to Free (5 credits/day) right now. You'll lose access to all paid features immediately.
                          After confirming here, go to Whop to cancel your billing so you're not charged again.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        data-testid="btn-confirm-cancel"
                        onClick={handleCancelPlan}
                        disabled={cancelling}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }}
                      >
                        {cancelling ? "Cancelling..." : "Yes, cancel my plan"}
                      </button>
                      <button
                        data-testid="btn-keep-plan"
                        onClick={() => setCancelConfirm(false)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 transition-all hover:text-white"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        Keep my plan
                      </button>
                    </div>
                    <a
                      href={WHOP_MANAGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-whop-manage"
                      className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Manage / cancel billing on Whop
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* All Plans */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">All Plans</p>
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
                      {/* Plan info */}
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

                      {/* Action */}
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
                            onClick={e => { e.stopPropagation(); handleUpgrade(plan.slug); }}
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
              <p className="text-center text-xs text-muted-foreground">Elite tier coming soon — all other paid plans are live via Whop</p>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
