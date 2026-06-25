import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  Users, MessageSquare, Calendar, ArrowRight, ChevronRight, Phone,
  Globe, Quote, FolderKanban, Star, TrendingUp, TrendingDown, Minus,
  Mail, Smartphone, GitBranch, Bell, Activity, UserCheck, ClipboardCheck,
  Zap, PenTool, BarChart2, DollarSign, Target, Send, UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ── Constants ────────────────────────────────────────────────────────────────
const QUOTES = [
  "Success is not the key to happiness. Happiness is the key to success.",
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Success usually comes to those who are too busy to be looking for it.",
  "Dreams don't work unless you do.",
  "The only way to do great work is to love what you do.",
  "It always seems impossible until it's done.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Leadership is not about being in charge. It's about taking care of those in your charge.",
  "The key to success is to focus on goals, not obstacles.",
  "Believe you can and you're halfway there.",
  "Act as if what you do makes a difference. It does.",
  "You don't have to be great to start, but you have to start to be great.",
  "Don't stop when you're tired. Stop when you're done.",
  "Opportunities don't happen, you create them.",
  "The road to success and the road to failure are almost exactly the same.",
];

const PLAN_COLORS: Record<string, string> = {
  free: "#64748b",
  starter: "#3b82f6",
  growth: "#8b5cf6",
  pro: "#f97316",
  elite: "#d4b461",
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e1306c",
  youtube: "#ff0000",
  tiktok: "#69c9d0",
  twitter: "#1da1f2",
  linkedin: "#0077b5",
};

const AI_FEATURE_LABELS: Record<string, string> = {
  ai_ideas: "Content Ideas",
  hashtag_suggestions: "Hashtags",
  ai_coach: "AI Coach",
  carousel: "Carousel",
  carousel_image: "Carousel Image",
  ai_report: "Content Report",
  competitor: "Competitor Intel",
  competitor_reels: "Reel Compare",
  steal_strategy: "Steal Strategy",
  content_ideas: "Content from Comp",
  content_intel: "Daily Ideas",
  content_develop: "Script Dev",
  niche_analysis: "Niche Analysis",
};

function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

// ── Sub-components ───────────────────────────────────────────────────────────
function WorldClock({ city, timezone }: { city: string; timezone: string }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      setTime(new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: timezone }).format(new Date()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone]);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: timezone }).format(new Date());
  return (
    <div className="flex-1 min-w-0 text-center">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{city}</p>
      <p className="text-xl font-bold text-foreground font-mono tabular-nums mt-0.5">{time}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5" /> {label}
    </p>
  );
}

function MiniSparkline({ data, color = "#d4b461" }: { data: { count: number }[]; color?: string }) {
  if (!data.length) return <div className="h-10 flex items-center"><div className="w-full h-0.5 bg-border rounded-full" /></div>;
  const id = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="count" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-card-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === "number" ? (p.value % 1 === 0 ? p.value : p.value.toFixed(1)) : p.value}
        </p>
      ))}
    </div>
  );
};

function DeltaCard({ label, icon: Icon, iconColor, thisWeek, lastWeek, delta, pct }: any) {
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <Card className="border border-card-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${iconColor}20` }}>
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${flat ? "bg-muted text-muted-foreground" : up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {flat ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {pct != null ? `${up ? "+" : ""}${pct}%` : "—"}
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{thisWeek}</p>
        <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-1">vs {lastWeek} last week</p>
      </CardContent>
    </Card>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface OverviewStats {
  signupsThisMonth: number;
  signupsTrend: { date: string; count: number }[];
  totalMembers: number;
  membersByPlan: Record<string, number>;
  activeToday: number;
  emailStats: { campaignsSent: number; openRate: number | null; clickRate: number | null; totalSent: number };
  smsSentThisMonth: number;
  surveyCompletionRate: number;
  surveyCompleted: number;
  referralConversions: number;
  referralRegistered: number;
  npsTrend: { month: string; avg_nps: number; count: number }[];
  npsScore: number | null;
  unreadMessages: number;
  weeklyDigest: {
    signups: { thisWeek: number; lastWeek: number; delta: number; pct: number | null };
    messages: { thisWeek: number; lastWeek: number; delta: number; pct: number | null };
    calls: { thisWeek: number; lastWeek: number; delta: number; pct: number | null };
  };
  topEngagedMembers: { name: string; plan: string; messages_sent: number; tasks_done: number }[];
  aiUsage: { features: { type: string; label: string; uses: number; credits_used: number }[]; totalUses: number; totalCredits: number };
  contentActivity: { postsThisWeek: number; byPlatform: Record<string, number> };
  mrr: { estimated: number; goal: number; byPlan: { plan: string; count: number }[] };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data: clients, isLoading: clientsLoading } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: conversations } = useQuery<any[]>({ queryKey: ["/api/conversations"] });
  const { data: projectTracker } = useQuery<any>({ queryKey: ["/api/admin/project-trackers"] });
  const { data: allFeedback } = useQuery<any[]>({ queryKey: ["/api/admin/feedback"] });
  const { data: stats } = useQuery<OverviewStats>({ queryKey: ["/api/admin/overview-stats"] });

  const eliteClients = (clients || []).filter((c: any) => c.tier === "elite");
  const dailyQuote = getDailyQuote();

  const planChartData = stats
    ? Object.entries(stats.membersByPlan).filter(([, c]) => c > 0).map(([plan, count]) => ({
        plan: plan.charAt(0).toUpperCase() + plan.slice(1), count, color: PLAN_COLORS[plan],
      }))
    : [];

  const contentPlatformData = stats
    ? Object.entries(stats.contentActivity.byPlatform).filter(([, c]) => c > 0).map(([plat, count]) => ({
        platform: plat.charAt(0).toUpperCase() + plat.slice(1), count, color: PLATFORM_COLORS[plat] || "#6b7280",
      }))
    : [];

  const aiFeatureData = stats?.aiUsage.features.map((f) => ({
    name: AI_FEATURE_LABELS[f.type] || f.type,
    uses: f.uses,
    credits: f.credits_used,
  })) || [];

  const npsColor = !stats?.npsScore && stats?.npsScore !== 0 ? "#64748b"
    : stats.npsScore >= 50 ? "#10b981"
    : stats.npsScore >= 0 ? "#d4b461"
    : "#ef4444";

  const mrrPct = stats ? Math.min(Math.round((stats.mrr.estimated / stats.mrr.goal) * 100), 100) : 0;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Admin Overview</h1>
            <p className="text-muted-foreground mt-1">Platform mission control</p>
          </div>
          {stats && stats.unreadMessages > 0 && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              <Bell className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-sm font-semibold text-red-400">{stats.unreadMessages} unread</span>
              <Link href="/admin/chat" className="text-xs text-red-400/70 hover:text-red-400 underline underline-offset-2">View</Link>
            </div>
          )}
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Email Broadcast", icon: Send, href: "/admin/email-marketing", color: "#f97316" },
            { label: "Add Elite Member", icon: UserPlus, href: "/admin/clients", color: "#d4b461" },
            { label: "Community Post", icon: Users, href: "/admin/community", color: "#8b5cf6" },
            { label: "View Messages", icon: MessageSquare, href: "/admin/chat", color: "#10b981" },
          ].map(({ label, icon: Icon, href, color }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 p-3 rounded-xl border border-card-border bg-card hover:border-primary/30 hover:bg-accent transition-all group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* ── World Clocks + Daily Quote ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <Card className="border border-card-border lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">World Time</p>
              </div>
              <div className="flex items-start gap-4">
                <WorldClock city="Dubai" timezone="Asia/Dubai" />
                <div className="w-px h-12 bg-border self-center" />
                <WorldClock city="London" timezone="Europe/London" />
                <div className="w-px h-12 bg-border self-center" />
                <WorldClock city="New York" timezone="America/New_York" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
              <Quote className="w-4 h-4 text-primary/60 mb-2" />
              <p className="text-sm font-medium text-foreground leading-relaxed italic">"{dailyQuote}"</p>
              <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">Daily Motivation</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Platform Pulse ──────────────────────────────────────────────── */}
        <SectionLabel icon={Activity} label="Platform Pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="border border-card-border overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">New Signups</p>
                {stats && stats.signupsThisMonth > 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <p className="text-3xl font-bold text-foreground tabular-nums">{stats?.signupsThisMonth ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground mb-2">this month</p>
              <MiniSparkline data={stats?.signupsTrend || []} color="#d4b461" />
            </CardContent>
          </Card>

          <Card className="border border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Members</p>
                <Users className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-foreground tabular-nums">{stats?.totalMembers ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground mb-3">all tiers</p>
              <div className="flex gap-1 flex-wrap">
                {stats && Object.entries(stats.membersByPlan).filter(([, c]) => c > 0).map(([plan, count]) => (
                  <span key={plan} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                    style={{ color: PLAN_COLORS[plan], borderColor: PLAN_COLORS[plan] + "40", backgroundColor: PLAN_COLORS[plan] + "15" }}>
                    {count} {plan}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Today</p>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-foreground tabular-nums">{stats?.activeToday ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground mb-3">members engaged</p>
              {stats && stats.totalMembers > 0 && (
                <>
                  <Progress value={(stats.activeToday / stats.totalMembers) * 100} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">{Math.round((stats.activeToday / stats.totalMembers) * 100)}% of total</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">SMS Sent</p>
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-foreground tabular-nums">{stats?.smsSentThisMonth?.toLocaleString() ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">this month</p>
            </CardContent>
          </Card>

          <Card className="border border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email Open Rate</p>
                <Mail className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-foreground tabular-nums">
                {stats?.emailStats.openRate != null ? `${stats.emailStats.openRate}%` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">{stats?.emailStats.campaignsSent ?? 0} campaigns sent</p>
              {stats?.emailStats.openRate != null && <Progress value={stats.emailStats.openRate} className="h-1.5" />}
            </CardContent>
          </Card>

          <Card className="border border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">NPS Score</p>
                <Star className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold tabular-nums" style={{ color: npsColor }}>
                {stats?.npsScore != null ? (stats.npsScore > 0 ? `+${stats.npsScore}` : stats.npsScore) : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mb-1">net promoter score</p>
              <p className="text-[10px]" style={{ color: npsColor }}>
                {stats?.npsScore == null ? "No data yet" : stats.npsScore >= 70 ? "World class" : stats.npsScore >= 50 ? "Excellent" : stats.npsScore >= 0 ? "Good" : "Needs work"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Revenue / MRR ───────────────────────────────────────────────── */}
        <SectionLabel icon={DollarSign} label="Revenue" />
        <Card className="mb-8 border border-card-border bg-[radial-gradient(circle_at_top_right,rgba(212,180,97,0.08),transparent_40%)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estimated MRR</p>
                <p className="text-4xl font-bold text-foreground tabular-nums">
                  ${stats?.mrr.estimated.toLocaleString() ?? "0"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  of ${stats?.mrr.goal.toLocaleString() ?? "10,000"} monthly goal
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {stats?.mrr.byPlan.map((p) => (
                  <div key={p.plan} className="rounded-xl border border-card-border bg-black/20 px-4 py-3 text-center min-w-[70px]">
                    <p className="text-lg font-semibold" style={{ color: PLAN_COLORS[p.plan] }}>{p.count}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 capitalize">{p.plan}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress to goal</span>
                <span className="font-semibold" style={{ color: mrrPct >= 100 ? "#10b981" : mrrPct >= 60 ? "#d4b461" : "#6b7280" }}>{mrrPct}%</span>
              </div>
              <Progress value={mrrPct} className="h-3" />
              <p className="text-[10px] text-muted-foreground">
                Based on plan-confirmed paying users × plan price. Tier pricing: Starter $49 · Growth $99 · Pro $199 · Elite $497
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Weekly Digest ────────────────────────────────────────────────── */}
        <SectionLabel icon={BarChart2} label="Weekly Digest — This Week vs Last Week" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats ? (
            <>
              <DeltaCard label="New Signups" icon={UserPlus} iconColor="#d4b461" {...stats.weeklyDigest.signups} />
              <DeltaCard label="Messages Sent" icon={MessageSquare} iconColor="#3b82f6" {...stats.weeklyDigest.messages} />
              <DeltaCard label="Calls Booked" icon={Phone} iconColor="#10b981" {...stats.weeklyDigest.calls} />
            </>
          ) : (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)
          )}
        </div>

        {/* ── Growth & Distribution ────────────────────────────────────────── */}
        <SectionLabel icon={TrendingUp} label="Growth & Distribution" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border border-card-border">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Signup Trend — Last 14 Days</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {stats?.signupsTrend?.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.signupsTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d4b461" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#d4b461" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="count" name="Signups" stroke="#d4b461" strokeWidth={2}
                      fill="url(#trendGrad)" dot={{ r: 3, fill: "#d4b461", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No signup data yet</div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-card-border">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Member Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {planChartData.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={planChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="plan" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Members" radius={[4, 4, 0, 0]}>
                      {planChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No members yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Top Engaged Members ──────────────────────────────────────────── */}
        <SectionLabel icon={Users} label="Top Engaged Members — Last 30 Days" />
        <Card className="mb-8 border border-card-border">
          <CardContent className="p-0">
            {stats?.topEngagedMembers?.length ? (
              <div className="divide-y divide-border">
                {stats.topEngagedMembers.map((member, i) => {
                  const total = member.messages_sent + member.tasks_done;
                  const max = stats.topEngagedMembers[0].messages_sent + stats.topEngagedMembers[0].tasks_done;
                  const initials = member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors">
                      <span className="text-lg font-bold tabular-nums w-5 text-center" style={{ color: i === 0 ? "#d4b461" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#6b7280" }}>
                        {i + 1}
                      </span>
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: `${PLAN_COLORS[member.plan] || "#64748b"}20`, color: PLAN_COLORS[member.plan] || "#64748b" }}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize flex-shrink-0"
                            style={{ color: PLAN_COLORS[member.plan], borderColor: PLAN_COLORS[member.plan] + "40", backgroundColor: PLAN_COLORS[member.plan] + "15" }}>
                            {member.plan}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <Progress value={(total / max) * 100} className="h-1" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground tabular-nums">{member.messages_sent}</p>
                          <p className="text-[10px] text-muted-foreground">msgs</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground tabular-nums">{member.tasks_done}</p>
                          <p className="text-[10px] text-muted-foreground">tasks</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground text-sm">No engagement data yet</div>
            )}
          </CardContent>
        </Card>

        {/* ── AI Usage + Content Activity ──────────────────────────────────── */}
        <SectionLabel icon={Zap} label="AI & Content Activity" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* AI Usage */}
          <Card className="border border-card-border">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">AI Feature Usage — This Month</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-base font-bold text-foreground tabular-nums">{stats?.aiUsage.totalUses ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">uses</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-foreground tabular-nums">{stats?.aiUsage.totalCredits ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">credits</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {aiFeatureData.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={aiFeatureData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="uses" name="Uses" radius={[0, 4, 4, 0]} fill="#d4b461" opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No AI usage this month</div>
              )}
            </CardContent>
          </Card>

          {/* Content Activity */}
          <Card className="border border-card-border">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Content Posted — This Week</CardTitle>
                <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-center">
                  <p className="text-lg font-bold text-primary tabular-nums">{stats?.contentActivity.postsThisWeek ?? 0}</p>
                  <p className="text-[10px] text-primary/70">total posts</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {contentPlatformData.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={contentPlatformData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="platform" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Posts" radius={[4, 4, 0, 0]}>
                      {contentPlatformData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <PenTool className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">No content posted this week</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── NPS + Campaign Performance ──────────────────────────────────── */}
        <SectionLabel icon={Star} label="Engagement & Campaigns" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border border-card-border">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">NPS Trend — Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {stats?.npsTrend?.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={stats.npsTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Line type="monotone" dataKey="avg_nps" name="Avg NPS" stroke={npsColor} strokeWidth={2.5}
                      dot={{ r: 4, fill: npsColor, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No NPS data yet</div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="border border-card-border flex-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Email Campaigns</p>
                    <p className="text-[11px] text-muted-foreground">{stats?.emailStats.campaignsSent ?? 0} sent · {stats?.emailStats.totalSent?.toLocaleString() ?? 0} delivered</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Open Rate</p>
                    <p className="text-lg font-bold text-orange-400">{stats?.emailStats.openRate != null ? `${stats.emailStats.openRate}%` : "—"}</p>
                    {stats?.emailStats.openRate != null && <Progress value={stats.emailStats.openRate} className="h-1 mt-1" />}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Click Rate</p>
                    <p className="text-lg font-bold text-orange-400">{stats?.emailStats.clickRate != null ? `${stats.emailStats.clickRate}%` : "—"}</p>
                    {stats?.emailStats.clickRate != null && <Progress value={stats.emailStats.clickRate} className="h-1 mt-1" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border border-card-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Referrals</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{stats?.referralConversions ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">conversions</p>
                  <p className="text-[10px] text-emerald-400 mt-1">{stats?.referralRegistered ?? 0} registered</p>
                </CardContent>
              </Card>
              <Card className="border border-card-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ClipboardCheck className="w-3.5 h-3.5 text-blue-400" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Surveys</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{stats?.surveyCompletionRate ?? "—"}%</p>
                  <p className="text-[11px] text-muted-foreground">completion</p>
                  <p className="text-[10px] text-blue-400 mt-1">{stats?.surveyCompleted ?? 0} completed</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ── Project Tracker ─────────────────────────────────────────────── */}
        <Card className="mb-8 border border-card-border bg-[radial-gradient(circle_at_top_left,_rgba(212,180,97,0.14),_transparent_30%),linear-gradient(135deg,#0f0f10_0%,#131314_58%,#171718_100%)] shadow-sm">
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#d4b461]/20 text-[#d4b461] flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Project Tracker command center is live</p>
                <p className="text-sm text-muted-foreground mt-1">Track all Tier 5 client missions, approvals, blockers, and delivery phases in one workspace.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded-2xl border border-card-border bg-black/25 px-4 py-3 text-center">
                <p className="text-lg font-semibold text-foreground">{projectTracker?.metrics?.activeProjects ?? 0}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4b461]">Active</p>
              </div>
              <div className="rounded-2xl border border-card-border bg-black/25 px-4 py-3 text-center">
                <p className="text-lg font-semibold text-foreground">{projectTracker?.metrics?.blockedProjects ?? 0}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4b461]">Blocked</p>
              </div>
              <div className="rounded-2xl border border-card-border bg-black/25 px-4 py-3 text-center">
                <p className="text-lg font-semibold text-foreground">{projectTracker?.metrics?.approvalsPending ?? 0}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4b461]">Approvals</p>
              </div>
              <Link href="/admin/projects" className="inline-flex items-center gap-2 rounded-2xl bg-[#d4b461] px-4 py-3 text-sm font-semibold text-black hover:bg-[#c9a64f] transition-colors">
                Open Project Tracker <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* ── Feedback Summary ────────────────────────────────────────────── */}
        {(allFeedback || []).length > 0 && (() => {
          const rated = (allFeedback || []).filter((f: any) => f.overallRating);
          const avgRating = rated.length ? (rated.reduce((a: number, f: any) => a + f.overallRating, 0) / rated.length).toFixed(1) : "—";
          const npsScored = (allFeedback || []).filter((f: any) => f.npsScore !== null);
          const promoters = npsScored.filter((f: any) => f.npsScore >= 9).length;
          const detractors = npsScored.filter((f: any) => f.npsScore <= 6).length;
          const nps = npsScored.length ? Math.round(((promoters - detractors) / npsScored.length) * 100) : null;
          return (
            <Card className="mb-8 border border-card-border">
              <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Member Feedback</p>
                    <p className="text-sm text-muted-foreground mt-1">{(allFeedback || []).length} response{(allFeedback || []).length !== 1 ? "s" : ""} collected</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="rounded-2xl border border-card-border bg-black/25 px-4 py-3 text-center">
                    <p className="text-lg font-semibold text-foreground">{avgRating}</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-yellow-400">Avg Rating</p>
                  </div>
                  {nps !== null && (
                    <div className="rounded-2xl border border-card-border bg-black/25 px-4 py-3 text-center">
                      <p className={`text-lg font-semibold ${nps >= 50 ? "text-emerald-400" : nps >= 0 ? "text-yellow-400" : "text-red-400"}`}>{nps > 0 ? `+${nps}` : nps}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-yellow-400">NPS</p>
                    </div>
                  )}
                  <Link href="/admin/feedback" className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm font-semibold text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                    View Feedback <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* ── Elite Members + Upcoming Calls ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Elite Members</CardTitle>
                <Link href="/admin/clients" className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientsLoading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : eliteClients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No Elite members yet</p>
                </div>
              ) : (
                eliteClients.slice(0, 5).map((client: any) => {
                  const initials = client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <Link key={client.id} href={`/admin/clients/${client.id}`} data-testid={`client-row-${client.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                      </div>
                      {client.program && (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          {client.program.split(" ").slice(0, 2).join(" ")}
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Upcoming Calls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(clients || [])
                .filter((c: any) => c.nextCallDate && new Date(c.nextCallDate) > new Date())
                .sort((a: any, b: any) => new Date(a.nextCallDate).getTime() - new Date(b.nextCallDate).getTime())
                .slice(0, 5)
                .map((client: any) => {
                  const initials = client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={client.id} data-testid={`upcoming-call-${client.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card-border">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-primary font-medium">{format(new Date(client.nextCallDate), "MMM d 'at' h:mm a")}</p>
                      </div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0" />
                    </div>
                  );
                })}
              {(clients || []).filter((c: any) => c.nextCallDate && new Date(c.nextCallDate) > new Date()).length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No upcoming calls</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Recent Messages ──────────────────────────────────────────────── */}
        {(conversations || []).length > 0 && (
          <Card className="mt-6 border border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Messages</CardTitle>
                <Link href="/admin/chat" className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  Open chat <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(conversations || []).slice(0, 3).map((conv: any) => {
                const initials = conv.client?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                return (
                  <Link key={conv.client?.id} href="/admin/chat" data-testid={`conv-row-${conv.client?.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{conv.client?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage?.content}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex-shrink-0">
                      {conv.lastMessage && format(new Date(conv.lastMessage.createdAt), "MMM d")}
                    </p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
