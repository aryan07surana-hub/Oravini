import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
const oraviniLogoPath = "/oravini-logo.png";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";
const CALENDLY = "https://calendly.com/brandversee/30min";

// ── Particle Canvas ──────────────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const activeRef = useRef(false);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 90;
    const CONNECT_DIST = 150;
    const CURSOR_PULL_DIST = 160;
    const CURSOR_PUSH_DIST = 55;

    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number; ox: number; oy: number };
    const ps: P[] = Array.from({ length: N }, () => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      return { x, y, ox: x, oy: y, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.6 + 0.4, o: Math.random() * 0.45 + 0.12 };
    });

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      activeRef.current = true;
    };
    window.addEventListener("mousemove", onMouse);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const active = activeRef.current;

      ps.forEach(p => {
        if (active) {
          const dx = p.x - mx, dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CURSOR_PUSH_DIST && dist > 0) {
            const force = (CURSOR_PUSH_DIST - dist) / CURSOR_PUSH_DIST;
            p.vx += (dx / dist) * force * 0.6;
            p.vy += (dy / dist) * force * 0.6;
          } else if (dist < CURSOR_PULL_DIST && dist > 0) {
            const pull = (1 - dist / CURSOR_PULL_DIST) * 0.018;
            p.vx -= (dx / dist) * pull;
            p.vy -= (dy / dist) * pull;
          }
        }
        p.vx *= 0.97; p.vy *= 0.97;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,180,97,${p.o})`;
        ctx.fill();
      });

      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const alpha = 0.22 * (1 - d / CONNECT_DIST);
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(212,180,97,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      if (active) {
        ps.forEach(p => {
          const dx = p.x - mx, dy = p.y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CURSOR_PULL_DIST) {
            const alpha = 0.3 * (1 - d / CURSOR_PULL_DIST);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(212,180,97,${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        });
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMouse); };
  }, []);

  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0, display: "block" }} />;
}

// ── Scroll Animate Hook ──────────────────────────────────────────────────────
function useScrollAnim() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-anim]");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).style.opacity = "1"; (e.target as HTMLElement).style.transform = "none"; } });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function Anim({ children, delay = 0, from = "translateY(40px)", style = {} }: { children: React.ReactNode; delay?: number; from?: string; style?: React.CSSProperties }) {
  return (
    <div data-anim="1" style={{ opacity: 0, transform: from, transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

// ── Counter ──────────────────────────────────────────────────────────────────
function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1800, start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / dur, 1);
          setVal(Math.round(p * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

// ── 3D Tilt Card ────────────────────────────────────────────────────────────
function TiltCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
  }, []);
  const onLeave = useCallback(() => { if (ref.current) ref.current.style.transform = "perspective(600px) rotateY(0) rotateX(0) scale(1)"; }, []);
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ transition: "transform 0.2s ease", transformStyle: "preserve-3d", ...style }}>
      {children}
    </div>
  );
}

// ── Splash Modal ─────────────────────────────────────────────────────────────
function SplashModal({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2200);
    const t4 = setTimeout(() => onDone(), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: phase >= 1 ? 1 : 0, transition: "opacity 0.8s ease", marginBottom: 24 }}>
        <img src={oraviniLogoPath} alt="Oravini" style={{ width: 120, height: 120, objectFit: "contain", filter: "drop-shadow(0 0 40px #d4b46188)" }} />
      </div>
      <div style={{ opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "scale(1)" : "scale(0.8)", transition: "all 0.7s ease", textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: "clamp(32px, 6vw, 64px)", fontWeight: 900, letterSpacing: "0.12em", background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 50%, #b8962e 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textTransform: "uppercase" }}>ORAVINI</div>
      </div>
      <div style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 0.7s ease" }}>
        <span style={{ fontSize: 13, letterSpacing: "0.25em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Powered by Brandverse</span>
      </div>
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0 }}>
        <div style={{ width: 160, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: "0 auto", opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.5s ease 0.5s" }} />
      </div>
    </div>
  );
}

// ── Credits Popup (account-gated) ────────────────────────────────────────────
function EmailPopup({ onClose }: { onClose: () => void }) {
  const [, nav] = useLocation();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0a0a0a", border: `1px solid ${GOLD}44`, borderRadius: 22, padding: "44px 38px", maxWidth: 420, width: "100%", textAlign: "center", position: "relative", boxShadow: `0 0 80px rgba(212,180,97,0.12)` }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 20, cursor: "pointer" }}>✕</button>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎁</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Get 10 Free AI Credits</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", marginBottom: 28, lineHeight: 1.7 }}>
          Create a free account and 10 AI credits will be added to your balance instantly — no credit card required.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => { onClose(); nav("/login?tab=register"); }}
            style={{ width: "100%", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 11, padding: "14px 0", cursor: "pointer" }}>
            Create Free Account →
          </button>
          <button onClick={() => { onClose(); nav("/login"); }}
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: 13, borderRadius: 11, padding: "12px 0", cursor: "pointer" }}>
            I already have an account
          </button>
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          Credits appear in your dashboard sidebar after sign-up.
        </div>
      </div>
    </div>
  );
}

// ── Strategy Call Modal ───────────────────────────────────────────────────────
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
  const pick = (opt: string) => {
    const next = [...answers, opt];
    setAnswers(next);
    if (step + 1 >= CALL_QS.length) { setStep(step + 1); } else { setStep(step + 1); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#080808", border: `1px solid ${GOLD}33`, borderRadius: 24, padding: "44px 40px", maxWidth: 520, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 22, cursor: "pointer" }}>✕</button>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: GOLD, marginBottom: 10 }}>You're pre-qualified!</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
              You're exactly the type of creator we work with. Book your free 30-min strategy call now — our team will build a custom growth plan for you.
            </div>
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, borderRadius: 12, padding: "15px 36px", textDecoration: "none" }}>
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
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 10, padding: "13px 18px", color: "rgba(255,255,255,0.8)", fontSize: 14, cursor: "pointer", textAlign: "left", fontWeight: 500, transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${GOLD}88`; (e.currentTarget as HTMLButtonElement).style.color = GOLD; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)"; }}>
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

// ── Feature Data ──────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "💡", title: "AI Content Ideas", desc: "Platform-native ideas for Instagram, YouTube, X, and LinkedIn — generated from your niche, audience, and goals.", tag: "Multi-Platform" },
  { icon: "🔍", title: "Competitor Intelligence", desc: "Deep-scrape competitor profiles to reveal their winning strategies, top content, and posting patterns.", tag: "Apify-Powered" },
  { icon: "🔥", title: "Virality Testing", desc: "Score your script before posting. See exactly what's weak, what's strong, and how to make it go viral.", tag: "AI Scoring" },
  { icon: "📊", title: "Content Tracking", desc: "Automatically log reels, views, and comments. Generate detailed performance reports with one click.", tag: "Auto-Logging" },
  { icon: "🎨", title: "AI Design Studio", desc: "Create professional carousels, lead magnets, SOPs, and Instagram story sequences in minutes.", tag: "4 Tools" },
  { icon: "🧠", title: "AI Content Coach", desc: "Your personal AI mentor that analyzes scripts, rewrites hooks, and guides your content strategy in real-time.", tag: "Coming Soon" },
  { icon: "🤖", title: "Auto-Posting", desc: "Schedule and auto-publish to Instagram, LinkedIn, X, and YouTube directly from your dashboard.", tag: "Multi-Channel" },
  { icon: "🎬", title: "AI Video Editor", desc: "Trim, caption, and enhance your videos with AI — no editing experience needed.", tag: "New" },
  { icon: "📡", title: "Live Webinars", desc: "Host unlimited live webinars with auto-built registration pages, email reminders, and real-time attendee CRM.", tag: "Add-on" },
  { icon: "🎯", title: "VSL Engine", desc: "Deploy video sales letters with custom progress bars that control viewer pacing and push watch-through rates past 70%.", tag: "Add-on" },
  { icon: "🧬", title: "Audience Psychology", desc: "Map your audience's deepest fears, desires, and buying triggers to craft content that converts.", tag: "Behavioral AI" },
  { icon: "📋", title: "Forms & Quiz Builder", desc: "Build custom lead capture forms and interactive quizzes. Share a link — responses land straight in your dashboard.", tag: "Lead Capture" },
  { icon: "🗂️", title: "Board Builder", desc: "Drag-and-drop content boards to plan, organise, and visualise your entire content operation at a glance.", tag: "Visual Planning" },
  { icon: "📈", title: "IG Growth Tracker", desc: "Track follower growth, engagement rate, and profile metrics over time with automatic daily snapshots.", tag: "Analytics" },
  { icon: "💬", title: "Private Support Chat", desc: "Direct line to the Brandverse team — ask anything, get answers fast, all inside the platform.", tag: "Elite & Pro" },
  { icon: "🏛️", title: "Community Forum", desc: "A private members-only community to share wins, swap strategies, and get feedback from other serious creators.", tag: "Members Only" },
];

const STATS = [
  { val: 5, suffix: "%+", label: "Avg. Engagement Boost", prefix: "" },
  { val: 2, suffix: ".3×", label: "Faster Follower Growth", prefix: "" },
  { val: 14, suffix: "", label: "Powerful Tools", prefix: "" },
];

// ── Pricing tiers ─────────────────────────────────────────────────────────────
const PRICING_TIERS = [
  { tier: "Tier 1", name: "Free", price: "Free", period: "", credits: "20 credits / month", accent: "rgba(255,255,255,0.55)", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.08)", highlight: false, features: ["20 AI credits per month", "Access to all AI tools", "Group community access", "AI Content Ideas — 3 credits", "Virality Tester — 4 credits", "Basic carousel generation", "Partial audit preview"], cta: "Join Free" },
  { tier: "Tier 2", name: "Starter", price: "$19", period: "/mo", credits: "100 credits / month", accent: "#818cf8", bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.25)", highlight: false, features: ["100 AI credits / month", "Everything in Free", "Full audit access", "AI Content Ideas — 5 credits", "Carousel Studio — 5 credits", "Story Generator — 2 credits", "Lead Magnet Generator — 6 credits", "Brand Kit Builder — 6 credits", "Virality Tester — 4 credits", "IG Growth Tracker — 1 credit/scan"], cta: "Get Started" },
  { tier: "Tier 3", name: "Growth", price: "$49", period: "/mo", credits: "250 credits / month", accent: GOLD, bg: `${GOLD}0a`, border: `${GOLD}44`, highlight: true, features: ["250 AI credits / month", "Everything in Starter", "No watermarks", "Competitor Analysis — 12 credits", "Reel vs Reel Compare — 5 credits", "Steal Strategy Plan — 10 credits", "Niche Intelligence — 12 credits", "ICP Builder — 6 credits", "Audience Psychology Map — 6 credits", "Content DNA Analysis — 7 credits", "Priority processing"], cta: "Start Growing" },
  { tier: "Tier 4", name: "Pro", price: "$59", period: "/mo", credits: "500 credits / month", accent: "#34d399", bg: "rgba(52,211,153,0.05)", border: "rgba(52,211,153,0.22)", highlight: false, features: ["500 AI credits / month", "Everything in Growth", "Full Video Marketing Suite INCLUDED", "Unlimited video hosting + VSL pages", "Unlimited webinars + CRM + reminders", "AI Clip Finder + white-label pages", "AI Video Editor — 2 credits/msg", "AI Content Coach — 2 credits/msg", "SOP Generator — 7 credits", "AI Content Planner — 7 credits", "DM Tracker", "Direct team messaging", "Priority support"], cta: "Go Pro" },
];

// ── Nav ───────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [, nav] = useLocation();
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, background: scrolled ? "rgba(0,0,0,0.92)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(212,180,97,0.1)" : "none", transition: "all 0.4s ease" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src={oraviniLogoPath} alt="Oravini" style={{ height: 46, width: 46, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 8, filter: "drop-shadow(0 0 12px rgba(212,180,97,0.35))" }} />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => {
              const el = document.getElementById("pricing");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              else { nav("/"); setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }), 400); }
            }}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>
            Pricing
          </button>
          <button onClick={() => nav("/login")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, padding: "8px 18px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = `${GOLD}66`; b.style.color = GOLD; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(255,255,255,0.15)"; b.style.color = "rgba(255,255,255,0.7)"; }}>
            Members Login
          </button>
          <button onClick={() => nav("/login?tab=register")} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 800, padding: "9px 20px", cursor: "pointer" }}>
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OraviniLanding() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroReady, setHeroReady] = useState(false);

  useScrollAnim();

  useEffect(() => {
    const t1 = setTimeout(() => setHeroReady(true), 200);
    const t2 = setTimeout(() => setShowEmailPopup(true), 90000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      fetch(`/api/referral/track?code=${encodeURIComponent(ref)}`).catch(() => {});
    }
  }, []);

  const handleAuditClick = useCallback(() => {
    if (user) {
      setShowSplash(true);
    } else {
      nav("/login?redirect=audit&tab=register");
    }
  }, [user, nav]);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
    nav("/audit");
  }, [nav]);

  return (
    <div style={{ background: "#000", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes popIn { to { opacity:1; transform:scale(1.2); } }
        @keyframes floatY { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-16px); } }
        @keyframes logoFloat { 0%{ transform:translateY(0) rotate(-1deg) scale(1); } 25%{ transform:translateY(-18px) rotate(1deg) scale(1.04); } 50%{ transform:translateY(-26px) rotate(-0.5deg) scale(1.06); } 75%{ transform:translateY(-12px) rotate(1.5deg) scale(1.02); } 100%{ transform:translateY(0) rotate(-1deg) scale(1); } }
        @keyframes shimmer { 0%{ background-position:-400px 0; } 100%{ background-position:400px 0; } }
        @keyframes pulse-ring { 0%{ transform:scale(0.95); box-shadow:0 0 0 0 rgba(212,180,97,0.4); } 70%{ transform:scale(1); box-shadow:0 0 0 20px rgba(212,180,97,0); } 100%{ transform:scale(0.95); box-shadow:0 0 0 0 rgba(212,180,97,0); } }
        @keyframes fadeUp { from{ opacity:0; transform:translateY(30px); } to{ opacity:1; transform:none; } }
        @keyframes orbFloat1 { 0%,100%{ transform:translate(0,0) scale(1); } 33%{ transform:translate(60px,-40px) scale(1.1); } 66%{ transform:translate(-30px,50px) scale(0.9); } }
        @keyframes orbFloat2 { 0%,100%{ transform:translate(0,0) scale(1); } 40%{ transform:translate(-50px,60px) scale(1.15); } 70%{ transform:translate(40px,-30px) scale(0.85); } }
        @keyframes orbFloat3 { 0%,100%{ transform:translate(0,0); } 50%{ transform:translate(30px,-60px) scale(1.08); } }
        @keyframes bvExpand { from{ opacity:0; transform:translateY(-20px); } to{ opacity:1; transform:translateY(0); } }
        .hero-title { animation: fadeUp 1s ease 0.3s both; }
        .hero-sub { animation: fadeUp 1s ease 0.6s both; }
        .hero-powered { animation: fadeUp 1s ease 0.9s both; }
        .hero-cta { animation: fadeUp 1s ease 1.1s both; }
        .hero-scroll { animation: fadeUp 1s ease 1.4s both; }
        .feature-card:hover { border-color: rgba(212,180,97,0.4) !important; box-shadow: 0 0 40px rgba(212,180,97,0.08) !important; }
        .pricing-card:hover { transform: translateY(-6px) !important; }
        .nav-btn:hover { color: #d4b461; }
        input:focus { border-color: rgba(212,180,97,0.5) !important; }
      `}</style>

      {showSplash && <SplashModal onDone={handleSplashDone} />}
      {showEmailPopup && <EmailPopup onClose={() => setShowEmailPopup(false)} />}
      {showStrategy && <StrategyModal onClose={() => setShowStrategy(false)} />}

      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: "relative", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", overflow: "hidden" }}>
        <ParticleCanvas />
        {/* Radial glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,180,97,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 1 }} />

        <div style={{ position: "relative", zIndex: 2, padding: "0 24px" }}>
          <div className="hero-title" style={{ fontSize: "clamp(13px, 2vw, 15px)", letterSpacing: "0.35em", color: GOLD, textTransform: "uppercase", marginBottom: 20, fontWeight: 600 }}>
            Welcome to
          </div>
          <div className="hero-sub" style={{ fontSize: "clamp(56px, 10vw, 120px)", fontWeight: 900, letterSpacing: "0.08em", lineHeight: 0.9, textTransform: "uppercase", background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 45%, #b8962e 80%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 20, filter: "drop-shadow(0 0 60px rgba(212,180,97,0.25))" }}>
            ORAVINI
          </div>
          <div className="hero-powered" style={{ fontSize: "clamp(12px, 1.5vw, 14px)", letterSpacing: "0.28em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 48 }}>
            Powered by Brandverse
          </div>
          <div className="hero-cta" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleAuditClick}
              style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 12, padding: "16px 36px", cursor: "pointer", animation: "pulse-ring 2.5s ease 2s infinite" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}>
              Get My Free Audit →
            </button>
            <button onClick={() => document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" })}
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 15, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "16px 32px", cursor: "pointer" }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = `${GOLD}55`; b.style.color = GOLD; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(255,255,255,0.12)"; b.style.color = "rgba(255,255,255,0.7)"; }}>
              See What's Inside
            </button>
            <button onClick={() => window.location.href = "/preview"}
              style={{ background: `rgba(212,180,97,0.07)`, color: GOLD, fontWeight: 600, fontSize: 15, border: `1px solid ${GOLD}44`, borderRadius: 12, padding: "16px 32px", cursor: "pointer" }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `rgba(212,180,97,0.12)`; b.style.borderColor = `${GOLD}88`; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `rgba(212,180,97,0.07)`; b.style.borderColor = `${GOLD}44`; }}>
              Get a Live Preview →
            </button>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="hero-scroll" style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>Scroll</div>
          <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, ${GOLD}66, transparent)`, animation: "floatY 1.8s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ── WHAT IS ORAVINI ───────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
        <Anim>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>The Platform</div>
        </Anim>
        <Anim delay={100}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.025em" }}>
            Your entire content operation,<br /><span style={{ color: GOLD }}>run by AI.</span>
          </h2>
        </Anim>
        <Anim delay={200}>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 56px" }}>
            Oravini is an all-in-one AI platform for creators and personal brands who are serious about scaling. From content ideation to competitor intelligence, design tools to audience psychology — everything you need to grow, tracked and optimized in one place.
          </p>
        </Anim>

        {/* 3 pillars */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            { icon: "⚡", title: "Speed", desc: "Generate a week of content in 10 minutes. Let AI do the heavy lifting." },
            { icon: "🎯", title: "Precision", desc: "Data-backed decisions. Know what works before you post." },
            { icon: "📈", title: "Scale", desc: "Systems built to grow with you from 0 to 100K and beyond." },
          ].map(({ icon, title, desc }) => (
            <Anim key={title} delay={150}>
              <TiltCard style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "32px 28px" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{desc}</div>
              </TiltCard>
            </Anim>
          ))}
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "80px 24px", background: "rgba(212,180,97,0.02)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, textAlign: "center" }}>
          {STATS.map(s => (
            <Anim key={s.label}>
              <div style={{ fontSize: "clamp(40px, 5vw, 62px)", fontWeight: 900, color: GOLD, lineHeight: 1 }}>
                <Counter to={s.val} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8, letterSpacing: "0.04em" }}>{s.label}</div>
            </Anim>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features-section" style={{ padding: "120px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>The Toolkit</div>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1 }}>14 tools. One dashboard.<br /><span style={{ color: GOLD }}>Infinite leverage.</span></h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
            {FEATURES.map((f, i) => (
              <Anim key={f.title} delay={i * 60}>
                <TiltCard>
                  <div className="feature-card" style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "30px 28px", height: "100%", transition: "border-color 0.3s, box-shadow 0.3s", cursor: "default" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                      <div style={{ fontSize: 34 }}>{f.icon}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, background: `${GOLD}15`, border: `1px solid ${GOLD}33`, borderRadius: 99, padding: "3px 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{f.tag}</span>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{f.title}</div>
                    <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{f.desc}</div>
                  </div>
                </TiltCard>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(212,180,97,0.04) 0%, transparent 65%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 80 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>How It Works</div>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1, margin: "0 0 20px" }}>
              The AI scans everything.<br /><span style={{ color: GOLD }}>Then builds your playbook.</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "clamp(15px, 1.8vw, 17px)", maxWidth: 560, margin: "0 auto", lineHeight: 1.75 }}>
              From your first login to your first viral post — Oravini maps your niche, dissects your competitors, and hands you a precision strategy built around your specific goals.
            </p>
          </Anim>

          {/* Steps grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 2, position: "relative" }}>
            {[
              {
                num: "01",
                icon: "🧬",
                title: "You Tell Us Everything",
                body: "An 11-question onboarding quiz maps your niche, audience, goals, content formats, and monetisation model. Oravini builds your full creator profile before you post a single thing.",
                bullets: ["Niche + audience profiling", "Content format preferences", "Revenue model mapping"],
              },
              {
                num: "02",
                icon: "🔍",
                title: "The AI Scans Your Niche",
                body: "Oravini deep-scrapes top performers in your space — their hooks, posting cadence, engagement patterns, and content gaps. It maps exactly where the opportunity is before you spend a second creating.",
                bullets: ["Competitor hook analysis", "Engagement pattern mapping", "Content gap detection"],
              },
              {
                num: "03",
                icon: "⚡",
                title: "Your Strategy Lands",
                body: "The AI assembles a custom playbook: your content pillars, hook formulas, ideal posting schedule, repurposing system, and the exact tools inside Oravini you need to execute at a high level.",
                bullets: ["Content pillar framework", "Hook formula library", "Tool-by-tool action plan"],
              },
              {
                num: "04",
                icon: "📈",
                title: "Track, Adapt & Keep Winning",
                body: "Every post, follower spike, and engagement shift is tracked automatically. As your account grows, the AI recalibrates — surfacing what's working, killing what isn't, and keeping you one step ahead.",
                bullets: ["Automatic post tracking", "Growth trend alerts", "Strategy recalibration"],
              },
            ].map((step, i) => (
              <Anim key={step.num} delay={i * 100}>
                <div
                  style={{
                    position: "relative",
                    background: i === 1 ? `rgba(212,180,97,0.04)` : "rgba(255,255,255,0.015)",
                    border: i === 1 ? `1px solid rgba(212,180,97,0.22)` : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 20,
                    padding: "36px 30px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0,
                    overflow: "hidden",
                  }}
                >
                  {/* Large background step number */}
                  <div style={{
                    position: "absolute", top: -12, right: 20,
                    fontSize: 110, fontWeight: 900, lineHeight: 1,
                    color: i === 1 ? `rgba(212,180,97,0.07)` : "rgba(255,255,255,0.04)",
                    userSelect: "none", pointerEvents: "none", letterSpacing: "-0.04em",
                  }}>{step.num}</div>

                  {/* Icon */}
                  <div style={{ fontSize: 30, marginBottom: 16 }}>{step.icon}</div>

                  {/* Step label */}
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
                    textTransform: "uppercase", marginBottom: 10,
                    color: i === 1 ? GOLD : "rgba(255,255,255,0.3)",
                  }}>Step {step.num}</div>

                  {/* Title */}
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", marginBottom: 14, lineHeight: 1.25 }}>{step.title}</div>

                  {/* Body */}
                  <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.42)", lineHeight: 1.8, margin: "0 0 22px", flex: 1 }}>{step.body}</p>

                  {/* Bullets */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {step.bullets.map(b => (
                      <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: i === 1 ? GOLD : "rgba(255,255,255,0.25)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Anim>
            ))}
          </div>

          {/* Bottom note */}
          <Anim style={{ textAlign: "center", marginTop: 64 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.18)", borderRadius: 99, padding: "12px 28px" }}>
              <span style={{ fontSize: 16 }}>🤖</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                The AI runs in the background 24/7 — you just show up and create.
              </span>
            </div>
          </Anim>
        </div>
      </section>

      {/* ── VIDEO MARKETING ──────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(212,180,97,0.05) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Video Marketing · Optional Add-on</div>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1, margin: "0 0 20px" }}>
              Host webinars. Deploy VSLs.<br /><span style={{ color: GOLD }}>Convert with video.</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.42)", fontSize: "clamp(14px, 1.6vw, 16px)", maxWidth: 520, margin: "0 auto", lineHeight: 1.8 }}>
              Add the full video marketing suite to any Growth or Pro plan. Webinars, VSLs, video hosting, AI clip extraction — all in one place.
            </p>
          </Anim>

          {/* Two-column feature blocks */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 60 }}>
            {[
              {
                icon: "📡",
                title: "Live Webinars",
                desc: "Host live or automated webinars. Registration pages are built automatically. Attendees get email reminders at 24h, 1h, and 10 minutes before go-time.",
                bullets: ["Auto-built registration pages", "Email reminders — 24h · 1h · 10min", "Live attendee CRM + attendance tracking", "Recordings auto-saved after every session"],
                accent: "#60a5fa",
              },
              {
                icon: "🎯",
                title: "VSL Engine",
                desc: "Deploy video sales letters with a custom progress bar you fully control. Set precise timing to maximise watch-through and push conversion rates higher.",
                bullets: ["Custom progress bar — any timing", "Email opt-in gating at any timestamp", "Watch-through analytics per video", "Embed anywhere via link or iframe"],
                accent: GOLD,
              },
              {
                icon: "✂️",
                title: "AI Clip Finder",
                desc: "Feed in any long-form video — a webinar replay, a podcast, a VSL. The AI scans the full timeline and extracts the highest-value clips ready to repurpose.",
                bullets: ["Auto-detects high-energy moments", "Batch process multiple videos", "Clips exported and ready to post", "Works on webinar replays + long VSLs"],
                accent: "#a78bfa",
              },
              {
                icon: "🗂️",
                title: "Video Library",
                desc: "One organised library for all your content — VSLs, webinar recordings, and standard videos. Import via URL, file upload, or Google Drive.",
                bullets: ["4 import methods: URL · file · Drive · embed", "Filter by type: VSL · Webinar · Standard", "Password protection + time-limited links", "White-label hosting pages (Pro add-on)"],
                accent: "#34d399",
              },
            ].map((item, i) => (
              <Anim key={item.title} delay={i * 80}>
                <div className="feature-card" style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "32px 28px", height: "100%", transition: "border-color 0.3s, box-shadow 0.3s", display: "flex", flexDirection: "column", gap: 0 }}>
                  <div style={{ fontSize: 28, marginBottom: 16 }}>{item.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: item.accent, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Video Marketing</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 12, lineHeight: 1.25 }}>{item.title}</div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, marginBottom: 20, flex: 1 }}>{item.desc}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {item.bullets.map(b => (
                      <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ color: item.accent, fontSize: 10, marginTop: 3, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Anim>
            ))}
          </div>

          {/* Add-on pricing callout */}
          <Anim>
            <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}30`, borderRadius: 24, padding: "40px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 28 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Optional Add-on · Growth & Pro Plans</div>
                <h3 style={{ fontSize: "clamp(20px, 3vw, 30px)", fontWeight: 900, lineHeight: 1.2, marginBottom: 10 }}>
                  Add full video access<br />from <span style={{ color: GOLD }}>$20/mo</span>
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 420 }}>
                  Growth members add the Video Marketing Suite for +$20/mo. Pro members get the full Video Marketing Suite included FREE — a $49/mo value at no extra cost.
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={() => { const el = document.getElementById("pricing"); el?.scrollIntoView({ behavior: "smooth" }); }}
                  style={{ background: `linear-gradient(135deg, #f0c84b, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 12, padding: "14px 28px", cursor: "pointer" }}>
                  See Plans & Add-ons →
                </button>
                <button
                  onClick={() => window.open("/video-marketing-landing", "_blank")}
                  style={{ background: "transparent", color: GOLD, fontWeight: 600, fontSize: 14, border: `1px solid ${GOLD}44`, borderRadius: 12, padding: "14px 28px", cursor: "pointer" }}>
                  Full Feature Overview
                </button>
              </div>
            </div>
          </Anim>
        </div>
      </section>

      {/* ── QUICK PREVIEW ────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(212,180,97,0.05) 0%, transparent 70%)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="preview-grid">
          <Anim from="translateX(-40px)">
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14, fontWeight: 700 }}>Interactive Preview</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 50px)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 18 }}>
              See the dashboard<br /><span style={{ color: GOLD }}>before you commit.</span>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.8, marginBottom: 32 }}>
              Explore the full tool suite — every AI feature, explained. Browse freely, no sign-up needed. When you're ready, create a free account and start using them instantly.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => nav("/preview")} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 12, padding: "15px 32px", cursor: "pointer" }}>
                Get a Quick Preview →
              </button>
              <button onClick={() => nav("/login?tab=register")} style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 14, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}55`; e.currentTarget.style.color = GOLD; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}>
                Start Free
              </button>
            </div>
          </Anim>
          <Anim from="translateX(40px)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { icon: "💡", label: "AI Content Ideas" },
                { icon: "🎨", label: "Carousel Studio" },
                { icon: "🕵️", label: "Competitor Intel" },
                { icon: "🧬", label: "Brand Kit Builder" },
                { icon: "🎯", label: "ICP Builder" },
                { icon: "🤖", label: "AI Content Coach" },
              ].map(({ icon, label }) => (
                <div key={label} onClick={() => nav("/preview")} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 16px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => { const t = e.currentTarget; t.style.borderColor = "rgba(212,180,97,0.3)"; t.style.background = "rgba(212,180,97,0.04)"; }}
                  onMouseLeave={e => { const t = e.currentTarget; t.style.borderColor = "rgba(255,255,255,0.07)"; t.style.background = "rgba(255,255,255,0.025)"; }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>🔒</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>+ 6 more tools in preview</div>
          </Anim>
        </div>
        <style>{`@media(max-width:768px){ .preview-grid{ grid-template-columns:1fr !important; gap:40px !important; } }`}</style>
      </section>

      {/* ── OUTCOMES ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,180,97,0.05) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="outcomes-grid">
          <Anim from="translateX(-40px)">
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Real Outcomes</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 50px)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 24 }}>
              Stop guessing.<br />Start <span style={{ color: GOLD }}>growing.</span>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.8, marginBottom: 32 }}>
              Every creator in Oravini gets a personalized system built around their niche, platform, and goals. No fluff. No templates. Real frameworks that work.
            </p>
            <button onClick={handleAuditClick}
              style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 10, padding: "14px 30px", cursor: "pointer" }}>
              Get My Free Audit →
            </button>
          </Anim>
          <Anim from="translateX(40px)">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Average Engagement Boost", val: 78 },
                { label: "Content Consistency", val: 92 },
                { label: "Follower Growth Speed", val: 65 },
                { label: "Strategy Clarity Score", val: 95 },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>{val}%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                    <div data-anim="1" style={{ height: "100%", width: 0, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_BRIGHT})`, borderRadius: 99, transition: `width 1.2s ease`, opacity: 0 }}
                      ref={el => {
                        if (!el) return;
                        const obs = new IntersectionObserver(([e]) => {
                          if (e.isIntersecting) { el.style.width = val + "%"; el.style.opacity = "1"; }
                        }, { threshold: 0.5 });
                        obs.observe(el);
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </Anim>
        </div>
        <style>{`@media(max-width:768px){ .outcomes-grid{ grid-template-columns:1fr !important; gap:40px !important; } }`}</style>
      </section>


      {/* ── COMMUNITY & CALLS ─────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,180,97,0.04) 0%, transparent 70%)` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Beyond the Tools</div>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
              A system. A community.<br /><span style={{ color: GOLD }}>A team behind you.</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginTop: 18, maxWidth: 560, margin: "18px auto 0", lineHeight: 1.75 }}>
              Oravini isn't just software — it's the whole infrastructure for growing your personal brand, with real people and real support built in.
            </p>
          </Anim>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* Community */}
            <Anim delay={0}>
              <TiltCard>
                <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(212,180,97,0.2)`, borderRadius: 20, padding: "36px 32px", height: "100%", transition: "border-color 0.3s" }}>
                  <div style={{ fontSize: 40, marginBottom: 20 }}>🏛️</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Members Only</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 12, lineHeight: 1.2 }}>Private Community Forum</div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 24 }}>
                    A private space exclusively for Oravini members. Share wins, ask questions, get feedback on your content, and connect with creators who are actually building.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {["Post updates & get community feedback", "Browse member wins for inspiration", "Like & comment on posts", "Pinned announcements & resources"].map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: GOLD, fontSize: 11, marginTop: 2 }}>✦</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TiltCard>
            </Anim>

            {/* Private Chat */}
            <Anim delay={100}>
              <TiltCard>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "36px 32px", height: "100%", transition: "border-color 0.3s" }}>
                  <div style={{ fontSize: 40, marginBottom: 20 }}>💬</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Elite & Pro</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 12, lineHeight: 1.2 }}>Private Support Chat</div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 24 }}>
                    A direct line to the Brandverse team — not a ticket system, not a chatbot. Real people responding inside the platform to your questions about strategy, content, and growth.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {["Direct messaging inside the dashboard", "Strategy & content Q&A support", "Platform help & troubleshooting", "Available to Pro & Elite members"].map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: GOLD, fontSize: 11, marginTop: 2 }}>✦</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TiltCard>
            </Anim>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Simple Pricing</div>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1 }}>Start free.<br /><span style={{ color: GOLD }}>Scale when ready.</span></h2>
          </Anim>

          {/* 4 standard tiers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginBottom: 24 }}>
            {PRICING_TIERS.map((t, i) => (
              <Anim key={t.name} delay={i * 80}>
                <div className="pricing-card" style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 20, padding: "32px 28px", display: "flex", flexDirection: "column", height: "100%", transition: "transform 0.3s, box-shadow 0.3s", position: "relative", overflow: "hidden", boxShadow: t.highlight ? `0 0 60px ${GOLD}18` : "none" }}>
                  {t.highlight && (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
                  )}
                  {t.highlight && (
                    <div style={{ position: "absolute", top: 14, right: 14, fontSize: 9, fontWeight: 800, color: "#000", background: GOLD, borderRadius: 99, padding: "3px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Most Popular</div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{t.tier}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{t.name}</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: t.price === "Free" ? 32 : 40, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{t.price}</span>
                    {t.period && <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", paddingBottom: 4 }}>{t.period}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 24, fontWeight: 500 }}>{t.credits}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, marginBottom: 24 }}>
                    {t.features.map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: t.accent, fontSize: 12, marginTop: 1, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Video Marketing add-on — Growth (+$20) and Pro (INCLUDED FREE) */}
                  {t.name === "Growth" && (
                    <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Optional Add-on</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>🎬 Video Marketing Suite</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                            <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>+$20</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>/mo</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                        {["Unlimited video hosting + VSL pages", "Unlimited webinars + CRM + reminders", "AI Clip Finder", "Email reminders + analytics"].map(f => (
                          <div key={f} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, marginTop: 3, flexShrink: 0 }}>✦</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{f}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.16)", lineHeight: 1.5 }}>
                        Upgrade to Pro to get this FREE — $49/mo value included.
                      </div>
                    </div>
                  )}
                  {t.name === "Pro" && (
                    <div style={{ background: `${GOLD}0c`, border: `1px solid ${GOLD}30`, borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>✨ Included Free</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>🎬 Full Video Marketing Suite</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                            <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>FREE</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", textDecoration: "line-through" }}>$49/mo</span>
                          </div>
                        </div>
                        <div style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.28)", borderRadius: 99, padding: "2px 8px" }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: "#34d399" }}>$49 Value</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                        {["Unlimited video hosting + VSL pages", "Unlimited webinars + CRM + reminders", "AI Clip Finder + white-label pages", "Priority video processing"].map(f => (
                          <div key={f} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                            <span style={{ color: GOLD, fontSize: 9, marginTop: 3, flexShrink: 0 }}>✦</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{f}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: GOLD, lineHeight: 1.5, fontWeight: 600 }}>
                        Everything included at no extra cost.
                      </div>
                    </div>
                  )}

                  <a href="/audit" style={{ display: "block", textAlign: "center", background: t.highlight ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.06)", border: t.highlight ? "none" : `1px solid ${t.border}`, color: t.highlight ? "#000" : t.accent, fontWeight: 700, fontSize: 14, borderRadius: 10, padding: "12px 20px", textDecoration: "none", transition: "opacity 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    {t.cta} →
                  </a>
                </div>
              </Anim>
            ))}
          </div>

          {/* Tier 5 special card */}
          <Anim delay={200}>
            <div className="pricing-card" style={{ background: `linear-gradient(135deg, rgba(212,180,97,0.1) 0%, rgba(212,180,97,0.03) 100%)`, border: `1px solid ${GOLD}55`, borderRadius: 24, padding: "52px 48px", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: `0 0 80px rgba(212,180,97,0.12)`, transition: "transform 0.3s, box-shadow 0.3s" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${GOLD_BRIGHT}, ${GOLD}, transparent)` }} />
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(212,180,97,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,180,97,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "inline-block", fontSize: 9, fontWeight: 800, color: "#000", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, borderRadius: 99, padding: "4px 12px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Tier 5 — Exclusive</div>
                <h3 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 900, color: "#fff", marginBottom: 12, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                  Elite — <span style={{ color: GOLD }}>Work With Us</span>
                </h3>
                <div style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: GOLD, marginBottom: 8, lineHeight: 1 }}>Apply</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 28 }}>Unlimited credits · Custom pricing</div>
                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 24, marginBottom: 36 }}>
                  {["Unlimited AI credits", "Full done-with-you system", "Custom growth strategy", "Weekly team calls", "Direct Brandverse access", "Priority platform support"].map(f => (
                    <div key={f} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: GOLD, fontSize: 13 }}>✦</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={() => nav("/brandverse")} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 12, padding: "15px 36px", cursor: "pointer", boxShadow: `0 0 40px rgba(212,180,97,0.25)` }}>
                    Learn About Tier 5 →
                  </button>
                  <a href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ background: "rgba(255,255,255,0.04)", border: `1.5px solid ${GOLD}55`, color: GOLD, fontWeight: 700, fontSize: 15, borderRadius: 12, padding: "15px 32px", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, transition: "background 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = `rgba(212,180,97,0.1)`)}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  >
                    📞 Book a Call
                  </a>
                </div>
              </div>
            </div>
          </Anim>
        </div>
      </section>

      {/* ── REFERRAL PROGRAM ─────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", position: "relative", overflow: "hidden" }}>
        {/* Background */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,180,97,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}30, transparent)` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}20, transparent)` }} />

        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Label */}
          <Anim>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${GOLD}12`, border: `1px solid ${GOLD}30`, borderRadius: 99, padding: "6px 18px", marginBottom: 28 }}>
              <span style={{ fontSize: 16 }}>🎁</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>Referral Program</span>
            </div>
          </Anim>

          {/* Headline */}
          <Anim delay={80}>
            <h2 style={{ fontSize: "clamp(32px, 5.5vw, 64px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 16, textAlign: "center" }}>
              Invite friends.<br />
              <span style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Earn credits instantly.
              </span>
            </h2>
          </Anim>

          <Anim delay={150}>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", textAlign: "center", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.75 }}>
              Every member gets a personal referral link. When a friend joins — <strong style={{ color: GOLD }}>you get 50 credits</strong> and <strong style={{ color: "#34d399" }}>they get 25 bonus credits</strong> as a welcome gift.
            </p>
          </Anim>

          {/* Win-win badges */}
          <Anim delay={200}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${GOLD}12`, border: `1px solid ${GOLD}30`, borderRadius: 99, padding: "8px 20px" }}>
                <span style={{ fontSize: 16 }}>🤝</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>You earn 50 credits per referral</span>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 99, padding: "8px 20px" }}>
                <span style={{ fontSize: 16 }}>🎁</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Your friend gets 25 welcome credits</span>
              </div>
            </div>
          </Anim>

          {/* Steps */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 64 }}>
            {[
              {
                step: "01",
                icon: "🔗",
                title: "Get your link",
                desc: "Sign up and your personal referral link is generated instantly — no setup needed.",
              },
              {
                step: "02",
                icon: "📤",
                title: "Share it anywhere",
                desc: "Post it on Instagram, DM a fellow creator, or share it in your community.",
              },
              {
                step: "03",
                icon: "⚡",
                title: "Both sides win",
                desc: "You get 50 credits when they join. They get 25 welcome credits automatically.",
              },
            ].map(({ step, icon, title, desc }, i) => (
              <Anim key={step} delay={i * 80}>
                <div
                  className="feature-card"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 20,
                    padding: "32px 28px",
                    position: "relative",
                    overflow: "hidden",
                    transition: "border-color 0.3s, box-shadow 0.3s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}40`;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 40px ${GOLD}0a`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  {/* Step number watermark */}
                  <div style={{ position: "absolute", top: 16, right: 20, fontSize: 48, fontWeight: 900, color: "rgba(212,180,97,0.06)", lineHeight: 1, userSelect: "none" }}>{step}</div>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.2 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.7, margin: 0 }}>{desc}</p>
                </div>
              </Anim>
            ))}
          </div>

          {/* Credit callout banner */}
          <Anim delay={100}>
            <div style={{
              background: `linear-gradient(135deg, ${GOLD}0e 0%, rgba(255,255,255,0.02) 100%)`,
              border: `1.5px solid ${GOLD}30`,
              borderRadius: 20,
              padding: "36px 48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 32,
              flexWrap: "wrap",
              marginBottom: 48,
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD_BRIGHT}, ${GOLD}, transparent)` }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: GOLD, marginBottom: 8 }}>No limit on referrals</p>
                <p style={{ fontSize: "clamp(20px, 3.5vw, 32px)", fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1.2 }}>
                  Refer 10 friends →<br />
                  <span style={{ color: GOLD }}>500 bonus credits</span>
                </p>
                <p style={{ fontSize: 12, color: "rgba(52,211,153,0.8)", marginTop: 10, fontWeight: 600 }}>
                  + your friends each get 25 welcome credits
                </p>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { n: "1", label: "referral", credits: "50" },
                  { n: "5", label: "referrals", credits: "250" },
                  { n: "10", label: "referrals", credits: "500" },
                ].map(({ n, label, credits }) => (
                  <div key={n} style={{ textAlign: "center", padding: "12px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: GOLD, margin: 0, lineHeight: 1 }}>{credits}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: "4px 0 0", letterSpacing: "0.08em" }}>CREDITS</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>{n} {label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Anim>

          {/* CTA */}
          <Anim delay={150}>
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => nav("/login?tab=register")}
                style={{
                  background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
                  color: "#000", fontWeight: 800, fontSize: 15,
                  border: "none", borderRadius: 12, padding: "16px 40px",
                  cursor: "pointer",
                  boxShadow: `0 0 40px ${GOLD}30`,
                  transition: "opacity 0.2s, transform 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >
                Join Free — Get 25 Bonus Credits →
              </button>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 14 }}>Join via a referral link and get 25 bonus credits instantly · No credit card required</p>
            </div>
          </Anim>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", textAlign: "center", background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,180,97,0.06) 0%, transparent 70%)" }}>
        <Anim>
          <img src={oraviniLogoPath} alt="Oravini" style={{ height: 180, width: 140, objectFit: "cover", objectPosition: "50% 33%", borderRadius: 14, marginBottom: 28, animation: "logoFloat 5s ease-in-out infinite", filter: "drop-shadow(0 0 40px rgba(212,180,97,0.45)) drop-shadow(0 0 80px rgba(212,180,97,0.2))" }} />
        </Anim>
        <Anim delay={100}>
          <h2 style={{ fontSize: "clamp(32px, 5.5vw, 64px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 18 }}>
            Your growth starts<br /><span style={{ color: GOLD }}>right now.</span>
          </h2>
        </Anim>
        <Anim delay={200}>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 40, maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Get your free Instagram audit in minutes. No credit card. No commitment. Just clarity on exactly where you're leaving growth on the table.
          </p>
        </Anim>
        <Anim delay={300}>
          <button onClick={handleAuditClick} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 17, border: "none", borderRadius: 14, padding: "18px 48px", cursor: "pointer", boxShadow: `0 0 60px rgba(212,180,97,0.2)` }}>
            Get My Free Audit →
          </button>
        </Anim>
      </section>

      {/* ── INSTAGRAM FOLLOW ────────────────────────────────────────────────── */}
      <section style={{ padding: "64px 24px", textAlign: "center", background: "rgba(212,180,97,0.03)", borderTop: "1px solid rgba(212,180,97,0.08)", borderBottom: "1px solid rgba(212,180,97,0.08)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433" />
                  <stop offset="25%" stopColor="#e6683c" />
                  <stop offset="50%" stopColor="#dc2743" />
                  <stop offset="75%" stopColor="#cc2366" />
                  <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" fill="url(#ig-grad)" />
              <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8" />
              <circle cx="17.2" cy="6.8" r="1.1" fill="white" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>Follow Us on Instagram</span>
          </div>
          <p style={{ fontSize: "clamp(22px, 3.5vw, 30px)", fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: "-0.02em" }}>
            @oravini_ai
          </p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", marginBottom: 28, lineHeight: 1.65 }}>
            Tips, tools & behind-the-scenes on growing your brand with AI.<br />Follow for daily content that actually moves the needle.
          </p>
          <a
            href="https://www.instagram.com/oravini_ai/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "linear-gradient(135deg, #f09433, #dc2743, #bc1888)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 12, padding: "14px 32px", textDecoration: "none", boxShadow: "0 0 40px rgba(220,39,67,0.25)", transition: "opacity 0.2s" }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.88")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" fill="white" fillOpacity="0.2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.9"/><circle cx="17.2" cy="6.8" r="1.1" fill="white"/></svg>
            Follow @oravini_ai
          </a>
        </div>
      </section>

      {/* ── MOBILE DEVICE NOTICE ─────────────────────────────────────────────── */}
      <div className="mobile-device-notice" style={{ display: "none", background: "rgba(212,180,97,0.06)", borderTop: "1px solid rgba(212,180,97,0.12)", padding: "12px 24px", textAlign: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>💻 This platform is best experienced on a laptop or desktop for full functionality</span>
      </div>
      <style>{`@media(max-width:768px){ .mobile-device-notice{ display:block !important; } }`}</style>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 30, width: 30, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 5 }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Powered by Brandverse</span>
          </div>
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Login", "/login"]].map(([label, href]) => (
              <a key={label} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = GOLD)}
                onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = "rgba(255,255,255,0.3)")}>
                {label}
              </a>
            ))}
            <a href="https://www.instagram.com/oravini_ai/" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none", transition: "color 0.2s", display: "flex", alignItems: "center", gap: 5 }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = GOLD)}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.3)")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              @oravini_ai
            </a>
            <a href="mailto:support.oravini@gmail.com"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = GOLD)}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.3)")}>
              support.oravini@gmail.com
            </a>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 Oravini. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
