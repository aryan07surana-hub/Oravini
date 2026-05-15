import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, TrendingUp, Star, UserPlus,
  ArrowUpRight, ArrowDownRight, MessageSquare, Zap, DollarSign, PieChart,
  Film, Mail, Globe, BookOpen, Hash, Target, CalendarDays, BarChart3,
  Instagram, Video, Brain, Activity, Layers, GraduationCap, Smartphone
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const PLAN_COLORS: Record<string, string> = {
  free: "#71717a", starter: "#60a5fa", growth: "#a78bfa", pro: "#34d399", elite: "#d4b461",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free", starter: "Starter ($29)", growth: "Growth ($59)", pro: "Pro ($79)", elite: "Elite ($149)",
};

const CHART_COLORS = ["#d4b461", "#60a5fa", "#a78bfa", "#34d399", "#f472b6", "#fb923c"];

function KpiCard({ label, value, icon: Icon, sub, color }: any) {
  return (
    <Card className="border border-card-border">
      <CardContent className="p-5">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, icon: Icon }: any) {
  return (
    <Card className="border border-card-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-800/50 text-zinc-400 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/analytics"],
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const d = data || {};
  const planBreakdown = d.planBreakdown || [];
  const monthlySignups = d.monthlySignups || [];
  const surveyPlatforms = d.surveyPlatforms || [];
  const surveyFields = d.surveyFields || [];
  const leadSources = d.leadSources || [];
  const aiTools = d.aiTools || [];
  const contentByPlatform = d.contentByPlatform || [];
  const contentByFunnel = d.contentByFunnel || [];
  const dmLeadsByStatus = d.dmLeadsByStatus || [];

  const totalUsers = d.totalUsers || 0;
  const mrr = d.mrr || 0;
  const nps = d.nps;
  const avgRating = d.avgRating || "—";
  const totalLeads = d.totalLeads || 0;
  const totalFeedback = d.totalFeedback || 0;
  const churnCount = d.churnCount || 0;
  const totalClicks = d.totalClicks || 0;
  const totalSignups = d.totalSignups || 0;
  const totalConversions = d.totalConversions || 0;
  const totalCredits = d.totalCredits || 0;
  const contentPosts = d.contentPosts || 0;
  const contentViews = d.contentViews || 0;
  const contentLikes = d.contentLikes || 0;
  const totalWebinars = d.totalWebinars || 0;
  const totalVideos = d.totalVideos || 0;
  const emailSent = d.emailSent || 0;
  const emailOpened = d.emailOpened || 0;
  const totalCommunityPosts = d.totalCommunityPosts || 0;
  const totalBookings = d.totalBookings || 0;
  const dmTotalTriggers = d.dmTotalTriggers || 0;
  const dmActiveTriggers = d.dmActiveTriggers || 0;
  const videoViews = d.videoViews || 0;
  const videoAvgCompletion = d.videoAvgCompletion || 0;
  const videoCtaClicks = d.videoCtaClicks || 0;
  const igProfilesCount = d.igProfilesCount || 0;
  const igAvgFollowers = d.igAvgFollowers || 0;
  const igMaxFollowers = d.igMaxFollowers || 0;
  const readingTotalMaterials = d.readingTotalMaterials || 0;
  const readingCompleted = d.readingCompleted || 0;
  const readingInProgress = d.readingInProgress || 0;
  const readingMaxScore = d.readingMaxScore || 0;
  const readingAvgScore = d.readingAvgScore || 0;
  const readingTotalDays = d.readingTotalDays || 0;
  const readingBooksCompleted = d.readingBooksCompleted || 0;

  const avgCreditsPerUser = totalUsers > 0 ? Math.round(totalCredits / totalUsers) : 0;
  const totalPaid = planBreakdown.filter((r: any) => r.plan !== "free").reduce((a: number, r: any) => a + r.count, 0);
  const conversionRate = totalUsers > 0 ? Math.round((totalPaid / totalUsers) * 100) : 0;
  const emailOpenRate = emailSent > 0 ? Math.round((emailOpened / emailSent) * 100) : 0;
  const referConvRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 100) : 0;
  const allDmLeads = dmLeadsByStatus.reduce((a: number, r: any) => a + r.count, 0);
  const readingCompletionRate = readingTotalMaterials > 0 ? Math.round((readingCompleted / readingTotalMaterials) * 100) : 0;

  const pieData = planBreakdown.map((r: any) => ({
    name: PLAN_LABELS[r.plan] || r.plan, value: r.count, color: PLAN_COLORS[r.plan] || "#71717a",
  }));

  const formatMrr = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n}`;
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform-wide metrics and trends</p>
        </div>

        {/* ═══════════ KPI ROW 1: CORE ═══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total Users" value={totalUsers.toLocaleString()} icon={Users} color="bg-primary/10 text-primary" sub={`${totalPaid} paid (${conversionRate}%)`} />
          <KpiCard label="Monthly Revenue" value={formatMrr(mrr)} icon={DollarSign} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" sub="MRR from paid plans" />
          <KpiCard label="NPS Score" value={nps !== null ? (nps > 0 ? `+${nps}` : nps) : "—"} icon={Star} color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" sub={`${totalFeedback} responses · ${avgRating} avg rating`} />
          <KpiCard label="Lead Conversion" value={`${conversionRate}%`} icon={TrendingUp} color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" sub={`${totalLeads} leads captured`} />
        </div>

        {/* ═══════════ KPI ROW 2: ENGAGEMENT ═══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Content Published" value={contentPosts.toLocaleString()} icon={Film} color="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" sub={`${contentViews.toLocaleString()} views · ${contentLikes.toLocaleString()} likes`} />
          <KpiCard label="Webinars & Videos" value={(totalWebinars + totalVideos).toLocaleString()} icon={BarChart3} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" sub={`${totalWebinars} webinars · ${totalVideos} videos`} />
          <KpiCard label="Email Open Rate" value={emailSent > 0 ? `${emailOpenRate}%` : "—"} icon={Mail} color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" sub={`${emailSent.toLocaleString()} sent · ${emailOpened.toLocaleString()} opened`} />
          <KpiCard label="Referral Conv. Rate" value={`${referConvRate}%`} icon={UserPlus} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" sub={`${totalConversions} from ${totalClicks} clicks`} />
        </div>

        {/* ═══════════ CHARTS ROW 1 ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                User Growth (12mo)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlySignups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                  <TrendingUp className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">No signup data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlySignups} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4b461" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#d4b461" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#d4b461" }} />
                    <Area type="monotone" dataKey="signups" stroke="#d4b461" fill="url(#signupGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                  <PieChart className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">No plan data</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={220}>
                    <RePieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }} />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5">
                    {pieData.map((entry: any) => (
                      <div key={entry.name} className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: entry.color }} />
                        <span className="text-xs text-muted-foreground min-w-[80px]">{entry.name}</span>
                        <span className="text-xs font-semibold text-foreground">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ═══════════ CHARTS ROW 2 ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue by Plan */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Revenue by Plan (MRR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planBreakdown.filter((r: any) => r.plan !== "free").length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                  <DollarSign className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">No paid plans yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={planBreakdown.filter((r: any) => r.plan !== "free").map((r: any) => {
                    const prices: Record<string, number> = { starter: 29, growth: 59, pro: 79, elite: 149 };
                    return { name: PLAN_LABELS[r.plan] || r.plan, revenue: r.count * (prices[r.plan] || 0), color: PLAN_COLORS[r.plan] };
                  })} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }} formatter={(value: any) => [`$${value}`, "MRR"]} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {planBreakdown.filter((r: any) => r.plan !== "free").map((entry: any, i: number) => (
                        <Cell key={i} fill={PLAN_COLORS[entry.plan] || "#71717a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* AI Tool Usage */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-yellow-400" />
                Top AI Tools Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiTools.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                  <Brain className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">No AI usage yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={aiTools} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={18}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="tool" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="sessions" fill="#d4b461" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ═══════════ CONTENT PERFORMANCE ═══════════ */}
        {(contentByPlatform.length > 0 || contentByFunnel.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {contentByPlatform.length > 0 && (
              <Card className="border border-card-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-pink-400" />
                    Content by Platform
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {contentByPlatform.map((p: any, i: number) => (
                      <div key={p.platform} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-foreground capitalize">{p.platform}</span>
                          <span className="text-xs text-muted-foreground">{p.posts} posts</span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{p.avg_views.toLocaleString()} avg views</span>
                          <span>{p.avg_likes.toLocaleString()} avg likes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {contentByFunnel.length > 0 && (
              <Card className="border border-card-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-400" />
                    Content by Funnel Stage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={contentByFunnel} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barSize={32}>
                      <XAxis dataKey="funnel_stage" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="posts" radius={[6, 6, 0, 0]} fill="#a78bfa" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════ SURVEY INSIGHTS ═══════════ */}
        {(surveyPlatforms.length > 0 || surveyFields.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {surveyPlatforms.length > 0 && (
              <Card className="border border-card-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    Member Platforms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {surveyPlatforms.map((p: any, i: number) => {
                      const total = surveyPlatforms.reduce((a: number, x: any) => a + x.count, 0);
                      const pct = Math.round((p.count / total) * 100);
                      return (
                        <div key={p.platform}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-foreground font-medium capitalize">{p.platform}</span>
                            <span className="text-muted-foreground">{p.count} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            {surveyFields.length > 0 && (
              <Card className="border border-card-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Hash className="w-4 h-4 text-violet-400" />
                    Top Niches / Fields
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {surveyFields.map((f: any, i: number) => {
                      const total = surveyFields.reduce((a: number, x: any) => a + x.count, 0);
                      const pct = Math.round((f.count / total) * 100);
                      return (
                        <div key={f.field}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-foreground font-medium capitalize">{f.field}</span>
                            <span className="text-muted-foreground">{f.count} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════ DM + VIDEO + IG + READING ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* DM Automation */}
          <Card className="border border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                DM Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl font-bold text-foreground">{allDmLeads.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total leads captured</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Active triggers</span>
                  <span className="font-semibold text-foreground">{dmActiveTriggers}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Trigger fires</span>
                  <span className="font-semibold text-foreground">{dmTotalTriggers.toLocaleString()}</span>
                </div>
                {dmLeadsByStatus.slice(0, 3).map((r: any) => (
                  <div key={r.status} className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground capitalize">{r.status}</span>
                    <span className="font-semibold text-foreground">{r.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Video Analytics */}
          <Card className="border border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-blue-400" />
                Video Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl font-bold text-foreground">{videoViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total video views</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Avg completion</span>
                  <span className="font-semibold text-foreground">{videoAvgCompletion}%</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">CTA clicks</span>
                  <span className="font-semibold text-foreground">{videoCtaClicks.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instagram */}
          <Card className="border border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                Instagram Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl font-bold text-foreground">{igProfilesCount}</p>
              <p className="text-xs text-muted-foreground">tracked profiles</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Avg followers</span>
                  <span className="font-semibold text-foreground">{igAvgFollowers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Largest account</span>
                  <span className="font-semibold text-foreground">{igMaxFollowers.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reading / Education */}
          <Card className="border border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl font-bold text-foreground">{readingTotalMaterials}</p>
              <p className="text-xs text-muted-foreground">reading materials ({readingCompletionRate}% done)</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Books completed</span>
                  <span className="font-semibold text-foreground">{readingBooksCompleted}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Avg knowledge score</span>
                  <span className="font-semibold text-foreground">{readingAvgScore}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Total days read</span>
                  <span className="font-semibold text-foreground">{readingTotalDays.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════ LEAD SOURCES ═══════════ */}
        {leadSources.length > 0 && (
          <Card className="border border-card-border mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-400" />
                Lead Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {leadSources.map((s: any, i: number) => {
                  const total = leadSources.reduce((a: number, x: any) => a + x.count, 0);
                  const pct = Math.round((s.count / total) * 100);
                  return (
                    <div key={s.source} className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center">
                      <p className="text-xl font-bold text-foreground">{s.count}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{s.source.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{pct}% of total</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════ BOTTOM MICRO METRICS ═══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <MiniStat label="Referral Clicks" value={totalClicks.toLocaleString()} icon={UserPlus} />
          <MiniStat label="Referral Signups" value={totalSignups.toLocaleString()} icon={Users} />
          <MiniStat label="Avg Credits" value={avgCreditsPerUser.toLocaleString()} icon={Zap} />
          <MiniStat label="Bookings" value={totalBookings.toLocaleString()} icon={CalendarDays} />
          <MiniStat label="Community Posts" value={totalCommunityPosts.toLocaleString()} icon={MessageSquare} />
          <MiniStat label="Churned" value={churnCount.toLocaleString()} icon={Activity} />
        </div>
      </div>
    </AdminLayout>
  );
}
