import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${GOLD} 0%, #b8962e 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: "#000" }}>B</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Brandverse</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[["#how", "How It Works"], ["#inside", "What's Inside"], ["#results", "Results"]].map(([href, label]) => (
            <a key={href} href={href} style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>
              {label}
            </a>
          ))}
          <Link href="/login">
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Log in</span>
          </Link>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
            <span style={{ background: GOLD, color: "#000", fontSize: 13, fontWeight: 700, padding: "9px 20px", borderRadius: 8, cursor: "pointer", display: "inline-block", transition: "opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Book a Call
            </span>
          </a>
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

export default function Landing() {
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

      <Navbar />

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
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
              <span className="cta-gold" style={{ display: "inline-block", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "15px 34px", borderRadius: 10, cursor: "pointer", letterSpacing: "-0.01em" }}>
                Book a Free Strategy Call →
              </span>
            </a>
            <Link href="/login">
              <span className="cta-outline" style={{ display: "inline-block", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: 15, padding: "15px 34px", borderRadius: 10, cursor: "pointer" }}>
                Access Your Portal
              </span>
            </Link>
          </div>

          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 18 }}>No upfront commitment · 30-minute call · Real strategy, not a pitch</p>
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
