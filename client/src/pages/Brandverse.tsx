import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import oraviniLogoPath from "@assets/ORAVINI_FINAL_LOGO_1774695199024.png";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";
const CALENDLY = "https://calendly.com/brandversee/30min";

function useScrollAnim() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-bv-anim]");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).style.opacity = "1";
          (e.target as HTMLElement).style.transform = "none";
        }
      });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function Anim({ children, delay = 0, from = "translateY(36px)", style = {} }: { children: React.ReactNode; delay?: number; from?: string; style?: React.CSSProperties }) {
  return (
    <div data-bv-anim="1" style={{ opacity: 0, transform: from, transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

const CALL_QS = [
  { q: "What's your biggest content challenge right now?", opts: ["Low engagement", "Inconsistent posting", "No clear strategy", "Growing too slowly", "Content ideas dry up"] },
  { q: "What platform are you primarily on?", opts: ["Instagram", "YouTube", "TikTok", "LinkedIn", "X (Twitter)"] },
  { q: "What's your current following size?", opts: ["Under 1,000", "1K–10K", "10K–50K", "50K–100K", "100K+"] },
  { q: "What's your primary goal in the next 90 days?", opts: ["Monetize audience", "Hit follower milestone", "Launch a product", "Get brand deals", "Build consistent content machine"] },
];

function StrategyModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const done = step >= CALL_QS.length;
  const pick = (opt: string) => { setAnswers(a => [...a, opt]); setStep(s => s + 1); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#080808", border: `1px solid ${GOLD}33`, borderRadius: 24, padding: "44px 40px", maxWidth: 520, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 22, cursor: "pointer" }}>✕</button>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: GOLD, marginBottom: 10 }}>You're pre-qualified!</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
              You're exactly the type of creator we work with. Book your free 30-min strategy call now — our team will build a custom growth plan for you.
            </div>
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, borderRadius: 12, padding: "15px 36px", textDecoration: "none" }}>
              Book My Free Strategy Call →
            </a>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
              {CALL_QS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= step ? GOLD : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", marginBottom: 10 }}>Question {step + 1} of {CALL_QS.length}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 24, lineHeight: 1.4 }}>{CALL_QS[step].q}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CALL_QS[step].opts.map(opt => (
                <button key={opt} onClick={() => pick(opt)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "13px 18px", color: "rgba(255,255,255,0.8)", fontSize: 14, cursor: "pointer", textAlign: "left", fontWeight: 500, transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget).style.border = `1px solid ${GOLD}88`; (e.currentTarget).style.color = GOLD; }}
                  onMouseLeave={e => { (e.currentTarget).style.border = "1px solid rgba(255,255,255,0.1)"; (e.currentTarget).style.color = "rgba(255,255,255,0.8)"; }}>
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Brandverse() {
  const [, nav] = useLocation();
  const [showStrategy, setShowStrategy] = useState(false);
  useScrollAnim();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ background: "#000", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden", position: "relative", zIndex: 1 }}>
      <style>{`
        @keyframes bvPulse { 0%,100%{ box-shadow:0 0 0 0 rgba(212,180,97,0.3); } 70%{ box-shadow:0 0 0 18px rgba(212,180,97,0); } }
        @keyframes bvOrb1 { 0%,100%{ transform:translate(0,0); } 50%{ transform:translate(40px,-50px) scale(1.1); } }
        @keyframes bvOrb2 { 0%,100%{ transform:translate(0,0); } 60%{ transform:translate(-60px,40px) scale(0.9); } }
        @keyframes bvFadeIn { from{ opacity:0; transform:translateY(20px); } to{ opacity:1; transform:none; } }
      `}</style>

      {showStrategy && <StrategyModal onClose={() => setShowStrategy(false)} />}

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(212,180,97,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => nav("/")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer" }}>
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 38, objectFit: "contain" }} />
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => nav("/login")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, padding: "8px 18px", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}55`; e.currentTarget.style.color = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
              Members Login
            </button>
            <button onClick={() => nav("/login?tab=register")} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 800, padding: "9px 20px", cursor: "pointer" }}>
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "100px 24px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,180,97,0.07) 0%, transparent 70%)", top: "-20%", left: "50%", transform: "translateX(-50%)", animation: "bvOrb1 14s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,180,97,0.05) 0%, transparent 70%)", bottom: "-10%", right: "-10%", animation: "bvOrb2 18s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(212,180,97,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(212,180,97,0.025) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, animation: "bvFadeIn 0.8s ease 0.2s both" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.35em", color: GOLD, textTransform: "uppercase", marginBottom: 18 }}>The Team Behind Oravini</div>
          <h1 style={{ fontSize: "clamp(42px, 7vw, 88px)", fontWeight: 900, letterSpacing: "0.04em", background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 50%, #b8962e 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 20, lineHeight: 0.95 }}>
            BRANDVERSE
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.5)", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.8 }}>
            We don't just give creators tools — we build them a complete content system, growth strategy, and revenue framework from the ground up.
          </p>
          <button onClick={() => setShowStrategy(true)} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, border: "none", borderRadius: 12, padding: "16px 40px", cursor: "pointer", animation: "bvPulse 2.5s ease 2s infinite" }}>
            Book a Free Strategy Call →
          </button>
        </div>
      </section>

      {/* What is Brandverse */}
      <section style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
        <Anim style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Our Mission</div>
          <h2 style={{ fontSize: "clamp(28px, 4.5vw, 50px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            We turn creators into <span style={{ color: GOLD }}>brands.</span>
          </h2>
        </Anim>
        <Anim delay={100}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }} className="bv-mission-grid">
            <div>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.85, marginBottom: 20 }}>
                Brandverse is a premium content growth agency built for serious creators and personal brands. We built Oravini — a suite of 9 AI-powered tools — so that every creator we work with has an unfair advantage.
              </p>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.85 }}>
                Our approach is simple: we study your niche, map your audience, build your content system, and execute it with you until your numbers move. Not just advice — an actual system.
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(212,180,97,0.12)", borderRadius: 20, padding: "36px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: GOLD, marginBottom: 6 }}>150+</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>Creators Scaled</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, marginBottom: 6 }}>90 Days</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>Average Results Timeline</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, marginBottom: 6 }}>100%</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Results Guarantee</div>
            </div>
          </div>
          <style>{`@media(max-width:700px){ .bv-mission-grid{ grid-template-columns:1fr !important; } }`}</style>
        </Anim>
      </section>

      {/* VSL Section */}
      <section style={{ padding: "40px 24px 80px" }}>
        <Anim>
          <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}22`, borderRadius: 24, overflow: "hidden", aspectRatio: "16/9", maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(212,180,97,0.08) 0%, transparent 60%)" }} />
            <div style={{ textAlign: "center", zIndex: 1 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${GOLD}22`, border: `2px solid ${GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 30, cursor: "pointer", animation: "bvPulse 2.5s ease-in-out infinite" }}>▶</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>The Brandverse Story</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Video coming soon</div>
            </div>
          </div>
        </Anim>
      </section>

      {/* What You Get — Tier 5 Details */}
      <section style={{ padding: "80px 24px", background: "rgba(212,180,97,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", fontSize: 10, fontWeight: 800, color: "#000", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, borderRadius: 99, padding: "4px 14px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Tier 5 — Done With You</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              What you get when you<br /><span style={{ color: GOLD }}>work with Brandverse</span>
            </h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            {[
              { icon: "🎯", title: "Custom Growth Strategy", desc: "We audit your current presence, map your audience psychology, and build a 90-day content roadmap designed around your specific niche and revenue goals.", tag: "Week 1" },
              { icon: "🤝", title: "Done-With-You Execution", desc: "You're not handed a PDF and left alone. We work alongside you every step of the way — from scripting hooks to reviewing your content calendar weekly.", tag: "Ongoing" },
              { icon: "📞", title: "Weekly Strategy Calls", desc: "Dedicated 1-on-1 calls with your Brandverse strategist to review performance, adjust the plan, and keep momentum going.", tag: "Weekly" },
              { icon: "🛡️", title: "90-Day Results Guarantee", desc: "If we don't move your numbers in 90 days, we keep working at zero extra cost. We stand behind our results.", tag: "Guarantee" },
              { icon: "⚡", title: "Full Platform Access", desc: "Unlimited access to all 9 AI tools in Oravini — content ideas, competitor intelligence, design studio, audience mapping, auto-posting, and more.", tag: "Unlimited" },
              { icon: "📱", title: "Direct Team Access", desc: "Message the Brandverse team directly through your Oravini dashboard. Real people, real answers — not a ticket system.", tag: "Always On" },
            ].map(({ icon, title, desc, tag }, i) => (
              <Anim key={title} delay={i * 70}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,180,97,0.12)", borderRadius: 18, padding: "30px 26px", height: "100%", transition: "transform 0.3s, border-color 0.3s", position: "relative" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}33`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,180,97,0.12)"; }}>
                  <div style={{ position: "absolute", top: 16, right: 16, fontSize: 9, fontWeight: 700, color: GOLD, background: `${GOLD}18`, border: `1px solid ${GOLD}33`, borderRadius: 99, padding: "2px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{tag}</div>
                  <div style={{ fontSize: 30, marginBottom: 14 }}>{icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</div>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.75 }}>{desc}</div>
                </div>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto" }}>
        <Anim style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>How It Works</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            From call to <span style={{ color: GOLD }}>content machine</span>
          </h2>
        </Anim>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { step: "01", title: "Free Strategy Call", desc: "We start with a 30-minute deep dive into your niche, audience, and goals. No pitch — just a real diagnosis of where you are and where you can go." },
            { step: "02", title: "Growth Audit & Mapping", desc: "We analyse your existing content, competitor landscape, and audience psychology to identify the fastest path to growth." },
            { step: "03", title: "System Build", desc: "We build your custom content system: hooks library, content pillars, posting schedule, and monetisation roadmap." },
            { step: "04", title: "Execute & Optimise", desc: "We work with you weekly — reviewing content, adjusting the strategy based on data, and pushing for consistent improvement." },
          ].map(({ step, title, desc }, i) => (
            <Anim key={step} delay={i * 80}>
              <div style={{ display: "flex", gap: 28, padding: "36px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: `${GOLD}30`, fontVariantNumeric: "tabular-nums", flexShrink: 0, lineHeight: 1.2 }}>{step}</div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</div>
                  <div style={{ fontSize: 14.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>{desc}</div>
                </div>
              </div>
            </Anim>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 24px", textAlign: "center", background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,180,97,0.06) 0%, transparent 70%)" }}>
        <Anim>
          <div style={{ fontSize: 11, letterSpacing: "0.35em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>Limited Spots Available</div>
        </Anim>
        <Anim delay={100}>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 60px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 18 }}>
            Ready to build your<br /><span style={{ color: GOLD }}>content empire?</span>
          </h2>
        </Anim>
        <Anim delay={200}>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 40, maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.7 }}>
            We only take a limited number of Tier 5 clients per month. If you're serious about growth, book a call and let's see if we're a fit.
          </p>
        </Anim>
        <Anim delay={300}>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowStrategy(true)} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, border: "none", borderRadius: 12, padding: "17px 44px", cursor: "pointer", boxShadow: `0 0 60px rgba(212,180,97,0.2)` }}>
              Book a Free Strategy Call →
            </button>
            <button onClick={() => nav("/login?tab=register&redirect=audit")} style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 15, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "17px 32px", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}55`; e.currentTarget.style.color = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
              Get My Free Audit First →
            </button>
          </div>
        </Anim>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "36px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 28, objectFit: "contain" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Powered by Brandverse</span>
          </div>
          <button onClick={() => nav("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 13, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            ← Back to Oravini
          </button>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 Oravini. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
