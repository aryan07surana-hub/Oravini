import { useState, useCallback } from "react";
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
  Instagram, Youtube, CheckCircle2,
  Heart, List, FileText, Download, Lightbulb,
  Gauge, Award, MoveUpRight, MoveDown, Copy,
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

interface NicheData {
  niche: string; platform: string;
  avgViews: number; avgLikes: number; avgComments: number; avgSaves: number; avgShares: number;
  avgEngagementRate: number; avgViralScore: number;
  topHookType: string | null; topContentType: string | null; topStructure: string | null;
  totalPosts: number; totalUsers: number; totalWinningPatterns: number; trend30d: number;
  healthScore: number | null; healthLabel: string | null;
}

interface TrendData {
  niche: string; platform: string; trendType: string; trendValue: string;
  momentum: string; engagementDelta: number; sampleCount: number;
}

interface HealthScoreData {
  healthScore: number; healthLabel: string; factors: Record<string, number>;
}

interface RankData {
  percentile: number; userAvgEngagement: number; nicheAvgEngagement: number;
  userAvgViralScore: number; nicheAvgViralScore: number; totalUsers: number; rank: number;
}

interface StrategyData {
  type: string; title: string; description: string; impact: string; icon: string;
}

interface HookLibraryItem {
  id: string; hook: string; hookType: string; platform: string; niche: string;
  viralScore: number; avgViews: number; avgEngagement: number; usageCount: number; source: string;
}

interface GapData {
  hookType: string; contentType: string; structure: string;
  missing: string[]; potentialImpact: string; avgEngagementRate: number;
}

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function trendColor(val: number): string {
  if (val > 0) return "#34d399";
  if (val < 0) return "#f87171";
  return GOLD;
}

const MOMENTUM_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  spiking: { bg: "rgba(251,146,60,0.15)", border: "rgba(251,146,60,0.3)", color: "#fb923c", icon: "🔥" },
  up: { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)", color: "#34d399", icon: "↑" },
  down: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)", color: "#f87171", icon: "↓" },
  stable: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", icon: "→" },
};

const STRATEGY_ICONS: Record<string, any> = {
  zap: Zap, layers: Layers, "trending-up": TrendingUp, flame: Flame, target: Target,
};

function HealthScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? GOLD : score >= 40 ? "#fb923c" : "#f87171";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
        <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="70" cy="70" r="54" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ transform: "translateY(-2px)" }}>
        <span className="text-3xl font-black" style={{ color }}>{score}</span>
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

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
  const [copied, setCopied] = useState(false);

  const filteredNicheSugg = NICHE_SUGGESTIONS.filter(
    s => s.toLowerCase().includes(nicheInput.toLowerCase()) && s !== selectedNiche
  );

  const isActive = step === "results" && !!activeNiche;

  const { data: nicheData, isLoading: dataLoading, isFetching: dataFetching } = useQuery<NicheData[]>({
    queryKey: ["/api/niche-intelligence", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive,
    staleTime: 2 * 60 * 1000,
  });

  const { data: trendsData } = useQuery<TrendData[]>({
    queryKey: ["/api/niche-intelligence/trends", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/trends?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive,
    staleTime: 2 * 60 * 1000,
  });

  const { data: healthData } = useQuery<HealthScoreData>({
    queryKey: ["/api/niche-intelligence/score", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/score?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive,
    staleTime: 2 * 60 * 1000,
  });

  const { data: rankData } = useQuery<RankData>({
    queryKey: ["/api/niche-intelligence/rank", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/rank?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive,
    staleTime: 2 * 60 * 1000,
  });

  const { data: strategyData } = useQuery<StrategyData[]>({
    queryKey: ["/api/niche-intelligence/strategy", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/strategy?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive,
    staleTime: 2 * 60 * 1000,
  });

  const { data: hooksData } = useQuery<HookLibraryItem[]>({
    queryKey: ["/api/niche-intelligence/hooks", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/hooks?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive,
    staleTime: 2 * 60 * 1000,
  });

  const { data: gapsData } = useQuery<GapData[]>({
    queryKey: ["/api/niche-intelligence/gaps", activeNiche, platform],
    queryFn: () => apiRequest("GET", `/api/niche-intelligence/gaps?niche=${encodeURIComponent(activeNiche)}&platform=${platform}`),
    enabled: isActive,
    staleTime: 2 * 60 * 1000,
  });

  const intelligence = nicheData?.[0] || null;
  const trends = trendsData || [];
  const strategies = strategyData || [];
  const hooks = hooksData || [];
  const gaps = gapsData || [];
  const health = healthData || { healthScore: 0, healthLabel: "No Data", factors: {} };
  const rank = rankData || { percentile: 0, userAvgEngagement: 0, nicheAvgEngagement: 0, userAvgViralScore: 0, nicheAvgViralScore: 0, totalUsers: 0, rank: 0 };

  const handleGenerate = async () => {
    if (!selectedNiche.trim()) {
      toast({ title: "Choose a niche", description: "Select or type your niche to analyse", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setActiveNiche(selectedNiche);
    await new Promise(r => setTimeout(r, 100));
    setStep("results");
    setGenerating(false);
  };

  const handleNewAnalysis = () => {
    setStep("config");
    setNicheInput("");
    setSelectedNiche("");
    setActiveNiche("");
    setHooksExpanded(false);
  };

  const selectNiche = (n: string) => {
    setSelectedNiche(n);
    setNicheInput(n);
    setShowNicheSugg(false);
  };

  const shareResults = async () => {
    const text = `Niche Intelligence Report for ${activeNiche} on ${platform}\n\n` +
      `Health Score: ${health.healthScore}/100 (${health.healthLabel})\n` +
      `You're in the top ${Math.max(100 - rank.percentile, 1)}% of creators\n` +
      `Niche Avg Engagement: ${intelligence?.avgEngagementRate.toFixed(1)}%\n` +
      `${intelligence?.totalUsers} creators · ${intelligence?.totalPosts} posts analysed`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard", description: "Share this report with your team" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const loading = dataLoading || dataFetching;
  const placeholderNiche = selectedNiche || "e.g. Fitness, Finance, Marketing";

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        {step === "config" ? (
          <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
            <div className="text-center space-y-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mx-auto mb-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />Dashboard
              </button>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Activity className="w-3.5 h-3.5" />Niche Intelligence
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                See What's <span className="text-primary">Working</span> in Your Niche
              </h1>
              <p className="text-zinc-400 text-sm max-w-lg mx-auto">
                Aggregated performance data from creators in your niche.
                Discover which hooks, formats, and strategies drive real engagement — and what's trending right now.
              </p>
            </div>

            <div className="border-t border-zinc-800/60" />

            <div className="space-y-3 relative">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />Your Niche <span className="text-red-400">*</span>
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
                  placeholder={placeholderNiche}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-11"
                />
                {nicheInput && selectedNiche && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#34d399" }} />
                )}
              </div>
              {showNicheSugg && nicheInput && !selectedNiche && filteredNicheSugg.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
                  {filteredNicheSugg.map(s => (
                    <button
                      key={s}
                      onMouseDown={() => selectNiche(s)}
                      className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {!nicheInput && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NICHE_SUGGESTIONS.slice(0, 6).map(n => (
                    <button
                      key={n}
                      onClick={() => selectNiche(n)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />Platform
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = platform === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setPlatform(key)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all hover:scale-[1.02] ${
                        isActive ? cfg.activeColor : "border-zinc-800 bg-zinc-900 " + cfg.borderColor
                      }`}
                    >
                      {isActive && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current" style={{ color: key === "instagram" ? "#f472b6" : "#f87171" }} />}
                      <Icon className={`w-6 h-6 ${cfg.color}`} />
                      <span className={`text-xs font-semibold ${isActive ? cfg.color : "text-zinc-300"}`}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedNiche || generating}
              className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Loading insights…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4" />
                  Analyse {selectedNiche || "My Niche"}
                </span>
              )}
            </Button>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">What you'll get</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Gauge, label: "Niche Health Score", desc: "Composite 0-100 score for your niche", color: GOLD },
                  { icon: BarChart2, label: "Benchmarks", desc: "Engagement rates, viral scores, views per post", color: "#a78bfa" },
                  { icon: Award, label: "Your Rank", desc: "Where you stand vs other creators", color: "#34d399" },
                  { icon: Lightbulb, label: "Strategy Playbook", desc: "Actionable data-backed content strategies", color: "#60a5fa" },
                  { icon: List, label: "Hook Library", desc: "Proven hooks working in your niche", color: "#f472b6" },
                  { icon: Target, label: "Content Gap Analysis", desc: "What you're missing compared to top performers", color: "#fb923c" },
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
          /* ── RESULTS STEP ── */
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
            {/* Top nav */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleNewAnalysis}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />New analysis
              </button>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.2)", color: GOLD }}>
                  {platform === "instagram" ? <Instagram className="w-3 h-3" /> : <Youtube className="w-3 h-3" />}
                  {activeNiche}
                </div>
                {intelligence && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400">
                    <Users className="w-3 h-3" />
                    {intelligence.totalUsers} creators
                  </div>
                )}
                <button
                  onClick={shareResults}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
                >
                  {copied ? <Copy className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  {copied ? "Copied" : "Share"}
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && !intelligence && (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
                <p className="text-sm text-zinc-500">Crunching niche data…</p>
              </div>
            )}

            {/* No data */}
            {!loading && !intelligence && (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.1)" }}>
                  <Search className="w-7 h-7" style={{ color: GOLD }} />
                </div>
                <p className="text-lg font-bold text-foreground">Not enough data yet</p>
                <p className="text-sm text-zinc-500 max-w-md text-center">
                  We need more winning patterns in "{activeNiche}" to show insights.
                  Keep creating content and tracking performance — the intelligence gets smarter with every post.
                </p>
                <Button onClick={handleNewAnalysis} variant="outline" className="text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Try another niche
                </Button>
              </div>
            )}

            {intelligence && (
              <>
                {/* ── TOP ROW: Niche Score + Benchmarks ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* Niche Health Score Gauge */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col items-center justify-center relative lg:col-span-1">
                    <div className="relative flex flex-col items-center">
                      <HealthScoreGauge score={health.healthScore} label={health.healthLabel} />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-4 text-center leading-relaxed">
                      Engagement · Trend · Community · Activity
                    </p>
                  </div>

                  {/* 4 Benchmark Cards */}
                  <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: "Avg Engagement Rate", value: `${intelligence.avgEngagementRate.toFixed(1)}%`, sub: intelligence.totalPosts > 0 ? `Across ${intelligence.totalPosts} posts` : "No data yet", color: "#34d399", icon: Activity },
                      { label: "Avg Viral Score", value: intelligence.avgViralScore.toFixed(1), sub: "/10", color: "#a78bfa", icon: TrendingUp },
                      { label: "Avg Views Per Post", value: formatNum(intelligence.avgViews), sub: "per post", color: "#60a5fa", icon: Eye },
                      { label: "30-Day Trend", value: intelligence.trend30d > 0 ? `+${intelligence.trend30d.toFixed(1)}%` : intelligence.trend30d < 0 ? `${intelligence.trend30d.toFixed(1)}%` : "Stable", sub: intelligence.trend30d > 0 ? "Rising" : intelligence.trend30d < 0 ? "Declining" : "Flat", color: trendColor(intelligence.trend30d), icon: intelligence.trend30d > 0 ? TrendingUp : TrendingDown },
                    ].map(({ label, value, sub, color, icon: Icon }) => (
                      <div key={label}
                        className="relative overflow-hidden rounded-2xl p-5"
                        style={{ background: `linear-gradient(160deg, ${color}0a 0%, ${color}04 100%)`, border: `1px solid ${color}20` }}
                      >
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

                {/* ── YOU VS NICHE RANK ── */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" style={{ color: GOLD }} />
                      <p className="text-sm font-bold text-foreground">You vs {activeNiche}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600">Rank #{rank.rank} of {rank.totalUsers}</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Percentile */}
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.15)" }}>
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                            <circle cx="40" cy="40" r="34" fill="none" stroke={GOLD} strokeWidth="6" strokeLinecap="round"
                              strokeDasharray={2 * Math.PI * 34}
                              strokeDashoffset={2 * Math.PI * 34 * (1 - rank.percentile / 100)}
                              transform="rotate(-90 40 40)"
                            />
                          </svg>
                          <span className="text-xl font-black" style={{ color: GOLD }}>{rank.percentile}%</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2 text-center">You're outperforming<br/>{rank.percentile}% of creators</p>
                      </div>

                      {/* Engagement comparison */}
                      <div className="flex flex-col justify-center p-4 rounded-xl" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Engagement Rate</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">You</span>
                            <span className="text-sm font-bold text-foreground" style={{ color: rank.userAvgEngagement >= rank.nicheAvgEngagement ? "#34d399" : "#f87171" }}>
                              {rank.userAvgEngagement.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Niche avg</span>
                            <span className="text-sm font-bold text-foreground" style={{ color: "#a78bfa" }}>{rank.nicheAvgEngagement.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-800 mt-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-transparent to-white/30"
                              style={{ width: `${Math.min((rank.userAvgEngagement / Math.max(rank.nicheAvgEngagement, 0.01)) * 100, 100)}%`, background: rank.userAvgEngagement >= rank.nicheAvgEngagement ? "#34d399" : "#f87171" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Viral score comparison */}
                      <div className="flex flex-col justify-center p-4 rounded-xl" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Viral Score</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">You</span>
                            <span className="text-sm font-bold text-foreground" style={{ color: rank.userAvgViralScore >= rank.nicheAvgViralScore ? "#34d399" : "#f87171" }}>
                              {rank.userAvgViralScore.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Niche avg</span>
                            <span className="text-sm font-bold text-foreground" style={{ color: "#a78bfa" }}>{rank.nicheAvgViralScore.toFixed(1)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-800 mt-1 overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.min((rank.userAvgViralScore / Math.max(rank.nicheAvgViralScore, 0.01)) * 100, 100)}%`, background: rank.userAvgViralScore >= rank.nicheAvgViralScore ? "#34d399" : "#a78bfa" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Rank badge */}
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}>
                        <Crown className="w-8 h-8 mb-2" style={{ color: GOLD }} />
                        <p className="text-2xl font-black text-foreground">#{rank.rank}</p>
                        <p className="text-[10px] text-zinc-500 text-center mt-1">of {rank.totalUsers} creators in {activeNiche}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── TOP PATTERNS ── */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" style={{ color: GOLD }} />
                      <p className="text-sm font-bold text-foreground">Top Patterns in {activeNiche}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600">{intelligence.totalWinningPatterns} winning patterns analysed</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {intelligence.topHookType && (
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.15)" }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(212,180,97,0.12)" }}>
                            <Zap className="w-5 h-5" style={{ color: GOLD }} />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Top Hook Type</p>
                            <p className="text-base font-bold text-foreground capitalize mt-0.5">{intelligence.topHookType}</p>
                          </div>
                        </div>
                      )}
                      {intelligence.topContentType && (
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(167,139,250,0.12)" }}>
                            <Layers className="w-5 h-5" style={{ color: "#a78bfa" }} />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Top Content Type</p>
                            <p className="text-base font-bold text-foreground capitalize mt-0.5">{intelligence.topContentType}</p>
                          </div>
                        </div>
                      )}
                      {intelligence.topStructure && (
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
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

                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[
                        { label: "Avg Likes", value: formatNum(intelligence.avgLikes), icon: HeartIcon, color: "#f472b6" },
                        { label: "Avg Comments", value: formatNum(intelligence.avgComments), icon: MessageCircle, color: "#60a5fa" },
                        { label: "Avg Saves", value: formatNum(intelligence.avgSaves), icon: Bookmark, color: "#34d399" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="flex flex-col items-center justify-center py-3 px-2 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                          <Icon className="w-4 h-4 mb-1" style={{ color }} />
                          <p className="text-lg font-bold text-foreground">{value}</p>
                          <p className="text-[10px] text-zinc-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── CONTENT STRATEGY PLAYBOOK ── */}
                {strategies.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" style={{ color: GOLD }} />
                      <p className="text-sm font-bold text-foreground">Content Strategy Playbook</p>
                      <span className="text-[10px] text-zinc-600 ml-auto">{strategies.length} strategies</span>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {strategies.map((s, i) => {
                        const StIcon = STRATEGY_ICONS[s.icon] || Zap;
                        const impactColor = s.impact === "high" ? "#fb923c" : "#60a5fa";
                        return (
                          <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: `${impactColor}06`, border: `1px solid ${impactColor}18` }}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${impactColor}12` }}>
                              <StIcon className="w-4 h-4" style={{ color: impactColor }} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-bold text-foreground">{s.title}</p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase" style={{ background: `${impactColor}20`, color: impactColor }}>
                                  {s.impact}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 leading-relaxed">{s.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── TRENDING SIGNALS + HOOK LIBRARY ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Trending Signals */}
                  {trends.length > 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4" style={{ color: "#fb923c" }} />
                        <p className="text-sm font-bold text-foreground">Trending Signals</p>
                        <span className="text-[10px] text-zinc-600 ml-auto">{trends.length} signals</span>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {trends.slice(0, 12).map((t, i) => {
                          const ms = MOMENTUM_STYLES[t.momentum] || MOMENTUM_STYLES.stable;
                          return (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: ms.bg, border: `1px solid ${ms.border}` }}>
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
                      {/* Trend timeline */}
                      {trends.length > 1 && (
                        <div className="pt-2 border-t border-zinc-800/60">
                          <p className="text-[10px] text-zinc-500 mb-3 flex items-center gap-1">
                            <BarChart2 className="w-3 h-3" />Trend momentum distribution
                          </p>
                          <div className="flex items-end gap-1.5 h-12">
                            {trends.slice(0, 16).map((t, i) => {
                              const h = Math.max(8, Math.min(48, Math.abs(t.engagementDelta) * 3 + 8));
                              const c = t.momentum === "spiking" ? "#fb923c" : t.momentum === "up" ? "#34d399" : t.momentum === "down" ? "#f87171" : "rgba(255,255,255,0.2)";
                              return <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}px`, background: c, opacity: 0.7 }} title={`${t.trendValue}: ${t.engagementDelta > 0 ? "+" : ""}${t.engagementDelta.toFixed(1)}%`} />;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hook Library */}
                  {hooks.length > 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" style={{ color: GOLD }} />
                        <p className="text-sm font-bold text-foreground">Hook Library — {activeNiche}</p>
                        <span className="text-[10px] text-zinc-600 ml-auto">{hooks.length} hooks</span>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {(hooksExpanded ? hooks : hooks.slice(0, 6)).map((h, i) => (
                          <div key={h.id || i} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(212,180,97,0.12)" }}>
                              <span className="text-[9px] font-bold" style={{ color: GOLD }}>H</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-foreground font-medium leading-relaxed">{h.hook}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>{h.hookType}</span>
                                <span className="text-[9px] text-zinc-600">Score: {h.viralScore?.toFixed(1)}</span>
                                <span className="text-[9px] text-zinc-600">Uses: {h.usageCount}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {hooks.length > 6 && (
                        <button
                          onClick={() => setHooksExpanded(!hooksExpanded)}
                          className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-2 transition-colors flex items-center justify-center gap-1"
                        >
                          {hooksExpanded ? "Show less" : `Show all ${hooks.length} hooks`}
                          <ChevronLeft className={`w-3 h-3 transition-transform ${hooksExpanded ? "rotate-90" : "-rotate-90"}`} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── CONTENT GAP ANALYSIS ── */}
                {gaps.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: "#fb923c" }} />
                      <p className="text-sm font-bold text-foreground">Content Gap Analysis</p>
                      <span className="text-[10px] text-zinc-600 ml-auto">{gaps.length} opportunities found</span>
                    </div>
                    <div className="p-5 space-y-2">
                      <p className="text-xs text-zinc-500 mb-3">
                        These are patterns working well in {activeNiche} that you haven't tried yet.
                      </p>
                      {gaps.slice(0, 8).map((g, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.12)" }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(251,146,60,0.1)" }}>
                            <MoveUpRight className="w-4 h-4" style={{ color: "#fb923c" }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">
                              Try {g.hookType} hooks with {g.contentType} content
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                              Missing: {g.missing.join(", ")}
                            </p>
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

                {/* ── BOTTOM CTA ── */}
                <div className="rounded-2xl border border-zinc-800 p-6 text-center" style={{ background: `linear-gradient(160deg, ${GOLD}08 0%, transparent 100%)` }}>
                  <Crown className="w-8 h-8 mx-auto mb-3" style={{ color: GOLD }} />
                  <p className="text-base font-bold text-foreground">Put This Intelligence to Work</p>
                  <p className="text-sm text-zinc-500 mt-1 max-w-lg mx-auto">
                    Every piece of content you generate with our AI now uses these niche benchmarks to optimise for what's actually working.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                    <Button
                      onClick={() => navigate("/content-intelligence")}
                      className="text-sm font-bold bg-primary hover:bg-primary/90 text-black rounded-xl px-5"
                    >
                      <Brain className="w-4 h-4 mr-1.5" />
                      Open Content Intelligence
                    </Button>
                    <Button
                      onClick={shareResults}
                      variant="outline"
                      className="text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl"
                    >
                      <Share2 className="w-4 h-4 mr-1.5" />
                      {copied ? "Copied!" : "Share Report"}
                    </Button>
                    <Button
                      onClick={handleNewAnalysis}
                      variant="outline"
                      className="text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl"
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                      Analyse Another Niche
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
