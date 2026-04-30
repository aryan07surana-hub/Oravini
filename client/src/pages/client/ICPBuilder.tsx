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
  Users, Sparkles, Wand2, Clock, Bookmark, Trash2, X,
  ChevronLeft, Target, Brain, TrendingUp, AlertCircle,
  DollarSign, Heart, Zap, Copy, Check, RefreshCw, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ICPForm {
  businessName: string;
  whatYouSell: string;
  targetAudience: string;
  coreTransformation: string;
  priceRange: string;
}
interface ICPResult {
  businessSummary: {
    sharperDescription: string;
    refinedTargetAudience: string;
    coreTransformation: string;
    positioningStatement: string;
    unfairAdvantage?: string;
    marketSophistication?: string;
  };
  demographics: {
    ageRange: string;
    gender: string;
    location: string;
    incomeLevel: string;
    profession: string;
    educationLevel: string;
    deviceUsage?: string;
    purchasingBehaviour?: string;
  };
  psychographics: {
    beliefs: string;
    coreValues: string;
    aspirations: string;
    deepFears: string;
    worldview?: string;
    selfPerception?: string;
  };
  currentSituation: {
    dailyLife: string;
    alreadyTried: string[];
    whyFailed: string;
    repeatedFrustrations: string;
    currentWorkarounds?: string;
    informationSources?: string;
  };
  painPoints: {
    title: string;
    situation: string;
    emotionalFeel: string;
    cost: string;
    severity?: number;
    urgency?: number;
    frequency?: number;
  }[];
  desiredOutcomes: {
    dreamOutcome: string;
    shortTermDesires: string;
    longTermDesires: string;
    successDefinition: string;
  };
}

const PRICE_OPTIONS = [
  { id: "low", label: "Low-ticket", sub: "< $50 / mo", color: "#22c55e" },
  { id: "mid", label: "Mid-tier", sub: "$50–$200 / mo", color: "#d4b461" },
  { id: "premium", label: "Premium", sub: "$200–$1k / mo", color: "#a855f7" },
  { id: "high-ticket", label: "High-ticket", sub: "$1k+ / engagement", color: "#f97316" },
];

const INSPIRATIONS = [
  {
    label: "Online Coaching",
    whatYouSell: "A 1:1 online coaching program helping ambitious professionals build a personal brand and land high-paying clients through LinkedIn content, positioning, and outreach systems.",
    targetAudience: "Mid-career professionals aged 28–42 who are experts in their field but invisible online. They want to attract clients instead of chasing them.",
    coreTransformation: "From anonymous expert → to recognized authority with an inbound lead system generating 5–10 qualified leads per week.",
    priceRange: "high-ticket",
  },
  {
    label: "Content SaaS",
    whatYouSell: "An AI-powered content platform that helps creators generate, plan, and automate content across Instagram, YouTube, and LinkedIn — including AI content ideas, competitor analysis, and posting automation.",
    targetAudience: "Content creators, personal brand builders, and online coaches aged 22–38 who want to grow on social media but struggle with consistency and knowing what to post.",
    coreTransformation: "From inconsistent, confused poster → to a structured content system with consistent growth, engagement, and monetization on autopilot.",
    priceRange: "mid",
  },
  {
    label: "E-Commerce Brand",
    whatYouSell: "A premium skincare brand using science-backed formulations and clean ingredients to help people achieve healthy, glowing skin without harsh chemicals or complicated routines.",
    targetAudience: "Health-conscious women aged 25–40 who have tried countless products, are frustrated with broken promises, and want a simple routine that actually works.",
    coreTransformation: "From overwhelmed, skeptical skincare consumer → to confident, radiant person with a 3-step routine that delivers visible results in 30 days.",
    priceRange: "premium",
  },
];

// ─── Right-side history panel ─────────────────────────────────────────────────
function HistorySidePanel({ onLoad }: { onLoad: (e: any) => void }) {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/ai/history", "icp-builder"],
    queryFn: () => apiRequest("GET", "/api/ai/history?tool=icp-builder"),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ai/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "icp-builder"] }),
  });
  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", minHeight: 320 }}
    >
      <div className="px-4 py-3 border-b flex items-center gap-2 flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold text-white">Saved ICPs</span>
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
            <p className="text-xs text-zinc-500 font-medium">No saved ICPs yet</p>
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
            <p className="text-xs font-semibold text-white truncate">{e.title || "Untitled ICP"}</p>
            {e.inputs?.priceRange && (
              <Badge className="mt-1 bg-zinc-800 text-zinc-400 border-0 text-[10px] capitalize">{e.inputs.priceRange}</Badge>
            )}
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
export default function ICPBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<"config" | "results">("config");
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<ICPResult | null>(null);
  const [activeTab, setActiveTab] = useState<"business" | "profile" | "pains" | "outcomes" | "charts">("business");
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState<ICPForm>({
    businessName: "",
    whatYouSell: "",
    targetAudience: "",
    coreTransformation: "",
    priceRange: "mid",
  });
  const setF = (k: keyof ICPForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/history", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "icp-builder"] }),
  });

  const handleGenerate = async () => {
    if (!form.whatYouSell.trim() || !form.targetAudience.trim()) {
      toast({ title: "Fill in required fields", description: "Tell us what you sell and who your audience is.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setApiDone(false);
    try {
      const data: ICPResult = await apiRequest("POST", "/api/ai/icp/generate", {
        businessName: form.businessName,
        whatYouSell: form.whatYouSell,
        targetAudience: form.targetAudience,
        coreTransformation: form.coreTransformation,
        priceRange: form.priceRange,
      });
      setResult(data);
      setApiDone(true);
      saveMut.mutate({
        tool: "icp-builder",
        title: form.businessName || form.whatYouSell.slice(0, 50),
        inputs: { priceRange: form.priceRange },
        output: data,
      });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
    }
  };

  const handleDone = () => { setGenerating(false); setStep("results"); setActiveTab("business"); };

  const handleLoadHistory = (e: any) => {
    if (e.output) { setResult(e.output); setStep("results"); setActiveTab("business"); }
  };

  const applyInspiration = (ins: typeof INSPIRATIONS[0]) => {
    setForm(f => ({
      ...f,
      whatYouSell: ins.whatYouSell,
      targetAudience: ins.targetAudience,
      coreTransformation: ins.coreTransformation,
      priceRange: ins.priceRange,
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
        label="Building your Ideal Customer Profile…"
        steps={["Interpreting your business context", "Building demographics layer", "Mapping psychographics & beliefs", "Identifying pain points", "Defining desired outcomes"]}
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
              <Users className="w-4 h-4" style={{ color: "#d4b461" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ICP Builder</h1>
              <p className="text-xs text-muted-foreground">AI builds your Ideal Customer Profile — demographics, psychographics, pain points & desires</p>
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
                    onClick={() => setForm({ businessName: "", whatYouSell: "", targetAudience: "", coreTransformation: "", priceRange: "mid" })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:border-white/25 transition-all"
                    data-testid="inspiration-blank"
                  >
                    Start from scratch
                  </button>
                </div>
              </div>

              {/* Form card */}
              <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {/* Business name */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    Business / Brand Name <span className="text-zinc-600 font-normal">(optional)</span>
                  </label>
                  <input
                    value={form.businessName}
                    onChange={e => setF("businessName", e.target.value)}
                    placeholder="e.g. Oravini, ContentOS, GrowthHQ…"
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(212,180,97,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    data-testid="input-business-name"
                  />
                </div>

                {/* What you sell */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    What do you sell? <span style={{ color: "#d4b461" }}>*</span>
                  </label>
                  <textarea
                    value={form.whatYouSell}
                    onChange={e => setF("whatYouSell", e.target.value)}
                    placeholder="e.g. An AI-powered content platform that helps creators generate, plan, and automate content across Instagram, YouTube, and LinkedIn. Includes AI content ideas, competitor analysis, virality scoring, and posting automation."
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none resize-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(212,180,97,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    data-testid="input-what-you-sell"
                  />
                  <WriteWithAI
                    text={form.whatYouSell}
                    onChange={v => setF("whatYouSell", v)}
                    context="describing a business / product for marketing research"
                    className="mt-2"
                  />
                </div>

                {/* Target audience */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    Who do you think your audience is? <span style={{ color: "#d4b461" }}>*</span>
                  </label>
                  <textarea
                    value={form.targetAudience}
                    onChange={e => setF("targetAudience", e.target.value)}
                    placeholder="e.g. Content creators, personal brand builders, online coaches and entrepreneurs who want to grow on social media but struggle with consistency and knowing what to post."
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none resize-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(212,180,97,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    data-testid="input-target-audience"
                  />
                  <WriteWithAI
                    text={form.targetAudience}
                    onChange={v => setF("targetAudience", v)}
                    context="describing a target audience for ICP research"
                    className="mt-2"
                  />
                </div>

                {/* Core transformation */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                    Core transformation you provide <span className="text-zinc-600 font-normal">(recommended)</span>
                  </label>
                  <textarea
                    value={form.coreTransformation}
                    onChange={e => setF("coreTransformation", e.target.value)}
                    placeholder="e.g. Going from confused, inconsistent creator → to a structured content system that produces consistent growth, engagement and monetization."
                    rows={2}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none resize-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(212,180,97,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    data-testid="input-transformation"
                  />
                  <WriteWithAI
                    text={form.coreTransformation}
                    onChange={v => setF("coreTransformation", v)}
                    context="describing the core transformation a business provides to its customers"
                    className="mt-2"
                  />
                </div>

                {/* Price range */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block font-medium">Price range</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRICE_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setF("priceRange", opt.id)}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all"
                        style={form.priceRange === opt.id
                          ? { borderColor: `${opt.color}60`, background: `${opt.color}12` }
                          : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }
                        }
                        data-testid={`price-${opt.id}`}
                      >
                        <DollarSign className="w-4 h-4" style={{ color: opt.color }} />
                        <span className="text-xs font-semibold" style={{ color: form.priceRange === opt.id ? opt.color : "#a1a1aa" }}>{opt.label}</span>
                        <span className="text-[10px] text-zinc-600">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!form.whatYouSell.trim() || !form.targetAudience.trim()}
                className="w-full h-12 font-bold text-base gap-3 text-black"
                style={{ background: "#d4b461" }}
                data-testid="btn-generate-icp"
              >
                <Wand2 className="w-5 h-5" />Build My ICP
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Powered by behavioral psychology + direct response strategy — ~45 seconds
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
    { id: "business", label: "Business", icon: Target },
    { id: "profile", label: "Customer", icon: Users },
    { id: "pains", label: "Pain Points", icon: AlertCircle },
    { id: "outcomes", label: "Outcomes", icon: TrendingUp },
    { id: "charts", label: "Charts", icon: BarChart2 },
  ] as const;

  // Build chart data from pain points
  const painChartData = (result.painPoints || []).map((p, i) => ({
    name: p.title?.length > 18 ? p.title.slice(0, 16) + "…" : (p.title || `Pain ${i + 1}`),
    fullName: p.title,
    Severity: p.severity ?? 0,
    Urgency: p.urgency ?? 0,
    Frequency: p.frequency ?? 0,
  }));

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
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{result.painPoints?.length || 5} pain points</Badge>
              <Button
                size="sm"
                onClick={handleGenerate}
                className="h-8 text-xs gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                data-testid="btn-regenerate"
              >
                <RefreshCw className="w-3 h-3" />Regenerate
              </Button>
            </div>
          </div>

          {/* Positioning statement hero */}
          {result.businessSummary?.positioningStatement && (
            <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/4 p-6 mb-8 overflow-hidden">
              <div className="absolute top-3 right-3 opacity-10">
                <Sparkles className="w-16 h-16 text-primary" />
              </div>
              <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Positioning Statement</div>
              <p className="text-base font-bold text-white leading-relaxed">{result.businessSummary.positioningStatement}</p>
              <button
                onClick={() => copyText(result.businessSummary.positioningStatement, "positioning")}
                className="mt-3 flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors"
              >
                {copied === "positioning" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === "positioning" ? "Copied!" : "Copy positioning statement"}
              </button>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex rounded-xl border border-zinc-800 overflow-hidden mb-6">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-r border-zinc-800 last:border-r-0 ${activeTab === tab.id ? "bg-primary/15 text-primary" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"}`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* Business tab */}
          {activeTab === "business" && (
            <div className="space-y-5">
              {[
                { label: "What You Actually Sell", val: result.businessSummary?.sharperDescription, icon: Target, color: "#d4b461" },
                { label: "Refined Target Audience", val: result.businessSummary?.refinedTargetAudience, icon: Users, color: "#60a5fa" },
                { label: "Core Transformation", val: result.businessSummary?.coreTransformation, icon: TrendingUp, color: "#34d399" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed">{item.val}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Profile tab */}
          {activeTab === "profile" && (
            <div className="space-y-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Demographics — Surface Layer</div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(result.demographics || {}).map(([k, v]) => (
                    <div key={k} className="space-y-0.5">
                      <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide">{k.replace(/([A-Z])/g, " $1").trim()}</div>
                      <p className="text-xs text-zinc-200">{v as string}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Psychographics — Core Layer</div>
                <div className="space-y-4">
                  {[
                    { label: "Beliefs", val: result.psychographics?.beliefs, color: "#a78bfa" },
                    { label: "Core Values", val: result.psychographics?.coreValues, color: "#34d399" },
                    { label: "Aspirations", val: result.psychographics?.aspirations, color: "#60a5fa" },
                    { label: "Deep Fears", val: result.psychographics?.deepFears, color: "#f87171" },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: row.color }}>{row.label}</div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{row.val}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Current Situation</div>
                <div className="space-y-4">
                  <div>
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-1">Daily Life</div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{result.currentSituation?.dailyLife}</p>
                  </div>
                  {(result.currentSituation?.alreadyTried || []).length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-2">What They've Already Tried</div>
                      <div className="space-y-1.5">
                        {(result.currentSituation?.alreadyTried || []).map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <X className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-zinc-400">{t}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-1">Why Those Attempts Failed</div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{result.currentSituation?.whyFailed}</p>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-1">Repeated Frustrations</div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{result.currentSituation?.repeatedFrustrations}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pain Points tab */}
          {activeTab === "pains" && (
            <div className="space-y-4">
              {(result.painPoints || []).map((pain, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-red-400">{i + 1}</span>
                      </div>
                      <p className="text-sm font-bold text-white">{pain.title}</p>
                    </div>
                    {(pain.severity || pain.urgency || pain.frequency) ? (
                      <div className="flex gap-2 flex-shrink-0">
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-red-400/70 uppercase mb-0.5">Severity</div>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: `rgba(248,113,113,${(pain.severity ?? 0) / 10 * 0.25})`, border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>{pain.severity ?? "–"}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-orange-400/70 uppercase mb-0.5">Urgency</div>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: `rgba(251,146,60,${(pain.urgency ?? 0) / 10 * 0.25})`, border: "1px solid rgba(251,146,60,0.3)", color: "#fb923c" }}>{pain.urgency ?? "–"}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-blue-400/70 uppercase mb-0.5">Frequency</div>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: `rgba(96,165,250,${(pain.frequency ?? 0) / 10 * 0.25})`, border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa" }}>{pain.frequency ?? "–"}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Situation", val: pain.situation, color: "#71717a" },
                      { label: "Emotional Feel", val: pain.emotionalFeel, color: "#f87171" },
                      { label: "Real Cost", val: pain.cost, color: "#fb923c" },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: row.color }}>{row.label}</div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{row.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Outcomes tab */}
          {activeTab === "outcomes" && (
            <div className="space-y-4">
              {[
                { label: "Dream Outcome", val: result.desiredOutcomes?.dreamOutcome, icon: Sparkles, color: "#d4b461" },
                { label: "Short-term Desires (next 90 days)", val: result.desiredOutcomes?.shortTermDesires, icon: Zap, color: "#34d399" },
                { label: "Long-term Desires (1–3 years)", val: result.desiredOutcomes?.longTermDesires, icon: TrendingUp, color: "#60a5fa" },
                { label: "How They Define Success", val: result.desiredOutcomes?.successDefinition, icon: Heart, color: "#f472b6" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed">{item.val}</p>
                    <button
                      onClick={() => copyText(item.val || "", `out-${item.label}`)}
                      className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600 hover:text-primary transition-colors"
                    >
                      {copied === `out-${item.label}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      {copied === `out-${item.label}` ? "Copied!" : "Copy"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {/* Charts tab */}
          {activeTab === "charts" && (
            <div className="space-y-6">
              {/* Pain Point Severity Bar Chart */}
              {painChartData.length > 0 && painChartData.some(d => d.Severity > 0) && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pain Point Intensity Matrix</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-4">Scores are out of 10. Severity = how painful, Urgency = how quickly they want it solved, Frequency = how often it occurs.</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={painChartData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#71717a", fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        height={70}
                      />
                      <YAxis domain={[0, 10]} tick={{ fill: "#71717a", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                        labelStyle={{ color: "#e4e4e7", fontWeight: 700 }}
                        formatter={(value: any, name: string) => [`${value}/10`, name]}
                        labelFormatter={(_label: any, payload: any) => payload?.[0]?.payload?.fullName || _label}
                      />
                      <Legend wrapperStyle={{ color: "#71717a", fontSize: 11, paddingTop: 8 }} />
                      <Bar dataKey="Severity" fill="#f87171" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Urgency" fill="#fb923c" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Frequency" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Average scores summary */}
              {painChartData.length > 0 && painChartData.some(d => d.Severity > 0) && (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Avg Severity", key: "Severity" as const, color: "#f87171", desc: "How painful this audience finds their problems" },
                    { label: "Avg Urgency", key: "Urgency" as const, color: "#fb923c", desc: "How quickly they want a solution" },
                    { label: "Avg Frequency", key: "Frequency" as const, color: "#60a5fa", desc: "How often these pains occur in their life" },
                  ].map(metric => {
                    const avg = painChartData.length
                      ? Math.round((painChartData.reduce((s, d) => s + d[metric.key], 0) / painChartData.length) * 10) / 10
                      : 0;
                    return (
                      <div key={metric.key} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                        <div className="text-3xl font-black mb-1" style={{ color: metric.color }}>{avg}</div>
                        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{metric.label}</div>
                        <div className="text-[10px] text-zinc-600 mt-1 leading-snug">{metric.desc}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {painChartData.length === 0 || !painChartData.some(d => d.Severity > 0) ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                  <BarChart2 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 font-medium">No score data available</p>
                  <p className="text-xs text-zinc-600 mt-1">Regenerate your ICP to get pain point score charts</p>
                </div>
              ) : null}

              {/* Unfair Advantage */}
              {result.businessSummary?.unfairAdvantage && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-[9px] font-bold text-yellow-400/80 uppercase tracking-wider mb-2">Your Unfair Advantage</div>
                  <p className="text-sm text-zinc-200 leading-relaxed">{result.businessSummary.unfairAdvantage}</p>
                </div>
              )}

              {/* Market Sophistication */}
              {result.businessSummary?.marketSophistication && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-[9px] font-bold text-violet-400/80 uppercase tracking-wider mb-2">Market Sophistication</div>
                  <p className="text-sm text-zinc-200 leading-relaxed">{result.businessSummary.marketSophistication}</p>
                </div>
              )}

              {/* Information Sources + Current Workarounds */}
              <div className="grid sm:grid-cols-2 gap-4">
                {result.currentSituation?.informationSources && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <div className="text-[9px] font-bold text-blue-400/80 uppercase tracking-wider mb-2">Where They Learn</div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{result.currentSituation.informationSources}</p>
                  </div>
                )}
                {result.currentSituation?.currentWorkarounds && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <div className="text-[9px] font-bold text-orange-400/80 uppercase tracking-wider mb-2">Current Workarounds</div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{result.currentSituation.currentWorkarounds}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
