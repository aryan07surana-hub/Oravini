import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

const GOLD = "#d4b461";
const GOLD_DIM = "#d4b46180";

// ── Tiny helpers ─────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
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
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(8,8,8,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${GOLD} 0%, #b8962e 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#000" }}>B</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Brandverse</span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <a href="#features" style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
            Features
          </a>
          <a href="#social-proof" style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
            Results
          </a>
          <Link href="/login">
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500, cursor: "pointer", textDecoration: "none" }}>Log in</span>
          </Link>
          <Link href="/login">
            <span style={{
              background: GOLD, color: "#000", fontSize: 13, fontWeight: 700, padding: "8px 18px",
              borderRadius: 8, cursor: "pointer", display: "inline-block", transition: "opacity 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Get Started
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Dashboard Mockup ─────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: "20px",
      backdropFilter: "blur(10px)",
      width: "100%",
      maxWidth: 560,
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f87171" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fbbf24" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34d399" }} />
        <div style={{ flex: 1, height: 28, background: "rgba(255,255,255,0.04)", borderRadius: 6, marginLeft: 8 }} />
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {[["2.4M", "Total Views", "#34d399"], ["186K", "Followers", GOLD], ["4.2%", "Avg ER", "#818cf8"]].map(([val, label, color]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px", marginBottom: 14, border: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Content Performance</span>
          <span style={{ fontSize: 10, color: GOLD, background: `${GOLD}18`, padding: "2px 8px", borderRadius: 20, border: `1px solid ${GOLD}30` }}>Last 30 days</span>
        </div>
        {/* Mini bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 60 }}>
          {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 11 ? GOLD : `rgba(212,180,97,${0.2 + i * 0.015})`, borderRadius: "3px 3px 0 0", transition: "height 0.5s ease" }} />
          ))}
        </div>
      </div>

      {/* Post list */}
      <div style={{ space: 8 }}>
        {[
          ["🔥 Hook Reel #12", "842K views", "+12.3%", "#34d399"],
          ["📚 Tutorial Series #5", "211K views", "+4.8%", GOLD],
          ["💬 Story Pack March", "97K views", "+2.1%", "#818cf8"],
        ].map(([title, views, pct, color]) => (
          <div key={title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{title}</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{views}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay = 0 }: { icon: string; title: string; desc: string; delay?: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <FadeIn delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "rgba(212,180,97,0.05)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${hovered ? "rgba(212,180,97,0.25)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 16,
          padding: "28px 28px",
          cursor: "default",
          transition: "all 0.25s ease",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
        }}>
        <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8, lineHeight: 1.3 }}>{title}</h3>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>{desc}</p>
      </div>
    </FadeIn>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ number, label, delay = 0 }: { number: string; label: string; delay?: number }) {
  return (
    <FadeIn delay={delay}>
      <div style={{ textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: GOLD, letterSpacing: "-0.03em", lineHeight: 1 }}>{number}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 500 }}>{label}</div>
      </div>
    </FadeIn>
  );
}

// ── Testimonial ───────────────────────────────────────────────────────────────
function Testimonial({ text, name, handle, delay = 0 }: { text: string; name: string; handle: string; delay?: number }) {
  return (
    <FadeIn delay={delay}>
      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "24px",
      }}>
        <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
          {[...Array(5)].map((_, i) => <span key={i} style={{ color: GOLD, fontSize: 14 }}>★</span>)}
        </div>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.65, marginBottom: 20, fontStyle: "italic" }}>"{text}"</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}60, #6366f1)` }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{handle}</div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div style={{ background: "#080808", minHeight: "100vh", color: "#fff", fontFamily: "'Inter', -apple-system, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d0d0d; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @keyframes hero-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes gradient-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes pulse-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .hero-badge { animation: pulse-glow 2.5s ease infinite; }
        .float-dash { animation: hero-float 5s ease-in-out infinite; }
        .cta-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .cta-btn-secondary:hover { background: rgba(255,255,255,0.07) !important; transform: translateY(-1px); }
      `}</style>

      <Navbar />

      {/* ── HERO ── */}
      <section style={{ position: "relative", paddingTop: 160, paddingBottom: 100, overflow: "hidden" }}>
        {/* Background gradients */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: `radial-gradient(ellipse at center, ${GOLD}18 0%, transparent 65%)`, filter: "blur(40px)" }} />
          <div style={{ position: "absolute", top: 100, right: -100, width: 500, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div style={{ position: "absolute", bottom: 0, left: -100, width: 400, height: 400, background: "radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 70%)", filter: "blur(60px)" }} />
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div className="hero-badge" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: `${GOLD}15`, border: `1px solid ${GOLD}35`,
              borderRadius: 100, padding: "7px 16px",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: GOLD, letterSpacing: "0.04em" }}>AI-Powered Content Intelligence</span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto" }}>
            <h1 style={{
              fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 900, lineHeight: 1.08,
              letterSpacing: "-0.04em", color: "#fff", marginBottom: 24,
            }}>
              Turn Your Content Into{" "}
              <span style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, #f0d080 50%, ${GOLD} 100%)`,
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "gradient-shift 4s ease infinite",
              }}>
                Predictable Growth
              </span>
            </h1>
            <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.65, marginBottom: 40, fontWeight: 400 }}>
              Track, analyze, and optimize your Instagram and YouTube content with AI-powered insights,
              competitor intelligence, and automated performance reports.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/login">
                <span className="cta-btn-primary" style={{
                  display: "inline-block", background: GOLD, color: "#000",
                  fontWeight: 700, fontSize: 15, padding: "14px 32px", borderRadius: 10,
                  cursor: "pointer", transition: "all 0.2s ease", letterSpacing: "-0.01em",
                }}>
                  Get Started Free →
                </span>
              </Link>
              <a href="#features" style={{ textDecoration: "none" }}>
                <span className="cta-btn-secondary" style={{
                  display: "inline-block", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: 15,
                  padding: "14px 32px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s ease",
                }}>
                  See How It Works
                </span>
              </a>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="float-dash" style={{ display: "flex", justifyContent: "center", marginTop: 64 }}>
            <div style={{
              position: "relative", padding: "2px",
              background: `linear-gradient(135deg, ${GOLD}40 0%, rgba(99,102,241,0.3) 50%, ${GOLD}20 100%)`,
              borderRadius: 20,
              boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 60px ${GOLD}15`,
            }}>
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="social-proof" style={{ padding: "60px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <StatCard number="3x" label="Average engagement increase" delay={0} />
            <StatCard number="100K+" label="Followers scaled across clients" delay={100} />
            <StatCard number="50+" label="Content creators & brands" delay={200} />
            <StatCard number="24/7" label="AI working while you sleep" delay={300} />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div style={{ display: "inline-block", background: `${GOLD}15`, border: `1px solid ${GOLD}30`, borderRadius: 100, padding: "5px 14px", marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>Everything You Need</span>
              </div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.1 }}>
                Built for creators who are<br />serious about growth
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", marginTop: 16, maxWidth: 500, margin: "16px auto 0" }}>
                Every tool you need in one platform — with tons more features coming very soon.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <FeatureCard delay={0} icon="📊"
              title="Smart Content Tracking"
              desc="Automatically sync Instagram and YouTube stats. Track views, likes, comments, shares, and follower growth — all in real time, all in one place." />
            <FeatureCard delay={80} icon="🤖"
              title="Monthly AI Reports"
              desc="Generate detailed AI-powered reports every month. Identify top-performing patterns and get actionable insights, not just raw numbers." />
            <FeatureCard delay={160} icon="🔥"
              title="Virality Tester"
              desc="AI analyzes your content before you publish. Score your hook, caption, and structure. Know if it'll go viral before you hit post." />
            <FeatureCard delay={0} icon="📅"
              title="Content Calendar"
              desc="Visual calendar to plan, visualize, and stay consistent. Align your posting strategy with your performance data." />
            <FeatureCard delay={80} icon="🕵️"
              title="Competitor Intelligence"
              desc="Deep competitor breakdowns. Analyze their best-performing content, discover niche trends, and reverse-engineer what works." />
            <FeatureCard delay={160} icon="✍️"
              title="AI Content Coach"
              desc="Your personal growth mentor — real-time script feedback, hook generation, tone modes, brand builder, and a personalized 30-day roadmap." />
          </div>

          {/* Coming soon banner */}
          <FadeIn delay={200}>
            <div style={{
              marginTop: 40, textAlign: "center",
              background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.2)",
              borderRadius: 14, padding: "20px 32px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <span style={{ fontSize: 18 }}>🚀</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>
                And <strong style={{ color: GOLD }}>tons more features</strong> are dropping very soon — DM Tracker, Course Modules, Advanced Analytics, and more.
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "80px 24px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>
                From chaos to clarity in minutes
              </h2>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
            {[
              ["01", "Connect", "Link your Instagram or YouTube account. Everything syncs automatically from day one.", "🔗"],
              ["02", "Analyze", "AI processes your content performance, patterns, and audience behavior in real time.", "🧠"],
              ["03", "Optimize", "Get specific, actionable recommendations on what to fix, what to scale, and what to cut.", "⚡"],
              ["04", "Grow", "Watch your engagement, reach, and followers climb with data-backed decisions every week.", "📈"],
            ].map(([num, title, desc, icon], i) => (
              <FadeIn key={num} delay={i * 100}>
                <div style={{ textAlign: "center", position: "relative" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Step {num}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", marginBottom: 12 }}>
                Creators who scaled with Brandverse
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>Real results from real creators.</p>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <Testimonial delay={0}
              text="The AI reports alone are worth it. I finally understand what content is actually working instead of guessing. Engagement went up 3x in 6 weeks."
              name="Sofia Rahman" handle="@sofiacreates — 87K followers" />
            <Testimonial delay={100}
              text="Competitor Intelligence is insane. I found exact content patterns my niche was using, copied the formula, and my next reel hit 400K views."
              name="Marcus Lee" handle="@marcusbuilds — 142K followers" />
            <Testimonial delay={200}
              text="The AI Content Coach helped me rewrite my hooks from scratch. My retention went from 8 seconds average to 28 seconds. Game changer."
              name="Priya K." handle="@priyalifestyle — 61K followers" />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "100px 24px 120px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 400, background: `radial-gradient(ellipse, ${GOLD}15 0%, transparent 65%)`, filter: "blur(50px)" }} />
        </div>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <FadeIn>
            <div style={{ display: "inline-block", background: `${GOLD}15`, border: `1px solid ${GOLD}30`, borderRadius: 100, padding: "5px 14px", marginBottom: 24 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>Start Today</span>
            </div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1.08, marginBottom: 20 }}>
              Ready to Scale Your Content?
            </h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", marginBottom: 44, lineHeight: 1.6 }}>
              Join creators who've stopped guessing and started growing. Your data is waiting.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/login">
                <span className="cta-btn-primary" style={{
                  display: "inline-block", background: GOLD, color: "#000",
                  fontWeight: 700, fontSize: 16, padding: "16px 40px", borderRadius: 12,
                  cursor: "pointer", transition: "all 0.2s ease",
                  boxShadow: `0 0 40px ${GOLD}40`,
                }}>
                  Get Access Now
                </span>
              </Link>
              <Link href="/login">
                <span className="cta-btn-secondary" style={{
                  display: "inline-block", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 16,
                  padding: "16px 40px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s ease",
                }}>
                  Login
                </span>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${GOLD} 0%, #b8962e 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#000" }}>B</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Brandverse</span>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            <Link href="/privacy"><span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", cursor: "pointer", textDecoration: "none" }}>Privacy</span></Link>
            <Link href="/terms"><span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", cursor: "pointer", textDecoration: "none" }}>Terms</span></Link>
            <Link href="/login"><span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", cursor: "pointer", textDecoration: "none" }}>Login</span></Link>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 Brandverse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
