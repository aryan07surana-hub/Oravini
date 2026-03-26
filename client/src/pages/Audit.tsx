import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const GOLD = "#d4b461";
const WHOP = "https://whop.com/brandversee";
const CALENDLY = "https://calendly.com/brandversee/30min";

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "LinkedIn", "Multiple"];
const STRUGGLES = [
  "Not growing fast enough",
  "Don't know what to post",
  "Low engagement",
  "No monetisation strategy",
  "Content burnout",
  "Inconsistent posting",
];
const GOALS = [
  "Grow my audience",
  "Brand deals & sponsorships",
  "Sell digital products / courses",
  "Coaching & consulting",
  "Build a personal brand",
  "All of the above",
];

interface AuditForm {
  name: string;
  email: string;
  platform: string;
  niche: string;
  targetAudience: string;
  biggestChallenge: string;
  goals: string;
  instagramUrl: string;
}

type Step = "intro" | 1 | 2 | 3 | 4 | 5 | 6 | "details" | "processing" | "report";

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 32, overflow: "hidden" }}>
      <div style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}, #f0d080)`, borderRadius: 2, width: `${(current / total) * 100}%`, transition: "width 0.4s ease" }} />
    </div>
  );
}

function OptionBtn({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", padding: "14px 18px", borderRadius: 10,
      border: `1.5px solid ${selected ? GOLD : "rgba(255,255,255,0.1)"}`,
      background: selected ? `${GOLD}15` : "rgba(255,255,255,0.03)",
      color: selected ? GOLD : "rgba(255,255,255,0.75)",
      fontSize: 14, fontWeight: selected ? 700 : 500, cursor: "pointer", transition: "all 0.18s",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected ? GOLD : "rgba(255,255,255,0.2)"}`, background: selected ? GOLD : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {selected && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#000", display: "block" }} />}
      </span>
      {label}
    </button>
  );
}

function ProcessingScreen() {
  const [msgIdx, setMsgIdx] = useState(0);
  const msgs = [
    "Analysing your content strategy…",
    "Mapping audience psychology…",
    "Estimating revenue potential…",
    "Running competitor benchmarks…",
    "Calculating your growth score…",
    "Building your personalised roadmap…",
    "Almost there…",
  ];
  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => Math.min(i + 1, msgs.length - 1)), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", border: `3px solid ${GOLD}30`, borderTop: `3px solid ${GOLD}`, margin: "0 auto 36px", animation: "spin 1.2s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Generating Your Audit</h3>
      <p style={{ fontSize: 15, color: GOLD, fontWeight: 600, minHeight: 24, transition: "opacity 0.4s" }}>{msgs[msgIdx]}</p>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 16 }}>This usually takes 20–40 seconds</p>
    </div>
  );
}

function ScoreDial({ score, label }: { score: number; label: string }) {
  const pct = score / 100;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;
  const color = score >= 70 ? "#4ade80" : score >= 45 ? GOLD : "#f87171";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circumference}`} strokeDashoffset={circumference * 0.25}
          strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray 1s ease" }} />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="900">{score}</text>
        <text x="70" y="85" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">/100</text>
      </svg>
      <span style={{ fontSize: 14, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 100, padding: "3px 14px" }}>{label}</span>
    </div>
  );
}

export default function Audit() {
  const [step, setStep] = useState<Step>("intro");
  const [form, setForm] = useState<AuditForm>({ name: "", email: "", platform: "", niche: "", targetAudience: "", biggestChallenge: "", goals: "", instagramUrl: "" });
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  const TOTAL_STEPS = 6;
  const stepNum = typeof step === "number" ? step : step === "details" ? 6 : 0;

  const next = (key: keyof AuditForm, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    scrollTop();
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
    else if (step === 4) setStep(5);
    else if (step === 5) setStep(6);
    else if (step === 6) setStep("details");
  };

  const submitAudit = async () => {
    if (!form.name || !form.email) { setError("Please enter your name and email."); return; }
    setError("");
    setStep("processing");
    scrollTop();
    try {
      const res = await fetch("/api/leads/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Audit failed");
      setReport(data.report);
      setStep("report");
      scrollTop();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setStep("details");
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "#0c0c0c",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 20,
    padding: "40px 36px",
    maxWidth: 560,
    width: "100%",
    margin: "0 auto",
  };

  return (
    <div ref={topRef} style={{ background: "#060606", minHeight: "100vh", color: "#fff", fontFamily: "'Inter', -apple-system, sans-serif", padding: "0 16px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(6,6,6,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg, ${GOLD} 0%, #b8962e 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#000" }}>B</div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Brandverse</span>
            </div>
          </Link>
          <Link href="/login"><span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Log in</span></Link>
        </div>
      </nav>

      <div style={{ paddingTop: 90, paddingBottom: 80, maxWidth: 620, margin: "0 auto" }}>

        {/* INTRO */}
        {step === "intro" && (
          <div style={cardStyle}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
              <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}35`, borderRadius: 100, padding: "4px 14px", marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Free AI Audit · Takes 3 min</span>
              </div>
              <h1 style={{ fontSize: "clamp(24px, 5vw, 34px)", fontWeight: 900, color: "#fff", lineHeight: 1.15, marginBottom: 14 }}>
                Get Your Free<br />
                <span style={{ color: GOLD }}>AI Monetisation Audit</span>
              </h1>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 28 }}>
                Answer 6 quick questions, add your Instagram URL, and our AI builds a personalised growth and monetisation report — in seconds.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", marginBottom: 28 }}>
                {["Your personalised growth score", "Top quick wins for this week", "Your 90-day revenue roadmap", "What to upgrade for full insights"].map(item => (
                  <div key={item} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: GOLD, fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>{item}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setStep(1); scrollTop(); }} style={{ width: "100%", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "14px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                Start My Free Audit →
              </button>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 14 }}>No credit card · No spam · Takes 3 minutes</p>
            </div>
          </div>
        )}

        {/* STEP 1: Platform */}
        {step === 1 && (
          <div style={cardStyle}>
            <ProgressBar current={1} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Step 1 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 24, lineHeight: 1.2 }}>What's your main content platform?</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PLATFORMS.map(p => (
                <OptionBtn key={p} label={p} selected={form.platform === p} onClick={() => next("platform", p)} />
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Niche */}
        {step === 2 && (
          <div style={cardStyle}>
            <ProgressBar current={2} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Step 2 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>What's your niche?</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 22 }}>e.g. fitness, personal finance, beauty, business, lifestyle</p>
            <input
              type="text"
              value={form.niche}
              onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
              placeholder="Type your niche…"
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "13px 16px", color: "#fff", fontSize: 15, outline: "none", marginBottom: 20 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStep(1); scrollTop(); }} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer" }}>← Back</button>
              <button onClick={() => { if (form.niche) { scrollTop(); setStep(3); } }} disabled={!form.niche}
                style={{ flex: 2, background: form.niche ? GOLD : "rgba(255,255,255,0.08)", color: form.niche ? "#000" : "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: 14, padding: "13px", borderRadius: 10, border: "none", cursor: form.niche ? "pointer" : "not-allowed" }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Target Audience */}
        {step === 3 && (
          <div style={cardStyle}>
            <ProgressBar current={3} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Step 3 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>Who is your target audience?</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 22 }}>e.g. women aged 25–35 who want to start investing</p>
            <input
              type="text"
              value={form.targetAudience}
              onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
              placeholder="Describe your ideal viewer/follower…"
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "13px 16px", color: "#fff", fontSize: 15, outline: "none", marginBottom: 20 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStep(2); scrollTop(); }} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer" }}>← Back</button>
              <button onClick={() => { if (form.targetAudience) { scrollTop(); setStep(4); } }} disabled={!form.targetAudience}
                style={{ flex: 2, background: form.targetAudience ? GOLD : "rgba(255,255,255,0.08)", color: form.targetAudience ? "#000" : "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: 14, padding: "13px", borderRadius: 10, border: "none", cursor: form.targetAudience ? "pointer" : "not-allowed" }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Biggest struggle */}
        {step === 4 && (
          <div style={cardStyle}>
            <ProgressBar current={4} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Step 4 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 24, lineHeight: 1.2 }}>What's your biggest struggle right now?</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {STRUGGLES.map(s => (
                <OptionBtn key={s} label={s} selected={form.biggestChallenge === s} onClick={() => next("biggestChallenge", s)} />
              ))}
            </div>
            <button onClick={() => { setStep(3); scrollTop(); }} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 13, cursor: "pointer" }}>← Back</button>
          </div>
        )}

        {/* STEP 5: Goals */}
        {step === 5 && (
          <div style={cardStyle}>
            <ProgressBar current={5} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Step 5 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 24, lineHeight: 1.2 }}>What's your primary goal?</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {GOALS.map(g => (
                <OptionBtn key={g} label={g} selected={form.goals === g} onClick={() => next("goals", g)} />
              ))}
            </div>
            <button onClick={() => { setStep(4); scrollTop(); }} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 13, cursor: "pointer" }}>← Back</button>
          </div>
        )}

        {/* STEP 6: Instagram URL */}
        {step === 6 && (
          <div style={cardStyle}>
            <ProgressBar current={6} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Step 6 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>Add your Instagram URL</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 22, lineHeight: 1.6 }}>
              This lets our AI pull your real profile data for a more accurate, personalised audit.
              <br /><span style={{ color: "rgba(255,255,255,0.28)", fontSize: 12 }}>Only public profiles can be analysed. You can skip this if you prefer.</span>
            </p>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>instagram.com/</span>
              <input
                type="text"
                value={form.instagramUrl}
                onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))}
                placeholder="yourusername"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "13px 16px 13px 128px", color: "#fff", fontSize: 15, outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStep(5); scrollTop(); }} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer" }}>← Back</button>
              <button onClick={() => { scrollTop(); setStep("details"); }}
                style={{ flex: 2, background: GOLD, color: "#000", fontWeight: 700, fontSize: 14, padding: "13px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                {form.instagramUrl ? "Analyse My Profile →" : "Skip & Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* DETAILS: Name + Email */}
        {step === "details" && (
          <div style={cardStyle}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>Almost there!</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>Enter your details and we'll generate your personalised audit in seconds.</p>
            </div>
            {error && <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <input type="text" placeholder="Your first name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "13px 16px", color: "#fff", fontSize: 15, outline: "none" }} />
              <input type="email" placeholder="Your email address" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "13px 16px", color: "#fff", fontSize: 15, outline: "none" }} />
              <button onClick={submitAudit} disabled={!form.name || !form.email}
                style={{ background: (!form.name || !form.email) ? "rgba(255,255,255,0.08)" : GOLD, color: (!form.name || !form.email) ? "rgba(255,255,255,0.3)" : "#000", fontWeight: 800, fontSize: 15, padding: "14px", borderRadius: 10, border: "none", cursor: (!form.name || !form.email) ? "not-allowed" : "pointer" }}>
                Generate My Audit →
              </button>
            </div>
            <button onClick={() => { setStep(6); scrollTop(); }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 13, cursor: "pointer" }}>← Back</button>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 12 }}>No spam. Unsubscribe anytime.</p>
          </div>
        )}

        {/* PROCESSING */}
        {step === "processing" && (
          <div style={cardStyle}>
            <ProcessingScreen />
          </div>
        )}

        {/* REPORT */}
        {step === "report" && report && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            {/* Score card */}
            <div style={{ background: "#0c0c0c", border: `1px solid ${GOLD}30`, borderRadius: 20, padding: "36px", marginBottom: 16, textAlign: "center" }}>
              <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}35`, borderRadius: 100, padding: "4px 14px", marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Your AI Audit is Ready</span>
              </div>
              <h2 style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 900, color: "#fff", marginBottom: 24, lineHeight: 1.2 }}>{report.headline}</h2>
              <ScoreDial score={report.overallScore} label={report.scoreLabel} />
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 20, lineHeight: 1.7, maxWidth: 420, margin: "20px auto 0" }}>
                {report.topInsight}
              </p>
            </div>

            {/* Strengths */}
            <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 16 }}>✅ Your Strengths</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.strengths?.map((s: string, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#4ade80", fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Wins */}
            <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 16 }}>⚡ Quick Wins (Do This Week)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.quickWins?.map((w: string, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: GOLD, fontSize: 13, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>{i + 1}.</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{w}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue estimate */}
            <div style={{ background: `${GOLD}0a`, border: `1px solid ${GOLD}28`, borderRadius: 20, padding: "28px", marginBottom: 16, textAlign: "center" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Revenue Potential in 90 Days</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{report.revenueEstimate}</p>
            </div>

            {/* Locked content CTA */}
            <div style={{ background: "#0c0c0c", border: `1px solid ${GOLD}35`, borderRadius: 20, padding: "32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(6,6,6,0.6)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, borderRadius: 20 }}>
                <div style={{ textAlign: "center", padding: "0 24px" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 10 }}>Unlock Your Full Report</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 20, lineHeight: 1.6, maxWidth: 340, margin: "0 auto 20px" }}>
                    {report.upgradeTeaser}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <a href={WHOP} target="_blank" rel="noopener noreferrer">
                      <span style={{ display: "block", background: GOLD, color: "#000", fontWeight: 800, fontSize: 14, padding: "13px 24px", borderRadius: 10, cursor: "pointer" }}>
                        Upgrade to Unlock Full Report →
                      </span>
                    </a>
                    <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
                      <span style={{ display: "block", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 14, padding: "13px 24px", borderRadius: 10, cursor: "pointer" }}>
                        Book a Strategy Call Instead
                      </span>
                    </a>
                  </div>
                </div>
              </div>
              {/* Blurred preview of locked content */}
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 14 }}>🗺️ Your 90-Day Roadmap</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
                {[["Days 1–30", "Foundation & content system"], ["Days 31–60", "Audience growth strategy"], ["Days 61–90", "Monetisation launch"]].map(([phase, focus]) => (
                  <div key={phase} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 16px", textAlign: "left" }}>
                    <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{phase}:</span>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginLeft: 8 }}>{focus}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Share */}
            <div style={{ textAlign: "center", marginTop: 24, padding: "0 20px" }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Want to share your audit? Copy the link below.</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>Your full report is saved and will be included when you upgrade.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
