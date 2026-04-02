import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import WriteWithAI from "@/components/ui/WriteWithAI";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Sparkles, RefreshCw, Copy, Check, Clock, Trash2,
  Layers, Target, Zap, BarChart2, Repeat, Users, CheckSquare,
  Workflow, ListChecks, ChevronRight, Rocket, Shield, Bot,
  TrendingUp, BookOpen, Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SOPResult {
  sopName: string;
  tagline: string;
  overview: {
    objective: string;
    outcome: string;
    whoExecutes: string;
    toolsRequired: string[];
    timeInvestment: string;
    difficultyLevel: string;
    proTip: string;
  };
  workflowStages: {
    name: string;
    description: string;
    duration: string;
    who: string;
    output: string;
  }[];
  executionSteps: {
    stage: string;
    steps: {
      number: number;
      action: string;
      microActions: string[];
      timeEstimate: string;
      tools: string[];
      decisionRule: string;
      qualityStandard: string;
    }[];
  }[];
  qualityControl: {
    prePublishChecklist: string[];
    whatGoodLooksLike: string;
    commonMistakes: string[];
    avoidThis: string;
    qualityBenchmarks: Record<string, string>;
  };
  automation: {
    whatToAutomate: string[];
    whatToBatch: string[];
    aiUsagePoints: string[];
    timeReductionTips: string[];
    speedHack: string;
  };
  optimizationLoop: {
    metricsToTrack: { metric: string; why: string; target: string; frequency: string }[];
    weeklyReviewSystem: string;
    improvementLoop: string;
    monthlyResetProtocol: string;
  };
  repurposingSystem: {
    coreToFive: string;
    platformAdaptations: { platform: string; format: string; adaptation: string; uniqueAngle: string }[];
    repurposingSchedule: string;
  };
  scalingSystem: {
    roles: { role: string; responsibilities: string[]; hireWhen: string }[];
    handoffProcess: string;
    communicationStructure: string;
    consistencySystem: string;
    applicableNote: string;
  };
  executionSummary: {
    simplifiedSystem: string;
    keyRules: string[];
    consistencyTips: string[];
    firstWeekPlan: string;
    motivationalClose: string;
  };
}

// ─── Inspiration chips ────────────────────────────────────────────────────────
const INSPIRATIONS = [
  {
    label: "Solo Creator",
    businessType: "Creator",
    niche: "Business & Marketing",
    platform: "Instagram",
    contentType: "Reels",
    experienceLevel: "Intermediate",
    teamSetup: "Solo",
    goal: "Growth",
    postingFrequency: "3x week",
    biggestStruggle: "Consistency",
  },
  {
    label: "Fitness Brand",
    businessType: "Personal Brand",
    niche: "Fitness & Health",
    platform: "Instagram",
    contentType: "Reels",
    experienceLevel: "Beginner",
    teamSetup: "Solo",
    goal: "Leads",
    postingFrequency: "Daily",
    biggestStruggle: "Ideas",
  },
  {
    label: "Agency Owner",
    businessType: "Agency",
    niche: "Social Media Marketing",
    platform: "LinkedIn",
    contentType: "Carousels",
    experienceLevel: "Advanced",
    teamSetup: "Small team",
    goal: "Sales",
    postingFrequency: "3x week",
    biggestStruggle: "Growth",
  },
  {
    label: "SaaS Founder",
    businessType: "SaaS",
    niche: "AI & Technology",
    platform: "YouTube",
    contentType: "Long-form",
    experienceLevel: "Intermediate",
    teamSetup: "Small team",
    goal: "Authority",
    postingFrequency: "Weekly",
    biggestStruggle: "Monetization",
  },
];

const SELECT_FIELD = "w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none appearance-none transition-colors cursor-pointer";
const selectStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" };

function SelectInput({ value, onChange, options, placeholder, testId }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; testId?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={SELECT_FIELD}
      style={selectStyle}
      onFocus={e => (e.target.style.borderColor = "rgba(212,180,97,0.5)")}
      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
      data-testid={testId}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── History side panel ───────────────────────────────────────────────────────
function HistorySidePanel({ onLoad }: { onLoad: (e: any) => void }) {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/ai/history", "sop-generator"],
    queryFn: () => apiRequest("GET", "/api/ai/history?tool=sop-generator"),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ai/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "sop-generator"] }),
  });

  return (
    <div className="rounded-2xl flex flex-col overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 340 }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400">Past SOPs</span>
        </div>
        {history.length > 0 && (
          <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/25 rounded-full px-1.5">{history.length}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
            <Layers className="w-7 h-7 text-zinc-700" />
            <p className="text-xs text-zinc-600">No SOPs yet. Generate your first one!</p>
          </div>
        ) : (
          history.map((item: any) => (
            <div key={item.id} className="p-3 hover:bg-white/[0.03] transition-colors group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-white leading-tight line-clamp-2 flex-1">{item.title}</p>
                <button
                  onClick={() => del.mutate(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 mt-0.5 flex-shrink-0"
                  data-testid={`delete-sop-${item.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                {item.inputs?.platform && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-zinc-700 text-zinc-500">{item.inputs.platform}</span>}
                {item.inputs?.goal && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-primary/25 text-primary/70">{item.inputs.goal}</span>}
              </div>
              <button
                onClick={() => onLoad(item)}
                className="w-full text-left text-[10px] font-semibold transition-colors"
                style={{ color: "#d4b461" }}
                data-testid={`load-sop-${item.id}`}
              >
                Load SOP →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Callout boxes ────────────────────────────────────────────────────────────
function ProTip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-xl p-4" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.2)" }}>
      <Star className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Pro Tip</p>
        <p className="text-xs text-zinc-300 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function AvoidThis({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-xl p-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <Shield className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Avoid This</p>
        <p className="text-xs text-zinc-300 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function SpeedHack({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-xl p-4" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.25)" }}>
      <Zap className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Speed Hack</p>
        <p className="text-xs text-zinc-300 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ─── Results tabs ─────────────────────────────────────────────────────────────
const RESULT_TABS = [
  { id: "overview", label: "Overview", icon: Target },
  { id: "workflow", label: "Workflow", icon: Workflow },
  { id: "execution", label: "Execution", icon: ListChecks },
  { id: "quality", label: "Quality", icon: CheckSquare },
  { id: "automation", label: "Automation", icon: Bot },
  { id: "growth", label: "Growth", icon: TrendingUp },
  { id: "repurposing", label: "Repurposing", icon: Repeat },
  { id: "scaling", label: "Scaling", icon: Users },
  { id: "summary", label: "Summary", icon: BookOpen },
] as const;
type ResultTab = (typeof RESULT_TABS)[number]["id"];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SOPGenerator() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState<"config" | "results">("config");
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<SOPResult | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");
  const [copied, setCopied] = useState(false);
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  const [form, setForm] = useState({
    businessType: "",
    niche: "",
    platform: "",
    contentType: "",
    experienceLevel: "",
    teamSetup: "",
    goal: "",
    postingFrequency: "",
    biggestStruggle: "",
  });
  const setF = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/history", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "sop-generator"] }),
  });

  const applyInspo = (ins: typeof INSPIRATIONS[0]) => {
    const { label: _l, ...fields } = ins;
    setForm(f => ({ ...f, ...fields }));
  };

  const handleGenerate = async () => {
    if (!form.businessType || !form.niche.trim() || !form.platform || !form.goal) {
      toast({ title: "Fill required fields", description: "At minimum: business type, niche, platform, and goal.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setApiDone(false);

    try {
      const data: SOPResult = await apiRequest("POST", "/api/ai/sop/generate", form);
      setResult(data);
      setApiDone(true);

      saveMut.mutate({
        tool: "sop-generator",
        title: data.sopName || `${form.niche} SOP — ${form.goal}`,
        inputs: form,
        output: { tagline: data.tagline, stages: data.workflowStages?.length },
      });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
      setApiDone(false);
    }
  };

  const handleReady = () => {
    setGenerating(false);
    setApiDone(false);
    setStep("results");
    setActiveTab("overview");
    setActiveStageIdx(0);
  };

  const loadFromHistory = (item: any) => {
    if (item.inputs) setForm(item.inputs);
  };

  const copySOP = () => {
    if (!result) return;
    const lines: string[] = [
      `# ${result.sopName}`,
      `${result.tagline}`,
      ``,
      `## Overview`,
      `Objective: ${result.overview?.objective}`,
      `Outcome: ${result.overview?.outcome}`,
      `Time: ${result.overview?.timeInvestment}`,
      `Tools: ${result.overview?.toolsRequired?.join(", ")}`,
      ``,
      `## Workflow Stages`,
      ...(result.workflowStages || []).map((s, i) => `${i + 1}. ${s.name} (${s.duration}) — ${s.description}`),
      ``,
      `## Key Rules`,
      ...(result.executionSummary?.keyRules || []).map(r => `• ${r}`),
      ``,
      `## Consistency Tips`,
      ...(result.executionSummary?.consistencyTips || []).map(t => `• ${t}`),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "SOP copied to clipboard!" });
    });
  };

  // ── Generating screen ──────────────────────────────────────────────────────
  if (generating) {
    return (
      <ClientLayout>
        <GeneratingScreen
          label="your content system SOP"
          minMs={47000}
          isComplete={apiDone}
          onReady={handleReady}
          steps={[
            "Analysing your business context",
            "Designing workflow stages",
            "Building step-by-step execution plan",
            "Creating quality control system",
            "Mapping automation & efficiency",
            "Building repurposing system",
            "Compiling your execution summary",
          ]}
        />
      </ClientLayout>
    );
  }

  // ── Results view ───────────────────────────────────────────────────────────
  if (step === "results" && result) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto px-5 py-8">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep("config")}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              data-testid="btn-back-to-form"
            >
              <ArrowLeft className="w-4 h-4" />Edit Inputs
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/ai-design")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700"
                data-testid="btn-ai-design"
              >
                <ArrowLeft className="w-3 h-3" />AI Design Hub
              </button>
              <Button size="sm" onClick={copySOP} className="h-8 text-xs gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white" data-testid="btn-copy-sop">
                {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy SOP</>}
              </Button>
              <Button size="sm" onClick={handleGenerate} className="h-8 text-xs gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white" data-testid="btn-regenerate">
                <RefreshCw className="w-3 h-3" />Regenerate
              </Button>
            </div>
          </div>

          {/* SOP hero */}
          <div className="relative rounded-2xl border border-primary/30 p-6 mb-6 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(212,180,97,0.1) 0%, rgba(212,180,97,0.03) 100%)" }}>
            <div className="absolute top-3 right-3 opacity-10"><Rocket className="w-16 h-16 text-primary" /></div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Content System SOP</span>
              {result.overview?.difficultyLevel && (
                <Badge className="text-[9px] bg-zinc-800 text-zinc-400 border-zinc-700">{result.overview.difficultyLevel}</Badge>
              )}
            </div>
            <h2 className="text-2xl font-black text-white mb-1">{result.sopName}</h2>
            <p className="text-sm text-zinc-300">{result.tagline}</p>
            {result.overview?.timeInvestment && (
              <div className="flex items-center gap-4 mt-3">
                <span className="text-xs text-zinc-500 flex items-center gap-1.5"><Clock className="w-3 h-3" />{result.overview.timeInvestment}</span>
                <span className="text-xs text-zinc-500">{result.workflowStages?.length || 6} stages</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto gap-0 rounded-xl border border-zinc-800 mb-6" style={{ scrollbarWidth: "none" }}>
            {RESULT_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-r border-zinc-800 last:border-r-0 flex-shrink-0 ${activeTab === tab.id ? "bg-primary/15 text-primary" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"}`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Overview ── */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Objective", value: result.overview?.objective, icon: Target },
                  { label: "Expected Outcome", value: result.overview?.outcome, icon: Rocket },
                  { label: "Who Executes", value: result.overview?.whoExecutes, icon: Users },
                  { label: "Time Investment", value: result.overview?.timeInvestment, icon: Clock },
                ].map(({ label, value, icon: Icon }) => value && (
                  <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{label}</p>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
              {result.overview?.toolsRequired?.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Tools Required</p>
                  <div className="flex flex-wrap gap-2">
                    {result.overview.toolsRequired.map((tool, i) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(212,180,97,0.08)", border: "1px solid rgba(212,180,97,0.2)", color: "#d4b461" }}>
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.overview?.proTip && <ProTip text={result.overview.proTip} />}
            </div>
          )}

          {/* ── Workflow ── */}
          {activeTab === "workflow" && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 mb-2">Click any stage to jump to its execution steps</p>
              {(result.workflowStages || []).map((stage, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveStageIdx(i); setActiveTab("execution"); }}
                  className="w-full text-left rounded-2xl p-5 transition-all group hover:border-primary/30"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                  data-testid={`stage-${i}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm" style={{ background: "rgba(212,180,97,0.12)", color: "#d4b461" }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-sm font-bold text-white">{stage.name}</h3>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-600 flex-shrink-0">
                          {stage.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{stage.duration}</span>}
                          <ChevronRight className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{stage.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {stage.who && <span className="text-[10px] text-zinc-600">👤 {stage.who}</span>}
                        {stage.output && <span className="text-[10px] text-zinc-600">📦 {stage.output}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Execution ── */}
          {activeTab === "execution" && (
            <div className="space-y-5">
              {/* Stage selector */}
              <div className="flex gap-2 flex-wrap">
                {(result.executionSteps || []).map((stageData, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStageIdx(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeStageIdx === i ? "text-black" : "text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700"}`}
                    style={activeStageIdx === i ? { background: "#d4b461" } : {}}
                  >
                    {stageData.stage || `Stage ${i + 1}`}
                  </button>
                ))}
              </div>

              {result.executionSteps?.[activeStageIdx] && (
                <div className="space-y-4">
                  {result.executionSteps[activeStageIdx].steps?.map((step, si) => (
                    <div key={si} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-start gap-3 mb-3">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0" style={{ background: "rgba(212,180,97,0.15)", color: "#d4b461" }}>{step.number}</span>
                        <h4 className="text-sm font-bold text-white leading-snug">{step.action}</h4>
                      </div>
                      {step.microActions?.length > 0 && (
                        <ul className="space-y-1.5 mb-3 ml-9">
                          {step.microActions.map((ma, mi) => (
                            <li key={mi} className="flex items-start gap-2 text-xs text-zinc-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 mt-1.5" />
                              {ma}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="ml-9 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                        {step.timeEstimate && (
                          <div className="flex items-center gap-1.5 text-zinc-600">
                            <Clock className="w-3 h-3" />{step.timeEstimate}
                          </div>
                        )}
                        {step.tools?.length > 0 && (
                          <div className="text-zinc-600">🛠 {step.tools.join(", ")}</div>
                        )}
                        {step.decisionRule && (
                          <div className="text-zinc-600 col-span-full">⚡ {step.decisionRule}</div>
                        )}
                        {step.qualityStandard && (
                          <div className="col-span-full text-xs text-zinc-500 rounded-lg px-3 py-2 mt-1" style={{ background: "rgba(255,255,255,0.03)" }}>
                            ✓ Quality: {step.qualityStandard}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Quality Control ── */}
          {activeTab === "quality" && (
            <div className="space-y-5">
              {result.qualityControl?.avoidThis && <AvoidThis text={result.qualityControl.avoidThis} />}
              {result.qualityControl?.prePublishChecklist?.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5" />Pre-Publish Checklist</p>
                  <ul className="space-y-2">
                    {result.qualityControl.prePublishChecklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-zinc-300">
                        <div className="w-4 h-4 rounded border border-zinc-700 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.qualityControl?.whatGoodLooksLike && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">What Good Looks Like</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.qualityControl.whatGoodLooksLike}</p>
                </div>
              )}
              {result.qualityControl?.commonMistakes?.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3">Common Mistakes</p>
                  <ul className="space-y-2">
                    {result.qualityControl.commonMistakes.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                        <span className="text-red-500 flex-shrink-0">✕</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.qualityControl?.qualityBenchmarks && Object.keys(result.qualityControl.qualityBenchmarks).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(result.qualityControl.qualityBenchmarks).map(([key, val]) => val && (
                    <div key={key} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-[10px] text-zinc-600 capitalize mb-1">{key}</p>
                      <p className="text-sm font-bold text-white">{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Automation ── */}
          {activeTab === "automation" && (
            <div className="space-y-5">
              {result.automation?.speedHack && <SpeedHack text={result.automation.speedHack} />}
              {[
                { title: "What to Automate", items: result.automation?.whatToAutomate, icon: "🤖", color: "text-indigo-400" },
                { title: "What to Batch", items: result.automation?.whatToBatch, icon: "📦", color: "text-blue-400" },
                { title: "AI Usage Points", items: result.automation?.aiUsagePoints, icon: "✨", color: "text-primary" },
                { title: "Time Reduction Tips", items: result.automation?.timeReductionTips, icon: "⚡", color: "text-yellow-400" },
              ].map(({ title, items, icon, color }) => items?.length > 0 && (
                <div key={title} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${color}`}>{icon} {title}</p>
                  <ul className="space-y-2">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 mt-1.5" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* ── Growth (Optimization Loop) ── */}
          {activeTab === "growth" && (
            <div className="space-y-5">
              {result.optimizationLoop?.metricsToTrack?.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="px-5 py-3" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Metrics to Track</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {result.optimizationLoop.metricsToTrack.map((m, i) => (
                      <div key={i} className="px-5 py-4 grid grid-cols-4 gap-3 text-xs">
                        <div><p className="font-bold text-white">{m.metric}</p><p className="text-zinc-600 text-[10px] mt-0.5">{m.why}</p></div>
                        <div><p className="text-zinc-500 text-[10px] mb-1">Target</p><p className="text-zinc-300">{m.target}</p></div>
                        <div><p className="text-zinc-500 text-[10px] mb-1">Check</p><p className="text-zinc-300">{m.frequency}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {[
                { label: "Weekly Review System", value: result.optimizationLoop?.weeklyReviewSystem },
                { label: "Improvement Loop", value: result.optimizationLoop?.improvementLoop },
                { label: "Monthly Reset Protocol", value: result.optimizationLoop?.monthlyResetProtocol },
              ].map(({ label, value }) => value && (
                <div key={label} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{label}</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Repurposing ── */}
          {activeTab === "repurposing" && (
            <div className="space-y-5">
              {result.repurposingSystem?.coreToFive && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">1 → 5 Content Strategy</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.repurposingSystem.coreToFive}</p>
                </div>
              )}
              {result.repurposingSystem?.platformAdaptations?.length > 0 && (
                <div className="space-y-3">
                  {result.repurposingSystem.platformAdaptations.map((pa, i) => (
                    <div key={i} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>{pa.platform}</span>
                        {pa.format && <span className="text-[10px] text-zinc-600">{pa.format}</span>}
                      </div>
                      <p className="text-xs text-zinc-300 mb-1.5">{pa.adaptation}</p>
                      {pa.uniqueAngle && <p className="text-[11px] text-zinc-500 italic">💡 {pa.uniqueAngle}</p>}
                    </div>
                  ))}
                </div>
              )}
              {result.repurposingSystem?.repurposingSchedule && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Distribution Schedule</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.repurposingSystem.repurposingSchedule}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Scaling ── */}
          {activeTab === "scaling" && (
            <div className="space-y-5">
              {result.scalingSystem?.applicableNote && (
                <div className="rounded-xl p-3 text-xs text-zinc-500 italic" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {result.scalingSystem.applicableNote}
                </div>
              )}
              {result.scalingSystem?.roles?.length > 0 && (
                <div className="space-y-3">
                  {result.scalingSystem.roles.map((role, i) => (
                    <div key={i} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-white">{role.role}</h4>
                        {role.hireWhen && <span className="text-[10px] text-zinc-600">{role.hireWhen}</span>}
                      </div>
                      <ul className="space-y-1">
                        {role.responsibilities?.map((r, ri) => (
                          <li key={ri} className="flex items-start gap-2 text-xs text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 mt-1.5" />{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              {[
                { label: "Handoff Process", value: result.scalingSystem?.handoffProcess },
                { label: "Communication Structure", value: result.scalingSystem?.communicationStructure },
                { label: "Consistency System", value: result.scalingSystem?.consistencySystem },
              ].map(({ label, value }) => value && (
                <div key={label} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{label}</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Summary ── */}
          {activeTab === "summary" && (
            <div className="space-y-5">
              {result.executionSummary?.simplifiedSystem && (
                <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(212,180,97,0.08) 0%, rgba(212,180,97,0.02) 100%)", border: "1px solid rgba(212,180,97,0.2)" }}>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Simplified System</p>
                  <p className="text-sm text-zinc-200 leading-relaxed">{result.executionSummary.simplifiedSystem}</p>
                </div>
              )}
              {result.executionSummary?.firstWeekPlan && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">🗓 Your First 7 Days</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.executionSummary.firstWeekPlan}</p>
                </div>
              )}
              {result.executionSummary?.keyRules?.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Key Rules</p>
                  <ul className="space-y-2">
                    {result.executionSummary.keyRules.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-zinc-300">
                        <span className="font-black text-primary flex-shrink-0">{i + 1}.</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.executionSummary?.consistencyTips?.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Consistency Tips</p>
                  <ul className="space-y-2">
                    {result.executionSummary.consistencyTips.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 mt-1.5" />{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.executionSummary?.motivationalClose && (
                <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.15)" }}>
                  <p className="text-sm font-semibold text-zinc-200 leading-relaxed italic">"{result.executionSummary.motivationalClose}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </ClientLayout>
    );
  }

  // ── Config view ────────────────────────────────────────────────────────────
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
            <ArrowLeft className="w-3.5 h-3.5" />AI Design Hub
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
            <Layers className="w-4 h-4" style={{ color: "#d4b461" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Content System Builder</h1>
            <p className="text-xs text-muted-foreground">AI designs your complete operating system — workflow, execution, quality, automation and scaling</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Form ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Inspiration chips */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Start with an example</p>
              <div className="flex flex-wrap gap-2">
                {INSPIRATIONS.map(ins => (
                  <button
                    key={ins.label}
                    onClick={() => applyInspo(ins)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                    style={{ borderColor: "rgba(212,180,97,0.25)", color: "#d4b461", background: "rgba(212,180,97,0.06)" }}
                    data-testid={`inspo-${ins.label.toLowerCase().replace(/ /g, "-")}`}
                  >
                    {ins.label}
                  </button>
                ))}
                <button
                  onClick={() => setForm({ businessType: "", niche: "", platform: "", contentType: "", experienceLevel: "", teamSetup: "", goal: "", postingFrequency: "", biggestStruggle: "" })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:border-white/25 transition-all"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Form card */}
            <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Build Your Content System</p>

              {/* Row 1: Business Type + Goal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">What are you building? <span className="text-red-500">*</span></label>
                  <SelectInput
                    value={form.businessType}
                    onChange={v => setF("businessType", v)}
                    options={["Personal Brand", "Agency", "SaaS", "Creator", "E-Commerce", "Coach / Consultant"]}
                    placeholder="Select type…"
                    testId="select-business-type"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Your goal <span className="text-red-500">*</span></label>
                  <SelectInput
                    value={form.goal}
                    onChange={v => setF("goal", v)}
                    options={["Growth", "Leads", "Sales", "Authority", "Community", "Monetization"]}
                    placeholder="Select goal…"
                    testId="select-goal"
                  />
                </div>
              </div>

              {/* Niche */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Your niche <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    value={form.niche}
                    onChange={e => setF("niche", e.target.value)}
                    placeholder="e.g. Fitness, Business Coaching, AI, Finance, Real Estate…"
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(212,180,97,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    data-testid="input-niche"
                  />
                  <div className="mt-2">
                    <WriteWithAI text={form.niche} onChange={v => setF("niche", v)} context="Content niche description for a content creator SOP" />
                  </div>
                </div>
              </div>

              {/* Row 2: Platform + Content Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Primary platform <span className="text-red-500">*</span></label>
                  <SelectInput
                    value={form.platform}
                    onChange={v => setF("platform", v)}
                    options={["Instagram", "YouTube", "LinkedIn", "X (Twitter)", "TikTok", "Podcast"]}
                    placeholder="Select platform…"
                    testId="select-platform"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Content type</label>
                  <SelectInput
                    value={form.contentType}
                    onChange={v => setF("contentType", v)}
                    options={["Reels / Shorts", "Carousels", "Long-form Video", "Podcasts", "Written Posts", "Stories", "Mixed"]}
                    placeholder="Select type…"
                    testId="select-content-type"
                  />
                </div>
              </div>

              {/* Row 3: Experience + Team */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Your current level</label>
                  <SelectInput
                    value={form.experienceLevel}
                    onChange={v => setF("experienceLevel", v)}
                    options={["Beginner", "Intermediate", "Advanced"]}
                    placeholder="Select level…"
                    testId="select-level"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Team setup</label>
                  <SelectInput
                    value={form.teamSetup}
                    onChange={v => setF("teamSetup", v)}
                    options={["Solo", "Solo + VA", "Small team (2–5)", "Agency (5+)"]}
                    placeholder="Select setup…"
                    testId="select-team"
                  />
                </div>
              </div>

              {/* Row 4: Frequency + Struggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Posting frequency</label>
                  <SelectInput
                    value={form.postingFrequency}
                    onChange={v => setF("postingFrequency", v)}
                    options={["Daily", "5x week", "3x week", "Weekly", "2x month"]}
                    placeholder="Select frequency…"
                    testId="select-frequency"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Biggest struggle</label>
                  <SelectInput
                    value={form.biggestStruggle}
                    onChange={v => setF("biggestStruggle", v)}
                    options={["Ideas & Ideation", "Consistency", "Editing & Production", "Growth & Reach", "Monetization", "Engagement", "Time Management"]}
                    placeholder="Select struggle…"
                    testId="select-struggle"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!form.businessType || !form.niche.trim() || !form.platform || !form.goal}
              className="w-full h-12 text-sm font-black gap-2 text-black disabled:opacity-40"
              style={{ background: "#d4b461" }}
              data-testid="btn-generate-sop"
            >
              <Sparkles className="w-4 h-4" />Build My Content System
            </Button>
          </div>

          {/* ── Right: History ── */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Past SOPs</p>
            <HistorySidePanel onLoad={loadFromHistory} />

            {/* What you get teaser */}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">What You Get</p>
              {[
                { icon: Workflow, label: "6-stage workflow system" },
                { icon: ListChecks, label: "Step-by-step execution plan" },
                { icon: CheckSquare, label: "Quality control checklist" },
                { icon: Bot, label: "Automation & AI usage map" },
                { icon: TrendingUp, label: "Growth & optimization loop" },
                { icon: Repeat, label: "Repurposing strategy" },
                { icon: Users, label: "Team scaling system" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs text-zinc-500">
                  <Icon className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />{label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
