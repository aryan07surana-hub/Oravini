import { DashMock } from "@/components/landing/LandingDashMock";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ToolGrid, FeatureRows, Faq } from "@/components/landing/LandingMore";
import { LandingShowcase } from "@/components/landing/LandingShowcase";
import { LandingFlows } from "@/components/landing/LandingFlows";
import { OraviniMark } from "@/components/OraviniLogo";
import TermPricingPreview from "@/components/video-marketing/TermPricingPreview";
import { LandingCursor } from "@/components/landing/LandingCursor";
import { DMDemo, IdeasDemo, SchedulerDemo, VideoDemo, WebinarDemo, StreakDemo } from "@/components/landing/LandingDemos";

const CALENDLY = "https://calendly.com/brandversee/30min";


// ── Scroll-triggered dashboard mock: line draws, numbers tick up, ring fills, checklist ticks off ──
function useSeq() {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0); // 0..1 progress of the whole sequence
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setT(1); return; }
    let raf = 0, started = false;
    const run = () => {
      const t0 = performance.now(), DUR = 4200;
      const step = (n: number) => { const p = Math.min(1, (n - t0) / DUR); setT(p); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting && !started) { started = true; run(); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return { ref, t };
}
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const eo = (x: number) => 1 - Math.pow(1 - x, 3);

// Renders the hero promo video only when the file actually loads. Missing file -> nothing renders.
function HeroVideo() {
  const [state, setState] = useState<"pending" | "ok" | "missing">("pending");
  if (state === "missing") return null;
  return (
    <div className="hero-video" style={{ display: state === "ok" ? "block" : "none" }}>
      <video autoPlay muted loop playsInline poster="/promo/hero-poster.jpg"
        onLoadedData={() => setState("ok")} onError={() => setState("missing")}>
        <source src="/promo/hero.mp4" type="video/mp4" onError={() => setState("missing")} />
      </video>
    </div>
  );
}

function AuditPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="lpopup-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lpopup-card">
        <button onClick={onClose} className="lpopup-close" aria-label="Close">✕</button>
        <div style={{ textAlign: "center" }}>
          <div className="lpopup-pill">Free · No card required</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: "#141414", marginBottom: 10, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Get your free<br /><span style={{ color: "#2e78ef" }}>AI monetisation audit</span>
          </h3>
          <p style={{ fontSize: 14, color: "#5c6570", marginBottom: 24, lineHeight: 1.65 }}>
            Answer 6 quick questions, add your Instagram URL, and our AI builds a personalised growth and monetisation report in seconds.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", marginBottom: 24 }}>
            {["Your personalised growth score", "Top quick wins for this week", "90-day revenue roadmap preview", "Personalised platform strategy tip"].map(item => (
              <div key={item} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: "#2e78ef", fontSize: 13, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: "#3d444d" }}>{item}</span>
              </div>
            ))}
          </div>
          <Link href="/audit">
            <span onClick={onClose} style={{ display: "block", background: "#2e78ef", color: "#fff", fontWeight: 800, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer" }}>
              Start my free audit →
            </span>
          </Link>
          <p style={{ fontSize: 11, color: "#9aa3ad", marginTop: 14 }}>Takes 3 minutes · No spam · Ever.</p>
        </div>
      </div>
    </div>
  );
}

function EmailCaptureStrip({ onCapture }: { onCapture: () => void }) {
  const [form, setForm] = useState({ name: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const submit = async () => {
    if (!form.name || !form.email) return;
    setStatus("loading");
    try {
      await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus("done");
      onCapture();
    } catch {
      setStatus("idle");
    }
  };

  return (
    <section className="lead-strip">
      <div className="lead-card">
        {status === "done" ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#141414", marginBottom: 8 }}>You are on the list.</h3>
            <p style={{ fontSize: 14, color: "#5c6570" }}>Sign up now and unlock your dashboard.</p>
          </>
        ) : (
          <>
            <div className="lead-eyebrow">Get started free</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: "#141414", lineHeight: 1.2, marginBottom: 10, letterSpacing: "-0.02em" }}>
              Drop your email.<br />Start building today.
            </h3>
            <p style={{ fontSize: 14, color: "#5c6570", marginBottom: 26, lineHeight: 1.6 }}>
              Sign up instantly and start building your brand. No credit card, no commitment.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <input type="text" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="lead-input" style={{ flex: "1 1 160px", maxWidth: 200 }} />
              <input type="email" placeholder="Your email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="lead-input" style={{ flex: "1 1 200px", maxWidth: 260 }} />
              <button onClick={submit} disabled={status === "loading" || !form.name || !form.email} className="lead-btn">
                {status === "loading" ? "Saving…" : "Claim credits →"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#9aa3ad", marginTop: 16 }}>No spam. Unsubscribe anytime.</p>
          </>
        )}
      </div>
    </section>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const { ref: seqRef, t: T } = useSeq();
  const num = (to: number, a: number, b: number, fmt = true) => { const v = Math.round(to * eo(seg(T, a, b))); return fmt ? v.toLocaleString("en-US") : String(v); };
  const needsPlan = user && !(user as any).planConfirmed && (user as any).role !== "admin";
  const [showPopup, setShowPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    if (popupDismissed || sessionStorage.getItem("oravini-audit-popup")) return;
    // Exit intent only: opens when the cursor leaves through the top of the page. Never while scrolling.
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && window.scrollY > 600) { sessionStorage.setItem("oravini-audit-popup", "1"); setShowPopup(true); }
    };
    document.addEventListener("mouseleave", onLeave);
    return () => document.removeEventListener("mouseleave", onLeave);
  }, [popupDismissed]);

  return (
    <div className="oravini-landing">
      <LandingCursor />
      {showPopup && <AuditPopup onClose={() => { setShowPopup(false); setPopupDismissed(true); }} />}


<nav>
  <div className="wrap nav-in">
    <Link href="/" className="logo"><OraviniMark size={22} />oravini</Link>
    <div className="nav-links">
      <a href="#features">Product</a><a href="#tools">Tools</a><a href="#webinars">Webinars</a><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
    </div>
    <div className="nav-cta">
      <Link href="/login" className="login">Login</Link>
      <Link href="/audit" className="btn btn-blue">Get started <span>→</span></Link>
    </div>
  </div>
</nav>

{needsPlan && (
  <div className="plan-banner">
    <p>Hey <strong>{(user as any)?.name?.split(" ")[0]}</strong>, you are signed in. Pick a plan to unlock your portal.</p>
    <Link href="/select-plan" className="plan-banner-btn">Choose plan</Link>
  </div>
)}

<header className="hero">
  <div className="gl gl-l" aria-hidden="true"><span className="gl-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e78ef" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg></span><b>+312%</b><small>Growth this month</small></div>
  <div className="gl gl-r" aria-hidden="true"><small>New leads today</small><b>48</b><i><u style={{height:"40%"}}/><u style={{height:"62%"}}/><u style={{height:"50%"}}/><u style={{height:"82%"}}/><u style={{height:"100%"}}/></i></div>
  <div className="wrap">
    <span className="eyebrow"><span className="dot"></span>Built for your next stage</span>
    <h1>The new era for growing your <em>personal brand</em></h1>
    <p>One place to create, analyze, and grow, with AI built in. From your first post to your next 100K.</p>
    <div className="hero-cta">
      <Link href="/audit" className="btn btn-blue">Get started <span>→</span></Link>
      <a className="btn btn-ghost" href="#dash">See the dashboard</a>
    </div>
  </div>
  <div className="wrap">
    <div className="hero-stage">
      <HeroVideo />
      <DashMock />
    </div>
  </div>
</header>

<LandingShowcase />
<LandingFlows />

<section id="features">
  <div className="wrap">
    <div className="sec-head center">
      <span className="eyebrow"><span className="dot"></span>The platform</span>
      <h2>Everything you need to grow online.</h2>
      <p>What used to take seven apps and a team now takes one Oravini account.</p>
    </div>
    <div className="bento">
      <div className="tile wide">
        <div className="tile-stage"><div className="dwrap"><DMDemo /></div></div>
        <div className="tile-cap">DMs that send themselves</div>
        <div className="tile-sub">Comments, story mentions and new followers get an instant, personal reply. Every lead lands in your CRM.</div>
      </div>
      <div className="tile">
        <div className="tile-stage"><div className="dwrap"><IdeasDemo /></div></div>
        <div className="tile-cap">Ideas on tap</div>
        <div className="tile-sub">Hooks, scripts and series built around your niche, not templates.</div>
      </div>
      <div className="tile">
        <div className="tile-stage"><div className="dwrap"><SchedulerDemo /></div></div>
        <div className="tile-cap">Posting on autopilot</div>
        <div className="tile-sub">Queue reels, photos and carousels. Oravini publishes on time, every time.</div>
      </div>
      <div className="tile wide">
        <div className="tile-stage"><div className="dwrap"><WebinarDemo /></div></div>
        <div className="tile-cap">Webinars that fill themselves</div>
        <div className="tile-sub">Registration pages built automatically, reminders handled, every attendee lands in your CRM.</div>
      </div>
      <div className="tile wide">
        <div className="tile-stage"><div className="dwrap"><VideoDemo /></div></div>
        <div className="tile-cap">Videos that convert</div>
        <div className="tile-sub">VSL pages with a progress bar you control, and offers that appear at the perfect second.</div>
      </div>
      <div className="tile">
        <div className="tile-stage"><div className="dwrap"><StreakDemo /></div></div>
        <div className="tile-cap">Momentum you can see</div>
        <div className="tile-sub">Streaks, goals and a creator score that keeps you moving daily.</div>
      </div>
    </div>
  </div>
</section>

<ToolGrid />

<section id="webinars" style={{"background":"#f7fafe","borderTop":"1px solid var(--line)","borderBottom":"1px solid var(--line)"}}>
  <div className="wrap">
    <div className="sec-head">
      <span className="eyebrow"><span className="dot"></span>Webinars &amp; video</span>
      <h2>Webinars that sell while you present.</h2>
      <p>The offer lives inside the room, so nobody leaves to buy. Run it live, recorded or hybrid.</p>
    </div>
    <div className="webinar-grid">
      <div className="tile room">
        <div className="tile-stage room-stage">
          <div className="mock room-mock">
            <div className="room-video">
              <span className="you">You · presenting</span><span className="viewers"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{"verticalAlign":"-1px"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> 312 watching</span>
              <div className="room-offer"><div><div className="p">Growth Blueprint</div><div className="s">Offer ends in 23:06</div></div><span className="buy">Buy · $297</span></div>
            </div>
            <div className="room-chat">
              <div className="chat-line"><b>Sana</b> just bought<span className="buytag">+$297</span></div>
              <div className="chat-line lp-c2"><b>Arjun</b> this is exactly what I needed</div>
              <div className="chat-line lp-c3"><b>Meera</b> grabbing it before the timer ends</div>
            </div>
          </div>
        </div>
        <div style={{"padding":"22px 24px 20px"}}>
          <div className="tile-cap">Checkout built into the room</div>
          <div className="tile-sub">Pin your offer, watch sales land in the chat, and follow up with every attendee automatically.</div>
        </div>
      </div>
      <div className="stack">
        <div className="mini-tile">
          <div className="tile-stage">
            <div className="mock clip">
              <div className="cal-title">AI Clip Finder · 3 clips found</div>
              <div className="clip-row"><span className="th"></span><div><div className="n">High-energy moment</div><div className="t">0:42 – 1:18 · score 96</div></div></div>
              <div className="clip-row r2"><span className="th"></span><div><div className="n">Objection handled</div><div className="t">14:02 – 14:40 · score 91</div></div></div>
              <div className="clip-row r3"><span className="th"></span><div><div className="n">Story hook</div><div className="t">31:55 – 32:30 · score 89</div></div></div>
              <div className="clip-done">✓ Exported · ready to post</div>
            </div>
          </div>
          <div>
            <div className="tile-cap">One webinar, a month of clips</div>
            <div className="tile-sub">The AI scans the replay and cuts the moments worth posting.</div>
          </div>
        </div>
        <div className="mini-tile">
          <div className="tile-stage">
            <div className="mock vsl" style={{"width":"230px"}}>
              <div className="vsl-screen">
                <div className="vsl-gate"><span className="field">you@email.com</span><span className="go">Watch free</span></div>
                <span className="cta">Offer unlocked</span>
                <span className="sold">+$297 sale</span>
              </div>
              <div className="vsl-bar"><div className="vsl-fill"></div></div>
              <div className="vsl-meta"><span>Opt-in at 0:45</span><span>CTA at 2:30</span></div>
            </div>
          </div>
          <div>
            <div className="tile-cap">VSL engine</div>
            <div className="tile-sub">Gate the email opt-in and drop the offer at exactly the right timestamp.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="how">
  <div className="wrap">
    <div className="sec-head center">
      <span className="eyebrow"><span className="dot"></span>How it works</span>
      <h2>The AI scans everything. Then builds your playbook.</h2>
      <p>From your first login to your first viral post, Oravini maps your niche and hands you the strategy.</p>
    </div>
    <div className="steps">
      <div className="step"><div className="n">01</div><h3>You tell us everything</h3><p>An 11-question onboarding maps your niche, audience, goals and monetisation model.</p></div>
      <div className="step"><div className="n">02</div><h3>The AI scans your niche</h3><p>Top performers' hooks, cadence and content gaps, mapped before you create a thing.</p></div>
      <div className="step"><div className="n">03</div><h3>Your strategy lands</h3><p>Content pillars, hook formulas, posting schedule and the exact tools to execute.</p></div>
      <div className="step"><div className="n">04</div><h3>Track, adapt, keep winning</h3><p>Every post and follower shift tracked. The AI recalibrates as you grow.</p></div>
    </div>
  </div>
</section>

<FeatureRows />

<section id="dash" style={{"paddingTop":"0"}}>
  <div className="wrap">
    <div className="dash-cta">
      <div>
        <span className="eyebrow" style={{"background":"rgba(255,255,255,.16)","color":"#fff"}}><span className="dot" style={{"background":"#fff"}}></span>Live preview</span>
        <h2>See the dashboard before you commit.</h2>
        <p>Explore the full tool suite, every AI feature explained. Browse freely, no sign-up needed.</p>
        <Link href="/preview" className="btn btn-blue">Explore the dashboard <span>→</span></Link>
      </div>
      <div className="dash-shot">
        <div className="mini" style={{"border":"none"}}>
          <span className="lbl">Mission progress</span>
          <div className="big">68%<span className="delta">Phase 2 · Launch</span></div>
        </div>
        <div className="app-row">
          <div className="mini"><span className="lbl">Quick tools</span><div style={{"fontSize":"12.5px","fontWeight":"600","marginTop":"6px"}}>AI Ideas · Video Edit · Competitor</div></div>
          <div className="mini"><span className="lbl">Creator score</span><div className="big" style={{"fontSize":"19px"}}>847</div></div>
          <div className="mini"><span className="lbl">Next up</span><div style={{"fontSize":"12.5px","fontWeight":"600","marginTop":"6px"}}>Content review · 3 pending</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="community" style={{"paddingTop":"0"}}>
  <div className="wrap">
    <div className="sec-head center">
      <span className="eyebrow"><span className="dot"></span>Members only</span>
      <h2>Stop guessing. Start growing.</h2>
      <p>Every creator in Oravini gets a system built around their niche, plus people who actually help.</p>
    </div>
    <div className="duo">
      <div className="tile">
        <div className="tile-stage">
          <div className="pulse">
            <div className="mock"><span className="avatar"></span><div>Alex M. just hit 50K using AI Ideas<small>2h ago · Community</small></div></div>
            <div className="mock"><span className="avatar" style={{"background":"linear-gradient(135deg,#88c0fd,#2566d6)"}}></span><div>Sarah K.'s webinar crossed 1,000 signups<small>5h ago · Wins</small></div></div>
            <div className="mock"><span className="avatar" style={{"background":"linear-gradient(135deg,#dbe8fb,#88c0fd)"}}></span><div>Weekly content review starts in 1h<small>Pinned · Announcements</small></div></div>
          </div>
        </div>
        <div className="tile-cap">A community that actually builds</div>
        <div className="tile-sub">Share wins, get feedback, and grow alongside creators doing the work.</div>
      </div>
      <div className="tile">
        <div className="tile-stage">
          <div className="mock support-chat">
            <div className="q">Should I post this hook at 6pm or 9pm?</div>
            <div className="ans"><span className="who">Brandverse team</span>9pm, your audience peaks after 8:30. Check your Growth Tracker heatmap.</div>
          </div>
        </div>
        <div className="tile-cap">A direct line to the team</div>
        <div className="tile-sub">Real people answering strategy questions inside the platform. Not a ticket system.</div>
      </div>
    </div>
  </div>
</section>

<Faq />

<EmailCaptureStrip onCapture={() => setPopupDismissed(true)} />

<section id="pricing" style={{"background":"#fff","borderTop":"1px solid var(--line)"}}><TermPricingPreview /></section>

<section className="final">
  <div className="wrap">
    <span className="eyebrow"><span className="dot"></span>Free to start</span>
    <h2>Your brand,<br />finally in one place.</h2>
    <p>Create a free account and start growing today.</p>
    <Link href="/audit" className="btn btn-blue" style={{"fontSize":"16px","padding":"15px 30px"}}>Get started <span>→</span></Link>
  </div>
</section>

<footer>
  <div className="wrap foot-in">
    <Link href="/" className="logo" style={{"fontSize":"17px"}}><OraviniMark size={18} />oravini</Link>
    <div className="foot-links"><a href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call</a><Link href="/login">Portal login</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a href="https://www.instagram.com/oravini_ai/" target="_blank" rel="noopener noreferrer">Instagram</a></div>
    <div>© 2026 Oravini · Powered by Brandverse</div>
  </div>
</footer>


    </div>
  );
}
