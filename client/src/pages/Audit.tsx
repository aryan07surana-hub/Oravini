import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const GOLD = "#d4b461";
const CALENDLY = "https://calendly.com/brandversee/30min";

const CONTENT_TYPES = [
  "Reels & Short Videos",
  "Carousels & Infographics",
  "Long-form Videos",
  "Stories",
  "Live Streams",
  "Blog & Written Content",
  "Podcasts",
  "User-Generated / Collabs",
];

const STRUGGLES = [
  "Not growing fast enough",
  "Don't know what to post",
  "Low engagement on posts",
  "No monetisation strategy",
  "Content burnout & inconsistency",
  "Can't convert followers to buyers",
  "Algorithm keeps changing",
  "No time to create content",
];

const GOALS = [
  "Grow my audience fast",
  "Land brand deals & sponsorships",
  "Sell digital products or courses",
  "Coaching & consulting",
  "Build a personal brand",
  "Replace my 9–5 income",
  "All of the above",
];

interface AuditForm {
  niche: string;
  contentTypes: string[];
  targetAudience: string;
  struggles: string[];
  goals: string[];
  instagramUrl: string;
}

interface IgProfile {
  found: boolean;
  username: string;
  fullName?: string;
  followers?: number;
  following?: number;
  posts?: number;
  bio?: string;
  profilePic?: string;
  verified?: boolean;
  isPrivate?: boolean;
}

type Step = "intro" | 1 | 2 | 3 | 4 | 5 | "scanning" | "ig-found" | "processing" | "report";

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 28, overflow: "hidden" }}>
      <div style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}, #f0d080)`, borderRadius: 2, width: `${(current / total) * 100}%`, transition: "width 0.4s ease" }} />
    </div>
  );
}

function MultiChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 14px", borderRadius: 8,
      border: `1.5px solid ${selected ? GOLD : "rgba(255,255,255,0.1)"}`,
      background: selected ? `${GOLD}18` : "rgba(255,255,255,0.03)",
      color: selected ? GOLD : "rgba(255,255,255,0.65)",
      fontSize: 13, fontWeight: selected ? 700 : 400, cursor: "pointer", transition: "all 0.15s",
      whiteSpace: "nowrap",
    }}>
      {selected ? "✓ " : ""}{label}
    </button>
  );
}

function CheckRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", padding: "13px 16px", borderRadius: 10,
      border: `1.5px solid ${selected ? GOLD : "rgba(255,255,255,0.1)"}`,
      background: selected ? `${GOLD}15` : "rgba(255,255,255,0.03)",
      color: selected ? GOLD : "rgba(255,255,255,0.75)",
      fontSize: 14, fontWeight: selected ? 700 : 500, cursor: "pointer", transition: "all 0.18s",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{
        width: 17, height: 17, borderRadius: 4,
        border: `2px solid ${selected ? GOLD : "rgba(255,255,255,0.2)"}`,
        background: selected ? GOLD : "transparent",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <span style={{ color: "#000", fontSize: 10, fontWeight: 900 }}>✓</span>}
      </span>
      {label}
    </button>
  );
}

function ScanningScreen({ username }: { username: string }) {
  const [idx, setIdx] = useState(0);
  const steps = [
    "Connecting to Instagram…",
    `Found @${username}…`,
    "Reading profile data…",
    "Analysing followers & engagement…",
    "Checking posting patterns…",
    "Reviewing bio & content…",
    "Preparing your audit…",
  ];
  useEffect(() => {
    const t = setInterval(() => setIdx(i => Math.min(i + 1, steps.length - 1)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center", padding: "52px 0" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${GOLD}30`, borderTop: `3px solid ${GOLD}`, margin: "0 auto 28px", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 10 }}>📡 Scanning @{username}</h3>
      <p style={{ fontSize: 14, color: GOLD, fontWeight: 600, minHeight: 22 }}>{steps[idx]}</p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 12 }}>Pulling live data from Instagram…</p>
    </div>
  );
}

function ProcessingScreen() {
  const [idx, setIdx] = useState(0);
  const msgs = [
    "Analysing your Instagram profile…",
    "Benchmarking against top creators in your niche…",
    "Calculating your engagement rate…",
    "Mapping audience psychology…",
    "Running competitor gap analysis…",
    "Estimating your revenue potential…",
    "Building your personalised roadmap…",
    "Almost ready…",
  ];
  useEffect(() => {
    const t = setInterval(() => setIdx(i => Math.min(i + 1, msgs.length - 1)), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", border: `3px solid ${GOLD}30`, borderTop: `3px solid ${GOLD}`, margin: "0 auto 32px", animation: "spin 1.2s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Generating Your Audit</h3>
      <p style={{ fontSize: 14, color: GOLD, fontWeight: 600, minHeight: 22 }}>{msgs[idx]}</p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 14 }}>This usually takes 20–40 seconds</p>
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
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray 1.2s ease" }} />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="900">{score}</text>
        <text x="70" y="85" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">/100</text>
      </svg>
      <span style={{ fontSize: 14, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 100, padding: "3px 14px" }}>{label}</span>
    </div>
  );
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function MetricPill({ label, value, note, color }: { label: string; value: string; note?: string; color?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
      <p style={{ fontSize: 20, fontWeight: 800, color: color || "#fff", marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: note ? 4 : 0 }}>{label}</p>
      {note && <p style={{ fontSize: 10, color: color || "rgba(255,255,255,0.3)", fontWeight: 600 }}>{note}</p>}
    </div>
  );
}

export default function Audit() {
  const [step, setStep] = useState<Step>("intro");
  const [form, setForm] = useState<AuditForm>({
    niche: "", contentTypes: [], targetAudience: "", struggles: [], goals: [], instagramUrl: "",
  });
  const [igProfile, setIgProfile] = useState<IgProfile | null>(null);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });
  const setField = (k: keyof AuditForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleArr = (key: "contentTypes" | "struggles" | "goals", val: string) => {
    setForm(f => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const TOTAL_STEPS = 5;

  const scanInstagram = async () => {
    const raw = form.instagramUrl.trim();
    if (!raw) { setStep("ig-found"); setIgProfile({ found: false, username: "" }); return; }
    const username = raw.replace(/https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "").split("?")[0].replace(/^@/, "");
    setStep("scanning");
    scrollTop();
    try {
      const res = await fetch("/api/leads/scan-ig", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      setIgProfile(data);
    } catch {
      setIgProfile({ found: false, username });
    }
    setTimeout(() => { setStep("ig-found"); scrollTop(); }, 500);
  };

  const submitAudit = async () => {
    setError("");
    setStep("processing");
    scrollTop();
    try {
      const res = await fetch("/api/leads/audit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, igProfileData: igProfile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Audit failed");
      setReport(data.report);
      setStep("report");
      scrollTop();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setStep("ig-found");
    }
  };

  const card: React.CSSProperties = {
    background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 20, padding: "36px 32px", maxWidth: 560, width: "100%", margin: "0 auto",
  };
  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "13px 16px", color: "#fff", fontSize: 15, outline: "none",
  };
  const backBtn: React.CSSProperties = {
    flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer",
  };
  const nextBtn = (active: boolean): React.CSSProperties => ({
    flex: 2, background: active ? GOLD : "rgba(255,255,255,0.08)",
    color: active ? "#000" : "rgba(255,255,255,0.3)",
    fontWeight: 700, fontSize: 14, padding: "13px", borderRadius: 10,
    border: "none", cursor: active ? "pointer" : "not-allowed",
  });

  return (
    <div ref={topRef} style={{ background: "#060606", minHeight: "100vh", color: "#fff", fontFamily: "'Inter', -apple-system, sans-serif", padding: "0 16px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(6,6,6,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg, ${GOLD} 0%, #b8962e 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#000" }}>O</div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Oravini</span>
            </div>
          </Link>
          <Link href="/login"><span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Log in</span></Link>
        </div>
      </nav>

      <div style={{ paddingTop: 90, paddingBottom: 80, maxWidth: 620, margin: "0 auto" }}>

        {/* ── INTRO ─────────────────────────────────────────────────── */}
        {step === "intro" && (
          <div style={card}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
              <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}35`, borderRadius: 100, padding: "4px 14px", marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Free AI Audit · Takes 3 min</span>
              </div>
              <h1 style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 900, color: "#fff", lineHeight: 1.15, marginBottom: 14 }}>
                Get Your Free<br />
                <span style={{ color: GOLD }}>Instagram Growth Audit</span>
              </h1>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 28 }}>
                Answer 5 quick questions, add your Instagram, and our AI builds a personalised growth and monetisation report — backed by your real profile data.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", marginBottom: 28 }}>
                {[
                  "Deep analysis of your real Instagram profile",
                  "Personalised growth score (0–100) with benchmarks",
                  "3 specific growth opportunities for your niche",
                  "Your 90-day revenue roadmap",
                ].map(item => (
                  <div key={item} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: GOLD, fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>{item}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setStep(1); scrollTop(); }} style={{ width: "100%", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "15px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                Start My Free Audit →
              </button>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 14 }}>No credit card · No spam · Takes 3 minutes</p>
            </div>
          </div>
        )}

        {/* ── STEP 1: Niche + Content Type (multi-select) ──────────── */}
        {step === 1 && (
          <div style={card}>
            <ProgressBar current={1} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Step 1 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>Tell us about your content</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 22 }}>We'll use this to personalise your audit and strategy.</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8 }}>What's your niche? <span style={{ color: GOLD }}>*</span></label>
              <input
                type="text"
                value={form.niche}
                onChange={e => setField("niche", e.target.value)}
                placeholder="e.g. fitness, personal finance, beauty, business…"
                style={input}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 6 }}>
                What type of content do you create? <span style={{ color: GOLD }}>*</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.35)", marginLeft: 6 }}>Select all that apply</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CONTENT_TYPES.map(ct => (
                  <MultiChip key={ct} label={ct} selected={form.contentTypes.includes(ct)} onClick={() => toggleArr("contentTypes", ct)} />
                ))}
              </div>
            </div>

            <button
              onClick={() => { if (form.niche && form.contentTypes.length > 0) { setStep(2); scrollTop(); } }}
              disabled={!form.niche || form.contentTypes.length === 0}
              style={{ width: "100%", ...nextBtn(!!(form.niche && form.contentTypes.length > 0)) }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2: Target Audience ───────────────────────────────── */}
        {step === 2 && (
          <div style={card}>
            <ProgressBar current={2} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Step 2 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>Who is your target audience?</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 22 }}>e.g. "women aged 25–35 who want to start investing"</p>
            <input
              type="text"
              value={form.targetAudience}
              onChange={e => setField("targetAudience", e.target.value)}
              placeholder="Describe your ideal follower…"
              style={{ ...input, marginBottom: 20 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStep(1); scrollTop(); }} style={backBtn}>← Back</button>
              <button onClick={() => { if (form.targetAudience) { setStep(3); scrollTop(); } }} disabled={!form.targetAudience}
                style={nextBtn(!!form.targetAudience)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Struggles (multi-select + Next button) ────────── */}
        {step === 3 && (
          <div style={card}>
            <ProgressBar current={3} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Step 3 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>What's your biggest struggle right now?</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Select all that apply — we'll address each one.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
              {STRUGGLES.map(s => (
                <CheckRow key={s} label={s} selected={form.struggles.includes(s)} onClick={() => toggleArr("struggles", s)} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStep(2); scrollTop(); }} style={backBtn}>← Back</button>
              <button
                onClick={() => { if (form.struggles.length > 0) { setStep(4); scrollTop(); } }}
                disabled={form.struggles.length === 0}
                style={nextBtn(form.struggles.length > 0)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Goals (multi-select + Next button) ────────────── */}
        {step === 4 && (
          <div style={card}>
            <ProgressBar current={4} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Step 4 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>What are your goals?</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Select all that matter to you.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
              {GOALS.map(g => (
                <CheckRow key={g} label={g} selected={form.goals.includes(g)} onClick={() => toggleArr("goals", g)} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStep(3); scrollTop(); }} style={backBtn}>← Back</button>
              <button
                onClick={() => { if (form.goals.length > 0) { setStep(5); scrollTop(); } }}
                disabled={form.goals.length === 0}
                style={nextBtn(form.goals.length > 0)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Instagram URL ─────────────────────────────────── */}
        {step === 5 && (
          <div style={card}>
            <ProgressBar current={5} total={TOTAL_STEPS} />
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Step 5 of {TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>Add your Instagram profile</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 22, lineHeight: 1.6 }}>
              We'll pull your real profile data — follower count, bio, posts — to make your audit specific to <em>your</em> account.
              <br /><span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Only public profiles can be fully analysed. You can skip this.</span>
            </p>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", fontSize: 13, pointerEvents: "none" }}>instagram.com/</span>
              <input
                type="text"
                value={form.instagramUrl}
                onChange={e => setField("instagramUrl", e.target.value)}
                placeholder="yourusername"
                onKeyDown={e => e.key === "Enter" && scanInstagram()}
                style={{ ...input, paddingLeft: 128 }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStep(4); scrollTop(); }} style={backBtn}>← Back</button>
              <button onClick={scanInstagram} style={{ ...nextBtn(true), flex: 2 }}>
                {form.instagramUrl.trim() ? "📡 Scan My Profile →" : "Skip & Build My Audit →"}
              </button>
            </div>
          </div>
        )}

        {/* ── SCANNING ──────────────────────────────────────────────── */}
        {step === "scanning" && (
          <div style={card}>
            <ScanningScreen username={form.instagramUrl.replace(/https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "").split("?")[0].replace(/^@/, "") || "profile"} />
          </div>
        )}

        {/* ── IG FOUND ──────────────────────────────────────────────── */}
        {step === "ig-found" && (
          <div style={card}>
            {error && <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}
            {igProfile?.found ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Profile Found!</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>We've pulled your real Instagram data — your audit will be specific to your account.</p>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "18px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    {igProfile.profilePic
                      ? <img src={igProfile.profilePic} alt={igProfile.username} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `2px solid ${GOLD}50` }} />
                      : <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${GOLD}18`, border: `2px solid ${GOLD}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📷</div>
                    }
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>@{igProfile.username}</span>
                        {igProfile.verified && <span style={{ fontSize: 12, color: "#60a5fa" }}>✓</span>}
                      </div>
                      {igProfile.fullName && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{igProfile.fullName}</p>}
                      {igProfile.isPrivate && <p style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>⚠️ Private account</p>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginBottom: igProfile.bio ? 14 : 0 }}>
                    {[
                      { label: "Followers", value: igProfile.followers ? fmtNum(igProfile.followers) : "–" },
                      { label: "Following", value: igProfile.following ? fmtNum(igProfile.following) : "–" },
                      { label: "Posts", value: igProfile.posts ? fmtNum(igProfile.posts) : "–" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 6px" }}>
                        <p style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{value}</p>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  {igProfile.bio && (
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12 }}>
                      {igProfile.bio.slice(0, 160)}{igProfile.bio.length > 160 ? "…" : ""}
                    </p>
                  )}
                </div>
                <button onClick={submitAudit} style={{ width: "100%", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "14px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                  Generate My Full Audit →
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                    {form.instagramUrl.trim() ? "Couldn't reach your profile" : "No profile added"}
                  </h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                    {form.instagramUrl.trim()
                      ? "This can happen with private accounts. We'll build your audit from your answers instead — still very detailed."
                      : "No problem — we'll build a detailed audit from your answers."}
                  </p>
                </div>
                <button onClick={submitAudit} style={{ width: "100%", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "14px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 12 }}>
                  Build My Audit Anyway →
                </button>
                <button onClick={() => { setStep(5); scrollTop(); }} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 13, cursor: "pointer" }}>← Try a different username</button>
              </>
            )}
          </div>
        )}

        {/* ── PROCESSING ────────────────────────────────────────────── */}
        {step === "processing" && (
          <div style={card}>
            <ProcessingScreen />
          </div>
        )}

        {/* ── REPORT ────────────────────────────────────────────────── */}
        {step === "report" && report && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>

            {/* Score card */}
            <div style={{ background: "#0c0c0c", border: `1px solid ${GOLD}30`, borderRadius: 20, padding: "36px", marginBottom: 14, textAlign: "center" }}>
              <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}35`, borderRadius: 100, padding: "4px 14px", marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Your AI Audit is Ready</span>
              </div>
              <h2 style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 900, color: "#fff", marginBottom: 24, lineHeight: 1.2 }}>{report.headline}</h2>
              <ScoreDial score={report.overallScore} label={report.scoreLabel} />
              {/* Real IG stats */}
              {igProfile?.found && (
                <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <MetricPill label="Followers" value={igProfile.followers ? fmtNum(igProfile.followers) : "–"} />
                  <MetricPill label="Following" value={igProfile.following ? fmtNum(igProfile.following) : "–"} />
                  <MetricPill label="Posts" value={igProfile.posts ? fmtNum(igProfile.posts) : "–"} />
                  {igProfile.followers && igProfile.following && (
                    <MetricPill
                      label="F/F Ratio"
                      value={(igProfile.followers / Math.max(igProfile.following, 1)).toFixed(1) + "x"}
                      note={igProfile.followers > igProfile.following ? "Great" : "Needs work"}
                      color={igProfile.followers > igProfile.following ? "#4ade80" : GOLD}
                    />
                  )}
                </div>
              )}
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 20, lineHeight: 1.7, maxWidth: 420, margin: "20px auto 0" }}>
                {report.topInsight}
              </p>
            </div>

            {/* Profile Analysis (if IG data) */}
            {report.profileAnalysis && (
              <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px", marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 14 }}>📊 Profile Analysis</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Array.isArray(report.profileAnalysis)
                    ? report.profileAnalysis.map((item: string, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ color: GOLD, fontSize: 13, flexShrink: 0, marginTop: 1 }}>→</span>
                        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))
                    : <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{report.profileAnalysis}</p>
                  }
                </div>
              </div>
            )}

            {/* Strengths */}
            <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 14 }}>✅ What You're Doing Right</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.strengths?.map((s: string, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#4ade80", fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Growth Opportunities */}
            <div style={{ background: "#0c0c0c", border: `1px solid ${GOLD}25`, borderRadius: 20, padding: "28px", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 6 }}>🚀 Your Top Growth Opportunities</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>Specific to your profile — act on these first.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {report.growthOpportunities?.map((w: string, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: `${GOLD}08`, border: `1px solid ${GOLD}20`, borderRadius: 12 }}>
                    <span style={{ color: GOLD, fontSize: 14, flexShrink: 0, fontWeight: 800, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>{w}</span>
                  </div>
                )) ?? report.quickWins?.map((w: string, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: `${GOLD}08`, border: `1px solid ${GOLD}20`, borderRadius: 12 }}>
                    <span style={{ color: GOLD, fontSize: 14, flexShrink: 0, fontWeight: 800, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>{w}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Potential */}
            <div style={{ background: `${GOLD}0a`, border: `1px solid ${GOLD}28`, borderRadius: 20, padding: "28px", marginBottom: 14, textAlign: "center" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Revenue Potential in 90 Days</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{report.revenueEstimate}</p>
              {report.revenueContext && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 8, lineHeight: 1.5 }}>{report.revenueContext}</p>}
            </div>

            {/* Locked: Full roadmap + deep audit */}
            <div style={{ background: "#0c0c0c", border: `1px solid ${GOLD}35`, borderRadius: 20, padding: "32px", textAlign: "center", position: "relative", overflow: "hidden", marginBottom: 14 }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(6,6,6,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, borderRadius: 20 }}>
                <div style={{ textAlign: "center", padding: "0 28px", width: "100%" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
                  <h3 style={{ fontSize: 19, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Unlock Your Full Report</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 20, lineHeight: 1.6, maxWidth: 320, margin: "0 auto 20px" }}>
                    {report.upgradeTeaser}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 340, margin: "0 auto" }}>
                    <a href="/login">
                      <span style={{ display: "block", background: GOLD, color: "#000", fontWeight: 800, fontSize: 15, padding: "14px 24px", borderRadius: 10, cursor: "pointer" }}>
                        Continue to Dashboard →
                      </span>
                    </a>
                    <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
                      <span style={{ display: "block", background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontWeight: 500, fontSize: 13, padding: "8px", cursor: "pointer" }}>
                        Book a strategy call instead
                      </span>
                    </a>
                  </div>
                </div>
              </div>
              {/* Blurred preview */}
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 14 }}>🗺️ Your 90-Day Growth Roadmap</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
                {[["Days 1–30", "Foundation & content system"], ["Days 31–60", "Audience growth engine"], ["Days 61–90", "Monetisation launch"]].map(([phase, focus]) => (
                  <div key={phase} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 16px", textAlign: "left" }}>
                    <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{phase}: </span>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{focus}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "0 20px" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Log in to access your full report inside the dashboard.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
