import { useState, useRef, useEffect } from "react";
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
  "Sports & Athletics",
  "Music & Entertainment",
  "Real Estate & Property",
  "Health & Wellness / Mental Health",
  "Parenting & Family",
  "Spirituality & Mindfulness",
  "Photography & Videography",
  "Fashion & Style",
  "Automotive",
  "Politics & Current Affairs",
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
  "Standing out in a crowded niche",
  "Converting followers to customers",
  "Dealing with algorithm changes",
  "Other",
];

const CONTENT_TYPES = [
  "Short-form video (Reels, TikToks, Shorts)",
  "Long-form video (YouTube, Podcasts)",
  "Photo & carousel posts",
  "Written content (blogs, newsletters, threads)",
  "Live streams",
  "Stories & ephemeral content",
  "Infographics & educational slides",
  "Podcasts (audio only)",
];

const EXPERIENCE_OPTIONS = [
  "Just starting out (less than 1 month)",
  "Less than 6 months",
  "6 months – 1 year",
  "1–2 years",
  "2–5 years",
  "5+ years",
];

const FOLLOWER_OPTIONS = [
  "0 – 500",
  "500 – 2,000",
  "2,000 – 10,000",
  "10,000 – 50,000",
  "50,000 – 200,000",
  "200,000 – 1 million",
  "1 million+",
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
  "Build a loyal community",
  "Become a full-time content creator",
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
  "Facebook",
  "Snapchat",
  "Twitch",
];

const STEPS = [
  {
    key: "fields",
    title: "What field are you in?",
    sub: "Pick all that apply — helps us tailor your AI strategy.",
    multi: true,
    hasOther: true,
    otherPrompt: "Tell us your specific niche or field:",
    otherPlaceholder: "e.g. Sustainable fashion, Crypto trading, Dog training…",
  },
  {
    key: "struggles",
    title: "What do you struggle with most?",
    sub: "Select all that apply — we'll prioritise help for these.",
    multi: true,
    hasOther: true,
    otherPrompt: "What else are you struggling with?",
    otherPlaceholder: "Describe your biggest challenge…",
  },
  {
    key: "contentTypes",
    title: "What type of content do you primarily create?",
    sub: "Select everything you make — we'll optimise your toolkit for it.",
    multi: true,
    hasOther: false,
  },
  {
    key: "experience",
    title: "How long have you been creating content?",
    sub: "Be honest — it helps us calibrate your tools.",
    multi: false,
    hasOther: false,
  },
  {
    key: "followerCount",
    title: "How many followers do you have across all platforms?",
    sub: "Combined total. This helps us set realistic benchmarks for you.",
    multi: false,
    hasOther: false,
  },
  {
    key: "revenue",
    title: "What's your current monthly income from content?",
    sub: "This stays private and helps personalise your growth plan.",
    multi: false,
    hasOther: false,
  },
  {
    key: "goal",
    title: "What's your primary goal right now?",
    sub: "Pick your main focus — you can always update this later.",
    multi: false,
    hasOther: false,
  },
  {
    key: "platforms",
    title: "Which platforms are you active on?",
    sub: "Select all you create content for.",
    multi: true,
    hasOther: false,
  },
];

function Chip({
  label, selected, onClick, isOther = false,
}: {
  label: string; selected: boolean; onClick: () => void; isOther?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-all duration-150 text-left"
      style={{
        padding: "10px 16px",
        borderRadius: 10,
        border: `1.5px solid ${selected ? (isOther ? "#f59e0b" : GOLD) : "rgba(255,255,255,0.12)"}`,
        background: selected ? (isOther ? "rgba(245,158,11,0.12)" : `${GOLD}18`) : "rgba(255,255,255,0.03)",
        color: selected ? (isOther ? "#f59e0b" : GOLD) : "rgba(255,255,255,0.65)",
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
        border: `2px solid ${selected ? (isOther ? "#f59e0b" : GOLD) : "rgba(255,255,255,0.2)"}`,
        background: selected ? (isOther ? "#f59e0b" : GOLD) : "transparent",
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

function OtherTextBox({
  prompt, placeholder, value, onChange,
}: {
  prompt: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div style={{
      marginTop: 16,
      padding: "16px 18px",
      borderRadius: 12,
      border: `1.5px solid ${value.trim() ? GOLD : "rgba(245,158,11,0.4)"}`,
      background: "rgba(245,158,11,0.05)",
      transition: "border-color 0.2s",
    }}>
      <p style={{
        fontSize: 12, fontWeight: 700, color: "#f59e0b",
        letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px",
      }}>
        ✱ Required — {prompt}
      </p>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        data-testid="input-other-specify"
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#fff",
          fontSize: 14,
          lineHeight: 1.6,
          resize: "none",
          fontFamily: "inherit",
        }}
      />
      {!value.trim() && (
        <p style={{ fontSize: 11, color: "rgba(245,158,11,0.5)", margin: "6px 0 0" }}>
          You must fill this in to continue
        </p>
      )}
    </div>
  );
}

export default function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // Step 0 — fields
  const [fields, setFields]           = useState<string[]>([]);
  const [otherField, setOtherField]   = useState("");

  // Step 1 — struggles
  const [struggles, setStruggles]         = useState<string[]>([]);
  const [otherStruggle, setOtherStruggle] = useState("");

  // Step 2 — content types
  const [contentTypes, setContentTypes] = useState<string[]>([]);

  // Step 3 — experience
  const [experience, setExperience] = useState("");

  // Step 4 — follower count
  const [followerCount, setFollowerCount] = useState("");

  // Step 5 — revenue
  const [monthlyRevenue, setRevenue] = useState("");

  // Step 6 — goal
  const [primaryGoal, setGoal] = useState("");

  // Step 7 — platforms
  const [platforms, setPlatforms] = useState<string[]>([]);

  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (user && (user as any).surveyCompleted) return <Redirect to="/dashboard" />;
  if (!user) return <Redirect to="/login" />;

  const total = STEPS.length;

  const toggle = (arr: string[], setArr: (v: string[]) => void, item: string) =>
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);

  const canAdvance = (): boolean => {
    if (step === 0) {
      if (fields.length === 0) return false;
      if (fields.includes("Other") && !otherField.trim()) return false;
      return true;
    }
    if (step === 1) {
      if (struggles.length === 0) return false;
      if (struggles.includes("Other") && !otherStruggle.trim()) return false;
      return true;
    }
    if (step === 2) return contentTypes.length > 0;
    if (step === 3) return !!experience;
    if (step === 4) return !!followerCount;
    if (step === 5) return !!monthlyRevenue;
    if (step === 6) return !!primaryGoal;
    if (step === 7) return platforms.length > 0;
    return false;
  };

  const blockReason = (): string | null => {
    if (step === 0) {
      if (fields.length === 0) return "Select at least one field to continue";
      if (fields.includes("Other") && !otherField.trim()) return "Please specify your field in the box above";
    }
    if (step === 1) {
      if (struggles.length === 0) return "Select at least one struggle to continue";
      if (struggles.includes("Other") && !otherStruggle.trim()) return "Please describe your other struggle in the box above";
    }
    const current = STEPS[step];
    if (current.multi) return "Select at least one option to continue";
    return "Choose an option to continue";
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const allFields = fields.includes("Other") && otherField.trim()
        ? [...fields.filter(f => f !== "Other"), `Other: ${otherField.trim()}`]
        : fields;
      const allStruggles = struggles.includes("Other") && otherStruggle.trim()
        ? [...struggles.filter(s => s !== "Other"), `Other: ${otherStruggle.trim()}`]
        : struggles;
      return apiRequest("POST", "/api/user/onboarding-survey", {
        field: allFields.join(", "),
        fields: allFields,
        struggles: allStruggles,
        contentTypes,
        experience,
        followerCount,
        monthlyRevenue,
        primaryGoal,
        platform: platforms.join(", "),
        platforms,
      });
    },
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
  const blocked = blockReason();

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
        width: "100%", padding: "20px 24px 0", maxWidth: 580,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>ORAVINI</span>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>{step + 1} of {total}</span>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 580, padding: "14px 24px 0" }}>
        <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: GOLD, borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Main content */}
      <div style={{ width: "100%", maxWidth: 580, padding: "32px 24px 140px", flex: 1 }}>
        {/* Step header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: `${GOLD}12`, border: `1px solid ${GOLD}30`,
            borderRadius: 100, padding: "4px 12px", marginBottom: 14,
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

        {/* ── Step 0: Fields ── */}
        {step === 0 && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {FIELDS.map(f => (
                <Chip
                  key={f}
                  label={f}
                  selected={fields.includes(f)}
                  onClick={() => toggle(fields, setFields, f)}
                  isOther={f === "Other"}
                />
              ))}
            </div>
            {fields.includes("Other") && (
              <OtherTextBox
                prompt={current.otherPrompt!}
                placeholder={current.otherPlaceholder!}
                value={otherField}
                onChange={setOtherField}
              />
            )}
          </div>
        )}

        {/* ── Step 1: Struggles ── */}
        {step === 1 && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STRUGGLES.map(s => (
                <Chip
                  key={s}
                  label={s}
                  selected={struggles.includes(s)}
                  onClick={() => toggle(struggles, setStruggles, s)}
                  isOther={s === "Other"}
                />
              ))}
            </div>
            {struggles.includes("Other") && (
              <OtherTextBox
                prompt={current.otherPrompt!}
                placeholder={current.otherPlaceholder!}
                value={otherStruggle}
                onChange={setOtherStruggle}
              />
            )}
          </div>
        )}

        {/* ── Step 2: Content types ── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CONTENT_TYPES.map(c => (
              <Chip key={c} label={c} selected={contentTypes.includes(c)} onClick={() => toggle(contentTypes, setContentTypes, c)} />
            ))}
          </div>
        )}

        {/* ── Step 3: Experience ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {EXPERIENCE_OPTIONS.map(o => (
              <Radio key={o} label={o} selected={experience === o} onClick={() => setExperience(o)} />
            ))}
          </div>
        )}

        {/* ── Step 4: Follower count ── */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FOLLOWER_OPTIONS.map(o => (
              <Radio key={o} label={o} selected={followerCount === o} onClick={() => setFollowerCount(o)} />
            ))}
          </div>
        )}

        {/* ── Step 5: Revenue ── */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {REVENUE_OPTIONS.map(o => (
              <Radio key={o} label={o} selected={monthlyRevenue === o} onClick={() => setRevenue(o)} />
            ))}
          </div>
        )}

        {/* ── Step 6: Goal ── */}
        {step === 6 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {GOAL_OPTIONS.map(o => (
              <Radio key={o} label={o} selected={primaryGoal === o} onClick={() => setGoal(o)} />
            ))}
          </div>
        )}

        {/* ── Step 7: Platforms ── */}
        {step === 7 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {PLATFORM_OPTIONS.map(p => (
              <Chip key={p} label={p} selected={platforms.includes(p)} onClick={() => toggle(platforms, setPlatforms, p)} />
            ))}
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(8,8,8,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        padding: "14px 24px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        zIndex: 50,
      }}>
        <div style={{ width: "100%", maxWidth: 580 }}>
          {!canAdvance() && blocked && (
            <p style={{
              textAlign: "center", fontSize: 12,
              color: (step === 0 && fields.includes("Other") && !otherField.trim()) ||
                     (step === 1 && struggles.includes("Other") && !otherStruggle.trim())
                ? "rgba(245,158,11,0.7)"
                : "rgba(255,255,255,0.28)",
              margin: "0 0 8px",
            }}>
              {blocked}
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
              background: canAdvance() && !saveMut.isPending ? GOLD : "rgba(212,180,97,0.2)",
              color: canAdvance() && !saveMut.isPending ? "#000" : "rgba(212,180,97,0.35)",
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
              onClick={() => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{
                width: "100%", marginTop: 6, padding: "10px",
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.22)", fontSize: 13, cursor: "pointer",
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
