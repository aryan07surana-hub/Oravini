import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";


const GOLD = "#d4b461";
const GOLD_DIM = "#d4b46180";
const CALENDLY = "https://calendly.com/brandversee/30min";

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(6,6,6,0.95)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? `1px solid rgba(255,255,255,0.06)` : "none",
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Left: Logo + Apply link */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${GOLD} 0%, #b8962e 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: "#000" }}>B</div>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Brandverse</span>
            </div>
          </Link>
          <Link href="/apply">
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "color 0.2s", display: "none" }}
              className="nav-apply-link">
              Apply to Work with Brandverse
            </span>
          </Link>
        </div>
        {/* Right: Login + Sign Up */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/apply">
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Apply to Work with Brandverse</span>
          </Link>
          <Link href="/login">
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Log in</span>
          </Link>
          <Link href="/audit">
            <span style={{ background: GOLD, color: "#000", fontSize: 13, fontWeight: 700, padding: "9px 20px", borderRadius: 8, cursor: "pointer", display: "inline-block", transition: "opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Sign Up Free
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}30`, borderRadius: 100, padding: "5px 16px", marginBottom: 18 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{children}</span>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${GOLD}20`, border: `1px solid ${GOLD}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <span style={{ color: GOLD, fontSize: 11, fontWeight: 700 }}>✓</span>
      </div>
      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>{children}</span>
    </div>
  );
}

function XItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>✕</span>
      </div>
      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.55, textDecoration: "line-through" as const }}>{children}</span>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay = 0 }: { icon: string; title: string; desc: string; delay?: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <FadeIn delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "rgba(212,180,97,0.06)" : "rgba(255,255,255,0.025)",
          border: `1px solid ${hovered ? "rgba(212,180,97,0.28)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 18, padding: "30px",
          transition: "all 0.25s ease",
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          cursor: "default",
        }}>
        <div style={{ fontSize: 30, marginBottom: 16 }}>{icon}</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.3 }}>{title}</h3>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}>{desc}</p>
      </div>
    </FadeIn>
  );
}

function StatCard({ number, label, delay = 0 }: { number: string; label: string; delay?: number }) {
  return (
    <FadeIn delay={delay}>
      <div style={{ textAlign: "center", padding: "28px 16px" }}>
        <div style={{ fontSize: 46, fontWeight: 900, color: GOLD, letterSpacing: "-0.03em", lineHeight: 1 }}>{number}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 500 }}>{label}</div>
      </div>
    </FadeIn>
  );
}

function Testimonial({ text, name, handle, delay = 0 }: { text: string; name: string; handle: string; delay?: number }) {
  return (
    <FadeIn delay={delay}>
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "26px" }}>
        <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
          {[...Array(5)].map((_, i) => <span key={i} style={{ color: GOLD, fontSize: 14 }}>★</span>)}
        </div>
        <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 22, fontStyle: "italic" }}>"{text}"</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}60, #6366f1)` }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{handle}</div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ── Inline Email Capture Strip ───────────────────────────────────────────────
function EmailCaptureStrip({ onCapture }: { onCapture: () => void }) {
  const [form, setForm] = useState({ name: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const submit = async () => {
    if (!form.name || !form.email) return;
    setStatus("loading");
    try {
      await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus("done");
      onCapture();
    } catch {
      setStatus("idle");
    }
  };

  return (
    <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20`, borderRadius: 20, padding: "44px 40px", textAlign: "center" }}>
            {status === "done" ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 14 }}>🎉</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>You're on the list!</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Your 10 free credits are reserved. Join Brandverse and they'll be waiting for you.</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 14 }}>🎁 Free Credits</div>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 10 }}>
                  Drop Your Email.<br />Get 10 Free Credits.
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 28, lineHeight: 1.6 }}>
                  We'll add 10 bonus credits to your account the moment you sign up. No credit card, no commitment.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, justifyContent: "center" }}>
                  <input type="text" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={{ flex: "1 1 160px", maxWidth: 200, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none" }} />
                  <input type="email" placeholder="Your email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={{ flex: "1 1 200px", maxWidth: 260, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none" }} />
                  <button onClick={submit} disabled={status === "loading" || !form.name || !form.email}
                    style={{ background: GOLD, color: "#000", fontWeight: 800, fontSize: 14, padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer", flexShrink: 0 }}>
                    {status === "loading" ? "Saving…" : "Claim Credits →"}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 16 }}>No spam. Unsubscribe anytime.</p>
              </>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Audit Popup ────────────────────────────────────────────────────────────────
function AuditPopup({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "#0f0f0f", border: `1px solid ${GOLD}30`, borderRadius: 20, padding: "40px 36px", maxWidth: 460, width: "100%", boxShadow: `0 0 80px ${GOLD}18` }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 22 }}>✕</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
          <div style={{ display: "inline-block", background: `${GOLD}18`, border: `1px solid ${GOLD}30`, borderRadius: 100, padding: "5px 14px", marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Free · No Card Required</span>
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 10, lineHeight: 1.2 }}>
            Get Your Free<br /><span style={{ color: GOLD }}>AI Monetisation Audit</span>
          </h3>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 26, lineHeight: 1.65 }}>
            Answer 6 quick questions, add your Instagram URL, and our AI builds a personalised growth + monetisation report — in seconds.
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, textAlign: "left", marginBottom: 26 }}>
            {["Your personalised growth score", "Top quick wins for this week", "90-day revenue roadmap preview", "Personalised platform strategy tip"].map(item => (
              <div key={item} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: GOLD, fontSize: 13, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>{item}</span>
              </div>
            ))}
          </div>
          <Link href="/audit">
            <span onClick={onClose} style={{ display: "block", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "13px", borderRadius: 10, cursor: "pointer" }}>
              Start My Free Audit →
            </span>
          </Link>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 14 }}>Takes 3 minutes · No spam · Ever.</p>
        </div>
      </div>
    </div>
  );
}

// ── Audit CTA Section ────────────────────────────────────────────────────────
  function AuditCTASection() {
    return (
      <section id="audit" style={{ padding: "110px 24px", background: "rgba(255,255,255,0.012)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Free Audit</SectionLabel>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 54px)", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1.08, marginBottom: 20 }}>
              Get Your Free<br />
              <span className="gold-text">AI Monetisation Audit</span>
            </h2>
            <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px" }}>
              Answer 6 quick questions about your content, add your Instagram URL, and our AI generates a personalised growth + revenue report in seconds.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, maxWidth: 680, margin: "0 auto 44px" }}>
              {[
                { icon: "📊", label: "Growth Score" },
                { icon: "⚡", label: "Quick Wins" },
                { icon: "🗺️", label: "90-Day Roadmap" },
                { icon: "💰", label: "Revenue Estimate" },
              ].map(({ icon, label }) => (
                <div key={label} style={{ background: GOLD + "08", border: "1px solid " + GOLD + "25", borderRadius: 12, padding: "16px 12px" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{label}</div>
                </div>
              ))}
            </div>
            <Link href="/audit">
              <span className="cta-gold" style={{ display: "inline-block", background: GOLD, color: "#000", fontWeight: 800, fontSize: 16, padding: "16px 40px", borderRadius: 10, cursor: "pointer", letterSpacing: "-0.01em" }}>
                Start My Free Audit →
              </span>
            </Link>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 14 }}>Takes 3 minutes · No credit card · 100% free</p>
          </FadeIn>
        </div>
      </section>
    );
  }

  // ── Pricing Section ───────────────────────────────────────────────────────────
function PricingSection() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [choiceModal, setChoiceModal] = useState<{ open: boolean; planName: string; link: string }>({ open: false, planName: "", link: "" });

  const PAID_PLANS = ["Tier 2", "Tier 3", "Tier 4"];
  const PLAN_SLUG: Record<string, string> = {
    "Tier 1": "free", "Tier 2": "starter", "Tier 3": "growth", "Tier 4": "pro", "Tier 5": "elite",
  };

  const handlePlanClick = async (planName: string, defaultLink: string, e: React.MouseEvent) => {
    // Logged-in user without confirmed plan → fast-confirm and redirect
    if (user && !user.planConfirmed && planName !== "Tier 5") {
      e.preventDefault();
      const slug = PLAN_SLUG[planName] || "free";
      setConfirming(planName);
      try {
        const updated = await apiRequest("POST", "/api/auth/confirm-plan", { plan: slug });
        queryClient.setQueryData(["/api/auth/me"], updated);
        navigate("/select-plan");
      } catch {
        setConfirming(null);
      }
      return;
    }
    // Non-logged-in clicking a paid plan → show choice modal
    if (!user && PAID_PLANS.includes(planName)) {
      e.preventDefault();
      setChoiceModal({ open: true, planName, link: defaultLink });
    }
  };

  const PLANS = [
    {
      name: "Tier 1",
      subtitle: "Free Community",
      price: "Free",
      period: "",
      tag: "Get Started",
      color: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.08)",
      highlight: false,
      credits: "5 credits / day",
      features: ["Group chat community access", "Free resources & lead magnets", "5 AI credits per day", "Access to all AI tools", "Basic content ideas", "Partial audit preview"],
      limitations: ["Watermark on exports", "Slower processing"],
      cta: "Join Free",
      link: "/register",
    },
    {
      name: "Tier 2",
      subtitle: "Starter",
      price: "$29",
      period: "/mo",
      tag: "Popular",
      color: "rgba(99,102,241,0.07)",
      border: "rgba(99,102,241,0.28)",
      highlight: false,
      credits: "150 credits / month",
      features: ["Everything in Tier 1", "150 AI credits per month", "Full audit access", "AI Content Ideas", "Carousel Studio", "Caption Studio", "Story Generator", "Lead Magnet Generator"],
      limitations: ["Watermark on exports"],
      cta: "Get Tier 2",
      link: "/register",
    },
    {
      name: "Tier 3",
      subtitle: "Growth",
      price: "$59",
      period: "/mo",
      tag: "Best Value",
      color: `${GOLD}0a`,
      border: `${GOLD}45`,
      highlight: true,
      credits: "350 credits / month",
      features: ["Everything in Tier 2", "350 AI credits/month", "No watermarks", "Competitor Intelligence", "AI Content Report", "Brand Kit Builder", "ICP Builder", "Audience Psychology Map", "Priority processing"],
      limitations: [],
      cta: "Get Tier 3",
      link: "/register",
    },
    {
      name: "Tier 4",
      subtitle: "Pro",
      price: "$79",
      period: "/mo",
      tag: "Full Access",
      color: "rgba(52,211,153,0.06)",
      border: "rgba(52,211,153,0.25)",
      highlight: false,
      credits: "700 credits / month",
      features: ["Everything in Tier 3", "700 AI credits/month", "AI Video Editor", "DM Tracker", "Full AI Content Coach", "SOP Generator", "AI Content Planner", "Direct team messaging"],
      limitations: [],
      cta: "Get Tier 4",
      link: "/register",
    },
    {
      name: "Tier 5",
      subtitle: "Work With Us",
      price: "Apply",
      period: "",
      tag: "Unlimited Credits",
      color: "rgba(212,180,97,0.07)",
      border: "rgba(212,180,97,0.35)",
      highlight: false,
      credits: "Unlimited",
      features: ["Unlimited AI credits", "Done-with-you strategy", "Direct team collaboration", "Priority 1-on-1 support", "Full system access", "High-level growth guidance"],
      limitations: [],
      cta: "Apply Now",
      link: "/apply",
    },
  ];

  return (
    <section id="pricing" style={{ padding: "110px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionLabel>Simple Pricing</SectionLabel>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 50px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.1, marginBottom: 14 }}>
              Start Free. Scale When Ready.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", maxWidth: 500, margin: "0 auto" }}>
              Every tier gives you real value. Upgrade only when you're ready for more.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 100}>
              <div style={{
                background: plan.color,
                border: `1px solid ${plan.border}`,
                borderRadius: 20,
                padding: "32px 28px",
                position: "relative",
                boxShadow: plan.highlight ? `0 0 60px ${GOLD}14` : "none",
                height: "100%",
                display: "flex",
                flexDirection: "column" as const,
              }}>
                {plan.highlight && (
                  <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: GOLD, color: "#000", fontSize: 11, fontWeight: 800, padding: "4px 16px", borderRadius: 100, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                    ⭐ Best Value
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "inline-block", background: "rgba(255,255,255,0.06)", borderRadius: 100, padding: "3px 10px", marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", textTransform: "uppercase" as const }}>{plan.tag}</span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{plan.name}</h3>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>{(plan as any).subtitle}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 42, fontWeight: 900, color: plan.highlight ? GOLD : "#fff", letterSpacing: "-0.03em" }}>{plan.price}</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{plan.period}</span>
                  </div>
                  <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: `${GOLD}12`, borderRadius: 100, padding: "4px 10px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>⚡ {plan.credits}</span>
                  </div>
                </div>

                <div style={{ flex: 1, marginBottom: 24 }}>
                  {plan.features.map((f, fi) => (
                    <div key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <span style={{ color: GOLD, fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 2 }}>✓</span>
                      <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                  {plan.limitations.map((l, li) => (
                    <div key={li} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <span style={{ color: "rgba(239,68,68,0.7)", fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 2 }}>✕</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.4, textDecoration: "line-through" as const }}>{l}</span>
                    </div>
                  ))}
                </div>

                {plan.link.startsWith("/") ? (
                  <Link href={plan.link}>
                    <button
                      onClick={e => handlePlanClick(plan.name, plan.link, e)}
                      disabled={confirming === plan.name}
                      style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14, background: plan.highlight ? GOLD : "rgba(255,255,255,0.08)", color: plan.highlight ? "#000" : "#fff", transition: "opacity 0.2s", opacity: confirming === plan.name ? 0.7 : 1 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = confirming === plan.name ? "0.7" : "1")}
                    >{confirming === plan.name ? "Confirming…" : `${plan.cta} →`}</button>
                  </Link>
                ) : (
                  <a href={plan.link} target={plan.link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                    <button
                      onClick={e => handlePlanClick(plan.name, plan.link, e)}
                      disabled={confirming === plan.name}
                      style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14, background: plan.highlight ? GOLD : "rgba(255,255,255,0.08)", color: plan.highlight ? "#000" : "#fff", transition: "opacity 0.2s", opacity: confirming === plan.name ? 0.7 : 1 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = confirming === plan.name ? "0.7" : "1")}
                    >{confirming === plan.name ? "Confirming…" : `${plan.cta} →`}</button>
                  </a>
                )}
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={300}>
          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 32 }}>
            All plans include access to the Brandverse portal · Payments processed securely via Razorpay
          </p>
        </FadeIn>
      </div>

      {/* Choice Modal */}
      {choiceModal.open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setChoiceModal({ open: false, planName: "", link: "" })}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#0e0e0e", border: "1px solid rgba(212,180,97,0.25)", borderRadius: 20, padding: "36px 32px", maxWidth: 420, width: "100%", textAlign: "center" }}
          >
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ fontSize: 22 }}>✨</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>How would you like to start?</h3>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", marginBottom: 28, lineHeight: 1.6 }}>
              Not sure which plan is right for you? Get a free brand audit first — or jump straight to {choiceModal.planName}.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={() => { navigate("/audit"); setChoiceModal({ open: false, planName: "", link: "" }); }}
                style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "1px solid rgba(212,180,97,0.3)", background: "rgba(212,180,97,0.08)", color: GOLD, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,180,97,0.15)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,180,97,0.08)")}
              >
                🔍 Get My Free Audit First
              </button>
              <button
                onClick={() => { navigate("/register"); setChoiceModal({ open: false, planName: "", link: "" }); }}
                style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", background: GOLD, color: "#000", fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                🚀 Sign Up & Get {choiceModal.planName}
              </button>
            </div>
            <button
              onClick={() => setChoiceModal({ open: false, planName: "", link: "" })}
              style={{ marginTop: 16, background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const needsPlan = user && !user.planConfirmed && user.role !== "admin";
  const [showPopup, setShowPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    if (popupDismissed) return;
    // Show after 2 minutes OR when user scrolls 65% of the page
    const timer = setTimeout(() => { if (!popupDismissed) setShowPopup(true); }, 120000);
    const onScroll = () => {
      const scrollPct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrollPct >= 0.65 && !popupDismissed) { setShowPopup(true); window.removeEventListener("scroll", onScroll); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
  }, [popupDismissed]);

  return (
    <div style={{ background: "#060606", minHeight: "100vh", color: "#fff", fontFamily: "'Inter', -apple-system, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d0d0d; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @keyframes gradient-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes pulse-glow { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @keyframes float-up { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        .hero-badge { animation: pulse-glow 2.8s ease infinite; }
        .gold-text {
          background: linear-gradient(135deg, #d4b461 0%, #f0d080 50%, #d4b461 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-shift 4s ease infinite;
        }
        .cta-gold { transition: all 0.2s ease; }
        .cta-gold:hover { opacity: 0.88; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(212,180,97,0.35); }
        .cta-outline { transition: all 0.2s ease; }
        .cta-outline:hover { background: rgba(255,255,255,0.07) !important; transform: translateY(-2px); }
      `}</style>

      {showPopup && (
        <AuditPopup onClose={() => { setShowPopup(false); setPopupDismissed(true); }} />
      )}

      <Navbar />

      {/* ── Plan Required Banner ─────────────────────────────────────────────── */}
      {needsPlan && (
        <div style={{ position: "sticky", top: 0, zIndex: 200, background: `linear-gradient(90deg, ${GOLD}22, ${GOLD}14)`, borderBottom: `1px solid ${GOLD}40`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, backdropFilter: "blur(12px)" }}>
          <span style={{ fontSize: 18 }}>👋</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)", margin: 0 }}>
            Hey <span style={{ color: GOLD }}>{user?.name?.split(" ")[0]}</span> — you're signed in! Pick a plan below to unlock your portal.
          </p>
          <a href="#pricing" style={{ textDecoration: "none" }}>
            <span style={{ background: GOLD, color: "#000", fontWeight: 800, fontSize: 12, padding: "6px 16px", borderRadius: 100, cursor: "pointer", whiteSpace: "nowrap" as const }}>
              Choose Plan ↓
            </span>
          </a>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", paddingTop: 170, paddingBottom: 120, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: -220, left: "50%", transform: "translateX(-50%)", width: 1000, height: 700, background: `radial-gradient(ellipse at center, ${GOLD}1a 0%, transparent 60%)`, filter: "blur(60px)" }} />
          <div style={{ position: "absolute", top: 60, right: -150, width: 600, height: 600, background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div style={{ position: "absolute", bottom: -50, left: -100, width: 500, height: 500, background: "radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)", filter: "blur(70px)" }} />
        </div>

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${GOLD}14`, border: `1px solid ${GOLD}35`, borderRadius: 100, padding: "7px 18px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: GOLD, letterSpacing: "0.05em" }}>Creator Ecosystem · Tools · Strategy · Support</span>
            </div>
          </div>

          <h1 style={{ fontSize: "clamp(38px, 6vw, 76px)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.04em", color: "#fff", marginBottom: 26 }}>
            Build a Content System<br />
            <span className="gold-text">That Actually Scales</span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 44, maxWidth: 640, margin: "0 auto 44px" }}>
            Join a creator ecosystem designed to help you grow faster with the right tools, strategies, and support — all in one place.
            Turn your content into a structured, scalable system instead of guessing what to post next.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/audit">
              <span className="cta-gold" style={{ display: "inline-block", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "15px 34px", borderRadius: 10, cursor: "pointer", letterSpacing: "-0.01em" }}>
                Get My Free Audit →
              </span>
            </Link>
            <Link href="/apply">
              <span className="cta-outline" style={{ display: "inline-block", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: 15, padding: "15px 34px", borderRadius: 10, cursor: "pointer" }}>
                Apply to Work With Us
              </span>
            </Link>
          </div>

          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 18 }}>Free audit · No card required · Real strategy, not a pitch</p>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section id="results" style={{ padding: "56px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <StatCard number="3x" label="Average engagement increase" delay={0} />
            <StatCard number="100K+" label="Followers scaled across clients" delay={100} />
            <StatCard number="50+" label="Content creators & brands" delay={200} />
            <StatCard number="24/7" label="System working while you sleep" delay={300} />
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "110px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 70 }}>
              <SectionLabel>Why Most Creators Stay Stuck</SectionLabel>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 50px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.1 }}>
                Creating Consistently —<br />But Not Growing Consistently
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", marginTop: 18, maxWidth: 520, margin: "18px auto 0" }}>
                Having an audience doesn't automatically mean having a system. Most creators face the same hidden friction:
              </p>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40, alignItems: "start" }}>
            <FadeIn delay={0}>
              <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 20, padding: "36px" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.75)", marginBottom: 24 }}>Without a System</h3>
                <XItem>Guessing what to post next, every single week</XItem>
                <XItem>No clear niche, direction, or audience strategy</XItem>
                <XItem>Content burnout without scalable returns</XItem>
                <XItem>Unclear what's working — and what's not</XItem>
                <XItem>No structure to turn ideas into consistent output</XItem>
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <div style={{ background: `${GOLD}07`, border: `1px solid ${GOLD}25`, borderRadius: 20, padding: "36px" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: GOLD, marginBottom: 24 }}>With Brandverse</h3>
                <CheckItem>A personalized content system tailored to your niche</CheckItem>
                <CheckItem>Clear direction: audience, goals, and strategy defined</CheckItem>
                <CheckItem>Workflows that guide you from idea to execution</CheckItem>
                <CheckItem>Competitor analysis to see exactly what's working</CheckItem>
                <CheckItem>A content engine so you never run out of ideas</CheckItem>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── WHAT'S INSIDE ────────────────────────────────────────────────────── */}
      <section id="inside" style={{ padding: "100px 24px", background: "rgba(255,255,255,0.012)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <SectionLabel>Everything You Need</SectionLabel>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 50px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.1 }}>
                Built for Creators Who Are<br />Serious About Growth
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", marginTop: 18, maxWidth: 500, margin: "18px auto 0" }}>
                Every tool, framework, and resource you need — all inside one ecosystem.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <FeatureCard delay={0} icon="🎯"
              title="Personalized Content System"
              desc="Define your niche, target audience, and goals — then instantly generate a personalized content system built around your direction and what your audience actually wants." />
            <FeatureCard delay={70} icon="🔄"
              title="Idea-to-Execution Workflows"
              desc="Move seamlessly from idea to published content using built-in workflows that guide you through scripting, editing, and publishing — no guesswork, no blank pages." />
            <FeatureCard delay={140} icon="🕵️"
              title="Competitor Intelligence"
              desc="See exactly what's working in your space. Break down top-performing content, identify patterns, and apply proven strategies using a structured analytical approach." />
            <FeatureCard delay={0} icon="🧪"
              title="Variety Testing System"
              desc="Test different formats, hooks, and content styles to figure out what works fastest for you. Data-backed experimentation without the guesswork." />
            <FeatureCard delay={70} icon="📚"
              title="Mini Courses & Step-by-Step Guides"
              desc="Unlock access to proven growth strategies, plug-and-play resources, frameworks, and lead magnets you can start using immediately — no waiting required." />
            <FeatureCard delay={140} icon="🏆"
              title="Community & My Wins Space"
              desc="Connect with creators posting real results — growth spikes, revenue milestones, and breakthroughs. Share, learn, and stay motivated alongside people who get it." />
          </div>

          <FadeIn delay={200}>
            <div style={{ marginTop: 40, textAlign: "center", background: `${GOLD}08`, border: `1px solid ${GOLD}22`, borderRadius: 14, padding: "22px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🚀</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>
                Plus <strong style={{ color: GOLD }}>tons more tools dropping soon</strong> — DM Tracker, AI Video Editor, Advanced Analytics, AI Content Coach, and more.
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── AUDIT CTA ────────────────────────────────────────────────────────── */}
      <AuditCTASection />

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section id="how" style={{ padding: "110px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <SectionLabel>The Process</SectionLabel>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 50px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.1 }}>
                From Randomness to Structure.<br />From Structure to Scale.
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40 }}>
            {[
              ["01", "Set Your Direction", "Define your niche, target audience, and goals. Build the foundation your entire content system will be built on.", "🎯"],
              ["02", "Build Your System", "Get a personalized content engine, workflow structure, and idea vault — tailored specifically to your direction.", "⚙️"],
              ["03", "Execute Consistently", "Use the built-in workflows and accountability to ship content without burning out or second-guessing yourself.", "⚡"],
              ["04", "Track & Refine", "Monitor what's working, cut what isn't, and double down on the strategies that compound your growth over time.", "📈"],
            ].map(([num, title, desc, icon], i) => (
              <FadeIn key={num} delay={i * 100}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 30, marginBottom: 14 }}>{icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Step {num}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 12 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "rgba(255,255,255,0.012)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <SectionLabel>Real Results</SectionLabel>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 46px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", marginBottom: 14 }}>
                Creators Who Scaled with Brandverse
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>Structured systems. Real growth. Actual results.</p>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 18 }}>
            <Testimonial delay={0}
              text="Before Brandverse, I was posting randomly and hoping something would stick. Within 60 days of having an actual system, my engagement tripled and I finally know what to create every week."
              name="Priya M." handle="Lifestyle Creator · 82K Followers" />
            <Testimonial delay={80}
              text="The competitor analysis alone was worth it. I could see exactly which formats were working in my niche and reversed-engineered them fast. Went from 12K to 47K in 4 months."
              name="James R." handle="Fitness Coach · 47K Followers" />
            <Testimonial delay={160}
              text="I used to spend hours figuring out what to post. Now the system does the thinking for me. I just show up, execute, and the results are consistently there. Game changer."
              name="Sofia K." handle="Business Creator · 120K Followers" />
          </div>
        </div>
      </section>

      {/* ── PROMISE SECTION ──────────────────────────────────────────────────── */}
      <section style={{ padding: "110px 24px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Our Promise</SectionLabel>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.1, marginBottom: 24 }}>
              Everything Is Designed to Move You<br />
              <span className="gold-text">Forward, Not Just Keep You Busy</span>
            </h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.75, marginBottom: 48 }}>
              As you continue growing, you'll naturally unlock deeper layers — more advanced strategies, more powerful tools, and a tighter feedback loop between your content and your results. 
              The process is designed to meet you where you are and scale with you as you grow.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 56, textAlign: "left" }}>
              {[
                ["📌", "Defined Niche & Direction"],
                ["🔧", "Your Own Content System"],
                ["📊", "Data-Backed Decisions"],
                ["🤝", "Community & Accountability"],
                ["🧠", "Proven Growth Frameworks"],
                ["🎯", "Consistent Execution Path"],
              ].map(([icon, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 18px" }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{label}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── EMAIL CAPTURE STRIP ──────────────────────────────────────────────── */}
      <EmailCaptureStrip onCapture={() => setPopupDismissed(true)} />

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 120px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 400, background: `radial-gradient(ellipse at center, ${GOLD}12 0%, transparent 65%)`, filter: "blur(60px)" }} />
        </div>

        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <FadeIn>
            <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${GOLD}22`, borderRadius: 24, padding: "60px 48px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>⚡ Limited Spots Available</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.15, marginBottom: 20 }}>
                Ready to Build Your Content System?
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginBottom: 36 }}>
                Book a free 30-minute strategy call. We'll map out your content direction, identify what's holding you back, and show you exactly how the system works for your niche.
              </p>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
                <span className="cta-gold" style={{ display: "inline-block", background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000", fontWeight: 800, fontSize: 16, padding: "17px 40px", borderRadius: 12, cursor: "pointer", marginBottom: 16 }}>
                  Book Your Free Strategy Call →
                </span>
              </a>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {["✓ No commitment", "✓ 30 minutes", "✓ Real strategy"].map(t => (
                  <span key={t} style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{t}</span>
                ))}
              </div>

              <div style={{ marginTop: 28, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Already a member?</p>
                <Link href="/login">
                  <span style={{ fontSize: 14, color: GOLD, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Sign in to your portal →</span>
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#000" }}>B</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Brandverse</span>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {[["https://brandversee.info", "Website"], [CALENDLY, "Book a Call"], ["/login", "Portal Login"]].map(([href, label]) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}>
                {label}
              </a>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2025 Brandverse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
