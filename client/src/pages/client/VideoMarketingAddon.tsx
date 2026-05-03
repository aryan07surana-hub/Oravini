import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Check, Zap, MonitorPlay, Users, Mail, BarChart3, Video, Globe, Crown, Sparkles, Film, Mic, LayoutTemplate, ChevronRight } from "lucide-react";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";

// ── Swap these in once Whop products are created ──────────────────────────
const WHOP_VM_PRO_URL    = "https://whop.com/checkout/PLACEHOLDER_VM_PRO_29";
const WHOP_VM_GROWTH_URL = "https://whop.com/checkout/PLACEHOLDER_VM_GROWTH_39";
// ─────────────────────────────────────────────────────────────────────────

interface FeatureRow { icon: React.ComponentType<any>; label: string; growth: boolean; pro: boolean }

const FEATURES: FeatureRow[] = [
  { icon: MonitorPlay,   label: "Video hosting + custom player",         growth: true,  pro: true },
  { icon: Globe,         label: "VSL landing pages",                      growth: true,  pro: true },
  { icon: Mic,           label: "Live webinars per month",                growth: false, pro: true },
  { icon: Users,         label: "Registration pages",                     growth: true,  pro: true },
  { icon: Mail,          label: "Email reminders & sequences",            growth: true,  pro: true },
  { icon: BarChart3,     label: "Attendee analytics dashboard",           growth: false, pro: true },
  { icon: Users,         label: "Attendee CRM",                           growth: false, pro: true },
  { icon: Film,          label: "AI Clip Finder",                         growth: false, pro: true },
  { icon: LayoutTemplate,label: "White-label pages & custom domain",      growth: false, pro: true },
  { icon: Video,         label: "Unlimited video storage",                growth: false, pro: true },
];

function Tick({ on, gold }: { on: boolean; gold?: boolean }) {
  if (!on) return (
    <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,0.1)", borderRadius: 2 }} />
    </div>
  );
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 99,
      background: gold ? `${GOLD}22` : "rgba(255,255,255,0.06)",
      border: `1px solid ${gold ? `${GOLD}40` : "rgba(255,255,255,0.1)"}`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Check style={{ width: 11, height: 11, color: gold ? GOLD : "rgba(255,255,255,0.55)", strokeWidth: 3 }} />
    </div>
  );
}

export default function VideoMarketingAddon() {
  const { user, isLoading } = useAuth();
  const [, nav] = useLocation();

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#040406" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${GOLD}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (!user) { nav("/login?redirect=/video-marketing-addon"); return null; }

  const plan = (user as any)?.plan ?? "free";
  const isPro    = plan === "pro"    || plan === "elite";
  const isGrowth = plan === "growth";
  const eligible = isPro || isGrowth;

  const addonPrice  = isPro ? "$29" : "$39";
  const addonSaving = isPro ? "Save $10 vs standalone" : null;
  const whopUrl     = isPro ? WHOP_VM_PRO_URL : WHOP_VM_GROWTH_URL;
  const planLabel   = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#050408 0%,#0a0910 60%,#050408 100%)", color: "#fff", fontFamily: "inherit" }}>

      {/* ── Nav ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(14px)", background: "rgba(5,4,8,0.82)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => nav("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back to Dashboard
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/oravini-logo.png" alt="Oravini" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover", objectPosition: "50% 32%" }} />
          <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>ORAVINI</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>· Video Marketing Add-on</span>
        </div>
        <div style={{ width: 140 }} />
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px 100px" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${GOLD}12`, border: `1px solid ${GOLD}28`, borderRadius: 99, padding: "5px 14px", marginBottom: 20 }}>
            <MonitorPlay style={{ width: 12, height: 12, color: GOLD }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase" }}>Optional Add-On</span>
          </div>
          <h1 style={{ fontSize: "clamp(32px, 6vw, 58px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Turn your{" "}
            <span style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              content into conversions.
            </span>
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", lineHeight: 1.8, maxWidth: 520, margin: "0 auto 10px" }}>
            Host videos, run live webinars, build VSL pages, and automate your entire video marketing funnel — all inside Oravini.
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>No new dashboards. No extra logins. Everything in one place.</p>
        </div>

        {/* ── Pricing card ── */}
        {eligible ? (
          <div style={{
            background: isPro ? `linear-gradient(135deg, ${GOLD}0e 0%, rgba(212,180,97,0.03) 100%)` : "rgba(255,255,255,0.03)",
            border: `1px solid ${isPro ? `${GOLD}35` : "rgba(255,255,255,0.1)"}`,
            borderRadius: 24, padding: "36px 40px", marginBottom: 40,
            boxShadow: isPro ? `0 0 80px ${GOLD}0a` : "none",
            position: "relative", overflow: "hidden",
          }}>
            {isPro && (
              <div style={{ position: "absolute", top: 0, right: 0, width: 320, height: 320, borderRadius: "50%", background: GOLD, opacity: 0.04, filter: "blur(80px)", transform: "translate(40%,-40%)", pointerEvents: "none" }} />
            )}

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: isPro ? `${GOLD}1a` : "rgba(255,255,255,0.06)", border: `1px solid ${isPro ? `${GOLD}35` : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles style={{ width: 17, height: 17, color: isPro ? GOLD : "rgba(255,255,255,0.5)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isPro ? GOLD : "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{planLabel} member exclusive</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Video Marketing Add-on</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 52, fontWeight: 900, color: isPro ? GOLD : "#fff", lineHeight: 1 }}>{addonPrice}</span>
                  <span style={{ fontSize: 15, color: "rgba(255,255,255,0.3)", paddingBottom: 6 }}>/mo</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {addonSaving && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#f87171", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 99, padding: "3px 8px" }}>
                      {addonSaving}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>
                    {isPro ? "Standalone bundle costs $59/mo" : "Billed monthly · cancel anytime"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
                <a
                  href={whopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: isPro ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.08)",
                    border: isPro ? "none" : "1px solid rgba(255,255,255,0.14)",
                    color: isPro ? "#000" : "#fff",
                    fontWeight: 800, fontSize: 14, borderRadius: 13,
                    padding: "14px 28px", cursor: "pointer", textDecoration: "none",
                    boxShadow: isPro ? `0 4px 32px ${GOLD}30` : "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Zap style={{ width: 15, height: 15 }} />
                  Add for {addonPrice}/mo
                  <ChevronRight style={{ width: 14, height: 14, opacity: 0.7 }} />
                </a>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "right" }}>Secure checkout via Whop · No contracts</span>
              </div>
            </div>

            {/* Quick feature pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(isPro
                ? ["Unlimited webinars", "VSL pages", "Attendee CRM", "AI Clip Finder", "White-label", "Unlimited storage"]
                : ["3 webinars/mo", "VSL pages", "Registration pages", "Email reminders", "Basic analytics"]
              ).map(f => (
                <span key={f} style={{ fontSize: 11, fontWeight: 600, color: isPro ? GOLD : "rgba(255,255,255,0.45)", background: isPro ? `${GOLD}10` : "rgba(255,255,255,0.04)", border: `1px solid ${isPro ? `${GOLD}20` : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "4px 10px" }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Non-eligible plan — show upgrade path */
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px 36px", marginBottom: 40, textAlign: "center" }}>
            <Crown style={{ width: 36, height: 36, color: GOLD, margin: "0 auto 14px" }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Upgrade to Growth or Pro first</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 20 }}>
              The Video Marketing add-on is available on Growth (+$39/mo) and Pro (+$29/mo exclusive) plans.
              You're currently on <strong style={{ color: "#fff" }}>{planLabel}</strong>.
            </p>
            <Link href="/select-plan">
              <button style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 13, border: "none", borderRadius: 11, padding: "12px 28px", cursor: "pointer" }}>
                View Plans →
              </button>
            </Link>
          </div>
        )}

        {/* ── Feature comparison table ── */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden", marginBottom: 40 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", padding: "16px 24px", background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Feature</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center" }}>Growth +$39</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center" }}>Pro +$29</span>
          </div>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.label} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", padding: "13px 24px", alignItems: "center", borderBottom: i < FEATURES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon style={{ width: 14, height: 14, color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{f.label}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}><Tick on={f.growth} /></div>
                <div style={{ display: "flex", justifyContent: "center" }}><Tick on={f.pro} gold /></div>
              </div>
            );
          })}
        </div>

        {/* ── Bottom CTA ── */}
        {eligible && (
          <div style={{ textAlign: "center" }}>
            <a
              href={whopUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: isPro ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.08)",
                border: isPro ? "none" : "1px solid rgba(255,255,255,0.14)",
                color: isPro ? "#000" : "#fff",
                fontWeight: 800, fontSize: 15, borderRadius: 14,
                padding: "16px 36px", cursor: "pointer", textDecoration: "none",
                boxShadow: isPro ? `0 6px 40px ${GOLD}25` : "none",
              }}
            >
              <Zap style={{ width: 16, height: 16 }} />
              Activate Video Marketing · {addonPrice}/mo
            </a>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 12 }}>
              Monthly · cancel anytime · no lock-in
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
