import { Link } from "wouter";

const GOLD = "#d4b461";
const CALENDLY = "https://calendly.com/brandversee/30min";

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${GOLD}20`, border: `1px solid ${GOLD}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>✓</span>
      </div>
      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.78)", lineHeight: 1.55 }}>{children}</span>
    </div>
  );
}

function ResultCard({ emoji, stat, label }: { emoji: string; stat: string; label: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontSize: 38, fontWeight: 900, color: GOLD, letterSpacing: "-0.03em", lineHeight: 1 }}>{stat}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 8, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function Apply() {
  return (
    <div style={{ background: "#060606", minHeight: "100vh", color: "#fff", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(6,6,6,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${GOLD} 0%, #b8962e 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#000" }}>B</div>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Oravini</span>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Link href="/login"><span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Log in</span></Link>
            <Link href="/audit">
              <span style={{ background: GOLD, color: "#000", fontSize: 13, fontWeight: 700, padding: "9px 20px", borderRadius: 8, cursor: "pointer", display: "inline-block" }}>
                Get My Free Audit
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ paddingTop: 100 }}>
        {/* Hero */}
        <section style={{ padding: "80px 24px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: `radial-gradient(ellipse, ${GOLD}18 0%, transparent 60%)`, filter: "blur(60px)" }} />
          </div>
          <div style={{ maxWidth: 820, margin: "0 auto", position: "relative" }}>
            <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}35`, borderRadius: 100, padding: "5px 16px", marginBottom: 22 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Application Only · Limited Spots</span>
            </div>
            <h1 style={{ fontSize: "clamp(34px, 5.5vw, 68px)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.04em", color: "#fff", marginBottom: 24 }}>
              We Help You Scale Your<br />
              <span style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #f0d080 50%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Content System &amp; Info Coaching Business
              </span>
            </h1>
            <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 44px" }}>
              Oravini works directly with creators, coaches, and info business owners to build the systems, strategy, and content engine that gets you to consistent growth — without burning out.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
                <span style={{ display: "inline-block", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "15px 34px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
                  Apply Now →
                </span>
              </a>
              <Link href="/audit">
                <span style={{ display: "inline-block", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: 15, padding: "15px 34px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}>
                  Get My Free Audit
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Results */}
        <section style={{ padding: "20px 24px 80px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <ResultCard emoji="📈" stat="3x" label="Average engagement lift" />
            <ResultCard emoji="👥" stat="100K+" label="Followers scaled" />
            <ResultCard emoji="🎯" stat="50+" label="Creators & coaches" />
            <ResultCard emoji="💰" stat="$10K+" label="Avg monthly revenue unlocked" />
          </div>
        </section>

        {/* What Oravini Does */}
        <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}30`, borderRadius: 100, padding: "5px 16px", marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>What We Do</span>
              </div>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.1 }}>
                Your AI-Powered Growth System
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", marginTop: 16, maxWidth: 500, margin: "16px auto 0" }}>
                We combine strategy, AI tools, and done-with-you execution to help you build a real content business.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              {[
                { icon: "🧠", title: "AI Content Strategy", desc: "Personalized content pillars, hooks, and ideas generated from your niche and audience — so you always know what to create." },
                { icon: "📊", title: "Instagram & YouTube Analytics", desc: "Auto-synced tracking of your posts, reels, and videos with competitor analysis to show what's working in your space." },
                { icon: "⚡", title: "AI Content Coach", desc: "On-demand coaching for content scripts, captions, hooks, and strategy — available whenever you need it." },
                { icon: "🎬", title: "AI Video Editor", desc: "Upload raw footage and get a polished, platform-optimized video back. No editing skills required." },
                { icon: "🎯", title: "Competitor Intelligence", desc: "See exactly what's performing for top accounts in your niche, so you can model what works without guessing." },
                { icon: "🚀", title: "Done-With-You Strategy", desc: "For Elite members: direct collaboration on your content system, offers, and growth strategy with our team." },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "28px" }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section style={{ padding: "80px 24px" }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}30`, borderRadius: 100, padding: "5px 16px", marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Who It's For</span>
              </div>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.1 }}>
                Built for Serious Creators &amp; Coaches
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
              {[
                { emoji: "📸", title: "Content Creators", desc: "Instagram, YouTube, TikTok — you create content and want to turn it into a scalable system with real revenue." },
                { emoji: "🎓", title: "Info Business Owners", desc: "You sell courses, memberships, or coaching and want AI-powered content to grow your audience and sales." },
                { emoji: "💼", title: "Personal Brand Builders", desc: "You're building authority in your niche and need a system to consistently produce high-quality content." },
              ].map(({ emoji, title, desc }) => (
                <div key={title} style={{ background: `${GOLD}07`, border: `1px solid ${GOLD}22`, borderRadius: 18, padding: "28px", textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>{emoji}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 12 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{desc}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px 28px" }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>You're a great fit if you:</h4>
              <CheckItem>Already create content (even inconsistently) and want to scale it</CheckItem>
              <CheckItem>Have a clear niche or are willing to define one</CheckItem>
              <CheckItem>Want to monetise your content or grow your existing offers</CheckItem>
              <CheckItem>Are ready to commit to building a real system — not just tools</CheckItem>
            </div>
          </div>
        </section>

        {/* Elite CTA */}
        <section style={{ padding: "80px 24px 100px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ background: `linear-gradient(135deg, ${GOLD}12 0%, rgba(255,255,255,0.03) 100%)`, border: `1px solid ${GOLD}30`, borderRadius: 24, padding: "56px 48px", textAlign: "center" }}>
              <div style={{ display: "inline-block", background: `${GOLD}20`, border: `1px solid ${GOLD}50`, borderRadius: 100, padding: "5px 16px", marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>🔴 Oravini Elite · Application Only</span>
              </div>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", marginBottom: 18, lineHeight: 1.15 }}>
                Scale Your Info Coaching Business<br />
                <span style={{ color: GOLD }}>With Our Team Beside You</span>
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 32, maxWidth: 520, margin: "0 auto 32px" }}>
                Elite is our highest-touch program — done-with-you strategy, unlimited AI tool access, priority processing, and direct collaboration with the Oravini team to build your content empire.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
                  <span style={{ display: "inline-block", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "14px 32px", borderRadius: 10, cursor: "pointer" }}>
                    Apply to Work With Us →
                  </span>
                </a>
                <Link href="/audit">
                  <span style={{ display: "inline-block", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontWeight: 600, fontSize: 15, padding: "14px 32px", borderRadius: 10, cursor: "pointer" }}>
                    Start with Free Audit
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
