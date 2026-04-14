import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";

const FIELDS = [
  "Fitness & Health",
  "Finance & Investing",
  "Business & Entrepreneurship",
  "Beauty & Fashion",
  "Lifestyle",
  "Tech & Software",
  "Education & Coaching",
  "Food & Travel",
  "Gaming & Entertainment",
  "Art & Creativity",
  "Other",
];

const STRUGGLES = [
  "Growing my followers",
  "Low engagement on posts",
  "Coming up with content ideas",
  "Monetising my audience",
  "Staying consistent",
  "Understanding analytics",
  "Building brand partnerships",
  "Managing time efficiently",
];

const EXPERIENCE_OPTIONS = [
  "Just starting out",
  "Less than 6 months",
  "6 months – 1 year",
  "1–2 years",
  "2+ years",
];

const REVENUE_OPTIONS = [
  "$0 (not monetised yet)",
  "Under $500/mo",
  "$500 – $2,000/mo",
  "$2,000 – $10,000/mo",
  "$10,000+/mo",
];

const GOAL_OPTIONS = [
  "Grow my audience fast",
  "Land brand deals & sponsorships",
  "Sell digital products or courses",
  "Replace my 9–5 income",
  "Build a community",
  "All of the above",
];

const PLATFORM_OPTIONS = [
  "Instagram",
  "YouTube",
  "TikTok",
  "LinkedIn",
  "Twitter / X",
  "Multiple platforms",
];

interface Props {
  onComplete: () => void;
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="transition-all duration-150"
      style={{
        padding: "9px 14px",
        borderRadius: 8,
        border: `1.5px solid ${selected ? GOLD : "rgba(255,255,255,0.12)"}`,
        background: selected ? `${GOLD}18` : "rgba(255,255,255,0.03)",
        color: selected ? GOLD : "rgba(255,255,255,0.65)",
        fontSize: 13,
        fontWeight: selected ? 700 : 400,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {selected ? "✓ " : ""}{label}
    </button>
  );
}

function Row({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px 16px",
        borderRadius: 10,
        border: `1.5px solid ${selected ? GOLD : "rgba(255,255,255,0.1)"}`,
        background: selected ? `${GOLD}15` : "rgba(255,255,255,0.03)",
        color: selected ? GOLD : "rgba(255,255,255,0.75)",
        fontSize: 14,
        fontWeight: selected ? 700 : 400,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        transition: "all 0.15s",
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: "50%",
        border: `2px solid ${selected ? GOLD : "rgba(255,255,255,0.2)"}`,
        background: selected ? GOLD : "transparent",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#000", display: "block" }} />}
      </span>
      {label}
    </button>
  );
}

const STEPS = [
  { key: "field", title: "What field are you in?", sub: "This helps us tailor your AI content ideas and strategy." },
  { key: "struggles", title: "What do you struggle with most?", sub: "Pick all that apply — we'll prioritise help for these areas." },
  { key: "experience", title: "How long have you been creating content?" },
  { key: "revenue", title: "What's your current monthly income from content?" },
  { key: "goal", title: "What's your primary goal right now?" },
  { key: "platform", title: "What's your main platform?" },
];

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [field, setField] = useState("");
  const [struggles, setStruggles] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [platform, setPlatform] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const toggleStruggle = (s: string) =>
    setStruggles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/onboarding-survey", {
      field, struggles, experience, monthlyRevenue, primaryGoal, platform,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user/onboarding-status"] });
      onComplete();
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  const canAdvance = () => {
    if (step === 0) return !!field;
    if (step === 1) return struggles.length > 0;
    if (step === 2) return !!experience;
    if (step === 3) return !!monthlyRevenue;
    if (step === 4) return !!primaryGoal;
    if (step === 5) return !!platform;
    return false;
  };

  const handleNext = () => {
    if (step < 5) setStep(s => s + 1);
    else saveMutation.mutate();
  };

  const total = STEPS.length;
  const pct = ((step + 1) / total) * 100;

  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px",
  };

  const cardStyle: React.CSSProperties = {
    background: "#0c0c0c",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 520,
    maxHeight: "85vh",
    overflowY: "auto",
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: "#fff",
    position: "relative",
  };

  return (
    <div style={overlayStyle}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;}`}</style>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}35`, borderRadius: 100, padding: "4px 14px", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>Quick Setup · {total - step} question{total - step !== 1 ? "s" : ""} left</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 6 }}>
            {STEPS[step].title}
          </h2>
          {STEPS[step].sub && (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{STEPS[step].sub}</p>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}, #f0d080)`, borderRadius: 2, width: `${pct}%`, transition: "width 0.4s ease" }} />
        </div>

        {/* Step 0: Field */}
        {step === 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {FIELDS.map(f => (
              <Chip key={f} label={f} selected={field === f} onClick={() => setField(f)} />
            ))}
          </div>
        )}

        {/* Step 1: Struggles (multi-select) */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {STRUGGLES.map(s => (
              <button
                key={s}
                onClick={() => toggleStruggle(s)}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 10,
                  border: `1.5px solid ${struggles.includes(s) ? GOLD : "rgba(255,255,255,0.1)"}`,
                  background: struggles.includes(s) ? `${GOLD}15` : "rgba(255,255,255,0.03)",
                  color: struggles.includes(s) ? GOLD : "rgba(255,255,255,0.75)",
                  fontSize: 14, fontWeight: struggles.includes(s) ? 700 : 400,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
                }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 3,
                  border: `2px solid ${struggles.includes(s) ? GOLD : "rgba(255,255,255,0.2)"}`,
                  background: struggles.includes(s) ? GOLD : "transparent",
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {struggles.includes(s) && <span style={{ color: "#000", fontSize: 10, fontWeight: 900 }}>✓</span>}
                </span>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {EXPERIENCE_OPTIONS.map(o => (
              <Row key={o} label={o} selected={experience === o} onClick={() => setExperience(o)} />
            ))}
          </div>
        )}

        {/* Step 3: Revenue */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {REVENUE_OPTIONS.map(o => (
              <Row key={o} label={o} selected={monthlyRevenue === o} onClick={() => setMonthlyRevenue(o)} />
            ))}
          </div>
        )}

        {/* Step 4: Primary Goal */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {GOAL_OPTIONS.map(o => (
              <Row key={o} label={o} selected={primaryGoal === o} onClick={() => setPrimaryGoal(o)} />
            ))}
          </div>
        )}

        {/* Step 5: Platform */}
        {step === 5 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {PLATFORM_OPTIONS.map(p => (
              <Chip key={p} label={p} selected={platform === p} onClick={() => setPlatform(p)} />
            ))}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer" }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance() || saveMutation.isPending}
            style={{
              flex: 2, padding: "13px", borderRadius: 10, border: "none",
              background: canAdvance() && !saveMutation.isPending ? GOLD : "rgba(255,255,255,0.08)",
              color: canAdvance() && !saveMutation.isPending ? "#000" : "rgba(255,255,255,0.3)",
              fontWeight: 800, fontSize: 14, cursor: canAdvance() ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            {saveMutation.isPending ? "Saving…" : step === 5 ? "Complete Setup →" : "Next →"}
          </button>
        </div>

        {/* Skip link */}
        <button
          onClick={onComplete}
          style={{ display: "block", width: "100%", marginTop: 14, background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 12, cursor: "pointer", textAlign: "center" }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
