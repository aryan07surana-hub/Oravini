import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useSurvey } from "@/hooks/use-survey";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import WriteWithAI from "@/components/ui/WriteWithAI";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Sparkles, Wand2, Clock, Bookmark, Trash2, X,
  ChevronLeft, ChevronRight, Copy, Check, RefreshCw, Flame,
  Target, Zap, TrendingUp, Users, MessageSquare, Lightbulb,
  BarChart2, ArrowRight, Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlannerForm {
  niche: string;
  targetAudience: string;
  goal: string;
  platforms: string[];
  postingFrequency: string;
  contentStyle: string;
  brandVoice: string;
  contentPillars: string;
  biggestChallenge: string;
  weeklyFocus: string;
}

interface DayPlan {
  day: string;
  role: "Virality" | "Authority" | "Engagement" | "Conversion" | "Value";
  contentIdea: string;
  hook: string;
  format: string;
  goal: string;
  tip?: string;
}

interface WeekPlan {
  weekObjective: string;
  weekTheme: string;
  contentMix: {
    virality: number;
    authority: number;
    engagement: number;
    conversion: number;
    value: number;
  };
  days: DayPlan[];
  executionNote: string;
  repurposingOpportunity?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PLATFORM_OPTIONS = [
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "youtube", label: "YouTube", emoji: "▶️" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
  { id: "linkedin", label: "LinkedIn", emoji: "💼" },
  { id: "twitter", label: "Twitter / X", emoji: "🐦" },
  { id: "pinterest", label: "Pinterest", emoji: "📌" },
];

const GOAL_OPTIONS = [
  { id: "grow", label: "Grow Audience", desc: "Reach & follower growth", icon: TrendingUp, color: "#34d399" },
  { id: "leads", label: "Generate Leads", desc: "DMs, email signups, calls", icon: Target, color: "#60a5fa" },
  { id: "authority", label: "Build Authority", desc: "Establish expert status", icon: Star, color: "#a78bfa" },
  { id: "sales", label: "Drive Sales", desc: "Revenue & conversions", icon: Zap, color: "#d4b461" },
  { id: "community", label: "Build Community", desc: "Engagement & belonging", icon: Users, color: "#f472b6" },
];

const FREQUENCY_OPTIONS = [
  { id: "daily", label: "Daily", sub: "7 posts / week", days: 7 },
  { id: "frequent", label: "5–6x / week", sub: "High volume", days: 6 },
  { id: "moderate", label: "3–4x / week", sub: "Sustainable pace", days: 4 },
  { id: "light", label: "1–2x / week", sub: "Quality over quantity", days: 2 },
];

const STYLE_OPTIONS = [
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "storytelling", label: "Storytelling", emoji: "📖" },
  { id: "authority", label: "Authority / Opinion", emoji: "🎯" },
  { id: "entertainment", label: "Entertainment", emoji: "🎭" },
  { id: "mixed", label: "Mixed", emoji: "⚡" },
];

const VOICE_OPTIONS = [
  { id: "bold", label: "Bold & Direct" },
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual & Friendly" },
  { id: "inspirational", label: "Inspirational" },
  { id: "conversational", label: "Conversational" },
];

const ROLE_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  Virality:   { color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: Flame, label: "Virality" },
  Authority:  { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", icon: Star, label: "Authority" },
  Engagement: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: MessageSquare, label: "Engagement" },
  Conversion: { color: "#d4b461", bg: "rgba(212,180,97,0.12)", icon: Zap, label: "Conversion" },
  Value:      { color: "#34d399", bg: "rgba(52,211,153,0.12)", icon: Lightbulb, label: "Value" },
};

const INSPIRATIONS = [
  {
    label: "Fitness Coach",
    niche: "Fitness & Transformation Coaching",
    targetAudience: "Women 28–42 wanting to lose 10–20 lbs, feel confident in their body, and build sustainable healthy habits without extreme diets",
    goal: "leads",
    platforms: ["instagram", "tiktok"],
    postingFrequency: "frequent",
    contentStyle: "mixed",
    brandVoice: "inspirational",
    contentPillars: "Workout tips, Mindset & motivation, Client transformations, Nutrition hacks, Behind the scenes",
    biggestChallenge: "Standing out in a saturated fitness market and converting viewers into actual clients",
    weeklyFocus: "",
  },
  {
    label: "B2B SaaS",
    niche: "B2B SaaS / AI Productivity Tools",
    targetAudience: "Startup founders and marketing managers at 10–50 person companies who want to automate repetitive tasks and scale faster",
    goal: "leads",
    platforms: ["linkedin", "twitter"],
    postingFrequency: "moderate",
    contentStyle: "authority",
    brandVoice: "bold",
    contentPillars: "Productivity systems, AI & automation, Startup growth, Founder lessons, Product updates",
    biggestChallenge: "Building trust with a skeptical B2B audience that has seen too many overpromising tools",
    weeklyFocus: "",
  },
  {
    label: "Personal Brand",
    niche: "Personal Brand / Online Coaching",
    targetAudience: "Aspiring entrepreneurs 22–35 who want to monetize their knowledge, build a personal brand, and escape the 9-5",
    goal: "authority",
    platforms: ["instagram", "youtube"],
    postingFrequency: "daily",
    contentStyle: "storytelling",
    brandVoice: "conversational",
    contentPillars: "Mindset, Content strategy, Income diversification, My journey, Q&A",
    biggestChallenge: "Staying consistent, maintaining creativity, and converting audience to buyers",
    weeklyFocus: "",
  },
];

// ─── History Side Panel ────────────────────────────────────────────────────────
function HistorySidePanel({ onLoad }: { onLoad: (entry: any) => void }) {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["/api/ai/history", "content-planner"],
    queryFn: () => apiRequest("GET", "/api/ai/history?tool=content-planner"),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ai/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "content-planner"] }),
  });

  return (
    <div className="h-full flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <Clock className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Past Plans</span>
        <span className="ml-auto text-[10px] text-zinc-600">{(history as any[]).length} saved</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!isLoading && (history as any[]).length === 0 && (
          <div className="text-center py-12 px-3">
            <Bookmark className="w-7 h-7 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 font-medium">No saved plans yet</p>
            <p className="text-[10px] text-zinc-600 mt-1">Generate one and it saves automatically</p>
          </div>
        )}
        {(history as any[]).map((e: any) => (
          <div
            key={e.id}
            className="rounded-xl p-3 group transition-all cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            onClick={() => onLoad(e)}
          >
            <p className="text-xs font-semibold text-white truncate">{e.title || "Untitled Plan"}</p>
            {e.inputs?.goal && (
              <Badge className="mt-1 bg-zinc-800 text-zinc-400 border-0 text-[10px] capitalize">{e.inputs.goal}</Badge>
            )}
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-zinc-600">
                {e.createdAt ? new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
              </p>
              <button
                onClick={ev => { ev.stopPropagation(); del.mutate(e.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Day Card ─────────────────────────────────────────────────────────────────
function DayCard({
  day,
  dayIndex,
  onRegenerate,
  onMakeViral,
  isRegenerating,
}: {
  day: DayPlan;
  dayIndex: number;
  onRegenerate: (idx: number) => void;
  onMakeViral: (idx: number) => void;
  isRegenerating: boolean;
}) {
  const [copiedHook, setCopiedHook] = useState(false);
  const [copiedIdea, setCopiedIdea] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const cfg = ROLE_CONFIG[day.role] || ROLE_CONFIG.Value;
  const RoleIcon = cfg.icon;

  const copyHook = () => {
    navigator.clipboard.writeText(day.hook);
    setCopiedHook(true); setTimeout(() => setCopiedHook(false), 1500);
  };
  const copyIdea = () => {
    navigator.clipboard.writeText(`${day.contentIdea}\n\nHook: ${day.hook}`);
    setCopiedIdea(true); setTimeout(() => setCopiedIdea(false), 1500);
  };

  return (
    <div
      className="rounded-2xl border bg-zinc-900/60 overflow-hidden transition-all"
      style={{ borderColor: `${cfg.color}30` }}
      data-testid={`day-card-${dayIndex}`}
    >
      {/* Day header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-900/40 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
          <RoleIcon className="w-5 h-5" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-black text-white">{day.day}</span>
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
            >
              {day.role}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium ml-1">{day.format}</span>
          </div>
          <p className="text-xs text-zinc-400 truncate">{day.contentIdea}</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-zinc-600 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: `${cfg.color}20` }}>
          {/* Hook — highlighted */}
          <div className="mt-4">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Opening Hook</div>
            <div
              className="rounded-xl px-4 py-3 flex items-start justify-between gap-3"
              style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}25` }}
            >
              <p className="text-sm font-semibold italic leading-relaxed" style={{ color: cfg.color }}>
                "{day.hook}"
              </p>
              <button onClick={copyHook} className="flex-shrink-0 mt-0.5 text-zinc-500 hover:text-white transition-colors" data-testid={`copy-hook-${dayIndex}`}>
                {copiedHook ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Idea */}
          <div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Content Idea</div>
            <p className="text-xs text-zinc-200 leading-relaxed">{day.contentIdea}</p>
          </div>

          {/* Goal */}
          <div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Why This Post</div>
            <p className="text-xs text-zinc-400 leading-relaxed">{day.goal}</p>
          </div>

          {/* Tip */}
          {day.tip && (
            <div className="bg-primary/6 border border-primary/20 rounded-xl px-3 py-2.5">
              <div className="text-[9px] font-bold text-primary uppercase tracking-wider mb-1">Execution Tip</div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">{day.tip}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onRegenerate(dayIndex)}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all disabled:opacity-50"
              data-testid={`regen-day-${dayIndex}`}
            >
              <RefreshCw className={`w-3 h-3 ${isRegenerating ? "animate-spin" : ""}`} />
              Regenerate Day
            </button>
            <button
              onClick={() => onMakeViral(dayIndex)}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-orange-500/40 text-orange-400 hover:border-orange-500/70 hover:bg-orange-500/8 transition-all disabled:opacity-50"
              data-testid={`viral-day-${dayIndex}`}
            >
              <Flame className="w-3 h-3" />
              Make it Viral
            </button>
            <button
              onClick={copyIdea}
              className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
              data-testid={`copy-idea-${dayIndex}`}
            >
              {copiedIdea ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copiedIdea ? "Copied!" : "Copy All"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AIContentPlanner() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<"config" | "results">("config");
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<WeekPlan | null>(null);
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedInspo, setSelectedInspo] = useState<string | null>(null);

  const survey = useSurvey();

  const [form, setForm] = useState<PlannerForm>({
    niche: "",
    targetAudience: "",
    goal: "grow",
    platforms: ["instagram"],
    postingFrequency: "moderate",
    contentStyle: "mixed",
    brandVoice: "inspirational",
    contentPillars: "",
    biggestChallenge: "",
    weeklyFocus: "",
  });

  // Pre-fill from onboarding survey once data is available
  useEffect(() => {
    if (!survey.hasData) return;
    setForm(f => ({
      ...f,
      niche: f.niche || survey.niche,
      goal: f.goal === "grow" ? survey.goalLabel : f.goal,
      platforms: f.platforms[0] === "instagram" && survey.platforms.length > 0
        ? survey.platforms.map(p => p.toLowerCase().replace(" / ", "").replace(" ", "")).slice(0, 3)
        : f.platforms,
      biggestChallenge: f.biggestChallenge || survey.topStruggle,
    }));
  }, [survey.hasData]);

  const setF = (k: keyof PlannerForm, v: any) => setForm(f => ({ ...f, [k]: v }));
  const togglePlatform = (id: string) =>
    setF("platforms", form.platforms.includes(id) ? form.platforms.filter(p => p !== id) : [...form.platforms, id]);

  const saveMut = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/history", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "content-planner"] }),
  });

  const applyInspo = (ins: typeof INSPIRATIONS[0]) => {
    setSelectedInspo(ins.label);
    setForm(f => ({ ...f, ...ins }));
  };

  const handleGenerate = async () => {
    if (!form.niche.trim()) {
      toast({ title: "Niche required", description: "Tell us your niche to generate a plan.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setApiDone(false);
    try {
      const data: WeekPlan = await apiRequest("POST", "/api/ai/content-planner/generate", { ...form });
      setResult(data);
      setApiDone(true);
      saveMut.mutate({
        tool: "content-planner",
        title: form.niche.slice(0, 55),
        inputs: { goal: form.goal, platforms: form.platforms, frequency: form.postingFrequency },
        output: data,
      });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
    }
  };

  const handleDone = () => { setGenerating(false); setStep("results"); };

  const handleLoadHistory = (e: any) => {
    if (e.output) { setResult(e.output); setStep("results"); }
  };

  const handleRegenerateDay = async (idx: number) => {
    if (!result) return;
    setRegenIdx(idx);
    try {
      const day = result.days[idx];
      const data: { day: DayPlan } = await apiRequest("POST", "/api/ai/content-planner/regenerate-day", {
        dayName: day.day,
        role: day.role,
        niche: form.niche,
        goal: form.goal,
        platforms: form.platforms,
        contentStyle: form.contentStyle,
        brandVoice: form.brandVoice,
        contentPillars: form.contentPillars,
      });
      setResult(r => r ? {
        ...r,
        days: r.days.map((d, i) => i === idx ? data.day : d),
      } : r);
      toast({ title: "Day regenerated!", description: `${day.day} has a fresh content idea.` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setRegenIdx(null);
    }
  };

  const handleMakeViral = async (idx: number) => {
    if (!result) return;
    setRegenIdx(idx);
    try {
      const day = result.days[idx];
      const data: { day: DayPlan } = await apiRequest("POST", "/api/ai/content-planner/make-viral", {
        dayName: day.day,
        currentIdea: day.contentIdea,
        niche: form.niche,
        platforms: form.platforms,
        targetAudience: form.targetAudience,
      });
      setResult(r => r ? {
        ...r,
        days: r.days.map((d, i) => i === idx ? data.day : d),
      } : r);
      toast({ title: "Made viral! 🔥", description: `${day.day} has been rewritten for maximum reach.` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setRegenIdx(null);
    }
  };

  const copyFullWeek = () => {
    if (!result) return;
    const text = result.days.map(d =>
      `${d.day} (${d.role} — ${d.format})\nIdea: ${d.contentIdea}\nHook: ${d.hook}\nGoal: ${d.goal}`
    ).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ── Generating Screen ──
  if (generating) {
    return (
      <GeneratingScreen
        label="Building your AI Content Execution Plan…"
        steps={[
          "Analysing your niche and audience",
          "Defining weekly objective and theme",
          "Assigning content roles across the week",
          "Mapping platform behaviour and format",
          "Writing specific content ideas",
          "Crafting scroll-stopping hooks",
          "Attaching execution tips",
        ]}
        isComplete={apiDone}
        onReady={handleDone}
        minMs={47000}
      />
    );
  }

  // ── Config Step ──
  if (step === "config") {
    return (
      <ClientLayout>
        <div className="max-w-6xl mx-auto px-5 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-7">
            <button
              onClick={() => navigate("/ai-design")}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mr-1"
              data-testid="btn-back-ai-design"
            >
              <ChevronLeft className="w-3.5 h-3.5" />AI Design Hub
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
              <CalendarDays className="w-4 h-4" style={{ color: "#d4b461" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Content Planner</h1>
              <p className="text-xs text-muted-foreground">A full content execution system — ideas, hooks, formats, roles, all planned for your week</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Setup form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Inspiration chips */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Start with an example</p>
                <div className="flex flex-wrap gap-2">
                  {INSPIRATIONS.map(ins => (
                    <button
                      key={ins.label}
                      onClick={() => applyInspo(ins)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedInspo === ins.label ? "bg-primary/15 border-primary/50 text-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"}`}
                    >
                      {ins.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Niche */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Your Niche / Industry <span className="text-red-400">*</span></label>
                <Input
                  value={form.niche}
                  onChange={e => setF("niche", e.target.value)}
                  placeholder="e.g. Online Fitness Coaching, B2B SaaS, Personal Finance…"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                  data-testid="input-niche"
                />
              </div>

              {/* Target Audience */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Target Audience</label>
                <Textarea
                  value={form.targetAudience}
                  onChange={e => setF("targetAudience", e.target.value)}
                  placeholder="Who exactly are you talking to? Age, situation, desire…"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 text-sm min-h-[64px] resize-none"
                  data-testid="input-audience"
                />
                <WriteWithAI
                  text={form.targetAudience}
                  onChange={v => setF("targetAudience", v)}
                  context={`Content planner for niche: ${form.niche}. Improve the target audience description to be more specific and detailed.`}
                />
              </div>

              {/* Goal */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Primary Goal This Week</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GOAL_OPTIONS.map(g => {
                    const Icon = g.icon;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setF("goal", g.id)}
                        data-testid={`goal-${g.id}`}
                        className={`flex flex-col gap-2 p-3 rounded-xl border text-left transition-all ${form.goal === g.id ? "border-primary/60 bg-primary/8" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"}`}
                      >
                        <Icon className="w-4 h-4" style={{ color: form.goal === g.id ? "#d4b461" : g.color }} />
                        <div>
                          <div className={`text-xs font-bold ${form.goal === g.id ? "text-primary" : "text-zinc-200"}`}>{g.label}</div>
                          <div className="text-[10px] text-zinc-500">{g.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Platform(s)</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      data-testid={`platform-${p.id}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${form.platforms.includes(p.id) ? "border-primary/60 bg-primary/10 text-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"}`}
                    >
                      <span>{p.emoji}</span>{p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Posting Frequency */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Posting Frequency</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FREQUENCY_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setF("postingFrequency", f.id)}
                      data-testid={`freq-${f.id}`}
                      className={`flex flex-col gap-0.5 p-3 rounded-xl border text-left transition-all ${form.postingFrequency === f.id ? "border-primary/60 bg-primary/8" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"}`}
                    >
                      <span className={`text-xs font-bold ${form.postingFrequency === f.id ? "text-primary" : "text-zinc-200"}`}>{f.label}</span>
                      <span className="text-[10px] text-zinc-500">{f.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Style + Brand Voice */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Content Style</label>
                  <div className="space-y-1.5">
                    {STYLE_OPTIONS.map(s => (
                      <button key={s.id} onClick={() => setF("contentStyle", s.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold text-left transition-all ${form.contentStyle === s.id ? "border-primary/50 bg-primary/8 text-primary" : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"}`}>
                        <span>{s.emoji}</span>{s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Brand Voice</label>
                  <div className="space-y-1.5">
                    {VOICE_OPTIONS.map(v => (
                      <button key={v.id} onClick={() => setF("brandVoice", v.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold text-left transition-all ${form.brandVoice === v.id ? "border-primary/50 bg-primary/8 text-primary" : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"}`}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content Pillars */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Content Pillars <span className="font-normal text-zinc-600">(your core topics)</span></label>
                <Textarea
                  value={form.contentPillars}
                  onChange={e => setF("contentPillars", e.target.value)}
                  placeholder="e.g. Mindset, Marketing Strategy, Client Results, Behind the Scenes, Q&A…"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 text-sm min-h-[60px] resize-none"
                  data-testid="input-pillars"
                />
                <WriteWithAI
                  text={form.contentPillars}
                  onChange={v => setF("contentPillars", v)}
                  context={`Content planner. Niche: ${form.niche}. Goal: ${form.goal}. Suggest strong content pillars for this creator.`}
                />
              </div>

              {/* Biggest Challenge */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Biggest Content Challenge Right Now</label>
                <Input
                  value={form.biggestChallenge}
                  onChange={e => setF("biggestChallenge", e.target.value)}
                  placeholder="e.g. Staying consistent, getting new followers, converting viewers to buyers…"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                  data-testid="input-challenge"
                />
              </div>

              {/* Weekly Focus */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Specific Focus This Week <span className="font-normal text-zinc-600">(optional)</span></label>
                <Input
                  value={form.weeklyFocus}
                  onChange={e => setF("weeklyFocus", e.target.value)}
                  placeholder="e.g. Launching my new programme, promoting a webinar, building email list…"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                  data-testid="input-focus"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!form.niche.trim() || form.platforms.length === 0}
                className="w-full h-12 font-bold text-base gap-3 text-black"
                style={{ background: "#d4b461" }}
                data-testid="btn-generate-plan"
              >
                <CalendarDays className="w-5 h-5" />Generate My Weekly Content Plan
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Powered by content strategy psychology — ~47 seconds
              </p>
            </div>

            {/* Right: History */}
            <div className="lg:col-span-2">
              <HistorySidePanel onLoad={handleLoadHistory} />
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // ── Results Step ──
  if (!result) return null;

  const freqConfig = FREQUENCY_OPTIONS.find(f => f.id === form.postingFrequency);
  const daysToShow = result.days || [];

  const MixItem = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[10px] text-zinc-400 flex-1">{label}</span>
      <span className="text-[10px] font-bold" style={{ color }}>{value}x</span>
    </div>
  );

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setStep("config")}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              data-testid="btn-back"
            >
              <ChevronLeft className="w-4 h-4" />Edit Inputs
            </button>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={copyFullWeek}
                className="h-8 text-xs gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                data-testid="btn-copy-week"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy Week"}
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                className="h-8 text-xs gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                data-testid="btn-regenerate"
              >
                <RefreshCw className="w-3 h-3" />Regenerate All
              </Button>
            </div>
          </div>

          {/* Week strategy hero */}
          <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/4 p-6 mb-8 overflow-hidden">
            <div className="absolute top-3 right-3 opacity-10"><CalendarDays className="w-16 h-16 text-primary" /></div>
            <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">This Week's Objective</div>
            <p className="text-base font-bold text-white leading-relaxed mb-2">{result.weekObjective}</p>
            {result.weekTheme && (
              <p className="text-xs text-zinc-400 mb-4">Theme: <span className="text-primary/80 font-semibold">{result.weekTheme}</span></p>
            )}
            {/* Content mix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {result.contentMix && (
                <>
                  {result.contentMix.virality > 0 && <MixItem label="Virality" value={result.contentMix.virality} color="#f97316" />}
                  {result.contentMix.authority > 0 && <MixItem label="Authority" value={result.contentMix.authority} color="#a78bfa" />}
                  {result.contentMix.engagement > 0 && <MixItem label="Engagement" value={result.contentMix.engagement} color="#60a5fa" />}
                  {result.contentMix.conversion > 0 && <MixItem label="Conversion" value={result.contentMix.conversion} color="#d4b461" />}
                  {result.contentMix.value > 0 && <MixItem label="Value" value={result.contentMix.value} color="#34d399" />}
                </>
              )}
            </div>
          </div>

          {/* Day cards */}
          <div className="space-y-4 mb-8">
            {daysToShow.map((day, i) => (
              <DayCard
                key={`${day.day}-${i}`}
                day={day}
                dayIndex={i}
                onRegenerate={handleRegenerateDay}
                onMakeViral={handleMakeViral}
                isRegenerating={regenIdx === i}
              />
            ))}
          </div>

          {/* Execution note */}
          {result.executionNote && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Execution Strategy Note</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{result.executionNote}</p>
            </div>
          )}

          {/* Repurposing opportunity */}
          {result.repurposingOpportunity && (
            <div className="bg-violet-500/8 border border-violet-500/25 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] font-bold text-violet-400/80 uppercase tracking-wider">Repurposing Opportunity</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{result.repurposingOpportunity}</p>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
