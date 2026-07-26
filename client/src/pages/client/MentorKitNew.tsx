import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, ArrowRight, Upload, X, Sparkles, FileUp, Zap,
  ChevronRight, CheckCircle2, BookOpen, Users, FileText,
  Brain, Target, DollarSign, Trophy, Heart,
  Video, Layers, Award, SkipForward, Wand2, Loader2,
  Clock, RotateCcw, Flame, Settings,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PdfFile { name: string; wordCount: number; text: string; }

interface WizardData {
  productType: string; deliveryMode: string; duration: string; customDuration: string;
  moduleCount: string; lessonsPerModule: string; lessonLength: string; callCadence: string;
  callLength: string; communityPlatform: string; hostingPlatform: string; hasCertification: boolean;
  creatorName: string; brandName: string; niche: string; subNiche: string; yearsExperience: string;
  originStory: string; personalTransformation: string; biggestMistake: string; wishKnownEarlier: string;
  credentials: string; influences: string; knownFor: string;
  biggestPersonalResult: string; clientResults: string; caseStudies: string; testimonials: string; socialProof: string;
  audienceDescription: string; ageRange: string; careerStage: string; topFrustrations: string;
  triedBefore: string; realReason: string; verbatimLanguage: string; beforePicture: string; afterPicture: string;
  biggestFear: string; secretDesire: string; wherePlatforms: string;
  frameworkName: string; frameworkDescription: string; differentiator: string; phases: string;
  quickWin: string; ahaMoment: string; weeklyMilestones: string; moduleIdeas: string; assignments: string; toolsRequired: string;
  coreBelief: string; teachingPhilosophy: string; contrarianTakes: string; biggestMyth: string; coreRules: string; mentorValues: string;
  pdfs: PdfFile[]; ownFrameworkText: string; existingContent: string; deepCaseStudies: string; communityRules: string;
  first24Hours: string; accountabilityMechanisms: string; supportChannel: string; graduationExperience: string;
  postCompletion: string; upsellOffer: string;
  pricePoint: string; pricingModel: string; firstCohortSize: string; revenueGoal: string;
  ranBefore: string; previousResults: string; marketingChannels: string; audienceSizes: string; competitors: string; yourEdge: string;
}

type AiRefineState = { field: string; loading: boolean; suggestion: string } | null;
type UpdateFn = (field: keyof WizardData, value: any) => void;
type RefineAiFn = (field: keyof WizardData, label: string) => void;

type RefineProps = {
  aiRefine: AiRefineState;
  refine: RefineAiFn;
  clearAi: () => void;
  fillStep: () => void;
  filling: boolean;
};

type FieldAiProps = {
  fieldKey?: string;
  aiState?: AiRefineState;
  onRefine?: () => void;
  onAccept?: (val: string) => void;
  onDismiss?: () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { id: "course", label: "Video Course", sub: "Self-paced or cohort curriculum", icon: BookOpen, gradient: "from-blue-500 to-cyan-500" },
  { id: "mentorship", label: "Mentorship Program", sub: "1:1 or group coaching with structure", icon: Users, gradient: "from-purple-500 to-pink-500" },
  { id: "hybrid", label: "Hybrid Program", sub: "Recorded lessons + live coaching calls", icon: Layers, gradient: "from-orange-500 to-red-500" },
  { id: "mastermind", label: "Mastermind", sub: "Peer learning + expert facilitation", icon: Trophy, gradient: "from-yellow-500 to-orange-500" },
];

const DELIVERY_MODES = [
  { id: "recorded", label: "Pre-recorded", sub: "Students learn at own pace" },
  { id: "live", label: "Live Cohort", sub: "Everyone starts and ends together" },
  { id: "hybrid_delivery", label: "Hybrid", sub: "Recordings + live sessions" },
  { id: "async", label: "Fully Async", sub: "No live sessions at all" },
];

const DURATIONS = [
  { id: "4w", label: "4 Weeks" }, { id: "6w", label: "6 Weeks" },
  { id: "8w", label: "8 Weeks" }, { id: "12w", label: "12 Weeks" },
  { id: "16w", label: "16 Weeks" }, { id: "6m", label: "6 Months" },
  { id: "12m", label: "12 Months" }, { id: "custom", label: "Custom" },
];

const CALL_CADENCES = [
  { id: "none", label: "No Calls" }, { id: "weekly_group", label: "Weekly Group" },
  { id: "biweekly_group", label: "Bi-weekly Group" }, { id: "weekly_1on1", label: "Weekly 1:1" },
  { id: "biweekly_1on1", label: "Bi-weekly 1:1" }, { id: "monthly", label: "Monthly Group" },
];

const COMMUNITY_PLATFORMS = [
  { id: "none", label: "None" }, { id: "slack", label: "Slack" },
  { id: "circle", label: "Circle" }, { id: "discord", label: "Discord" },
  { id: "skool", label: "Skool" }, { id: "facebook", label: "Facebook" },
];

const PRICING_MODELS = [
  { id: "onetime", label: "One-time payment", sub: "Pay once, access forever" },
  { id: "payment_plan", label: "Payment plan", sub: "2–4 instalments" },
  { id: "monthly", label: "Monthly subscription", sub: "Recurring access" },
  { id: "hybrid_pricing", label: "PIF + plan option", sub: "Discount for paying in full" },
];

// 11 steps: hasFill drives whether StepGuide shows the "Fill with AI" button
const STEPS_META = [
  { title: "What Are You Building?", subtitle: "Pick your format and program length", icon: Video, required: ["productType", "duration"], hasFill: false, est: "1 min" },
  { title: "Delivery & Structure", subtitle: "How students access and experience it", icon: Settings, required: [], hasFill: false, est: "2 min" },
  { title: "About You", subtitle: "The person behind the product", icon: Users, required: ["creatorName", "niche"], hasFill: false, est: "2 min" },
  { title: "Your Story", subtitle: "The narrative that makes you magnetic", icon: Heart, required: ["originStory"], hasFill: true, est: "5–10 min" },
  { title: "Your Proof", subtitle: "Results that build credibility", icon: Trophy, required: [], hasFill: true, est: "5–10 min" },
  { title: "Your Audience", subtitle: "Who you're building this for", icon: Target, required: ["audienceDescription", "topFrustrations"], hasFill: true, est: "5–10 min" },
  { title: "Your Framework", subtitle: "The intellectual core of your product", icon: Brain, required: ["frameworkName", "frameworkDescription", "phases"], hasFill: true, est: "5–10 min" },
  { title: "Your Philosophy", subtitle: "What makes your teaching unique", icon: FileText, required: ["coreBelief", "contrarianTakes"], hasFill: true, est: "5 min" },
  { title: "Knowledge Upload", subtitle: "Feed the AI your brain", icon: Upload, required: [], hasFill: false, est: "5 min" },
  { title: "Student Experience", subtitle: "How you'll deliver transformation", icon: Award, required: ["first24Hours"], hasFill: true, est: "5 min" },
  { title: "Business Context", subtitle: "The commercial reality", icon: DollarSign, required: ["pricePoint"], hasFill: true, est: "3 min" },
];

// One array per step (index = step - 1), used for completion %
const STEP_ALL_FIELDS: (keyof WizardData)[][] = [
  ["productType", "duration"],
  ["deliveryMode", "moduleCount", "callCadence", "communityPlatform"],
  ["creatorName", "niche", "yearsExperience", "credentials", "knownFor"],
  ["originStory", "personalTransformation", "biggestMistake", "wishKnownEarlier", "influences"],
  ["biggestPersonalResult", "clientResults", "caseStudies", "testimonials", "socialProof"],
  ["audienceDescription", "topFrustrations", "triedBefore", "realReason", "verbatimLanguage", "beforePicture", "afterPicture"],
  ["frameworkName", "frameworkDescription", "differentiator", "phases", "quickWin", "weeklyMilestones", "moduleIdeas"],
  ["coreBelief", "teachingPhilosophy", "contrarianTakes", "biggestMyth", "coreRules"],
  ["ownFrameworkText", "existingContent", "deepCaseStudies"],
  ["first24Hours", "accountabilityMechanisms", "supportChannel", "graduationExperience"],
  ["pricePoint", "pricingModel", "marketingChannels"],
];

const STEP_GUIDES = [
  {
    tip: "Two decisions lock everything else: what type of product and how long it runs. Pick decisively — you can always adjust after the blueprint.",
    why: "Size the curriculum precisely. A 12-week program gets a fundamentally different module structure than a 6-week sprint.",
  },
  {
    tip: "How students access and experience the content shapes accountability, tech stack, and pricing. Choose based on what you can actually deliver.",
    why: "Structure the call cadence, community setup, and delivery rhythm into the blueprint so you have a complete operational design, not just content.",
  },
  {
    tip: "Your name, niche, and credentials are the anchor for everything that follows. AI uses these to personalise every section.",
    why: "Write every heading, case study, and sales angle with your actual name, niche, and specific credibility signals — not generic placeholders.",
  },
  {
    tip: "Your story isn't background — it's your most powerful marketing asset. Be specific, vulnerable, and real. Unpolished is fine.",
    why: "Your origin, mistakes, and transformation become the narrative thread woven through the product — the reason why YOU are the right teacher.",
  },
  {
    tip: "Real numbers, real names, real timelines. Specificity is the only thing that makes proof believable.",
    why: "Build sales page case studies, testimonial blocks, and credibility sections directly from what you share here — used verbatim.",
  },
  {
    tip: "Think of one specific person. Write like you're describing them to a therapist — daily life, inner monologue, past failures, and the secret desire they'd never say aloud.",
    why: "Write marketing copy, module titles, and lesson hooks in your audience's exact words. Vague avatars produce vague, unconvincing copy.",
  },
  {
    tip: "This is the intellectual core of your product — your signature method. Even if rough, write it out and give it a name. The name is the product.",
    why: "Design the entire curriculum and week-by-week roadmap around your specific framework — not a generic course template.",
  },
  {
    tip: "Your strongest marketing angles come from your most controversial beliefs. Don't soften — the bolder the take, the more magnetic.",
    why: "Pull lesson hooks that challenge assumptions, write sales page angles that call out industry myths, and build a voice that's distinctly yours.",
  },
  {
    tip: "Dump everything here — PDFs, raw notes, how you explain it on calls, best client stories. Your words, your voice. More = more personalised.",
    why: "Reference your specific examples, use your frameworks, and write in your language — not generic course-creator language.",
  },
  {
    tip: "Map the emotional arc, not just the logistics. First 24 hours should feel like checking into a 5-star hotel, not getting a receipt.",
    why: "Build your onboarding sequence, accountability system, and graduation experience as complete, usable frameworks — not just bullet points.",
  },
  {
    tip: "Set the commercial context — price, launch plan, audience size. This shapes how everything else is calibrated.",
    why: "Design three pricing tiers with specific justifications, build a launch plan that matches your audience size, and calibrate the bonus stack.",
  },
];

const INITIAL_DATA: WizardData = {
  productType: "", deliveryMode: "", duration: "", customDuration: "",
  moduleCount: "", lessonsPerModule: "", lessonLength: "", callCadence: "none",
  callLength: "", communityPlatform: "none", hostingPlatform: "", hasCertification: false,
  creatorName: "", brandName: "", niche: "", subNiche: "", yearsExperience: "",
  originStory: "", personalTransformation: "", biggestMistake: "", wishKnownEarlier: "",
  credentials: "", influences: "", knownFor: "",
  biggestPersonalResult: "", clientResults: "", caseStudies: "", testimonials: "", socialProof: "",
  audienceDescription: "", ageRange: "", careerStage: "", topFrustrations: "",
  triedBefore: "", realReason: "", verbatimLanguage: "", beforePicture: "", afterPicture: "",
  biggestFear: "", secretDesire: "", wherePlatforms: "",
  frameworkName: "", frameworkDescription: "", differentiator: "", phases: "",
  quickWin: "", ahaMoment: "", weeklyMilestones: "", moduleIdeas: "", assignments: "", toolsRequired: "",
  coreBelief: "", teachingPhilosophy: "", contrarianTakes: "", biggestMyth: "", coreRules: "", mentorValues: "",
  pdfs: [], ownFrameworkText: "", existingContent: "", deepCaseStudies: "", communityRules: "",
  first24Hours: "", accountabilityMechanisms: "", supportChannel: "", graduationExperience: "",
  postCompletion: "", upsellOffer: "",
  pricePoint: "", pricingModel: "", firstCohortSize: "", revenueGoal: "",
  ranBefore: "", previousResults: "", marketingChannels: "", audienceSizes: "", competitors: "", yourEdge: "",
};

const STORAGE_KEY = "mentorkit_draft_v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function stepCompletion(stepIdx: number, form: WizardData): number {
  const fields = STEP_ALL_FIELDS[stepIdx];
  if (!fields) return 0;
  const filled = fields.filter(f => {
    const v = (form as any)[f];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "boolean") return v;
    return typeof v === "string" && v.trim().length > 1;
  }).length;
  return Math.round((filled / fields.length) * 100);
}

function fmtInline(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-white/80">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 text-purple-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>');
}

function renderMd(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    if (!line.trim()) { elements.push(<div key={key++} className="h-2" />); continue; }
    if (line.startsWith("### ")) { elements.push(<h3 key={key++} className="text-white font-semibold text-sm mt-5 mb-1.5">{line.slice(4)}</h3>); continue; }
    if (line.startsWith("## ")) { elements.push(<h2 key={key++} className="text-white font-bold text-base mt-7 mb-2 pb-2 border-b border-white/[0.07]">{line.slice(3)}</h2>); continue; }
    if (line.startsWith("# ")) { elements.push(<h1 key={key++} className="text-white font-bold text-lg mt-5 mb-2">{line.slice(2)}</h1>); continue; }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<div key={key++} className="flex gap-2 text-white/65 text-xs py-0.5"><span className="text-purple-400 mt-1 shrink-0">•</span><span dangerouslySetInnerHTML={{ __html: fmtInline(line.slice(2)) }} /></div>);
      continue;
    }
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      elements.push(<div key={key++} className="flex gap-2 text-white/65 text-xs py-0.5"><span className="text-purple-400 shrink-0 font-mono mt-0.5">{numMatch[1]}.</span><span dangerouslySetInnerHTML={{ __html: fmtInline(numMatch[2]) }} /></div>);
      continue;
    }
    if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(<p key={key++} className="text-white font-semibold text-xs mt-2 mb-1">{line.slice(2, -2)}</p>);
      continue;
    }
    elements.push(<p key={key++} className="text-white/60 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: fmtInline(line) }} />);
  }
  return elements;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StepGuide({ tip, why, est, onFillStep, filling }: {
  tip: string; why: string; est?: string; onFillStep?: () => void; filling?: boolean;
}) {
  return (
    <div className="mb-7 flex gap-3 bg-white/[0.025] border border-white/[0.06] rounded-xl p-4">
      <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Info className="w-2.5 h-2.5 text-purple-400" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-white/50 text-xs leading-relaxed">{tip}</p>
          {est && <span className="text-[10px] text-white/20 shrink-0 mt-0.5">{est}</span>}
        </div>
        <p className="text-xs leading-relaxed">
          <span className="text-purple-400/80 font-medium">AI uses this to: </span>
          <span className="text-purple-300/45">{why}</span>
        </p>
        {onFillStep && (
          <button
            type="button"
            onClick={onFillStep}
            disabled={filling}
            className="mt-1.5 flex items-center gap-1.5 text-[11px] text-purple-400/70 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {filling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            {filling ? "Filling step…" : "Fill entire step with AI"}
          </button>
        )}
      </div>
    </div>
  );
}

// Needed in StepGuide
function Info({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function Field({ label, optional, hint, fieldKey, aiState, onRefine, onAccept, onDismiss, children }: {
  label: string; optional?: boolean; hint?: string; children: React.ReactNode;
} & FieldAiProps) {
  const isThis = !!(fieldKey && aiState?.field === fieldKey);
  const loading = isThis && aiState!.loading;
  const hasSuggestion = isThis && !aiState!.loading && !!aiState!.suggestion;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-white/80">{label}</span>
        {optional && <span className="text-[10px] font-medium text-white/30 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">optional</span>}
        {onRefine && (
          <button type="button" onClick={onRefine} disabled={!!loading}
            className="ml-auto flex items-center gap-1 text-[11px] text-purple-400/55 hover:text-purple-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            {loading ? "Writing…" : "Refine with AI"}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-white/35 leading-relaxed">{hint}</p>}
      {children}
      {hasSuggestion && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="mt-1 rounded-xl border border-purple-500/25 bg-purple-500/[0.05] p-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="text-[11px] font-medium text-purple-400">AI suggestion</span>
          </div>
          <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{aiState!.suggestion}</p>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => onAccept?.(aiState!.suggestion)}
              className="text-xs bg-purple-500 hover:bg-purple-400 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
              Use this
            </button>
            <button type="button" onClick={onDismiss}
              className="text-xs text-white/35 hover:text-white/60 px-2 py-1.5 transition-colors">
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ChoiceGrid({ options, value, onChange, cols = 2 }: {
  options: { id: string; label: string; sub?: string; icon?: any; gradient?: string }[];
  value: string; onChange: (id: string) => void; cols?: number;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(opt => {
        const Icon = opt.icon;
        const sel = value === opt.id;
        return (
          <button key={opt.id} type="button" onClick={() => onChange(opt.id)}
            className={`text-left p-3 rounded-xl border transition-all duration-150 ${sel ? "border-purple-500 bg-purple-500/15" : "border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"}`}>
            {Icon && (
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${opt.gradient} flex items-center justify-center mb-2`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className="text-sm font-medium text-white leading-tight">{opt.label}</div>
            {opt.sub && <div className="text-xs text-white/35 mt-0.5 leading-snug">{opt.sub}</div>}
            {sel && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 mt-1.5" />}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3">
      <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors duration-200 ${checked ? "bg-purple-500" : "bg-white/15"}`}>
        <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <span className="text-sm text-white/70">{label}</span>
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="text-[10px] text-white/25 uppercase tracking-widest font-medium">{label}</span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

function TA({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder: string; rows?: number;
}) {
  return (
    <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 resize-none focus:border-purple-500/50 text-sm leading-relaxed" />
  );
}

function TF({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-purple-500/50 h-10 text-sm" />
  );
}

// ─── Step 1 — What Are You Building? ─────────────────────────────────────────
// Fast: just productType + duration. ~1 min.

function Step1({ d, u }: { d: WizardData; u: UpdateFn }) {
  const g = STEP_GUIDES[0];
  return (
    <div className="space-y-6">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[0].est} />
      <Field label="What are you building?">
        <ChoiceGrid options={PRODUCT_TYPES} value={d.productType} onChange={v => u("productType", v)} cols={2} />
      </Field>
      <Divider label="Duration" />
      <Field label="How long is your program?">
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map(opt => (
            <button key={opt.id} type="button" onClick={() => u("duration", opt.id)}
              className={`p-2.5 rounded-lg border text-center transition-all text-sm ${d.duration === opt.id ? "border-purple-500 bg-purple-500/15 text-white" : "border-white/[0.07] bg-white/[0.02] text-white/50 hover:border-white/20"}`}>
              {opt.label}
            </button>
          ))}
        </div>
        {d.duration === "custom" && (
          <div className="mt-2">
            <TF value={d.customDuration} onChange={v => u("customDuration", v)} placeholder='e.g. "10 weeks" or "90 days"' />
          </div>
        )}
      </Field>
    </div>
  );
}

// ─── Step 2 — Delivery & Structure ────────────────────────────────────────────

function Step2({ d, u }: { d: WizardData; u: UpdateFn }) {
  const g = STEP_GUIDES[1];
  return (
    <div className="space-y-6">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[1].est} />
      <Field label="How will students access your content?">
        <ChoiceGrid options={DELIVERY_MODES} value={d.deliveryMode} onChange={v => u("deliveryMode", v)} cols={2} />
      </Field>
      <Divider label="Structure" />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Modules" optional><TF value={d.moduleCount} onChange={v => u("moduleCount", v)} placeholder="e.g. 8" /></Field>
        <Field label="Lessons/module" optional><TF value={d.lessonsPerModule} onChange={v => u("lessonsPerModule", v)} placeholder="e.g. 4–6" /></Field>
        <Field label="Lesson length" optional><TF value={d.lessonLength} onChange={v => u("lessonLength", v)} placeholder="e.g. 15 min" /></Field>
      </div>
      <Divider label="Live Calls" />
      <Field label="Call cadence" optional>
        <div className="grid grid-cols-3 gap-2">
          {CALL_CADENCES.map(opt => (
            <button key={opt.id} type="button" onClick={() => u("callCadence", opt.id)}
              className={`p-2.5 rounded-lg border text-center text-xs transition-all ${d.callCadence === opt.id ? "border-purple-500 bg-purple-500/15 text-white" : "border-white/[0.07] bg-white/[0.02] text-white/50 hover:border-white/20"}`}>
              {opt.label}
            </button>
          ))}
        </div>
        {d.callCadence !== "none" && (
          <div className="mt-2">
            <TF value={d.callLength} onChange={v => u("callLength", v)} placeholder='Session length e.g. "60 minutes"' />
          </div>
        )}
      </Field>
      <Divider label="Community & Platform" />
      <Field label="Student community" optional>
        <div className="grid grid-cols-3 gap-2">
          {COMMUNITY_PLATFORMS.map(opt => (
            <button key={opt.id} type="button" onClick={() => u("communityPlatform", opt.id)}
              className={`p-2.5 rounded-lg border text-center text-xs transition-all ${d.communityPlatform === opt.id ? "border-purple-500 bg-purple-500/15 text-white" : "border-white/[0.07] bg-white/[0.02] text-white/50 hover:border-white/20"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hosting platform" optional hint="Where students access content">
          <TF value={d.hostingPlatform} onChange={v => u("hostingPlatform", v)} placeholder="Kajabi, Teachable, Skool..." />
        </Field>
        <Field label="Certification on completion" optional>
          <div className="h-10 flex items-center">
            <Toggle checked={d.hasCertification} onChange={v => u("hasCertification", v)} label="Include certificate" />
          </div>
        </Field>
      </div>
    </div>
  );
}

// ─── Step 3 — About You (facts only, no AI fill) ───────────────────────────────

function Step3({ d, u }: { d: WizardData; u: UpdateFn }) {
  const g = STEP_GUIDES[2];
  return (
    <div className="space-y-5">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[2].est} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Your name"><TF value={d.creatorName} onChange={v => u("creatorName", v)} placeholder="Your full name" /></Field>
        <Field label="Brand / business name" optional><TF value={d.brandName} onChange={v => u("brandName", v)} placeholder="e.g. Elevate Coaching Co." /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Your niche" hint="Be specific — not 'fitness' but 'fat loss for busy mums over 40'">
          <TF value={d.niche} onChange={v => u("niche", v)} placeholder="e.g. Instagram growth for fitness coaches" />
        </Field>
        <Field label="Sub-niche" optional><TF value={d.subNiche} onChange={v => u("subNiche", v)} placeholder="even more specific angle" /></Field>
      </div>
      <Field label="Years of experience in this niche" optional>
        <div className="w-48"><TF value={d.yearsExperience} onChange={v => u("yearsExperience", v)} placeholder='e.g. "7 years"' /></div>
      </Field>
      <Divider label="Credibility" />
      <Field label="Credentials, certifications, media features" optional hint="Anything that legitimises you — courses, certifications, press, education, awards.">
        <TA value={d.credentials} onChange={v => u("credentials", v)} rows={2}
          placeholder="E.g. Certified in X, NLP Practitioner, featured in Forbes / BBC, degree in Y..." />
      </Field>
      <Field label="What people always come to you for" optional hint="Your informal reputation in your network.">
        <TF value={d.knownFor} onChange={v => u("knownFor", v)} placeholder='e.g. "Everyone asks me how I got to $50k/month from freelancing"' />
      </Field>
    </div>
  );
}

// ─── Step 4 — Your Story ──────────────────────────────────────────────────────

function Step4({ d, u, rp }: { d: WizardData; u: UpdateFn; rp: RefineProps }) {
  const g = STEP_GUIDES[3];
  const ai = (field: keyof WizardData, label: string): FieldAiProps => ({
    fieldKey: String(field), aiState: rp.aiRefine,
    onRefine: () => rp.refine(field, label),
    onAccept: (val) => { u(field, val); rp.clearAi(); },
    onDismiss: rp.clearAi,
  });
  return (
    <div className="space-y-5">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[3].est} onFillStep={rp.fillStep} filling={rp.filling} />
      <Field label="Your origin story" hint="How did you discover this topic? Be honest, specific, and vulnerable." {...ai("originStory", "Your origin story")}>
        <TA value={d.originStory} onChange={v => u("originStory", v)} rows={5}
          placeholder={"I discovered [topic] when I was [situation]. I remember the exact moment...\n\nI had been [struggle] for [time] when [pivotal event]. That changed everything.\n\nIt led me to [what you did] which eventually brought me to [where you are today]."} />
      </Field>
      <Field label="Your personal transformation" hint="Before vs after mastering this — specific numbers and timeframe." {...ai("personalTransformation", "Your personal transformation — before and after with numbers")}>
        <TA value={d.personalTransformation} onChange={v => u("personalTransformation", v)} rows={4}
          placeholder={"Before: I was [struggling with X, making $Y/month, feeling Z]...\n\nAfter: I now [specific result with numbers]. In [timeframe] I [achievement]."} />
      </Field>
      <Field label="Your biggest early mistake" hint="The costly mistake you now save others from." {...ai("biggestMistake", "Your biggest early mistake and what it cost you")}>
        <TA value={d.biggestMistake} onChange={v => u("biggestMistake", v)} rows={3}
          placeholder={"My biggest early mistake was [specific thing]. It cost me [time/money/clients].\n\nI now know the real reason was [insight]."} />
      </Field>
      <Field label="What you wish someone told you at the start" optional {...ai("wishKnownEarlier", "What you wish you'd known at the start")}>
        <TA value={d.wishKnownEarlier} onChange={v => u("wishKnownEarlier", v)} rows={3}
          placeholder={"I wish I had known that [insight]. If I'd started with [this] instead of [that], I'd have reached [result] [X months] earlier."} />
      </Field>
      <Field label="Influences — mentors, books, programs that shaped you" optional {...ai("influences", "The mentors, books, and programs that shaped your thinking")}>
        <TA value={d.influences} onChange={v => u("influences", v)} rows={2}
          placeholder={"Big influences: [Person 1 — what their idea changed for me], [Person 2], [Book — the key insight]..."} />
      </Field>
    </div>
  );
}

// ─── Step 5 — Your Proof ──────────────────────────────────────────────────────

function Step5({ d, u, rp }: { d: WizardData; u: UpdateFn; rp: RefineProps }) {
  const g = STEP_GUIDES[4];
  const ai = (field: keyof WizardData, label: string): FieldAiProps => ({
    fieldKey: String(field), aiState: rp.aiRefine,
    onRefine: () => rp.refine(field, label),
    onAccept: (val) => { u(field, val); rp.clearAi(); },
    onDismiss: rp.clearAi,
  });
  return (
    <div className="space-y-5">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[4].est} onFillStep={rp.fillStep} filling={rp.filling} />
      <Field label="Your single biggest personal result" hint="The ONE result you'd put on a billboard. Specific number." {...ai("biggestPersonalResult", "Your single biggest personal result — the billboard headline of your credibility")}>
        <TA value={d.biggestPersonalResult} onChange={v => u("biggestPersonalResult", v)} rows={3}
          placeholder={"e.g. Went from $2k/month to $47k/month in 11 months using the exact system I now teach.\nOr: Built an audience of 230k in under 14 months. Quit my job at month 4."} />
      </Field>
      <Field label="Top 3 client / student results" hint="Real names, real numbers, before/after, timeframe." {...ai("clientResults", "Your top 3 client results — specific, with names and numbers")}>
        <TA value={d.clientResults} onChange={v => u("clientResults", v)} rows={9}
          placeholder={"1. [Client / \"female fitness coach from London\"] — before: [situation]. After [timeframe]: [specific result].\n\n2. [Client] went from [before] to [after] in [timeframe].\n\n3. [Client]..."} />
      </Field>
      <Field label="Full case studies (paste raw)" optional hint="Long-form client stories. Before → process → after → quote." {...ai("caseStudies", "A full client case study — before, the journey, after, and their direct quote")}>
        <TA value={d.caseStudies} onChange={v => u("caseStudies", v)} rows={9}
          placeholder={"[Client] came to me when [full situation]. They had tried [X, Y, Z] but [why those failed].\n\nOver [timeframe] we worked on [what you did together].\n\nBy week [X]: [milestone]. Breakthrough: [pivotal moment].\n\nFinal result: [numbers, life changes].\n\n\"[Their direct quote]\" — [Name, title]"} />
      </Field>
      <Field label="Testimonials (paste exactly as written)" optional {...ai("testimonials", "Raw client testimonials in their exact words")}>
        <TA value={d.testimonials} onChange={v => u("testimonials", v)} rows={6}
          placeholder={"\"[Exact quote — keep their words, grammar, enthusiasm]\" — [Name, context]\n\n\"[Another testimonial]\" — [Name]"} />
      </Field>
      <Field label="Social proof numbers" optional hint="Audience size, students taught, years in business, revenue milestones.">
        <TF value={d.socialProof} onChange={v => u("socialProof", v)} placeholder="e.g. 52k Instagram, 14k email list, 700+ students taught, £3.2M in client revenue" />
      </Field>
    </div>
  );
}

// ─── Step 6 — Your Audience ───────────────────────────────────────────────────

function Step6({ d, u, rp }: { d: WizardData; u: UpdateFn; rp: RefineProps }) {
  const g = STEP_GUIDES[5];
  const ai = (field: keyof WizardData, label: string): FieldAiProps => ({
    fieldKey: String(field), aiState: rp.aiRefine,
    onRefine: () => rp.refine(field, label),
    onAccept: (val) => { u(field, val); rp.clearAi(); },
    onDismiss: rp.clearAi,
  });
  return (
    <div className="space-y-5">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[5].est} onFillStep={rp.fillStep} filling={rp.filling} />
      <Field label="Describe your ideal student in a full paragraph" hint="Paint a vivid picture. Daily life, where stuck, what they want." {...ai("audienceDescription", "A vivid paragraph describing the ideal student")}>
        <TA value={d.audienceDescription} onChange={v => u("audienceDescription", v)} rows={6}
          placeholder={"My ideal student is [give them a name]. They're [age, job, situation]. Every day they [routine]. They've been trying to [goal] for [time] but keep hitting [wall].\n\nThey care deeply about [value] but struggle with [block]. They're not lazy — they're [what they actually are]."} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Age range" optional><TF value={d.ageRange} onChange={v => u("ageRange", v)} placeholder="e.g. 25–42" /></Field>
        <Field label="Career stage / situation" optional><TF value={d.careerStage} onChange={v => u("careerStage", v)} placeholder="e.g. early-career freelancer, 9–5 wanting out" /></Field>
      </div>
      <Divider label="Pain Points" />
      <Field label="Their top 3 daily frustrations" hint="Their exact words — things they type into Google at midnight." {...ai("topFrustrations", "Top 3 daily frustrations of the ideal student — in their own words")}>
        <TA value={d.topFrustrations} onChange={v => u("topFrustrations", v)} rows={5}
          placeholder={"1. \"I keep posting but nothing grows. I feel invisible.\"\n2. \"I see others making good money doing this but I can't figure out what I'm doing wrong.\"\n3. \"I know I have the knowledge but I don't know how to package it.\""} />
      </Field>
      <Field label="What have they already tried that didn't work?" hint="Previous courses, methods, coaches — and WHY they failed." {...ai("triedBefore", "What the ideal student has already tried and why it didn't work")}>
        <TA value={d.triedBefore} onChange={v => u("triedBefore", v)} rows={5}
          placeholder={"They've already tried:\n— [Free YouTube / generic content]: surface-level, no accountability\n— [A course from [guru]]: not tailored to their specific situation\n— DIY for [X months]: tools and effort with no results\n\nRoot cause: [your diagnosis]"} />
      </Field>
      <Field label="The REAL reason they haven't achieved their goal yet" hint="Not the surface reason. The deep psychological or belief-level block." {...ai("realReason", "The real underlying reason the ideal student hasn't achieved their goal yet")}>
        <TA value={d.realReason} onChange={v => u("realReason", v)} rows={3}
          placeholder={"The real reason isn't lack of knowledge or effort — it's [belief / identity / missing system / wrong order].\n\nThey don't realise yet that [insight]. Until someone shows them [thing], they'll keep [symptom]."} />
      </Field>
      <Field label="The exact words they use to describe their problem" hint="Verbatim phrases from DMs, discovery calls, comments — their language, not yours." {...ai("verbatimLanguage", "Verbatim phrases the ideal student uses to describe their problem")}>
        <TA value={d.verbatimLanguage} onChange={v => u("verbatimLanguage", v)} rows={5}
          placeholder={"Real phrases I've heard them say:\n\n\"I just don't know where to start and every time I try I end up in a rabbit hole.\"\n\"I feel like I'm spinning my wheels — busy but no progress.\"\n\"Everyone else seems to have figured it out except me.\""} />
      </Field>
      <Divider label="Before & After" />
      <Field label="Their life BEFORE your program" hint="Their Tuesday morning right now. Make them feel seen." {...ai("beforePicture", "Vivid before-picture — their life right now before working with you")}>
        <TA value={d.beforePicture} onChange={v => u("beforePicture", v)} rows={4}
          placeholder={"Right now [name] wakes up and immediately checks their phone hoping for [thing] but sees [reality]. They spend [X hours] on [activity] that gets them nowhere. They feel [emotion]. Their [metric] is [where it's at]."} />
      </Field>
      <Field label="Their life AFTER completing your program" hint="90 days post-completion. Tangible and emotional." {...ai("afterPicture", "Vivid after-picture — their life 90 days after completing the program")}>
        <TA value={d.afterPicture} onChange={v => u("afterPicture", v)} rows={4}
          placeholder={"After completing [program], [name] now [specific change]. Their [metric] went from [before] to [after]. They feel [new emotion]. For the first time, [something that matters to them personally]."} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Biggest fear / main objection before buying" optional {...ai("biggestFear", "The ideal student's biggest fear and main objection before buying")}>
          <TA value={d.biggestFear} onChange={v => u("biggestFear", v)} rows={3}
            placeholder={"Primary: \"What if I invest and it still doesn't work FOR ME specifically?\"\nSecondary: \"I don't think I have enough time.\"\nDeeper: \"What if I'm just not good enough?\""} />
        </Field>
        <Field label="Secret desire they'd never say out loud" optional {...ai("secretDesire", "The ideal student's secret desire — deeper than the stated goal")}>
          <TA value={d.secretDesire} onChange={v => u("secretDesire", v)} rows={3}
            placeholder={"Deep down, beyond [stated goal], they really want to [identity-level desire]. They want to prove [something] to [someone]. They want to be seen as [identity]."} />
        </Field>
      </div>
      <Field label="Where they hang out online" optional>
        <TF value={d.wherePlatforms} onChange={v => u("wherePlatforms", v)} placeholder="e.g. Instagram, YouTube, Reddit (r/entrepreneur), LinkedIn, TikTok" />
      </Field>
    </div>
  );
}

// ─── Step 7 — Your Framework ──────────────────────────────────────────────────

function Step7({ d, u, rp }: { d: WizardData; u: UpdateFn; rp: RefineProps }) {
  const g = STEP_GUIDES[6];
  const ai = (field: keyof WizardData, label: string): FieldAiProps => ({
    fieldKey: String(field), aiState: rp.aiRefine,
    onRefine: () => rp.refine(field, label),
    onAccept: (val) => { u(field, val); rp.clearAi(); },
    onDismiss: rp.clearAi,
  });
  return (
    <div className="space-y-5">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[6].est} onFillStep={rp.fillStep} filling={rp.filling} />
      <Field label="Name your framework / methodology" hint='Great names: The SCALE Method, The Creator Flywheel, The 5-Phase Growth System.' {...ai("frameworkName", "A compelling name for the creator's signature framework or methodology")}>
        <Input value={d.frameworkName} onChange={e => u("frameworkName", e.target.value)}
          placeholder='"The Authority Accelerator System" or "The 5-Phase Creator Blueprint"'
          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-purple-500/50 h-11 text-base font-medium" />
      </Field>
      <Field label="Describe your framework in your own words" hint="Write it like you're explaining on a coaching call — raw is fine." {...ai("frameworkDescription", "The creator's framework described in their own voice")}>
        <TA value={d.frameworkDescription} onChange={v => u("frameworkDescription", v)} rows={6}
          placeholder={"My framework works because it solves [root problem] first, before [what most people start with]. Most programs start with [X] — that's completely backwards.\n\nThe 3 core ideas at the heart of my method:\n1. [Idea 1]\n2. [Idea 2]\n3. [Idea 3]\n\nWhat makes this different: [key insight]."} />
      </Field>
      <Field label="What makes your approach fundamentally different?" {...ai("differentiator", "What makes this approach fundamentally different from everything else")}>
        <TA value={d.differentiator} onChange={v => u("differentiator", v)} rows={4}
          placeholder={"Unlike [other approaches] which [problem], my method [what you do differently].\n\nThe real reason this works where others don't: [insight].\n\nNo one else teaches [specific thing] because [reason]."} />
      </Field>
      <Divider label="Transformation Phases" />
      <Field label="What are the 3–5 phases of transformation?" hint="Name, weeks, goal, from → to for each phase." {...ai("phases", "The 3-5 transformation phases — name, duration, goal, from/to for each")}>
        <TA value={d.phases} onChange={v => u("phases", v)} rows={12}
          placeholder={"Phase 1 (Weeks 1–2): FOUNDATION\n  From: [before state]\n  To: [after state]\n  Key outcomes: [what they have / know / can do]\n\nPhase 2 (Weeks 3–5): MOMENTUM\n  From: [before state]\n  To: [after state]\n  Key outcomes: [...]\n\nPhase 3 (Weeks 6–8): ACCELERATION..."} />
      </Field>
      <Divider label="Quick Wins & Milestones" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quick win in Week 1" hint="Tangible result every student gets in first 7 days." {...ai("quickWin", "The specific tangible result every student gets in Week 1")}>
          <TA value={d.quickWin} onChange={v => u("quickWin", v)} rows={3}
            placeholder={"By end of Day 7, every student will have [specific result — something they've done or produced, not just learned]."} />
        </Field>
        <Field label="The engineered 'aha moment'" hint="The realisation that makes students believe this will work for them." {...ai("ahaMoment", "The engineered aha moment that makes students believe this will work")}>
          <TA value={d.ahaMoment} onChange={v => u("ahaMoment", v)} rows={3}
            placeholder={"The moment everything clicks is when students realise [insight — usually counterintuitive].\n\nThis usually hits around [week/module]."} />
        </Field>
      </div>
      <Field label="Week-by-week milestones — every single week" hint="What specific thing should be true at end of each week?" {...ai("weeklyMilestones", "Week-by-week milestone for the entire program — specific, one line each")}>
        <TA value={d.weeklyMilestones} onChange={v => u("weeklyMilestones", v)} rows={10}
          placeholder={"Week 1: Student has [specific action completed] and has [specific output].\nWeek 2: Student has [milestone]. They've built / created / tested [thing].\nWeek 3: Student now has [result]. First [metric] achieved.\nWeek 4: Midpoint — student has [checkpoint deliverable].\n[Continue for every week...]"} />
      </Field>
      <Field label="Module ideas — rough is fine" hint="What content to cover? AI will structure and expand." {...ai("moduleIdeas", "Module ideas and specific lessons the creator wants included")}>
        <TA value={d.moduleIdeas} onChange={v => u("moduleIdeas", v)} rows={8}
          placeholder={"Module 1: [Title] — I want to cover [topics / concepts]\nModule 2: [Title] — [topics]\nModule 3: [Title] — [topics]\n...\n\nSpecific lessons I definitely want:\n- [Lesson idea 1]\n- [Lesson idea 2]"} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Assignments & homework" optional {...ai("assignments", "Assignments and homework — what students do and how accountability works")}>
          <TA value={d.assignments} onChange={v => u("assignments", v)} rows={4}
            placeholder={"After Module 1: [Specific task]\nAfter Module 2: [Deliverable]\nWeekly habit: [Practice / ritual]\nCapstone: [Final project]"} />
        </Field>
        <Field label="Tools, templates & resources" optional {...ai("toolsRequired", "Tools, templates, and resources students will need or receive")}>
          <TA value={d.toolsRequired} onChange={v => u("toolsRequired", v)} rows={4}
            placeholder={"Required: [tool 1], [tool 2]\nRecommended: [tool 3]\n\nI'll provide:\n- [Template 1]\n- [Worksheet / workbook]\n- [Swipe file]"} />
        </Field>
      </div>
    </div>
  );
}

// ─── Step 8 — Your Philosophy ─────────────────────────────────────────────────

function Step8({ d, u, rp }: { d: WizardData; u: UpdateFn; rp: RefineProps }) {
  const g = STEP_GUIDES[7];
  const ai = (field: keyof WizardData, label: string): FieldAiProps => ({
    fieldKey: String(field), aiState: rp.aiRefine,
    onRefine: () => rp.refine(field, label),
    onAccept: (val) => { u(field, val); rp.clearAi(); },
    onDismiss: rp.clearAi,
  });
  return (
    <div className="space-y-5">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[7].est} onFillStep={rp.fillStep} filling={rp.filling} />
      <Field label="Your core belief" hint="The one idea about your space you'd bet everything on." {...ai("coreBelief", "The creator's core belief — the foundational idea they'd stake everything on")}>
        <TA value={d.coreBelief} onChange={v => u("coreBelief", v)} rows={4}
          placeholder={"I fundamentally believe that [statement]. This is why I built everything around [approach].\n\nMost people in [niche] think [common belief], but the truth is [your counter-belief]. I've seen this proven every time a client does [thing]."} />
      </Field>
      <Field label="Your teaching philosophy" hint="How do you believe people actually learn and change?" {...ai("teachingPhilosophy", "The creator's teaching philosophy — how they believe people actually learn")}>
        <TA value={d.teachingPhilosophy} onChange={v => u("teachingPhilosophy", v)} rows={4}
          placeholder={"I believe people learn best through [approach — doing / storytelling / implementation sprints].\n\nThat's why in my program I [specific structural decisions].\n\nI don't believe in [what you reject]. My teaching is built on [3 principles]."} />
      </Field>
      <Divider label="Contrarian Takes" />
      <Field label="Your top 3–5 contrarian takes" hint="What do you disagree with that most others teach? Be bold." {...ai("contrarianTakes", "The creator's top 3-5 contrarian takes — bold positions against conventional wisdom")}>
        <TA value={d.contrarianTakes} onChange={v => u("contrarianTakes", v)} rows={12}
          placeholder={"1. Most people say [popular advice] — I think that's actively harmful because [reason]. What actually works: [your take].\n\n2. The entire [niche] industry is obsessed with [thing] but nobody talks about [what actually matters].\n\n3. You've probably been told to [common advice]. That's completely backwards. You should [your counter-advice] first because [reason].\n\n4. [Guru] teaches [advice] — here's exactly why that backfires for most students: [explanation]."} />
      </Field>
      <Field label="The #1 myth you want to bust" {...ai("biggestMyth", "The #1 myth in the creator's niche that actively harms the people they serve")}>
        <TA value={d.biggestMyth} onChange={v => u("biggestMyth", v)} rows={4}
          placeholder={"The biggest lie in [niche] is [myth — stated confidently].\n\nHere's the truth: [reality].\n\nI've seen [specific evidence]. The reason this myth persists: [why people believe it]."} />
      </Field>
      <Divider label="Your Rules & Values" />
      <Field label="Your 3 core rules as a mentor" hint="What principles do you operate by? What would you never compromise on?" {...ai("coreRules", "The creator's 3 core rules as a mentor — non-negotiable principles")}>
        <TA value={d.coreRules} onChange={v => u("coreRules", v)} rows={5}
          placeholder={"Rule 1: [Name] — [What it means and why. The consequence of violating it.]\n\nRule 2: [Name] — [Explanation.]\n\nRule 3: [Name] — [Explanation.]\n\nWhat I WILL NOT do: [list of things you refuse to do]"} />
      </Field>
      <Field label="Values as a mentor / what students say about working with you" optional {...ai("mentorValues", "The creator's values as a mentor — what students say about working with them")}>
        <TA value={d.mentorValues} onChange={v => u("mentorValues", v)} rows={3}
          placeholder={"Students describe working with me as [words — no-BS, warm but direct, etc.]. I'm known for [trait] and [trait]. I show up as [description of your energy as a teacher]."} />
      </Field>
    </div>
  );
}

// ─── Step 9 — Knowledge Upload (no fill-step button) ─────────────────────────

function Step9({ d, u, rp, onPdfUpload, uploadingPdf }: {
  d: WizardData; u: UpdateFn; rp: RefineProps; onPdfUpload: (f: File) => void; uploadingPdf: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const g = STEP_GUIDES[8];
  const ai = (field: keyof WizardData, label: string): FieldAiProps => ({
    fieldKey: String(field), aiState: rp.aiRefine,
    onRefine: () => rp.refine(field, label),
    onAccept: (val) => { u(field, val); rp.clearAi(); },
    onDismiss: rp.clearAi,
  });
  return (
    <div className="space-y-6">
      {/* No onFillStep — user's own raw content, AI can't fill it meaningfully */}
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[8].est} />
      <Field label="Upload your existing knowledge base (PDFs)"
        hint="Slide decks, workshop materials, frameworks, research, past course content. Up to 5 PDFs.">
        <div className="border-2 border-dashed border-white/[0.08] rounded-xl p-7 text-center cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/[0.03] transition-all duration-200"
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf").forEach(onPdfUpload); }}
          onDragOver={e => e.preventDefault()}>
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden"
            onChange={e => { Array.from(e.target.files || []).forEach(onPdfUpload); e.target.value = ""; }} />
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
            {uploadingPdf ? <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-5 h-5 text-white/40" />}
          </div>
          <p className="text-white/60 text-sm font-medium mb-1">{uploadingPdf ? "Extracting text..." : "Drop PDFs here or click to browse"}</p>
          <p className="text-white/25 text-xs">Up to 5 PDFs · 20MB each</p>
        </div>
        {d.pdfs.length > 0 && (
          <div className="space-y-2 mt-2">
            {d.pdfs.map((pdf, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/[0.08] rounded-lg px-4 py-3">
                <FileUp className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{pdf.name}</p>
                  <p className="text-white/30 text-xs">{pdf.wordCount.toLocaleString()} words extracted</p>
                </div>
                <button onClick={() => u("pdfs", d.pdfs.filter((_, idx) => idx !== i))} className="text-white/25 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>
      <Divider label="Paste Your Content" />
      <Field label="Your framework in your own words" hint="Explain it like you're on a coaching call right now. Unpolished, raw, in your voice." {...ai("ownFrameworkText", "The creator's framework in their own raw voice — like explaining it on a coaching call")}>
        <TA value={d.ownFrameworkText} onChange={v => u("ownFrameworkText", v)} rows={8}
          placeholder={"Just talk. Write it out like you're explaining to someone on a Zoom call right now:\n\n— Your framework in your own words\n— A transcript from a coaching call or voice memo\n— The way you explain this on discovery calls\n— Your standard advice for the #1 problem your students face\n\nWrite it messy. The AI knows what to do with it."} />
      </Field>
      <Field label="Paste any existing content around this topic" optional hint="Blog posts, newsletters, social captions, video scripts, email sequences." {...ai("existingContent", "Sample of the creator's existing content — blog posts, newsletters, scripts in their voice")}>
        <TA value={d.existingContent} onChange={v => u("existingContent", v)} rows={7}
          placeholder={"Paste your existing content here. The AI will match your voice and style, pull your specific examples, and build the curriculum in language your audience already knows."} />
      </Field>
      <Field label="Extended client case studies" optional {...ai("deepCaseStudies", "A full extended client case study — month by month journey, breakthrough, final result")}>
        <TA value={d.deepCaseStudies} onChange={v => u("deepCaseStudies", v)} rows={8}
          placeholder={"Client: [Name or descriptor]\nStarted: [When / their situation]\nReal challenge: [What was actually going on]\nMonth by month:\n  — Month 1: [What happened]\n  — Month 2: [Progress]\n  — Month 3: [Breakthrough]\nResult: [Specific outcome — numbers, life changes]\nIn their words: \"[Direct quote]\""} />
      </Field>
      <Field label="Community rules, student expectations & your promise" optional {...ai("communityRules", "Community rules, student expectations, and what you personally promise every student")}>
        <TA value={d.communityRules} onChange={v => u("communityRules", v)} rows={4}
          placeholder={"In my community:\n— [Rule 1]\n— [Rule 2]\n\nI expect students to: [commitments / mindset]\n\nIn return, I promise: [what you personally commit to]"} />
      </Field>
    </div>
  );
}

// ─── Step 10 — Student Experience ────────────────────────────────────────────

function Step10({ d, u, rp }: { d: WizardData; u: UpdateFn; rp: RefineProps }) {
  const g = STEP_GUIDES[9];
  const ai = (field: keyof WizardData, label: string): FieldAiProps => ({
    fieldKey: String(field), aiState: rp.aiRefine,
    onRefine: () => rp.refine(field, label),
    onAccept: (val) => { u(field, val); rp.clearAi(); },
    onDismiss: rp.clearAi,
  });
  return (
    <div className="space-y-5">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[9].est} onFillStep={rp.fillStep} filling={rp.filling} />
      <Field label="What happens in a student's first 24 hours?" hint="Map exactly what they receive, do, and feel in the first day." {...ai("first24Hours", "The exact first 24 hours after a student joins — what they receive, do, and feel")}>
        <TA value={d.first24Hours} onChange={v => u("first24Hours", v)} rows={6}
          placeholder={"Immediately after payment:\n— [Welcome email arrives — what it says, emotional tone]\n— [Access granted to — platform, community, first module]\n— [First action — specific and doable in 30 minutes]\n\nWithin 3 hours:\n— [Community intro prompt / kickoff video]\n\nEnd of Day 1:\n— Student has [specific thing done or understood]\n— They feel [emotion — welcomed, excited, clear, capable]"} />
      </Field>
      <Field label="Accountability mechanisms" hint="How do you prevent the 'ghost student' who joins and disappears?" {...ai("accountabilityMechanisms", "The accountability mechanisms that prevent ghost students")}>
        <TA value={d.accountabilityMechanisms} onChange={v => u("accountabilityMechanisms", v)} rows={5}
          placeholder={"— Weekly check-in in community (Monday: set intention / Friday: share win)\n— Accountability buddy system (paired in Week 1)\n— Progress milestones tagged in community\n— Hot seat call for anyone falling behind\n— [DM check-ins if student goes quiet for X days]"} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Support setup" optional {...ai("supportChannel", "How support works — where students ask questions, response times, office hours")}>
          <TA value={d.supportChannel} onChange={v => u("supportChannel", v)} rows={4}
            placeholder={"Questions via: [Slack / community / email]\nResponse time: [within 24hrs / office hours only]\nOffice hours: [days/times]\nDirect access to me: [yes/no — when/how]"} />
        </Field>
        <Field label="Graduation experience" optional {...ai("graduationExperience", "The graduation experience — what happens when a student completes")}>
          <TA value={d.graduationExperience} onChange={v => u("graduationExperience", v)} rows={4}
            placeholder={"When a student completes:\n— [Certificate — what it says, how delivered]\n— [Graduation call / celebration]\n— [Featured in community / shared on social]\n— [Testimonial / case study request]\n— [Alumni badge / special access]"} />
        </Field>
      </div>
      <Field label="What happens after graduation?" optional hint="Alumni community, next program, referral offer." {...ai("postCompletion", "What happens after graduation — alumni access, next steps, referral program")}>
        <TA value={d.postCompletion} onChange={v => u("postCompletion", v)} rows={3}
          placeholder={"Graduates get:\n— [Lifetime / 1-year alumni community access]\n— [Private alumni call / monthly mastermind]\n— [Discount / priority access to next program]\n— [Referral program — what they get for sending people]"} />
      </Field>
      <Field label="Upsell / next-tier offer" optional hint="The natural next step for graduates who want to go deeper.">
        <TF value={d.upsellOffer} onChange={v => u("upsellOffer", v)} placeholder='e.g. "Private 1:1 intensive — $5,000 — for graduates who want to hit $20k/month in 60 days"' />
      </Field>
    </div>
  );
}

// ─── Step 11 — Business Context ───────────────────────────────────────────────

function Step11({ d, u, rp }: { d: WizardData; u: UpdateFn; rp: RefineProps }) {
  const g = STEP_GUIDES[10];
  const ai = (field: keyof WizardData, label: string): FieldAiProps => ({
    fieldKey: String(field), aiState: rp.aiRefine,
    onRefine: () => rp.refine(field, label),
    onAccept: (val) => { u(field, val); rp.clearAi(); },
    onDismiss: rp.clearAi,
  });
  return (
    <div className="space-y-5">
      <StepGuide tip={g.tip} why={g.why} est={STEPS_META[10].est} onFillStep={rp.fillStep} filling={rp.filling} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price point">
          <TF value={d.pricePoint} onChange={v => u("pricePoint", v)} placeholder='e.g. "$1,997" or "$997–$2,997"' />
        </Field>
        <Field label="Pricing model">
          <ChoiceGrid options={PRICING_MODELS} value={d.pricingModel} onChange={v => u("pricingModel", v)} cols={2} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First cohort size target" optional><TF value={d.firstCohortSize} onChange={v => u("firstCohortSize", v)} placeholder="e.g. 20 students" /></Field>
        <Field label="Revenue goal for launch" optional><TF value={d.revenueGoal} onChange={v => u("revenueGoal", v)} placeholder="e.g. $40,000" /></Field>
      </div>
      <Divider label="Launch History" />
      <Field label="Have you run a version of this before?" optional>
        <div className="space-y-2">
          {["Yes — with paying students", "Yes — as a beta / free pilot", "No — this is my first time launching this"].map(opt => (
            <button key={opt} type="button" onClick={() => u("ranBefore", opt)}
              className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${d.ranBefore === opt ? "border-purple-500 bg-purple-500/15 text-white" : "border-white/[0.07] bg-white/[0.02] text-white/55 hover:border-white/20"}`}>
              {opt}
            </button>
          ))}
        </div>
      </Field>
      {d.ranBefore && !d.ranBefore.includes("first time") && (
        <Field label="What happened — cohort size, revenue, what worked, what didn't" optional {...ai("previousResults", "Results from a previous run — cohort size, revenue, lessons learned, what's changing")}>
          <TA value={d.previousResults} onChange={v => u("previousResults", v)} rows={6}
            placeholder={"Cohort size: [X students]\nRevenue: [$X]\nCompletion rate: [X%]\n\nWhat worked: [list]\nWhat fell flat: [list]\nBiggest insight: [what you learned]\nWhat I'm changing: [specific improvements]"} />
        </Field>
      )}
      <Divider label="Marketing & Launch" />
      <Field label="How will you market and sell this program?" optional {...ai("marketingChannels", "The marketing and launch plan — channels, strategy, ads, partnerships, timeline")}>
        <TA value={d.marketingChannels} onChange={v => u("marketingChannels", v)} rows={4}
          placeholder={"Primary channel: [Instagram / email / YouTube / LinkedIn]\nLaunch strategy: [Webinar / 5-day challenge / open cart / evergreen]\nPaid ads: [yes/no — platforms, rough budget]\nPartnerships: [JVs, affiliates, podcasts]\nTimeline: [when you plan to launch]"} />
      </Field>
      <Field label="Current audience sizes" optional>
        <TF value={d.audienceSizes} onChange={v => u("audienceSizes", v)} placeholder="e.g. IG: 45k, Email: 8.5k, YouTube: 12k, LinkedIn: 6k" />
      </Field>
      <Divider label="Competitive Landscape" />
      <Field label="Your top 2–3 competitors" optional {...ai("competitors", "Top 2-3 competitors — names, pricing, strengths, and gaps where students feel underserved")}>
        <TA value={d.competitors} onChange={v => u("competitors", v)} rows={6}
          placeholder={"Competitor 1: [Name / program] — [$X] for [duration]\n  Strengths: [what they do well]\n  Gaps: [where students feel underserved]\n\nCompetitor 2: [Name] — [$X]\n  Strengths: [...]\n  Gaps: [...]"} />
      </Field>
      <Field label="Why should someone choose YOU over every alternative?" optional {...ai("yourEdge", "Why the creator specifically — their non-negotiable advantages over every alternative")}>
        <TA value={d.yourEdge} onChange={v => u("yourEdge", v)} rows={4}
          placeholder={"3 non-negotiable reasons to choose me:\n1. [Specific differentiator — proof, unique method, personal access]\n2. [Differentiator]\n3. [Differentiator]\n\nThe gap in the market I exist to fill: [your positioning statement]"} />
      </Field>
    </div>
  );
}

// ─── Animation ────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MentorKitNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0); // 0 = welcome
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState<WizardData>(INITIAL_DATA);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [aiRefine, setAiRefine] = useState<AiRefineState>(null);
  const [filling, setFilling] = useState(false);
  const [hasDraft, setHasDraft] = useState<{ savedAt: string; step: number; pdfCount: number } | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [quickForm, setQuickForm] = useState({ productType: "", niche: "", audienceDescription: "" });
  const contentRef = useRef("");

  const TOTAL = STEPS_META.length; // 11

  // ── localStorage: restore on mount ──────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { form: sf, step: ss, savedAt, pdfNames } = JSON.parse(raw);
      if (ss >= 1 && sf) {
        setHasDraft({ savedAt, step: ss, pdfCount: pdfNames?.length || 0 });
      }
    } catch {}
  }, []);

  // ── localStorage: auto-save on change (debounced 800ms) ─────────────────────
  useEffect(() => {
    if (step === 0) return;
    const t = setTimeout(() => {
      try {
        const { pdfs: _, ...formWithoutPdfs } = form;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          form: formWithoutPdfs,
          step,
          savedAt: new Date().toISOString(),
          pdfNames: form.pdfs.map(p => p.name),
        }));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [form, step]);

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { form: sf, step: ss } = JSON.parse(raw);
      setForm(prev => ({ ...prev, ...sf, pdfs: [] }));
      setStep(ss);
      setHasDraft(null);
      setDir(1);
      if (hasDraft?.pdfCount) {
        toast({ title: "Draft restored", description: "PDFs need to be re-uploaded" });
      } else {
        toast({ title: "Draft restored — continue where you left off" });
      }
    } catch {}
  }, [hasDraft, toast]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasDraft(null);
  }, []);

  // ── Form update ──────────────────────────────────────────────────────────────
  const update = useCallback((field: keyof WizardData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── AI refine (single field) ─────────────────────────────────────────────────
  const refine = useCallback(async (field: keyof WizardData, label: string) => {
    const currentValue = (form as any)[field] || "";
    setAiRefine({ field: String(field), loading: true, suggestion: "" });
    try {
      const data = await apiRequest("POST", "/api/mentor-kit/refine", {
        field: String(field), label, currentValue,
        context: {
          creatorName: form.creatorName, niche: form.niche, productType: form.productType,
          duration: form.duration, frameworkName: form.frameworkName,
          audienceDescription: form.audienceDescription, coreBelief: form.coreBelief, phases: form.phases,
        },
      });
      setAiRefine({ field: String(field), loading: false, suggestion: data.suggestion || "" });
    } catch (err: any) {
      toast({ title: "AI refine failed", description: err.message, variant: "destructive" });
      setAiRefine(null);
    }
  }, [form, toast]);

  const clearAi = useCallback(() => setAiRefine(null), []);

  // ── AI fill entire step ──────────────────────────────────────────────────────
  const fillStep = useCallback(async () => {
    if (!form.creatorName.trim() || !form.niche.trim()) {
      toast({
        title: "Add your name and niche first",
        description: "Complete Step 3 (About You) — AI needs this context to fill any step.",
        variant: "destructive",
      });
      return;
    }
    setFilling(true);
    try {
      const data = await apiRequest("POST", "/api/mentor-kit/fill-step", {
        stepIndex: step,
        currentForm: Object.fromEntries(
          Object.entries(form).filter(([_, v]) => typeof v === "string" && (v as string).trim().length > 0)
        ),
      });
      if (data.fields && typeof data.fields === "object") {
        setForm(prev => ({ ...prev, ...data.fields }));
        toast({ title: "Step filled — review and personalise each answer" });
      }
    } catch (err: any) {
      toast({ title: "AI fill failed", description: err.message, variant: "destructive" });
    } finally {
      setFilling(false);
    }
  }, [step, form, toast]);

  const rp: RefineProps = { aiRefine, refine, clearAi, fillStep, filling };

  // ── PDF upload ───────────────────────────────────────────────────────────────
  const uploadPdf = useCallback(async (file: File) => {
    if (form.pdfs.length >= 5) { toast({ title: "Maximum 5 PDFs", variant: "destructive" }); return; }
    setUploadingPdf(true);
    try {
      const fd = new window.FormData();
      fd.append("pdf", file);
      const data = await apiRequest("POST", "/api/mentor-kit/parse-pdf", fd);
      update("pdfs", [...form.pdfs, { name: file.name, wordCount: data.wordCount, text: data.text }]);
      toast({ title: `Extracted ${data.wordCount.toLocaleString()} words from ${file.name}` });
    } catch (err: any) {
      toast({ title: "PDF parse failed", description: err.message, variant: "destructive" });
    } finally { setUploadingPdf(false); }
  }, [form.pdfs, update, toast]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const goNext = () => { setDir(1); setStep(s => s + 1); };
  const goBack = () => { setDir(-1); setStep(s => s - 1); };

  const canProceed = () => {
    if (step > TOTAL) return true;
    const required = STEPS_META[step - 1]?.required || [];
    return required.every(field => {
      const v = (form as any)[field];
      return typeof v === "string" ? v.trim().length > 1 : !!v;
    });
  };

  // ── Quick generate ───────────────────────────────────────────────────────────
  const quickGenerate = () => {
    setForm(prev => ({
      ...prev,
      productType: quickForm.productType,
      niche: quickForm.niche,
      audienceDescription: quickForm.audienceDescription,
      duration: prev.duration || "8w",
    }));
    setDir(1);
    setStep(TOTAL + 1);
  };

  // ── Generate blueprint ───────────────────────────────────────────────────────
  const generate = async () => {
    setGenerating(true);
    setStreamedContent("");
    contentRef.current = "";
    const pdfContext = form.pdfs.map(p => p.text).join("\n\n---\n\n");
    try {
      const resp = await fetch("/api/mentor-kit/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ intelData: form, pdfContext: pdfContext || undefined }),
      });
      if (!resp.ok) throw new Error("Generation failed — please try again");
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (t === "data: [DONE]") continue;
          if (t.startsWith("data: ")) {
            try {
              const json = JSON.parse(t.slice(6));
              if (json.token) { contentRef.current += json.token; setStreamedContent(contentRef.current); }
              if (json.error) throw new Error(json.error);
            } catch (e: any) { if (e.message && !e.message.includes("JSON")) throw e; }
          }
        }
      }
      const titleMatch = contentRef.current.match(/^#{1,2}\s+(.+)/m);
      const title = titleMatch?.[1]?.replace(/\*+/g, "").trim() || form.niche;
      const saved = await apiRequest("POST", "/api/mentor-kit/save", {
        productType: form.productType,
        title,
        inputData: { niche: form.niche, audience: form.audienceDescription, transformation: form.afterPicture, priceRange: form.pricePoint, fullIntel: form },
        generatedContent: contentRef.current,
        pdfContextUsed: form.pdfs.length > 0,
      });
      setSavedId(saved.id);
      localStorage.removeItem(STORAGE_KEY);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
      return;
    }
    setGenerating(false);
  };

  // Auto-trigger generate when reaching the generate step
  useEffect(() => {
    if (step === TOTAL + 1 && !generating && !streamedContent) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const currentMeta = STEPS_META[step - 1];
  const isGenerateStep = step > TOTAL;
  const isWelcome = step === 0;

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

        {/* Top bar */}
        <div className="border-b border-white/[0.05] shrink-0">
          <div className="max-w-2xl mx-auto px-6 py-3.5 flex items-center gap-4">
            <button
              onClick={() => { if (!generating) { step > 0 ? goBack() : setLocation("/mentor-kit"); } }}
              disabled={generating}
              className="text-white/35 hover:text-white/70 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-white/40 text-xs font-medium">MentorKit</span>
              {!isWelcome && !isGenerateStep && (
                <>
                  <span className="text-white/15 text-xs">/</span>
                  <span className="text-white/60 text-xs">{currentMeta?.title}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {draftSaved && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-white/25 text-xs">Saved</motion.span>
              )}
              {!isWelcome && !isGenerateStep && (
                <>
                  <span className="text-white/25 text-xs font-mono">{String(step).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}</span>
                  <div className="w-24 h-1 rounded-full bg-white/[0.08]">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                      animate={{ width: `${(step / TOTAL) * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step dots nav */}
          {!isWelcome && !isGenerateStep && (
            <div className="max-w-2xl mx-auto px-6 pb-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
              {STEPS_META.map((s, i) => {
                const Icon = s.icon;
                const done = i + 1 < step;
                const active = i + 1 === step;
                const pct = stepCompletion(i, form);
                return (
                  <button key={i} type="button"
                    onClick={() => { if (i + 1 < step) { setDir(-1); setStep(i + 1); } }}
                    disabled={i + 1 > step}
                    title={`${s.title} — ${pct}% filled`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all text-[10px] shrink-0 ${active ? "bg-purple-500/20 text-purple-300" : done ? "text-emerald-400/70 hover:text-emerald-400 cursor-pointer" : "text-white/20 cursor-default"}`}>
                    <Icon className={`w-2.5 h-2.5 ${active ? "text-purple-400" : done ? "text-emerald-400" : "text-white/20"}`} />
                    {active && <span>{s.title}</span>}
                    {active && pct > 0 && <span className="text-purple-400/60">· {pct}%</span>}
                    {done && pct === 100 && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                    {done && pct < 100 && <span className="text-amber-400/70">{pct}%</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 pt-8 pb-28">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.18, ease: "easeOut" }}>

                {/* ── Welcome screen ── */}
                {isWelcome && (
                  <div>
                    {hasDraft && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-6 flex items-center gap-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl p-4">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-sm font-medium">Draft saved {timeAgo(hasDraft.savedAt)}</p>
                          <p className="text-white/35 text-xs mt-0.5">
                            Step {hasDraft.step} of {TOTAL}
                            {hasDraft.pdfCount > 0 ? ` · ${hasDraft.pdfCount} PDF${hasDraft.pdfCount > 1 ? "s" : ""} need re-uploading` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={restoreDraft}
                            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 px-3 py-1.5 rounded-lg transition-all">
                            <RotateCcw className="w-3 h-3" /> Continue
                          </button>
                          <button onClick={discardDraft} className="text-xs text-white/30 hover:text-white/60 px-2 py-1.5 transition-colors">
                            Discard
                          </button>
                        </div>
                      </motion.div>
                    )}

                    <div className="text-center mb-10">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-7 h-7 text-white" />
                      </div>
                      <h1 className="text-3xl font-bold tracking-tight">Build your digital product</h1>
                      <p className="text-white/40 mt-2 text-sm max-w-sm mx-auto leading-relaxed">
                        Answer questions about your expertise and audience — AI generates a complete, deeply personalised blueprint.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <button
                        onClick={() => setQuickMode(m => !m)}
                        className={`text-left p-5 rounded-2xl border transition-all ${quickMode ? "border-purple-500 bg-purple-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"}`}>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3">
                          <Flame className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm mb-0.5">Quick Generate</p>
                        <p className="text-white/35 text-xs">2 min · 3 questions</p>
                        <p className="text-white/25 text-xs mt-2 leading-snug">Get a starter blueprint fast. Go deeper after.</p>
                      </button>

                      <button
                        onClick={() => { setQuickMode(false); setDir(1); setStep(1); }}
                        className="text-left p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-purple-500/40 hover:bg-purple-500/[0.04] transition-all">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-3">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm mb-0.5">Full Builder</p>
                        <p className="text-white/35 text-xs">20–30 min · 11 steps</p>
                        <p className="text-white/25 text-xs mt-2 leading-snug">Deep intel = deeply personalised blueprint.</p>
                      </button>
                    </div>

                    <AnimatePresence>
                      {quickMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden">
                          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5 space-y-5">
                            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Quick Generate</p>
                            <Field label="What are you building?">
                              <ChoiceGrid options={PRODUCT_TYPES} value={quickForm.productType} onChange={v => setQuickForm(p => ({ ...p, productType: v }))} cols={2} />
                            </Field>
                            <Field label="Your niche">
                              <TF value={quickForm.niche} onChange={v => setQuickForm(p => ({ ...p, niche: v }))} placeholder="e.g. Instagram growth for coaches" />
                            </Field>
                            <Field label="Who is this for?" hint="2–3 sentences on your ideal student and what they want.">
                              <TA value={quickForm.audienceDescription} onChange={v => setQuickForm(p => ({ ...p, audienceDescription: v }))} rows={3}
                                placeholder="e.g. Female fitness coaches stuck under 5k followers wanting to hit 10k in 60 days without paid ads..." />
                            </Field>
                            <Button
                              onClick={quickGenerate}
                              disabled={!quickForm.productType || !quickForm.niche.trim()}
                              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0 h-11 disabled:opacity-40">
                              <Zap className="w-4 h-4 mr-2" /> Generate Blueprint →
                            </Button>
                            <p className="text-center text-white/25 text-xs">You can deepen this with the full 11-step builder after</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── Step heading ── */}
                {!isWelcome && !isGenerateStep && currentMeta && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-600/30 border border-white/10 flex items-center justify-center">
                        <currentMeta.icon className="w-3 h-3 text-purple-300" />
                      </div>
                      <span className="text-purple-400/60 text-xs font-medium uppercase tracking-wider">Step {step} of {TOTAL}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{currentMeta.title}</h1>
                    <p className="text-white/35 text-sm mt-1">{currentMeta.subtitle}</p>
                  </div>
                )}

                {/* ── Steps ── */}
                {step === 1 && <Step1 d={form} u={update} />}
                {step === 2 && <Step2 d={form} u={update} />}
                {step === 3 && <Step3 d={form} u={update} />}
                {step === 4 && <Step4 d={form} u={update} rp={rp} />}
                {step === 5 && <Step5 d={form} u={update} rp={rp} />}
                {step === 6 && <Step6 d={form} u={update} rp={rp} />}
                {step === 7 && <Step7 d={form} u={update} rp={rp} />}
                {step === 8 && <Step8 d={form} u={update} rp={rp} />}
                {step === 9 && <Step9 d={form} u={update} rp={rp} onPdfUpload={uploadPdf} uploadingPdf={uploadingPdf} />}
                {step === 10 && <Step10 d={form} u={update} rp={rp} />}
                {step === 11 && <Step11 d={form} u={update} rp={rp} />}

                {/* ── Generate screen ── */}
                {isGenerateStep && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      {generating && <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />}
                      {!generating && savedId && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                      <div>
                        <h2 className="text-xl font-bold">{generating ? "Building your blueprint…" : "Blueprint complete"}</h2>
                        <p className="text-white/30 text-xs mt-0.5">
                          {generating
                            ? `${form.productType || "program"} · ${form.niche || "your niche"}`
                            : "Auto-saved to your dashboard"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5 min-h-[320px] max-h-[62vh] overflow-y-auto">
                      {streamedContent ? (
                        <div className="space-y-0.5">
                          {renderMd(streamedContent)}
                          {generating && <span className="animate-pulse text-purple-400 text-sm">▍</span>}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                          <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-white/25 text-sm">Assembling your complete brief…</p>
                        </div>
                      )}
                    </div>

                    {!generating && savedId && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 mt-5">
                        <Button onClick={() => setLocation("/mentor-kit")} variant="outline"
                          className="border-white/10 text-white/60 hover:text-white bg-transparent hover:bg-white/5">
                          Dashboard
                        </Button>
                        <Button onClick={() => setLocation(`/mentor-kit/product/${savedId}`)}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0">
                          View Full Blueprint <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Sticky bottom nav */}
        {!isWelcome && !isGenerateStep && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.05] bg-[#0a0a0f]/95 backdrop-blur-sm">
            <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
              {step > 1 && (
                <Button onClick={goBack} variant="outline"
                  className="border-white/10 text-white/55 hover:text-white bg-transparent hover:bg-white/5 shrink-0">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              {(STEPS_META[step - 1]?.required || []).length === 0 && (
                <button onClick={goNext}
                  className="text-white/30 hover:text-white/60 text-sm flex items-center gap-1.5 transition-colors shrink-0">
                  <SkipForward className="w-3.5 h-3.5" /> Skip
                </button>
              )}
              <div className="flex-1" />
              {step < TOTAL ? (
                <Button onClick={goNext} disabled={!canProceed()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 h-10 px-6 disabled:opacity-40">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={goNext} disabled={!canProceed()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 h-10 px-6 disabled:opacity-40">
                  <Zap className="w-4 h-4 mr-2" /> Generate Blueprint
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
