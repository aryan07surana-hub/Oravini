import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, TrendingUp, Star, CreditCard, MousePointerClick, UserPlus,
  ArrowUpRight, ArrowDownRight, MessageSquare, Zap, DollarSign, PieChart
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";

const PLAN_COLORS: Record<string, string> = {
  free: "#71717a",
  starter: "#60a5fa",
  growth: "#a78bfa",
  pro: "#34d399",
  elite: "#d4b461",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter ($29)",
  growth: "Growth ($59)",
  pro: "Pro ($79)",
  elite: "Elite ($149)",
};

function KpiCard({ label, value, icon: Icon, sub, trend, color }: any) {
  return (
    <Card className="border border-card-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && (
            <span className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const planBreakdown = data?.planBreakdown || [];
  const monthlySignups = data?.monthlySignups || [];
  const totalUsers = data?.totalUsers || 0;
  const mrr = data?.mrr || 0;
  const nps = data?.nps;
  const avgRating = data?.avgRating || "—";
  const totalLeads = data?.totalLeads || 0;
  const totalFeedback = data?.totalFeedback || 0;
  const churnCount = data?.churnCount || 0;
  const totalClicks = data?.totalClicks || 0;
  const totalSignups = data?.totalSignups || 0;
  const totalConversions = data?.totalConversions || 0;
  const totalCredits = data?.totalCredits || 0;
  const avgCreditsPerUser = totalUsers > 0 ? Math.round(totalCredits / totalUsers) : 0;

  const totalPaid = planBreakdown.filter((r: any) => r.plan !== "free").reduce((a: number, r: any) => a + r.count, 0);
  const conversionRate = totalUsers > 0 ? Math.round((totalPaid / totalUsers) * 100) : 0;

  const pieData = planBreakdown.map((r: any) => ({
    name: PLAN_LABELS[r.plan] || r.plan,
    value: r.count,
    color: PLAN_COLORS[r.plan] || "#71717a",
  }));

  const formatMrr = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n}`;
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform-wide metrics and trends</p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total Users" value={totalUsers.toLocaleString()} icon={Users} color="bg-primary/10 text-primary" trend={12} sub={`${totalPaid} paid (${conversionRate}%)`} />
          <KpiCard label="Monthly Revenue" value={formatMrr(mrr)} icon={DollarSign} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" sub="MRR from paid plans" />
          <KpiCard label="NPS Score" value={nps !== null ? (nps > 0 ? `+${nps}` : nps) : "—"} icon={Star} color={`bg-${nps !== null && nps >= 50 ? "emerald" : nps !== null && nps >= 0 ? "yellow" : "red"}-100 text-${nps !== null && nps >= 50 ? "emerald" : nps !== null && nps >= 0 ? "yellow" : "red"}-600 dark:bg-${nps !== null && nps >= 50 ? "emerald" : nps !== null && nps >= 0 ? "yellow" : "red"}-900/30 dark:text-${nps !== null && nps >= 50 ? "emerald" : nps !== null && nps >= 0 ? "yellow" : "red"}-400`} sub={`${totalFeedback} responses · ${avgRating} avg rating`} />
          <KpiCard label="Lead Conversion" value={`${conversionRate}%`} icon={TrendingUp} color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" sub={`${totalLeads} leads captured`} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                User Growth
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
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#d4b461" }}
                    />
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
                        {pieData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
                      />
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

        {/* Revenue by Plan */}
        {planBreakdown.length > 0 && (
          <Card className="border border-card-border mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Revenue by Plan (MRR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={planBreakdown
                    .filter((r: any) => r.plan !== "free")
                    .map((r: any) => {
                      const prices: Record<string, number> = { starter: 29, growth: 59, pro: 79, elite: 149 };
                      return { name: PLAN_LABELS[r.plan] || r.plan, revenue: r.count * (prices[r.plan] || 0), color: PLAN_COLORS[r.plan] };
                    })}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: any) => [`$${value}`, "MRR"]}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {planBreakdown.filter((r: any) => r.plan !== "free").map((entry: any, i: number) => (
                      <Cell key={i} fill={PLAN_COLORS[entry.plan] || "#71717a"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Bottom Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-card-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{totalClicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Referral Clicks</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{totalSignups.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Referral Signups</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{avgCreditsPerUser.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Avg Credits / User</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{churnCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Churned Users</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
