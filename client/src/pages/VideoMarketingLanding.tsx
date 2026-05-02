import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MonitorPlay, Video, Users, LayoutTemplate, TrendingUp, Calendar, Radio, Mic, Target, ArrowRight } from "lucide-react";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const N = 60;
    const ps: any[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.4, o: Math.random() * 0.4 + 0.1
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach(p => {
        p.vx *= 0.97; p.vy *= 0.97; p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,180,97,${p.o})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0 }} />;
}

export default function VideoMarketingLanding() {
  const [, nav] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const features = [
    { icon: MonitorPlay, title: "Live Webinars", desc: "Host unlimited webinars with registration tracking and automated reminders" },
    { icon: Video, title: "Video Library", desc: "Organize and share your video content with custom categories and analytics" },
    { icon: LayoutTemplate, title: "Landing Pages", desc: "Beautiful registration pages that convert visitors into attendees" },
    { icon: Users, title: "CRM Pipeline", desc: "Track leads from registration to conversion with automated stage management" },
    { icon: Mic, title: "Recordings", desc: "Store and share webinar recordings with secure shareable links" },
    { icon: TrendingUp, title: "Analytics", desc: "Real-time insights on views, registrations, and conversion rates" },
  ];

  return (
    <div style={{ background: "#000", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, background: scrolled ? "rgba(0,0,0,0.92)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(212,180,97,0.1)" : "none", transition: "all 0.4s" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MonitorPlay style={{ width: 32, height: 32, color: GOLD }} />
            <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>Video Marketing</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant="ghost" onClick={() => nav("/")} style={{ color: "rgba(255,255,255,0.6)" }}>Back to Oravini</Button>
            <Button onClick={() => nav("/login")} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800 }}>Get Started</Button>
          </div>
        </div>
      </nav>

      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <ParticleCanvas />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,180,97,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px", maxWidth: 900 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 20, fontWeight: 700 }}>Oravini Video Marketing Studio</div>
          <h1 style={{ fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 900, lineHeight: 1, marginBottom: 24, background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD}, #b8962e)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Host Webinars.<br />Build Your List.<br />Close Deals.
          </h1>
          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.5)", marginBottom: 40, lineHeight: 1.6 }}>
            The complete video marketing platform for creators and coaches.<br />Webinars, landing pages, CRM, and analytics — all in one place.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Button size="lg" onClick={() => nav("/video-marketing")} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 16, padding: "18px 40px" }}>Launch Platform →</Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={{ borderColor: `${GOLD}55`, color: GOLD }}>See Features</Button>
          </div>
        </div>
      </section>

      <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(212,180,97,0.02)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, textAlign: "center" }}>
          {[{ val: "Unlimited", label: "Webinars & Videos" }, { val: "Real-time", label: "Analytics Dashboard" }, { val: "Built-in", label: "CRM Pipeline" }, { val: "Custom", label: "Landing Pages" }].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 900, color: GOLD, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" style={{ padding: "120px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Everything You Need</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1 }}>Your complete video<br /><span style={{ color: GOLD }}>marketing system.</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px 28px", transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,180,97,0.4)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(212,180,97,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${GOLD}15`, border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <Icon style={{ width: 24, height: 24, color: GOLD }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "120px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,180,97,0.04) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Simple Process</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1 }}>From setup to conversion<br /><span style={{ color: GOLD }}>in 4 steps.</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { num: "01", icon: Calendar, title: "Create Webinar", desc: "Set up your webinar with title, date, and duration in seconds" },
              { num: "02", icon: LayoutTemplate, title: "Build Landing Page", desc: "Generate a beautiful registration page with one click" },
              { num: "03", icon: Radio, title: "Go Live", desc: "Start your webinar and engage with attendees in real-time" },
              { num: "04", icon: Target, title: "Track & Convert", desc: "Monitor analytics and follow up with leads through the CRM" },
            ].map(({ num, icon: Icon, title, desc }) => (
              <div key={num} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "32px 28px", position: "relative" }}>
                <div style={{ position: "absolute", top: 16, right: 20, fontSize: 64, fontWeight: 900, color: "rgba(212,180,97,0.06)", lineHeight: 1 }}>{num}</div>
                <Icon style={{ width: 32, height: 32, color: GOLD, marginBottom: 16 }} />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "120px 24px", textAlign: "center", background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,180,97,0.06) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>Ready to scale with<br /><span style={{ color: GOLD }}>video marketing?</span></h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.4)", marginBottom: 40, lineHeight: 1.7 }}>Join creators and coaches using Oravini to host webinars, build their list, and close more deals.</p>
          <Button size="lg" onClick={() => nav("/video-marketing")} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", fontWeight: 800, fontSize: 18, padding: "20px 48px" }}>
            Launch Platform <ArrowRight style={{ width: 20, height: 20, marginLeft: 8 }} />
          </Button>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MonitorPlay style={{ width: 24, height: 24, color: GOLD }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Video Marketing by Oravini</span>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            <a href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Home</a>
            <a href="/privacy" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Privacy</a>
            <a href="/terms" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
