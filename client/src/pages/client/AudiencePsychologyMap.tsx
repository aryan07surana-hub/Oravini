import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Sparkles, Wand2, Clock, Bookmark, Trash2, X,
  ChevronLeft, MessageSquare, Lightbulb, ShieldAlert,
  TrendingUp, Zap, Copy, Check, Target, Eye,
} from "lucide-react";

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
  };
  contentDirection: {
    contentIdeas: string[];
    offerAngles: string[];
    scrollStoppingHooks: string[];
    positioningSuggestions: string[];
  };
}

// ─── History Panel ────────────────────────────────────────────────────────────
function HistoryPanel({ onLoad, onClose }: { onLoad: (e: any) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["/api/ai/history", "audience-psychology-map"],
    queryFn: () => apiRequest("GET", "/api/ai/history?tool=audience-psychology-map"),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ai/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "audience-psychology-map"] }),
  });
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col" style={{ height: 500 }}>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-white">Saved Psychology Maps</span>
            <Badge className="bg-primary/10 text-primary border-0 text-xs">{(history as any[]).length}</Badge>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
          {!isLoading && (history as any[]).length === 0 && (
            <div className="text-center py-16">
              <Bookmark className="w-9 h-9 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No saved maps yet</p>
            </div>
          )}
          {(history as any[]).map((e: any) => (
            <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-3 hover:border-zinc-600 group transition-all">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{e.title || "Untitled Map"}</p>
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

// ─── Pill list helper ─────────────────────────────────────────────────────────
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

// ─── Copyable quote ───────────────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AudiencePsychologyMap() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<"config" | "results">("config");
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<APMResult | null>(null);
  const [activeTab, setActiveTab] = useState<"buyer" | "psychology" | "messaging" | "content">("buyer");
  const [showHistory, setShowHistory] = useState(false);
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
      toast({ title: "Required", description: "Describe your business to generate the psychology map.", variant: "destructive" }); return;
    }
    setGenerating(true); setApiDone(false);
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
    if (e.output) { setResult(e.output); setStep("results"); setActiveTab("buyer"); setShowHistory(false); }
  };
  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  };

  if (generating) {
    return (
      <GeneratingScreen
        label="Mapping your audience psychology…"
        steps={["Analysing buying behaviour", "Mapping identity & emotions", "Extracting belief systems", "Crafting messaging insights", "Building content direction"]}
        isComplete={apiDone}
        onReady={handleDone}
      />
    );
  }

  if (step === "config") {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-background">
          <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Brain className="w-3.5 h-3.5" />Audience Psychology Map
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Map Your <span className="text-primary">Audience Psychology</span>
              </h1>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Get a deep psychological breakdown — buying behaviour, identity, emotional triggers, limiting beliefs, messaging angles, and content strategy — all tailored to your audience.
              </p>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-primary/30 bg-zinc-900">
                <Clock className="w-3.5 h-3.5" />View History
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Business description <span className="text-red-400">*</span></label>
                <textarea
                  value={form.businessDescription}
                  onChange={e => setF("businessDescription", e.target.value)}
                  placeholder="Describe your business, what you sell, and the transformation you provide. The more detail, the more accurate the psychology map."
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                  data-testid="input-business-description"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Target audience description <span className="text-zinc-600 font-normal">(optional — adds more precision)</span></label>
                <textarea
                  value={form.targetAudienceDescription}
                  onChange={e => setF("targetAudienceDescription", e.target.value)}
                  placeholder="Who is your target audience? What do they struggle with? What have they tried before?"
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                  data-testid="input-audience-description"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">
                  Paste ICP results <span className="text-zinc-600 font-normal">(optional — paste from ICP Builder for deeper analysis)</span>
                </label>
                <textarea
                  value={form.icpSummary}
                  onChange={e => setF("icpSummary", e.target.value)}
                  placeholder="Paste key insights from your ICP Builder output here for even deeper, more personalised results…"
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                  data-testid="input-icp-summary"
                />
                <p className="text-[11px] text-zinc-600">Go to ICP Builder → generate your profile → copy key insights and paste here</p>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!form.businessDescription.trim()}
              className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-black rounded-xl"
              data-testid="btn-generate-apm"
            >
              <Wand2 className="w-4 h-4 mr-2" />Generate Psychology Map
            </Button>

            <p className="text-center text-[11px] text-zinc-600">
              Combines behavioral psychology, direct response strategy & buying science — ~45 seconds
            </p>
          </div>
        </div>
        {showHistory && <HistoryPanel onLoad={handleLoadHistory} onClose={() => setShowHistory(false)} />}
      </ClientLayout>
    );
  }

  if (!result) return null;

  const TABS = [
    { id: "buyer", label: "Buyer Clarity", icon: ShieldAlert },
    { id: "psychology", label: "Psychology", icon: Brain },
    { id: "messaging", label: "Messaging", icon: MessageSquare },
    { id: "content", label: "Content", icon: Lightbulb },
  ] as const;

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setStep("config")} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />Edit Inputs
            </button>
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-2 py-1 rounded border border-zinc-800">
              <Clock className="w-3.5 h-3.5" />History
            </button>
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
              {/* Objections */}
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
              {/* Internal dialogue */}
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
              {/* Identity */}
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
              {/* Emotional landscape */}
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
              {/* Belief system */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Belief System</span>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-red-400/60 uppercase tracking-wide mb-2">Limiting Beliefs</div>
                  <div className="space-y-1.5">
                    {(result.psychologyMap.limitingBeliefs || []).map((b, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-red-400 text-xs mt-0.5">✗</span>
                        <p className="text-xs text-zinc-400">{b}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-green-400/60 uppercase tracking-wide mb-2">Empowering Beliefs They're Trying to Adopt</div>
                  <div className="space-y-1.5">
                    {(result.psychologyMap.empoweringBeliefs || []).map((b, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-green-400 text-xs mt-0.5">✓</span>
                        <p className="text-xs text-zinc-400">{b}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-2">False Assumptions About Growth & Success</div>
                  <div className="space-y-1.5">
                    {(result.psychologyMap.falseAssumptions || []).map((b, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-yellow-400 text-xs mt-0.5">⚠</span>
                        <p className="text-xs text-zinc-400">{b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Language patterns */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Language Patterns</span>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-2">Exact Phrases They Use to Describe Their Problem</div>
                  <div className="space-y-2">
                    {(result.psychologyMap.exactPhrases || []).map((p, i) => (
                      <CopyableQuote key={i} text={p} index={i} copied={copied} onCopy={copyText} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-2">How They Express Frustration</div>
                  <div className="space-y-2">
                    {(result.psychologyMap.frustrationExpressions || []).map((p, i) => (
                      <CopyableQuote key={i} text={p} index={100 + i} copied={copied} onCopy={copyText} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mb-2">Emotional Keywords</div>
                  <PillList items={result.psychologyMap.emotionalKeywords || []} color="#818cf8" />
                </div>
              </div>
            </div>
          )}

          {/* Messaging tab */}
          {activeTab === "messaging" && result.messagingInsights && (
            <div className="space-y-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Resonant Messaging Angles</span>
                </div>
                <div className="space-y-2">
                  {(result.messagingInsights.resonantAngles || []).map((angle, i) => (
                    <div key={i} className="flex items-start gap-3 bg-zinc-800/50 rounded-xl p-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-snug">{angle}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-primary/8 border border-primary/20 rounded-2xl p-5">
                <div className="text-[9px] font-bold text-primary uppercase tracking-wider mb-2">Angle That Grabs Attention Immediately</div>
                <p className="text-sm font-semibold text-white leading-relaxed">{result.messagingInsights.immediateAttentionAngle}</p>
                <button onClick={() => copyText(result.messagingInsights.immediateAttentionAngle, "attention")} className="mt-3 flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors">
                  {copied === "attention" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}Copy
                </button>
              </div>
              <div className="bg-red-950/30 border border-red-900/30 rounded-2xl p-5">
                <div className="text-[9px] font-bold text-red-400/70 uppercase tracking-wider mb-3">Do NOT Say (Messaging That Turns Them Off)</div>
                <div className="space-y-2">
                  {(result.messagingInsights.doNotSay || []).map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-200/80">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Content tab */}
          {activeTab === "content" && result.contentDirection && (
            <div className="space-y-5">
              {/* Content ideas */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">5 High-Performing Content Ideas</span>
                </div>
                <div className="space-y-2.5">
                  {(result.contentDirection.contentIdeas || []).map((idea, i) => (
                    <div key={i} className="flex items-start gap-3 bg-zinc-800/50 rounded-xl p-3">
                      <div className="w-5 h-5 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-yellow-400">{i + 1}</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-snug">{idea}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Scroll-stopping hooks */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Scroll-Stopping Hooks & Headlines</div>
                <div className="space-y-2">
                  {(result.contentDirection.scrollStoppingHooks || []).map((hook, i) => (
                    <CopyableQuote key={i} text={hook} index={200 + i} copied={copied} onCopy={copyText} />
                  ))}
                </div>
              </div>
              {/* Offer angles */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">3 Offer Angles That Convert</div>
                <div className="space-y-3">
                  {(result.contentDirection.offerAngles || []).map((offer, i) => (
                    <div key={i} className="bg-zinc-800/60 rounded-xl p-4 border-l-2 border-primary/40">
                      <div className="text-[9px] font-bold text-primary/60 uppercase tracking-wide mb-1">Angle {i + 1}</div>
                      <p className="text-xs text-zinc-200 leading-snug">{offer}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Positioning */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Positioning Suggestions</div>
                <div className="space-y-2">
                  {(result.contentDirection.positioningSuggestions || []).map((p, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-zinc-300 leading-snug">{p}</p>
                    </div>
                  ))}
                </div>
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
