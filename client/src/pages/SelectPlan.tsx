import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
const oraviniLogoPath = "/oravini-logo.png";
import { Gift } from "lucide-react";

const WHOP_STARTER_URL = "https://whop.com/checkout/plan_MyQ8imbxSSYqE";
const WHOP_GROWTH_URL = "https://whop.com/checkout/plan_czIrdl7ryaq6B";
const WHOP_PRO_URL = "https://whop.com/checkout/plan_HjKg0jyCVzuG3";
const PLATFORM_URL = "https://oravini.com";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";
const CALENDLY = "https://calendly.com/brandversee/30min";


const PLANS = [
  {
    slug: "free",
    tier: "Tier 1",
    name: "Free",
    price: "Free",
    period: "",
    credits: "20 credits / month",
    accent: "rgba(255,255,255,0.7)",
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.1)",
    highlight: false,
    cta: "Start for Free",
    features: [
      "20 AI credits per month",
      "Access to all AI tools",
      "Group community access",
      "AI Content Ideas",
      "Virality Tester",
      "Basic carousel generation",
      "Partial audit preview",
    ],
  },
  {
    slug: "starter",
    tier: "Tier 2",
    name: "Starter",
    price: "$29",
    period: "/mo",
    credits: "100 credits / month",
    accent: "#818cf8",
    bg: "rgba(99,102,241,0.06)",
    border: "rgba(99,102,241,0.28)",
    highlight: false,
    cta: "Get Starter",
    features: [
      "100 AI credits / month",
      "Everything in Free",
      "Full audit access",
      "AI Content Ideas",
      "Carousel Studio",
      "Story Generator",
      "Lead Magnet Generator",
      "Brand Kit Builder",
      "Virality Tester",
      "IG Growth Tracker",
      "Full Script Generator",
    ],
  },
  {
    slug: "growth",
    tier: "Tier 3",
    name: "Growth",
    price: "$59",
    period: "/mo",
    credits: "250 credits / month",
    accent: GOLD,
    bg: "rgba(212,180,97,0.07)",
    border: "rgba(212,180,97,0.35)",
    highlight: true,
    cta: "Start Growing",
    features: [
      "250 AI credits / month",
      "Everything in Starter",
      "No watermarks",
      "Competitor Analysis",
      "Reel vs Reel Comparison",
      "Steal Strategy 30-Day Plan",
      "Niche Intelligence Engine",
      "ICP Builder",
      "Audience Psychology Map",
      "Content DNA Analysis",
      "Priority processing",
    ],
  },
  {
    slug: "pro",
    tier: "Tier 4",
    name: "Pro",
    price: "$79",
    period: "/mo",
    credits: "500 credits / month",
    accent: "#34d399",
    bg: "rgba(52,211,153,0.05)",
    border: "rgba(52,211,153,0.22)",
    highlight: false,
    cta: "Go Pro",
    features: [
      "500 AI credits / month",
      "Everything in Growth",
      "AI Video Editor",
      "Clip Finder & Download",
      "AI Content Coach",
      "SOP Generator",
      "AI Content Planner",
      "DM Tracker",
      "Direct team messaging",
      "Priority support",
    ],
  },
];

export default function SelectPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [confirming, setConfirming] = useState<string | null>(null);

  // Handle return from Whop after successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const whopSuccess = params.get("whop_success");
    if (whopSuccess === "starter" && user) {
      setConfirming("starter");
      apiRequest("POST", "/api/auth/confirm-plan", { plan: "starter" })
        .then(updated => {
          queryClient.setQueryData(["/api/auth/me"], updated);
          toast({ title: "Welcome to Starter! 🎉", description: "Your $29/mo plan is now active. Enjoy 100 credits per month." });
          navigate("/dashboard");
        })
        .catch(() => setConfirming(null));
    } else if (whopSuccess === "growth" && user) {
      setConfirming("growth");
      apiRequest("POST", "/api/auth/confirm-plan", { plan: "growth" })
        .then(updated => {
          queryClient.setQueryData(["/api/auth/me"], updated);
          toast({ title: "Welcome to Growth! 🚀", description: "Your $59/mo plan is now active. Enjoy 250 credits per month." });
          navigate("/dashboard");
        })
        .catch(() => setConfirming(null));
    } else if (whopSuccess === "pro" && user) {
      setConfirming("pro");
      apiRequest("POST", "/api/auth/confirm-plan", { plan: "pro" })
        .then(updated => {
          queryClient.setQueryData(["/api/auth/me"], updated);
          toast({ title: "Welcome to Pro! ⚡", description: "Your $79/mo plan is now active. Enjoy 500 credits per month." });
          navigate("/dashboard");
        })
        .catch(() => setConfirming(null));
    }
  }, [user]);

  const handlePlan = async (slug: string) => {
    if (slug === "starter") {
      const returnUrl = `${PLATFORM_URL}/select-plan?whop_success=starter`;
      window.location.href = `${WHOP_STARTER_URL}?redirect_uri=${encodeURIComponent(returnUrl)}`;
      return;
    }
    if (slug === "growth") {
      const returnUrl = `${PLATFORM_URL}/select-plan?whop_success=growth`;
      window.location.href = `${WHOP_GROWTH_URL}?redirect_uri=${encodeURIComponent(returnUrl)}`;
      return;
    }
    if (slug === "pro") {
      const returnUrl = `${PLATFORM_URL}/select-plan?whop_success=pro`;
      window.location.href = `${WHOP_PRO_URL}?redirect_uri=${encodeURIComponent(returnUrl)}`;
      return;
    }
    // Elite is still coming soon
    if (slug !== "free") {
      toast({ title: "Coming soon! 🚀", description: "Elite tier is launching shortly." });
      slug = "free";
    }
    setConfirming(slug);
    try {
      const updated = await apiRequest("POST", "/api/auth/confirm-plan", { plan: "free" });
      queryClient.setQueryData(["/api/auth/me"], updated);
      navigate("/dashboard");
    } catch {
      setConfirming(null);
    }
  };

  const name = (user as any)?.name?.split(" ")[0] || "there";

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={oraviniLogoPath} alt="Oravini" style={{ height: 36, width: 36, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 6 }} />
          <button
            onClick={() => navigate("/oravini")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 500, transition: "color 0.2s", padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
            Go back to home page
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user && (user as any).planConfirmed && (
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                background: "none", border: `1px solid rgba(255,255,255,0.12)`,
                cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13,
                fontWeight: 500, padding: "7px 16px", borderRadius: 8, transition: "all 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            >
              Go to Dashboard →
            </button>
          )}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Choose Your Plan</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 24px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40, maxWidth: 560 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>
            Welcome, {name}
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: 14 }}>
            Choose your plan to<br /><span style={{ color: GOLD }}>unlock your dashboard</span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>
            Start free, or grab the Starter or Growth plan now — Pro and Elite tiers launching soon.
          </p>
        </div>

        {/* Notice banner */}
        <div style={{ width: "100%", maxWidth: 1100, marginBottom: 28, background: "rgba(212,180,97,0.08)", border: `1px solid ${GOLD}44`, borderRadius: 14, padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 99, background: `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gift size={18} color={GOLD} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: GOLD, margin: 0 }}>Starter ($29), Growth ($59) and Pro ($79) plans are live via Whop 🎉</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "2px 0 0" }}>Elite tier is on free access during launch. Paid upgrade coming soon.</p>
          </div>
        </div>

        {/* Plan grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, width: "100%", maxWidth: 1100, marginBottom: 24 }}>
          {PLANS.map(plan => (
            <div key={plan.slug} style={{ background: plan.bg, border: `1px solid ${plan.border}`, borderRadius: 20, padding: "30px 24px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", boxShadow: plan.highlight ? `0 0 50px rgba(212,180,97,0.12)` : "none", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; }}>
              {plan.highlight && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              )}
              {plan.highlight && (
                <div style={{ position: "absolute", top: 14, right: 14, fontSize: 9, fontWeight: 800, color: "#000", background: GOLD, borderRadius: 99, padding: "3px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Most Popular</div>
              )}
              <div style={{ fontSize: 10, fontWeight: 700, color: plan.accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{plan.tier}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginBottom: 5 }}>
                <span style={{ fontSize: plan.price === "Free" ? 30 : 36, fontWeight: 900, color: plan.accent, lineHeight: 1 }}>{plan.price}</span>
                {plan.period && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", paddingBottom: 3 }}>{plan.period}</span>}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 22, fontWeight: 500 }}>{plan.credits}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <span style={{ color: plan.accent, fontSize: 11, marginTop: 2, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                data-testid={`button-plan-${plan.slug}`}
                onClick={() => handlePlan(plan.slug)}
                disabled={confirming !== null}
                style={{ background: plan.highlight ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.06)", border: plan.highlight ? "none" : `1px solid ${plan.border}`, color: plan.highlight ? "#000" : plan.accent, fontWeight: 700, fontSize: 14, borderRadius: 10, padding: "12px 20px", cursor: confirming ? "not-allowed" : "pointer", transition: "opacity 0.2s", opacity: confirming && confirming !== plan.slug ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {confirming === plan.slug ? (
                  <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.2)", borderTopColor: plan.highlight ? "#000" : plan.accent, display: "inline-block", animation: "spin 0.6s linear infinite" }} />Confirming...</>
                ) : (
                  <>{plan.cta} →</>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Tier 5 special card */}
        <div style={{ width: "100%", maxWidth: 1100, background: `linear-gradient(135deg, rgba(212,180,97,0.1) 0%, rgba(212,180,97,0.03) 100%)`, border: `1px solid ${GOLD}55`, borderRadius: 24, padding: "44px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 28, position: "relative", overflow: "hidden", boxShadow: `0 0 80px rgba(212,180,97,0.1)` }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${GOLD_BRIGHT}, ${GOLD}, transparent)` }} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "inline-block", fontSize: 9, fontWeight: 800, color: "#000", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, borderRadius: 99, padding: "3px 12px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Tier 5 — Exclusive</div>
            <div style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 10 }}>
              Elite — <span style={{ color: GOLD }}>Work With Us</span>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 480 }}>
              Done-with-you strategy, weekly 1-on-1 calls, unlimited credits, and direct Oravini team access. Custom pricing — limited spots.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => navigate("/apply")} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 12, padding: "14px 32px", cursor: "pointer", boxShadow: `0 0 40px rgba(212,180,97,0.2)` }}>
              Learn More →
            </button>
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}44`, color: GOLD, fontWeight: 600, fontSize: 14, borderRadius: 12, padding: "14px 28px", cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center" }}>
              Book a Call
            </a>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", marginTop: 32, textAlign: "center" }}>
          You can always upgrade or change your plan later from your dashboard settings.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
