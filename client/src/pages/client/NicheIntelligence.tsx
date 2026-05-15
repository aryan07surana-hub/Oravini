import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Activity, Zap, Layers, Flame, ArrowRight,
  ChevronLeft, TrendingUp, Eye, MessageCircle, Bookmark,
  Share2, BarChart2, Brain, Hash, Target, Search,
  TrendingDown, Crown, Users, Clock, RefreshCw,
  Instagram, Youtube, CheckCircle2, List,
  FileText, Lightbulb, Gauge, Award,
  Copy, Check, Globe, Loader2, AlertCircle,
  ArrowUpRight, Rocket,
} from "lucide-react";

const GOLD = "#d4b461";

const NICHE_SUGGESTIONS = [
  "Fitness", "Finance", "Marketing", "Personal Brand", "Coaching",
  "SaaS", "Real Estate", "E-commerce", "Social Media", "Mindset",
  "Nutrition", "Business", "Health & Wellness", "Travel", "Fashion",
  "Tech", "Education", "Music", "Art & Design", "Photography",
];

const PLATFORM_CONFIG = {
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-400", activeColor: "border-pink-500/40 bg-pink-500/10", borderColor: "hover:border-pink-500/30" },
  youtube: { label: "YouTube", icon: Youtube, color: "text-red-400", activeColor: "border-red-500/40 bg-red-500/10", borderColor: "hover:border-red-500/30" },
} as const;

type Platform = keyof typeof PLATFORM_CONFIG;

const NICHE_COLORS: Record<string, { primary: string; secondary: string; gradient: string }> = {
  fitness: { primary: "#34d399", secondary: "#059669", gradient: "linear-gradient(135deg, #34d399, #059669)" },
  health: { primary: "#34d399", secondary: "#059669", gradient: "linear-gradient(135deg, #34d399, #059669)" },
  nutrition: { primary: "#34d399", secondary: "#059669", gradient: "linear-gradient(135deg, #34d399, #059669)" },
  wellness: { primary: "#34d399", secondary: "#059669", gradient: "linear-gradient(135deg, #34d399, #059669)" },
  finance: { primary: GOLD, secondary: "#a8873f", gradient: "linear-gradient(135deg, #d4b461, #a8873f)" },
  business: { primary: GOLD, secondary: "#a8873f", gradient: "linear-gradient(135deg, #d4b461, #a8873f)" },
  "real estate": { primary: GOLD, secondary: "#a8873f", gradient: "linear-gradient(135deg, #d4b461, #a8873f)" },
  marketing: { primary: "#a78bfa", secondary: "#7c3aed", gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)" },
  "social media": { primary: "#a78bfa", secondary: "#7c3aed", gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)" },
  tech: { primary: "#60a5fa", secondary: "#2563eb", gradient: "linear-gradient(135deg, #60a5fa, #2563eb)" },
  saas: { primary: "#60a5fa", secondary: "#2563eb", gradient: "linear-gradient(135deg, #60a5fa, #2563eb)" },
  coaching: { primary: "#2dd4bf", secondary: "#0d9488", gradient: "linear-gradient(135deg, #2dd4bf, #0d9488)" },
  mindset: { primary: "#2dd4bf", secondary: "#0d9488", gradient: "linear-gradient(135deg, #2dd4bf, #0d9488)" },
  education: { primary: "#2dd4bf", secondary: "#0d9488", gradient: "linear-gradient(135deg, #2dd4bf, #0d9488)" },
  fashion: { primary: "#f472b6", secondary: "#db2777", gradient: "linear-gradient(135deg, #f472b6, #db2777)" },
  art: { primary: "#f472b6", secondary: "#db2777", gradient: "linear-gradient(135deg, #f472b6, #db2777)" },
  design: { primary: "#f472b6", secondary: "#db2777", gradient: "linear-gradient(135deg, #f472b6, #db2777)" },
  photography: { primary: "#f472b6", secondary: "#db2777", gradient: "linear-gradient(135deg, #f472b6, #db2777)" },
  travel: { primary: "#fb923c", secondary: "#ea580c", gradient: "linear-gradient(135deg, #fb923c, #ea580c)" },
  music: { primary: "#fb923c", secondary: "#ea580c", gradient: "linear-gradient(135deg, #fb923c, #ea580c)" },
  "personal brand": { primary: "#c084fc", secondary: "#9333ea", gradient: "linear-gradient(135deg, #c084fc, #9333ea)" },
  "e-commerce": { primary: "#f87171", secondary: "#dc2626", gradient: "linear-gradient(135deg, #f87171, #dc2626)" },
};

function getNicheTheme(niche: string) {
  const key = Object.keys(NICHE_COLORS).find(k => niche.toLowerCase().includes(k));
  return key ? NICHE_COLORS[key] : { primary: GOLD, secondary: "#a8873f", gradient: "linear-gradient(135deg, #d4b461, #a8873f)" };
}

/* ── Types ── */
interface NicheData {
  niche: string; platform: string;
  avgViews: number; avgLikes: number; avgComments: number; avgSaves: number; avgShares: number;
  avgEngagementRate: number; avgViralScore: number;
  topHookType: string | null; topContentType: string | null; topStructure: string | null;
  totalPosts: number; totalUsers: number; totalWinningPatterns: number; trend30d: number;
  healthScore: number | null; healthLabel: string | null;
}
interface TrendData { niche: string; platform: string; trendType: string; trendValue: string; momentum: string; engagementDelta: number; sampleCount: number; }
interface HealthScoreData { healthScore: number; healthLabel: string; factors: Record<string, number>; }
interface RankData { percentile: number; userAvgEngagement: number; nicheAvgEngagement: number; userAvgViralScore: number; nicheAvgViralScore: number; totalUsers: number; rank: number; }
interface StrategyData { type: string; title: string; description: string; impact: string; icon: string; }
interface HookLibraryItem { id: string; hook: string; hookType: string; platform: string; niche: string; viralScore: number; avgViews: number; avgEngagement: number; usageCount: number; source: string; }
interface GapData { hookType: string; contentType: string; structure: string; missing: string[]; potentialImpact: string; avgEngagementRate: number; }

/* ── Helpers ── */
function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
function trendColor(val: number): string { return val > 0 ? "#34d399" : val < 0 ? "#f87171" : GOLD; }
const MOMENTUM_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  spiking: { bg: "rgba(251,146,60,0.15)", border: "rgba(251,146,60,0.3)", color: "#fb923c", icon: "🔥" },
  up: { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)", color: "#34d399", icon: "↑" },
  down: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)", color: "#f87171", icon: "↓" },
  stable: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", icon: "→" },
};

/* ── Sub-components ── */
function AnimatedScoreGauge({ score, label, color, size = 160 }: { score: number; label: string; color: string; size?: number }) {
  const [animScore, setAnimScore] = useState(0);
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (animScore / 100) * circ;

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const step = Math.max(1, Math.floor(score / 30));
      const interval = setInterval(() => {
        current += step;
        if (current >= score) { current = score; clearInterval(interval); }
        setAnimScore(current);
      }, 20);
      return () => clearInterval(interval);
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size + 40 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)", filter: "url(#glow)" }}
        />
        <circle cx={size / 2} cy={size / 2} r={r - 3} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} opacity="0.3"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ top: size / 2 - 10, left: "50%", transform: "translate(-50%, -50%)" }}>
        <span className="text-4xl font-black tracking-tight" style={{ color }}>{animScore}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5 px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{label}</span>
      </div>
    </div>
  );
}

function AnimatedCountUp({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(decimals > 0 ? "0.0" : "0");
  useEffect(() => {
    let current = 0;
    const step = Math.max(value / 30, 1);
    const interval = setInterval(() => {
      current += step;
      if (current >= value) { current = value; clearInterval(interval); }
      setDisplay(current.toFixed(decimals));
    }, 20);
    return () => clearInterval(interval);
  }, [value, decimals]);
  return <>{display}{suffix}</>;
}

function SparklineChart({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const width = 120;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      {data.map((v, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * width} cy={height - ((v - min) / range) * (height - 4) - 2} r="2" fill={color} opacity="0" className="group-hover:opacity-100" style={{ transition: "opacity 0.2s" }} />
      ))}
    </svg>
  );
}

/* ── Main Component ── */
export default function NicheIntelligence() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<"config" | "results">("config");
  const [nicheInput, setNicheInput] = useState("");
  const [showNicheSugg, setShowNicheSugg] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState("");
  const [activeNiche, setActiveNiche] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [generating, setGenerating] = useState(false);
  const [hooksExpanded, setHooksExpanded] = useState(false);
  const [hookSearch, setHookSearch] = useState("");
  const [copiedHookId, setCopiedHookId] = useState<string | null>(null);
  const [reportCopied, setReportCopied] = useState(false);
  const [aiInsights, setAiInsights] = useState<any[] | null>(null);
  const [contentIdeas, setContentIdeas] = useState<any[] | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-detect niche from onboarding
  const { data: myNicheData } = useQuery<any>({
    queryKey: ["/api/niche-intelligence/my"],
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (myNicheData?.intelligence?.niche && !selectedNiche && step === "config") {
      const autoNiche = myNicheData.intelligence.niche;
      setSelectedNiche(autoNiche);
      setNicheInput(autoNiche);
    }
  }, [myNicheData, selectedNiche, step]);

  const filteredNicheSugg = NICHE_SUGGESTIONS.filter(
    s => s.toLowerCase().includes(nicheInput.toLowerCase()) && s !== selectedNiche
  );

  const theme = getNicheTheme(activeNiche || selectedNiche);
  const isActive = step === "results" && !!activeNiche;

  const { data: nicheData, isLoading: dataLoading, isFetching: dataFetching } = useQuery<NicheData[]>({
    queryKey: ["/api/niche-intelligence", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive,
    staleTime: 120_000,
  });

  const { data: trendsData } = useQuery<TrendData[]>({
    queryKey: ["/api/niche-intelligence/trends", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/trends?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive,
    staleTime: 120_000,
  });

  const { data: healthData } = useQuery<HealthScoreData>({
    queryKey: ["/api/niche-intelligence/score", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/score?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive && !!activeNiche,
    staleTime: 120_000,
  });

  const { data: rankData } = useQuery<RankData>({
    queryKey: ["/api/niche-intelligence/rank", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/rank?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive && !!activeNiche,
    staleTime: 120_000,
  });

  const { data: strategyData } = useQuery<StrategyData[]>({
    queryKey: ["/api/niche-intelligence/strategy", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/strategy?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive && !!activeNiche,
    staleTime: 120_000,
  });

  const { data: hooksData } = useQuery<HookLibraryItem[]>({
    queryKey: ["/api/niche-intelligence/hooks", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/hooks?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive && !!activeNiche,
    staleTime: 120_000,
  });

  const { data: gapsData } = useQuery<GapData[]>({
    queryKey: ["/api/niche-intelligence/gaps", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/gaps?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive && !!activeNiche,
    staleTime: 120_000,
  });

  const intelligence = nicheData?.[0] || null;
  const trends = trendsData || [];
  const strategies = strategyData || [];
  const hooks = hooksData || [];
  const gaps = gapsData || [];
  const health = healthData || { healthScore: 0, healthLabel: "No Data", factors: {} };
  const rank = rankData || { percentile: 0, userAvgEngagement: 0, nicheAvgEngagement: 0, userAvgViralScore: 0, nicheAvgViralScore: 0, totalUsers: 0, rank: 0 };

  // AI Insights
  const generateAiInsights = useCallback(async () => {
    if (!intelligence) return;
    setLoadingInsights(true);
    try {
      const res = await apiRequest("POST", "/api/niche-intelligence/ai-insights", {
        niche: activeNiche, platform, healthScore: health.healthScore,
        avgEngagementRate: intelligence.avgEngagementRate, avgViralScore: intelligence.avgViralScore,
        trend30d: intelligence.trend30d, topHookType: intelligence.topHookType,
        topContentType: intelligence.topContentType, totalPosts: intelligence.totalPosts,
        totalUsers: intelligence.totalUsers,
      });
      setAiInsights(Array.isArray(res) ? res : []);
    } catch { toast({ title: "Could not generate AI insights", variant: "destructive" });
    } finally { setLoadingInsights(false); }
  }, [intelligence, activeNiche, platform, health]);

  const generateContentIdeas = useCallback(async () => {
    if (!intelligence) return;
    setLoadingIdeas(true);
    try {
      const res = await apiRequest("POST", "/api/niche-intelligence/content-ideas", {
        niche: activeNiche, platform,
        topHookType: intelligence.topHookType, topContentType: intelligence.topContentType,
        gaps: gaps.slice(0, 3),
      });
      setContentIdeas(Array.isArray(res) ? res : []);
    } catch { toast({ title: "Could not generate content ideas", variant: "destructive" });
    } finally { setLoadingIdeas(false); }
  }, [intelligence, activeNiche, platform, gaps]);

  const handleGenerate = async () => {
    if (!selectedNiche.trim()) {
      toast({ title: "Choose a niche", description: "Select or type your niche to analyse", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setActiveNiche(selectedNiche);
    setAiInsights(null);
    setContentIdeas(null);
    await new Promise(r => setTimeout(r, 100));
    setStep("results");
    setGenerating(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  };

  const handleNewAnalysis = () => {
    setStep("config"); setNicheInput(""); setSelectedNiche(""); setActiveNiche("");
    setHooksExpanded(false); setHookSearch(""); setAiInsights(null); setContentIdeas(null);
  };

  const selectNiche = (n: string) => { setSelectedNiche(n); setNicheInput(n); setShowNicheSugg(false); };

  const copyHook = async (h: HookLibraryItem) => {
    try {
      await navigator.clipboard.writeText(h.hook);
      setCopiedHookId(h.id);
      toast({ title: "Hook copied!", description: "Paste it into your next post" });
      setTimeout(() => setCopiedHookId(null), 2000);
    } catch { toast({ title: "Could not copy", variant: "destructive" }); }
  };

  const shareReport = async () => {
    const txt = [
      `Niche Intelligence Report — ${activeNiche} on ${platform}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Health Score: ${health.healthScore}/100 (${health.healthLabel})`,
      `Your Rank: #${rank.rank} of ${rank.totalUsers} creators (top ${Math.max(100 - rank.percentile, 1)}%)`,
      ``,
      `Benchmarks:`,
      `  Engagement Rate: ${intelligence?.avgEngagementRate.toFixed(1)}%`,
      `  Viral Score: ${intelligence?.avgViralScore.toFixed(1)}/10`,
      `  Views/Post: ${formatNum(intelligence?.avgViews || 0)}`,
      `  30d Trend: ${(intelligence?.trend30d ?? 0) > 0 ? "+" : ""}${(intelligence?.trend30d ?? 0).toFixed(1)}%`,
      `  Top Hook: ${intelligence?.topHookType || "N/A"}`,
      `  Top Format: ${intelligence?.topContentType || "N/A"}`,
      ``,
      `${intelligence?.totalWinningPatterns || 0} patterns · ${intelligence?.totalUsers || 0} creators analysed`,
      `Generated by Admin Control Hub`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      setReportCopied(true);
      toast({ title: "Report copied!", description: "Paste anywhere to share" });
      setTimeout(() => setReportCopied(false), 3000);
    } catch { toast({ title: "Could not copy report", variant: "destructive" }); }
  };

  const loading = dataLoading || dataFetching;
  const filteredHooks = hookSearch ? hooks.filter(h => h.hook.toLowerCase().includes(hookSearch.toLowerCase()) || h.hookType.toLowerCase().includes(hookSearch.toLowerCase())) : hooks;

  return (
    <ClientLayout>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(212,180,97,0.08); }
          50% { box-shadow: 0 0 40px rgba(212,180,97,0.18); }
        }
        .section-enter { animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .section-enter:nth-child(1) { animation-delay: 0.05s; }
        .section-enter:nth-child(2) { animation-delay: 0.15s; }
        .section-enter:nth-child(3) { animation-delay: 0.25s; }
        .section-enter:nth-child(4) { animation-delay: 0.35s; }
        .section-enter:nth-child(5) { animation-delay: 0.45s; }
        .section-enter:nth-child(6) { animation-delay: 0.55s; }
        .section-enter:nth-child(7) { animation-delay: 0.65s; }
        .section-enter:nth-child(8) { animation-delay: 0.75s; }
        .section-enter:nth-child(9) { animation-delay: 0.85s; }
        .hover-lift { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
      `}</style>

      <div className="min-h-screen bg-background">
        {step === "config" ? (
          <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
            <div className="text-center space-y-3">
              <button onClick={() => navigate("/dashboard")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mx-auto mb-2">
                <ChevronLeft className="w-3.5 h-3.5" />Dashboard
              </button>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: `${theme.primary}12`, border: `1px solid ${theme.primary}30`, color: theme.primary }}>
                <Activity className="w-3.5 h-3.5" />Niche Intelligence
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                See What's <span style={{ color: theme.primary }}>Working</span> in Your Niche
              </h1>
              <p className="text-zinc-400 text-sm max-w-lg mx-auto">
                Aggregated performance data from creators in your niche.
                Discover which hooks, formats, and strategies drive real engagement — and what's trending right now.
              </p>
            </div>

            <div className="border-t border-zinc-800/60" />

            <div className="space-y-3 relative">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Hash className="w-4 h-4" style={{ color: theme.primary }} />Your Niche <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Search className="w-4 h-4" />
                </div>
                <Input
                  value={nicheInput}
                  onChange={e => { setNicheInput(e.target.value); setShowNicheSugg(true); setSelectedNiche(""); }}
                  onFocus={() => setShowNicheSugg(true)}
                  onBlur={() => setTimeout(() => setShowNicheSugg(false), 200)}
                  placeholder={selectedNiche || "e.g. Fitness, Finance, Marketing"}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-11"
                />
                {nicheInput && selectedNiche && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#34d399" }} />
                )}
              </div>
              {showNicheSugg && nicheInput && !selectedNiche && filteredNicheSugg.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
                  {filteredNicheSugg.map(s => (
                    <button key={s} onMouseDown={() => selectNiche(s)}
                      className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">{s}</button>
                  ))}
                </div>
              )}
              {!nicheInput && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NICHE_SUGGESTIONS.slice(0, 8).map(n => (
                    <button key={n} onClick={() => selectNiche(n)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all">{n}</button>
                  ))}
                </div>
              )}
              {myNicheData?.intelligence?.niche && !selectedNiche && (
                <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-1">
                  <Rocket className="w-3 h-3" style={{ color: theme.primary }} />
                  Your niche detected: <span className="text-zinc-300 font-semibold">{myNicheData.intelligence.niche}</span>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: theme.primary }} />Platform
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const act = platform === key;
                  return (
                    <button key={key} onClick={() => setPlatform(key)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all hover:scale-[1.02] ${act ? cfg.activeColor : "border-zinc-800 bg-zinc-900 " + cfg.borderColor}`}>
                      {act && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current" style={{ color: key === "instagram" ? "#f472b6" : "#f87171" }} />}
                      <Icon className={`w-6 h-6 ${cfg.color}`} />
                      <span className={`text-xs font-semibold ${act ? cfg.color : "text-zinc-300"}`}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={!selectedNiche || generating}
              className="w-full h-12 text-sm font-bold text-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: theme.gradient }}>
              {generating ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Loading insights…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2"><Activity className="w-4 h-4" />Analyse {selectedNiche || "My Niche"}</span>
              )}
            </Button>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">What you'll get</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Gauge, label: "Niche Health Score", desc: "Composite 0-100 from 4 factors", color: theme.primary },
                  { icon: Award, label: "Your Rank vs Niche", desc: "Percentile + comparison bars", color: "#34d399" },
                  { icon: Lightbulb, label: "Strategy Playbook", desc: "Data-backed content strategies", color: "#60a5fa" },
                  { icon: List, label: "Hook Library", desc: "Proven hooks with copy support", color: "#a78bfa" },
                  { icon: Target, label: "Content Gap Analysis", desc: "What you're missing vs top creators", color: "#fb923c" },
                  { icon: Sparkles, label: "AI Insights", desc: "AI-generated strategy insights", color: "#f472b6" },
                ].map(({ icon: Icon, label, desc, color }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: `${color}08` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{label}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── RESULTS ── */
          <div ref={resultsRef} className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
            {/* Top nav */}
            <div className="flex items-center justify-between section-enter">
              <button onClick={handleNewAnalysis}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />New analysis
              </button>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: `${theme.primary}12`, border: `1px solid ${theme.primary}25`, color: theme.primary }}>
                  {platform === "instagram" ? <Instagram className="w-3 h-3" /> : <Youtube className="w-3 h-3" />}
                  {activeNiche}
                </div>
                {intelligence && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400">
                    <Users className="w-3 h-3" />{intelligence.totalUsers} creators
                  </div>
                )}
                <button onClick={shareReport}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
                  {reportCopied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {reportCopied ? "Copied" : "Share"}
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && !intelligence && (
              <div className="flex flex-col items-center justify-center py-24 space-y-4 section-enter">
                <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.primary, borderTopColor: "transparent" }} />
                <p className="text-sm text-zinc-500">Crunching niche data…</p>
              </div>
            )}

            {/* No data */}
            {!loading && !intelligence && (
              <div className="flex flex-col items-center justify-center py-24 space-y-4 section-enter">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${theme.primary}10` }}>
                  <Search className="w-7 h-7" style={{ color: theme.primary }} />
                </div>
                <p className="text-lg font-bold text-foreground">Not enough data yet</p>
                <p className="text-sm text-zinc-500 max-w-md text-center">
                  We need more winning patterns in "{activeNiche}" to show insights.
                  Keep creating content — the intelligence gets smarter with every post.
                </p>
                <Button onClick={handleNewAnalysis} variant="outline" className="text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Try another niche
                </Button>
              </div>
            )}

            {intelligence && (
              <>
                {/* ── SECTION 1: Hero — Score + Benchmarks ── */}
                <div className="section-enter grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col items-center justify-center relative lg:col-span-1 hover-lift"
                    style={{ animation: "pulseGlow 3s ease-in-out infinite" }}>
                    <AnimatedScoreGauge score={health.healthScore} label={health.healthLabel} color={theme.primary} />
                    {/* Factor breakdown */}
                    <div className="w-full mt-5 space-y-2.5">
                      {[
                        { label: "Engagement", value: Math.min((intelligence.avgEngagementRate * 10 / 40) * 100, 100), color: theme.primary },
                        { label: "Trend", value: Math.min(Math.max(((intelligence.trend30d + 5) / 15) * 100, 0), 100), color: trendColor(intelligence.trend30d) },
                        { label: "Community", value: Math.min((intelligence.totalUsers / 10) * 100, 100), color: "#60a5fa" },
                        { label: "Activity", value: Math.min(((intelligence.totalPosts / Math.max(intelligence.totalUsers, 1)) / 10) * 100, 100), color: "#a78bfa" },
                      ].map(f => (
                        <div key={f.label} className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-zinc-500">{f.label}</span>
                            <span className="text-zinc-400 font-semibold">{Math.round(f.value)}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${f.value}%`, background: f.color, opacity: 0.7 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: "Avg Engagement Rate", value: <AnimatedCountUp value={intelligence.avgEngagementRate} suffix="%" decimals={1} />, sub: `Across ${intelligence.totalPosts} posts`, color: "#34d399", icon: Activity },
                      { label: "Avg Viral Score", value: <AnimatedCountUp value={intelligence.avgViralScore} decimals={1} />, sub: "/10", color: "#a78bfa", icon: TrendingUp },
                      { label: "Avg Views Per Post", value: formatNum(intelligence.avgViews), sub: intelligence.avgViews >= 1000 ? "per post" : "per post", color: "#60a5fa", icon: Eye },
                      { label: "30-Day Trend", value: intelligence.trend30d > 0 ? <><AnimatedCountUp value={intelligence.trend30d} suffix="%" decimals={1} /></> : intelligence.trend30d < 0 ? <><AnimatedCountUp value={Math.abs(intelligence.trend30d)} suffix="%" decimals={1} /></> : "Stable",
                        sub: intelligence.trend30d > 0 ? "Rising ↑" : intelligence.trend30d < 0 ? "Declining ↓" : "Flat →", color: trendColor(intelligence.trend30d), icon: intelligence.trend30d > 0 ? TrendingUp : TrendingDown },
                    ].map(({ label, value, sub, color, icon: Icon }) => (
                      <div key={label} className="relative overflow-hidden rounded-2xl p-5 hover-lift"
                        style={{ background: `linear-gradient(160deg, ${color}0a 0%, ${color}04 100%)`, border: `1px solid ${color}20` }}>
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: color, transform: "translate(30%, -30%)" }} />
                        <div className="relative">
                          <Icon className="w-4 h-4 mb-2" style={{ color }} />
                          <p className="text-2xl font-bold text-foreground" style={{ color }}>{value}</p>
                          <p className="text-[11px] text-zinc-500 mt-1">{label}</p>
                          <p className="text-[9px] text-zinc-600 mt-0.5">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── SECTION 2: You vs Niche ── */}
                <div className="section-enter rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover-lift">
                  <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" style={{ color: theme.primary }} />
                      <p className="text-sm font-bold text-foreground">You vs {activeNiche}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600">Rank #{rank.rank} of {rank.totalUsers}</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}18` }}>
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                            <circle cx="40" cy="40" r="34" fill="none" stroke={theme.primary} strokeWidth="5" strokeLinecap="round"
                              strokeDasharray={2 * Math.PI * 34}
                              strokeDashoffset={2 * Math.PI * 34 * (1 - rank.percentile / 100)}
                              transform="rotate(-90 40 40)"
                              style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                          </svg>
                          <span className="text-xl font-black tracking-tight" style={{ color: theme.primary }}>{rank.percentile}%</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2 text-center leading-relaxed">
                          You're outperforming<br/>{rank.percentile}% of creators
                        </p>
                      </div>

                      <div className="flex flex-col justify-center p-4 rounded-xl" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">Engagement Rate</p>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">You</span>
                            <span className="text-sm font-bold" style={{ color: rank.userAvgEngagement >= rank.nicheAvgEngagement ? "#34d399" : "#f87171" }}>
                              {rank.userAvgEngagement.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Niche avg</span>
                            <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>{rank.nicheAvgEngagement.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-800 mt-1 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min((rank.userAvgEngagement / Math.max(rank.nicheAvgEngagement, 0.01)) * 100, 100)}%`, background: rank.userAvgEngagement >= rank.nicheAvgEngagement ? "#34d399" : "#f87171" }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center p-4 rounded-xl" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">Viral Score</p>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">You</span>
                            <span className="text-sm font-bold" style={{ color: rank.userAvgViralScore >= rank.nicheAvgViralScore ? "#34d399" : "#f87171" }}>
                              {rank.userAvgViralScore.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Niche avg</span>
                            <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>{rank.nicheAvgViralScore.toFixed(1)}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-800 mt-1 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min((rank.userAvgViralScore / Math.max(rank.nicheAvgViralScore, 0.01)) * 100, 100)}%`, background: rank.userAvgViralScore >= rank.nicheAvgViralScore ? "#34d399" : "#a78bfa" }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center p-4 rounded-xl" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}18` }}>
                        <Crown className="w-8 h-8 mb-2" style={{ color: theme.primary }} />
                        <p className="text-2xl font-black text-foreground" style={{ color: theme.primary }}>#{rank.rank}</p>
                        <p className="text-[10px] text-zinc-500 text-center mt-1">of {rank.totalUsers} creators in {activeNiche}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: Top Patterns ── */}
                <div className="section-enter rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover-lift">
                  <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" style={{ color: theme.primary }} />
                      <p className="text-sm font-bold text-foreground">Top Patterns in {activeNiche}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600">{intelligence.totalWinningPatterns} winning patterns</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {intelligence.topHookType && (
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover-lift" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}18` }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${theme.primary}15` }}>
                            <Zap className="w-5 h-5" style={{ color: theme.primary }} />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Top Hook</p>
                            <p className="text-sm font-bold text-foreground capitalize mt-0.5">{intelligence.topHookType}</p>
                          </div>
                        </div>
                      )}
                      {intelligence.topContentType && (
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover-lift" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(167,139,250,0.12)" }}>
                            <Layers className="w-5 h-5" style={{ color: "#a78bfa" }} />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Top Format</p>
                            <p className="text-sm font-bold text-foreground capitalize mt-0.5">{intelligence.topContentType}</p>
                          </div>
                        </div>
                      )}
                      {intelligence.topStructure && (
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover-lift" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(52,211,153,0.12)" }}>
                            <Target className="w-5 h-5" style={{ color: "#34d399" }} />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Top Structure</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{intelligence.topStructure}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Avg Likes", value: formatNum(intelligence.avgLikes), icon: Heart, color: "#f472b6" },
                        { label: "Avg Comments", value: formatNum(intelligence.avgComments), icon: MessageCircle, color: "#60a5fa" },
                        { label: "Avg Saves", value: formatNum(intelligence.avgSaves), icon: Bookmark, color: "#34d399" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="flex flex-col items-center justify-center py-3 px-2 rounded-xl hover-lift" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                          <Icon className="w-4 h-4 mb-1" style={{ color }} />
                          <p className="text-lg font-bold text-foreground">{value}</p>
                          <p className="text-[10px] text-zinc-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── SECTION 4: Strategy Playbook ── */}
                {strategies.length > 0 && (
                  <div className="section-enter rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover-lift">
                    <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" style={{ color: theme.primary }} />
                      <p className="text-sm font-bold text-foreground">Content Strategy Playbook</p>
                      <span className="text-[10px] text-zinc-600 ml-auto">{strategies.length} strategies</span>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {strategies.map((s, i) => {
                        const impactColor = s.impact === "high" ? "#fb923c" : "#60a5fa";
                        return (
                          <div key={i} className="flex items-start gap-3 p-4 rounded-xl hover-lift" style={{ background: `${impactColor}06`, border: `1px solid ${impactColor}18` }}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${impactColor}12` }}>
                              <Zap className="w-4 h-4" style={{ color: impactColor }} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-bold text-foreground">{s.title}</p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase" style={{ background: `${impactColor}20`, color: impactColor }}>{s.impact}</span>
                              </div>
                              <p className="text-xs text-zinc-500 leading-relaxed">{s.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── SECTION 5: AI Insights ── */}
                <div className="section-enter rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover-lift">
                  <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" style={{ color: theme.primary }} />
                      <p className="text-sm font-bold text-foreground">AI-Powered Insights</p>
                    </div>
                    {!aiInsights && (
                      <button onClick={generateAiInsights} disabled={loadingInsights}
                        className="text-[10px] px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-all"
                        style={{ background: `${theme.primary}15`, color: theme.primary }}>
                        {loadingInsights ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                        {loadingInsights ? "Generating…" : "Generate AI Insights"}
                      </button>
                    )}
                  </div>
                  <div className="p-5">
                    {aiInsights ? (
                      <div className="space-y-3">
                        {aiInsights.map((insight, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: `${theme.primary}06`, border: `1px solid ${theme.primary}15` }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${theme.primary}12` }}>
                              <span className="text-sm font-bold" style={{ color: theme.primary }}>{i + 1}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{insight.title}</p>
                              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{insight.explanation}</p>
                              <p className="text-xs font-semibold mt-1.5" style={{ color: theme.primary }}>
                                Do this: {insight.action}
                              </p>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => setAiInsights(null)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Regenerate
                        </button>
                      </div>
                    ) : loadingInsights ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: theme.primary }} />
                        <span className="text-sm text-zinc-500 ml-3">AI is analysing niche data…</span>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-zinc-500">Click generate to get AI-powered strategy insights tailored to your niche data.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── SECTION 6: Trends + Hooks ── */}
                <div className="section-enter grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {trends.length > 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4 hover-lift">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4" style={{ color: "#fb923c" }} />
                        <p className="text-sm font-bold text-foreground">Trending Signals</p>
                        {trends.length > 0 && <SparklineChart data={trends.slice(0, 12).map(t => t.engagementDelta)} color={theme.primary} />}
                      </div>
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scroll">
                        {trends.slice(0, 12).map((t, i) => {
                          const ms = MOMENTUM_STYLES[t.momentum] || MOMENTUM_STYLES.stable;
                          return (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl hover-lift" style={{ background: ms.bg, border: `1px solid ${ms.border}` }}>
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-sm shrink-0">{ms.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground capitalize truncate">{t.trendValue}</p>
                                  <p className="text-[10px] text-zinc-500 capitalize">{t.trendType.replace(/_/g, " ")}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-bold" style={{ color: ms.color }}>
                                  {t.engagementDelta > 0 ? "+" : ""}{t.engagementDelta.toFixed(1)}%
                                </span>
                                <span className="text-[9px] text-zinc-600">{t.sampleCount}p</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {hooks.length > 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4 hover-lift">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" style={{ color: theme.primary }} />
                        <p className="text-sm font-bold text-foreground">Hook Library — {activeNiche}</p>
                        <span className="text-[10px] text-zinc-600 ml-auto">{hooks.length} hooks</span>
                      </div>
                      {hooks.length > 4 && (
                        <Input value={hookSearch} onChange={e => setHookSearch(e.target.value)}
                          placeholder="Search hooks…"
                          className="h-8 text-xs bg-zinc-900/60 border-zinc-700 text-white placeholder:text-zinc-600" />
                      )}
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scroll">
                        {(hooksExpanded ? filteredHooks : filteredHooks.slice(0, 6)).map((h, i) => (
                          <div key={h.id || i} className="flex items-start gap-3 px-4 py-3 rounded-xl group hover-lift"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: `${theme.primary}15` }}>
                              <span className="text-[9px] font-bold" style={{ color: theme.primary }}>H</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-foreground font-medium leading-relaxed">{h.hook}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: `${theme.primary}12`, color: theme.primary }}>{h.hookType}</span>
                                <span className="text-[9px] text-zinc-600">Score: {h.viralScore?.toFixed(1)}</span>
                                <span className="text-[9px] text-zinc-600">Uses: {h.usageCount}</span>
                                <button onClick={() => copyHook(h)}
                                  className="ml-auto text-[9px] px-2 py-0.5 rounded flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
                                  style={{ background: `${theme.primary}15`, color: theme.primary }}>
                                  {copiedHookId === h.id ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                                  {copiedHookId === h.id ? "Copied" : "Copy"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {filteredHooks.length > 6 && (
                        <button onClick={() => setHooksExpanded(!hooksExpanded)}
                          className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-2 transition-colors flex items-center justify-center gap-1">
                          {hooksExpanded ? "Show less" : `Show all ${filteredHooks.length} hooks`}
                          <ChevronLeft className={`w-3 h-3 transition-transform ${hooksExpanded ? "rotate-90" : "-rotate-90"}`} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── SECTION 7: Content Gap Analysis ── */}
                {gaps.length > 0 && (
                  <div className="section-enter rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover-lift">
                    <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: "#fb923c" }} />
                      <p className="text-sm font-bold text-foreground">Content Gap Analysis</p>
                      <span className="text-[10px] text-zinc-600 ml-auto">{gaps.length} opportunities</span>
                    </div>
                    <div className="p-5 space-y-2">
                      <p className="text-xs text-zinc-500 mb-3">
                        These patterns work in {activeNiche} — you haven't tried them yet.
                      </p>
                      {gaps.slice(0, 8).map((g, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-3.5 rounded-xl hover-lift" style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.12)" }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(251,146,60,0.1)" }}>
                            <ArrowUpRight className="w-4 h-4" style={{ color: "#fb923c" }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground">Try {g.hookType} + {g.contentType}</p>
                            <p className="text-xs text-zinc-500 mt-1">Missing: {g.missing.join(", ")}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${g.potentialImpact === "high" ? "text-orange-400" : "text-blue-400"}`}
                                style={{ background: g.potentialImpact === "high" ? "rgba(251,146,60,0.15)" : "rgba(96,165,250,0.15)" }}>
                                {g.potentialImpact} impact
                              </span>
                              <span className="text-[9px] text-zinc-600">Avg ER: {g.avgEngagementRate.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── SECTION 8: Content Ideas (AI) ── */}
                <div className="section-enter rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover-lift">
                  <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4" style={{ color: theme.primary }} />
                      <p className="text-sm font-bold text-foreground">Content Ideas for {activeNiche}</p>
                    </div>
                    {!contentIdeas && (
                      <button onClick={generateContentIdeas} disabled={loadingIdeas}
                        className="text-[10px] px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-all"
                        style={{ background: `${theme.primary}15`, color: theme.primary }}>
                        {loadingIdeas ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                        {loadingIdeas ? "Generating…" : "Generate Ideas"}
                      </button>
                    )}
                  </div>
                  <div className="p-5">
                    {contentIdeas ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {contentIdeas.map((idea, i) => (
                          <div key={i} className="flex flex-col gap-2 p-4 rounded-xl hover-lift" style={{ background: `${theme.primary}06`, border: `1px solid ${theme.primary}15` }}>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase" style={{ background: `${theme.primary}15`, color: theme.primary }}>
                                {idea.format || "Post"}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-foreground">{idea.title}</p>
                            <p className="text-xs text-zinc-400 italic">"{idea.hook}"</p>
                            <p className="text-[10px] text-zinc-500">{idea.whyItWorks}</p>
                          </div>
                        ))}
                        <button onClick={() => setContentIdeas(null)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 col-span-full mt-1">
                          <RefreshCw className="w-3 h-3" /> Generate fresh ideas
                        </button>
                      </div>
                    ) : loadingIdeas ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: theme.primary }} />
                        <span className="text-sm text-zinc-500 ml-3">Generating content ideas…</span>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-zinc-500">Get AI-powered content ideas tailored to your niche's winning patterns.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── SECTION 9: Bottom CTA ── */}
                <div className="section-enter rounded-2xl border border-zinc-800 p-7 text-center hover-lift"
                  style={{ background: `linear-gradient(160deg, ${theme.primary}08 0%, transparent 100%)`, animation: "pulseGlow 3s ease-in-out infinite" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: `${theme.primary}12` }}>
                    <Crown className="w-6 h-6" style={{ color: theme.primary }} />
                  </div>
                  <p className="text-base font-bold text-foreground">Put This Intelligence to Work</p>
                  <p className="text-sm text-zinc-500 mt-1 max-w-lg mx-auto">
                    Every piece of content you generate with our AI now uses these niche benchmarks to optimise for what's actually working.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
                    <Button onClick={() => navigate("/content-intelligence")}
                      className="text-sm font-bold text-black rounded-xl px-5"
                      style={{ background: theme.gradient }}>
                      <Brain className="w-4 h-4 mr-1.5" />
                      Open Content Intelligence
                    </Button>
                    <Button onClick={shareReport} variant="outline"
                      className="text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl">
                      <Share2 className="w-4 h-4 mr-1.5" />
                      {reportCopied ? "Copied!" : "Share Report"}
                    </Button>
                    <Button onClick={handleNewAnalysis} variant="outline"
                      className="text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl">
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                      New Analysis
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <style>{`.custom-scroll::-webkit-scrollbar { width: 4px; } .custom-scroll::-webkit-scrollbar-track { background: transparent; } .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }`}</style>
    </ClientLayout>
  );
}

// Use a local Heart instead of lucide since it was already in the codebase
function Heart({ className }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>);
}
