import { useState, useEffect } from "react";
import { AiRefineButton } from "@/components/ui/AiRefineButton";
import CreditCostBadge from "@/components/CreditCostBadge";
import { PageTourButton } from "@/components/ui/TourGuide";
import ViralityTester from "@/pages/client/ViralityTester";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { useSurvey } from "@/hooks/use-survey";
import CreditErrorBanner from "@/components/CreditErrorBanner";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  Legend,
} from "recharts";
import {
  Instagram, Eye, Heart, MessageCircle, TrendingUp, TrendingDown,
  Sparkles, Loader2, Trash2, ChevronRight, Target, Zap, AlertTriangle,
  BarChart2, Clock, Star, CheckCircle, XCircle, ArrowRight, Users, RefreshCw,
  Lightbulb, BookOpen, Calendar, Flame, Shield, Trophy, Copy, Check,
  AlertCircle, Award, ArrowUpRight, ExternalLink, Play, ChevronDown, ChevronUp,
  TrendingUp as Trending, Sword, Crosshair, Layers, Search, Hash,
  Wand2, Brain, Activity, FileText, Dna,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ─── Constants ───────────────────────────────────────────────────────────────

const GOLD = "#d4b461";
const PIE_COLORS = ["#d4b461", "#e879a0", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"];

const HOOK_COLORS: Record<string, string> = {
  curiosity: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  storytelling: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  authority: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  controversy: "bg-red-500/15 text-red-300 border-red-500/30",
  "pain-point": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  education: "bg-green-500/15 text-green-300 border-green-500/30",
};

const IMPACT_COLORS: Record<string, string> = {
  High: "bg-red-500/15 text-red-300 border-red-500/30",
  Medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  Low: "bg-green-500/15 text-green-300 border-green-500/30",
};

const RETENTION_COLORS: Record<string, string> = {
  "Very High": "text-green-400",
  High: "text-primary",
  Medium: "text-yellow-400",
  Low: "text-red-400",
};

function normalizeInstagramUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  // Already a full URL
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, "") + "/";
  }
  // @handle or handle
  const handle = raw.replace(/^@/, "").trim();
  if (!handle) return "";
  return `https://www.instagram.com/${handle}/`;
}

async function apiRequestWithTimeout(
  method: string,
  url: string,
  data: unknown,
  timeoutMs = 35000,
) {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(
        new Error("Request timed out. Apify may be slow right now - please retry."),
      );
    }, timeoutMs);
  });
  return Promise.race([apiRequest(method, url, data), timeoutPromise]);
}

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  { id: "overview", label: "Overview", icon: BarChart2, color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", text: "text-blue-400", desc: "Full profile comparison" },
  { id: "reels", label: "Reel by Reel", icon: Play, color: "from-pink-500/20 to-pink-500/5", border: "border-pink-500/30", text: "text-pink-400", desc: "Choose & compare reels" },
  { id: "performance", label: "Performance", icon: TrendingUp, color: "from-green-500/20 to-green-500/5", border: "border-green-500/30", text: "text-green-400", desc: "Charts & metrics" },
  { id: "patterns", label: "AI Patterns", icon: Sparkles, color: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/30", text: "text-yellow-400", desc: "Viral formulas decoded" },
  { id: "gaps", label: "Gap Analysis", icon: Search, color: "from-red-500/20 to-red-500/5", border: "border-red-500/30", text: "text-red-400", desc: "Where you're losing" },
  { id: "hooks", label: "Hook Library", icon: Zap, color: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", text: "text-purple-400", desc: "Me vs Competitor" },
  { id: "strategy", label: "Posting Strategy", icon: Calendar, color: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/30", text: "text-cyan-400", desc: "Schedule deep-dive" },
  { id: "audience", label: "Audience Intel", icon: Users, color: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", text: "text-orange-400", desc: "Detailed audience report" },
  { id: "scorecard", label: "Scorecard", icon: Trophy, color: "from-primary/20 to-primary/5", border: "border-primary/30", text: "text-primary", desc: "Who's winning?" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Pill({ text, map = HOOK_COLORS }: { text: string; map?: Record<string, string> }) {
  const cls = map[text?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls} capitalize`}>{text}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex-shrink-0" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-card-border rounded-xl px-3 py-2 shadow-xl">
      {label && <p className="text-[10px] text-muted-foreground mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs font-bold" style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
};

// ─── Section: Overview ────────────────────────────────────────────────────────

function OverviewSection({ report, analysis }: { report: any; analysis: any }) {
  const cm = report.clientMetrics || {};
  const comp = report.competitorMetrics || {};
  const ov = report.overview || {};
  const assessment = ov?.assessment ?? "competitive";
  const assessStyle = assessment === "winning"
    ? "text-green-400 bg-green-500/10 border-green-500/30"
    : assessment === "losing"
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";

  const barData = [
    { metric: "Avg Views", you: cm.avgViews ?? 0, them: comp.avgViews ?? 0 },
    { metric: "Avg Likes", you: cm.avgLikes ?? 0, them: comp.avgLikes ?? 0 },
    { metric: "Avg Comments", you: cm.avgComments ?? 0, them: comp.avgComments ?? 0 },
    { metric: "Posts/Wk", you: cm.postsPerWeek ?? 0, them: comp.postsPerWeek ?? 0 },
  ];

  const engData = [
    { name: "You", value: cm.avgEngagementRate ?? 0 },
    { name: "Competitor", value: comp.avgEngagementRate ?? 0 },
  ];

  const userTypes = Object.entries(cm.contentTypes || {}).map(([name, value]: any) => ({ name, value }));
  const compTypes = Object.entries(comp.contentTypes || {}).map(([name, value]: any) => ({ name, value }));

  return (
    <div className="space-y-6">
      <SectionHeader icon={BarChart2} title="Profile Overview" desc="Full head-to-head comparison" color="from-blue-500/20 to-blue-500/5" />

      {/* Assessment banner */}
      <div className={`flex items-center gap-4 p-5 rounded-2xl border ${assessStyle}`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-bold text-base capitalize">{assessment === "losing" ? "Needs Work" : assessment}</p>
            {(ov.outperformingIn || []).map((area: string) => (
              <Badge key={area} variant="outline" className="text-[10px] border-current/30">{area}</Badge>
            ))}
          </div>
          <p className="text-sm opacity-80 leading-relaxed">{ov.summary}</p>
        </div>
      </div>

      {/* Bar chart comparison */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Metrics Comparison</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} barGap={4}>
            <XAxis dataKey="metric" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="you" name={`You (${analysis.clientHandle})`} fill={GOLD} radius={[4, 4, 0, 0]} />
            <Bar dataKey="them" name={`Competitor (${analysis.competitorHandle})`} fill="#e879a0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Side-by-side stat grids */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">You — {analysis.clientHandle}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total Posts", val: cm.totalPosts },
              { label: "Avg Views", val: (cm.avgViews ?? 0).toLocaleString(), accent: "text-blue-400" },
              { label: "Avg Likes", val: (cm.avgLikes ?? 0).toLocaleString(), accent: "text-pink-400" },
              { label: "Avg Comments", val: (cm.avgComments ?? 0).toLocaleString() },
              { label: "Engagement %", val: `${cm.avgEngagementRate ?? 0}%`, accent: "text-green-400" },
              { label: "Posts/Week", val: cm.postsPerWeek },
            ].map(({ label, val, accent }) => (
              <div key={label} className="bg-muted/20 border border-border rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${accent ?? "text-foreground"}`}>{val ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Competitor — {analysis.competitorHandle}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total Posts", val: comp.totalPosts },
              { label: "Avg Views", val: (comp.avgViews ?? 0).toLocaleString(), accent: "text-blue-400" },
              { label: "Avg Likes", val: (comp.avgLikes ?? 0).toLocaleString(), accent: "text-pink-400" },
              { label: "Avg Comments", val: (comp.avgComments ?? 0).toLocaleString() },
              { label: "Engagement %", val: `${comp.avgEngagementRate ?? 0}%`, accent: "text-green-400" },
              { label: "Posts/Week", val: comp.postsPerWeek },
            ].map(({ label, val, accent }) => (
              <div key={label} className="bg-red-500/5 border border-red-500/15 rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${accent ?? "text-foreground"}`}>{val ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engagement pie + content types */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-foreground mb-3">Engagement Rate</p>
          <PieChart width={120} height={120}>
            <Pie data={engData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={4}>
              <Cell fill={GOLD} />
              <Cell fill="#e879a0" />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
          <div className="flex gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-primary inline-block" />You</span>
            <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />Them</span>
          </div>
        </div>

        {userTypes.length > 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-primary mb-3">Your Content Mix</p>
            {userTypes.slice(0, 5).map(({ name, value }, i) => (
              <div key={name} className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-muted-foreground w-16 truncate">{name}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / (cm.totalPosts || 1)) * 100)}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-4">{value}</span>
              </div>
            ))}
          </div>
        )}

        {compTypes.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-4">
            <p className="text-xs font-semibold text-red-400 mb-3">Competitor Mix</p>
            {compTypes.slice(0, 5).map(({ name, value }, i) => (
              <div key={name} className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-muted-foreground w-16 truncate">{name}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / (comp.totalPosts || 1)) * 100)}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-4">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Direct Reel vs Reel Comparison ──────────────────────────────────────────

const SCORE_LABELS = ["hook", "caption", "engagement", "retention", "hashtags"] as const;
const SCORE_COLORS: Record<string, string> = {
  hook: "text-purple-400", caption: "text-blue-400", engagement: "text-green-400",
  retention: "text-yellow-400", hashtags: "text-pink-400",
};

function ReelScoreBar({ label, myVal, compVal }: { label: string; myVal: number; compVal: number }) {
  const max = 10;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${SCORE_COLORS[label] ?? "text-muted-foreground"}`}>{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-primary">{myVal}/10</span>
          <span className="text-[10px] text-muted-foreground">vs</span>
          <span className="text-[10px] font-bold text-pink-400">{compVal}/10</span>
        </div>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 bg-muted/30 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(myVal / max) * 100}%` }} />
        </div>
        <div className="flex-1 bg-muted/30 rounded-full overflow-hidden">
          <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${(compVal / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function DirectReelComparison({ clientHandle, competitorHandle }: { clientHandle?: string; competitorHandle?: string }) {
  const [myReelUrl, setMyReelUrl] = useState("");
  const [competitorReelUrl, setCompetitorReelUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState(0);
  const { toast } = useToast();

  const STEPS = [
    "Scraping your reel…",
    "Scraping competitor reel…",
    "Comparing metrics…",
    "Running AI analysis…",
    "Building comparison report…",
  ];

  const handleCompare = async () => {
    if (!myReelUrl.trim() || !competitorReelUrl.trim()) return toast({ title: "Enter both reel URLs", variant: "destructive" });
    setLoading(true);
    setResult(null);
    setStep(0);
    const interval = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 5000);
    try {
      const data = await apiRequestWithTimeout("POST", "/api/competitor/compare-reels", {
        myReelUrl: normalizeInstagramUrl(myReelUrl),
        competitorReelUrl: normalizeInstagramUrl(competitorReelUrl),
      });
      setResult(data);
    } catch (err: any) {
      toast({ title: "Comparison failed", description: err.message, variant: "destructive" });
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const ai = result?.ai ?? {};
  const my = result?.myReel ?? {};
  const comp = result?.competitorReel ?? {};
  const winner = ai.winner; // "mine" | "competitor" | "tie"

  return (
    <div className="bg-card border border-primary/25 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-primary/5 border-b border-primary/20">
        <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
          <Sword className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Direct Reel vs Reel Comparison</p>
          <p className="text-[11px] text-muted-foreground">Paste any two Instagram reel URLs — AI scrapes real metrics and compares them head-to-head</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* URL Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Instagram className="w-3 h-3" /> My Reel URL
            </Label>
            <Input
              value={myReelUrl}
              onChange={e => setMyReelUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="h-9 text-sm bg-muted/20 border-primary/30"
              data-testid="input-my-reel-url"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
              <Crosshair className="w-3 h-3" /> Competitor Reel URL
            </Label>
            <Input
              value={competitorReelUrl}
              onChange={e => setCompetitorReelUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="h-9 text-sm bg-muted/20 border-pink-500/30"
              data-testid="input-competitor-reel-url"
            />
          </div>
        </div>

        <Button
          onClick={handleCompare}
          disabled={loading || !myReelUrl.trim() || !competitorReelUrl.trim()}
          className="gap-2 w-full sm:w-auto"
          data-testid="button-compare-reels"
        >
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{STEPS[step]}</> : <><Sword className="w-3.5 h-3.5" />Compare Reels Head-to-Head</>}
        </Button>

        {/* Loading state */}
        {loading && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex gap-2 items-center justify-center">
              {STEPS.map((s, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${i <= step ? "bg-primary" : "bg-muted/30"}`} />
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">{STEPS[step]}</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-5">
            {/* Winner Banner */}
            <div className={`rounded-2xl p-4 border flex items-center gap-4 ${winner === "mine" ? "bg-green-500/10 border-green-500/30" : winner === "competitor" ? "bg-red-500/10 border-red-500/30" : "bg-muted/20 border-border"}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${winner === "mine" ? "bg-green-500/20" : winner === "competitor" ? "bg-red-500/20" : "bg-muted/30"}`}>
                {winner === "mine" ? "🏆" : winner === "competitor" ? "😤" : "🤝"}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${winner === "mine" ? "text-green-400" : winner === "competitor" ? "text-red-400" : "text-foreground"}`}>
                  {winner === "mine" ? "Your reel wins!" : winner === "competitor" ? "Competitor's reel wins" : "It's a tie"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{ai.winnerReason}</p>
                {ai.verdictTags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ai.verdictTags.map((t: string, i: number) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-muted/40 border border-border text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Side-by-side Metrics */}
            <div className="grid grid-cols-2 divide-x divide-border border border-border rounded-2xl overflow-hidden">
              {/* My reel */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-xs font-bold text-primary">@{my.ownerUsername || clientHandle || "My Reel"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[["👁", my.views?.toLocaleString() ?? 0, "Views"], ["❤️", my.likes?.toLocaleString() ?? 0, "Likes"], ["💬", my.comments?.toLocaleString() ?? 0, "Comments"], ["📊", `${my.er}%`, "ER"]].map(([icon, val, label]) => (
                    <div key={String(label)} className="bg-muted/20 rounded-xl p-2 text-center">
                      <p className="text-[10px]">{icon}</p>
                      <p className="text-sm font-bold text-foreground">{val}</p>
                      <p className="text-[9px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/25 px-3 py-1 rounded-full">
                    Score: {ai.scores?.mine?.overall ?? "—"}/100
                  </span>
                </div>
              </div>
              {/* Competitor */}
              <div className="p-4 space-y-3 bg-red-500/3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-pink-500" />
                  <p className="text-xs font-bold text-pink-400">@{comp.ownerUsername || competitorHandle || "Their Reel"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[["👁", comp.views?.toLocaleString() ?? 0, "Views"], ["❤️", comp.likes?.toLocaleString() ?? 0, "Likes"], ["💬", comp.comments?.toLocaleString() ?? 0, "Comments"], ["📊", `${comp.er}%`, "ER"]].map(([icon, val, label]) => (
                    <div key={String(label)} className="bg-muted/20 rounded-xl p-2 text-center">
                      <p className="text-[10px]">{icon}</p>
                      <p className="text-sm font-bold text-foreground">{val}</p>
                      <p className="text-[9px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/25 px-3 py-1 rounded-full">
                    Score: {ai.scores?.competitor?.overall ?? "—"}/100
                  </span>
                </div>
              </div>
            </div>

            {/* Score Bars */}
            {ai.scores?.mine && ai.scores?.competitor && (
              <div className="bg-muted/10 border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-foreground">Score Breakdown</p>
                  <div className="flex items-center gap-3 text-[9px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Me</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500 inline-block" /> Competitor</span>
                  </div>
                </div>
                {SCORE_LABELS.map(lbl => (
                  <ReelScoreBar key={lbl} label={lbl} myVal={ai.scores.mine[lbl] ?? 0} compVal={ai.scores.competitor[lbl] ?? 0} />
                ))}
              </div>
            )}

            {/* Hook Analysis */}
            {ai.hookAnalysis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["mine", "competitor"] as const).map(side => {
                  const h = ai.hookAnalysis[side] ?? {};
                  const isMine = side === "mine";
                  return (
                    <div key={side} className={`rounded-2xl border p-4 space-y-2 ${isMine ? "border-primary/25 bg-primary/5" : "border-pink-500/25 bg-pink-500/5"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isMine ? "text-primary" : "text-pink-400"}`}>
                        {isMine ? "My Hook" : "Their Hook"}
                      </p>
                      {h.hook && <p className="text-xs italic text-foreground leading-relaxed">"{h.hook}"</p>}
                      {h.type && <Pill text={h.type} />}
                      {h.strength && <p className="text-[11px] text-muted-foreground leading-relaxed">{h.strength}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Caption Breakdown */}
            {ai.captionBreakdown && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["mine", "competitor"] as const).map(side => {
                  const c = ai.captionBreakdown[side] ?? {};
                  const isMine = side === "mine";
                  return (
                    <div key={side} className="bg-muted/10 border border-border rounded-2xl p-4 space-y-2">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isMine ? "text-primary" : "text-pink-400"}`}>
                        {isMine ? "My Caption" : "Their Caption"}
                      </p>
                      {c.structure && (
                        <div><p className="text-[9px] text-muted-foreground uppercase tracking-wider">Structure</p><p className="text-xs font-semibold text-foreground">{c.structure}</p></div>
                      )}
                      {c.cta && (
                        <div><p className="text-[9px] text-muted-foreground uppercase tracking-wider">CTA</p><p className="text-xs text-foreground">{c.cta}</p></div>
                      )}
                      {c.tone && (
                        <div className="flex gap-2">
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted/40 border border-border text-muted-foreground">{c.tone}</span>
                          {c.readability && <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted/40 border border-border text-muted-foreground">{c.readability}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* What competitor does better / you do better */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ai.whatCompetitorDoesBetter?.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5"><TrendingDown className="w-3 h-3" />Competitor Does Better</p>
                  {ai.whatCompetitorDoesBetter.map((pt: string, i: number) => (
                    <div key={i} className="flex gap-2 items-start">
                      <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{pt}</p>
                    </div>
                  ))}
                </div>
              )}
              {ai.whatYouDoBetter?.length > 0 && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-400 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" />You Do Better</p>
                  {ai.whatYouDoBetter.map((pt: string, i: number) => (
                    <div key={i} className="flex gap-2 items-start">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{pt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Steal These */}
            {ai.stealThese?.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5"><Sword className="w-3 h-3" />Steal These From Competitor</p>
                {ai.stealThese.map((pt: string, i: number) => (
                  <div key={i} className="flex gap-2 items-start">
                    <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground">{pt}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Improvement Plan */}
            {ai.improvementPlan && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5"><Lightbulb className="w-3 h-3" />Improvement Plan for Your Reel</p>
                <p className="text-xs text-foreground leading-relaxed">{ai.improvementPlan}</p>
              </div>
            )}

            {/* Rewritten Hook */}
            {ai.rewrittenHook && (
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5"><Wand2 className="w-3 h-3" />AI-Rewritten Hook for Your Reel</p>
                  <CopyButton text={ai.rewrittenHook} />
                </div>
                <p className="text-sm font-semibold text-foreground leading-relaxed italic">"{ai.rewrittenHook}"</p>
              </div>
            )}

            {/* Captions preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[{ label: "My Caption", caption: my.caption, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" }, { label: "Their Caption", caption: comp.caption, color: "text-pink-400", bg: "bg-pink-500/5", border: "border-pink-500/20" }].map(({ label, caption, color, bg, border }) => caption ? (
                <div key={label} className={`${bg} border ${border} rounded-2xl p-4 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</p>
                    <CopyButton text={caption} />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-6">{caption}</p>
                </div>
              ) : null)}
            </div>

            {/* Reset */}
            <button
              onClick={() => { setResult(null); setMyReelUrl(""); setCompetitorReelUrl(""); }}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Compare different reels
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Collapsible Reel Compare Panel (reusable across sections) ───────────────

function CollapsibleReelCompare({ clientHandle, competitorHandle }: { clientHandle?: string; competitorHandle?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-primary/20 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        data-testid="toggle-reel-compare"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sword className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs font-bold text-foreground">Compare Reel by Reel</span>
          <span className="text-[10px] text-muted-foreground">— paste any two reel URLs for a head-to-head breakdown</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-primary/15 p-4">
          <DirectReelComparison clientHandle={clientHandle} competitorHandle={competitorHandle} />
        </div>
      )}
    </div>
  );
}

// ─── Section: Reel by Reel ────────────────────────────────────────────────────

function ReelByReelSection({ report, analysis }: { report: any; analysis: any }) {
  const comparisons = report.reelComparison || [];
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set(comparisons.map((_: any, i: number) => i)));
  const [expanded, setExpanded] = useState<number | null>(0);

  const toggleSelect = (i: number) => {
    setSelectedIdxs(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const visible = comparisons.filter((_: any, i: number) => selectedIdxs.has(i));

  return (
    <div className="space-y-5">
      <SectionHeader icon={Play} title="Reel by Reel" desc="Compare specific reels head-to-head or browse AI-analysed comparisons below" color="from-pink-500/20 to-pink-500/5" />

      {/* Direct Reel Comparison Tool — always shown */}
      <DirectReelComparison clientHandle={analysis?.clientHandle} competitorHandle={analysis?.competitorHandle} />

      {/* Divider */}
      {comparisons.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">AI-Generated Reel Comparisons from Full Analysis</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Reel selector — only when full analysis exists */}
      {comparisons.length > 0 && <div className="bg-card border border-card-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-foreground mb-3">Choose which reels to compare:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedIdxs(new Set(comparisons.map((_: any, i: number) => i)))}
            className="px-3 py-1 rounded-full text-xs bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors font-medium"
          >Select All</button>
          <button
            onClick={() => setSelectedIdxs(new Set())}
            className="px-3 py-1 rounded-full text-xs bg-muted text-muted-foreground border border-border hover:bg-muted/70 transition-colors"
          >Clear</button>
          {comparisons.map((pair: any, i: number) => {
            const ur = pair.userReel;
            const cr = pair.competitorReel;
            const userWins = (ur?.views ?? 0) >= (cr?.views ?? 0);
            const isSelected = selectedIdxs.has(i);
            return (
              <button
                key={i}
                onClick={() => toggleSelect(i)}
                className={`px-3 py-1 rounded-full text-xs border font-medium transition-all ${isSelected ? (userWins ? "bg-green-500/20 text-green-300 border-green-500/40" : "bg-red-500/20 text-red-300 border-red-500/40") : "bg-muted/30 text-muted-foreground border-border opacity-50"}`}
              >
                Reel #{i + 1} {userWins ? "✓" : "✗"}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">{selectedIdxs.size} of {comparisons.length} reels selected</p>
      </div>}

      {/* Comparisons */}
      {visible.map((pair: any, idx: number) => {
        const realIdx = comparisons.indexOf(pair);
        const ur = pair.userReel || {};
        const cr = pair.competitorReel || {};
        const userWins = (ur?.views ?? 0) >= (cr?.views ?? 0);
        const isOpen = expanded === realIdx;

        return (
          <div key={realIdx} className={`border rounded-2xl overflow-hidden transition-all ${userWins ? "border-green-500/25" : "border-red-500/25"}`}>
            {/* Header */}
            <button
              className="w-full flex items-center gap-4 px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors"
              onClick={() => setExpanded(isOpen ? null : realIdx)}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${userWins ? "bg-green-500/15" : "bg-red-500/15"}`}>
                <span className="text-xs font-bold">{realIdx + 1}</span>
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">Comparison #{realIdx + 1}</span>
                  {userWins
                    ? <Badge className="bg-green-500/15 text-green-300 border-green-500/30 text-[10px] border">You Win 🏆</Badge>
                    : <Badge className="bg-red-500/15 text-red-300 border-red-500/30 text-[10px] border">Competitor Wins</Badge>
                  }
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Your views: {(ur.views ?? 0).toLocaleString()} vs Theirs: {(cr.views ?? 0).toLocaleString()}
                </p>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isOpen && (
              <>
                {/* Mini bar chart */}
                <div className="px-4 pt-3 pb-1 bg-muted/5">
                  <ResponsiveContainer width="100%" height={70}>
                    <BarChart data={[
                      { metric: "Views", you: ur.views ?? 0, them: cr.views ?? 0 },
                      { metric: "Likes", you: ur.likes ?? 0, them: cr.likes ?? 0 },
                      { metric: "Comments", you: ur.comments ?? 0, them: cr.comments ?? 0 },
                    ]} barGap={3}>
                      <XAxis dataKey="metric" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="you" name="You" fill={GOLD} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="them" name="Competitor" fill="#e879a0" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                  {/* User reel */}
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-bold text-primary">{analysis.clientHandle}</p>
                    <div className="flex gap-4">
                      <div className="text-center"><p className="text-sm font-bold text-blue-400">{(ur.views ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Views</p></div>
                      <div className="text-center"><p className="text-sm font-bold text-pink-400">{(ur.likes ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
                      <div className="text-center"><p className="text-sm font-bold">{(ur.comments ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Comments</p></div>
                    </div>
                    {ur.hook && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hook</p>
                        <p className="text-xs italic leading-relaxed">"{ur.hook}"</p>
                        <div className="flex gap-2 mt-1.5"><Pill text={ur.hookType} /><Pill text={ur.emotion ?? "—"} map={{}} /></div>
                      </div>
                    )}
                    {ur.structure && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Structure</p>
                        <p className="text-xs leading-relaxed">{ur.structure}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Retention:</span>
                      <span className={`text-[10px] font-bold ${RETENTION_COLORS[ur.retentionPotential] ?? "text-muted-foreground"}`}>{ur.retentionPotential}</span>
                    </div>
                  </div>

                  {/* Competitor reel */}
                  <div className="p-4 space-y-3 bg-red-500/3">
                    <p className="text-xs font-bold text-red-400">{analysis.competitorHandle}</p>
                    <div className="flex gap-4">
                      <div className="text-center"><p className="text-sm font-bold text-blue-400">{(cr.views ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Views</p></div>
                      <div className="text-center"><p className="text-sm font-bold text-pink-400">{(cr.likes ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
                      <div className="text-center"><p className="text-sm font-bold">{(cr.comments ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Comments</p></div>
                    </div>
                    {cr.hook && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hook</p>
                        <p className="text-xs italic leading-relaxed">"{cr.hook}"</p>
                        <div className="flex gap-2 mt-1.5"><Pill text={cr.hookType} /><Pill text={cr.emotion ?? "—"} map={{}} /></div>
                      </div>
                    )}
                    {cr.structure && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Structure</p>
                        <p className="text-xs leading-relaxed">{cr.structure}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Retention:</span>
                      <span className={`text-[10px] font-bold ${RETENTION_COLORS[cr.retentionPotential] ?? "text-muted-foreground"}`}>{cr.retentionPotential}</span>
                    </div>
                  </div>
                </div>

                {/* Verdict */}
                <div className="px-4 py-3 bg-primary/5 border-t border-border">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">AI Verdict</p>
                  <p className="text-xs text-foreground leading-relaxed">{pair.verdict}</p>
                </div>
              </>
            )}
          </div>
        );
      })}

      {comparisons.length > 0 && visible.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">Select at least one reel above to view it</div>
      )}
    </div>
  );
}

// ─── Section: Performance ─────────────────────────────────────────────────────

function PerformanceSection({ report, analysis }: { report: any; analysis: any }) {
  const cp = report.contentPerformance || {};
  const cm = report.clientMetrics || {};
  const comp = report.competitorMetrics || {};

  const barData = [
    { metric: "Views", you: cm.avgViews ?? 0, them: comp.avgViews ?? 0 },
    { metric: "Likes", you: cm.avgLikes ?? 0, them: comp.avgLikes ?? 0 },
    { metric: "Comments", you: cm.avgComments ?? 0, them: comp.avgComments ?? 0 },
    { metric: "Saves", you: cm.avgSaves ?? 0, them: comp.avgSaves ?? 0 },
  ];

  const freqData = [
    { name: `You (${cm.postsPerWeek ?? 0}/wk)`, value: cm.postsPerWeek ?? 0 },
    { name: `Them (${comp.postsPerWeek ?? 0}/wk)`, value: comp.postsPerWeek ?? 0 },
  ];

  const engData = [
    { name: analysis.clientHandle, value: cm.avgEngagementRate ?? 0 },
    { name: analysis.competitorHandle, value: comp.avgEngagementRate ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader icon={TrendingUp} title="Content Performance" desc="Visual charts — who's winning each metric" color="from-green-500/20 to-green-500/5" />
      <CollapsibleReelCompare clientHandle={analysis.clientHandle} competitorHandle={analysis.competitorHandle} />

      {/* Win/Loss banners */}
      <div className="grid grid-cols-2 gap-4">
        {cp.clientWinsIn?.length > 0 && (
          <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
            <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Trophy className="w-3.5 h-3.5" />You Win In</p>
            <div className="flex flex-wrap gap-2">{cp.clientWinsIn.map((w: string) => <Badge key={w} className="bg-green-500/20 text-green-300 border border-green-500/30 text-xs">{w}</Badge>)}</div>
          </div>
        )}
        {cp.competitorWinsIn?.length > 0 && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" />They Win In</p>
            <div className="flex flex-wrap gap-2">{cp.competitorWinsIn.map((w: string) => <Badge key={w} className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs">{w}</Badge>)}</div>
          </div>
        )}
      </div>

      {/* Main bar chart */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Average Performance Comparison</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} barGap={6}>
            <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="you" name={`You (${analysis.clientHandle})`} fill={GOLD} radius={[5, 5, 0, 0]} />
            <Bar dataKey="them" name={`Competitor (${analysis.competitorHandle})`} fill="#e879a0" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement + Frequency pie charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-3">Engagement Rate %</p>
          <div className="flex items-center justify-center">
            <PieChart width={180} height={160}>
              <Pie data={engData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} label={({ name, value }) => `${value}%`} labelLine={false}>
                <Cell fill={GOLD} />
                <Cell fill="#e879a0" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-full bg-primary inline-block" />You: {cm.avgEngagementRate ?? 0}%</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-full bg-pink-400 inline-block" />Them: {comp.avgEngagementRate ?? 0}%</span>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-3">Posting Frequency</p>
          <div className="flex items-center justify-center">
            <PieChart width={180} height={160}>
              <Pie data={freqData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5}>
                <Cell fill={GOLD} />
                <Cell fill="#e879a0" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-full bg-primary inline-block" />You: {cm.postsPerWeek ?? 0}/wk</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-full bg-pink-400 inline-block" />Them: {comp.postsPerWeek ?? 0}/wk</span>
          </div>
        </div>
      </div>

      {/* AI insight */}
      {cp.insights && (
        <div className="p-5 rounded-2xl bg-primary/8 border border-primary/20">
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">AI Performance Insight</p>
          <p className="text-sm text-foreground leading-relaxed">{cp.insights}</p>
        </div>
      )}
    </div>
  );
}

// ─── Section: AI Patterns ─────────────────────────────────────────────────────

function AIPatternsSection({ report, analysis }: { report: any; analysis: any }) {
  const patterns = report.contentPatterns || [];
  const viralDNA = report.viralDNA || [];
  const cm = report.clientMetrics || {};
  const comp = report.competitorMetrics || {};

  const radarData = [
    { metric: "Views", you: Math.min(10, Math.round((cm.avgViews ?? 0) / Math.max(1, (comp.avgViews ?? 1)) * 5)), them: 5 },
    { metric: "Engagement", you: Math.min(10, (cm.avgEngagementRate ?? 0)), them: Math.min(10, (comp.avgEngagementRate ?? 0)) },
    { metric: "Frequency", you: Math.min(10, (cm.postsPerWeek ?? 0) * 2), them: Math.min(10, (comp.postsPerWeek ?? 0) * 2) },
    { metric: "Comments", you: Math.min(10, Math.round((cm.avgComments ?? 0) / Math.max(1, (comp.avgComments ?? 1)) * 5)), them: 5 },
    { metric: "Likes", you: Math.min(10, Math.round((cm.avgLikes ?? 0) / Math.max(1, (comp.avgLikes ?? 1)) * 5)), them: 5 },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader icon={Sparkles} title="AI Content Patterns" desc="Decoded viral formulas — side by side" color="from-yellow-500/20 to-yellow-500/5" />
      <CollapsibleReelCompare clientHandle={analysis.clientHandle} competitorHandle={analysis.competitorHandle} />

      {/* Radar chart */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Content Profile Comparison (Score /10)</p>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#888" }} />
              <Radar name={`You (${analysis.clientHandle})`} dataKey="you" stroke={GOLD} fill={GOLD} fillOpacity={0.25} />
              <Radar name={`Them (${analysis.competitorHandle})`} dataKey="them" stroke="#e879a0" fill="#e879a0" fillOpacity={0.15} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Patterns — side by side layout */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-400" />Competitor's Winning Patterns</p>
        <div className="grid grid-cols-1 gap-3">
          {patterns.map((p: any, i: number) => (
            <div key={i} className="bg-card border border-card-border rounded-2xl p-4 grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-foreground">{p.pattern}</p>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 flex-shrink-0">{p.frequency}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
              <div className="bg-primary/8 border border-primary/20 rounded-xl px-3 py-3 flex flex-col justify-center">
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Steal This</p>
                <p className="text-xs text-foreground leading-snug">{p.howToReplicate}</p>
              </div>
            </div>
          ))}
          {!patterns.length && <EmptyState message="No pattern data. Run a new analysis." />}
        </div>
      </div>

      {/* Viral DNA */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" />Viral Content DNA — Top Posts Breakdown</p>
        <div className="space-y-3">
          {viralDNA.map((v: any, i: number) => (
            <div key={i} className="bg-card border border-card-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-orange-400">#{i + 1}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-bold text-foreground">{(v.views ?? 0).toLocaleString()} views</span>
                  <Pill text={v.emotion ?? "—"} map={{}} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hook</p>
                  <p className="text-xs italic leading-relaxed">"{v.hook}"</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Structure</p>
                  <p className="text-xs leading-relaxed">{v.structure}</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">CTA</p>
                  <p className="text-xs">{v.cta}</p>
                </div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-1">Winning Formula</p>
                <p className="text-xs text-foreground">{v.winningFormula}</p>
              </div>
            </div>
          ))}
          {!viralDNA.length && <EmptyState message="No viral DNA data. Run a new analysis." />}
        </div>
      </div>
    </div>
  );
}

// ─── Section: Gap Analysis ────────────────────────────────────────────────────

function GapAnalysisSection({ report }: { report: any }) {
  const ga = report.gapAnalysis || {};
  const gaps = ga.gaps || [];
  const high = gaps.filter((g: any) => g.impact === "High");
  const medium = gaps.filter((g: any) => g.impact === "Medium");
  const low = gaps.filter((g: any) => g.impact === "Low");

  const impactData = [
    { name: "High Impact", value: high.length, fill: "#ef4444" },
    { name: "Medium", value: medium.length, fill: "#eab308" },
    { name: "Low", value: low.length, fill: "#22c55e" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <SectionHeader icon={Search} title="Gap Analysis" desc="Every area where the competitor beats you — and how to fix it" color="from-red-500/20 to-red-500/5" />
      <CollapsibleReelCompare />

      {/* Summary + pie */}
      <div className="grid grid-cols-3 gap-4">
        {ga.summary && (
          <div className="col-span-2 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col justify-center">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Bottom Line</p>
            <p className="text-sm text-foreground leading-relaxed">{ga.summary}</p>
          </div>
        )}
        <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-foreground mb-3">Gaps by Impact</p>
          <PieChart width={100} height={100}>
            <Pie data={impactData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={45}>
              {impactData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
          <div className="flex flex-col gap-1 mt-2">
            {impactData.map(d => (
              <span key={d.name} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.fill }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* High impact gaps */}
      {high.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <p className="text-sm font-bold text-red-400">High Impact Gaps — Fix These First</p>
          </div>
          <div className="space-y-3">
            {high.map((g: any, i: number) => <GapCard key={i} g={g} />)}
          </div>
        </div>
      )}

      {/* Medium */}
      {medium.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <p className="text-sm font-bold text-yellow-400">Medium Impact Gaps</p>
          </div>
          <div className="space-y-3">
            {medium.map((g: any, i: number) => <GapCard key={i} g={g} />)}
          </div>
        </div>
      )}

      {/* Low */}
      {low.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-sm font-bold text-green-400">Low Impact Gaps</p>
          </div>
          <div className="space-y-3">
            {low.map((g: any, i: number) => <GapCard key={i} g={g} />)}
          </div>
        </div>
      )}

      {!gaps.length && <EmptyState message="No gap data. Run a new analysis." />}
    </div>
  );
}

function GapCard({ g }: { g: any }) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-bold text-foreground">{g.metric}</p>
        <Pill text={g.impact} map={IMPACT_COLORS} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="relative">
          <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-primary/40 rounded-full" />
          <div className="pl-4 bg-primary/5 border border-primary/15 rounded-xl p-3">
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">You</p>
            <p className="text-xs text-foreground">{g.you}</p>
          </div>
        </div>
        <div className="relative">
          <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-red-400/40 rounded-full" />
          <div className="pl-4 bg-red-500/8 border border-red-500/15 rounded-xl p-3">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">Competitor</p>
            <p className="text-xs text-foreground">{g.competitor}</p>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-2 bg-green-500/8 border border-green-500/15 rounded-xl p-3">
        <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-0.5">Fix</p>
          <p className="text-xs text-foreground">{g.fix}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Hook Library ────────────────────────────────────────────────────

function HookLibrarySection({ report, analysis }: { report: any; analysis: any }) {
  const hooks = report.hookLibrary || [];
  const grouped: Record<string, any[]> = {};
  hooks.forEach((h: any) => {
    const key = h.type || "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  });

  const cm = report.clientMetrics || {};
  const comp = report.competitorMetrics || {};

  const typeData = Object.entries(grouped).map(([type, hs]) => ({ type, count: hs.length }));

  return (
    <div className="space-y-6">
      <SectionHeader icon={Zap} title="Hook Library" desc="Me vs Competitor — steal their best openers" color="from-purple-500/20 to-purple-500/5" />
      <CollapsibleReelCompare clientHandle={analysis.clientHandle} competitorHandle={analysis.competitorHandle} />

      {/* Hook type distribution */}
      {typeData.length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Hook Type Distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={typeData} layout="vertical" barSize={16}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Hooks" fill={GOLD} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Side-by-side: me vs competitor */}
      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Me column */}
        <div>
          <div className="flex items-center gap-2 mb-3 p-3 bg-primary/10 rounded-xl border border-primary/20">
            <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary">YOU</span>
            </div>
            <div>
              <p className="text-xs font-bold text-primary">{analysis.clientHandle}</p>
              <p className="text-[10px] text-muted-foreground">Your hook performance</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="p-3 bg-card border border-card-border rounded-xl">
              <p className="text-[10px] text-muted-foreground mb-1">Avg Engagement Rate</p>
              <p className="text-lg font-bold text-primary">{cm.avgEngagementRate ?? 0}%</p>
            </div>
            <div className="p-3 bg-card border border-card-border rounded-xl">
              <p className="text-[10px] text-muted-foreground mb-1">Posts Analyzed</p>
              <p className="text-lg font-bold text-foreground">{cm.totalPosts ?? 0}</p>
            </div>
            <p className="text-xs font-semibold text-foreground mt-3 mb-2">What to improve in your hooks:</p>
            <div className="p-3 bg-primary/8 border border-primary/20 rounded-xl">
              <p className="text-xs text-foreground leading-relaxed">
                Based on competitor analysis, focus on using more <span className="text-primary font-medium">{Object.keys(grouped)[0] ?? "curiosity"}</span> hooks which drive the highest engagement in your niche.
              </p>
            </div>
          </div>
        </div>

        {/* Competitor column */}
        <div>
          <div className="flex items-center gap-2 mb-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-red-400">THEM</span>
            </div>
            <div>
              <p className="text-xs font-bold text-red-400">{analysis.competitorHandle}</p>
              <p className="text-[10px] text-muted-foreground">Their proven hooks</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
              <p className="text-[10px] text-muted-foreground mb-1">Avg Engagement Rate</p>
              <p className="text-lg font-bold text-red-400">{comp.avgEngagementRate ?? 0}%</p>
            </div>
            <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
              <p className="text-[10px] text-muted-foreground mb-1">Posts Analyzed</p>
              <p className="text-lg font-bold text-foreground">{comp.totalPosts ?? 0}</p>
            </div>
            <p className="text-xs font-semibold text-foreground mt-3 mb-2">Their hook library — copy these:</p>
          </div>
        </div>
      </div>

      {/* Hook groups */}
      {Object.entries(grouped).map(([type, hs]) => (
        <div key={type} className="bg-card border border-card-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Pill text={type} />
            <span className="text-xs text-muted-foreground">{hs.length} hooks extracted from competitor's top content</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {hs.map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl group hover:bg-muted/30 transition-colors">
                <div className="w-5 h-5 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">"{h.hook}"</p>
                  {h.whyItWorks && <p className="text-[10px] text-muted-foreground mt-1.5 italic">{h.whyItWorks}</p>}
                </div>
                <CopyButton text={h.hook} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {!hooks.length && <EmptyState message="No hooks extracted. Run a new analysis." />}
    </div>
  );
}

// ─── Section: Posting Strategy ────────────────────────────────────────────────

function PostingStrategySection({ report, analysis }: { report: any; analysis: any }) {
  const ps = report.postingStrategy || {};
  const cm = report.clientMetrics || {};
  const comp = report.competitorMetrics || {};

  if (!ps || Object.keys(ps).length === 0) return <EmptyState message="No posting strategy data. Run a new analysis." />;

  const freqData = [
    { name: analysis.clientHandle, posts: cm.postsPerWeek ?? 0 },
    { name: analysis.competitorHandle, posts: comp.postsPerWeek ?? 0 },
  ];

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6">
      <SectionHeader icon={Calendar} title="Posting Strategy" desc="When, how often, and what format — deep dive" color="from-cyan-500/20 to-cyan-500/5" />
      <CollapsibleReelCompare clientHandle={analysis.clientHandle} competitorHandle={analysis.competitorHandle} />

      {/* Posting frequency comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Posts per Week</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={freqData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="posts" name="Posts/Week" radius={[5, 5, 0, 0]}>
                <Cell fill={GOLD} />
                <Cell fill="#e879a0" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day heatmap */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Best Days to Post</p>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => {
              const isActive = (ps.bestDays || []).some((d: string) => d.toLowerCase().includes(day.toLowerCase()));
              return (
                <div key={day} className={`rounded-lg p-2 text-center transition-all ${isActive ? "bg-primary/25 border border-primary/40" : "bg-muted/20 border border-border"}`}>
                  <p className={`text-[9px] font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{day}</p>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(ps.bestDays || []).map((d: string) => (
              <Badge key={d} className="bg-primary/15 text-primary border-primary/30 border text-xs">{d}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Best times */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-400" />Best Times to Post</p>
        <div className="flex flex-wrap gap-3">
          {(ps.bestTimes || []).map((t: string) => (
            <div key={t} className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-sm font-bold text-foreground">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Side-by-side: you vs competitor */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary/8 border border-primary/20 rounded-2xl p-5">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Your Current Strategy</p>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Posting Frequency</p>
              <p className="text-sm font-bold text-foreground">{ps.clientFrequency || `${cm.postsPerWeek ?? 0} posts/week`}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Format Mix</p>
              <p className="text-xs text-foreground">{ps.formatMix}</p>
            </div>
          </div>
        </div>
        <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-5">
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Competitor's Strategy</p>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Posting Frequency</p>
              <p className="text-sm font-bold text-red-300">{ps.competitorFrequency || `${comp.postsPerWeek ?? 0} posts/week`}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Why It Works</p>
              <p className="text-xs text-foreground">Consistent cadence builds audience trust and rewards algorithm distribution</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {ps.recommendation && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/8 to-transparent border border-primary/25">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-primary uppercase tracking-wider">Copy This Exact Schedule</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{ps.recommendation}</p>
        </div>
      )}

      {/* Additional insights */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Posting Gap", val: `You post ${Math.abs((cm.postsPerWeek ?? 0) - (comp.postsPerWeek ?? 0)).toFixed(1)}x ${(cm.postsPerWeek ?? 0) >= (comp.postsPerWeek ?? 0) ? "more" : "less"}`, icon: BarChart2, color: "text-blue-400" },
          { label: "Peak Day Overlap", val: (ps.bestDays || []).slice(0, 2).join(", ") || "See above", icon: Calendar, color: "text-cyan-400" },
          { label: "Format Focus", val: (ps.formatMix || "Reels + Carousels").split(",")[0], icon: Layers, color: "text-purple-400" },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-card-border rounded-xl p-4 text-center">
            <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
            <p className="text-xs font-bold text-foreground">{val}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Audience Insights ───────────────────────────────────────────────

function AudienceSection({ report, analysis }: { report: any; analysis: any }) {
  const ai = report.audienceInsights || {};
  const cm = report.clientMetrics || {};
  const comp = report.competitorMetrics || {};

  if (!ai || Object.keys(ai).length === 0) return <EmptyState message="No audience data. Run a new analysis." />;

  const engCompare = [
    { name: "You", value: cm.avgEngagementRate ?? 0, fill: GOLD },
    { name: "Competitor", value: comp.avgEngagementRate ?? 0, fill: "#e879a0" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader icon={Users} title="Audience Intelligence" desc="Who your audience is, what they want, and how to win them" color="from-orange-500/20 to-orange-500/5" />
      <CollapsibleReelCompare clientHandle={analysis.clientHandle} competitorHandle={analysis.competitorHandle} />

      {/* Key insight banner */}
      {ai.insight && (
        <div className="p-5 rounded-2xl bg-primary/10 border border-primary/25">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Key Audience Insight</p>
          <p className="text-sm text-foreground leading-relaxed">{ai.insight}</p>
        </div>
      )}

      {/* Engagement comparison */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-card border border-card-border rounded-2xl p-4 flex flex-col items-center">
          <p className="text-xs font-semibold text-foreground mb-3">Audience Engagement</p>
          <PieChart width={110} height={110}>
            <Pie data={engCompare} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={5}>
              {engCompare.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
          <div className="flex flex-col gap-1.5 mt-2 text-center">
            <span className="text-[10px]"><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />You: {cm.avgEngagementRate ?? 0}%</span>
            <span className="text-[10px]"><span className="inline-block w-2 h-2 rounded-full bg-pink-400 mr-1" />Them: {comp.avgEngagementRate ?? 0}%</span>
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-1 gap-3">
          {/* Audience breakdown */}
          {(ai.demographics || ai.targetAudience) && (
            <div className="bg-card border border-card-border rounded-2xl p-4">
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-2">Target Audience Profile</p>
              <p className="text-sm text-foreground leading-relaxed">{ai.demographics || ai.targetAudience}</p>
            </div>
          )}
          {(ai.psychographics || ai.buyingMotivations) && (
            <div className="bg-card border border-card-border rounded-2xl p-4">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Buying Motivations</p>
              <p className="text-sm text-foreground leading-relaxed">{ai.psychographics || ai.buyingMotivations}</p>
            </div>
          )}
        </div>
      </div>

      {/* Loves, Pain Points, Desires — 3 columns */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-500/8 border border-green-500/20 rounded-2xl p-4">
          <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" />Audience Loves</p>
          <ul className="space-y-2">
            {(ai.audienceLoves || []).map((l: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5 text-xs flex-shrink-0">✓</span>
                <p className="text-xs text-foreground">{l}</p>
              </li>
            ))}
            {!(ai.audienceLoves || []).length && <p className="text-xs text-muted-foreground">—</p>}
          </ul>
        </div>

        <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Pain Points</p>
          <ul className="space-y-2">
            {(ai.painPoints || []).map((p: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5 text-xs flex-shrink-0">!</span>
                <p className="text-xs text-foreground">{p}</p>
              </li>
            ))}
            {!(ai.painPoints || []).length && <p className="text-xs text-muted-foreground">—</p>}
          </ul>
        </div>

        <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-2xl p-4">
          <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" />Desires</p>
          <ul className="space-y-2">
            {(ai.desires || []).map((d: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5 text-xs flex-shrink-0">★</span>
                <p className="text-xs text-foreground">{d}</p>
              </li>
            ))}
            {!(ai.desires || []).length && <p className="text-xs text-muted-foreground">—</p>}
          </ul>
        </div>
      </div>

      {/* How to win */}
      {ai.howToWin && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/15 to-orange-500/5 border border-orange-500/20">
          <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Crosshair className="w-3.5 h-3.5" />How to Win This Audience</p>
          <p className="text-sm text-foreground leading-relaxed">{ai.howToWin}</p>
        </div>
      )}

      {/* Content preferences */}
      {(ai.contentPreferences || ai.contentFormats) && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" />Content Preferences</p>
          <p className="text-sm text-foreground leading-relaxed">{ai.contentPreferences || ai.contentFormats}</p>
        </div>
      )}

      {/* Side by side: who they follow */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Your Audience Behaviour</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Avg Likes per Post</span>
              <span className="text-xs font-bold text-foreground">{(cm.avgLikes ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Avg Comments per Post</span>
              <span className="text-xs font-bold text-foreground">{(cm.avgComments ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Engagement Rate</span>
              <span className="text-xs font-bold text-primary">{cm.avgEngagementRate ?? 0}%</span>
            </div>
          </div>
        </div>
        <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Competitor's Audience Behaviour</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Avg Likes per Post</span>
              <span className="text-xs font-bold text-foreground">{(comp.avgLikes ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Avg Comments per Post</span>
              <span className="text-xs font-bold text-foreground">{(comp.avgComments ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Engagement Rate</span>
              <span className="text-xs font-bold text-red-400">{comp.avgEngagementRate ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Scorecard ───────────────────────────────────────────────────────

function ScorecardSection({ report, analysis }: { report: any; analysis: any }) {
  const sc = report.scorecard || {};
  if (!sc || Object.keys(sc).length === 0) return <EmptyState message="No scorecard data. Run a new analysis." />;

  const metrics = sc.metrics || [];
  const youWin = sc.youWin ?? 0;
  const compWin = sc.competitorWins ?? 0;
  const total = metrics.length;
  const youPct = total > 0 ? Math.round((youWin / total) * 100) : 0;
  const compPct = total > 0 ? Math.round((compWin / total) * 100) : 0;

  const pieData = [
    { name: analysis.clientHandle, value: youWin, fill: GOLD },
    { name: analysis.competitorHandle, value: compWin, fill: "#e879a0" },
    { name: "Ties", value: total - youWin - compWin, fill: "#555" },
  ].filter(d => d.value > 0);

  const barData = metrics.map((m: any) => ({
    metric: m.metric?.split(" ").slice(0, 2).join(" "),
    you: m.yourScore ?? 0,
    them: m.competitorScore ?? 0,
  }));

  return (
    <div className="space-y-6">
      <SectionHeader icon={Trophy} title="Scorecard" desc="Head-to-head score across every metric" color="from-primary/20 to-primary/5" />

      {/* Hero score */}
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className={`text-center p-6 rounded-2xl border-2 ${youWin > compWin ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
          <p className={`text-5xl font-black ${youWin > compWin ? "text-primary" : "text-foreground"}`}>{youWin}</p>
          <p className="text-xs text-muted-foreground mt-1">{analysis.clientHandle}</p>
          {youWin > compWin && <p className="text-xs font-bold text-primary mt-2">🏆 Winning</p>}
        </div>

        <div className="flex flex-col items-center gap-3">
          <PieChart width={120} height={120}>
            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={52} paddingAngle={3}>
              {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
          <p className="text-xs text-muted-foreground text-center">{total} metrics scored</p>
        </div>

        <div className={`text-center p-6 rounded-2xl border-2 ${compWin > youWin ? "border-red-500 bg-red-500/10" : "border-border bg-card"}`}>
          <p className={`text-5xl font-black ${compWin > youWin ? "text-red-400" : "text-foreground"}`}>{compWin}</p>
          <p className="text-xs text-muted-foreground mt-1">{analysis.competitorHandle}</p>
          {compWin > youWin && <p className="text-xs font-bold text-red-400 mt-2">⚠ Ahead</p>}
        </div>
      </div>

      {sc.summary && <p className="text-sm text-muted-foreground text-center">{sc.summary}</p>}

      {/* Score bar chart */}
      {barData.length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Score Breakdown (/10 per metric)</p>
          <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 30)}>
            <BarChart data={barData} layout="vertical" barGap={4}>
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="metric" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="you" name={`You (${analysis.clientHandle})`} fill={GOLD} radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="them" name={`Competitor (${analysis.competitorHandle})`} fill="#e879a0" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Win progress bars */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary">{analysis.clientHandle}</span>
            <span className="text-sm font-bold text-primary">{youPct}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${youPct}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{youWin} wins out of {total}</p>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-red-400">{analysis.competitorHandle}</span>
            <span className="text-sm font-bold text-red-400">{compPct}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${compPct}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{compWin} wins out of {total}</p>
        </div>
      </div>

      {/* Metric detail rows */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="flex items-center px-4 py-2 bg-muted/30 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <span className="flex-1">Metric</span>
          <span className="w-16 text-center text-primary">You</span>
          <span className="w-16 text-center text-red-400">Competitor</span>
          <span className="w-14 text-center">Winner</span>
        </div>
        {metrics.map((m: any, i: number) => (
          <div key={i} className={`flex items-center px-4 py-3 border-b border-border last:border-0 ${m.winner === "you" ? "bg-green-500/3" : m.winner === "competitor" ? "bg-red-500/3" : ""}`}>
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{m.metric}</p>
              {m.note && <p className="text-[10px] text-muted-foreground mt-0.5">{m.note}</p>}
            </div>
            <div className="w-16 text-center">
              <span className={`text-sm font-bold ${m.winner === "you" ? "text-primary" : m.winner === "tie" ? "text-yellow-400" : "text-foreground"}`}>{m.yourScore}/10</span>
            </div>
            <div className="w-16 text-center">
              <span className={`text-sm font-bold ${m.winner === "competitor" ? "text-red-400" : m.winner === "tie" ? "text-yellow-400" : "text-foreground"}`}>{m.competitorScore}/10</span>
            </div>
            <div className="w-14 flex justify-center">
              {m.winner === "you" ? <Trophy className="w-4 h-4 text-primary" /> : m.winner === "tie" ? <span className="text-yellow-400 text-[10px] font-bold">TIE</span> : <Trophy className="w-4 h-4 text-red-400" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Steal Strategy ───────────────────────────────────────────────────────────

function StealStrategySection({ analysis, onGenerate, generating }: { analysis: any; onGenerate: () => void; generating: boolean }) {
  const report = analysis.report as any;
  const ss = report?.stealStrategy;

  if (!ss) {
    return (
      <div className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/8 to-black/40 p-10 text-center">
        {/* Glowing orb bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(212,180,97,0.2)]">
            <Sword className="w-12 h-12 text-primary" />
          </div>
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Most Powerful Feature</span>
          </div>
          <h3 className="text-3xl font-black text-foreground mb-3">Steal Their Strategy</h3>
          <p className="text-base text-muted-foreground max-w-md mx-auto mb-2 leading-relaxed">
            Get a <span className="text-primary font-bold">complete 30-day content plan</span> built from{" "}
            <span className="text-foreground font-semibold">{analysis.competitorHandle}'s</span> exact playbook.
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8">
            Hooks · Schedule · Reel ideas · Hook system · Growth playbook · CTA strategy — all in one click.
          </p>
          <Button
            size="lg"
            onClick={onGenerate}
            disabled={generating}
            className="gap-3 px-10 py-6 text-base font-bold rounded-2xl bg-primary text-black hover:bg-primary/90 shadow-[0_0_30px_rgba(212,180,97,0.4)] hover:shadow-[0_0_50px_rgba(212,180,97,0.6)] transition-all duration-300"
            data-testid="button-steal-strategy"
          >
            {generating
              ? <><Loader2 className="w-5 h-5 animate-spin" />Generating Your 30-Day Plan…</>
              : <><Sword className="w-5 h-5" />Generate 30-Day Plan</>
            }
          </Button>
          {generating && (
            <div className="mt-6">
              <p className="text-xs text-muted-foreground animate-pulse">Building your personalised plan — this takes ~30 seconds</p>
              <div className="h-1 bg-muted rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(212,180,97,0.2)]">
          <Sword className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">30-Day Steal Strategy</h3>
          <p className="text-xs text-muted-foreground">Built from {analysis.competitorHandle}'s exact playbook</p>
        </div>
      </div>

      {/* CTA Strategy */}
      {ss.ctaStrategy && (
        <div className="p-5 rounded-2xl bg-primary/10 border border-primary/25">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-4">CTA & Conversion Strategy</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {(ss.ctaStrategy.topCTAs || []).map((cta: string, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-3 flex items-center justify-between gap-2">
                <p className="text-xs text-foreground flex-1">"{cta}"</p>
                <CopyButton text={cta} />
              </div>
            ))}
          </div>
          {ss.ctaStrategy.conversionFlow && (
            <div className="bg-card border border-card-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Conversion Flow</p>
              <p className="text-xs text-foreground">{ss.ctaStrategy.conversionFlow}</p>
            </div>
          )}
        </div>
      )}

      {/* Posting Schedule */}
      {ss.postingSchedule && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Your New Posting Schedule</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: "Frequency", val: ss.postingSchedule.frequency },
              { label: "Days", val: (ss.postingSchedule.days || []).join(", ") },
              { label: "Times", val: (ss.postingSchedule.times || []).join(", ") },
            ].map(({ label, val }) => (
              <div key={label} className="text-center p-3 bg-primary/8 rounded-xl">
                <p className="text-sm font-bold text-primary">{val || "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {ss.postingSchedule.rationale && <p className="text-xs text-muted-foreground">{ss.postingSchedule.rationale}</p>}
        </div>
      )}

      {/* Content Style */}
      {ss.contentStyle && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400" />Content Style to Adopt</p>
          <div className="grid grid-cols-2 gap-3">
            {[["Tone", ss.contentStyle.tone], ["Structure", ss.contentStyle.structure], ["Storytelling", ss.contentStyle.storytellingFormat], ["Visual Style", ss.contentStyle.visualStyle]].map(([label, val]) => val && (
              <div key={label} className="bg-muted/20 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xs text-foreground">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hook System */}
      {(ss.hookSystem || []).length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />Your 20-Hook System</p>
          <div className="space-y-2">
            {ss.hookSystem.map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl hover:bg-muted/30 transition-colors">
                <span className="text-[10px] font-bold text-muted-foreground w-5 flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">"{h.hook}"</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Pill text={h.type} />
                    {h.useFor && <span className="text-[10px] text-muted-foreground">{h.useFor}</span>}
                  </div>
                </div>
                <CopyButton text={h.hook} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reel + Carousel Ideas */}
      <div className="grid grid-cols-2 gap-4">
        {(ss.reelIdeas || []).length > 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Play className="w-4 h-4 text-pink-400" />Reel Ideas</p>
            <ul className="space-y-2">
              {ss.reelIdeas.map((idea: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-xs text-foreground flex-1">{idea}</p>
                  <CopyButton text={idea} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {(ss.carouselIdeas || []).length > 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-blue-400" />Carousel Ideas</p>
            <ul className="space-y-2">
              {ss.carouselIdeas.map((idea: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-xs text-foreground flex-1">{idea}</p>
                  <CopyButton text={idea} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 4-Week Growth Playbook */}
      {(ss.growthPlaybook || []).length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-green-400" />4-Week Growth Playbook</p>
          <div className="grid grid-cols-2 gap-3">
            {ss.growthPlaybook.map((w: any) => (
              <div key={w.week} className="bg-muted/20 border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-primary/15 rounded-xl flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">W{w.week}</span>
                  </div>
                  <p className="text-xs font-bold text-foreground">Week {w.week}</p>
                </div>
                <p className="text-[10px] text-primary font-medium mb-2">{w.focus}</p>
                <ul className="space-y-1 mb-2">
                  {(w.tasks || []).map((t: string, i: number) => (
                    <li key={i} className="text-[10px] text-foreground flex items-start gap-1.5"><span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground italic">{w.goal}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-Day Content Plan */}
      {(ss.contentPlan || []).length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />30-Day Content Plan</p>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {ss.contentPlan.map((day: any) => (
              <div key={day.day} className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary">{day.day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{day.format}</Badge>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">{day.goal}</Badge>
                  </div>
                  <p className="text-xs font-medium text-foreground">{day.topic}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 italic">Hook: "{day.hook}"</p>
                  {day.structure && <p className="text-[10px] text-muted-foreground mt-0.5">{day.structure}</p>}
                </div>
                <CopyButton text={`Day ${day.day} — ${day.format}\nTopic: ${day.topic}\nHook: ${day.hook}\nStructure: ${day.structure}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {ss.finalMessage && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25 text-center">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-base font-bold text-foreground">{ss.finalMessage}</p>
        </div>
      )}
    </div>
  );
}

// ─── Full Report with Section Grid ───────────────────────────────────────────

function FullReport({ analysis, onDelete }: { analysis: any; onDelete: () => void }) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [stealGenerating, setStealGenerating] = useState(false);
  const [localAnalysis, setLocalAnalysis] = useState(analysis);
  const [showSteal, setShowSteal] = useState(false);

  const generateSteal = async () => {
    setStealGenerating(true);
    try {
      const res = await fetch("/api/competitor/steal-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate strategy");
      setLocalAnalysis((prev: any) => ({ ...prev, report: { ...prev.report, stealStrategy: data.stealStrategy } }));
      toast({ title: "30-Day Plan Ready!", description: "Your personalised steal strategy is ready!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setStealGenerating(false);
    }
  };

  const report = localAnalysis.report as any;

  const renderSection = () => {
    switch (activeSection) {
      case "overview": return <OverviewSection report={report} analysis={localAnalysis} />;
      case "reels": return <ReelByReelSection report={report} analysis={localAnalysis} />;
      case "performance": return <PerformanceSection report={report} analysis={localAnalysis} />;
      case "patterns": return <AIPatternsSection report={report} analysis={localAnalysis} />;
      case "gaps": return <GapAnalysisSection report={report} />;
      case "hooks": return <HookLibrarySection report={report} analysis={localAnalysis} />;
      case "strategy": return <PostingStrategySection report={report} analysis={localAnalysis} />;
      case "audience": return <AudienceSection report={report} analysis={localAnalysis} />;
      case "scorecard": return <ScorecardSection report={report} analysis={localAnalysis} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-400" />
            {localAnalysis.clientHandle} <span className="text-muted-foreground text-sm">vs</span> {localAnalysis.competitorHandle}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(localAnalysis.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
        </div>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" data-testid="button-delete-analysis">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Section grid */}
      <div className="grid grid-cols-3 gap-3" data-tour="competitor-sections">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => {
                setActiveSection(isActive ? null : sec.id);
                setShowSteal(false);
              }}
              data-testid={`section-${sec.id}`}
              className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all text-left group ${isActive
                ? `bg-gradient-to-br ${sec.color} ${sec.border} border-2`
                : "bg-card border-border hover:border-border/80 hover:bg-muted/20"
                }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? "bg-white/10" : "bg-muted/40"}`}>
                <Icon className={`w-4 h-4 ${isActive ? sec.text : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className={`text-xs font-bold ${isActive ? sec.text : "text-foreground"}`}>{sec.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sec.desc}</p>
              </div>
              {isActive && (
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${sec.text.replace("text-", "bg-")}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Steal Strategy — special separate button */}
      <button
        onClick={() => { setShowSteal(!showSteal); setActiveSection(null); }}
        data-testid="section-steal"
        className={`w-full relative overflow-hidden rounded-2xl border-2 p-5 transition-all group ${showSteal
          ? "border-primary bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5"
          : "border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:border-primary/70 hover:from-primary/15"
          }`}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(212,180,97,0.15)] group-hover:shadow-[0_0_30px_rgba(212,180,97,0.25)] transition-all">
            <Sword className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-black text-primary">🎯 Steal Their Strategy</p>
              <span className="inline-flex items-center gap-1 bg-primary/20 border border-primary/30 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" />Most Powerful
              </span>
            </div>
            <p className="text-xs text-muted-foreground">30-day content plan · Hook system · Growth playbook · Built from competitor's exact strategy</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-primary transition-transform flex-shrink-0 ${showSteal ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Active section content */}
      {(activeSection || showSteal) && (
        <div className="bg-card border border-card-border rounded-2xl p-5 mt-1">
          {showSteal
            ? <StealStrategySection analysis={localAnalysis} onGenerate={generateSteal} generating={stealGenerating} />
            : renderSection()
          }
        </div>
      )}
    </div>
  );
}

// ─── Competitor Analysis Sub-Section ──────────────────────────────────────────

function CompetitorAnalysisSection({ useAdmin, activeClientId, user }: { useAdmin: boolean; activeClientId: string; user: any }) {
  const { toast } = useToast();
  const [clientUrl, setClientUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [screenVisible, setScreenVisible] = useState(false);
  const [apiDone, setApiDone] = useState(false);

  const { data: analyses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/competitor/analyses", activeClientId],
    queryFn: () => apiRequest("GET", `/api/competitor/analyses${useAdmin && activeClientId ? `?clientId=${activeClientId}` : ""}`),
    enabled: !useAdmin || !!activeClientId,
  });

  const analyze = useMutation({
    mutationFn: () => apiRequestWithTimeout("POST", "/api/competitor/analyze", {
      clientUrl: normalizeInstagramUrl(clientUrl),
      competitorUrl: normalizeInstagramUrl(competitorUrl),
      clientId: activeClientId || user?.id,
    }),
    onSuccess: (data: any) => {
      setApiDone(true);
      queryClient.invalidateQueries({ queryKey: ["/api/competitor/analyses", activeClientId] });
      setSelectedId(data.id);
      setClientUrl("");
      setCompetitorUrl("");
      toast({ title: "Analysis complete!", description: "Your 9-section deep-dive report is ready." });
    },
    onError: (e: any) => {
      setApiDone(true);
      if (e instanceof ApiError && e.status === 402) {
        setCreditError(e.message);
      } else {
        const message = String(e?.message || "Analysis failed");
        toast({
          title: "Error",
          description: message.includes("timed out")
            ? "Competitor analysis timed out while scraping Instagram. Please retry in a minute."
            : message,
          variant: "destructive",
        });
      }
    },
  });

  const deleteAnalysis = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/competitor/analyses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitor/analyses", activeClientId] });
      setSelectedId(null);
      toast({ title: "Analysis deleted" });
    },
  });

  const canAnalyze = clientUrl.trim() && competitorUrl.trim() && (!useAdmin || activeClientId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="space-y-6">
      {screenVisible && (
        <GeneratingScreen
          label="your competitor analysis"
          minMs={35000}
          isComplete={apiDone}
          onReady={() => { setScreenVisible(false); setApiDone(false); }}
          steps={[
            "Scraping Instagram profiles",
            "Collecting posts & engagement data",
            "Running AI deep analysis",
            "Comparing strategies & gaps",
            "Generating full report",
          ]}
        />
      )}
      {creditError && <CreditErrorBanner message={creditError} />}

      {
      {/* New Analysis Form */}
      <Card className="border border-card-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-sm font-bold text-foreground mb-0.5">New Competitor Analysis</p>
            <p className="text-xs text-muted-foreground">Enter your Instagram + a competitor's — get a 9-section deep-dive report</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Your Instagram URL</Label>
              <Input value={clientUrl} onChange={e => setClientUrl(e.target.value)} placeholder="instagram.com/yourhandle or @yourhandle" className="h-9 text-sm" data-testid="input-client-url" />
              <p className="text-[10px] text-muted-foreground mt-1">Use a profile URL, not a reel or post link</p>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Competitor Instagram URL</Label>
              <Input value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)} placeholder="instagram.com/competitorhandle or @handle" className="h-9 text-sm" data-testid="input-competitor-url" />
              <p className="text-[10px] text-muted-foreground mt-1">Use a profile URL, not a reel or post link</p>
            </div>
          </div>
          <Button onClick={() => { setScreenVisible(true); setApiDone(false); analyze.mutate(); }} disabled={!canAnalyze || analyze.isPending} className="gap-2" data-testid="button-run-analysis">
            {analyze.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Scraping & Analysing…</>
              : <><Sparkles className="w-4 h-4" />Run Deep Analysis<CreditCostBadge cost={10} level="heavy" className="ml-1.5" /></>}
          </Button>
        </CardContent>
      </Card>

      {/* Selected analysis display */}
      {selectedId && (analyses as any[]).find((a: any) => a.id === selectedId) && (
        <div className="border border-primary/40 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <FullReport analysis={(analyses as any[]).find((a: any) => a.id === selectedId)!} onDelete={() => { deleteAnalysis.mutate(selectedId); setSelectedId(null); }} />
          </div>
        </div>
      )}
      </div>

      {/* Right column: History panel */}
      {!useAdmin && (
        <div className="lg:sticky lg:top-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Past Analyses</span>
              {(analyses as any[]).length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5">{(analyses as any[]).length}</span>
              )}
            </div>
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (analyses as any[]).length === 0 ? (
              <div className="p-6 flex flex-col items-center gap-2 text-center">
                <BarChart2 className="w-7 h-7 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground leading-relaxed">No analyses yet.<br />Run your first analysis above.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {(analyses as any[]).map((a: any) => {
                  const isActive = selectedId === a.id;
                  return (
                    <div key={a.id} className={`flex items-center gap-2.5 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer ${isActive ? "bg-primary/5" : ""}`} onClick={() => setSelectedId(isActive ? null : a.id)} data-testid={`analysis-${a.id}`}>
                      <div className="w-8 h-8 bg-pink-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Instagram className="w-3.5 h-3.5 text-pink-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground leading-snug truncate font-medium">{a.clientHandle} <span className="text-muted-foreground">vs</span> {a.competitorHandle}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(a.createdAt), "MMM d")}</p>
                      </div>
                      {a.report?.overview?.assessment && (
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.report.overview.assessment === "winning" ? "bg-green-400" : a.report.overview.assessment === "losing" ? "bg-red-400" : "bg-yellow-400"}`} />
                      )}
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={(e) => { e.stopPropagation(); deleteAnalysis.mutate(a.id); }}
                        data-testid={`delete-analysis-${a.id}`}
                      ><Trash2 className="w-3 h-3" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Niche Intelligence Engine ────────────────────────────────────────────────

const NICHE_SECTIONS = [
  { id: "nicheTrends", label: "Niche Trends", icon: TrendingUp, color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", text: "text-blue-400", desc: "What's working right now" },
  { id: "topicClusters", label: "Topic Clusters", icon: Layers, color: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", text: "text-purple-400", desc: "Viral themes & performance" },
  { id: "saturationAnalysis", label: "Saturation Map", icon: BarChart2, color: "from-red-500/20 to-red-500/5", border: "border-red-500/30", text: "text-red-400", desc: "Saturated vs underserved" },
  { id: "hookTrends", label: "Hook Trends", icon: Zap, color: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/30", text: "text-yellow-400", desc: "Best hooks in this niche" },
  { id: "contentGaps", label: "Content Gaps", icon: Search, color: "from-green-500/20 to-green-500/5", border: "border-green-500/30", text: "text-green-400", desc: "What nobody is doing" },
  { id: "audienceDesires", label: "Audience Desires", icon: Heart, color: "from-pink-500/20 to-pink-500/5", border: "border-pink-500/30", text: "text-pink-400", desc: "What they really want" },
  { id: "formatBreakdown", label: "Format Breakdown", icon: Play, color: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/30", text: "text-cyan-400", desc: "Reels vs carousels vs static" },
  { id: "competitorPositioning", label: "Positioning Map", icon: Crosshair, color: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", text: "text-orange-400", desc: "Where YOU should position" },
  { id: "contentAngles", label: "20 Content Angles", icon: Lightbulb, color: "from-primary/20 to-primary/5", border: "border-primary/30", text: "text-primary", desc: "Angles no one is using" },
];

function NicheReportSection({ sectionId, report, niche }: { sectionId: string; report: any; niche: string }) {
  if (!report) return <EmptyState message="No data available." />;

  switch (sectionId) {
    case "nicheTrends": {
      const nt = report.nicheTrends || {};
      return (
        <div className="space-y-5">
          <SectionHeader icon={TrendingUp} title="Niche Content Trends" desc={`What is actually working in ${niche} right now`} color="from-blue-500/20 to-blue-500/5" />
          <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Bottom Line</p>
            <p className="text-sm text-foreground leading-relaxed">{nt.summary}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-card-border rounded-2xl p-4">
              <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-blue-400" />Dominant Formats</p>
              <ul className="space-y-2">{(nt.dominantFormats || []).map((f: string, i: number) => (
                <li key={i} className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><p className="text-xs text-foreground">{f}</p></li>
              ))}</ul>
            </div>
            <div className="bg-card border border-card-border rounded-2xl p-4">
              <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-purple-400" />Trending Topics</p>
              <ul className="space-y-2">{(nt.trendingTopics || []).map((t: string, i: number) => (
                <li key={i} className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" /><p className="text-xs text-foreground">{t}</p></li>
              ))}</ul>
            </div>
            <div className="bg-card border border-card-border rounded-2xl p-4">
              <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-orange-400" />Viral Patterns</p>
              <ul className="space-y-2">{(nt.viralPatterns || []).map((p: string, i: number) => (
                <li key={i} className="flex items-start gap-2"><span className="text-orange-400 mt-0.5 flex-shrink-0">🔥</span><p className="text-xs text-foreground">{p}</p></li>
              ))}</ul>
            </div>
          </div>
        </div>
      );
    }

    case "topicClusters": {
      const clusters = report.topicClusters || [];
      const chartData = clusters.map((c: any) => ({ theme: c.theme, views: c.avgViews || 0, engagement: c.avgEngagement || 0 }));
      return (
        <div className="space-y-5">
          <SectionHeader icon={Layers} title="Viral Topic Clusters" desc="Which themes drive the most performance" color="from-purple-500/20 to-purple-500/5" />
          {chartData.length > 0 && (
            <div className="bg-card border border-card-border rounded-2xl p-5">
              <p className="text-sm font-semibold text-foreground mb-4">Topic Performance Comparison</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <XAxis dataKey="theme" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="views" name="Avg Views" fill={GOLD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-3">
            {clusters.map((c: any, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-2xl p-4 grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 border text-xs capitalize">{c.theme}</Badge>
                    <span className="text-[10px] text-muted-foreground">{c.frequency}</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{c.description}</p>
                  {(c.topPerformers || []).length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-2">Best in: {c.topPerformers.join(", ")}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {c.avgViews > 0 && <div className="bg-blue-500/10 rounded-xl p-2 text-center"><p className="text-sm font-bold text-blue-400">{(c.avgViews).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Avg Views</p></div>}
                  {c.avgEngagement > 0 && <div className="bg-green-500/10 rounded-xl p-2 text-center"><p className="text-sm font-bold text-green-400">{c.avgEngagement}%</p><p className="text-[10px] text-muted-foreground">Engagement</p></div>}
                </div>
              </div>
            ))}
            {!clusters.length && <EmptyState message="No topic cluster data." />}
          </div>
        </div>
      );
    }

    case "saturationAnalysis": {
      const sa = report.saturationAnalysis || {};
      const oversat = sa.oversaturated || [];
      const underserved = sa.underserved || [];
      const pieData = [
        { name: "Oversaturated", value: oversat.length, fill: "#ef4444" },
        { name: "Underserved", value: underserved.length, fill: "#22c55e" },
      ].filter(d => d.value > 0);
      return (
        <div className="space-y-5">
          <SectionHeader icon={BarChart2} title="Saturation Analysis" desc="What's overcrowded vs what's an open opportunity" color="from-red-500/20 to-red-500/5" />
          {sa.summary && (
            <div className="p-5 rounded-2xl bg-card border border-card-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Overview</p>
              <p className="text-sm text-foreground leading-relaxed">{sa.summary}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            {pieData.length > 0 && (
              <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col items-center justify-center">
                <PieChart width={110} height={110}>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={48}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
                <div className="flex flex-col gap-1 mt-2 text-center">
                  <span className="text-[10px]"><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Saturated: {oversat.length}</span>
                  <span className="text-[10px]"><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Opportunity: {underserved.length}</span>
                </div>
              </div>
            )}
            <div className="col-span-2 space-y-3">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" />Oversaturated — Avoid</p>
              {oversat.slice(0, 3).map((o: any, i: number) => (
                <div key={i} className="bg-red-500/8 border border-red-500/20 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1"><p className="text-xs font-bold text-foreground">{o.topic}</p><span className="text-[10px] text-red-400">{o.howManyUseIt}</span></div>
                  <p className="text-[10px] text-muted-foreground">{o.whySaturated}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-2 mb-3"><CheckCircle className="w-3.5 h-3.5" />Underserved Opportunities — Strike Now</p>
            <div className="grid grid-cols-2 gap-3">
              {underserved.map((u: any, i: number) => (
                <div key={i} className="bg-green-500/8 border border-green-500/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-foreground">{u.topic}</p>
                    <Badge className={`text-[10px] border ${u.estimatedGrowthPotential === "High" ? "bg-green-500/20 text-green-300 border-green-500/30" : u.estimatedGrowthPotential === "Medium" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "bg-muted text-muted-foreground border-border"}`}>{u.estimatedGrowthPotential}</Badge>
                  </div>
                  <p className="text-xs text-foreground">{u.whyOpportunity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case "hookTrends": {
      const ht = report.hookTrends || {};
      const mostUsed = ht.mostUsedHooks || [];
      const mostEffective = ht.mostEffectiveHooks || [];
      return (
        <div className="space-y-5">
          <SectionHeader icon={Zap} title="Hook Trend Analysis" desc="What hooks dominate this niche" color="from-yellow-500/20 to-yellow-500/5" />
          {ht.hookInsight && (
            <div className="p-5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">Key Insight</p>
              <p className="text-sm text-foreground leading-relaxed">{ht.hookInsight}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-card-border rounded-2xl p-4">
              <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Hash className="w-4 h-4 text-yellow-400" />Most Used Hooks</p>
              <div className="space-y-3">
                {mostUsed.map((h: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground capitalize">{h.hookType}</span>
                      <span className="text-[10px] text-muted-foreground">{h.frequency}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: typeof h.frequency === "string" && h.frequency.includes("%") ? h.frequency : "50%" }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{h.avgPerformance}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-card-border rounded-2xl p-4">
              <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" />Most Effective Hooks</p>
              <div className="space-y-3">
                {mostEffective.map((h: any, i: number) => (
                  <div key={i} className="bg-orange-500/8 border border-orange-500/15 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-orange-300 capitalize">{h.hookType}</span>
                      {h.avgViews > 0 && <span className="text-[10px] text-muted-foreground">{(h.avgViews).toLocaleString()} avg views</span>}
                    </div>
                    {h.example && <p className="text-xs text-foreground italic mb-1">"{h.example}"</p>}
                    <p className="text-[10px] text-muted-foreground">{h.whyItWorks}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "contentGaps": {
      const gaps = report.contentGaps || [];
      const highGaps = gaps.filter((g: any) => g.estimatedImpact === "High");
      const otherGaps = gaps.filter((g: any) => g.estimatedImpact !== "High");
      return (
        <div className="space-y-5">
          <SectionHeader icon={Search} title="Content Gap Finder" desc="What NO competitor is doing — your biggest opportunities" color="from-green-500/20 to-green-500/5" />
          {highGaps.length > 0 && (
            <div>
              <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Star className="w-3.5 h-3.5" />High Impact Gaps — Do These First</p>
              <div className="grid grid-cols-1 gap-3">
                {highGaps.map((g: any, i: number) => (
                  <div key={i} className="bg-green-500/8 border-2 border-green-500/30 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-foreground">{g.gap}</p>
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 border text-[10px]">High Impact</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{g.description}</p>
                    <div className="bg-green-500/10 rounded-xl p-3 flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">{g.howToCapitalize}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {otherGaps.map((g: any, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-foreground">{g.gap}</p>
                  <Badge variant="outline" className="text-[10px]">{g.estimatedImpact}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">{g.description}</p>
                <p className="text-[10px] text-primary">{g.howToCapitalize}</p>
              </div>
            ))}
          </div>
          {!gaps.length && <EmptyState message="No gap data available." />}
        </div>
      );
    }

    case "audienceDesires": {
      const ad = report.audienceDesires || {};
      return (
        <div className="space-y-5">
          <SectionHeader icon={Heart} title="Audience Desire Mapping" desc="What this niche's audience really wants" color="from-pink-500/20 to-pink-500/5" />
          {ad.summary && (
            <div className="p-5 rounded-2xl bg-pink-500/10 border border-pink-500/20">
              <p className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2">Audience Profile</p>
              <p className="text-sm text-foreground leading-relaxed">{ad.summary}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/8 border border-green-500/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />They Want</p>
              <ul className="space-y-2">{(ad.wants || []).map((w: string, i: number) => <li key={i} className="flex items-start gap-2"><span className="text-green-400 mt-0.5 text-xs flex-shrink-0">✓</span><p className="text-xs text-foreground">{w}</p></li>)}</ul>
            </div>
            <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />They Hate</p>
              <ul className="space-y-2">{(ad.complaints || []).map((c: string, i: number) => <li key={i} className="flex items-start gap-2"><span className="text-red-400 mt-0.5 text-xs flex-shrink-0">✗</span><p className="text-xs text-foreground">{c}</p></li>)}</ul>
            </div>
            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Engagement Triggers</p>
              <ul className="space-y-2">{(ad.engagementTriggers || []).map((t: string, i: number) => <li key={i} className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5 text-xs flex-shrink-0">⚡</span><p className="text-xs text-foreground">{t}</p></li>)}</ul>
            </div>
            <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />Buying Triggers</p>
              <ul className="space-y-2">{(ad.buyingTriggers || []).map((t: string, i: number) => <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5 text-xs flex-shrink-0">→</span><p className="text-xs text-foreground">{t}</p></li>)}</ul>
            </div>
          </div>
        </div>
      );
    }

    case "formatBreakdown": {
      const fb = report.formatBreakdown || {};
      const formats = [
        { key: "reels", label: "Reels", color: "#e879a0", icon: "🎬" },
        { key: "carousels", label: "Carousels", color: GOLD, icon: "📊" },
        { key: "static", label: "Static", color: "#60a5fa", icon: "🖼" },
      ];
      const chartData = formats.map(f => ({
        format: f.label,
        engagement: fb[f.key]?.avgEngagement || 0,
        views: fb[f.key]?.avgViews || 0,
        percent: fb[f.key]?.percentOfContent || 0,
      }));
      return (
        <div className="space-y-5">
          <SectionHeader icon={Play} title="Format Breakdown" desc="Reels vs Carousels vs Static — what wins in this niche" color="from-cyan-500/20 to-cyan-500/5" />
          {fb.winner && (
            <div className="p-5 rounded-2xl bg-primary/10 border border-primary/25 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Winner Format in {niche}</p>
                <p className="text-lg font-black text-foreground capitalize">{fb.winner}</p>
                <p className="text-xs text-muted-foreground">{fb.insight}</p>
              </div>
            </div>
          )}
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Performance by Format</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <XAxis dataKey="format" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="engagement" name="Avg Engagement %" fill={GOLD} radius={[4, 4, 0, 0]} />
                <Bar dataKey="percent" name="% of Content" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {formats.map(f => {
              const data = fb[f.key] || {};
              return (
                <div key={f.key} className={`bg-card border rounded-2xl p-4 ${fb.winner === f.key ? "border-primary/40 bg-primary/5" : "border-card-border"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{f.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{f.label}</p>
                      {fb.winner === f.key && <Badge className="bg-primary/20 text-primary border-primary/30 border text-[9px]">Winner</Badge>}
                    </div>
                  </div>
                  {data.avgViews > 0 && <p className="text-sm font-bold text-blue-400">{(data.avgViews).toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">avg views</span></p>}
                  {data.avgEngagement > 0 && <p className="text-sm font-bold text-green-400">{data.avgEngagement}% <span className="text-[10px] text-muted-foreground font-normal">engagement</span></p>}
                  {data.percentOfContent > 0 && <p className="text-sm font-bold text-foreground">{data.percentOfContent}% <span className="text-[10px] text-muted-foreground font-normal">of content</span></p>}
                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{data.verdict}</p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "competitorPositioning": {
      const cp = report.competitorPositioning || {};
      const posMap = cp.map || [];
      return (
        <div className="space-y-5">
          <SectionHeader icon={Crosshair} title="Competitor Positioning Map" desc="Where each competitor sits — and where YOU should go" color="from-orange-500/20 to-orange-500/5" />
          {cp.recommendedPosition && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">🎯 Your Recommended Position</p>
              <p className="text-base font-bold text-foreground mb-1">{cp.recommendedPosition}</p>
              <p className="text-sm text-muted-foreground">{cp.positioningRationale}</p>
            </div>
          )}
          {cp.uniqueAngle && (
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Your Unique Angle</p>
              <p className="text-sm text-foreground">{cp.uniqueAngle}</p>
            </div>
          )}
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Competitor Positions</p>
            {posMap.map((c: any, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-2xl p-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground">{c.handle}</p>
                  <p className="text-[10px] text-muted-foreground">Primary</p>
                </div>
                <div>
                  <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/30 border text-xs capitalize">{c.primaryPosition}</Badge>
                  {c.secondaryPosition && <p className="text-[10px] text-muted-foreground mt-1">{c.secondaryPosition}</p>}
                </div>
                <div>
                  <p className="text-[10px] text-primary font-medium">Your gap: {c.gapToTarget}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "contentAngles": {
      const angles = report.contentAngles || [];
      const reelAngles = angles.filter((a: any) => a.format === "reel");
      const carouselAngles = angles.filter((a: any) => a.format === "carousel");
      const staticAngles = angles.filter((a: any) => a.format === "static");
      const otherAngles = angles.filter((a: any) => !["reel", "carousel", "static"].includes(a.format));

      return (
        <div className="space-y-5">
          <SectionHeader icon={Lightbulb} title="20 Unique Content Angles" desc="Angles no competitor in this niche is using" color="from-primary/20 to-primary/5" />
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Why These Work</p>
            <p className="text-sm text-muted-foreground">These angles are underutilized in the {niche} niche — using them now puts you ahead before everyone else catches on.</p>
          </div>
          {[
            { label: "Reel Angles", items: reelAngles, color: "text-pink-400" },
            { label: "Carousel Angles", items: carouselAngles, color: "text-blue-400" },
            { label: "Static Angles", items: staticAngles, color: "text-green-400" },
            { label: "Other", items: otherAngles, color: "text-muted-foreground" },
          ].filter(g => g.items.length > 0).map(group => (
            <div key={group.label}>
              <p className={`text-xs font-bold ${group.color} uppercase tracking-wider mb-3`}>{group.label}</p>
              <div className="grid grid-cols-1 gap-2">
                {group.items.map((a: any, i: number) => (
                  <div key={i} className="bg-card border border-card-border rounded-xl p-4 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground mb-1">{a.angle}</p>
                      <p className="text-[10px] text-muted-foreground mb-2">{a.whyUnique}</p>
                      {a.hookExample && (
                        <div className="bg-primary/8 border border-primary/15 rounded-lg p-2 flex items-center justify-between gap-2">
                          <p className="text-xs text-foreground italic">"{a.hookExample}"</p>
                          <CopyButton text={a.hookExample} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!angles.length && <EmptyState message="No content angles available." />}
        </div>
      );
    }

    default:
      return <EmptyState message="Section not found." />;
  }
}

function NicheGrowthPlaybook({ report, niche }: { report: any; niche: string }) {
  const gp = report.growthPlaybook || {};
  const cl = report.contentLifecycle || {};
  const ni = report.nicheInsight || {};
  const vs = report.viralityScores || [];

  return (
    <div className="space-y-6">
      {ni.answer && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/8 to-transparent border border-primary/25">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <p className="text-sm font-bold text-primary uppercase tracking-wider">AI Niche Brain — What Should I Post?</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed mb-4">{ni.answer}</p>
          {(ni.topRecommendations || []).length > 0 && (
            <div className="grid grid-cols-1 gap-2 mb-3">
              {ni.topRecommendations.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 bg-card border border-card-border rounded-xl p-3">
                  <span className="text-primary font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <p className="text-xs text-foreground">{r}</p>
                </div>
              ))}
            </div>
          )}
          {(ni.avoidThese || []).length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Avoid These Mistakes</p>
              {ni.avoidThese.map((m: string, i: number) => <p key={i} className="text-xs text-foreground flex items-start gap-2"><span className="text-red-400 flex-shrink-0">✗</span>{m}</p>)}
            </div>
          )}
          {ni.secretWeapon && (
            <div className="bg-primary/10 border border-primary/25 rounded-xl p-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">🔑 Secret Weapon</p>
              <p className="text-xs text-foreground">{ni.secretWeapon}</p>
            </div>
          )}
        </div>
      )}

      {gp.summary && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-green-400" />30-Day Growth Playbook for {niche}</p>
          <p className="text-sm text-muted-foreground mb-4">{gp.summary}</p>
          <div className="grid grid-cols-3 gap-3">
            {[gp.phase1, gp.phase2, gp.phase3].filter(Boolean).map((phase: any, i: number) => (
              <div key={i} className="bg-muted/20 border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-primary/15 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-xs font-bold text-foreground">{phase.name}</p>
                </div>
                <p className="text-[10px] text-primary font-medium mb-2">{phase.focus}</p>
                <ul className="space-y-1 mb-2">
                  {(phase.actions || []).map((a: string, j: number) => <li key={j} className="text-[10px] text-foreground flex items-start gap-1.5"><span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{a}</li>)}
                </ul>
                <p className="text-[10px] text-muted-foreground italic">{phase.contentMix}</p>
              </div>
            ))}
          </div>
          {(gp.keyPrinciples || []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {gp.keyPrinciples.map((p: string, i: number) => <Badge key={i} variant="outline" className="text-xs text-primary border-primary/30">{p}</Badge>)}
            </div>
          )}
        </div>
      )}

      {cl.insight && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-card-border rounded-2xl p-4">
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" />Goes Viral First</p>
            <p className="text-sm font-bold text-foreground mb-1">{cl.viralFirst?.contentType}</p>
            <p className="text-xs text-muted-foreground mb-2">{cl.viralFirst?.whyItVirals}</p>
            {(cl.viralFirst?.examples || []).map((e: string, i: number) => <p key={i} className="text-[10px] text-foreground">• {e}</p>)}
          </div>
          <div className="bg-card border border-card-border rounded-2xl p-4">
            <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5" />Converts Later</p>
            <p className="text-sm font-bold text-foreground mb-1">{cl.convertsLater?.contentType}</p>
            <p className="text-xs text-muted-foreground mb-2">{cl.convertsLater?.whyItConverts}</p>
            {(cl.convertsLater?.examples || []).map((e: string, i: number) => <p key={i} className="text-[10px] text-foreground">• {e}</p>)}
          </div>
        </div>
      )}

      {vs.length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <p className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-primary" />Virality Scores by Content Type</p>
          <div className="space-y-3">
            {vs.map((v: any, i: number) => (
              <div key={i} className="bg-muted/20 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-foreground">{v.contentType}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-primary">{v.overallScore}</span>
                    <span className="text-[10px] text-muted-foreground">/10</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[["Hook", v.hookScore, "text-yellow-400"], ["Retention", v.retentionScore, "text-blue-400"], ["Engagement", v.engagementScore, "text-green-400"]].map(([label, score, color]) => (
                    <div key={label} className="text-center">
                      <p className={`text-sm font-bold ${color}`}>{score}/10</p>
                      <p className="text-[9px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(v.overallScore / 10) * 100}%` }} />
                </div>
                {v.verdict && <p className="text-[10px] text-muted-foreground mt-1.5">{v.verdict}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NicheIntelligenceSection({ useAdmin, activeClientId, user }: { useAdmin: boolean; activeClientId: string; user: any }) {
  const { toast } = useToast();
  const survey = useSurvey();
  const [niche, setNiche] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState(["", "", ""]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeNicheSection, setActiveNicheSection] = useState<string | null>(null);
  const [showGrowthPlaybook, setShowGrowthPlaybook] = useState(false);
  const [screenVisible, setScreenVisible] = useState(false);
  const [apiDone, setApiDone] = useState(false);

  // Pre-fill niche from survey
  useEffect(() => {
    if (survey.niche && !niche) setNiche(survey.niche);
  }, [survey.niche]);

  const { data: analyses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/niche/analyses", activeClientId],
    queryFn: () => apiRequest("GET", `/api/niche/analyses${useAdmin && activeClientId ? `?clientId=${activeClientId}` : ""}`),
    enabled: !useAdmin || !!activeClientId,
  });

  const analyze = useMutation({
    mutationFn: () => apiRequestWithTimeout("POST", "/api/niche/analyze", {
      niche,
      competitorUrls: competitorUrls.map(normalizeInstagramUrl).filter(Boolean),
      clientId: activeClientId || user?.id,
    }),
    onSuccess: (data: any) => {
      setApiDone(true);
      queryClient.invalidateQueries({ queryKey: ["/api/niche/analyses", activeClientId] });
      setSelectedId(data.id);
      setNiche("");
      setCompetitorUrls(["", "", ""]);
      toast({ title: "Niche Analysis Ready!", description: "Your complete niche intelligence report is ready." });
    },
    onError: (e: any) => {
      setApiDone(true);
      const message = String(e?.message || "Niche analysis failed");
      toast({
        title: "Error",
        description: message.includes("timed out")
          ? "Niche analysis timed out while scraping competitor profiles. Please retry."
          : message,
        variant: "destructive",
      });
    },
  });

  const deleteAnalysis = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/niche/analyses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/niche/analyses", activeClientId] });
      setSelectedId(null);
    },
  });

  const addUrl = () => {
    if (competitorUrls.length < 5) setCompetitorUrls([...competitorUrls, ""]);
  };
  const removeUrl = (i: number) => {
    if (competitorUrls.length > 1) setCompetitorUrls(competitorUrls.filter((_, idx) => idx !== i));
  };
  const updateUrl = (i: number, val: string) => {
    const next = [...competitorUrls];
    next[i] = val;
    setCompetitorUrls(next);
  };

  const canAnalyze = niche.trim() && competitorUrls.some(u => u.trim()) && (!useAdmin || activeClientId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="space-y-6">
      {screenVisible && (
        <GeneratingScreen
          label="your niche intelligence report"
          minMs={40000}
          isComplete={apiDone}
          onReady={() => { setScreenVisible(false); setApiDone(false); }}
          steps={[
            "Scraping competitor profiles",
            "Analysing post performance data",
            "Identifying niche patterns",
            "Finding gaps & opportunities",
            "Generating your growth playbook",
          ]}
        />
      )}

      {
      {/* New Analysis Form */}
      <Card className="border border-card-border">
        <CardContent className="p-5 space-y-5">
          <div>
            <p className="text-sm font-bold text-foreground mb-0.5">Niche Intelligence Engine</p>
            <p className="text-xs text-muted-foreground">Enter your niche + up to 5 competitor URLs — get a complete intelligence report on what's working</p>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Your Niche</Label>
            <Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. fitness, real estate, SMMA, faceless content..." className="h-9 text-sm" data-testid="input-niche-name" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Competitor Instagram URLs (3–5 for best results)</Label>
              {competitorUrls.length < 5 && (
                <button onClick={addUrl} className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">+ Add URL</button>
              )}
            </div>
            <div className="space-y-2">
              {competitorUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-muted/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                  </div>
                  <Input value={url} onChange={e => updateUrl(i, e.target.value)} placeholder={`@competitor${i + 1} or instagram.com/handle`} className="h-9 text-sm flex-1" data-testid={`input-niche-url-${i}`} />
                  {competitorUrls.length > 1 && (
                    <button onClick={() => removeUrl(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={() => { setScreenVisible(true); setApiDone(false); analyze.mutate(); }} disabled={!canAnalyze || analyze.isPending} className="gap-2 w-full" data-testid="button-run-niche-analysis">
            {analyze.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Scraping Competitors & Building Report…</>
              : <><Sparkles className="w-4 h-4" />Run Niche Intelligence Analysis</>}
          </Button>
        </CardContent>
      </Card>

      {/* Selected analysis display */}
      {selectedId && (analyses as any[]).find((a: any) => a.id === selectedId) && (() => {
        const a = (analyses as any[]).find((a: any) => a.id === selectedId)!;
        return (
          <div className="border border-primary/40 rounded-2xl overflow-hidden">
            <div className="p-4 space-y-5">
              {/* Section grid */}
              <div className="grid grid-cols-3 gap-3">
                {NICHE_SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  const isSecActive = activeNicheSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => { setActiveNicheSection(isSecActive ? null : sec.id); setShowGrowthPlaybook(false); }}
                      data-testid={`niche-section-${sec.id}`}
                      className={`flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all text-left group ${isSecActive
                        ? `bg-gradient-to-br ${sec.color} ${sec.border} border-2`
                        : "bg-card border-border hover:bg-muted/20"
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSecActive ? "bg-white/10" : "bg-muted/40"}`}>
                        <Icon className={`w-4 h-4 ${isSecActive ? sec.text : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isSecActive ? sec.text : "text-foreground"}`}>{sec.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{sec.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Growth Playbook special button */}
              <button
                onClick={() => { setShowGrowthPlaybook(!showGrowthPlaybook); setActiveNicheSection(null); }}
                className={`w-full relative overflow-hidden rounded-2xl border-2 p-5 transition-all ${showGrowthPlaybook
                  ? "border-primary bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5"
                  : "border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:border-primary/70"
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-primary">🧠 AI Niche Brain + Growth Playbook</p>
                      <span className="bg-primary/20 border border-primary/30 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary uppercase">Most Valuable</span>
                    </div>
                    <p className="text-xs text-muted-foreground">What to post · 30-day playbook · Content lifecycle · Virality scores</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-primary transition-transform flex-shrink-0 ${showGrowthPlaybook ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Section content */}
              {(activeNicheSection || showGrowthPlaybook) && (
                <div className="bg-card border border-card-border rounded-2xl p-5">
                  {showGrowthPlaybook
                    ? <NicheGrowthPlaybook report={a.report} niche={a.niche} />
                    : <NicheReportSection sectionId={activeNicheSection!} report={a.report} niche={a.niche} />
                  }
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={() => { deleteAnalysis.mutate(a.id); setSelectedId(null); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors p-2">
                  <Trash2 className="w-3.5 h-3.5" />Delete Analysis
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </div>

      {/* Right column: History panel */}
      {!useAdmin && (
        <div className="lg:sticky lg:top-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Past Analyses</span>
              {(analyses as any[]).length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5">{(analyses as any[]).length}</span>
              )}
            </div>
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (analyses as any[]).length === 0 ? (
              <div className="p-6 flex flex-col items-center gap-2 text-center">
                <Search className="w-7 h-7 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground leading-relaxed">No analyses yet.<br />Run your first analysis above.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {(analyses as any[]).map((a: any) => {
                  const isActive = selectedId === a.id;
                  return (
                    <div key={a.id} className={`flex items-center gap-2.5 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer ${isActive ? "bg-primary/5" : ""}`} onClick={() => { setSelectedId(isActive ? null : a.id); setActiveNicheSection(null); setShowGrowthPlaybook(false); }} data-testid={`niche-analysis-${a.id}`}>
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Search className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground leading-snug truncate font-medium capitalize">{a.niche}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(a.createdAt), "MMM d")}</p>
                      </div>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={(e) => { e.stopPropagation(); deleteAnalysis.mutate(a.id); }}
                        data-testid={`delete-niche-${a.id}`}
                      ><Trash2 className="w-3 h-3" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Methodology Section ──────────────────────────────────────────────────────

const METHODOLOGY_TOOLS = [
  { id: "improve", label: "AI Content Improver", icon: Wand2, color: "from-violet-500/20 to-violet-500/5", border: "border-violet-500/30", text: "text-violet-400", desc: "Paste a caption or script — AI rewrites the hook, structure and CTA", placeholder: "Paste your caption or script here..." },
  { id: "hooks", label: "Hook Optimizer", icon: Zap, color: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/30", text: "text-yellow-400", desc: "Paste a hook — get 4 viral rewrites (curiosity, controversy, storytelling, authority)", placeholder: "Paste your hook line here..." },
  { id: "score", label: "Content Score", icon: Activity, color: "from-green-500/20 to-green-500/5", border: "border-green-500/30", text: "text-green-400", desc: "Paste any content — get scored out of 100 across hook, engagement, clarity, retention and CTA", placeholder: "Paste your content here to score it..." },
  { id: "abtest", label: "A/B Test Generator", icon: Layers, color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", text: "text-blue-400", desc: "Paste a content idea — get 3 hooks, 3 captions and 2 CTAs to split-test", placeholder: "Describe your content idea or paste a draft post..." },
];

function ScoreBar({ label, score, feedback }: { label: string; score: number; feedback: string }) {
  const color = score >= 75 ? "bg-green-500" : score >= 55 ? "bg-primary" : "bg-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className={`text-xs font-bold ${score >= 75 ? "text-green-400" : score >= 55 ? "text-primary" : "text-red-400"}`}>{score}/100</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{feedback}</p>
    </div>
  );
}

function DNAProfile({ profile }: { profile: any }) {
  const dna = profile?.contentDNA || {};
  const sc = profile?.scorecard || {};
  const SCORE_FIELDS = [
    { key: "hookStrength", label: "Hook Strength" },
    { key: "ctaEffectiveness", label: "CTA Effectiveness" },
    { key: "contentConsistency", label: "Content Consistency" },
    { key: "engagementRate", label: "Engagement Rate" },
    { key: "viralPotential", label: "Viral Potential" },
  ];

  return (
    <div className="space-y-4">
      {/* Fingerprint banner */}
      <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Dna className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Your Content DNA Fingerprint</p>
        </div>
        <p className="text-sm text-foreground leading-relaxed font-medium">"{dna.fingerprint}"</p>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 bg-primary/20 rounded-full px-3 py-1">
            <span className="text-lg font-black text-primary">{sc.overall ?? "—"}</span>
            <span className="text-[10px] text-primary/70 font-semibold">/100 overall score</span>
          </div>
          <span className={`text-xs font-bold ${(sc.overall ?? 0) >= 70 ? "text-green-400" : (sc.overall ?? 0) >= 50 ? "text-yellow-400" : "text-red-400"}`}>
            {(sc.overall ?? 0) >= 70 ? "Strong content methodology" : (sc.overall ?? 0) >= 50 ? "Needs some work" : "Significant room to improve"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Hook Style */}
        <div className="bg-card border border-card-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Hook Style</p>
          </div>
          <p className="text-sm text-foreground">{dna.hookStyle}</p>
          {Array.isArray(dna.hookExamples) && dna.hookExamples.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Real examples from your posts:</p>
              {dna.hookExamples.map((ex: string, i: number) => (
                <div key={i} className="bg-muted/20 rounded-xl px-3 py-2 text-xs text-foreground italic">"{ex}"</div>
              ))}
            </div>
          )}
        </div>

        {/* CTA Style */}
        <div className="bg-card border border-card-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">CTA Style</p>
          </div>
          <p className="text-sm text-foreground">{dna.ctaStyle}</p>
          {Array.isArray(dna.ctaExamples) && dna.ctaExamples.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Real examples from your posts:</p>
              {dna.ctaExamples.map((ex: string, i: number) => (
                <div key={i} className="bg-muted/20 rounded-xl px-3 py-2 text-xs text-foreground italic">"{ex}"</div>
              ))}
            </div>
          )}
        </div>

        {/* Content Structure */}
        <div className="bg-card border border-card-border rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Content Structure</p>
          </div>
          <p className="text-sm text-foreground font-medium">{dna.contentStructure}</p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-muted/20 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Format</p>
              <p className="text-xs text-foreground font-bold mt-0.5">{dna.dominantFormat}</p>
            </div>
            <div className="bg-muted/20 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Frequency</p>
              <p className="text-xs text-foreground font-bold mt-0.5">{dna.postingFrequency}</p>
            </div>
          </div>
        </div>

        {/* Tone + Themes */}
        <div className="bg-card border border-card-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-pink-400" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Tone + Themes</p>
          </div>
          <p className="text-xs text-muted-foreground">{dna.toneOfVoice}</p>
          {Array.isArray(dna.topThemes) && (
            <div className="flex flex-wrap gap-1.5">
              {dna.topThemes.map((t: string, i: number) => (
                <span key={i} className="bg-pink-500/10 border border-pink-500/25 text-pink-300 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">{t}</span>
              ))}
            </div>
          )}
          {Array.isArray(dna.engagementTriggers) && (
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold mb-1.5">Engagement Triggers:</p>
              <div className="flex flex-wrap gap-1.5">
                {dna.engagementTriggers.map((t: string, i: number) => (
                  <span key={i} className="bg-green-500/10 border border-green-500/25 text-green-300 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scorecard */}
      <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Content Scorecard</p>
        </div>
        <div className="space-y-4">
          {SCORE_FIELDS.map(({ key, label }) => (
            <ScoreBar key={key} label={label} score={sc[key] ?? 0} feedback="" />
          ))}
        </div>
      </div>

      {/* Weaknesses */}
      {Array.isArray(dna.weaknesses) && dna.weaknesses.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Content Weaknesses Detected</p>
          </div>
          <div className="space-y-2">
            {dna.weaknesses.map((w: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">{w}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement plan */}
      {Array.isArray(profile.improvements) && profile.improvements.length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">AI Improvement Plan</p>
          </div>
          <div className="space-y-3">
            {profile.improvements.map((imp: any, i: number) => (
              <div key={i} className="bg-muted/20 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">{imp.area}</span>
                </div>
                <p className="text-xs text-red-400 flex items-start gap-1.5"><XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{imp.issue}</p>
                <p className="text-xs text-green-400 flex items-start gap-1.5"><CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{imp.fix}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolResult({ tool, result }: { tool: string; result: any }) {
  const { toast } = useToast();
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied!" }); };

  if (tool === "improve") {
    return (
      <div className="space-y-4 mt-4">
        <div className="bg-green-500/5 border border-green-500/25 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-green-400 uppercase tracking-wider">✓ Improved Version</p>
            <button onClick={() => copy(result.improved)} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"><Copy className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.improved}</p>
        </div>
        {Array.isArray(result.changes) && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">What Changed & Why</p>
            {result.changes.map((c: any, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{c.element}</span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <div className="bg-red-500/5 rounded-lg p-2"><p className="text-[10px] text-red-400 font-semibold mb-0.5">Before</p><p className="text-xs text-muted-foreground">{c.original}</p></div>
                  <div className="bg-green-500/5 rounded-lg p-2"><p className="text-[10px] text-green-400 font-semibold mb-0.5">After</p><p className="text-xs text-foreground">{c.improved}</p></div>
                </div>
                <p className="text-[10px] text-muted-foreground">{c.reason}</p>
              </div>
            ))}
          </div>
        )}
        {result.whyItWillPerform && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1.5">Why This Will Perform Better</p>
            <p className="text-xs text-foreground leading-relaxed">{result.whyItWillPerform}</p>
            {result.expectedLift && <p className="text-xs text-primary font-semibold mt-2">Expected lift: {result.expectedLift}</p>}
          </div>
        )}
      </div>
    );
  }

  if (tool === "hooks") {
    const colorMap: Record<string, string> = {
      Curiosity: "bg-purple-500/10 border-purple-500/30 text-purple-300",
      Controversy: "bg-red-500/10 border-red-500/30 text-red-300",
      Storytelling: "bg-blue-500/10 border-blue-500/30 text-blue-300",
      Authority: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    };
    return (
      <div className="space-y-3 mt-4">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider">4 Hook Rewrites</p>
        {(result.hooks || []).map((h: any, i: number) => (
          <div key={i} className={`border rounded-2xl p-4 space-y-2 ${colorMap[h.style] ?? "bg-card border-card-border text-foreground"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">{h.style}</span>
              <button onClick={() => copy(h.text)} className="p-1.5 rounded-lg hover:bg-black/20 text-current opacity-60 hover:opacity-100 transition-all"><Copy className="w-3 h-3" /></button>
            </div>
            <p className="text-sm font-semibold text-foreground">"{h.text}"</p>
            <p className="text-[10px] opacity-70 leading-relaxed">{h.explanation}</p>
          </div>
        ))}
        {result.bestPick && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3.5">
            <p className="text-xs font-bold text-primary mb-0.5">✨ Best Pick: {result.bestPick}</p>
            <p className="text-xs text-muted-foreground">{result.bestPickReason}</p>
          </div>
        )}
      </div>
    );
  }

  if (tool === "score") {
    const scores = result.scores || {};
    const fields = [
      { key: "hook", label: "Hook" },
      { key: "engagement", label: "Engagement" },
      { key: "clarity", label: "Clarity" },
      { key: "retention", label: "Retention" },
      { key: "cta", label: "CTA" },
    ];
    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-center gap-3">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${(result.overall ?? 0) >= 70 ? "bg-green-500/10 border-green-500/40" : (result.overall ?? 0) >= 50 ? "bg-primary/10 border-primary/40" : "bg-red-500/10 border-red-500/40"}`}>
            <span className={`text-xl font-black ${(result.overall ?? 0) >= 70 ? "text-green-400" : (result.overall ?? 0) >= 50 ? "text-primary" : "text-red-400"}`}>{result.overall}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Overall Content Score</p>
            <p className={`text-xs font-semibold ${result.verdict === "Strong" ? "text-green-400" : result.verdict === "Needs Work" ? "text-yellow-400" : "text-red-400"}`}>{result.verdict}</p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-4 space-y-4">
          {fields.map(({ key, label }) => (
            <ScoreBar key={key} label={label} score={scores[key]?.score ?? 0} feedback={scores[key]?.feedback ?? ""} />
          ))}
        </div>
        {result.topIssue && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3.5 space-y-1">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Top Issue</p>
            <p className="text-xs text-foreground">{result.topIssue}</p>
          </div>
        )}
        {result.quickFix && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3.5 space-y-1">
            <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Quick Fix</p>
            <p className="text-xs text-foreground">{result.quickFix}</p>
          </div>
        )}
      </div>
    );
  }

  if (tool === "abtest") {
    return (
      <div className="space-y-5 mt-4">
        <div>
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">3 Hook Variants to Test</p>
          <div className="space-y-2">
            {(result.hooks || []).map((h: any, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center">{h.variant}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold capitalize">{h.angle}</span>
                  </div>
                  <button onClick={() => copy(h.text)} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                </div>
                <p className="text-xs text-foreground font-medium">"{h.text}"</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">3 Caption Variants to Test</p>
          <div className="space-y-2">
            {(result.captions || []).map((c: any, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black flex items-center justify-center">{c.variant}</span>
                  <button onClick={() => copy(c.text)} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">2 CTA Variants to Test</p>
          <div className="grid grid-cols-2 gap-2">
            {(result.ctas || []).map((c: any, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-300 text-[9px] font-black flex items-center justify-center">{c.variant}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground">{c.type}</span>
                    <button onClick={() => copy(c.text)} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                  </div>
                </div>
                <p className="text-xs text-foreground">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
        {result.recommendation && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3.5">
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Recommendation</p>
            <p className="text-xs text-foreground leading-relaxed">{result.recommendation}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function MethodologySection({ useAdmin, activeClientId, user }: { useAdmin: boolean; activeClientId: string; user: any }) {
  const [profileUrl, setProfileUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [toolInputMode, setToolInputMode] = useState<"paste" | "url">("paste");
  const [toolContent, setToolContent] = useState("");
  const [reelUrl, setReelUrl] = useState("");
  const [reelFetching, setReelFetching] = useState(false);
  const [toolResult, setToolResult] = useState<any>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [activeView, setActiveView] = useState<"new" | "history">("new");
  const { toast } = useToast();
  const qcM = useQueryClient();

  const { data: methodologyHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/history?tool=methodology"],
    enabled: !useAdmin,
  });

  const handleFetchReel = async () => {
    if (!reelUrl.trim()) return toast({ title: "Enter a reel URL", variant: "destructive" });
    setReelFetching(true);
    try {
      const data = await apiRequest("POST", "/api/methodology/scrape-reel", { reelUrl: reelUrl.trim() });
      if (data.caption) {
        setToolContent(data.caption);
        setToolInputMode("paste");
        toast({ title: "Caption fetched!", description: "The reel caption has been loaded. Now run the tool." });
      } else {
        toast({ title: "No caption found", description: "The reel may be private or have no caption.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Failed to fetch reel", description: err.message, variant: "destructive" });
    } finally {
      setReelFetching(false);
    }
  };

  const handleAnalyze = async () => {
    if (!profileUrl.trim()) return toast({ title: "Enter your Instagram URL", variant: "destructive" });
    setAnalyzing(true);
    setProfile(null);
    setActiveTool(null);
    setToolResult(null);
    try {
      const data = await apiRequest("POST", "/api/methodology/analyze", { profileUrl: normalizeInstagramUrl(profileUrl) });
      setProfile(data);
      toast({ title: "Content DNA Profile Ready!", description: `Analysed ${data?.handle}'s methodology from their recent posts.` });
      if (!useAdmin && data?.handle) {
        apiRequest("POST", "/api/ai/history", {
          tool: "methodology",
          title: `@${data.handle} — Content DNA`,
          inputs: { profileUrl: profileUrl.trim(), handle: data.handle },
          output: { contentDNA: data.contentDNA, handle: data.handle, postCount: data.postCount },
        }).then(() => qcM.invalidateQueries({ queryKey: ["/api/ai/history?tool=methodology"] })).catch(() => { });
      }
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunTool = async () => {
    if (!toolContent.trim() || !activeTool) return;
    setToolLoading(true);
    setToolResult(null);
    try {
      const data = await apiRequest("POST", "/api/methodology/improve", {
        content: toolContent.trim(),
        tool: activeTool,
        dna: profile?.contentDNA ?? null,
      });
      setToolResult(data);
    } catch (err: any) {
      toast({ title: "Tool failed", description: err.message, variant: "destructive" });
    } finally {
      setToolLoading(false);
    }
  };

  const currentTool = METHODOLOGY_TOOLS.find(t => t.id === activeTool);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex rounded-xl border border-border overflow-hidden w-fit">
        <button
          onClick={() => setActiveView("new")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors ${activeView === "new" ? "bg-primary/10 text-primary border-r border-border" : "text-muted-foreground hover:text-foreground border-r border-border"}`}
          data-testid="tab-new-methodology"
        >
          <Dna className="w-3.5 h-3.5" />New Analysis
        </button>
        <button
          onClick={() => setActiveView("history")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors ${activeView === "history" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-history-methodology"
        >
          <Clock className="w-3.5 h-3.5" />History
          {methodologyHistory.length > 0 && (
            <span className="ml-1 text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-full px-1.5">{methodologyHistory.length}</span>
          )}
        </button>
      </div>

      {activeView === "history" ? (
        methodologyHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No past analyses yet</p>
            <p className="text-xs text-muted-foreground">Analyse your first profile and it will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {methodologyHistory.map((item: any) => (
              <div key={item.id} className="bg-card border border-card-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
                    <Dna className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()} · {item.inputs?.handle ? `@${item.inputs.handle}` : item.inputs?.profileUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setProfileUrl(item.inputs?.profileUrl || ""); setActiveView("new"); }}
                    className="text-xs text-primary hover:underline font-semibold"
                  >Re-run</button>
                  <button
                    onClick={() => { apiRequest("DELETE", `/api/ai/history/${item.id}`).then(() => qcM.invalidateQueries({ queryKey: ["/api/ai/history?tool=methodology"] })); }}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {/* Profile URL input */}
          <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <Dna className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Build Your Content DNA Profile</p>
                <p className="text-xs text-muted-foreground">Enter your Instagram URL — AI scrapes your posts and reverse-engineers your exact methodology</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={profileUrl}
                onChange={e => setProfileUrl(e.target.value)}
                placeholder="https://instagram.com/yourusername"
                className="flex-1 h-9 text-sm"
                data-testid="input-methodology-url"
                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
              />
              <Button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="h-9 px-4 gap-2"
                data-testid="button-analyze-methodology"
              >
                {analyzing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analysing…</> : <><Sparkles className="w-3.5 h-3.5" />Analyse My Content</>}
              </Button>
            </div>
            {analyzing && (
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 text-center">
                <p className="text-xs text-violet-300">Scraping your last 30 posts and reverse-engineering your content methodology…</p>
                <p className="text-[10px] text-muted-foreground mt-1">This usually takes 15–30 seconds</p>
              </div>
            )}
          </div>

          {/* DNA Profile */}
          {profile && <DNAProfile profile={profile} />}

          {/* AI Tools */}
          {profile && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold text-foreground">AI Content Tools</p>
                <p className="text-xs text-muted-foreground">— use your Content DNA to improve your content</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {METHODOLOGY_TOOLS.map(tool => {
                  const Icon = tool.icon;
                  const isActive = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => { setActiveTool(isActive ? null : tool.id); setToolResult(null); setToolContent(""); setToolInputMode("paste"); setReelUrl(""); }}
                      data-testid={`tool-${tool.id}`}
                      className={`group relative overflow-hidden rounded-2xl border text-left p-4 flex flex-col gap-3 transition-all ${isActive ? `${tool.border} bg-gradient-to-br ${tool.color}` : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"}`}
                    >
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tool.color} border ${tool.border} flex items-center justify-center transition-all`}>
                        <Icon className={`w-4 h-4 ${tool.text}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground mb-0.5">{tool.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{tool.desc}</p>
                      </div>
                      {isActive && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary opacity-80" />}
                    </button>
                  );
                })}
              </div>

              {/* Active tool interface */}
              {activeTool && currentTool && (
                <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <currentTool.icon className={`w-4 h-4 ${currentTool.text}`} />
                      <p className="text-sm font-bold text-foreground">{currentTool.label}</p>
                    </div>
                    {/* Toggle: Paste or URL */}
                    <div className="flex items-center gap-1 bg-muted/30 border border-card-border rounded-xl p-1">
                      <button
                        onClick={() => setToolInputMode("paste")}
                        data-testid="toggle-paste-mode"
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${toolInputMode === "paste" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Paste Content
                      </button>
                      <button
                        onClick={() => setToolInputMode("url")}
                        data-testid="toggle-url-mode"
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${toolInputMode === "url" ? "bg-pink-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Instagram className="w-3 h-3" />
                        Reel URL
                      </button>
                    </div>
                  </div>

                  {toolInputMode === "paste" ? (
                    <>
                      <textarea
                        value={toolContent}
                        onChange={e => setToolContent(e.target.value)}
                        placeholder={currentTool.placeholder}
                        className="w-full bg-muted/20 border border-card-border rounded-xl p-3 text-sm text-foreground resize-none h-32 outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
                        data-testid="textarea-tool-content"
                      />
                      <AiRefineButton text={toolContent} onAccept={setToolContent} context="social media content for competitor analysis" />
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground">Enter an Instagram Reel URL — AI will fetch the caption and load it for analysis</p>
                      <div className="flex gap-2">
                        <Input
                          value={reelUrl}
                          onChange={e => setReelUrl(e.target.value)}
                          placeholder="https://www.instagram.com/reel/..."
                          className="flex-1 h-9 text-sm"
                          data-testid="input-reel-url"
                          onKeyDown={e => e.key === "Enter" && handleFetchReel()}
                        />
                        <Button
                          onClick={handleFetchReel}
                          disabled={reelFetching || !reelUrl.trim()}
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 gap-1.5 border-pink-500/40 text-pink-400 hover:bg-pink-500/10"
                          data-testid="button-fetch-reel"
                        >
                          {reelFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Instagram className="w-3.5 h-3.5" />}
                          {reelFetching ? "Fetching…" : "Fetch Caption"}
                        </Button>
                      </div>
                      {toolContent && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                          <p className="text-[10px] text-green-400 font-semibold mb-1">Caption loaded — ready to run</p>
                          <p className="text-xs text-muted-foreground line-clamp-3">{toolContent}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleRunTool}
                    disabled={toolLoading || !toolContent.trim()}
                    className="gap-2"
                    data-testid="button-run-tool"
                  >
                    {toolLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running…</> : <><Sparkles className="w-3.5 h-3.5" />Run {currentTool.label}</>}
                  </Button>
                  {toolResult && <ToolResult tool={activeTool} result={toolResult} />}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CompetitorStudy({ useAdmin = false }: { useAdmin?: boolean }) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<"competitor" | "niche" | "methodology" | "virality" | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");

  const Layout = useAdmin ? AdminLayout : ClientLayout;
  const activeClientId = useAdmin ? selectedClient : (user?.id ?? "");

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-3" data-tour="competitor-main">
          {activeSection && (
            <button
              onClick={() => setActiveSection(null)}
              className="w-8 h-8 rounded-xl bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors flex-shrink-0"
              data-testid="button-back"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
          )}
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">
                {activeSection === "competitor"
                  ? "Competitor Analysis"
                  : activeSection === "niche"
                    ? "What's Working in My Niche"
                    : activeSection === "methodology"
                      ? "Use My Own Methodology"
                      : activeSection === "virality"
                        ? "Virality Tester"
                        : "Competitor Study"}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {activeSection === "competitor"
                ? "Your account vs one competitor · 9-section deep-dive · Steal their strategy"
                : activeSection === "niche"
                  ? "Niche Intelligence Engine · Up to 5 competitors · Full niche map"
                  : activeSection === "methodology"
                    ? "Content DNA Profile · AI Content Improver · Hook Optimizer · A/B Test Generator"
                    : activeSection === "virality"
                      ? "Retention Analyser · Drop-Off Detection · Hook Rewriter · Make It Viral"
                      : "Choose a study mode below"}
            </p>
          </div>
          <PageTourButton pageKey="competitor" className="ml-auto flex-shrink-0" />
        </div>

        {/* Landing — four option cards */}
        {!activeSection && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Competitor Analysis card */}
            <button
              onClick={() => setActiveSection("competitor")}
              data-testid="tab-competitor-analysis"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-pink-500/40 hover:bg-pink-500/5 transition-all text-left p-6 flex flex-col gap-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                <Instagram className="w-6 h-6 text-pink-400" />
              </div>
              <div className="flex-1">
                <p className="text-base font-black text-foreground mb-1.5">Competitor Analysis</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Your account vs one competitor. Get a 9-section deep-dive — reels, hooks, audience, gaps, and a full strategy to steal their approach.</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-pink-400 font-semibold">
                Open <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Niche Intelligence card */}
            <button
              onClick={() => setActiveSection("niche")}
              data-testid="tab-niche-intelligence"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left p-6 flex flex-col gap-5"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_rgba(212,180,97,0.15)] transition-all">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <div className="relative flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-base font-black text-foreground">What's Working in My Niche</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">Add 3–5 competitor URLs and your niche. Get the full intelligence map — trends, gaps, hooks, audience desires, 20 content angles, and a 30-day growth playbook.</p>
              </div>
              <div className="relative flex items-center gap-1.5 text-xs text-primary font-semibold">
                Open <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Use My Own Methodology card */}
            <button
              onClick={() => setActiveSection("methodology")}
              data-testid="tab-methodology"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left p-6 flex flex-col gap-5"
            >
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <Dna className="w-6 h-6 text-violet-400" />
              </div>
              <div className="relative flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-base font-black text-foreground">Use My Own Methodology</p>
                  <span className="bg-violet-500/20 border border-violet-500/30 rounded-full px-2 py-0.5 text-[9px] font-bold text-violet-300 uppercase tracking-wider">NEW</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">Analyse your own posts to build a Content DNA Profile — then use AI tools to improve captions, optimize hooks, score content and generate A/B test variants.</p>
              </div>
              <div className="relative flex items-center gap-1.5 text-xs text-violet-400 font-semibold">
                Open <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Virality Tester card */}
            <button
              onClick={() => setActiveSection("virality")}
              data-testid="tab-virality-tester"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-red-500/40 hover:bg-red-500/5 transition-all text-left p-6 flex flex-col gap-5"
            >
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <Flame className="w-6 h-6 text-red-400" />
              </div>
              <div className="relative flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-base font-black text-foreground">Virality Tester</p>
                  <span className="bg-red-500/20 border border-red-500/30 rounded-full px-2 py-0.5 text-[9px] font-bold text-red-300 uppercase tracking-wider">NEW</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">Paste your script or drop a reel URL. Get a second-by-second retention curve, drop-off detection, hook analysis, emotion mapping, and a viral rewrite — before you post.</p>
              </div>
              <div className="relative flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                Open <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        )}

        {/* Section content */}
        {activeSection === "competitor" && (
          <CompetitorAnalysisSection useAdmin={useAdmin} activeClientId={activeClientId} user={user} />
        )}
        {activeSection === "niche" && (
          <NicheIntelligenceSection useAdmin={useAdmin} activeClientId={activeClientId} user={user} />
        )}
        {activeSection === "methodology" && (
          <MethodologySection useAdmin={useAdmin} activeClientId={activeClientId} user={user} />
        )}
        {activeSection === "virality" && (
          <ViralityTester useAdmin={useAdmin} activeClientId={activeClientId} user={user} />
        )}

      </div>
    </Layout>
  );
}
