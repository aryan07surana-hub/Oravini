import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
const oraviniLogoPath = "/oravini-logo.png";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";
const CALENDLY = "https://calendly.com/brandversee/30min";

// ── Particle Canvas (same as OraviniLanding) ─────────────────────────────────
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

    const N = 90;
    const CONNECT_DIST = 150;
    const CURSOR_PULL_DIST = 160;
    const CURSOR_PUSH_DIST = 55;

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

// ── Progress Bar Preview ──────────────────────────────────────────────────────
function ProgressBarPreview({ style: barStyle }: { style: string }) {
  const [pct, setPct] = useState(0);
  const animRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const getDuration = (s: string) => {
    if (s === "slow-start") return 6000;
    if (s === "fast-start") return 3000;
    return 4500;
  };

  const getEase = (s: string, t: number) => {
    if (s === "slow-start") return Math.pow(t, 2.5);
    if (s === "fast-start") return 1 - Math.pow(1 - t, 2.5);
    return t;
  };

  useEffect(() => {
    setPct(0);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    startRef.current = Date.now();
    const dur = getDuration(barStyle);
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const t = Math.min(elapsed / dur, 1);
      setPct(Math.round(getEase(barStyle, t) * 100));
      if (t < 1) animRef.current = requestAnimationFrame(tick);
      else {
        setTimeout(() => {
          setPct(0);
          startRef.current = Date.now();
          animRef.current = requestAnimationFrame(tick);
        }, 1200);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [barStyle]);

  return (
    <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", marginTop: 10 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, ${GOLD_BRIGHT})`, borderRadius: 99, transition: "width 0.1s linear", boxShadow: `0 0 8px ${GOLD}66` }} />
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
  const pick = (opt: string) => {
    setAnswers([...answers, opt]);
    setStep(step + 1);
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#080808", border: `1px solid ${GOLD}33`, borderRadius: 24, padding: "44px 40px", maxWidth: 520, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 22, cursor: "pointer" }}>✕</button>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 16 }}>🎬</div>
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
          <img src={oraviniLogoPath} alt="Oravini" style={{ height: 38, width: 38, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 7, filter: "drop-shadow(0 0 10px rgba(212,180,97,0.3))" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>Video Marketing</span>
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
            Features
          </button>
          <button onClick={() => document.getElementById("vsl-section")?.scrollIntoView({ behavior: "smooth" })}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
            VSLs
          </button>
          <button onClick={() => document.getElementById("webinar-section")?.scrollIntoView({ behavior: "smooth" })}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
            Webinars
          </button>
          <button onClick={onStrategy}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, padding: "8px 18px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = `${GOLD}66`; b.style.color = GOLD; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(255,255,255,0.12)"; b.style.color = "rgba(255,255,255,0.7)"; }}>
            Free Assessment
          </button>
          <button onClick={() => nav("/login")}
            style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 800, padding: "9px 20px", cursor: "pointer" }}>
            Get Started →
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function VideoMarketingLanding() {
  const [, nav] = useLocation();
  const [showStrategy, setShowStrategy] = useState(false);
  const [activeBar, setActiveBar] = useState("steady");

  useScrollAnim();

  return (
    <div style={{ background: "#000", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from{ opacity:0; transform:translateY(30px); } to{ opacity:1; transform:none; } }
        @keyframes floatY { 0%,100%{ transform:translateY(0) translateX(-50%); } 50%{ transform:translateY(-14px) translateX(-50%); } }
        @keyframes pulse-ring { 0%{ box-shadow:0 0 0 0 rgba(212,180,97,0.4); } 70%{ box-shadow:0 0 0 18px rgba(212,180,97,0); } 100%{ box-shadow:0 0 0 0 rgba(212,180,97,0); } }
        @keyframes shimmer { 0%{ background-position:-600px 0; } 100%{ background-position:600px 0; } }
        @keyframes orbFloat { 0%,100%{ transform:translate(0,0) scale(1); } 40%{ transform:translate(-40px,50px) scale(1.1); } 70%{ transform:translate(30px,-30px) scale(0.9); } }
        .vm-hero-title { animation: fadeUp 1s ease 0.3s both; }
        .vm-hero-sub { animation: fadeUp 1s ease 0.6s both; }
        .vm-hero-label { animation: fadeUp 1s ease 0.1s both; }
        .vm-hero-cta { animation: fadeUp 1s ease 0.9s both; }
        .vm-hero-scroll { animation: fadeUp 1s ease 1.2s both; }
        .vm-feature-card:hover { border-color: rgba(212,180,97,0.4) !important; box-shadow: 0 0 40px rgba(212,180,97,0.07) !important; }
        .vm-bar-preset:hover { border-color: rgba(212,180,97,0.5) !important; }
      `}</style>

      {showStrategy && <StrategyModal onClose={() => setShowStrategy(false)} />}
      <Navbar onStrategy={() => setShowStrategy(true)} />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", overflow: "hidden" }}>
        <ParticleCanvas />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(212,180,97,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 1 }} />
        {/* Orbs */}
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,180,97,0.04) 0%, transparent 70%)", top: "10%", left: "-10%", animation: "orbFloat 12s ease-in-out infinite", zIndex: 1, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,180,97,0.03) 0%, transparent 70%)", bottom: "5%", right: "-8%", animation: "orbFloat 15s ease-in-out infinite reverse", zIndex: 1, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 2, padding: "0 24px", maxWidth: 1000 }}>
          <div className="vm-hero-label" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", fontWeight: 700, marginBottom: 22, background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 99, padding: "6px 18px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, display: "inline-block", animation: "pulse-ring 2s ease infinite" }} />
            Oravini Video Marketing Studio
          </div>
          <div className="vm-hero-title" style={{ fontSize: "clamp(48px, 9vw, 108px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 0.92, textTransform: "uppercase", background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 45%, #b8962e 80%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 24, filter: "drop-shadow(0 0 60px rgba(212,180,97,0.2))" }}>
            Host.<br />Convert.<br />Scale.
          </div>
          <div className="vm-hero-sub" style={{ fontSize: "clamp(15px, 2vw, 19px)", color: "rgba(255,255,255,0.48)", lineHeight: 1.75, maxWidth: 680, margin: "0 auto 44px" }}>
            The all-in-one video marketing platform for creators and coaches.<br />
            Webinars, VSLs with custom progress bars, video hosting, landing pages, and real-time analytics — under one roof.
          </div>
          <div className="vm-hero-cta" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => nav("/login")}
              style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 12, padding: "16px 36px", cursor: "pointer", animation: "pulse-ring 2.5s ease 2s infinite" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Start Hosting Free →
            </button>
            <button onClick={() => setShowStrategy(true)}
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 15, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "16px 32px", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = `${GOLD}55`; b.style.color = GOLD; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(255,255,255,0.12)"; b.style.color = "rgba(255,255,255,0.7)"; }}>
              Take Free Assessment
            </button>
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              style={{ background: `rgba(212,180,97,0.07)`, color: GOLD, fontWeight: 600, fontSize: 15, border: `1px solid ${GOLD}44`, borderRadius: 12, padding: "16px 32px", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.background = `rgba(212,180,97,0.13)`; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.background = `rgba(212,180,97,0.07)`; }}>
              See Everything Inside
            </button>
          </div>
        </div>

        <div className="vm-hero-scroll" style={{ position: "absolute", bottom: 36, left: "50%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2, animation: "floatY 1.8s ease-in-out infinite" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase" }}>Scroll</div>
          <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, ${GOLD}66, transparent)` }} />
        </div>
      </section>

      {/* ── STATS STRIP ────────────────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "80px 24px", background: "rgba(212,180,97,0.02)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 40, textAlign: "center" }}>
          {[
            { to: 100, suffix: "%", label: "Uptime Guaranteed", prefix: "" },
            { to: 4, suffix: " Upload Methods", label: "URL · File · Drive · Embed", prefix: "" },
            { to: 3, suffix: " Progress Bar Modes", label: "Slow Start · Steady · Fast", prefix: "" },
            { to: 0, suffix: "", label: "Coding Required", prefix: "Zero" },
            { to: 1, suffix: " Dashboard", label: "Everything in One Place", prefix: "" },
          ].map(s => (
            <Anim key={s.label} delay={80}>
              <div>
                <div style={{ fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 900, color: GOLD, lineHeight: 1.1 }}>
                  {s.prefix ? s.prefix : <Counter to={s.to} suffix={s.suffix} />}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8, lineHeight: 1.5 }}>{s.label}</div>
              </div>
            </Anim>
          ))}
        </div>
      </section>

      {/* ── WHAT IS THIS ───────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
        <Anim>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>The Platform</div>
        </Anim>
        <Anim delay={100}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.025em" }}>
            Your entire video operation,<br /><span style={{ color: GOLD }}>built to convert.</span>
          </h2>
        </Anim>
        <Anim delay={200}>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.48)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 56px" }}>
            Oravini Video Marketing brings together everything a creator or coach needs — from hosting a live webinar to deploying a high-converting VSL with a custom progress bar — all in one powerful, beautifully designed platform.
          </p>
        </Anim>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            { icon: "🎬", title: "Video Hosting", desc: "Upload, embed, and organize all your videos from URL, file, or Google Drive." },
            { icon: "📡", title: "Live Webinars", desc: "Host unlimited webinars with registration, reminders, and recordings." },
            { icon: "🎯", title: "VSL Engine", desc: "Deploy video sales letters with custom progress bars that maximize completion." },
          ].map(({ icon, title, desc }) => (
            <Anim key={title} delay={150}>
              <TiltCard style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "32px 28px" }}>
                <div style={{ fontSize: 38, marginBottom: 16 }}>{icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{desc}</div>
              </TiltCard>
            </Anim>
          ))}
        </div>
      </section>

      {/* ── FULL FEATURE GRID ──────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "120px 24px", background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,180,97,0.04) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Everything You Need</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1 }}>
              One platform.<br /><span style={{ color: GOLD }}>Infinite possibilities.</span>
            </h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {[
              { icon: "📡", title: "Webinar Hosting", desc: "Host unlimited live webinars with automated registration pages, email reminders, and attendance tracking. Everything runs from your dashboard.", tag: "Core" },
              { icon: "🎯", title: "VSL (Video Sales Letter)", desc: "Upload or embed your VSLs and pair them with landing pages. Add custom progress bars to keep viewers watching longer and converting more.", tag: "Core" },
              { icon: "📊", title: "Custom Progress Bar", desc: "Choose from Slow Start, Steady, or Fast Start profiles — or define your own segment timing. Control exactly how fast the bar moves through each section.", tag: "VSL Only" },
              { icon: "🗂️", title: "Video Library", desc: "Organise all your content by type: VSLs, Webinar Recordings, and Standard Videos. Filter, search, and share with a single click.", tag: "All Plans" },
              { icon: "🔗", title: "Landing Pages", desc: "Auto-generate beautiful registration and watch pages for every webinar or VSL you create. No design skills needed.", tag: "Built-In" },
              { icon: "👥", title: "CRM Pipeline", desc: "Track every lead from registration to conversion with automated stage progression, tags, and follow-up triggers.", tag: "Pipeline" },
              { icon: "📈", title: "Real-Time Analytics", desc: "Watch views, play rates, drop-off points, and conversion metrics update live as your audience watches.", tag: "Live Data" },
              { icon: "🎙️", title: "Webinar Recordings", desc: "All live webinars are automatically recorded and stored. Share replay links with a custom expiry date or gate behind email opt-in.", tag: "Auto" },
              { icon: "☁️", title: "Google Drive Import", desc: "Connect your Google Drive and import videos directly — no re-uploading needed. Works with Sheets, Docs-linked media, and Drive folders.", tag: "Integration" },
              { icon: "🔒", title: "Secure Sharing", desc: "Control who sees your content. Set videos to public, private, or password-protected. Generate time-limited shareable links.", tag: "Security" },
              { icon: "📱", title: "Mobile Optimised", desc: "Every registration page, video player, and dashboard view is pixel-perfect on mobile, tablet, and desktop.", tag: "Responsive" },
              { icon: "⚡", title: "Instant Embed", desc: "Supports YouTube, Vimeo, Wistia, Loom, and direct video URLs. Paste a link and we handle the rest.", tag: "Multi-Source" },
            ].map(({ icon, title, desc, tag }) => (
              <Anim key={title} delay={60}>
                <div className="vm-feature-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 24px", transition: "all 0.3s", height: "100%" }}>
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

      {/* ── VSL DEEP DIVE ──────────────────────────────────────────────────── */}
      <section id="vsl-section" style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 60, alignItems: "center" }}>
            {/* Left: text */}
            <div>
              <Anim>
                <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>VSL Engine</div>
              </Anim>
              <Anim delay={80}>
                <h2 style={{ fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
                  VSLs that<br /><span style={{ color: GOLD }}>keep people watching.</span>
                </h2>
              </Anim>
              <Anim delay={160}>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.48)", lineHeight: 1.8, marginBottom: 32 }}>
                  A VSL lives and dies by its completion rate. That's why we built a custom progress bar engine — so you can control exactly how fast the bar moves, keeping viewers locked in and watching all the way to your CTA.
                </p>
              </Anim>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "🎬", text: "Upload via URL, file, Google Drive, or embed" },
                  { icon: "📊", text: "Custom progress bar with 4 preset styles or fully custom timing" },
                  { icon: "🔒", text: "Gate with email opt-in or password protection" },
                  { icon: "📈", text: "Track drop-off at every second of playback" },
                  { icon: "🔗", text: "Auto-generate a dedicated VSL landing page" },
                ].map(({ icon, text }) => (
                  <Anim key={text} delay={100}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${GOLD}14`, border: `1px solid ${GOLD}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{text}</span>
                    </div>
                  </Anim>
                ))}
              </div>
            </div>
            {/* Right: Progress Bar Live Demo */}
            <Anim from="translateX(40px)">
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}25`, borderRadius: 24, padding: "36px 32px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>Progress Bar — Live Preview</div>
                {/* Fake video thumbnail */}
                <div style={{ width: "100%", aspectRatio: "16/9", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 40% 40%, rgba(212,180,97,0.06) 0%, transparent 70%)" }} />
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${GOLD}22`, border: `2px solid ${GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "10px 0 10px 18px", borderColor: `transparent transparent transparent ${GOLD}`, marginLeft: 4 }} />
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 12px" }}>
                    <ProgressBarPreview style={activeBar} />
                  </div>
                </div>
                {/* Preset selector */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { id: "slow-start", label: "Slow Start", desc: "Builds suspense, rushes at end" },
                    { id: "steady", label: "Steady", desc: "Consistent natural pace" },
                    { id: "fast-start", label: "Fast Start", desc: "Hooks early, slows down" },
                    { id: "custom", label: "Custom", desc: "Define your own segments" },
                  ].map(p => (
                    <button key={p.id} onClick={() => setActiveBar(p.id)}
                      className="vm-bar-preset"
                      style={{ background: activeBar === p.id ? `${GOLD}15` : "rgba(255,255,255,0.03)", border: `1px solid ${activeBar === p.id ? GOLD + "55" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "12px 14px", textAlign: "left", cursor: "pointer", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: activeBar === p.id ? GOLD : "rgba(255,255,255,0.75)", marginBottom: 3 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </Anim>
          </div>
        </div>
      </section>

      {/* ── WEBINAR DEEP DIVE ──────────────────────────────────────────────── */}
      <section id="webinar-section" style={{ padding: "120px 24px", background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(212,180,97,0.04) 0%, transparent 70%)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 60, alignItems: "center" }}>
            {/* Left: Webinar dashboard mock */}
            <Anim from="translateX(-40px)">
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 24, padding: "32px 28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse-ring 2s ease infinite" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", letterSpacing: "0.05em" }}>LIVE NOW</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>247 watching</span>
                </div>
                {/* Fake chat & stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[{ label: "Registered", val: "412" }, { label: "Attending", val: "247" }, { label: "Chat msgs", val: "1.2k" }].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Registrations over time</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
                    {[20, 35, 28, 55, 42, 70, 62, 85, 78, 100, 90, 95].map((h, i) => (
                      <div key={i} style={{ flex: 1, background: i === 11 ? GOLD : `${GOLD}33`, borderRadius: "3px 3px 0 0", height: `${h}%`, transition: "height 0.3s ease" }} />
                    ))}
                  </div>
                </div>
              </div>
            </Anim>
            {/* Right: text */}
            <div>
              <Anim>
                <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>Webinar Platform</div>
              </Anim>
              <Anim delay={80}>
                <h2 style={{ fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
                  Webinars that<br /><span style={{ color: GOLD }}>fill your pipeline.</span>
                </h2>
              </Anim>
              <Anim delay={160}>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.48)", lineHeight: 1.8, marginBottom: 32 }}>
                  Host unlimited live webinars, track who registers and who shows up, send automated reminders, and convert attendees into clients — all without leaving Oravini.
                </p>
              </Anim>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "📋", text: "One-click registration page creation with custom fields" },
                  { icon: "📧", text: "Automated email reminders at 24h, 1h, and 10min before" },
                  { icon: "🎙️", text: "Auto-record every session — replay links generated instantly" },
                  { icon: "👥", text: "Live attendee tracking and engagement scoring" },
                  { icon: "🔄", text: "Push registrants directly into your CRM pipeline" },
                  { icon: "📊", text: "Post-webinar analytics: attendance rate, drop-off, conversion" },
                ].map(({ icon, text }) => (
                  <Anim key={text} delay={80}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${GOLD}14`, border: `1px solid ${GOLD}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{text}</span>
                    </div>
                  </Anim>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VIDEO HOSTING DEEP DIVE ─────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Video Library</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.1 }}>
              Host anything.<br /><span style={{ color: GOLD }}>From anywhere.</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginTop: 16, lineHeight: 1.8, maxWidth: 560, margin: "16px auto 0" }}>
              Four ways to get your video in. One place to manage it all.
            </p>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 60 }}>
            {[
              { icon: "🔗", method: "URL / Embed", desc: "Paste a YouTube, Vimeo, Wistia, Loom, or any direct video URL. We embed it instantly.", color: "#60a5fa" },
              { icon: "📁", method: "File Upload", desc: "Upload MP4, MOV, or AVI directly. Files up to 2GB supported with drag-and-drop.", color: "#a78bfa" },
              { icon: "☁️", method: "Google Drive", desc: "Connect your Drive and import videos from any folder without re-downloading.", color: "#34d399" },
              { icon: "⚡", method: "Direct Embed", desc: "Copy the embed code from any supported platform and drop it straight in.", color: GOLD },
            ].map(({ icon, method, desc, color }) => (
              <Anim key={method} delay={80}>
                <TiltCard style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 24px", height: "100%" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 18 }}>{icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{method}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.7 }}>{desc}</div>
                </TiltCard>
              </Anim>
            ))}
          </div>
          {/* Category tabs preview */}
          <Anim>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 28px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {["All Videos", "VSLs", "Webinars", "Standard"].map((tab, i) => (
                  <div key={tab} style={{ padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, background: i === 0 ? `${GOLD}20` : "rgba(255,255,255,0.04)", border: `1px solid ${i === 0 ? GOLD + "50" : "rgba(255,255,255,0.08)"}`, color: i === 0 ? GOLD : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                    {tab}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                {[
                  { title: "Webinar Replay — Jan", type: "WEBINAR", views: 412, color: "#60a5fa" },
                  { title: "VSL — Main Offer", type: "VSL", views: 1820, color: "#a78bfa" },
                  { title: "Onboarding Walkthrough", type: "STANDARD", views: 238, color: GOLD },
                  { title: "Product Demo — Feb", type: "VSL", views: 904, color: "#a78bfa" },
                  { title: "Live Masterclass Replay", type: "WEBINAR", views: 671, color: "#60a5fa" },
                  { title: "Brand Story Video", type: "STANDARD", views: 193, color: GOLD },
                ].map(v => (
                  <div key={v.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
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

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,180,97,0.04) 0%, transparent 70%)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Simple Process</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1 }}>
              From setup to conversion<br /><span style={{ color: GOLD }}>in 4 steps.</span>
            </h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { num: "01", icon: "🎬", title: "Add Your Video", desc: "Upload a file, paste a URL, connect Google Drive, or embed from any platform. Supports VSL, Webinar, and Standard types." },
              { num: "02", icon: "⚙️", title: "Configure Settings", desc: "Set the video type, enable a custom progress bar for VSLs, pick your timing preset, add a thumbnail, and set privacy controls." },
              { num: "03", icon: "🌐", title: "Launch Your Page", desc: "We auto-generate a beautiful hosting or registration page. Share the link, embed it anywhere, or gate it with an email opt-in." },
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

      {/* ── SOCIAL PROOF ───────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Anim style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>What Creators Say</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 900, lineHeight: 1.1 }}>
              Real results from<br /><span style={{ color: GOLD }}>real users.</span>
            </h2>
          </Anim>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {[
              { quote: "The custom progress bar on my VSL was a game changer. Watch-through rate went from 34% to 71% in the first week.", name: "Alex M.", role: "Online Coach", stars: 5 },
              { quote: "I hosted my first webinar in under 20 minutes. The registration page looked incredible and the CRM integration was seamless.", name: "Jordan K.", role: "Course Creator", stars: 5 },
              { quote: "Finally a place where all my video content lives together — VSLs, webinar replays, training videos — and the analytics are actually useful.", name: "Sarah T.", role: "Marketing Consultant", stars: 5 },
            ].map(({ quote, name, role, stars }) => (
              <Anim key={name} delay={80}>
                <TiltCard style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 24px" }}>
                  <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                    {Array.from({ length: stars }).map((_, i) => <span key={i} style={{ color: GOLD, fontSize: 14 }}>★</span>)}
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, marginBottom: 20, fontStyle: "italic" }}>"{quote}"</p>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{role}</div>
                  </div>
                </TiltCard>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "140px 24px", textAlign: "center", background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,180,97,0.07) 0%, transparent 70%)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Anim>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 20 }}>Ready to Start?</div>
          </Anim>
          <Anim delay={80}>
            <h2 style={{ fontSize: "clamp(36px, 6vw, 68px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 20 }}>
              Your video marketing<br /><span style={{ color: GOLD }}>starts today.</span>
            </h2>
          </Anim>
          <Anim delay={160}>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.4)", marginBottom: 44, lineHeight: 1.75 }}>
              Join creators and coaches using Oravini to host webinars, deploy high-converting VSLs, and build a video library that actually drives revenue.
            </p>
          </Anim>
          <Anim delay={240}>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { window.location.href = "/login"; }}
                style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 17, border: "none", borderRadius: 12, padding: "18px 44px", cursor: "pointer", animation: "pulse-ring 2.5s ease infinite" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                Get Started Free →
              </button>
              <button onClick={() => setShowStrategy(true)}
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 16, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "18px 36px", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = `${GOLD}55`; b.style.color = GOLD; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(255,255,255,0.12)"; b.style.color = "rgba(255,255,255,0.7)"; }}>
                Take Free Assessment
              </button>
            </div>
          </Anim>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 32, width: 32, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 6, filter: "drop-shadow(0 0 8px rgba(212,180,97,0.25))" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>Oravini Video Marketing</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Powered by Brandverse</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[{ label: "Home", href: "/" }, { label: "Features", href: "#features" }, { label: "VSLs", href: "#vsl-section" }, { label: "Webinars", href: "#webinar-section" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }].map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2025 Oravini · All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
