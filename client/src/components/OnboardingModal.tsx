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

const DESCRIPTOR_OPTIONS = [
  "Creator / Influencer",
  "Coach / Consultant",
  "Course Creator",
  "Agency Owner",
  "Service Provider / Freelancer",
  "Personal Brand / Thought Leader",
  "Business Owner",
  "Other",
];

const CONTENT_TYPE_OPTIONS = [
  "Short-form video (Reels/Shorts/TikToks)",
  "Long-form video (YouTube)",
  "Photos & carousels",
  "Written posts / threads",
  "Podcasts / audio",
  "Live streams",
  "Newsletters",
  "Stories / daily updates",
];

const FOLLOWER_COUNT_OPTIONS = [
  "Under 1,000",
  "1K – 10K",
  "10K – 50K",
  "50K – 100K",
  "100K – 500K",
  "500K+",
];

const AWARENESS_OPTIONS = [
  "Never heard of done-with-you growth programmes",
  "Heard of them but not sure how they work",
  "Actively researching / looking into one",
  "Tried one before",
  "Currently in one",
];

const HEARD_ABOUT_OPTIONS = [
  "Instagram",
  "YouTube",
  "TikTok",
  "X / Twitter",
  "LinkedIn",
  "Friend referral",
  "Google search",
  "Newsletter / email",
  "Another creator",
  "Other",
];

interface Props {
  onComplete: () => void;
  existingSurvey?: any;
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

const ELITE_OPTIONS = [
  { value: "yes", label: "Yes, I want to know more", emoji: "🔥" },
  { value: "not_now", label: "Not right now", emoji: "⏳" },
  { value: "maybe", label: "Maybe in the future", emoji: "💭" },
];

const STEPS = [
  { key: "fields", title: "What field are you in?", sub: "Pick all that apply — helps us tailor your AI strategy." },
  { key: "descriptor", title: "Which best describes you?", sub: "Pick the one closest to how you'd introduce yourself." },
  { key: "struggles", title: "What do you struggle with most?", sub: "Select all that apply — we'll prioritise help for these." },
  { key: "experience", title: "How long have you been creating content?" },
  { key: "contentTypes", title: "What types of content do you create?", sub: "Select all formats you publish." },
  { key: "followerCount", title: "What's your total following across all platforms?" },
  { key: "revenue", title: "What's your current monthly income from content?" },
  { key: "goal", title: "What's your primary goal right now?", sub: "Pick your main focus." },
  { key: "platforms", title: "Which platforms are you active on?", sub: "Select all you create content for." },
  { key: "awareness", title: "How aware are you of done-with-you growth programmes?", sub: "No wrong answer — helps us know how to support you." },
  { key: "heardAbout", title: "Where did you hear about us?", sub: "Select all that apply." },
  { key: "eliteInterest", title: "Do you need help scaling your info or coaching offer?", sub: "Tier 5 is our done-with-you programme — real strategy, real support, real results." },
];

const ELITE_STEP = 11;

export default function OnboardingModal({ onComplete, existingSurvey }: Props) {
  // If user already completed the original steps but is missing eliteInterest,
  // jump straight to the elite step with their previous answers preserved.
  // DB returns snake_case (monthly_revenue, primary_goal, follower_count) — accept both forms
  const eliteOnly = !!existingSurvey && !existingSurvey?.answers?.eliteInterest;
  const [step, setStep] = useState(eliteOnly ? ELITE_STEP : 0);
  const [fields, setFields] = useState<string[]>(
    Array.isArray(existingSurvey?.fields) ? existingSurvey.fields :
    existingSurvey?.field ? [existingSurvey.field] : []
  );
  const [descriptor, setDescriptor] = useState(existingSurvey?.descriptor || "");
  const [struggles, setStruggles] = useState<string[]>(existingSurvey?.struggles || []);
  const [experience, setExperience] = useState(existingSurvey?.experience || "");
  const [contentTypes, setContentTypes] = useState<string[]>(existingSurvey?.content_types || existingSurvey?.contentTypes || []);
  const [followerCount, setFollowerCount] = useState(existingSurvey?.follower_count || existingSurvey?.followerCount || "");
  const [monthlyRevenue, setMonthlyRevenue] = useState(existingSurvey?.monthly_revenue || existingSurvey?.monthlyRevenue || "");
  const [primaryGoal, setPrimaryGoal] = useState(existingSurvey?.primary_goal || existingSurvey?.primaryGoal || "");
  const [platforms, setPlatforms] = useState<string[]>(
    Array.isArray(existingSurvey?.platforms) ? existingSurvey.platforms :
    existingSurvey?.platform ? [existingSurvey.platform] : []
  );
  const [awareness, setAwareness] = useState(existingSurvey?.awareness || "");
  const [heardAbout, setHeardAbout] = useState<string[]>(
    Array.isArray(existingSurvey?.heard_about) ? existingSurvey.heard_about :
    Array.isArray(existingSurvey?.heardAbout) ? existingSurvey.heardAbout : []
  );
  const [eliteInterest, setEliteInterest] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/onboarding-survey", {
      field: fields.join(", "),
      fields,
      descriptor,
      struggles,
      experience,
      contentTypes,
      followerCount,
      monthlyRevenue,
      primaryGoal,
      platform: platforms.join(", "),
      platforms,
      awareness,
      heardAbout,
      answers: { eliteInterest },
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
    if (step === 1) return !!descriptor;
    if (step === 2) return struggles.length > 0;
    if (step === 3) return !!experience;
    if (step === 4) return contentTypes.length > 0;
    if (step === 5) return !!followerCount;
    if (step === 6) return !!monthlyRevenue;
    if (step === 7) return !!primaryGoal;
    if (step === 8) return platforms.length > 0;
    if (step === 9) return !!awareness;
    if (step === 10) return heardAbout.length > 0;
    if (step === 11) return !!eliteInterest;
    return false;
  };

  const handleNext = () => {
    if (step < ELITE_STEP) setStep(s => s + 1);
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
                {eliteOnly ? "One quick question" : `Quick Setup · ${total - step} question${total - step !== 1 ? "s" : ""} left`}
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

          {/* Step 1: Descriptor — single radio */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DESCRIPTOR_OPTIONS.map(o => (
                <RadioRow key={o} label={o} selected={descriptor === o} onClick={() => setDescriptor(o)} />
              ))}
            </div>
          )}

          {/* Step 2: Struggles — multi-select checkboxes */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STRUGGLES.map(s => (
                <CheckRow key={s} label={s} selected={struggles.includes(s)} onClick={() => toggleItem(struggles, setStruggles, s)} />
              ))}
            </div>
          )}

          {/* Step 3: Experience — single radio */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EXPERIENCE_OPTIONS.map(o => (
                <RadioRow key={o} label={o} selected={experience === o} onClick={() => setExperience(o)} />
              ))}
            </div>
          )}

          {/* Step 4: Content types — multi-select checkboxes */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CONTENT_TYPE_OPTIONS.map(c => (
                <CheckRow key={c} label={c} selected={contentTypes.includes(c)} onClick={() => toggleItem(contentTypes, setContentTypes, c)} />
              ))}
            </div>
          )}

          {/* Step 5: Follower count — single radio */}
          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FOLLOWER_COUNT_OPTIONS.map(o => (
                <RadioRow key={o} label={o} selected={followerCount === o} onClick={() => setFollowerCount(o)} />
              ))}
            </div>
          )}

          {/* Step 6: Revenue — single radio */}
          {step === 6 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {REVENUE_OPTIONS.map(o => (
                <RadioRow key={o} label={o} selected={monthlyRevenue === o} onClick={() => setMonthlyRevenue(o)} />
              ))}
            </div>
          )}

          {/* Step 7: Goal — single radio */}
          {step === 7 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GOAL_OPTIONS.map(o => (
                <RadioRow key={o} label={o} selected={primaryGoal === o} onClick={() => setPrimaryGoal(o)} />
              ))}
            </div>
          )}

          {/* Step 8: Platforms — multi-select chips */}
          {step === 8 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PLATFORM_OPTIONS.map(p => (
                <MultiChip key={p} label={p} selected={platforms.includes(p)} onClick={() => toggleItem(platforms, setPlatforms, p)} />
              ))}
            </div>
          )}

          {/* Step 9: Awareness — single radio */}
          {step === 9 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AWARENESS_OPTIONS.map(o => (
                <RadioRow key={o} label={o} selected={awareness === o} onClick={() => setAwareness(o)} />
              ))}
            </div>
          )}

          {/* Step 10: Heard about — multi-select chips */}
          {step === 10 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {HEARD_ABOUT_OPTIONS.map(h => (
                <MultiChip key={h} label={h} selected={heardAbout.includes(h)} onClick={() => toggleItem(heardAbout, setHeardAbout, h)} />
              ))}
            </div>
          )}

          {/* Step 11: Elite interest */}
          {step === ELITE_STEP && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ELITE_OPTIONS.map(opt => {
                const isSelected = eliteInterest === opt.value;
                const isYes = opt.value === "yes";
                return (
                  <button
                    key={opt.value}
                    onClick={() => setEliteInterest(opt.value)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: isYes ? "16px 18px" : "12px 16px",
                      borderRadius: isYes ? 14 : 10,
                      border: `${isYes ? 2 : 1.5}px solid ${isSelected ? (isYes ? GOLD : "rgba(255,255,255,0.4)") : isYes ? `${GOLD}50` : "rgba(255,255,255,0.1)"}`,
                      background: isSelected
                        ? isYes ? `${GOLD}18` : "rgba(255,255,255,0.06)"
                        : isYes ? `${GOLD}08` : "rgba(255,255,255,0.03)",
                      color: isSelected ? (isYes ? GOLD : "rgba(255,255,255,0.9)") : isYes ? GOLD : "rgba(255,255,255,0.75)",
                      fontSize: isYes ? 15 : 14,
                      fontWeight: isSelected ? 700 : isYes ? 600 : 400,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "all 0.18s",
                      boxShadow: isSelected && isYes ? `0 0 24px ${GOLD}30` : "none",
                    }}
                  >
                    <span style={{ fontSize: isYes ? 20 : 16 }}>{opt.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div>{opt.label}</div>
                      {isYes && (
                        <div style={{ fontSize: 11, color: isSelected ? `${GOLD}cc` : "rgba(212,180,97,0.5)", marginTop: 2, fontWeight: 400 }}>
                          Unlimited credits · Done-with-you strategy · 1-on-1 support
                        </div>
                      )}
                    </div>
                    {isYes && (
                      <div style={{
                        padding: "2px 8px", borderRadius: 20,
                        background: `${GOLD}22`, border: `1px solid ${GOLD}40`,
                        fontSize: 9, fontWeight: 800, color: GOLD,
                        textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0,
                      }}>Elite</div>
                    )}
                  </button>
                );
              })}

              {/* Pricing panel — shown when Not now / Maybe is selected */}
              {(eliteInterest === "not_now" || eliteInterest === "maybe") && (
                <div style={{
                  marginTop: 4,
                  padding: "18px 18px 16px",
                  borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                    No problem — here's what's available
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 14, fontWeight: 600 }}>
                    Pick the plan that fits where you are right now. You can upgrade, downgrade or cancel anytime.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { name: "Free", price: "$0", credits: "5/day credits", color: "#71717a", url: null },
                      { name: "Starter", price: "$29", credits: "150 credits/mo", color: "#818cf8", url: "https://whop.com/checkout/plan_MyQ8imbxSSYqE" },
                      { name: "Growth", price: "$59", credits: "350 credits/mo", color: GOLD, url: "https://whop.com/checkout/plan_czIrdl7ryaq6B", popular: true },
                      { name: "Pro", price: "$79", credits: "700 credits/mo", color: "#34d399", url: "https://whop.com/checkout/plan_HjKg0jyCVzuG3" },
                    ].map(tier => (
                      <div
                        key={tier.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: tier.popular ? `${tier.color}10` : "rgba(255,255,255,0.025)",
                          border: `1px solid ${tier.popular ? `${tier.color}35` : "rgba(255,255,255,0.06)"}`,
                          position: "relative",
                        }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: tier.color, flexShrink: 0,
                          boxShadow: tier.popular ? `0 0 8px ${tier.color}` : "none",
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{tier.name}</span>
                            {tier.popular && (
                              <span style={{
                                fontSize: 8, fontWeight: 800, color: "#000",
                                background: tier.color, padding: "1px 6px", borderRadius: 4,
                                letterSpacing: "0.08em", textTransform: "uppercase",
                              }}>Popular</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{tier.credits}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: tier.color, lineHeight: 1 }}>{tier.price}</div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{tier.price === "$0" ? "forever" : "/month"}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <a
                    href="/settings/plan"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      marginTop: 12,
                      padding: "10px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: "none",
                      textAlign: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    See full comparison & upgrade →
                  </a>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 8, textAlign: "center" }}>
                    Opens in a new tab — finish your setup here first.
                  </p>
                </div>
              )}

              {/* CTA panel — shown only when "Yes" is selected */}
              {eliteInterest === "yes" && (
                <div style={{
                  marginTop: 4,
                  padding: "18px 20px",
                  borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(212,180,97,0.1) 0%, rgba(212,180,97,0.04) 100%)",
                  border: `1px solid ${GOLD}35`,
                  boxShadow: `0 0 40px ${GOLD}12`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                    👑 Tier 5 · Elite Programme
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 14 }}>
                    Our most powerful programme. Unlimited credits, a dedicated growth strategy built with you, direct team access, and 1-on-1 calls whenever you need them.
                  </p>
                  <a
                    href="/apply"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "11px 20px",
                      borderRadius: 10,
                      background: `linear-gradient(135deg, ${GOLD}, #f0d080)`,
                      color: "#000",
                      fontWeight: 800,
                      fontSize: 13,
                      textDecoration: "none",
                      boxShadow: `0 4px 20px ${GOLD}45`,
                      transition: "all 0.15s",
                    }}
                  >
                    🚀 Take me there — Apply for Tier 5
                  </a>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>
                    Opens in a new tab — come back here to finish your setup anytime.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer — always visible */}
        <div style={{ padding: "16px 32px 24px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && !eliteOnly && (
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
              {saveMutation.isPending ? "Saving…" : step === ELITE_STEP ? "Complete Setup →" : "Next →"}
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
