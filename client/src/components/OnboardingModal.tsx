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
  "Pinterest",
  "Threads",
];

interface Props {
  onComplete: () => void;
}

function MultiChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="transition-all duration-150"
      style={{
        padding: "9px 14px",
        borderRadius: 8,
        border: `1.5px solid ${selected ? GOLD : "rgba(255,255,255,0.12)"}`,
        background: selected ? `${GOLD}1a` : "rgba(255,255,255,0.03)",
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

function CheckRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
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
        width: 16, height: 16, borderRadius: 3,
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

function RadioRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
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
  { key: "fields", title: "What field are you in?", sub: "Pick all that apply — helps us tailor your AI strategy." },
  { key: "struggles", title: "What do you struggle with most?", sub: "Select all that apply — we'll prioritise help for these." },
  { key: "experience", title: "How long have you been creating content?" },
  { key: "revenue", title: "What's your current monthly income from content?" },
  { key: "goal", title: "What's your primary goal right now?", sub: "Pick your main focus." },
  { key: "platforms", title: "Which platforms are you active on?", sub: "Select all you create content for." },
];

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<string[]>([]);
  const [struggles, setStruggles] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const { toast } = useToast();
  const qc = useQueryClient();

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/onboarding-survey", {
      field: fields.join(", "),
      fields,
      struggles,
      experience,
      monthlyRevenue,
      primaryGoal,
      platform: platforms.join(", "),
      platforms,
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
    if (step === 0) return fields.length > 0;
    if (step === 1) return struggles.length > 0;
    if (step === 2) return !!experience;
    if (step === 3) return !!monthlyRevenue;
    if (step === 4) return !!primaryGoal;
    if (step === 5) return platforms.length > 0;
    return false;
  };

  const handleNext = () => {
    if (step < 5) setStep(s => s + 1);
    else saveMutation.mutate();
  };

  const total = STEPS.length;
  const pct = ((step + 1) / total) * 100;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;}`}</style>
      <div style={{
        background: "#0c0c0c",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        width: "100%",
        maxWidth: 520,
        maxHeight: "88vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: "#fff",
        overflow: "hidden",
      }}>
        {/* Sticky header */}
        <div style={{ padding: "28px 32px 0", flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ display: "inline-block", background: `${GOLD}14`, border: `1px solid ${GOLD}35`, borderRadius: 100, padding: "4px 14px", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Quick Setup · {total - step} question{total - step !== 1 ? "s" : ""} left
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 4 }}>
              {STEPS[step].title}
            </h2>
            {STEPS[step].sub && (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{STEPS[step].sub}</p>
            )}
          </div>
          {/* Progress bar */}
          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}, #f0d080)`, borderRadius: 2, width: `${pct}%`, transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 32px 8px" }}>
          {/* Step 0: Fields — multi-select chips */}
          {step === 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FIELDS.map(f => (
                <MultiChip key={f} label={f} selected={fields.includes(f)} onClick={() => toggleItem(fields, setFields, f)} />
              ))}
            </div>
          )}

          {/* Step 1: Struggles — multi-select checkboxes */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STRUGGLES.map(s => (
                <CheckRow key={s} label={s} selected={struggles.includes(s)} onClick={() => toggleItem(struggles, setStruggles, s)} />
              ))}
            </div>
          )}

          {/* Step 2: Experience — single radio */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EXPERIENCE_OPTIONS.map(o => (
                <RadioRow key={o} label={o} selected={experience === o} onClick={() => setExperience(o)} />
              ))}
            </div>
          )}

          {/* Step 3: Revenue — single radio */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {REVENUE_OPTIONS.map(o => (
                <RadioRow key={o} label={o} selected={monthlyRevenue === o} onClick={() => setMonthlyRevenue(o)} />
              ))}
            </div>
          )}

          {/* Step 4: Goal — single radio */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GOAL_OPTIONS.map(o => (
                <RadioRow key={o} label={o} selected={primaryGoal === o} onClick={() => setPrimaryGoal(o)} />
              ))}
            </div>
          )}

          {/* Step 5: Platforms — multi-select chips */}
          {step === 5 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PLATFORM_OPTIONS.map(p => (
                <MultiChip key={p} label={p} selected={platforms.includes(p)} onClick={() => toggleItem(platforms, setPlatforms, p)} />
              ))}
            </div>
          )}
        </div>

        {/* Sticky footer — always visible */}
        <div style={{ padding: "16px 32px 24px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
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
          <button
            onClick={() => {
              saveMutation.mutate();
            }}
            style={{ display: "block", width: "100%", marginTop: 12, background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 12, cursor: "pointer", textAlign: "center" }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
