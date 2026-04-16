import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Redirect } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const GOLD = "#d4b461";

// ── Step 0 — awareness ───────────────────────────────────────────────────────
const AWARENESS_OPTIONS = [
  "Complete beginner — I'm just starting to explore it",
  "I know the basics but haven't really started yet",
  "I've been creating content for a while but still learning",
  "I'm experienced — I know what works and what doesn't",
  "I do this professionally — I need execution support, not education",
];

// ── Step 1 — field ───────────────────────────────────────────────────────────
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
  "Comedy & Entertainment",
  "News & Journalism",
  "Law & Legal",
  "Science & Research",
  "Environmental & Sustainability",
  "Relationships & Dating",
  "DIY & Home Improvement",
  "Animals & Pets",
  "Travel & Adventure",
  "Other",
];

// ── Step 2 — struggles ───────────────────────────────────────────────────────
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
  "Building a personal brand identity",
  "Knowing what content to create",
  "Getting views / reach",
  "Building confidence on camera",
  "Editing and production quality",
  "Other",
];

// ── Step 3 — content types ───────────────────────────────────────────────────
const CONTENT_TYPES = [
  "Short-form video (Reels, TikToks, Shorts)",
  "Long-form video (YouTube, full episodes)",
  "Photo & carousel posts",
  "Written content (blogs, newsletters, threads)",
  "Live streams",
  "Stories & ephemeral content",
  "Infographics & educational slides",
  "Podcasts (audio only)",
  "Tweets / micro-content",
  "UGC (User Generated Content for brands)",
];

// ── Step 4 — who are you ─────────────────────────────────────────────────────
const DESCRIPTOR_OPTIONS = [
  "Student",
  "Working Professional (9–5)",
  "Freelancer / Contractor",
  "Part-time Creator (side hustle)",
  "Full-time Content Creator",
  "Entrepreneur / Business Owner",
  "Coach / Consultant / Mentor",
  "Artist / Musician / Performer",
  "Athlete / Sports Professional",
  "Influencer / KOL (Key Opinion Leader)",
  "Brand / Agency Owner",
  "Marketer / Content Strategist",
  "Journalist / Writer",
  "Teacher / Educator",
  "Healthcare Professional",
  "Stay-at-home Parent & Creator",
  "Retired & Pursuing a Passion",
  "Aspiring Creator — haven't started yet",
  "Career changer — pivoting into content",
  "Corporate professional going independent",
  "E-commerce / Product seller",
  "Nonprofit / Social impact creator",
  "Other",
];

// ── Step 5 — experience ──────────────────────────────────────────────────────
const EXPERIENCE_OPTIONS = [
  "Just starting out (less than 1 month)",
  "Less than 6 months",
  "6 months – 1 year",
  "1–2 years",
  "2–5 years",
  "5+ years",
];

// ── Step 6 — follower count ──────────────────────────────────────────────────
const FOLLOWER_OPTIONS = [
  "0 – 500",
  "500 – 2,000",
  "2,000 – 10,000",
  "10,000 – 50,000",
  "50,000 – 200,000",
  "200,000 – 1 million",
  "1 million+",
];

// ── Step 7 — revenue ─────────────────────────────────────────────────────────
const REVENUE_OPTIONS = [
  "$0 (not monetised yet)",
  "Under $500/mo",
  "$500 – $2,000/mo",
  "$2,000 – $10,000/mo",
  "$10,000+/mo",
];

// ── Step 8 — goal ────────────────────────────────────────────────────────────
const GOAL_OPTIONS = [
  "Grow my audience fast",
  "Land brand deals & sponsorships",
  "Sell digital products or courses",
  "Replace my 9–5 income",
  "Build a loyal community",
  "Become a full-time content creator",
  "All of the above",
];

// ── Step 9 — platforms ───────────────────────────────────────────────────────
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
  "Substack / Newsletter",
  "Podcast platforms (Spotify, Apple)",
];

// ── Step 10 — how did you hear ───────────────────────────────────────────────
const HEARD_OPTIONS = [
  "Google / Web search",
  "YouTube (video or ad)",
  "Instagram (post or ad)",
  "TikTok (video or ad)",
  "Facebook (post or ad)",
  "Twitter / X",
  "LinkedIn",
  "Pinterest",
  "Threads",
  "Snapchat",
  "Reddit",
  "WhatsApp / Text message",
  "Telegram",
  "Discord / Online community",
  "Influencer or creator recommendation",
  "Friend referral",
  "Family member",
  "Podcast",
  "Blog or article",
  "Email newsletter",
  "Press / media coverage",
  "Event or conference",
  "Oravini.com directly",
  "Brandverse.com",
  "Other",
];

const STEPS = [
  {
    key: "awareness",
    title: "How familiar are you with content creation?",
    sub: "Be honest — this helps us set the right starting point for you on the platform.",
    multi: false, hasOther: false,
  },
  {
    key: "fields",
    title: "What field are you in?",
    sub: "Pick all that apply — helps us tailor your AI strategy.",
    multi: true, hasOther: true,
    otherPrompt: "Tell us your specific niche or field",
    otherPlaceholder: "e.g. Sustainable fashion, Crypto trading, Dog training…",
  },
  {
    key: "struggles",
    title: "What do you struggle with most?",
    sub: "Select all that apply — we'll prioritise help for these.",
    multi: true, hasOther: true,
    otherPrompt: "What else are you struggling with?",
    otherPlaceholder: "Describe your biggest challenge…",
  },
  {
    key: "contentTypes",
    title: "What type of content do you primarily create?",
    sub: "Select everything you make — we'll optimise your toolkit for it.",
    multi: true, hasOther: false,
  },
  {
    key: "descriptor",
    title: "What best describes you?",
    sub: "Pick the one that fits you best right now.",
    multi: false, hasOther: true,
    otherPrompt: "How would you describe yourself?",
    otherPlaceholder: "e.g. Part-time fitness coach turning creator, retired teacher sharing knowledge…",
  },
  {
    key: "experience",
    title: "How long have you been creating content?",
    sub: "Be honest — it helps us calibrate your tools.",
    multi: false, hasOther: false,
  },
  {
    key: "followerCount",
    title: "How many followers do you have across all platforms?",
    sub: "Combined total. Helps us set realistic benchmarks for you.",
    multi: false, hasOther: false,
  },
  {
    key: "revenue",
    title: "What's your current monthly income from content?",
    sub: "This stays private and helps personalise your growth plan.",
    multi: false, hasOther: false,
  },
  {
    key: "goal",
    title: "What's your primary goal right now?",
    sub: "Pick your main focus — you can always update this later.",
    multi: false, hasOther: false,
  },
  {
    key: "platforms",
    title: "Which platforms are you active on?",
    sub: "Select all you create content for.",
    multi: true, hasOther: false,
  },
  {
    key: "heardAbout",
    title: "How did you hear about Oravini?",
    sub: "Select all that apply — helps us understand how people find us.",
    multi: true, hasOther: true,
    otherPrompt: "Where else did you hear about us?",
    otherPlaceholder: "Tell us how you found Oravini…",
  },
];

// ── Chip (multi-select) ───────────────────────────────────────────────────────
function Chip({ label, selected, onClick, isOther = false }: {
  label: string; selected: boolean; onClick: () => void; isOther?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 16px", borderRadius: 10, textAlign: "left",
        border: `1.5px solid ${selected ? GOLD : "rgba(255,255,255,0.12)"}`,
        background: selected ? `${GOLD}18` : "rgba(255,255,255,0.03)",
        color: selected ? GOLD : isOther ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.65)",
        fontSize: 14, fontWeight: selected ? 700 : 400,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
        transition: "all 0.15s",
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

// ── Radio (single-select) ─────────────────────────────────────────────────────
function Radio({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left", padding: "13px 16px", borderRadius: 10,
        border: `1.5px solid ${selected ? GOLD : "rgba(255,255,255,0.1)"}`,
        background: selected ? `${GOLD}15` : "rgba(255,255,255,0.03)",
        color: selected ? GOLD : "rgba(255,255,255,0.75)",
        fontSize: 14, fontWeight: selected ? 700 : 400,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
        transition: "all 0.15s",
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

// ── Other text box ─────────────────────────────────────────────────────────────
function OtherBox({ prompt, placeholder, value, onChange }: {
  prompt: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div style={{ marginTop: 12 }}>
      <label style={{
        display: "block", fontSize: 12, fontWeight: 600,
        color: "rgba(255,255,255,0.5)", marginBottom: 6, letterSpacing: "0.04em",
      }}>
        {prompt} <span style={{ color: GOLD }}>*</span>
      </label>
      <div style={{
        borderRadius: 10,
        border: `1.5px solid ${value.trim() ? GOLD : "rgba(255,255,255,0.18)"}`,
        background: "rgba(255,255,255,0.05)",
        transition: "border-color 0.2s",
        overflow: "hidden",
      }}>
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          data-testid="input-other-specify"
          style={{
            display: "block", width: "100%",
            background: "transparent", border: "none", outline: "none",
            color: "#fff", fontSize: 14, lineHeight: 1.7,
            resize: "none", fontFamily: "inherit",
            padding: "12px 14px",
            boxSizing: "border-box",
          }}
        />
      </div>
      {!value.trim() && (
        <p style={{ fontSize: 11, color: GOLD, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
          <span>✱</span> Required — fill this in to continue
        </p>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const [awareness, setAwareness]             = useState("");
  const [fields, setFields]                   = useState<string[]>([]);
  const [otherField, setOtherField]           = useState("");
  const [struggles, setStruggles]             = useState<string[]>([]);
  const [otherStruggle, setOtherStruggle]     = useState("");
  const [contentTypes, setContentTypes]       = useState<string[]>([]);
  const [descriptor, setDescriptor]           = useState("");
  const [otherDescriptor, setOtherDescriptor] = useState("");
  const [experience, setExperience]           = useState("");
  const [followerCount, setFollowerCount]     = useState("");
  const [monthlyRevenue, setRevenue]          = useState("");
  const [primaryGoal, setGoal]                = useState("");
  const [platforms, setPlatforms]             = useState<string[]>([]);
  const [heardAbout, setHeardAbout]           = useState<string[]>([]);
  const [otherHeard, setOtherHeard]           = useState("");

  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (user && (user as any).surveyCompleted) return <Redirect to="/select-plan" />;
  if (!user) return <Redirect to="/login" />;

  const total = STEPS.length;

  const toggle = (arr: string[], setArr: (v: string[]) => void, item: string) =>
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:  return !!awareness;
      case 1:  return fields.length > 0 && !(fields.includes("Other") && !otherField.trim());
      case 2:  return struggles.length > 0 && !(struggles.includes("Other") && !otherStruggle.trim());
      case 3:  return contentTypes.length > 0;
      case 4:  return !!descriptor && !(descriptor === "Other" && !otherDescriptor.trim());
      case 5:  return !!experience;
      case 6:  return !!followerCount;
      case 7:  return !!monthlyRevenue;
      case 8:  return !!primaryGoal;
      case 9:  return platforms.length > 0;
      case 10: return heardAbout.length > 0 && !(heardAbout.includes("Other") && !otherHeard.trim());
      default: return false;
    }
  };

  const blockReason = (): string => {
    if (step === 1 && fields.includes("Other") && !otherField.trim())
      return "Please fill in the text box above to continue";
    if (step === 2 && struggles.includes("Other") && !otherStruggle.trim())
      return "Please fill in the text box above to continue";
    if (step === 4 && descriptor === "Other" && !otherDescriptor.trim())
      return "Please fill in the text box above to continue";
    if (step === 10 && heardAbout.includes("Other") && !otherHeard.trim())
      return "Please fill in the text box above to continue";
    const s = STEPS[step];
    return s.multi ? "Select at least one option to continue" : "Choose an option to continue";
  };

  const isOtherBlocked =
    (step === 1 && fields.includes("Other") && !otherField.trim()) ||
    (step === 2 && struggles.includes("Other") && !otherStruggle.trim()) ||
    (step === 4 && descriptor === "Other" && !otherDescriptor.trim()) ||
    (step === 10 && heardAbout.includes("Other") && !otherHeard.trim());

  const saveMut = useMutation({
    mutationFn: () => {
      const resolveOther = (arr: string[], other: string) =>
        arr.includes("Other") && other.trim()
          ? [...arr.filter(x => x !== "Other"), `Other: ${other.trim()}`]
          : arr;

      const allFields    = resolveOther(fields, otherField);
      const allStruggles = resolveOther(struggles, otherStruggle);
      const allHeard     = resolveOther(heardAbout, otherHeard);
      const finalDescriptor =
        descriptor === "Other" && otherDescriptor.trim()
          ? `Other: ${otherDescriptor.trim()}`
          : descriptor;

      return apiRequest("POST", "/api/user/onboarding-survey", {
        awareness,
        field: allFields.join(", "),
        fields: allFields,
        struggles: allStruggles,
        contentTypes,
        descriptor: finalDescriptor,
        experience,
        followerCount,
        monthlyRevenue,
        primaryGoal,
        platform: platforms.join(", "),
        platforms,
        heardAbout: allHeard,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/onboarding-status"] });
      // Always go to pricing page next — after survey, before dashboard
      navigate("/select-plan");
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
  const ok = canAdvance();

  return (
    <div style={{
      minHeight: "100vh", background: "#080808",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      color: "#fff",
    }}>
      {/* Top bar */}
      <div style={{
        width: "100%", padding: "20px 24px 0", maxWidth: 600,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>ORAVINI</span>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>{step + 1} of {total}</span>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 600, padding: "14px 24px 0" }}>
        <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: GOLD, borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ width: "100%", maxWidth: 600, padding: "32px 24px 150px", flex: 1 }}>
        {/* Header */}
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

        {/* ── Step 0: Awareness ── */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {AWARENESS_OPTIONS.map(o => (
              <Radio key={o} label={o} selected={awareness === o} onClick={() => setAwareness(o)} />
            ))}
          </div>
        )}

        {/* ── Step 1: Fields ── */}
        {step === 1 && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {FIELDS.map(f => (
                <Chip key={f} label={f} selected={fields.includes(f)}
                  onClick={() => toggle(fields, setFields, f)} isOther={f === "Other"} />
              ))}
            </div>
            {fields.includes("Other") && (
              <OtherBox prompt={current.otherPrompt!} placeholder={current.otherPlaceholder!}
                value={otherField} onChange={setOtherField} />
            )}
          </div>
        )}

        {/* ── Step 2: Struggles ── */}
        {step === 2 && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STRUGGLES.map(s => (
                <Chip key={s} label={s} selected={struggles.includes(s)}
                  onClick={() => toggle(struggles, setStruggles, s)} isOther={s === "Other"} />
              ))}
            </div>
            {struggles.includes("Other") && (
              <OtherBox prompt={current.otherPrompt!} placeholder={current.otherPlaceholder!}
                value={otherStruggle} onChange={setOtherStruggle} />
            )}
          </div>
        )}

        {/* ── Step 3: Content types ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CONTENT_TYPES.map(c => (
              <Chip key={c} label={c} selected={contentTypes.includes(c)}
                onClick={() => toggle(contentTypes, setContentTypes, c)} />
            ))}
          </div>
        )}

        {/* ── Step 4: Descriptor ── */}
        {step === 4 && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DESCRIPTOR_OPTIONS.map(o => (
                <Radio key={o} label={o} selected={descriptor === o} onClick={() => setDescriptor(o)} />
              ))}
            </div>
            {descriptor === "Other" && (
              <OtherBox prompt={current.otherPrompt!} placeholder={current.otherPlaceholder!}
                value={otherDescriptor} onChange={setOtherDescriptor} />
            )}
          </div>
        )}

        {/* ── Step 5: Experience ── */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {EXPERIENCE_OPTIONS.map(o => (
              <Radio key={o} label={o} selected={experience === o} onClick={() => setExperience(o)} />
            ))}
          </div>
        )}

        {/* ── Step 6: Follower count ── */}
        {step === 6 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FOLLOWER_OPTIONS.map(o => (
              <Radio key={o} label={o} selected={followerCount === o} onClick={() => setFollowerCount(o)} />
            ))}
          </div>
        )}

        {/* ── Step 7: Revenue ── */}
        {step === 7 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {REVENUE_OPTIONS.map(o => (
              <Radio key={o} label={o} selected={monthlyRevenue === o} onClick={() => setRevenue(o)} />
            ))}
          </div>
        )}

        {/* ── Step 8: Goal ── */}
        {step === 8 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {GOAL_OPTIONS.map(o => (
              <Radio key={o} label={o} selected={primaryGoal === o} onClick={() => setGoal(o)} />
            ))}
          </div>
        )}

        {/* ── Step 9: Platforms ── */}
        {step === 9 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {PLATFORM_OPTIONS.map(p => (
              <Chip key={p} label={p} selected={platforms.includes(p)}
                onClick={() => toggle(platforms, setPlatforms, p)} />
            ))}
          </div>
        )}

        {/* ── Step 10: How did you hear ── */}
        {step === 10 && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {HEARD_OPTIONS.map(h => (
                <Chip key={h} label={h} selected={heardAbout.includes(h)}
                  onClick={() => toggle(heardAbout, setHeardAbout, h)} isOther={h === "Other"} />
              ))}
            </div>
            {heardAbout.includes("Other") && (
              <OtherBox prompt={current.otherPrompt!} placeholder={current.otherPlaceholder!}
                value={otherHeard} onChange={setOtherHeard} />
            )}
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(8,8,8,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        padding: "14px 24px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        zIndex: 50,
      }}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          {!ok && (
            <p style={{
              textAlign: "center", fontSize: 12,
              color: isOtherBlocked ? GOLD : "rgba(255,255,255,0.28)",
              margin: "0 0 8px",
            }}>
              {blockReason()}
            </p>
          )}
          <button
            type="button"
            data-testid={step < total - 1 ? "button-onboarding-next" : "button-onboarding-submit"}
            onClick={handleNext}
            disabled={!ok || saveMut.isPending}
            style={{
              width: "100%", padding: "15px 24px", borderRadius: 12, border: "none",
              background: ok && !saveMut.isPending ? GOLD : "rgba(212,180,97,0.2)",
              color: ok && !saveMut.isPending ? "#000" : "rgba(212,180,97,0.35)",
              fontSize: 15, fontWeight: 800,
              cursor: ok && !saveMut.isPending ? "pointer" : "not-allowed",
              letterSpacing: "0.03em", transition: "all 0.2s",
            }}
          >
            {saveMut.isPending
              ? "Saving your profile…"
              : step < total - 1
                ? "Continue →"
                : "See Pricing →"}
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
