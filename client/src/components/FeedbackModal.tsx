import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ChevronRight, ChevronLeft, Check, X } from "lucide-react";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  source?: "dashboard" | "settings";
}

const EASE_OPTIONS = [
  { value: "very_easy", label: "Very Easy" },
  { value: "easy", label: "Easy" },
  { value: "neutral", label: "Neutral" },
  { value: "difficult", label: "Difficult" },
  { value: "very_difficult", label: "Very Difficult" },
];

const COMPLETED_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "partially", label: "Partially" },
  { value: "no", label: "No" },
];

const USEFUL_FEATURE_OPTIONS = [
  "AI Content Ideas",
  "Carousel Studio",
  "Competitor Study",
  "Content Calendar",
  "AI Coach / Jarvis",
  "Sessions Hub",
  "Lead Magnet Generator",
  "Brand Kit Builder",
  "Video Editor",
  "Progress Tracker",
  "Other",
];

const LIKED_OPTIONS = [
  "The AI tools",
  "Content strategy guidance",
  "The community",
  "Sessions & recordings",
  "Ease of use",
  "Design & UI",
  "The support",
  "Other",
];

const ISSUE_TYPE_OPTIONS = [
  { value: "bug", label: "Bug / Error" },
  { value: "slow", label: "Slow Performance" },
  { value: "confusing", label: "Confusing Interface" },
  { value: "missing_feature", label: "Missing Feature" },
  { value: "other", label: "Other" },
];

const ISSUE_FREQ_OPTIONS = [
  { value: "once", label: "Once" },
  { value: "occasionally", label: "Occasionally" },
  { value: "frequently", label: "Frequently" },
  { value: "always", label: "Always" },
];

const IMPORTANCE_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function MCQ({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
            value === opt.value
              ? "bg-primary text-primary-foreground border-primary"
              : "border-zinc-700 text-zinc-300 hover:border-zinc-500 bg-zinc-900/50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TagSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
            value === opt
              ? "bg-primary text-primary-foreground border-primary"
              : "border-zinc-700 text-zinc-300 hover:border-zinc-500 bg-zinc-900/50"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className="w-8 h-8"
              fill={i <= (hovered || value) ? "#eab308" : "none"}
              stroke={i <= (hovered || value) ? "#eab308" : "#52525b"}
            />
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <p className="text-sm text-muted-foreground mt-1">{labels[hovered || value]}</p>
      )}
    </div>
  );
}

function NPSRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const color = (n: number) => n >= 9 ? "text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
    : n >= 7 ? "text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/10"
    : "text-red-400 border-red-500/40 hover:bg-red-500/10";
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, i) => i).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-all ${color(n)} ${value === n ? "bg-primary text-primary-foreground border-primary" : "border-zinc-700"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    </div>
  );
}

const TOTAL_STEPS = 7;

export default function FeedbackModal({ open, onClose, source = "dashboard" }: FeedbackModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    overallRating: 0,
    easeOfUse: "",
    purposeToday: "",
    completedPurpose: "",
    mostLiked: "",
    mostUsefulFeature: "",
    hadIssues: "",
    issueType: "",
    issueDescription: "",
    issueFrequency: "",
    improvement: "",
    wishedFeature: "",
    immediateChange: "",
    feedbackImportance: "",
    wouldStopUsing: "",
    npsScore: null as number | null,
    npsReason: "",
    source,
  });

  const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  const submit = useMutation({
    mutationFn: () => {
      // Strip empty strings and zero-rating so optional DB columns get undefined
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v === null || v === "" || v === 0) continue;
        payload[k] = v;
      }
      return apiRequest("POST", "/api/feedback", payload);
    },
    onSuccess: () => {
      toast({ title: "Thank you for your feedback!", description: "We read every response and use it to improve Oravini." });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  const stepTitles = [
    "Overall Experience",
    "Your Goals Today",
    "What's Working Well",
    "Issues & Problems",
    "Improvements",
    "Impact & Priority",
    "Satisfaction & Recommendation",
  ];

  const canNext = () => {
    if (step === 1) return form.overallRating > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg bg-zinc-950 border border-zinc-800 text-foreground p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Step {step} of {TOTAL_STEPS}</p>
                <DialogTitle className="text-lg font-bold">{stepTitles[step - 1]}</DialogTitle>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-5 min-h-[200px]">
            {step === 1 && (
              <>
                <div>
                  <p className="text-sm font-medium mb-3">How would you rate your overall experience with Oravini?</p>
                  <StarRating value={form.overallRating} onChange={v => set("overallRating", v)} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-3">How easy was it to use Oravini?</p>
                  <MCQ options={EASE_OPTIONS} value={form.easeOfUse} onChange={v => set("easeOfUse", v)} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">What were you trying to do on Oravini today?</p>
                  <Textarea
                    placeholder="e.g. Create content ideas, track my Instagram growth..."
                    value={form.purposeToday}
                    onChange={e => set("purposeToday", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 resize-none h-20"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-3">Were you able to complete what you came to do?</p>
                  <MCQ options={COMPLETED_OPTIONS} value={form.completedPurpose} onChange={v => set("completedPurpose", v)} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <p className="text-sm font-medium mb-3">What did you like most about Oravini?</p>
                  <TagSelect options={LIKED_OPTIONS} value={form.mostLiked} onChange={v => set("mostLiked", v)} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-3">Which feature did you find most useful?</p>
                  <TagSelect options={USEFUL_FEATURE_OPTIONS} value={form.mostUsefulFeature} onChange={v => set("mostUsefulFeature", v)} />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <p className="text-sm font-medium mb-3">Did you face any issues while using Oravini?</p>
                  <MCQ
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                    value={form.hadIssues}
                    onChange={v => set("hadIssues", v)}
                  />
                </div>
                {form.hadIssues === "yes" && (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-3">What type of issue did you face?</p>
                      <MCQ options={ISSUE_TYPE_OPTIONS} value={form.issueType} onChange={v => set("issueType", v)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Please describe the issue:</p>
                      <Textarea
                        placeholder="Describe what happened..."
                        value={form.issueDescription}
                        onChange={e => set("issueDescription", e.target.value)}
                        className="bg-zinc-900 border-zinc-700 resize-none h-20"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-3">How often does this issue occur?</p>
                      <MCQ options={ISSUE_FREQ_OPTIONS} value={form.issueFrequency} onChange={v => set("issueFrequency", v)} />
                    </div>
                  </>
                )}
              </>
            )}

            {step === 5 && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">What can we improve in Oravini?</p>
                  <Textarea
                    placeholder="Your suggestions..."
                    value={form.improvement}
                    onChange={e => set("improvement", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 resize-none h-16"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Is there any feature you wish Oravini had?</p>
                  <Textarea
                    placeholder="Feature idea..."
                    value={form.wishedFeature}
                    onChange={e => set("wishedFeature", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 resize-none h-16"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">If you could change one thing immediately, what would it be?</p>
                  <Textarea
                    placeholder="Your top priority change..."
                    value={form.immediateChange}
                    onChange={e => set("immediateChange", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 resize-none h-16"
                  />
                </div>
              </>
            )}

            {step === 6 && (
              <>
                <div>
                  <p className="text-sm font-medium mb-3">How important is this feedback to you?</p>
                  <MCQ options={IMPORTANCE_OPTIONS} value={form.feedbackImportance} onChange={v => set("feedbackImportance", v)} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-3">Would this issue stop you from using Oravini again?</p>
                  <MCQ
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                    value={form.wouldStopUsing}
                    onChange={v => set("wouldStopUsing", v)}
                  />
                </div>
              </>
            )}

            {step === 7 && (
              <>
                <div>
                  <p className="text-sm font-medium mb-3">How likely are you to recommend Oravini to others?</p>
                  <NPSRating value={form.npsScore} onChange={v => set("npsScore", v)} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">What is the main reason for your rating?</p>
                  <Textarea
                    placeholder="Tell us why..."
                    value={form.npsReason}
                    onChange={e => set("npsReason", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 resize-none h-20"
                  />
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>

            {step < TOTAL_STEPS ? (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submit.isPending ? "Submitting..." : (
                  <><Check className="w-4 h-4 mr-1" /> Submit Feedback</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
