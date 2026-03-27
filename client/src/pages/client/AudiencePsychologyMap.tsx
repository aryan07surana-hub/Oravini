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
  Brain, Sparkles, Wand2, Clock, Bookmark, Trash2, X,
  ChevronLeft, MessageSquare, Lightbulb, ShieldAlert,
  TrendingUp, Zap, Copy, Check, Eye, RefreshCw, Activity,
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface APMForm {
  businessDescription: string;
  targetAudienceDescription: string;
  icpSummary: string;
}
interface APMResult {
  buyerClarity: {
    awarenessStage: string;
    triggerToSearch: string;
    whatMakesThemSayYes: string;
    trustBuilders: string;
    proofNeeded: string;
    decisionTimeline?: string;
    objections: { title: string; type: "visible" | "hidden"; description: string }[];
    internalDialogue: string;
    emotionalTriggers: string[];
    externalTriggers: string[];
  };
  psychologyMap: {
    currentSelfImage: string;
    desiredPublicImage: string;
    identityShiftNeeded: string;
    coreEmotions: string[];
    emotionalHighs: string;
    emotionalLows: string;
    whatKeepsThemStuck: string;
    limitingBeliefs: string[];
    empoweringBeliefs: string[];
    falseAssumptions: string[];
    exactPhrases: string[];
    frustrationExpressions: string[];
    emotionalKeywords: string[];
  };
  messagingInsights: {
    resonantAngles: string[];
    immediateAttentionAngle: string;
    doNotSay: string[];
    mostCompellingPromise: string;
    headlineFormulas?: string[];
    ctaApproach?: string;
  };
  contentDirection: {
    contentIdeas: string[];
    offerAngles: string[];
    scrollStoppingHooks: string[];
    positioningSuggestions: string[];
    platformStrategy?: string;
  };
  scores?: {
    buyerReadiness: number;
    emotionalIntensity: number;
    resistanceLevel: number;
    identityGapSize: number;
    messagingResonance: number;
    purchaseUrgency: number;
    trustRequired: number;
    scoreNotes?: string;
  };
}

const INSPIRATIONS = [
  {
    label: "Online Coach",
    businessDescription: "A 1:1 online coaching program helping ambitious professionals build a personal brand and land high-paying clients through LinkedIn content, positioning, and outreach systems. $3k–$10k programs, 3–6 month engagements.",
    targetAudienceDescription: "Mid-career professionals aged 28–42 who are experts in their field but invisible online. They've tried posting randomly, watched courses, but still feel like no one takes them seriously as an authority.",
    icpSummary: "",
  },
  {
    label: "Content SaaS",
    businessDescription: "An AI-powered content platform (Brandverse) that helps creators, coaches and personal brands generate, plan, and automate content across Instagram, YouTube, and LinkedIn. Mid-tier SaaS, $97–$197/mo.",
    targetAudienceDescription: "Content creators and online entrepreneurs aged 22–38 who struggle with consistency, don't know what to post, and feel overwhelmed by algorithms and trends.",
    icpSummary: "",
  },
  {
    label: "E-Commerce",
    businessDescription: "A premium skincare brand using science-backed formulations and clean ingredients to help people achieve healthy, glowing skin without harsh chemicals or complicated 10-step routines. $60–$150 per product.",
    targetAudienceDescription: "Health-conscious women aged 25–40 who've tried countless products, are frustrated with broken promises and sensitivities, and want a simple routine that actually delivers visible results.",
    icpSummary: "",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function PillList({ items, color = "#d4b461" }: { items: string[]; color?: string }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {(items || []).map((item, i) => (
        <span key={i} className="text-xs px-3 py-1 rounded-full border font-medium" style={{ borderColor: color + "40", background: color + "12", color }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function CopyableQuote({ text, index, copied, onCopy }: { text: string; index: number; copied: string | null; onCopy: (t: string, k: string) => void }) {
  const key = `quote-${index}`;
  return (
    <div className="bg-zinc-800/60 rounded-xl p-3 flex items-start justify-between gap-3 group">
      <p className="text-xs text-zinc-200 leading-snug italic flex-1">"{text}"</p>
      <button onClick={() => onCopy(text, key)} className="flex-shrink-0 text-zinc-600 hover:text-primary transition-colors">
        {copied === key ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ─── Right-side history panel ─────────────────────────────────────────────────
function HistorySidePanel({ onLoad }: { onLoad: (e: any) => void }) {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/ai/history", "audience-psychology-map"],
    queryFn: () => apiRequest("GET", "/api/ai/history?tool=audience-psychology-map"),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ai/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "audience-psychology-map"] }),
  });
  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", minHeight: 320 }}
    >
      <div className="px-4 py-3 border-b flex items-center gap-2 flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold text-white">Saved Maps</span>
        <Badge className="ml-auto bg-primary/10 text-primary border-0 text-[10px]">{(history as any[]).length}</Badge>
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
            <p className="text-xs text-zinc-500 font-medium">No saved maps yet</p>
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
            <p className="text-xs font-semibold text-white truncate">{e.title || "Untitled Map"}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-zinc-600">{e.createdAt ? new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</p>
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AudiencePsychologyMap() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<"config" | "results">("config");
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<APMResult | null>(null);
  const [activeTab, setActiveTab] = useState<"buyer" | "psychology" | "messaging" | "content" | "scores">("buyer");
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState<APMForm>({
    businessDescription: "",
    targetAudienceDescription: "",
    icpSummary: "",
  });
  const setF = (k: keyof APMForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/history", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "audience-psychology-map"] }),
  });

  const handleGenerate = async () => {
    if (!form.businessDescription.trim()) {
      toast({ title: "Required", description: "Describe your business to generate the psychology map.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setApiDone(false);
    try {
      const data: APMResult = await apiRequest("POST", "/api/ai/audience-psychology/generate", {
        businessDescription: form.businessDescription,
        targetAudienceDescription: form.targetAudienceDescription,
        icpSummary: form.icpSummary,
      });
      setResult(data);
      setApiDone(true);
      saveMut.mutate({
        tool: "audience-psychology-map",
        title: form.businessDescription.slice(0, 55),
        inputs: {},
        output: data,
      });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
    }
  };

  const handleDone = () => { setGenerating(false); setStep("results"); setActiveTab("buyer"); };

  const handleLoadHistory = (e: any) => {
    if (e.output) { setResult(e.output); setStep("results"); setActiveTab("buyer"); }
  };

  const applyInspiration = (ins: typeof INSPIRATIONS[0]) => {
    setForm(f => ({
      ...f,
      businessDescription: ins.businessDescription,
      targetAudienceDescription: ins.targetAudienceDescription,
    }));
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  };

  // ── Generating Screen ──
  if (generating) {
    return (
      <GeneratingScreen
        label="Mapping your audience psychology…"
        steps={["Analysing buying behaviour", "Mapping identity & emotions", "Extracting belief systems", "Crafting messaging insights", "Building content direction"]}
        isComplete={apiDone}
        onReady={handleDone}
        minMs={45000}
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
              <Brain className="w-4 h-4" style={{ color: "#d4b461" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Audience Psychology Map</h1>
              <p className="text-xs text-muted-foreground">Deep psychology breakdown — buying behaviour, emotions, beliefs, messaging angles & content strategy</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Setup form */}
            <div className="lg:col-span-3 space-y-5">
              {/* Inspiration chips */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Start with an example</p>
                <div className="flex flex-wrap gap-2">
                  {INSPIRATIONS.map(ins => (
                    <button
                      key={ins.label}
                      onClick={() => applyInspiration(ins)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={{ borderColor: "rgba(212,180,97,0.25)", color: "#d4b461", background: "rgba(212,180,97,0.06)" }}
                      data-testid={`inspiration-${ins.label.toLowerCase().replace(/ /g, "-")}`}
                    >
                      {ins.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setForm({ businessDescription: "", targetAudienceDescription: "", icpSummary: "" })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:border-white/25 transition-all"
                    data-testid="inspiration-blank"
                  >
                    Start from scratch
                  </button>
                </div>
              </div>

              {/* Form card */}
              <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {/* Business description */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    Business description <span style={{ color: "#d4b461" }}>*</span>
                  </label>
                  <textarea
                    value={form.businessDescription}
                    onChange={e => setF("businessDescription", e.target.value)}
                    placeholder="Describe your business, what you sell, the transformation you provide, and your price range. The more detail, the more accurate the psychology map."
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none resize-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(212,180,97,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    data-testid="input-business-description"
                  />
                  <WriteWithAI
                    text={form.businessDescription}
                    onChange={v => setF("businessDescription", v)}
                    context="describing a business for audience psychology research"
                    className="mt-2"
                  />
                </div>

                {/* Target audience */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    Target audience description <span className="text-zinc-600 font-normal">(recommended — adds precision)</span>
                  </label>
                  <textarea
                    value={form.targetAudienceDescription}
                    onChange={e => setF("targetAudienceDescription", e.target.value)}
                    placeholder="Who is your target audience? What do they struggle with? What have they tried before? What frustrates them most?"
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none resize-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(212,180,97,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    data-testid="input-audience-description"
                  />
                  <WriteWithAI
                    text={form.targetAudienceDescription}
                    onChange={v => setF("targetAudienceDescription", v)}
                    context="describing a target audience for psychology and buying behaviour research"
                    className="mt-2"
                  />
                </div>

                {/* Paste ICP */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    Paste ICP results <span className="text-zinc-600 font-normal">(optional — paste from ICP Builder for deeper analysis)</span>
                  </label>
                  <textarea
                    value={form.icpSummary}
                    onChange={e => setF("icpSummary", e.target.value)}
                    placeholder="Paste key insights from your ICP Builder output here for even deeper, more personalised results…"
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none resize-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(212,180,97,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    data-testid="input-icp-summary"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">Go to ICP Builder → generate your profile → copy key insights and paste here</p>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!form.businessDescription.trim()}
                className="w-full h-12 font-bold text-base gap-3 text-black"
                style={{ background: "#d4b461" }}
                data-testid="btn-generate-apm"
              >
                <Wand2 className="w-5 h-5" />Generate Psychology Map
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Combines behavioral psychology, direct response strategy & buying science — ~45 seconds
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

  const TABS = [
    { id: "buyer", label: "Buyer Clarity", icon: ShieldAlert },
    { id: "psychology", label: "Psychology", icon: Brain },
    { id: "messaging", label: "Messaging", icon: MessageSquare },
    { id: "content", label: "Content", icon: Lightbulb },
    { id: "scores", label: "Scores", icon: Activity },
  ] as const;

  const radarData = result.scores
    ? [
        { subject: "Buyer Readiness", value: result.scores.buyerReadiness ?? 0 },
        { subject: "Emotional Intensity", value: result.scores.emotionalIntensity ?? 0 },
        { subject: "Resistance Level", value: result.scores.resistanceLevel ?? 0 },
        { subject: "Identity Gap", value: result.scores.identityGapSize ?? 0 },
        { subject: "Msg Resonance", value: result.scores.messagingResonance ?? 0 },
        { subject: "Purchase Urgency", value: result.scores.purchaseUrgency ?? 0 },
        { subject: "Trust Required", value: result.scores.trustRequired ?? 0 },
      ]
    : [];

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setStep("config")}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />Edit Inputs
            </button>
            <Button
              size="sm"
              onClick={handleGenerate}
              className="h-8 text-xs gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
              data-testid="btn-regenerate"
            >
              <RefreshCw className="w-3 h-3" />Regenerate
            </Button>
          </div>

          {/* Most compelling promise hero */}
          {result.messagingInsights?.mostCompellingPromise && (
            <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/4 p-6 mb-8 overflow-hidden">
              <div className="absolute top-3 right-3 opacity-10"><Brain className="w-16 h-16 text-primary" /></div>
              <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Most Compelling Promise</div>
              <p className="text-base font-bold text-white leading-relaxed">{result.messagingInsights.mostCompellingPromise}</p>
              <button onClick={() => copyText(result.messagingInsights.mostCompellingPromise, "promise")} className="mt-3 flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors">
                {copied === "promise" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === "promise" ? "Copied!" : "Copy this promise"}
              </button>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex rounded-xl border border-zinc-800 overflow-hidden mb-6">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-r border-zinc-800 last:border-r-0 ${activeTab === tab.id ? "bg-primary/15 text-primary" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"}`}
                  data-testid={`tab-${tab.id}`}>
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* Buyer Clarity tab */}
          {activeTab === "buyer" && result.buyerClarity && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Awareness Stage</div>
                  <p className="text-xs text-zinc-200 leading-relaxed">{result.buyerClarity.awarenessStage}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">What Triggers Them to Search</div>
                  <p className="text-xs text-zinc-200 leading-relaxed">{result.buyerClarity.triggerToSearch}</p>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Decision Drivers</div>
                {[
                  { label: "What Makes Them Say Yes", val: result.buyerClarity.whatMakesThemSayYes },
                  { label: "What Builds Trust", val: result.buyerClarity.trustBuilders },
                  { label: "Proof They Need", val: result.buyerClarity.proofNeeded },
                ].map(row => (
                  <div key={row.label}>
                    <div className="text-[9px] font-bold text-primary/60 uppercase tracking-wide mb-1">{row.label}</div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{row.val}</p>
                  </div>
                ))}
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Objections & Resistance</div>
                <div className="space-y-3">
                  {(result.buyerClarity.objections || []).map((obj, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 ${obj.type === "hidden" ? "bg-purple-900/40 text-purple-400 border border-purple-800/40" : "bg-red-900/30 text-red-400 border border-red-800/30"}`}>
                        {obj.type === "hidden" ? "Hidden" : "Visible"}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{obj.title}</div>
                        <p className="text-xs text-zinc-400 mt-0.5">{obj.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {result.buyerClarity.internalDialogue && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Internal Dialogue Before Buying</div>
                  <div className="bg-zinc-800/50 rounded-xl p-4 border-l-2 border-primary/40">
                    <p className="text-xs text-zinc-200 leading-relaxed italic">"{result.buyerClarity.internalDialogue}"</p>
                  </div>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Emotional Triggers</div>
                  <PillList items={result.buyerClarity.emotionalTriggers || []} color="#f87171" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">External Triggers</div>
                  <PillList items={result.buyerClarity.externalTriggers || []} color="#60a5fa" />
                </div>
              </div>
            </div>
          )}

          {/* Psychology tab */}
          {activeTab === "psychology" && result.psychologyMap && (
            <div className="space-y-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Identity</span>
                </div>
                {[
                  { label: "How They See Themselves Now", val: result.psychologyMap.currentSelfImage },
                  { label: "How They Want to Be Seen by Others", val: result.psychologyMap.desiredPublicImage },
                  { label: "Identity Shift Needed", val: result.psychologyMap.identityShiftNeeded, highlight: true },
                ].map(row => (
                  <div key={row.label} className={row.highlight ? "bg-primary/8 border border-primary/20 rounded-xl p-3" : ""}>
                    <div className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: row.highlight ? "#d4b461" : "#52525b" }}>{row.label}</div>
                    <p className="text-xs text-zinc-200 leading-relaxed">{row.val}</p>
                  </div>
                ))}
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Emotional Landscape</span>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-2">Core Emotions They Feel Daily</div>
                  <PillList items={result.psychologyMap.coreEmotions || []} color="#f59e0b" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] font-bold text-green-400/60 uppercase tracking-wide mb-1">Emotional Highs</div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{result.psychologyMap.emotionalHighs}</p>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-red-400/60 uppercase tracking-wide mb-1">Emotional Lows</div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{result.psychologyMap.emotionalLows}</p>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-1">What Keeps Them Stuck</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{result.psychologyMap.whatKeepsThemStuck}</p>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Belief System</span>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-red-400/70 uppercase tracking-wide mb-2">Limiting Beliefs</div>
                  <PillList items={result.psychologyMap.limitingBeliefs || []} color="#f87171" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-green-400/70 uppercase tracking-wide mb-2">Empowering Beliefs (after your offer)</div>
                  <PillList items={result.psychologyMap.empoweringBeliefs || []} color="#34d399" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-2">False Assumptions They Hold</div>
                  <PillList items={result.psychologyMap.falseAssumptions || []} color="#a78bfa" />
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Words They Actually Use</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[9px] font-bold text-primary/60 uppercase tracking-wide mb-2">Exact Phrases They Say / Think</div>
                    <div className="space-y-2">
                      {(result.psychologyMap.exactPhrases || []).map((p, i) => (
                        <CopyableQuote key={i} text={p} index={i} copied={copied} onCopy={copyText} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-red-400/60 uppercase tracking-wide mb-2">Frustration Expressions</div>
                    <div className="space-y-2">
                      {(result.psychologyMap.frustrationExpressions || []).map((p, i) => (
                        <CopyableQuote key={i} text={p} index={100 + i} copied={copied} onCopy={copyText} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-2">Emotional Keywords</div>
                    <PillList items={result.psychologyMap.emotionalKeywords || []} color="#d4b461" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messaging tab */}
          {activeTab === "messaging" && result.messagingInsights && (
            <div className="space-y-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Resonant Messaging Angles</div>
                <div className="space-y-2">
                  {(result.messagingInsights.resonantAngles || []).map((angle, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{angle}</p>
                    </div>
                  ))}
                </div>
              </div>
              {result.messagingInsights.immediateAttentionAngle && (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5">
                  <div className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider mb-2">Immediate Attention Angle</div>
                  <p className="text-sm font-semibold text-white leading-relaxed">{result.messagingInsights.immediateAttentionAngle}</p>
                </div>
              )}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider mb-3">Do NOT Say These Things</div>
                <div className="space-y-2">
                  {(result.messagingInsights.doNotSay || []).map((phrase, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <X className="w-3 h-3 text-red-400 flex-shrink-0" />
                      <p className="text-xs text-zinc-400">{phrase}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Content tab */}
          {activeTab === "content" && result.contentDirection && (
            <div className="space-y-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Content Ideas (Ready to Post)</span>
                </div>
                <div className="space-y-2">
                  {(result.contentDirection.contentIdeas || []).map((idea, i) => (
                    <div key={i} className="bg-zinc-800/60 rounded-xl p-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="text-[10px] font-bold text-primary/60 mt-0.5">#{i + 1}</span>
                        <p className="text-xs text-zinc-200 leading-snug">{idea}</p>
                      </div>
                      <button onClick={() => copyText(idea, `idea-${i}`)} className="flex-shrink-0 text-zinc-600 hover:text-primary transition-colors">
                        {copied === `idea-${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Scroll-Stopping Hooks</div>
                <div className="space-y-2">
                  {(result.contentDirection.scrollStoppingHooks || []).map((hook, i) => (
                    <CopyableQuote key={i} text={hook} index={200 + i} copied={copied} onCopy={copyText} />
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Offer Angles</div>
                  <div className="space-y-2">
                    {(result.contentDirection.offerAngles || []).map((angle, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <TrendingUp className="w-3 h-3 text-primary/50 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-300">{angle}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Positioning Suggestions</div>
                  <div className="space-y-2">
                    {(result.contentDirection.positioningSuggestions || []).map((sug, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 text-yellow-400/50 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-300">{sug}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Scores tab */}
          {activeTab === "scores" && (
            <div className="space-y-6">
              {!result.scores ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                  <Activity className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 font-medium">No score data available</p>
                  <p className="text-xs text-zinc-600 mt-1">Regenerate your psychology map to see the scores radar chart</p>
                </div>
              ) : (
                <>
                  {/* Radar Chart */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Psychology Score Radar</span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-4">All scores out of 10. Higher = stronger signal for that dimension.</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.07)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#71717a", fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: "#52525b", fontSize: 9 }} />
                        <Radar name="Score" dataKey="value" stroke="#d4b461" fill="#d4b461" fillOpacity={0.18} strokeWidth={2} />
                        <Tooltip
                          contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                          labelStyle={{ color: "#e4e4e7", fontWeight: 700 }}
                          formatter={(value: any) => [`${value}/10`]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Score cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "buyerReadiness", label: "Buyer Readiness", desc: "How ready they are to buy right now", color: "#34d399" },
                      { key: "emotionalIntensity", label: "Emotional Intensity", desc: "How emotionally charged their pain is", color: "#f87171" },
                      { key: "resistanceLevel", label: "Resistance Level", desc: "How much internal resistance exists", color: "#fb923c" },
                      { key: "identityGapSize", label: "Identity Gap", desc: "Distance between current and desired self", color: "#a78bfa" },
                      { key: "messagingResonance", label: "Messaging Resonance", desc: "How much the right message will land", color: "#60a5fa" },
                      { key: "purchaseUrgency", label: "Purchase Urgency", desc: "How urgently they need a solution", color: "#d4b461" },
                      { key: "trustRequired", label: "Trust Required", desc: "Amount of trust needed before they buy", color: "#f472b6" },
                    ].map(s => {
                      const val = result.scores?.[s.key as keyof typeof result.scores] as number | undefined;
                      const pct = typeof val === "number" ? val / 10 : 0;
                      return (
                        <div key={s.key} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide leading-tight">{s.label}</span>
                            <span className="text-xl font-black" style={{ color: s.color }}>{typeof val === "number" ? val : "–"}</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: s.color }} />
                          </div>
                          <p className="text-[10px] text-zinc-600 mt-1.5">{s.desc}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Score notes */}
                  {result.scores.scoreNotes && (
                    <div className="bg-primary/8 border border-primary/20 rounded-2xl p-5">
                      <div className="text-[9px] font-bold text-primary uppercase tracking-wider mb-2">AI Analysis of These Scores</div>
                      <p className="text-xs text-zinc-200 leading-relaxed">{result.scores.scoreNotes}</p>
                    </div>
                  )}

                  {/* Decision Timeline + Platform Strategy */}
                  <div className="space-y-4">
                    {result.buyerClarity?.decisionTimeline && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Decision Timeline</div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{result.buyerClarity.decisionTimeline}</p>
                      </div>
                    )}
                    {result.contentDirection?.platformStrategy && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                        <div className="text-[9px] font-bold text-blue-400/80 uppercase tracking-wider mb-2">Platform Strategy</div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{result.contentDirection.platformStrategy}</p>
                      </div>
                    )}
                    {result.messagingInsights?.ctaApproach && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                        <div className="text-[9px] font-bold text-orange-400/80 uppercase tracking-wider mb-2">Best CTA Approach</div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{result.messagingInsights.ctaApproach}</p>
                      </div>
                    )}
                    {(result.messagingInsights?.headlineFormulas || []).length > 0 && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                        <div className="text-[9px] font-bold text-yellow-400/80 uppercase tracking-wider mb-3">Headline Formulas That Convert</div>
                        <div className="space-y-2">
                          {(result.messagingInsights?.headlineFormulas || []).map((formula, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-4 h-4 rounded-md bg-yellow-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[8px] font-bold text-yellow-400">{i + 1}</span>
                              </div>
                              <p className="text-xs text-zinc-300">{formula}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
