import { useState } from "react";
import { useLocation } from "wouter";
const oraviniLogoPath = "/oravini-logo.png";
import {
  LayoutDashboard, FileText, MessageSquare, BarChart2, Sparkles,
  Users, Bot, Clapperboard, Zap, Layers, Settings, ChevronRight,
  CalendarPlus, ArrowUpRight, Lock, Menu, X, Target, BookOpen,
  Brain, ListChecks, Calendar, Bookmark, Twitter, Linkedin, Youtube,
  ClipboardList, LayoutTemplate, TrendingUp, Globe
} from "lucide-react";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", tag: null },
  { icon: FileText, label: "Documents", tag: null },
  { icon: MessageSquare, label: "Chat", tag: "3" },
  { icon: BarChart2, label: "Tracking", tag: null },
  { icon: Users, label: "Competitor Study", tag: null },
  { icon: Sparkles, label: "AI Content Ideas", tag: "AI" },
  { icon: Layers, label: "AI Design", tag: "AI" },
  { icon: Bot, label: "AI Content Coach", tag: "AI" },
  { icon: Clapperboard, label: "AI Video Editor", tag: "AI" },
  { icon: ClipboardList, label: "Forms & Quiz", tag: "New" },
  { icon: LayoutTemplate, label: "Board Builder", tag: "New" },
  { icon: TrendingUp, label: "IG Growth Tracker", tag: "New" },
  { icon: Globe, label: "Community Forum", tag: null },
  { icon: Twitter, label: "X / Twitter", tag: null },
  { icon: Linkedin, label: "LinkedIn", tag: null },
  { icon: Youtube, label: "YouTube", tag: null },
  { icon: Zap, label: "Credits", tag: null },
  { icon: Settings, label: "Your Settings", tag: null },
];

const TOOL_CARDS = [
  { icon: Sparkles, label: "AI Content Ideas", desc: "Generate viral ideas for your niche", color: "#d4b461" },
  { icon: Layers, label: "Carousel Studio", desc: "Design stunning on-brand carousels", color: "#b8962e" },
  { icon: Users, label: "Competitor Intel", desc: "Spy on what's working in your niche", color: "#d4b461" },
  { icon: Brain, label: "Brand Kit Builder", desc: "Your complete brand identity system", color: "#b8962e" },
  { icon: Target, label: "ICP Builder", desc: "Define your ideal customer profile", color: "#d4b461" },
  { icon: Bot, label: "Audience Psychology", desc: "Map what drives your audience", color: "#b8962e" },
  { icon: Bot, label: "AI Content Coach", desc: "Get coached on your content strategy", color: "#d4b461" },
  { icon: Clapperboard, label: "AI Video Editor", desc: "Script & structure your video content", color: "#b8962e" },
  { icon: ClipboardList, label: "Forms & Quiz Builder", desc: "Build lead forms and quizzes — track every response", color: "#d4b461" },
  { icon: LayoutTemplate, label: "Board Builder", desc: "Paste a script and get an AI-generated flowchart instantly", color: "#b8962e" },
  { icon: TrendingUp, label: "IG Growth Tracker", desc: "Auto-track follower and engagement growth daily", color: "#d4b461" },
  { icon: Globe, label: "Community Forum", desc: "Private members-only space to share wins and strategies", color: "#b8962e" },
  { icon: BookOpen, label: "Lead Magnet", desc: "Create high-converting lead magnets", color: "#d4b461" },
  { icon: ListChecks, label: "SOP Generator", desc: "Build content creation SOPs", color: "#b8962e" },
  { icon: Calendar, label: "Content Planner", desc: "Plan your full content calendar", color: "#d4b461" },
  { icon: Bookmark, label: "Story Generator", desc: "Create engaging Instagram Stories", color: "#b8962e" },
];

export default function DashboardPreview() {
  const [, nav] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lockedTool, setLockedTool] = useState<string | null>(null);

  const goToPricing = () => {
    nav("/");
    setTimeout(() => {
      const el = document.getElementById("pricing");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 350);
  };

  const handleToolClick = (label: string) => {
    setLockedTool(label);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ── LOCKED TOOL MODAL ── */}
      {lockedTool && (
        <div onClick={() => setLockedTool(null)} style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0e0e10", border: `1px solid ${GOLD}33`, borderRadius: 22, padding: "44px 38px", maxWidth: 440, width: "100%", textAlign: "center", boxShadow: `0 0 80px rgba(212,180,97,0.1)`, position: "relative" }}>
            <button onClick={() => setLockedTool(null)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 20, cursor: "pointer" }}>✕</button>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${GOLD}12`, border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Lock style={{ width: 24, height: 24, color: GOLD }} />
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", color: GOLD, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>Tool Locked</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 12 }}>{lockedTool}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 1.7, marginBottom: 28 }}>
              Create a free account to start using this tool. Free plan includes 5 credits per day — no credit card needed.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => nav("/login?tab=register")}
                style={{ width: "100%", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 11, padding: "14px 0", cursor: "pointer" }}>
                Create Free Account →
              </button>
              <button onClick={goToPricing}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: 13, borderRadius: 11, padding: "12px 0", cursor: "pointer" }}>
                View Pricing Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODE BANNER ── */}
      <div style={{ background: `linear-gradient(90deg, ${GOLD}18, ${GOLD}0a, ${GOLD}18)`, borderBottom: `1px solid ${GOLD}22`, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", zIndex: 100, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Lock style={{ width: 13, height: 13, color: GOLD }} />
          <span style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Preview Mode</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>— Tools are locked. Create an account to unlock everything.</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={goToPricing}
            style={{ background: "none", border: `1px solid ${GOLD}44`, borderRadius: 7, color: GOLD, fontSize: 12, fontWeight: 600, padding: "5px 14px", cursor: "pointer" }}>
            See Pricing
          </button>
          <button onClick={() => nav("/login?tab=register")}
            style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, border: "none", borderRadius: 7, color: "#000", fontSize: 12, fontWeight: 800, padding: "6px 16px", cursor: "pointer" }}>
            Create Free Account
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Mobile overlay */}
        {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.5)" }} />}

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: 256,
          background: "#0e0e10",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "relative",
          zIndex: 50,
          transition: "transform 0.3s ease",
        }}>
          {/* Logo */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 32, width: 32, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 6, filter: "drop-shadow(0 0 8px rgba(212,180,97,0.35))" }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, lineHeight: 1 }}>ORAVINI</p>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>Powered by Oravini</p>
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: 16, overflowY: "auto" }}>
            {NAV_ITEMS.map(({ icon: Icon, label, tag }) => (
              <button key={label} onClick={() => handleToolClick(label)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13.5, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", marginBottom: 2, textAlign: "left" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}>
                <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {tag && <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, background: `${GOLD}18`, border: `1px solid ${GOLD}33`, borderRadius: 99, padding: "1px 7px" }}>{tag}</span>}
                <Lock style={{ width: 11, height: 11, opacity: 0.3, flexShrink: 0 }} />
              </button>
            ))}
          </nav>

          {/* Credit widget (preview) */}
          <div style={{ padding: "0 16px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
              <Zap style={{ width: 14, height: 14, color: GOLD, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Credits</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>— create account</div>
              </div>
              <ChevronRight style={{ width: 12, height: 12, color: "rgba(255,255,255,0.2)" }} />
            </div>
          </div>

          {/* Bottom user area */}
          <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${GOLD}22`, border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: GOLD, flexShrink: 0 }}>?</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Guest User</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Preview mode</div>
              </div>
            </div>
            <button onClick={() => nav("/login?tab=register")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, background: `${GOLD}18`, border: `1px solid ${GOLD}2a`, color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <ArrowUpRight style={{ width: 13, height: 13 }} />
              Create Account
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, overflow: "auto", padding: "32px 32px", position: "relative" }}>
          {/* Mobile header */}
          <div style={{ display: "none" }} className="preview-mobile-header">
            <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 4 }}>
              <Menu style={{ width: 20, height: 20 }} />
            </button>
          </div>

          {/* Welcome banner */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", color: GOLD, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Preview Mode</div>
            <h1 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Welcome to your <span style={{ color: GOLD }}>AI dashboard.</span>
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 560 }}>
              This is a preview of what your dashboard looks like. All tools are locked — create a free account to unlock them instantly. No credit card needed.
            </p>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 36 }}>
            {[
              { label: "Monthly Reach", value: "2.4M", sub: "avg member reach / mo" },
              { label: "Ideas Generated", value: "847", sub: "created this week alone" },
              { label: "Engagement Boost", value: "+5.2%", sub: "avg lift within 30 days" },
              { label: "Tools Available", value: "14", sub: "unlock all with free plan" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 16px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                  <Lock style={{ width: 14, height: 14, color: "rgba(255,255,255,0.2)" }} />
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Tools grid */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>AI Tools — click any to learn more</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
              {TOOL_CARDS.map(({ icon: Icon, label, desc, color }) => (
                <button key={label} onClick={() => handleToolClick(label)}
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "22px 20px", textAlign: "left", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,180,97,0.28)"; e.currentTarget.style.background = "rgba(212,180,97,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}2a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon style={{ width: 18, height: 18, color }} />
                    </div>
                    <Lock style={{ width: 13, height: 13, color: "rgba(255,255,255,0.2)", marginTop: 2 }} />
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>{desc}</div>
                  <div style={{ marginTop: 12, fontSize: 11.5, color: GOLD, fontWeight: 600, opacity: 0.8 }}>Click to unlock →</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ background: `linear-gradient(135deg, ${GOLD}0a 0%, transparent 100%)`, border: `1px solid ${GOLD}18`, borderRadius: 18, padding: "32px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Ready to unlock the full dashboard?</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>Start free — 5 credits per day. No credit card required.</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => nav("/login?tab=register")}
                style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 10, padding: "12px 28px", cursor: "pointer", whiteSpace: "nowrap" }}>
                Create Free Account →
              </button>
              <button onClick={goToPricing}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.55)", fontWeight: 600, fontSize: 13, padding: "12px 20px", cursor: "pointer", whiteSpace: "nowrap" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}44`; e.currentTarget.style.color = GOLD; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}>
                View Pricing
              </button>
            </div>
          </div>

          {/* Back link */}
          <div style={{ textAlign: "center", marginTop: 32, paddingBottom: 24 }}>
            <button onClick={() => nav("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 13, cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
              ← Back to Oravini
            </button>
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .preview-mobile-header { display: flex !important; align-items: center; gap: 12px; margin-bottom: 24px; }
        }
      `}</style>
    </div>
  );
}
