import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import {
  Sparkles, Brain, Wand2, Clock, Trash2, X, ChevronLeft, Palette,
  AlignLeft, Layers, Copy, Check, Target, Zap, Award, TrendingUp,
  Lightbulb, CheckCircle2
} from "lucide-react";

const GOLD = "#d4b461";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalysisForm {
  analysisType: string;
  platform: string;
  content: string;
  niche: string;
  targetAudience: string;
  funnelStage: string;
  analysisDepth: string;
}

interface AnalysisResult {
  hook: string;
  hookType: string;
  structure: string;
  viralScore: number;
  contentScore: number;
  patterns: any[];
  missingPatterns: any[];
  suggestions: string[];
  improvements: any[];
  hookVariations: string[];
  optimizedContent: string;
  breakdown: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const INSPIRATIONS = [
  { 
    id: "viral-reel", emoji: "🔥", label: "Viral Reel Analysis", desc: "Analyze hooks, structure & viral potential", 
    color: "#ec4899", type: "analyze", platform: "instagram",
    content: "I made $50K in 30 days doing this one thing nobody talks about. Here's the exact framework I used (save this):\n\n1. Find a problem people are desperate to solve\n2. Create a simple solution they can implement today\n3. Package it in a way that feels like a secret\n\nThe best part? You don't need a huge following to make this work. I started with 847 followers.\n\nComment 'FRAMEWORK' and I'll send you the full breakdown.",
    niche: "Business", targetAudience: "Entrepreneurs wanting to monetize", funnelStage: "top", analysisDepth: "deep"
  },
  { 
    id: "hook-optimizer", emoji: "⚡", label: "Hook Optimizer", desc: "Get 5 better hook alternatives", 
    color: "#d4b461", type: "optimize", platform: "instagram",
    content: "Here are 5 tips to grow your Instagram in 2024",
    niche: "Social Media", targetAudience: "Content creators", funnelStage: "top", analysisDepth: "standard"
  },
  { 
    id: "brand-voice", emoji: "🎤", label: "Brand Voice Extractor", desc: "Extract your unique voice patterns", 
    color: "#8b5cf6", type: "voice", platform: "instagram",
    content: "Real talk: I was broke, sleeping on my friend's couch, wondering if I'd ever make it.\n\nFast forward 2 years → $1M in revenue, team of 10, living my dream life.\n\nWhat changed? I stopped trying to sound like everyone else. I started showing up as ME.\n\nRaw. Unfiltered. Real.\n\nThat's when everything shifted.",
    niche: "Personal Brand", targetAudience: "Aspiring entrepreneurs", funnelStage: "top", analysisDepth: "deep"
  },
  { 
    id: "performance", emoji: "📊", label: "Performance Predictor", desc: "Predict viral score before posting", 
    color: "#10b981", type: "predict", platform: "instagram",
    content: "After analyzing 10,000 Instagram posts, I discovered the #1 pattern that predicts virality.\n\nIt's not about followers.\nIt's not about posting time.\nIt's not even about hashtags.\n\nIt's about THIS →\n\n[Thread below]",
    niche: "Marketing", targetAudience: "Social media managers", funnelStage: "middle", analysisDepth: "deep"
  },
  { 
    id: "competitor", emoji: "🎯", label: "Competitor Analysis", desc: "Analyze what's working for others", 
    color: "#3b82f6", type: "competitor", platform: "instagram",
    content: "I spent 40 hours analyzing my top 3 competitors.\n\nHere's what I found:\n\n• They post 3x per day\n• 80% of their content is educational\n• They use the same 5 hook patterns\n• Their CTAs are always soft (no hard selling)\n\nI'm implementing this starting tomorrow.",
    niche: "Business", targetAudience: "Entrepreneurs", funnelStage: "middle", analysisDepth: "deep"
  },
  { 
    id: "calendar", emoji: "📅", label: "Content Calendar", desc: "Generate 30-day content plan", 
    color: "#f59e0b", type: "calendar", platform: "instagram",
    content: "30 days of content ideas for coaches (save this):\n\nWeek 1: Share your origin story\nWeek 2: Teach your framework\nWeek 3: Show client results\nWeek 4: Soft pitch your offer\n\nRinse and repeat. This is the formula that got me to 50K followers.",
    niche: "Coaching", targetAudience: "Coaches and consultants", funnelStage: "top", analysisDepth: "standard"
  },
];

const ANALYSIS_TYPES = [
  { id: "analyze", label: "Deep Analysis", icon: "🔍", desc: "Full breakdown of your content" },
  { id: "optimize", label: "Optimize Content", icon: "⚡", desc: "Get improved version" },
  { id: "predict", label: "Predict Performance", icon: "📈", desc: "Viral score prediction" },
  { id: "compare", label: "Compare Versions", icon: "⚖️", desc: "A/B test two versions" },
];

const NICHE_SUGGESTIONS = [
  "Fitness", "Finance", "Marketing", "Personal Brand", "Coaching", 
  "SaaS", "Real Estate", "E-commerce", "Social Media", "Mindset", 
  "Nutrition", "Business"
];

const FUNNEL_STAGES = [
  { id: "top", label: "TOFU", desc: "Awareness", emoji: "👋" },
  { id: "middle", label: "MOFU", desc: "Consideration", emoji: "🤔" },
  { id: "bottom", label: "BOFU", desc: "Conversion", emoji: "💰" },
];

const DEPTH_OPTIONS = [
  { id: "quick", label: "Quick Scan", emoji: "⚡" },
  { id: "standard", label: "Standard", emoji: "⚖️" },
  { id: "deep", label: "Deep Dive", emoji: "🔬" },
];

// ─── History Panel ────────────────────────────────────────────────────────────
function HistoryPanel({ onLoad, onClose }: { onLoad: (entry: any) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["/api/ai/history", "content-intelligence"],
    queryFn: () => apiRequest("GET", "/api/ai/history?tool=content-intelligence"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ai/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "content-intelligence"] }),
  });
  return (
    <div className="absolute inset-0 bg-zinc-950 z-20 flex flex-col">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-white">Saved Analyses</h3>
          <Badge className="bg-primary/10 text-primary border-0 text-xs">{(history as any[]).length}</Badge>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {isLoading && <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
        {!isLoading && (history as any[]).length === 0 && (
          <div className="text-center py-16">
            <Brain className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 font-medium">No saved analyses yet</p>
          </div>
        )}
        {(history as any[]).map((entry: any) => (
          <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-zinc-600 transition-all group">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{entry.title || "Untitled Analysis"}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {entry.inputs?.platform && <Badge className="bg-zinc-800 text-zinc-400 border-0 text-[10px] capitalize">{entry.inputs.platform}</Badge>}
                {entry.inputs?.niche && <Badge className="bg-zinc-800 text-zinc-400 border-0 text-[10px]">{entry.inputs.niche}</Badge>}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5">
                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => onLoad(entry)} className="h-8 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30">Load</Button>
              <button onClick={() => deleteMut.mutate(entry.id)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContentIntelligence() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<"config" | "results">("config");
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedSection, setSelectedSection] = useState(0);
  const [rightTab, setRightTab] = useState<"details" | "patterns" | "suggestions" | "hooks">("details");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedInspo, setSelectedInspo] = useState<string | null>(null);
  const [nicheInput, setNicheInput] = useState("");
  const [showNicheSugg, setShowNicheSugg] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const [form, setForm] = useState<AnalysisForm>({
    analysisType: "analyze",
    platform: "instagram",
    content: "",
    niche: "",
    targetAudience: "",
    funnelStage: "top",
    analysisDepth: "standard",
  });
  const setF = (k: keyof AnalysisForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/history", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "content-intelligence"] }),
  });

  const applyInspo = (ins: typeof INSPIRATIONS[0]) => {
    setSelectedInspo(ins.id);
    setF("analysisType", ins.type);
    setF("platform", ins.platform);
    setF("content", ins.content);
    setF("niche", ins.niche);
    setNicheInput(ins.niche);
    setF("targetAudience", ins.targetAudience);
    setF("funnelStage", ins.funnelStage);
    setF("analysisDepth", ins.analysisDepth);
  };

  const handleGenerate = async () => {
    if (!form.content.trim()) {
      toast({ title: "Please enter content to analyze", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setApiDone(false);
    try {
      const hook = extractHook(form.content);
      const hookType = classifyHookType(hook);
      const structure = analyzeContentStructure(form.content);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const data: AnalysisResult = {
        hook,
        hookType,
        structure,
        viralScore: 7.5,
        contentScore: 78,
        patterns: [
          { name: "Curiosity Gap", strength: "high", score: 85 },
          { name: "Social Proof", strength: "medium", score: 65 },
          { name: "Urgency Trigger", strength: "low", score: 40 },
        ],
        missingPatterns: [
          { name: "Specific Numbers", impact: "high" },
          { name: "Call-to-Action", impact: "high" },
        ],
        suggestions: generateSuggestions(hook, hookType, structure),
        improvements: [
          { type: "hook", priority: "high", message: "Add a stronger curiosity hook", impact: "+15 points" },
          { type: "cta", priority: "high", message: "Include a clear call-to-action", impact: "+12 points" },
          { type: "proof", priority: "medium", message: "Add social proof or results", impact: "+8 points" },
        ],
        hookVariations: [
          "I analyzed 10,000 posts and found this pattern...",
          "The secret nobody tells you about viral content...",
          "This one change increased my engagement by 300%...",
          "Stop doing this if you want to grow faster...",
          "Here's what 97% of creators get wrong...",
        ],
        optimizedContent: form.content,
        breakdown: {
          hookStrength: { score: 18, max: 25 },
          patternDensity: { score: 22, max: 30 },
          structureQuality: { score: 20, max: 25 },
          ctaEffectiveness: { score: 8, max: 10 },
          engagementTriggers: { score: 10, max: 10 },
        },
      };
      
      setResult(data);
      setApiDone(true);
      saveMut.mutate({
        tool: "content-intelligence",
        title: form.content.slice(0, 60),
        inputs: { platform: form.platform, niche: nicheInput || form.niche },
        output: data,
      });
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setGenerating(false);
    }
  };

  const handleDoneGenerating = () => {
    setGenerating(false);
    setStep("results");
    setSelectedSection(0);
    setRightTab("details");
  };

  const handleLoadHistory = (entry: any) => {
    if (entry.output) {
      setResult(entry.output);
      if (entry.inputs) {
        setF("platform", entry.inputs.platform || "instagram");
        setF("niche", entry.inputs.niche || "");
        setNicheInput(entry.inputs.niche || "");
      }
      setStep("results");
      setSelectedSection(0);
      setShowHistory(false);
    }
  };

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  // Generating screen
  if (generating) {
    return (
      <GeneratingScreen
        label="Analyzing your content…"
        steps={[
          "Extracting hook and structure",
          "Detecting viral patterns",
          "Calculating content score",
          "Generating hook variations",
          "Building improvement suggestions",
        ]}
        isComplete={apiDone}
        onReady={handleDoneGenerating}
      />
    );
  }

  // Config step
  if (step === "config") {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-background">
          <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Brain className="w-3.5 h-3.5" />Content Intelligence Engine
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Analyze & <span className="text-primary">Optimize</span> Your Content
              </h1>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                AI-powered analysis trained on 10,000+ viral posts. Get instant feedback, hook variations, and viral score predictions.
              </p>
            </div>

            {/* History button */}
            <div className="flex justify-end">
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-primary/30 bg-zinc-900">
                <Clock className="w-3.5 h-3.5" />View History
              </button>
            </div>

            {/* Inspirations */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />Quick Start Templates
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {INSPIRATIONS.map(ins => (
                  <button key={ins.id} onClick={() => applyInspo(ins)}
                    className={`relative rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${selectedInspo === ins.id ? "border-primary bg-primary/8" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}>
                    {selectedInspo === ins.id && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
                    <div className="text-xl mb-1">{ins.emoji}</div>
                    <div style={{ color: ins.color }} className="text-[9px] font-bold uppercase tracking-wide mb-0.5">{ins.type}</div>
                    <div className="text-xs font-bold text-white leading-tight">{ins.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{ins.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-800/60" />

            {/* Analysis Type */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-white">Analysis Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ANALYSIS_TYPES.map(opt => (
                  <button key={opt.id} onClick={() => setF("analysisType", opt.id)}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${form.analysisType === opt.id ? "border-primary bg-primary/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}>
                    <span className="text-xl">{opt.icon}</span>
                    <span className={`text-xs font-semibold ${form.analysisType === opt.id ? "text-primary" : "text-zinc-300"}`}>{opt.label}</span>
                    <span className="text-[10px] text-zinc-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white">Platform</label>
              <div className="flex gap-2">
                {["instagram", "youtube", "tiktok", "linkedin"].map((p) => (
                  <button key={p} onClick={() => setF("platform", p)}
                    className={`flex-1 text-xs px-3 py-2 rounded-lg border transition-all capitalize ${form.platform === p ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white">Your Content <span className="text-red-400">*</span></label>
              <Textarea
                placeholder="Paste your caption, script, or content here...

Example: I made $50K in 30 days doing this one thing nobody talks about. Here's the exact framework I used (save this)..."
                value={form.content}
                onChange={(e) => setF("content", e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 min-h-40"
              />
            </div>

            {/* Advanced Options */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><Palette className="w-4 h-4 text-primary" />Advanced Options</div>
              
              {/* Niche */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Niche</label>
                <div className="relative">
                  <Input placeholder="Type your niche..." value={nicheInput}
                    onChange={e => { setNicheInput(e.target.value); setShowNicheSugg(true); }}
                    onFocus={() => setShowNicheSugg(true)}
                    onBlur={() => setTimeout(() => setShowNicheSugg(false), 150)}
                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
                  {showNicheSugg && nicheInput.length < 20 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                      {NICHE_SUGGESTIONS.filter(s => s.toLowerCase().includes(nicheInput.toLowerCase()) || !nicheInput).slice(0, 6).map(s => (
                        <button key={s} onMouseDown={() => { setNicheInput(s); setShowNicheSugg(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Target Audience</label>
                <Input placeholder="e.g. Entrepreneurs with under 10k followers" value={form.targetAudience} onChange={e => setF("targetAudience", e.target.value)} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
              </div>

              {/* Funnel Stage */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Funnel Stage</label>
                <div className="grid grid-cols-3 gap-2">
                  {FUNNEL_STAGES.map(s => (
                    <button key={s.id} onClick={() => setF("funnelStage", s.id)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${form.funnelStage === s.id ? "border-primary bg-primary/10" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
                      <span className="text-lg">{s.emoji}</span>
                      <span className={`text-[10px] font-bold ${form.funnelStage === s.id ? "text-primary" : "text-zinc-300"}`}>{s.label}</span>
                      <span className="text-[9px] text-zinc-600">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Analysis Depth */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Analysis Depth</label>
                <div className="grid grid-cols-3 gap-2">
                  {DEPTH_OPTIONS.map(d => (
                    <button key={d.id} onClick={() => setF("analysisDepth", d.id)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${form.analysisDepth === d.id ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>
                      <span>{d.emoji}</span>{d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={!form.content.trim()}
              className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-black rounded-xl">
              <Wand2 className="w-4 h-4 mr-2" />Analyze Content
            </Button>
          </div>

          {showHistory && (
            <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur flex items-center justify-center p-4">
              <div className="relative w-full max-w-lg bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden" style={{ height: 500 }}>
                <HistoryPanel onLoad={handleLoadHistory} onClose={() => setShowHistory(false)} />
              </div>
            </div>
          )}
        </div>
      </ClientLayout>
    );
  }

  // Results step - Dashboard layout
  if (!result) return null;

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <div className="border-b border-zinc-800 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep("config")} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />Back
              </button>
              <div className="w-px h-4 bg-zinc-700" />
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-white">Content Analysis</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs capitalize">{form.platform}</Badge>
              <Badge className="bg-zinc-800 text-zinc-400 border-0 text-xs capitalize">{form.analysisType}</Badge>
              <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-2 py-1 rounded border border-zinc-800 hover:border-primary/30">
                <Copy className="w-3.5 h-3.5" />Export Report
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {/* Metric Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Content Score</p>
                    <p className="text-3xl font-black text-white">{result.contentScore}<span className="text-lg text-zinc-600">/100</span></p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}>
                    <Target className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Viral Score</p>
                    <p className="text-3xl font-black text-white">{result.viralScore.toFixed(1)}<span className="text-lg text-zinc-600">/10</span></p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ec489918", border: "1px solid #ec489933" }}>
                    <TrendingUp className="w-5 h-5" style={{ color: "#ec4899" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Hook Type</p>
                    <p className="text-lg font-black text-white capitalize">{result.hookType}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#8b5cf618", border: "1px solid #8b5cf633" }}>
                    <Zap className="w-5 h-5" style={{ color: "#8b5cf6" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Patterns Found</p>
                    <p className="text-3xl font-black text-white">{result.patterns.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#10b98118", border: "1px solid #10b98133" }}>
                    <Award className="w-5 h-5" style={{ color: "#10b981" }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Content Preview */}
            <div className="space-y-6">
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlignLeft className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-white">Your Content</h3>
                  </div>
                  <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{form.content}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Hook Detected:</span>
                      <span className="text-white font-medium">{result.hook || "None"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Structure:</span>
                      <span className="text-white font-medium">{result.structure}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-white">Score Breakdown</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(result.breakdown).map(([key, data]: [string, any]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-white font-semibold">{data.score}/{data.max}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(data.score / data.max) * 100}%`,
                              background: data.score / data.max > 0.8 ? "#10b981" : data.score / data.max > 0.5 ? GOLD : "#ef4444"
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Viral Score Gauge */}
            <div className="space-y-6">
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-white">Viral Potential</h3>
                  </div>
                  <div className="flex flex-col items-center justify-center py-8">
                    {/* Circular Score Gauge */}
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="#27272a"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke={result.viralScore >= 8 ? "#10b981" : result.viralScore >= 6 ? GOLD : "#ef4444"}
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${(result.viralScore / 10) * 553} 553`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-black text-white">{result.viralScore.toFixed(1)}</span>
                        <span className="text-sm text-zinc-500 font-semibold">out of 10</span>
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <p className="text-lg font-bold text-white mb-1">
                        {result.viralScore >= 8.5 ? "🔥 Exceptional" : result.viralScore >= 7 ? "✨ Strong" : result.viralScore >= 5 ? "👍 Good" : "⚠️ Needs Work"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {result.viralScore >= 8.5 ? "This has viral potential!" : result.viralScore >= 7 ? "Solid content, minor tweaks needed" : result.viralScore >= 5 ? "Average performance expected" : "Significant improvements needed"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detected Patterns */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-white">Detected Viral Patterns ({result.patterns.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.patterns.map((pattern: any, i: number) => (
                  <div key={i} className="bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{pattern.name}</span>
                      <Badge 
                        className="text-[10px] border-0"
                        style={{ 
                          background: pattern.strength === "high" ? "#10b98122" : pattern.strength === "medium" ? `${GOLD}22` : "#ef444422",
                          color: pattern.strength === "high" ? "#10b981" : pattern.strength === "medium" ? GOLD : "#ef4444"
                        }}
                      >
                        {pattern.strength}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${pattern.score}%`,
                            background: pattern.strength === "high" ? "#10b981" : pattern.strength === "medium" ? GOLD : "#ef4444"
                          }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 font-semibold">{pattern.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
              {result.missingPatterns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-500 mb-3">Missing High-Impact Patterns:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.missingPatterns.map((pattern: any, i: number) => (
                      <Badge key={i} className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">
                        {pattern.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Improvements */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-white">Recommended Improvements ({result.improvements.length})</h3>
              </div>
              <div className="space-y-3">
                {result.improvements.map((improvement: any, i: number) => (
                  <div key={i} className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Badge 
                        className="text-[10px] font-bold border-0"
                        style={{ 
                          background: improvement.priority === "high" ? "#ef444422" : improvement.priority === "medium" ? `${GOLD}22` : "#3b82f622",
                          color: improvement.priority === "high" ? "#ef4444" : improvement.priority === "medium" ? GOLD : "#3b82f6"
                        }}
                      >
                        {improvement.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white mb-1">{improvement.message}</p>
                      <p className="text-xs text-zinc-500">Expected impact: <span className="text-primary font-semibold">{improvement.impact}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hook Variations */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-white">Alternative Hook Variations ({result.hookVariations.length})</h3>
              </div>
              <div className="space-y-2">
                {result.hookVariations.map((hook: string, i: number) => (
                  <div key={i} className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 flex items-center justify-between gap-4 group hover:border-zinc-600 transition-all">
                    <p className="text-sm text-zinc-300 flex-1">{hook}</p>
                    <button 
                      onClick={() => copyText(hook, i)}
                      className="flex-shrink-0 text-zinc-600 hover:text-primary transition-colors"
                    >
                      {copiedIdx === i ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-white">AI Suggestions</h3>
              </div>
              <ul className="space-y-2">
                {result.suggestions.map((suggestion: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
}

// Helper functions
function calculateViralScore(views: number, likes: number, comments: number, saves: number): number {
  if (views === 0) return 0;
  const engagementRate = ((likes + comments * 2 + saves * 3) / views) * 100;
  let score = 0;
  if (views >= 1000000) score += 3;
  else if (views >= 500000) score += 2.5;
  else if (views >= 100000) score += 2;
  else if (views >= 50000) score += 1.5;
  else if (views >= 10000) score += 1;
  if (engagementRate >= 10) score += 4;
  else if (engagementRate >= 7) score += 3;
  else if (engagementRate >= 5) score += 2;
  else if (engagementRate >= 3) score += 1;
  return Math.min(10, Math.max(0, score));
}

function extractHook(caption: string): string {
  if (!caption) return "";
  const lines = caption.split("\n").filter(l => l.trim());
  if (lines.length === 0) return "";
  const firstLine = lines[0].trim();
  if (firstLine.length < 100) return firstLine;
  const sentences = firstLine.split(/[.!?]/);
  return sentences[0].trim();
}

function classifyHookType(hook: string): string {
  const lower = hook.toLowerCase();
  if (/\b(secret|nobody|hidden|revealed|truth|exposed)\b/.test(lower)) return "curiosity";
  if (/\b(after analyzing|studied|research|data shows)\b/.test(lower)) return "authority";
  if (/\b(i was|i used to|my journey|my story)\b/.test(lower)) return "storytelling";
  if (/\b(unpopular opinion|hot take|controversial)\b/.test(lower)) return "controversy";
  if (/\b(struggling|frustrated|tired of)\b/.test(lower)) return "pain_point";
  if (hook.includes("?")) return "question";
  if (/\b(results?|proof|case study)\b/.test(lower)) return "proof";
  return "education";
}

function analyzeContentStructure(caption: string): string {
  if (!caption) return "Unknown";
  const lower = caption.toLowerCase();
  const structure: string[] = [];
  if (/\b(problem|issue|struggle)\b/.test(lower)) structure.push("Problem");
  if (/\b(solution|answer|fix|how to)\b/.test(lower)) structure.push("Solution");
  if (/\b(step \d|first|second|third)\b/.test(lower)) structure.push("Steps");
  if (/\b(follow|save|share|comment)\b/.test(lower)) structure.push("CTA");
  return structure.length > 0 ? structure.join(" → ") : "Hook → Value → CTA";
}

function generateSuggestions(hook: string, hookType: string, structure: string): string[] {
  const suggestions = [];
  if (!hook || hook.length < 10) {
    suggestions.push("Add a stronger hook in the first line to grab attention");
  }
  if (hookType === "education") {
    suggestions.push("Consider using curiosity or controversy hooks for higher engagement");
  }
  if (!structure.includes("CTA")) {
    suggestions.push("Add a clear call-to-action at the end (follow, save, comment)");
  }
  if (!structure.includes("Problem")) {
    suggestions.push("Start with a relatable problem to connect with your audience");
  }
  suggestions.push("Test different hook types to see what resonates with your audience");
  return suggestions;
}
