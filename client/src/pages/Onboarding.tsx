import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Redirect } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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

const STEPS = [
  { key: "fields",     title: "What field are you in?",                         sub: "Pick all that apply — helps us tailor your AI strategy.", multi: true },
  { key: "struggles",  title: "What do you struggle with most?",                 sub: "Select all that apply — we'll prioritise help for these.", multi: true },
  { key: "experience", title: "How long have you been creating content?",        sub: "Be honest — it helps us calibrate your tools.", multi: false },
  { key: "revenue",    title: "What's your current monthly income from content?", sub: "This stays private and helps personalise your growth plan.", multi: false },
  { key: "goal",       title: "What's your primary goal right now?",             sub: "Pick your main focus — you can always update this later.", multi: false },
  { key: "platforms",  title: "Which platforms are you active on?",              sub: "Select all you create content for.", multi: true },
];

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-all duration-150 text-left"
      style={{
        padding: "10px 16px",
        borderRadius: 10,
        border: `1.5px solid ${selected ? GOLD : "rgba(255,255,255,0.12)"}`,
        background: selected ? `${GOLD}18` : "rgba(255,255,255,0.03)",
        color: selected ? GOLD : "rgba(255,255,255,0.65)",
        fontSize: 14,
        fontWeight: selected ? 700 : 400,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: 4,
        border: `2px solid ${selected ? GOLD : "rgba(255,255,255,0.2)"}`,
        background: selected ? GOLD : "transparent",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <span style={{ color: "#000", fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </span>
      {label}
    </button>
  );
}

function Radio({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-all duration-150 w-full text-left"
      style={{
        padding: "13px 16px",
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
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        border: `2px solid ${selected ? GOLD : "rgba(255,255,255,0.2)"}`,
        background: selected ? GOLD : "transparent",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#000", display: "block" }} />}
      </span>
      {label}
    </button>
  );
}

export default function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [fields, setFields]         = useState<string[]>([]);
  const [struggles, setStruggles]   = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [monthlyRevenue, setRevenue] = useState("");
  const [primaryGoal, setGoal]      = useState("");
  const [platforms, setPlatforms]   = useState<string[]>([]);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (user && (user as any).surveyCompleted) return <Redirect to="/dashboard" />;
  if (!user) return <Redirect to="/login" />;

  const total = STEPS.length;

  const toggle = (arr: string[], setArr: (v: string[]) => void, item: string) =>
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);

  const canAdvance = () => {
    if (step === 0) return fields.length > 0;
    if (step === 1) return struggles.length > 0;
    if (step === 2) return !!experience;
    if (step === 3) return !!monthlyRevenue;
    if (step === 4) return !!primaryGoal;
    if (step === 5) return platforms.length > 0;
    return false;
  };

  const saveMut = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/onboarding-status"] });
      navigate("/dashboard");
    },
    onError: (e: any) => {
      toast({ title: "Something went wrong", description: e?.message || "Please try again.", variant: "destructive" });
    },
  });

  const handleNext = () => {
    if (!canAdvance()) return;
    if (step < total - 1) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      saveMut.mutate();
    }
  };

  const pct = ((step + 1) / total) * 100;
  const current = STEPS[step];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      color: "#fff",
    }}>
      {/* Top bar */}
      <div style={{
        width: "100%",
        padding: "20px 24px 0",
        maxWidth: 560,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>ORAVINI</span>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>{step + 1} of {total}</span>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 560, padding: "16px 24px 0" }}>
        <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: GOLD, borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Main content */}
      <div style={{
        width: "100%",
        maxWidth: 560,
        padding: "36px 24px 120px",
        flex: 1,
      }}>
        {/* Step label */}
        <div style={{ marginBottom: 8 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: `${GOLD}12`,
            border: `1px solid ${GOLD}30`,
            borderRadius: 100,
            padding: "4px 12px",
            marginBottom: 16,
          }}>
            <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Quick Setup · {total - step} question{total - step !== 1 ? "s" : ""} left
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2, margin: "0 0 6px", color: "#fff" }}>
            {current.title}
          </h1>
          {current.sub && (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>{current.sub}</p>
          )}
        </div>

        {/* Options */}
        <div style={{ marginTop: 24 }}>
          {step === 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {FIELDS.map(f => (
                <Chip key={f} label={f} selected={fields.includes(f)} onClick={() => toggle(fields, setFields, f)} />
              ))}
            </div>
          )}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STRUGGLES.map(s => (
                <Chip key={s} label={s} selected={struggles.includes(s)} onClick={() => toggle(struggles, setStruggles, s)} />
              ))}
            </div>
          )}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EXPERIENCE_OPTIONS.map(o => (
                <Radio key={o} label={o} selected={experience === o} onClick={() => setExperience(o)} />
              ))}
            </div>
          )}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {REVENUE_OPTIONS.map(o => (
                <Radio key={o} label={o} selected={monthlyRevenue === o} onClick={() => setRevenue(o)} />
              ))}
            </div>
          )}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GOAL_OPTIONS.map(o => (
                <Radio key={o} label={o} selected={primaryGoal === o} onClick={() => setGoal(o)} />
              ))}
            </div>
          )}
          {step === 5 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {PLATFORM_OPTIONS.map(p => (
                <Chip key={p} label={p} selected={platforms.includes(p)} onClick={() => toggle(platforms, setPlatforms, p)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(8,8,8,0.96)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        zIndex: 50,
      }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          {!canAdvance() && (
            <p style={{
              textAlign: "center",
              fontSize: 12,
              color: "rgba(255,255,255,0.3)",
              margin: "0 0 10px",
            }}>
              {current.multi ? "Select at least one option to continue" : "Choose an option to continue"}
            </p>
          )}
          <button
            type="button"
            data-testid={step < total - 1 ? "button-onboarding-next" : "button-onboarding-submit"}
            onClick={handleNext}
            disabled={!canAdvance() || saveMut.isPending}
            style={{
              width: "100%",
              padding: "15px 24px",
              borderRadius: 12,
              border: "none",
              background: canAdvance() && !saveMut.isPending ? GOLD : "rgba(212,180,97,0.25)",
              color: canAdvance() && !saveMut.isPending ? "#000" : "rgba(212,180,97,0.4)",
              fontSize: 15,
              fontWeight: 800,
              cursor: canAdvance() && !saveMut.isPending ? "pointer" : "not-allowed",
              letterSpacing: "0.03em",
              transition: "all 0.2s",
            }}
          >
            {saveMut.isPending
              ? "Saving your profile…"
              : step < total - 1
                ? "Continue →"
                : "Complete Setup →"}
          </button>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "10px",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.25)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
