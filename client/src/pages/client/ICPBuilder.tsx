import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Sparkles, Wand2, Clock, Bookmark, Trash2, X,
  ChevronLeft, Target, Brain, TrendingUp, AlertCircle,
  CheckCircle2, DollarSign, Heart, Zap, Copy, Check,
} from "lucide-react";

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
  };
  demographics: {
    ageRange: string;
    gender: string;
    location: string;
    incomeLevel: string;
    profession: string;
    educationLevel: string;
  };
  psychographics: {
    beliefs: string;
    coreValues: string;
    aspirations: string;
    deepFears: string;
  };
  currentSituation: {
    dailyLife: string;
    alreadyTried: string[];
    whyFailed: string;
    repeatedFrustrations: string;
  };
  painPoints: {
    title: string;
    situation: string;
    emotionalFeel: string;
    cost: string;
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

// ─── History Panel ────────────────────────────────────────────────────────────
function HistoryPanel({ onLoad, onClose }: { onLoad: (e: any) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["/api/ai/history", "icp-builder"],
    queryFn: () => apiRequest("GET", "/api/ai/history?tool=icp-builder"),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ai/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "icp-builder"] }),
  });
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col" style={{ height: 500 }}>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-white">Saved ICPs</span>
            <Badge className="bg-primary/10 text-primary border-0 text-xs">{(history as any[]).length}</Badge>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
          {!isLoading && (history as any[]).length === 0 && (
            <div className="text-center py-16">
              <Bookmark className="w-9 h-9 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No saved ICPs yet</p>
              <p className="text-xs text-zinc-600 mt-1">Generate one and it saves automatically</p>
            </div>
          )}
          {(history as any[]).map((e: any) => (
            <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-3 hover:border-zinc-600 group transition-all">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{e.title || "Untitled ICP"}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {e.inputs?.priceRange && <Badge className="bg-zinc-800 text-zinc-400 border-0 text-[10px] capitalize">{e.inputs.priceRange}</Badge>}
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">{e.createdAt ? new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" onClick={() => onLoad(e)} className="h-7 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30">Load</Button>
                <button onClick={() => del.mutate(e.id)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ICPBuilder() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<"config" | "results">("config");
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<ICPResult | null>(null);
  const [activeTab, setActiveTab] = useState<"business" | "profile" | "pains" | "outcomes">("business");
  const [showHistory, setShowHistory] = useState(false);
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
      toast({ title: "Fill in required fields", description: "Tell us what you sell and who your audience is.", variant: "destructive" }); return;
    }
    setGenerating(true); setApiDone(false);
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
    if (e.output) { setResult(e.output); setStep("results"); setActiveTab("business"); setShowHistory(false); }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  };

  // ── Generating ──
  if (generating) {
    return (
      <GeneratingScreen
        label="Building your Ideal Customer Profile…"
        steps={["Interpreting your business context", "Building demographics layer", "Mapping psychographics & beliefs", "Identifying pain points", "Defining desired outcomes"]}
        isComplete={apiDone}
        onReady={handleDone}
      />
    );
  }

  // ── Config Step ──
  if (step === "config") {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-background">
          <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />ICP Builder
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Build your <span className="text-primary">Ideal Customer Profile</span>
              </h1>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Tell us about your business and we'll build a deeply researched ICP — demographics, psychographics, pain points, and desired outcomes.
              </p>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-primary/30 bg-zinc-900">
                <Clock className="w-3.5 h-3.5" />View History
              </button>
            </div>

            <div className="space-y-5">
              {/* Business Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Business / Brand Name <span className="text-zinc-600 font-normal">(optional)</span></label>
                <input
                  value={form.businessName}
                  onChange={e => setF("businessName", e.target.value)}
                  placeholder="e.g. Brandverse, ContentOS, GrowthHQ…"
                  className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/60 transition-colors"
                  data-testid="input-business-name"
                />
              </div>

              {/* What you sell */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">What do you sell? <span className="text-red-400">*</span></label>
                <textarea
                  value={form.whatYouSell}
                  onChange={e => setF("whatYouSell", e.target.value)}
                  placeholder="e.g. An AI-powered content platform that helps creators generate, plan, and automate content across Instagram, YouTube, and LinkedIn. Includes AI content ideas, competitor analysis, virality scoring, and posting automation."
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                  data-testid="input-what-you-sell"
                />
              </div>

              {/* Target audience */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Who do you think your audience is? <span className="text-red-400">*</span></label>
                <textarea
                  value={form.targetAudience}
                  onChange={e => setF("targetAudience", e.target.value)}
                  placeholder="e.g. Content creators, personal brand builders, online coaches and entrepreneurs who want to grow on social media but struggle with consistency and knowing what to post."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                  data-testid="input-target-audience"
                />
              </div>

              {/* Core transformation */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Core transformation / outcome you provide <span className="text-zinc-600 font-normal">(optional but recommended)</span></label>
                <textarea
                  value={form.coreTransformation}
                  onChange={e => setF("coreTransformation", e.target.value)}
                  placeholder="e.g. Going from confused, inconsistent creator → to a structured content system that produces consistent growth, engagement and monetization."
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                  data-testid="input-transformation"
                />
              </div>

              {/* Price range */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Price range</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRICE_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setF("priceRange", opt.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${form.priceRange === opt.id ? "border-primary bg-primary/10" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}
                      data-testid={`price-${opt.id}`}>
                      <DollarSign className="w-4 h-4" style={{ color: opt.color }} />
                      <span className={`text-xs font-semibold ${form.priceRange === opt.id ? "text-primary" : "text-zinc-300"}`}>{opt.label}</span>
                      <span className="text-[10px] text-zinc-600">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!form.whatYouSell.trim() || !form.targetAudience.trim()}
              className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-black rounded-xl"
              data-testid="btn-generate-icp"
            >
              <Wand2 className="w-4 h-4 mr-2" />Build My ICP
            </Button>

            <p className="text-center text-[11px] text-zinc-600">
              Powered by behavioral psychology + direct response strategy — results in ~45 seconds
            </p>
          </div>
        </div>
        {showHistory && <HistoryPanel onLoad={handleLoadHistory} onClose={() => setShowHistory(false)} />}
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
  ] as const;

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setStep("config")} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors" data-testid="btn-back">
              <ChevronLeft className="w-4 h-4" />Edit Inputs
            </button>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{result.painPoints?.length || 5} pain points</Badge>
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-2 py-1 rounded border border-zinc-800">
                <Clock className="w-3.5 h-3.5" />History
              </button>
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
              <button onClick={() => copyText(result.businessSummary.positioningStatement, "positioning")} className="mt-3 flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors">
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
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-r border-zinc-800 last:border-r-0 ${activeTab === tab.id ? "bg-primary/15 text-primary" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"}`}
                  data-testid={`tab-${tab.id}`}>
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
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black text-red-400">{i + 1}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{pain.title}</h3>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="bg-zinc-800/60 rounded-xl p-3">
                      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">The Situation</div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{pain.situation}</p>
                    </div>
                    <div className="bg-red-950/30 border border-red-900/30 rounded-xl p-3">
                      <div className="text-[9px] font-bold text-red-400/70 uppercase tracking-wide mb-1.5">How It Feels</div>
                      <p className="text-xs text-red-200/80 leading-relaxed italic">"{pain.emotionalFeel}"</p>
                    </div>
                    <div className="bg-orange-950/30 border border-orange-900/30 rounded-xl p-3">
                      <div className="text-[9px] font-bold text-orange-400/70 uppercase tracking-wide mb-1.5">What It Costs Them</div>
                      <p className="text-xs text-orange-200/80 leading-relaxed">{pain.cost}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Outcomes tab */}
          {activeTab === "outcomes" && (
            <div className="space-y-4">
              {/* Dream outcome hero */}
              <div className="relative rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-950/40 to-emerald-950/20 p-6 overflow-hidden">
                <div className="absolute top-3 right-3 opacity-10"><CheckCircle2 className="w-14 h-14 text-green-400" /></div>
                <div className="text-[10px] font-bold text-green-400/70 uppercase tracking-widest mb-2">Dream Outcome</div>
                <p className="text-sm font-bold text-white leading-relaxed">{result.desiredOutcomes?.dreamOutcome}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Short-Term Desires</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{result.desiredOutcomes?.shortTermDesires}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Long-Term Desires</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{result.desiredOutcomes?.longTermDesires}</p>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">What "Success" Looks Like In Their Mind</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{result.desiredOutcomes?.successDefinition}</p>
              </div>
            </div>
          )}

          <div className="h-8" />
        </div>
      </div>
      {showHistory && <HistoryPanel onLoad={handleLoadHistory} onClose={() => setShowHistory(false)} />}
    </ClientLayout>
  );
}
