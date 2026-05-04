import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
const oraviniLogoPath = "/oravini-logo.png";
import { Gift } from "lucide-react";

const WHOP_STARTER_URL = "https://whop.com/checkout/plan_905ZhpnorE74t";
const WHOP_GROWTH_URL = "https://whop.com/checkout/plan_C26g4nwUDB7oQ";
const WHOP_GROWTH_VIDEO_URL = "https://whop.com/checkout/plan_jD3ZhsKmotNdv";
const WHOP_PRO_URL = "https://whop.com/checkout/plan_e0wfzKlT0upkU";
const WHOP_PRO_VIDEO_URL = "https://whop.com/checkout/plan_e0wfzKlT0upkU";
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
    price: "$19",
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
    price: "$49",
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
    price: "$59",
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
  const [expandedFeatures, setExpandedFeatures] = useState<string | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [previewTier, setPreviewTier] = useState<'growth' | 'pro' | null>(null);
  const [showVideoDecision, setShowVideoDecision] = useState(false);
  const [decisionTier, setDecisionTier] = useState<'growth' | 'pro' | null>(null);

  // Handle return from Whop after successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const whopSuccess = params.get("whop_success");
    const hasVideo = params.get("video") === "true";
    if (whopSuccess === "starter" && user) {
      setConfirming("starter");
      apiRequest("POST", "/api/auth/confirm-plan", { plan: "starter", hasVideoMarketing: false })
        .then(updated => {
          queryClient.setQueryData(["/api/auth/me"], updated);
          toast({ title: "Welcome to Starter! 🎉", description: "Your $19/mo plan is now active. Enjoy 100 credits per month." });
          navigate("/dashboard");
        })
        .catch(() => setConfirming(null));
    } else if (whopSuccess === "growth" && user) {
      setConfirming("growth");
      apiRequest("POST", "/api/auth/confirm-plan", { plan: "growth", hasVideoMarketing: hasVideo })
        .then(updated => {
          queryClient.setQueryData(["/api/auth/me"], updated);
          toast({ title: "Welcome to Growth! 🚀", description: hasVideo ? "Your plan is now active with Video Marketing! Enjoy 250 credits per month." : "Your plan is now active. Enjoy 250 credits per month." });
          navigate("/dashboard");
        })
        .catch(() => setConfirming(null));
    } else if (whopSuccess === "pro" && user) {
      setConfirming("pro");
      apiRequest("POST", "/api/auth/confirm-plan", { plan: "pro", hasVideoMarketing: true })
        .then(updated => {
          queryClient.setQueryData(["/api/auth/me"], updated);
          toast({ title: "Welcome to Pro! ⚡", description: "Your plan is now active with FREE Video Marketing! Enjoy 500 credits per month." });
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
      setDecisionTier('growth');
      setShowVideoDecision(true);
      return;
    }
    if (slug === "pro") {
      setDecisionTier('pro');
      setShowVideoDecision(true);
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

  const proceedToCheckout = (tier: 'growth' | 'pro', withVideo: boolean) => {
    setShowVideoDecision(false);
    if (tier === 'growth') {
      const returnUrl = `${PLATFORM_URL}/select-plan?whop_success=growth${withVideo ? '&video=true' : ''}`;
      const checkoutUrl = withVideo ? WHOP_GROWTH_VIDEO_URL : WHOP_GROWTH_URL;
      window.location.href = `${checkoutUrl}?redirect_uri=${encodeURIComponent(returnUrl)}`;
    } else {
      const returnUrl = `${PLATFORM_URL}/select-plan?whop_success=pro${withVideo ? '&video=true' : ''}`;
      window.location.href = `${WHOP_PRO_URL}?redirect_uri=${encodeURIComponent(returnUrl)}`;
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
            <p style={{ fontSize: 14, fontWeight: 700, color: GOLD, margin: 0 }}>Starter ($19), Growth ($49) and Pro ($59) plans are live via Whop 🎉</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "2px 0 0" }}>Elite tier is on free access during launch. Paid upgrade coming soon.</p>
          </div>
        </div>

        {/* Plan grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, width: "100%", maxWidth: 1100, marginBottom: 24 }}>
          {PLANS.map(plan => {
            const isGrowth = plan.slug === "growth";
            const isPro = plan.slug === "pro";

            return (
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

              {isGrowth && (
                <div className="space-y-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedFeatures(expandedFeatures === 'growth' ? null : 'growth'); }}
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      color: plan.accent,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 0",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    {expandedFeatures === 'growth' ? '−' : '+'} {expandedFeatures === 'growth' ? 'Hide' : 'See all'} features
                  </button>

                  {expandedFeatures === 'growth' && (
                    <div style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "12px",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.7)",
                      lineHeight: 1.6
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Webinar Hosting (up to 500 attendees)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Unlimited Landing Pages</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Advanced Analytics Dashboard</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>HD Recordings & Replays</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Email Automation</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Custom Branding</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Priority Support</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewTier('growth'); setShowVideoPreview(true); }}
                    style={{
                      width: "100%",
                      background: `${plan.accent}15`,
                      border: `1px solid ${plan.accent}30`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: plan.accent,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${plan.accent}25`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = `${plan.accent}15`; }}
                  >
                    🎬 Interactive Platform Preview
                  </button>
                </div>
              )}

              {isPro && (
                <div className="space-y-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedFeatures(expandedFeatures === 'pro' ? null : 'pro'); }}
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      color: plan.accent,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 0",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    {expandedFeatures === 'pro' ? '−' : '+'} {expandedFeatures === 'pro' ? 'Hide' : 'See all'} features
                  </button>

                  {expandedFeatures === 'pro' && (
                    <div style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "12px",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.7)",
                      lineHeight: 1.6
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Webinar Hosting (up to 500 attendees)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Unlimited Landing Pages</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Advanced Analytics Dashboard</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>HD Recordings & Replays</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Email Automation</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Custom Branding</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <span style={{ color: plan.accent, fontSize: 10 }}>✓</span>
                        <span>Priority Support</span>
                      </div>
                      <div style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 10,
                        color: plan.accent,
                        fontWeight: 600
                      }}>
                        🎉 Worth $20/mo - Included FREE with Pro
                      </div>
                    </div>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewTier('pro'); setShowVideoPreview(true); }}
                    style={{
                      width: "100%",
                      background: `${plan.accent}15`,
                      border: `1px solid ${plan.accent}30`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: plan.accent,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${plan.accent}25`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = `${plan.accent}15`; }}
                  >
                    🎬 Interactive Platform Preview
                  </button>
                </div>
              )}

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
          )})}
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

      {/* Video Marketing Decision Modal — shown when user clicks Growth/Pro CTA */}
      {showVideoDecision && decisionTier && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.97)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0a0a0a",
              borderRadius: 24,
              maxWidth: 860,
              width: "100%",
              maxHeight: "92vh",
              overflow: "auto",
              position: "relative",
              border: `2px solid ${decisionTier === 'pro' ? '#34d39940' : `${GOLD}40`}`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Close / skip button */}
            <button
              onClick={() => proceedToCheckout(decisionTier, false)}
              aria-label="Skip and continue without video marketing"
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#fff",
                fontSize: 20,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            >
              ×
            </button>

            {/* Header */}
            <div style={{ padding: "40px 40px 28px", borderBottom: `1px solid ${decisionTier === 'pro' ? '#34d39920' : `${GOLD}20`}`, background: "#060606" }}>
              <div style={{
                display: "inline-block",
                background: decisionTier === 'pro' ? "rgba(52,211,153,0.12)" : `${GOLD}18`,
                border: `1px solid ${decisionTier === 'pro' ? 'rgba(52,211,153,0.4)' : `${GOLD}40`}`,
                borderRadius: 99,
                padding: "5px 14px",
                marginBottom: 14,
              }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: decisionTier === 'pro' ? "#34d399" : GOLD,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}>
                  {decisionTier === 'growth' ? 'Growth Plan · +$20/mo' : 'Pro Plan · Included FREE'}
                </span>
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 10, lineHeight: 1.15 }}>
                🎬 Add Video Marketing?
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
                Host webinars, build landing pages, track every viewer — all inside Oravini
              </p>
            </div>

            {/* Feature preview */}
            <div style={{ padding: "32px 40px 24px", flex: 1 }}>
              {decisionTier === 'pro' && (
                <div style={{
                  marginBottom: 22,
                  padding: "12px 16px",
                  background: "linear-gradient(135deg, rgba(52,211,153,0.14), rgba(52,211,153,0.04))",
                  border: "1px solid rgba(52,211,153,0.4)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>🎉</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#34d399", letterSpacing: "0.02em" }}>
                    Worth $20/mo — yours FREE
                  </span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
                {/* Webinar Hosting */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(212,180,97,0.08), rgba(212,180,97,0.02))",
                  border: `1px solid ${GOLD}30`,
                  borderRadius: 14,
                  padding: 18,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}>🎥</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>Webinar Hosting</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Live, interactive sessions at scale</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 12 }}>
                    {["500 Attendees", "HD Streaming", "Live Q&A", "Screen Share"].map(label => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: GOLD, fontWeight: 700 }}>
                        ✓ {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* VSL & Video Pages */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 14,
                  padding: 18,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}>📹</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>VSL & Video Pages</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Convert traffic with hosted video</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 12 }}>
                    {["Video Heatmaps", "Lead Gates", "CTA Overlays", "Custom Brand"].map(label => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#818cf8", fontWeight: 700 }}>
                        ✓ {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Landing Pages */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(244,114,182,0.08), rgba(244,114,182,0.02))",
                  border: "1px solid rgba(244,114,182,0.3)",
                  borderRadius: 14,
                  padding: 18,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}>📝</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>Landing Pages</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Drag-and-drop, no code needed</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 12 }}>
                    {["Custom Domains", "Mobile Ready", "A/B Testing", "Email Capture"].map(label => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#f472b6", fontWeight: 700 }}>
                        ✓ {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analytics & CRM */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(52,211,153,0.08), rgba(52,211,153,0.02))",
                  border: "1px solid rgba(52,211,153,0.3)",
                  borderRadius: 14,
                  padding: 18,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}>📊</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>Analytics & CRM</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Know exactly what works</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 12 }}>
                    {["Attendance Rates", "Watch Time", "Conversions", "Replay Views"].map(label => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#34d399", fontWeight: 700 }}>
                        ✓ {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {decisionTier === 'growth' && (
                <div style={{
                  marginTop: 22,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: 18,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                    What's different on Growth vs Pro
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                    <div style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: GOLD, marginBottom: 8, letterSpacing: "0.04em" }}>GROWTH (this plan)</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                        <li>• Up to 3 live webinars / mo</li>
                        <li>• Basic analytics</li>
                        <li>• Email reminders</li>
                      </ul>
                    </div>
                    <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#34d399", marginBottom: 8, letterSpacing: "0.04em" }}>PRO (upgrade)</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                        <li>• Unlimited webinars</li>
                        <li>• Full CRM</li>
                        <li>• AI Clip Finder</li>
                        <li>• White-label pages</li>
                        <li>• Advanced heatmaps</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div style={{
              padding: "22px 40px 28px",
              borderTop: `1px solid ${decisionTier === 'pro' ? '#34d39920' : `${GOLD}20`}`,
              background: "#060606",
              position: "sticky",
              bottom: 0,
            }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                  {decisionTier === 'growth'
                    ? <>+<span style={{ color: GOLD, fontWeight: 700 }}>$20/mo</span> added to <span style={{ color: "#fff", fontWeight: 700 }}>$49/mo</span> = <span style={{ color: "#fff", fontWeight: 800 }}>$69/mo total</span></>
                    : <>Included <span style={{ color: "#34d399", fontWeight: 700 }}>FREE</span> with your <span style={{ color: "#fff", fontWeight: 700 }}>$59/mo Pro plan</span></>
                  }
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={() => proceedToCheckout(decisionTier, true)}
                  style={{
                    flex: "2 1 280px",
                    background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
                    border: "none",
                    color: "#000",
                    padding: "14px 24px",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: `0 0 24px ${GOLD}50`,
                    letterSpacing: "0.01em",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 0 32px ${GOLD}70`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 0 24px ${GOLD}50`; }}
                >
                  Yes, Add Video Marketing →
                </button>
                <button
                  onClick={() => proceedToCheckout(decisionTier, false)}
                  style={{
                    flex: "1 1 200px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.65)",
                    padding: "14px 20px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
                >
                  No Thanks, Continue Without
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Marketing Interactive Preview Modal */}
      {showVideoPreview && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            overflow: "auto"
          }}
          onClick={() => setShowVideoPreview(false)}
        >
          <div
            style={{
              background: "#0a0a0a",
              borderRadius: 24,
              maxWidth: 900,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              position: "relative",
              border: `2px solid ${GOLD}40`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowVideoPreview(false)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: 20,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            >
              ×
            </button>

            {/* Header */}
            <div style={{ padding: "40px 40px 30px", borderBottom: `1px solid ${GOLD}20` }}>
              <div style={{ display: "inline-block", background: `${GOLD}20`, border: `1px solid ${GOLD}40`, borderRadius: 99, padding: "4px 12px", marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {previewTier === 'growth' ? 'Growth Tier Add-On' : 'Pro Tier - Included FREE'}
                </span>
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>
                Video Marketing Platform
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                Host webinars, build landing pages, and convert your audience — all in one platform
              </p>
            </div>

            {/* Feature Slides */}
            <div style={{ padding: 40 }}>
              {/* Slide 1: Webinar Hosting */}
              <div style={{ marginBottom: 40 }}>
                <div style={{
                  background: "linear-gradient(135deg, rgba(212,180,97,0.1), rgba(212,180,97,0.02))",
                  border: `1px solid ${GOLD}30`,
                  borderRadius: 16,
                  padding: 30,
                  marginBottom: 20
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Webinar Hosting</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 16 }}>
                    Host live webinars with up to 500 attendees. Interactive Q&A, polls, and real-time engagement.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 4 }}>✓ Live Streaming</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>HD quality, zero lag</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 4 }}>✓ Interactive Chat</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Real-time Q&A</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 4 }}>✓ Screen Sharing</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Present slides & demos</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 4 }}>✓ Polls & Surveys</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Engage your audience</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 2: Landing Pages */}
              <div style={{ marginBottom: 40 }}>
                <div style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.02))",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 16,
                  padding: 30,
                  marginBottom: 20
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Unlimited Landing Pages</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 16 }}>
                    Create high-converting landing pages for your webinars. No coding required.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, marginBottom: 4 }}>✓ Drag & Drop Builder</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Easy customization</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, marginBottom: 4 }}>✓ Mobile Optimized</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Perfect on all devices</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, marginBottom: 4 }}>✓ Custom Domains</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Use your own URL</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, marginBottom: 4 }}>✓ A/B Testing</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Optimize conversions</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 3: Analytics */}
              <div style={{ marginBottom: 40 }}>
                <div style={{
                  background: "linear-gradient(135deg, rgba(52,211,153,0.1), rgba(52,211,153,0.02))",
                  border: "1px solid rgba(52,211,153,0.3)",
                  borderRadius: 16,
                  padding: 30,
                  marginBottom: 20
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Advanced Analytics</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 16 }}>
                    Track every metric that matters. Understand your audience and optimize performance.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#34d399", fontWeight: 700, marginBottom: 4 }}>✓ Attendance Tracking</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Who showed up</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#34d399", fontWeight: 700, marginBottom: 4 }}>✓ Engagement Metrics</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Chat, polls, Q&A</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#34d399", fontWeight: 700, marginBottom: 4 }}>✓ Conversion Tracking</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Sales & signups</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#34d399", fontWeight: 700, marginBottom: 4 }}>✓ Replay Analytics</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Watch time & drop-off</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 4: More Features */}
              <div style={{ marginBottom: 30 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 16 }}>Plus Everything Else</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 6 }}>✓ HD Recordings & Replays</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>Auto-record every webinar. Share replays instantly.</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 6 }}>✓ Email Automation</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>Reminders, follow-ups, and replay emails on autopilot.</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 6 }}>✓ Custom Branding</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>Your logo, colors, and domain. White-label ready.</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 6 }}>✓ Priority Support</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>Dedicated support team. Fast response times.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div style={{
              padding: "30px 40px",
              borderTop: `1px solid ${GOLD}20`,
              background: "rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap"
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                  {previewTier === 'growth' ? 'Add to Growth Plan' : 'Included FREE with Pro'}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  {previewTier === 'growth' ? '+$20/month' : 'Worth $20/month - yours at no extra cost'}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setShowVideoPreview(false)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                    padding: "12px 24px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                >
                  Back to Pricing
                </button>
                <button
                  onClick={() => {
                    setShowVideoPreview(false);
                    setDecisionTier(previewTier);
                    setShowVideoDecision(true);
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
                    border: "none",
                    color: "#000",
                    padding: "12px 28px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: `0 0 20px ${GOLD}40`
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 0 30px ${GOLD}60`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 0 20px ${GOLD}40`; }}
                >
                  Continue to Checkout →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
