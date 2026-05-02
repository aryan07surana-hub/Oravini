import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
const oraviniLogoPath = "/oravini-logo.png";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";
const CALENDLY = "https://calendly.com/brandversee/30min";

// ── Particle Canvas ───────────────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const activeRef = useRef(false);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const N = 90, CONNECT_DIST = 150, CURSOR_PULL_DIST = 160, CURSOR_PUSH_DIST = 55;
    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number };
    const ps: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 0.4, o: Math.random() * 0.45 + 0.12,
    }));
    const onMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; activeRef.current = true; };
    window.addEventListener("mousemove", onMouse);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      const active = activeRef.current;
      ps.forEach(p => {
        if (active) {
          const dx = p.x - mx, dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CURSOR_PUSH_DIST && dist > 0) {
            const force = (CURSOR_PUSH_DIST - dist) / CURSOR_PUSH_DIST;
            p.vx += (dx / dist) * force * 0.6; p.vy += (dy / dist) * force * 0.6;
          } else if (dist < CURSOR_PULL_DIST && dist > 0) {
            const pull = (1 - dist / CURSOR_PULL_DIST) * 0.018;
            p.vx -= (dx / dist) * pull; p.vy -= (dy / dist) * pull;
          }
        }
        p.vx *= 0.97; p.vy *= 0.97;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,180,97,${p.o})`; ctx.fill();
      });
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const alpha = 0.22 * (1 - d / CONNECT_DIST);
            ctx.beginPath(); ctx.moveTo(ps[i].x, ps[i].y); ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(212,180,97,${alpha})`; ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      if (active) {
        ps.forEach(p => {
          const dx = p.x - mx, dy = p.y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CURSOR_PULL_DIST) {
            const alpha = 0.3 * (1 - d / CURSOR_PULL_DIST);
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(212,180,97,${alpha})`; ctx.lineWidth = 0.4; ctx.stroke();
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

// ── Scroll Animate ────────────────────────────────────────────────────────────
function useScrollAnim() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-anim]");
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

function Anim({ children, delay = 0, from = "translateY(40px)", style = {} }: { children: React.ReactNode; delay?: number; from?: string; style?: React.CSSProperties }) {
  return (
    <div data-anim="1" style={{ opacity: 0, transform: from, transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

// ── Counter ───────────────────────────────────────────────────────────────────
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

// ── 3D Tilt Card ──────────────────────────────────────────────────────────────
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

// ── Splash Modal ──────────────────────────────────────────────────────────────
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
        <img src={oraviniLogoPath} alt="Oravini" style={{ width: 100, height: 100, objectFit: "contain", filter: "drop-shadow(0 0 40px #d4b46188)" }} />
      </div>
      <div style={{ opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "scale(1)" : "scale(0.8)", transition: "all 0.7s ease", textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 700, letterSpacing: "0.3em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 6 }}>ORAVINI</div>
        <div style={{ fontSize: "clamp(26px, 5vw, 52px)", fontWeight: 900, letterSpacing: "0.08em", background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 50%, #b8962e 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textTransform: "uppercase" }}>VIDEO MARKETING</div>
      </div>
      <div style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 0.7s ease" }}>
        <span style={{ fontSize: 13, letterSpacing: "0.25em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Host · Convert · Scale</span>
      </div>
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0 }}>
        <div style={{ width: 200, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: "0 auto", opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.5s ease 0.5s" }} />
      </div>
    </div>
  );
}

// ── Email Popup ───────────────────────────────────────────────────────────────
function EmailPopup({ onClose }: { onClose: () => void }) {
  const [, nav] = useLocation();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0a0a0a", border: `1px solid ${GOLD}44`, borderRadius: 22, padding: "44px 38px", maxWidth: 420, width: "100%", textAlign: "center", position: "relative", boxShadow: `0 0 80px rgba(212,180,97,0.12)` }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 20, cursor: "pointer" }}>✕</button>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎬</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Start Hosting Free</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", marginBottom: 28, lineHeight: 1.7 }}>
          Create a free account and launch your first webinar or VSL instantly — no credit card required.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => { onClose(); nav("/login?redirect=/video-marketing"); }}
            style={{ width: "100%", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 11, padding: "14px 0", cursor: "pointer" }}>
            Login with Oravini →
          </button>
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          Full access unlocked immediately after sign-up.
        </div>
      </div>
    </div>
  );
}

// ── Strategy Modal ────────────────────────────────────────────────────────────
const VIDEO_QS = [
  { q: "What's your primary video marketing goal?", opts: ["Host live webinars", "Sell with VSLs", "Build a video library", "Grow my email list", "All of the above"] },
  { q: "What type of content do you create?", opts: ["Coaching / Training", "Course content", "Product demos", "Live events", "Sales presentations"] },
  { q: "How many videos do you publish monthly?", opts: ["1–3", "4–8", "9–15", "16–30", "30+"] },
  { q: "What's your biggest video challenge?", opts: ["Low view completion", "Poor conversion rate", "No hosting platform", "Disorganised library", "No analytics"] },
];

function StrategyModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const done = step >= VIDEO_QS.length;
  const pick = (opt: string) => { setAnswers([...answers, opt]); setStep(step + 1); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#080808", border: `1px solid ${GOLD}33`, borderRadius: 24, padding: "44px 40px", maxWidth: 520, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 22, cursor: "pointer" }}>✕</button>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: GOLD, marginBottom: 10 }}>You're ready to launch!</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
              Based on your answers, Oravini Video Marketing is built exactly for you. Book a free walkthrough and we'll set up your first webinar or VSL together.
            </div>
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, borderRadius: 12, padding: "15px 36px", textDecoration: "none" }}>
              Book Free Walkthrough →
            </a>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
              {VIDEO_QS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= step ? GOLD : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", color: GOLD, textTransform: "uppercase", marginBottom: 10 }}>Question {step + 1} of {VIDEO_QS.length}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 24, lineHeight: 1.4 }}>{VIDEO_QS[step].q}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {VIDEO_QS[step].opts.map(opt => (
                <button key={opt} onClick={() => pick(opt)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "13px 18px", color: "rgba(255,255,255,0.8)", fontSize: 14, cursor: "pointer", textAlign: "left", fontWeight: 500, transition: "all 0.2s" }}
                  onMouseEnter={e => { const b = e.currentTarget; b.style.border = `1px solid ${GOLD}88`; b.style.color = GOLD; }}
                  onMouseLeave={e => { const b = e.currentTarget; b.style.border = "1px solid rgba(255,255,255,0.1)"; b.style.color = "rgba(255,255,255,0.8)"; }}>
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

// ── Progress Bar Preview ──────────────────────────────────────────────────────
function ProgressBarPreview({ barStyle }: { barStyle: string }) {
  const [pct, setPct] = useState(0);
  const animRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const getDuration = (s: string) => s === "slow-start" ? 6000 : s === "fast-start" ? 3000 : 4500;
  const getEase = (s: string, t: number) => s === "slow-start" ? Math.pow(t, 2.5) : s === "fast-start" ? 1 - Math.pow(1 - t, 2.5) : t;
  useEffect(() => {
    setPct(0);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    startRef.current = Date.now();
    const dur = getDuration(barStyle);
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const t = Math.min(elapsed / dur, 1);
      setPct(Math.round(getEase(barStyle, t) * 100));
      if (t < 1) { animRef.current = requestAnimationFrame(tick); }
      else { setTimeout(() => { setPct(0); startRef.current = Date.now(); animRef.current = requestAnimationFrame(tick); }, 1200); }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [barStyle]);
  return (
    <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, ${GOLD_BRIGHT})`, borderRadius: 99, transition: "width 0.1s linear", boxShadow: `0 0 8px ${GOLD}66` }} />
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onStrategy }: { onStrategy: () => void }) {
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
        <button onClick={() => nav("/")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          <img src={oraviniLogoPath} alt="Oravini" style={{ height: 40, width: 40, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 8, filter: "drop-shadow(0 0 12px rgba(212,180,97,0.35))" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>Video Marketing</span>
        </button>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[
            { label: "Features", target: "features" },
            { label: "VSLs", target: "vsl-section" },
            { label: "Webinars", target: "webinar-section" },
            { label: "Pricing", target: "pricing" },
          ].map(({ label, target }) => (
            <button key={label} onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" })}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
              {label}
            </button>
          ))}
          <button onClick={onStrategy}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, padding: "8px 18px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = `${GOLD}66`; b.style.color = GOLD; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(255,255,255,0.12)"; b.style.color = "rgba(255,255,255,0.7)"; }}>
            Free Assessment
          </button>
          <button onClick={() => nav("/login?redirect=/video-marketing")}
            style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 800, padding: "9px 20px", cursor: "pointer" }}>
            Login with Oravini →
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Pricing Data ──────────────────────────────────────────────────────────────
const PRICING = [
  {
    tier: "Starter", price: "$29", period: "/mo",
    accent: "rgba(255,255,255,0.55)", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.08)", highlight: false,
    tag: "",
    features: ["5 hosted videos", "VSL pages with progress bar", "3 progress bar presets", "Email opt-in gating", "Basic analytics", "Share via public link", "Embed anywhere"],
    cta: "Start for Free",
  },
  {
    tier: "Growth", price: "$59", period: "/mo",
    accent: GOLD, bg: `${GOLD}0a`, border: `${GOLD}44`, highlight: true,
    tag: "Most Popular",
    features: ["Unlimited video hosting", "Unlimited webinars", "Custom progress bar timing", "Registration pages auto-built", "Email reminders (24h · 1h · 10min)", "Webinar recordings auto-saved", "Google Drive import", "Live attendee analytics", "CRM pipeline integration", "No Oravini watermark"],
    cta: "Start Growing",
  },
  {
    tier: "Pro", price: "$99", period: "/mo",
    accent: "#34d399", bg: "rgba(52,211,153,0.05)", border: "rgba(52,211,153,0.22)", highlight: false,
    tag: "",
    features: ["Everything in Growth", "AI Clip Finder (video extraction)", "Custom branded player", "Password-protected videos", "Time-limited share links", "Real-time drop-off tracking", "Conversion event tracking", "Priority processing & support", "API access", "White-label hosting pages"],
    cta: "Go Pro",
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function VideoMarketingLanding() {
  const [, nav] = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [activeBar, setActiveBar] = useState("steady");
  const [activeTab, setActiveTab] = useState("All Videos");
  const [clipProgress, setClipProgress] = useState(0);
  const [clipsFound, setClipsFound] = useState(false);

  useScrollAnim();

  useEffect(() => {
    const t = setTimeout(() => setShowEmailPopup(true), 90000);
    return () => clearTimeout(t);
  }, []);

  // Simulate clip finder progress
  useEffect(() => {
    if (!clipsFound) return;
    const interval = setInterval(() => {
      setClipProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [clipsFound]);

  return (
    <div style={{ background: "#000", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from{ opacity:0; transform:translateY(30px); } to{ opacity:1; transform:none; } }
        @keyframes floatY { 0%,100%{ transform:translateY(0) translateX(-50%); } 50%{ transform:translateY(-14px) translateX(-50%); } }
        @keyframes pulse-ring { 0%{ box-shadow:0 0 0 0 rgba(212,180,97,0.4); } 70%{ box-shadow:0 0 0 18px rgba(212,180,97,0); } 100%{ box-shadow:0 0 0 0 rgba(212,180,97,0); } }
        @keyframes orbFloat { 0%,100%{ transform:translate(0,0) scale(1); } 40%{ transform:translate(-40px,50px) scale(1.1); } 70%{ transform:translate(30px,-30px) scale(0.9); } }
        @keyframes scanLine { 0%{ top:0%; } 100%{ top:100%; } }
        @keyframes blink { 0%,100%{ opacity:1; } 50%{ opacity:0.3; } }
        .vm-hero-label { animation: fadeUp 1s ease 0.1s both; }
        .vm-hero-title { animation: fadeUp 1s ease 0.3s both; }
        .vm-hero-sub { animation: fadeUp 1s ease 0.6s both; }
        .vm-hero-cta { animation: fadeUp 1s ease 0.9s both; }
        .vm-hero-scroll { animation: fadeUp 1s ease 1.2s both; }
        .vm-feature-card:hover { border-color: rgba(212,180,97,0.35) !important; box-shadow: 0 0 40px rgba(212,180,97,0.06) !important; transform: translateY(-3px); }
        .vm-feature-card { transition: all 0.3s ease !important; }
        .vm-bar-btn:hover { border-color: rgba(212,180,97,0.5) !important; }
        .vm-pricing-card:hover { transform: translateY(-4px); }
        .vm-pricing-card { transition: transform 0.3s ease; }
      `}</style>

      {showSplash && <SplashModal onDone={() => setShowSplash(false)} />}
      {showEmailPopup && <EmailPopup onClose={() => setShowEmailPopup(false)} />}
      {showStrategy && <StrategyModal onClose={() => setShowStrategy(false)} />}
      <Navbar onStrategy={() => setShowStrategy(true)} />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", overflow: "hidden" }}>
        <ParticleCanvas />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(212,180,97,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,180,97,0.04) 0%, transparent 70%)", top: "10%", left: "-10%", animation: "orbFloat 12s ease-in-out infinite", zIndex: 1, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,180,97,0.03) 0%, transparent 70%)", bottom: "5%", right: "-8%", animation: "orbFloat 15s ease-in-out infinite reverse", zIndex: 1, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 2, padding: "0 24px", maxWidth: 1020 }}>
          <div className="vm-hero-label" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", fontWeight: 700, marginBottom: 22, background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 99, padding: "6px 18px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, display: "inline-block", animation: "blink 2s ease infinite" }} />
            Oravini Video Marketing Studio
          </div>
          <h1 className="vm-hero-title" style={{ fontSize: "clamp(52px, 10vw, 116px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 0.9, textTransform: "uppercase", background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 45%, #b8962e 80%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 28, filter: "drop-shadow(0 0 60px rgba(212,180,97,0.2))" }}>
            Host.<br />Convert.<br />Scale.
          </h1>
          <p className="vm-hero-sub" style={{ fontSize: "clamp(15px, 2vw, 19px)", color: "rgba(255,255,255,0.48)", lineHeight: 1.75, maxWidth: 700, margin: "0 auto 48px" }}>
            The all-in-one video marketing platform built for creators and coaches.<br />
            Webinars, VSLs with custom progress bars, AI clip extraction, video hosting,<br />and real-time analytics — all under one roof.
          </p>
          <div className="vm-hero-cta" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => nav("/login?redirect=/video-marketing")}
              style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, border: "none", borderRadius: 12, padding: "17px 40px", cursor: "pointer", animation: "pulse-ring 2.5s ease 2s infinite" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Login with Oravini →
            </button>
            <button onClick={() => setShowStrategy(true)}
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 15, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "17px 34px", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = `${GOLD}55`; b.style.color = GOLD; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(255,255,255,0.12)"; b.style.color = "rgba(255,255,255,0.7)"; }}>
              Take Free Assessment
            </button>
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              style={{ background: `rgba(212,180,97,0.07)`, color: GOLD, fontWeight: 600, fontSize: 15, border: `1px solid ${GOLD}44`, borderRadius: 12, padding: "17px 34px", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = `rgba(212,180,97,0.13)`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `rgba(212,180,97,0.07)`; }}>
              See Everything Inside
            </button>
          </div>
        </div>

        <div className="vm-hero-scroll" style={{ position: "absolute", bottom: 36, left: "50%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2, animation: "floatY 1.8s ease-in-out infinite" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase" }}>Scroll</div>
          <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, ${GOLD}66, transparent)` }} />
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "80px 24px", background: "rgba(212,180,97,0.015)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 40, textAlign: "center" }}>
          {[
            { val: 100, suffix: "%", label: "Uptime Guaranteed" },
            { val: 4, suffix: "", label: "Upload Methods" },
            { val: 3, suffix: "", label: "Progress Bar Presets" },
            { val: 0, suffix: "", label: "Coding Required", prefix: "Zero" },
            { val: 1, suffix: "", label: "Unified Dashboard", prefix: "" },
          ].map(s => (
            <Anim key={s.label} delay={80}>
              <div>
                <div style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 900, color: GOLD, lineHeight: 1.1 }}>
                  {s.prefix ? <span>{s.prefix}</span> : <Counter to={s.val} suffix={s.suffix} />}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8, lineHeight: 1.5 }}>{s.label}</div>
              </div>
            </Anim>
          ))}
        </div>
      </section>

      {/* ── PLATFORM OVERVIEW ────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
        <Anim>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>The Platform</div>
        </Anim>
        <Anim delay={100}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.025em" }}>
            Your entire video operation,<br /><span style={{ color: GOLD }}>built to convert.</span>
          </h2>
        </Anim>
        <Anim delay={200}>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", lineHeight: 1.8, maxWidth: 700, margin: "0 auto 64px" }}>
            From hosting a live webinar to deploying a high-converting VSL with a custom progress bar, to extracting viral clips from long-form content — Oravini handles it all in one beautifully designed platform.
          </p>
        </Anim>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
          {[
            { icon: "🎬", title: "Video Hosting", desc: "Upload, embed, and organise all your videos. URL, file, Drive, or embed — four ways in, one place to manage." },
            { icon: "📡", title: "Live Webinars", desc: "Host unlimited webinars with registration pages, automated reminders, live attendance, and instant replay links." },
            { icon: "🎯", title: "VSL Engine", desc: "Deploy video sales letters with custom progress bars that control viewer pacing and maximise watch-through rates." },
            { icon: "✂️", title: "AI Clip Finder", desc: "Feed in any long-form video. Our AI extracts the highest-value clips automatically — ready to repurpose in seconds." },
          ].map(({ icon, title, desc }) => (
            <Anim key={title} delay={120}>
              <TiltCard style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "32px 28px", height: "100%" }}>
                <div style={{ fontSize: 38, marginBottom: 16 }}>{icon}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 1.7 }}>{desc}</div>
              </TiltCard>
            </Anim>
          ))}
        </div>
      </section>

      {/* ── FULL FEATURE GRID ────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "120px 24px", background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,180,97,0.04) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Everything You Need</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1 }}>
              One platform.<br /><span style={{ color: GOLD }}>Infinite possibilities.</span>
            </h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 18 }}>
            {[
              { icon: "📡", title: "Webinar Hosting", desc: "Host unlimited live webinars with automated registration pages, email reminders, and attendance tracking. Everything from your dashboard.", tag: "Core" },
              { icon: "🎯", title: "VSL Engine", desc: "Deploy video sales letters with custom progress bars. Control viewer pacing and push completion rates past 70%.", tag: "Core" },
              { icon: "📊", title: "Custom Progress Bar", desc: "Choose Slow Start, Steady, or Fast Start — or define your own timing. Control exactly how fast the bar moves through every section.", tag: "VSL" },
              { icon: "✂️", title: "AI Clip Finder", desc: "Upload any long video. AI scans the full timeline, detects high-value moments, and extracts clips ready to share or repurpose.", tag: "Pro" },
              { icon: "🗂️", title: "Video Library", desc: "Organise all content by type: VSLs, Webinar Recordings, and Standard Videos. Filter, search, and share with one click.", tag: "All Plans" },
              { icon: "🔗", title: "Landing Pages", desc: "Auto-generate beautiful registration and watch pages for every webinar or VSL. No design skills needed whatsoever.", tag: "Built-In" },
              { icon: "👥", title: "CRM Pipeline", desc: "Track every lead from registration to conversion with automated stage progression, tags, and follow-up triggers.", tag: "Pipeline" },
              { icon: "📈", title: "Real-Time Analytics", desc: "Watch views, play rates, drop-off points, and conversion metrics update live as your audience watches.", tag: "Live Data" },
              { icon: "🎙️", title: "Webinar Recordings", desc: "Every live session is automatically recorded and stored. Share replay links with a custom expiry or gate behind opt-in.", tag: "Auto" },
              { icon: "☁️", title: "Google Drive Import", desc: "Connect Drive and import videos directly from any folder — no re-downloading. Works instantly.", tag: "Integration" },
              { icon: "🔒", title: "Secure Sharing", desc: "Set videos to public, private, or password-protected. Generate time-limited shareable links with one click.", tag: "Security" },
              { icon: "📱", title: "Mobile Optimised", desc: "Every registration page, video player, and dashboard view is pixel-perfect on mobile, tablet, and desktop.", tag: "Responsive" },
            ].map(({ icon, title, desc, tag }) => (
              <Anim key={title} delay={60}>
                <div className="vm-feature-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 24px", height: "100%" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ fontSize: 32 }}>{icon}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: GOLD, background: `${GOLD}12`, border: `1px solid ${GOLD}25`, borderRadius: 99, padding: "3px 10px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{tag}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.75 }}>{desc}</p>
                </div>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* ── VSL DEEP DIVE ────────────────────────────────────────────────────── */}
      <section id="vsl-section" style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 64, alignItems: "center" }}>
            <div>
              <Anim>
                <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>VSL Engine</div>
              </Anim>
              <Anim delay={80}>
                <h2 style={{ fontSize: "clamp(30px, 4.5vw, 54px)", fontWeight: 900, lineHeight: 1.08, marginBottom: 20 }}>
                  VSLs that<br /><span style={{ color: GOLD }}>keep people watching.</span>
                </h2>
              </Anim>
              <Anim delay={160}>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.48)", lineHeight: 1.8, marginBottom: 36 }}>
                  A VSL lives and dies by its completion rate. That's why we built a custom progress bar engine — so you control exactly how fast the bar moves, keeping viewers locked in and watching all the way to your CTA.
                </p>
              </Anim>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { icon: "🎬", text: "Upload via URL, file, Google Drive, or embed" },
                  { icon: "📊", text: "Custom progress bar — 3 presets or fully custom segment timing" },
                  { icon: "🔒", text: "Gate with email opt-in or password protection" },
                  { icon: "📈", text: "Track drop-off at every second of playback" },
                  { icon: "🔗", text: "Auto-generate a dedicated VSL landing page" },
                  { icon: "💡", text: "A/B test different progress bar styles for max retention" },
                ].map(({ icon, text }) => (
                  <Anim key={text} delay={80}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${GOLD}14`, border: `1px solid ${GOLD}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{text}</span>
                    </div>
                  </Anim>
                ))}
              </div>
            </div>

            <Anim from="translateX(40px)">
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}25`, borderRadius: 24, padding: "36px 32px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 20, letterSpacing: "0.08em", textTransform: "uppercase" }}>Progress Bar — Live Preview</div>
                <div style={{ width: "100%", aspectRatio: "16/9", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 40% 40%, rgba(212,180,97,0.07) 0%, transparent 70%)" }} />
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${GOLD}22`, border: `2px solid ${GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "11px 0 11px 20px", borderColor: `transparent transparent transparent ${GOLD}`, marginLeft: 5 }} />
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 12px" }}>
                    <ProgressBarPreview barStyle={activeBar} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { id: "slow-start", label: "Slow Start", desc: "Builds suspense, rushes at end" },
                    { id: "steady", label: "Steady", desc: "Consistent, natural pace" },
                    { id: "fast-start", label: "Fast Start", desc: "Hooks early, slows at close" },
                    { id: "custom", label: "Custom", desc: "Define your own segments" },
                  ].map(p => (
                    <button key={p.id} onClick={() => setActiveBar(p.id)}
                      className="vm-bar-btn"
                      style={{ background: activeBar === p.id ? `${GOLD}15` : "rgba(255,255,255,0.03)", border: `1px solid ${activeBar === p.id ? GOLD + "55" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "12px 14px", textAlign: "left", cursor: "pointer", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: activeBar === p.id ? GOLD : "rgba(255,255,255,0.75)", marginBottom: 3 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", lineHeight: 1.4 }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </Anim>
          </div>
        </div>
      </section>

      {/* ── WEBINAR DEEP DIVE ─────────────────────────────────────────────────── */}
      <section id="webinar-section" style={{ padding: "120px 24px", background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(212,180,97,0.04) 0%, transparent 70%)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 64, alignItems: "center" }}>
            <Anim from="translateX(-40px)">
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 24, padding: "32px 28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "blink 1.2s ease infinite" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", letterSpacing: "0.06em" }}>LIVE NOW</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>247 watching</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[{ label: "Registered", val: "412" }, { label: "Attending", val: "247" }, { label: "Chat msgs", val: "1.2k" }].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Registrations over time</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 52 }}>
                    {[20, 35, 28, 55, 42, 70, 62, 85, 78, 100, 90, 95].map((h, i) => (
                      <div key={i} style={{ flex: 1, background: i === 11 ? GOLD : `${GOLD}33`, borderRadius: "3px 3px 0 0", height: `${h}%`, transition: "height 0.3s ease" }} />
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { time: "2:14 PM", msg: "Sarah joined the webinar", type: "join" },
                    { time: "2:15 PM", msg: "What's the best time to post?", type: "chat" },
                    { time: "2:15 PM", msg: "Alex joined the webinar", type: "join" },
                  ].map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{m.time}</span>
                      <span style={{ fontSize: 12, color: m.type === "join" ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.5)" }}>{m.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Anim>

            <div>
              <Anim>
                <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>Webinar Platform</div>
              </Anim>
              <Anim delay={80}>
                <h2 style={{ fontSize: "clamp(30px, 4.5vw, 54px)", fontWeight: 900, lineHeight: 1.08, marginBottom: 20 }}>
                  Webinars that<br /><span style={{ color: GOLD }}>fill your pipeline.</span>
                </h2>
              </Anim>
              <Anim delay={160}>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.48)", lineHeight: 1.8, marginBottom: 36 }}>
                  Host unlimited live webinars, track who registers and who shows up, send automated reminders, and convert attendees into clients — without ever leaving Oravini.
                </p>
              </Anim>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { icon: "📋", text: "One-click registration page with custom fields" },
                  { icon: "📧", text: "Automated email reminders at 24h, 1h, and 10min before" },
                  { icon: "🎙️", text: "Auto-record every session — replay links generated instantly" },
                  { icon: "👥", text: "Live attendee tracking and real-time engagement scoring" },
                  { icon: "🔄", text: "Push registrants directly into your CRM pipeline" },
                  { icon: "📊", text: "Post-webinar analytics: attendance rate, drop-off, conversion" },
                ].map(({ icon, text }) => (
                  <Anim key={text} delay={80}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${GOLD}14`, border: `1px solid ${GOLD}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{text}</span>
                    </div>
                  </Anim>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VIDEO HOSTING ────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Video Library</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 900, lineHeight: 1.1 }}>
              Host anything.<br /><span style={{ color: GOLD }}>From anywhere.</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginTop: 16, lineHeight: 1.8, maxWidth: 560, margin: "16px auto 0" }}>
              Four ways to get your video in. One place to manage it all.
            </p>
          </Anim>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 20, marginBottom: 60 }}>
            {[
              { icon: "🔗", method: "URL / Embed", desc: "Paste a YouTube, Vimeo, Wistia, Loom, or any direct video URL. We embed it instantly.", color: "#60a5fa" },
              { icon: "📁", method: "File Upload", desc: "Upload MP4, MOV, or AVI directly. Files up to 2GB supported with drag-and-drop.", color: "#a78bfa" },
              { icon: "☁️", method: "Google Drive", desc: "Connect your Drive and import videos from any folder without re-downloading.", color: "#34d399" },
              { icon: "⚡", method: "Direct Embed", desc: "Copy the embed code from any supported platform and drop it straight in.", color: GOLD },
            ].map(({ icon, method, desc, color }) => (
              <Anim key={method} delay={80}>
                <TiltCard style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 24px", height: "100%" }}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: `${color}15`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>{icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{method}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.7 }}>{desc}</div>
                </TiltCard>
              </Anim>
            ))}
          </div>

          <Anim>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: "28px 28px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {["All Videos", "VSLs", "Webinars", "Standard"].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    style={{ padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, background: activeTab === tab ? `${GOLD}20` : "rgba(255,255,255,0.04)", border: `1px solid ${activeTab === tab ? GOLD + "50" : "rgba(255,255,255,0.08)"}`, color: activeTab === tab ? GOLD : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s" }}>
                    {tab}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                {[
                  { title: "Webinar Replay — Jan", type: "WEBINAR", views: 412, color: "#60a5fa" },
                  { title: "VSL — Main Offer", type: "VSL", views: 1820, color: "#a78bfa" },
                  { title: "Onboarding Walkthrough", type: "STANDARD", views: 238, color: GOLD },
                  { title: "Product Demo — Feb", type: "VSL", views: 904, color: "#a78bfa" },
                  { title: "Masterclass Replay", type: "WEBINAR", views: 671, color: "#60a5fa" },
                  { title: "Brand Story Video", type: "STANDARD", views: 193, color: GOLD },
                ].filter(v => activeTab === "All Videos" || v.type === activeTab.toUpperCase().replace("S", ""))
                  .map(v => (
                  <div key={v.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${GOLD}33`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; }}>
                    <div style={{ height: 90, background: `linear-gradient(135deg, ${v.color}12, rgba(0,0,0,0.4))`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "8px 0 8px 14px", borderColor: `transparent transparent transparent ${v.color}88` }} />
                      <div style={{ position: "absolute", top: 6, left: 8, fontSize: 9, fontWeight: 800, background: v.color + "cc", color: "#000", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.05em" }}>{v.type}</div>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", lineHeight: 1.3, marginBottom: 4 }}>{v.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>👁 {v.views.toLocaleString()} views</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Anim>
        </div>
      </section>

      {/* ── AI CLIP FINDER ───────────────────────────────────────────────────── */}
      <section id="clip-finder" style={{ padding: "120px 24px", background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,180,97,0.04) 0%, transparent 70%)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 64, alignItems: "center" }}>
            <div>
              <Anim>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", fontWeight: 700, marginBottom: 16, background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 99, padding: "5px 14px" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
                  Pro Feature
                </div>
              </Anim>
              <Anim delay={80}>
                <h2 style={{ fontSize: "clamp(30px, 4.5vw, 54px)", fontWeight: 900, lineHeight: 1.08, marginBottom: 20 }}>
                  AI extracts your<br /><span style={{ color: GOLD }}>best moments.</span>
                </h2>
              </Anim>
              <Anim delay={160}>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.48)", lineHeight: 1.8, marginBottom: 36 }}>
                  Feed in any long-form video — a webinar replay, a podcast recording, a long VSL. Our AI scans the full timeline, identifies the highest-energy, most valuable moments, and extracts them as individual clips ready to publish or repurpose.
                </p>
              </Anim>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { icon: "🧠", text: "AI detects peak engagement moments in the timeline" },
                  { icon: "✂️", text: "Automatically cuts and extracts individual clips" },
                  { icon: "🏷️", text: "Each clip is labelled with topic, energy level, and timestamp" },
                  { icon: "📲", text: "Export clips directly — sized for Reels, Shorts, and TikTok" },
                  { icon: "⚡", text: "Batch process multiple videos with one click" },
                  { icon: "📊", text: "Review clip performance and re-extract with new settings" },
                ].map(({ icon, text }) => (
                  <Anim key={text} delay={80}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${GOLD}14`, border: `1px solid ${GOLD}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{text}</span>
                    </div>
                  </Anim>
                ))}
              </div>
            </div>

            <Anim from="translateX(40px)">
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}25`, borderRadius: 24, padding: "32px 28px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.05em" }}>AI Clip Finder</div>
                  <div style={{ fontSize: 11, color: clipsFound && clipProgress === 100 ? "#34d399" : GOLD, fontWeight: 600 }}>
                    {clipsFound && clipProgress === 100 ? "✓ 6 clips found" : clipsFound ? `Scanning... ${clipProgress}%` : "Ready to scan"}
                  </div>
                </div>
                {/* Video timeline */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                    <span>webinar-replay-jan.mp4</span>
                    <span>1:24:37</span>
                  </div>
                  <div style={{ position: "relative", height: 36, background: "rgba(255,255,255,0.04)", borderRadius: 8, overflow: "hidden" }}>
                    {/* waveform bars */}
                    <div style={{ display: "flex", alignItems: "center", height: "100%", gap: 1, padding: "0 4px" }}>
                      {Array.from({ length: 60 }, (_, i) => (
                        <div key={i} style={{ flex: 1, background: `${GOLD}${Math.random() > 0.5 ? "44" : "22"}`, height: `${20 + Math.abs(Math.sin(i * 0.4)) * 60}%`, borderRadius: 1 }} />
                      ))}
                    </div>
                    {/* scan line */}
                    {clipsFound && clipProgress < 100 && (
                      <div style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: GOLD, left: `${clipProgress}%`, boxShadow: `0 0 8px ${GOLD}`, transition: "left 0.06s linear" }} />
                    )}
                    {/* highlight regions */}
                    {clipsFound && clipProgress === 100 && (
                      <>
                        {[{ left: "8%", width: "7%", color: "#60a5fa" }, { left: "22%", width: "9%", color: "#a78bfa" }, { left: "38%", width: "6%", color: GOLD }, { left: "51%", width: "8%", color: "#60a5fa" }, { left: "67%", width: "7%", color: "#34d399" }, { left: "82%", width: "10%", color: GOLD }].map((r, i) => (
                          <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: r.left, width: r.width, background: `${r.color}33`, borderLeft: `2px solid ${r.color}88`, borderRight: `2px solid ${r.color}88` }} />
                        ))}
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                    <span>0:00</span><span>42:00</span><span>1:24:37</span>
                  </div>
                </div>
                {/* Extracted clips */}
                {clipsFound && clipProgress === 100 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Hook moment — Story open", duration: "0:47", energy: "High", color: "#60a5fa" },
                      { label: "Core insight — The framework", duration: "1:12", energy: "Peak", color: GOLD },
                      { label: "Case study breakdown", duration: "0:58", energy: "High", color: "#a78bfa" },
                      { label: "Objection handling", duration: "1:03", energy: "Medium", color: "#34d399" },
                    ].map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{c.label}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{c.duration}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: `${c.color}15`, borderRadius: 99, padding: "2px 8px" }}>{c.energy}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => { setClipsFound(true); setClipProgress(0); }}
                    style={{ width: "100%", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 12, padding: "14px 0", cursor: "pointer" }}>
                    {clipsFound ? `Scanning... ${clipProgress}%` : "✂️  Run AI Clip Finder"}
                  </button>
                )}
                {clipsFound && clipProgress === 100 && (
                  <button onClick={() => { setClipsFound(false); setClipProgress(0); }}
                    style={{ width: "100%", marginTop: 10, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: 13, border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "12px 0", cursor: "pointer" }}>
                    Run again with new settings
                  </button>
                )}
              </div>
            </Anim>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Simple Process</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1 }}>
              From setup to conversion<br /><span style={{ color: GOLD }}>in 4 steps.</span>
            </h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 20 }}>
            {[
              { num: "01", icon: "🎬", title: "Add Your Video", desc: "Upload a file, paste a URL, connect Google Drive, or embed from any platform. Supports VSL, Webinar, and Standard types." },
              { num: "02", icon: "⚙️", title: "Configure Settings", desc: "Set the video type, enable a custom progress bar for VSLs, pick your timing preset, add a thumbnail, and set privacy controls." },
              { num: "03", icon: "🌐", title: "Launch Your Page", desc: "We auto-generate a beautiful hosting or registration page. Share the link, embed it anywhere, or gate with an email opt-in." },
              { num: "04", icon: "📊", title: "Track & Optimise", desc: "Watch real-time views, completion rates, and conversion events. Use the data to improve your next VSL or webinar." },
            ].map(({ num, icon, title, desc }) => (
              <Anim key={num} delay={80}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 10, right: 16, fontSize: 72, fontWeight: 900, color: "rgba(212,180,97,0.05)", lineHeight: 1, userSelect: "none" }}>{num}</div>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.75 }}>{desc}</p>
                </div>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "120px 24px", background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,180,97,0.04) 0%, transparent 70%)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Simple Pricing</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1 }}>
              Start free.<br /><span style={{ color: GOLD }}>Scale when ready.</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginTop: 16, lineHeight: 1.7 }}>No contracts. Cancel anytime.</p>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {PRICING.map(tier => (
              <Anim key={tier.tier} delay={80}>
                <div className="vm-pricing-card" style={{ background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 22, padding: "36px 30px", position: "relative", height: "100%" }}>
                  {tier.highlight && (
                    <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 11, borderRadius: 99, padding: "5px 18px", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                      {tier.tag}
                    </div>
                  )}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tier.accent, letterSpacing: "0.05em", marginBottom: 8 }}>{tier.tier}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 900, color: "#fff" }}>{tier.price}</span>
                      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.35)" }}>{tier.period}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                    {tier.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ color: tier.accent, fontSize: 12, marginTop: 1, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => nav("/login?redirect=/video-marketing")}
                    style={{ width: "100%", background: tier.highlight ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : `rgba(255,255,255,0.06)`, color: tier.highlight ? "#000" : tier.accent, fontWeight: 800, fontSize: 14, border: tier.highlight ? "none" : `1px solid ${tier.border}`, borderRadius: 12, padding: "14px 0", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { if (!tier.highlight) (e.currentTarget.style.background = "rgba(255,255,255,0.1)"); }}
                    onMouseLeave={e => { if (!tier.highlight) (e.currentTarget.style.background = "rgba(255,255,255,0.06)"); }}>
                    Login with Oravini →
                  </button>
                </div>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>What Creators Say</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, lineHeight: 1.1 }}>
              Real results from<br /><span style={{ color: GOLD }}>real users.</span>
            </h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 20 }}>
            {[
              { quote: "The custom progress bar on my VSL was a game changer. Watch-through rate went from 34% to 71% in the first week. Nothing else moved the needle like this.", name: "Alex M.", role: "Online Coach", stars: 5 },
              { quote: "I hosted my first webinar in under 20 minutes. The auto-built registration page looked incredible and the CRM integration pushed all my leads straight into my pipeline.", name: "Jordan K.", role: "Course Creator", stars: 5 },
              { quote: "The AI Clip Finder alone is worth the Pro plan. I upload my weekly webinar and it gives me 6 clips ready to post. My content output tripled with zero extra work.", name: "Sarah T.", role: "Marketing Consultant", stars: 5 },
            ].map(({ quote, name, role, stars }) => (
              <Anim key={name} delay={80}>
                <TiltCard style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 26px" }}>
                  <div style={{ display: "flex", gap: 2, marginBottom: 18 }}>
                    {Array.from({ length: stars }).map((_, i) => <span key={i} style={{ color: GOLD, fontSize: 14 }}>★</span>)}
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.8, marginBottom: 22, fontStyle: "italic" }}>"{quote}"</p>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.32)" }}>{role}</div>
                  </div>
                </TiltCard>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "140px 24px", textAlign: "center", background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,180,97,0.07) 0%, transparent 70%)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <Anim>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 20 }}>Ready to Start?</div>
          </Anim>
          <Anim delay={80}>
            <h2 style={{ fontSize: "clamp(36px, 6vw, 70px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 20 }}>
              Your video marketing<br /><span style={{ color: GOLD }}>starts today.</span>
            </h2>
          </Anim>
          <Anim delay={160}>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.4)", marginBottom: 48, lineHeight: 1.75 }}>
              Join creators and coaches using Oravini to host webinars, deploy high-converting VSLs, extract viral clips, and build a video library that actually drives revenue.
            </p>
          </Anim>
          <Anim delay={240}>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => nav("/login?redirect=/video-marketing")}
                style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 17, border: "none", borderRadius: 12, padding: "18px 46px", cursor: "pointer", animation: "pulse-ring 2.5s ease infinite" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                Login with Oravini →
              </button>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 16, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "18px 38px", textDecoration: "none", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = `${GOLD}55`; b.style.color = GOLD; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(255,255,255,0.12)"; b.style.color = "rgba(255,255,255,0.7)"; }}>
                Book Free Walkthrough
              </a>
            </div>
          </Anim>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "52px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 34, width: 34, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 7, filter: "drop-shadow(0 0 8px rgba(212,180,97,0.25))" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>Oravini Video Marketing</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>Powered by Brandverse</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              { label: "Home", href: "/" },
              { label: "Features", href: "#features" },
              { label: "VSLs", href: "#vsl-section" },
              { label: "Webinars", href: "#webinar-section" },
              { label: "Pricing", href: "#pricing" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}>
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>© 2025 Oravini · All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
