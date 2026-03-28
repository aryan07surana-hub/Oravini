import { useState } from "react";
import { useLocation } from "wouter";
import oraviniLogoPath from "@assets/ORAVINI_FINAL_LOGO_1774695199024.png";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";
const WHOP = "https://whop.com/brandversee";

const TOOLS = [
  {
    icon: "💡",
    name: "AI Content Ideas",
    tag: "Ideas",
    desc: "Generate unlimited viral content ideas tailored to your niche and audience. Includes hook formulas, trending formats, and engagement strategies.",
    details: "Input your niche, audience type, and content goals — get 20+ AI-generated ideas with captions, hooks, and posting strategies instantly.",
  },
  {
    icon: "🎨",
    name: "Carousel Studio",
    tag: "Design",
    desc: "Create stunning, on-brand carousels in minutes. Choose from premium templates, customize colours and fonts, and export ready-to-post.",
    details: "Connect your Brand Kit, pick a template, type your content — the AI builds a polished carousel ready to download.",
  },
  {
    icon: "🕵️",
    name: "Competitor Intelligence",
    tag: "Research",
    desc: "Analyse what's working in your niche. Track top creators, dissect their strategy, and extract insights you can apply immediately.",
    details: "Enter a competitor's handle and get a full breakdown of their best posts, engagement rates, posting cadence, and growth tactics.",
  },
  {
    icon: "🧬",
    name: "Brand Kit Builder",
    tag: "Brand",
    desc: "Define and store your complete brand identity — logo colours, fonts, voice, and tone — so every tool stays on-brand automatically.",
    details: "Upload your logo, pick colours, set your brand voice. Every AI output adapts to your exact identity.",
  },
  {
    icon: "🎯",
    name: "ICP Builder",
    tag: "Strategy",
    desc: "Build a crystal-clear Ideal Customer Profile. Understand exactly who you're speaking to so your content converts, not just entertains.",
    details: "Answer guided questions about your offer and audience. Get a detailed ICP with messaging angles and content pillars.",
  },
  {
    icon: "🧠",
    name: "Audience Psychology Map",
    tag: "Psychology",
    desc: "Map the deep psychology of your target audience. Understand their fears, desires, objections, and buying triggers.",
    details: "Input your ICP and receive a full psychology map: pain points, emotional drivers, trust triggers, and the language they use.",
  },
  {
    icon: "🤖",
    name: "AI Content Coach",
    tag: "Coaching",
    desc: "Get personalised coaching on your content strategy. Review your existing content, identify gaps, and build a system that compounds.",
    details: "Share your current content performance and goals. The coach gives you a step-by-step growth roadmap.",
  },
  {
    icon: "🎬",
    name: "AI Video Editor",
    tag: "Video",
    desc: "Script, structure, and optimise your video content with AI. From YouTube longform to Reels — get a clear framework every time.",
    details: "Input your topic and platform. Get a full script with hook, body, and CTA — formatted for maximum retention.",
  },
  {
    icon: "🧲",
    name: "Lead Magnet Generator",
    tag: "Leads",
    desc: "Create high-converting lead magnets in minutes. Ebooks, checklists, mini-courses — built and structured by AI.",
    details: "Tell the AI your offer and audience. Get a complete lead magnet outline with titles, sections, and copy angles.",
  },
  {
    icon: "📋",
    name: "SOP Generator",
    tag: "Systems",
    desc: "Build content creation SOPs that let you (or your team) produce quality content consistently without burning out.",
    details: "Input your content types and workflow. Get a repeatable SOP with daily, weekly, and monthly tasks laid out clearly.",
  },
  {
    icon: "📅",
    name: "AI Content Planner",
    tag: "Planning",
    desc: "Plan your entire content calendar with AI. Balance content pillars, formats, and posting frequency — all in one view.",
    details: "Set your posting goals and content mix. Get a 30-day content plan with topics, formats, and posting slots.",
  },
  {
    icon: "📖",
    name: "Instagram Story Generator",
    tag: "Stories",
    desc: "Create engaging, swipe-worthy Instagram Stories that drive DMs, saves, and profile visits — not just passive views.",
    details: "Input your campaign goal and the AI scripts a full Story sequence with slides, CTAs, and engagement prompts.",
  },
];

function ToolCard({ tool, onSelect }: { tool: typeof TOOLS[0]; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(212,180,97,0.04)" : "rgba(255,255,255,0.018)",
        border: `1px solid ${hovered ? "rgba(212,180,97,0.25)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 18,
        padding: "28px 24px",
        cursor: "pointer",
        transition: "all 0.25s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 14, right: 14, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>🔒</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ fontSize: 32 }}>{tool.icon}</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, background: `${GOLD}15`, border: `1px solid ${GOLD}33`, borderRadius: 99, padding: "3px 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{tool.tag}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{tool.name}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.65 }}>{tool.desc}</div>
      {hovered && (
        <div style={{ marginTop: 14, fontSize: 12, color: GOLD, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <span>Sign up to unlock</span>
          <span style={{ opacity: 0.6 }}>→</span>
        </div>
      )}
    </div>
  );
}

function ToolModal({ tool, onClose, onSignUp }: { tool: typeof TOOLS[0]; onClose: () => void; onSignUp: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0c0c0c", border: `1px solid ${GOLD}33`, borderRadius: 22, padding: "40px 36px", maxWidth: 480, width: "100%", position: "relative", boxShadow: `0 0 80px rgba(212,180,97,0.1)` }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 20, cursor: "pointer" }}>✕</button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{tool.icon}</div>
        <div style={{ fontSize: 10, letterSpacing: "0.25em", color: GOLD, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>{tool.tag}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 14 }}>{tool.name}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 10 }}>{tool.desc}</div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, marginBottom: 28, padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ color: GOLD, fontWeight: 600 }}>How it works: </span>{tool.details}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onSignUp} style={{ flex: 1, background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 10, padding: "13px 0", cursor: "pointer" }}>
            Create Free Account →
          </button>
          <button onClick={() => { window.open(WHOP, "_blank"); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.55)", fontWeight: 600, fontSize: 13, padding: "13px 18px", cursor: "pointer" }}>
            See Plans
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPreview() {
  const [, nav] = useLocation();
  const [selected, setSelected] = useState<typeof TOOLS[0] | null>(null);

  const scrollToPricing = () => {
    nav("/");
    setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }), 400);
  };

  return (
    <div style={{ background: "#060606", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeUp { from{ opacity:0; transform:translateY(24px); } to{ opacity:1; transform:none; } }
        .preview-tool { animation: fadeUp 0.5s ease both; }
      `}</style>

      {selected && <ToolModal tool={selected} onClose={() => setSelected(null)} onSignUp={() => nav("/login?tab=register")} />}

      {/* ── STICKY TOP CTA BAR ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 500, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(212,180,97,0.12)", padding: "0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 36, objectFit: "contain" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Preview Mode</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Want full access?</span>
            <button onClick={scrollToPricing}
              style={{ background: "none", border: `1px solid ${GOLD}55`, borderRadius: 8, color: GOLD, fontSize: 13, fontWeight: 600, padding: "7px 16px", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}18`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
              See Pricing
            </button>
            <button onClick={() => nav("/login?tab=register")}
              style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 800, padding: "8px 18px", cursor: "pointer" }}>
              Create Free Account
            </button>
          </div>
        </div>
      </div>

      {/* ── HEADER ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "70px 24px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14, fontWeight: 700 }}>Interactive Preview</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 16 }}>
            Your full AI toolkit,<br /><span style={{ color: GOLD }}>one dashboard.</span>
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            Explore every tool below. Click any card to learn how it works. Create a free account to start using them — no credit card required.
          </p>
        </div>

        {/* ── NOTICE BANNER ── */}
        <div style={{ background: "rgba(212,180,97,0.06)", border: `1px solid ${GOLD}22`, borderRadius: 14, padding: "14px 20px", marginBottom: 48, display: "flex", alignItems: "center", gap: 12, maxWidth: 700, margin: "0 auto 48px" }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>Preview only — tools are locked.</span> Sign up for a free account to unlock the Free plan (5 credits/day) instantly. Upgrade anytime for more.
          </span>
        </div>

        {/* ── TOOL GRID ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18, marginBottom: 80 }}>
          {TOOLS.map((t, i) => (
            <div key={t.name} className="preview-tool" style={{ animationDelay: `${i * 50}ms` }}>
              <ToolCard tool={t} onSelect={() => setSelected(t)} />
            </div>
          ))}
        </div>

        {/* ── BOTTOM CTA ── */}
        <div style={{ textAlign: "center", padding: "60px 24px", background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,180,97,0.06) 0%, transparent 70%)", borderRadius: 24, border: "1px solid rgba(212,180,97,0.08)", marginBottom: 60 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>Ready to start?</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, letterSpacing: "-0.025em", marginBottom: 16 }}>
            All 12 tools. One price.<br /><span style={{ color: GOLD }}>Start free today.</span>
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 36, maxWidth: 440, margin: "0 auto 36px", lineHeight: 1.7 }}>
            Create your free account in 30 seconds. Get 5 AI credits per day to explore the platform — no credit card needed.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => nav("/login?tab=register")}
              style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 12, padding: "15px 36px", cursor: "pointer" }}>
              Create Free Account →
            </button>
            <button onClick={scrollToPricing}
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.65)", fontWeight: 600, fontSize: 15, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "15px 28px", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}55`; e.currentTarget.style.color = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}>
              View Pricing
            </button>
          </div>
        </div>

        {/* ── FOOTER NAV ── */}
        <div style={{ textAlign: "center", paddingBottom: 48 }}>
          <button onClick={() => nav("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 13, cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            ← Back to Oravini
          </button>
        </div>
      </div>

      {/* ── MOBILE NOTICE ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 400, background: "rgba(0,0,0,0.9)", borderTop: "1px solid rgba(212,180,97,0.12)", padding: "10px 16px", textAlign: "center", display: "none" }} className="mobile-notice">
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>💻 Best experienced on a laptop or desktop</span>
      </div>
      <style>{`.mobile-notice { display: none !important; } @media (max-width: 768px) { .mobile-notice { display: block !important; } }`}</style>
    </div>
  );
}
