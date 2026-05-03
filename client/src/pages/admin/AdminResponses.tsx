import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Search, ChevronDown, ChevronUp, Users, TrendingUp, Target,
  DollarSign, Layers, BarChart2, Lightbulb, Star, Radio as RadioIcon,
  Megaphone, Video, MapPin, Crown, Flame, Mail, ArrowRight, Trash2,
  Download, Filter, SortDesc, Calendar, X,
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";

const PLAN_COLORS: Record<string, string> = {
  free:    "border-zinc-600 text-zinc-400",
  starter: "border-blue-500/40 text-blue-400",
  growth:  "border-violet-500/40 text-violet-400",
  pro:     "border-emerald-500/40 text-emerald-400",
  elite:   `border-[#d4b461]/60 text-[#d4b461]`,
};

const PIE_COLORS = [GOLD, "#60a5fa", "#4ade80", "#f87171", "#a78bfa", "#fb923c", "#34d399", "#f472b6", "#38bdf8", "#facc15"];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-300 font-semibold mb-0.5">{label}</p>
      <p className="text-[#d4b461]">{payload[0].value} response{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

function HBar({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-44 shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color ?? GOLD }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs text-zinc-500 w-16 text-right">{count} <span className="text-zinc-700">({pct}%)</span></span>
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  if (!items?.length) return <p className="text-xs text-zinc-600 italic">Not answered</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item: string) => (
        <span key={item} className="inline-block text-xs px-2.5 py-1 rounded-full" style={{
          border: `1px solid ${color}40`, background: `${color}12`, color,
        }}>{item}</span>
      ))}
    </div>
  );
}

function ChartCard({
  icon, title, iconColor, chartEl,
}: {
  icon: any; title: string; iconColor: string; chartEl: any;
}) {
  const Icon = icon;
  return (
    <Card className="border border-card-border">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        {chartEl}
      </CardContent>
    </Card>
  );
}

export default function AdminResponses() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [filterPlan, setFilterPlan] = useState<string>("");
  const [filterElite, setFilterElite] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "elite">("newest");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: surveys = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/onboarding-surveys"],
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/onboarding-surveys/clear-all", { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding-surveys"] });
      toast({ title: "Success", description: "All responses cleared successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clear responses", variant: "destructive" });
    },
  });

  const deleteResponseMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/admin/onboarding-surveys/${userId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding-surveys"] });
      toast({ title: "Success", description: "Response deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete response", variant: "destructive" });
    },
  });

  let filtered = surveys.filter(s =>
    (!search ||
    s.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.field?.toLowerCase().includes(search.toLowerCase()) ||
    s.descriptor?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterPlan || s.user_plan === filterPlan) &&
    (!filterElite || s.answers?.eliteInterest === filterElite)
  );

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime();
    if (sortBy === "oldest") return new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime();
    if (sortBy === "elite") {
      const aElite = a.answers?.eliteInterest === "yes" ? 1 : 0;
      const bElite = b.answers?.eliteInterest === "yes" ? 1 : 0;
      return bElite - aElite;
    }
    return 0;
  });

  const exportData = () => {
    const csv = [
      ["Name", "Email", "Plan", "Field", "Elite Interest", "Follower Count", "Revenue", "Submitted"].join(","),
      ...filtered.map(s => [
        s.user_name || "",
        s.user_email || "",
        s.user_plan || "",
        s.field || "",
        s.answers?.eliteInterest || "",
        s.follower_count || "",
        s.monthly_revenue || "",
        s.completed_at ? format(new Date(s.completed_at), "yyyy-MM-dd HH:mm") : "",
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey-responses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast({ title: "Success", description: "Exported to CSV" });
  };

  const handleClearAll = () => {
    if (window.confirm(`Are you sure you want to delete ALL ${total} responses? This cannot be undone!`)) {
      clearAllMutation.mutate();
    }
  };

  const uniquePlans = [...new Set(surveys.map(s => s.user_plan).filter(Boolean))];
  const activeFilters = [filterPlan, filterElite].filter(Boolean).length;

  const total = surveys.length;

  // Aggregate all fields
  const awarenessCounts:   Record<string, number> = {};
  const fieldCounts:       Record<string, number> = {};
  const struggleCounts:    Record<string, number> = {};
  const contentTypeCounts: Record<string, number> = {};
  const descriptorCounts:  Record<string, number> = {};
  const followerCounts:    Record<string, number> = {};
  const revenueCounts:     Record<string, number> = {};
  const goalCounts:        Record<string, number> = {};
  const platformCounts:    Record<string, number> = {};
  const heardCounts:       Record<string, number> = {};

  const inc = (obj: Record<string, number>, key: string | null | undefined) => {
    if (!key) return;
    obj[key] = (obj[key] ?? 0) + 1;
  };
  const incArr = (obj: Record<string, number>, arr: string[] | null | undefined) => {
    if (!Array.isArray(arr)) return;
    for (const v of arr) inc(obj, v);
  };

  // Elite interest (12th question) — most important
  const eliteCounts = { yes: 0, not_now: 0, maybe: 0, unanswered: 0 };
  const eliteYesUsers: any[] = [];

  for (const s of surveys) {
    inc(awarenessCounts,  s.awareness);
    inc(fieldCounts,      s.field);
    incArr(fieldCounts,   s.fields);
    incArr(struggleCounts, s.struggles);
    incArr(contentTypeCounts, s.content_types);
    inc(descriptorCounts, s.descriptor);
    inc(followerCounts,   s.follower_count);
    inc(revenueCounts,    s.monthly_revenue);
    inc(goalCounts,       s.primary_goal);
    inc(platformCounts,   s.platform);
    incArr(platformCounts, s.platforms);
    incArr(heardCounts,   s.heard_about);

    const ei = s.answers?.eliteInterest;
    if (ei === "yes") { eliteCounts.yes++; eliteYesUsers.push(s); }
    else if (ei === "not_now") eliteCounts.not_now++;
    else if (ei === "maybe") eliteCounts.maybe++;
    else eliteCounts.unanswered++;
  }
  const eliteAnswered = eliteCounts.yes + eliteCounts.not_now + eliteCounts.maybe;
  const eliteYesPct = eliteAnswered > 0 ? Math.round((eliteCounts.yes / eliteAnswered) * 100) : 0;
  const eliteNotNowPct = eliteAnswered > 0 ? Math.round((eliteCounts.not_now / eliteAnswered) * 100) : 0;
  const eliteMaybePct = eliteAnswered > 0 ? Math.round((eliteCounts.maybe / eliteAnswered) * 100) : 0;

  const top = (obj: Record<string, number>, n = 7) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

  const toBarData = (obj: Record<string, number>, n = 7) =>
    top(obj, n).map(([name, value]) => ({ name: name.length > 24 ? name.slice(0, 22) + "…" : name, value }));

  const toPieData = (obj: Record<string, number>, n = 7) =>
    top(obj, n).map(([name, value]) => ({ name, value }));

  const makeChart = (obj: Record<string, number>, barColor: string, n = 7) => {
    if (chartType === "pie") {
      const data = toPieData(obj, n);
      return (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: any) => [`${v} response${v !== 1 ? "s" : ""}`, ""]} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} />
            <Legend formatter={(v) => <span className="text-[10px] text-zinc-400">{v}</span>} wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    const data = toBarData(obj, n);
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={14}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#71717a" }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={44} />
          <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const chartDefs = [
    { icon: Lightbulb,  title: "Creator Awareness Level",    color: "text-amber-400",   obj: awarenessCounts,   barColor: "#f59e0b" },
    { icon: Layers,     title: "Top Fields / Niches",        color: "text-[#d4b461]",   obj: fieldCounts,       barColor: GOLD },
    { icon: TrendingUp, title: "Biggest Struggles",          color: "text-red-400",     obj: struggleCounts,    barColor: "#ef4444" },
    { icon: Video,      title: "Content Types Created",      color: "text-sky-400",     obj: contentTypeCounts, barColor: "#38bdf8" },
    { icon: Star,       title: "What Best Describes Them",   color: "text-violet-400",  obj: descriptorCounts,  barColor: "#a78bfa" },
    { icon: RadioIcon,  title: "Follower Count Ranges",      color: "text-emerald-400", obj: followerCounts,    barColor: "#22c55e" },
    { icon: DollarSign, title: "Current Revenue",            color: "text-purple-400",  obj: revenueCounts,     barColor: "#c084fc" },
    { icon: Target,     title: "Primary Goals",              color: "text-green-400",   obj: goalCounts,        barColor: "#4ade80" },
    { icon: MapPin,     title: "Active Platforms",           color: "text-blue-400",    obj: platformCounts,    barColor: "#60a5fa" },
    { icon: Megaphone,  title: "How They Heard About Us",    color: "text-pink-400",    obj: heardCounts,       barColor: "#f472b6" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white">Onboarding Responses</h1>
            <p className="text-base text-zinc-400 mt-1">
              Survey answers from clients — <span className="text-[#d4b461] font-semibold">{total}</span> total response{total !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {total > 0 && (
              <>
                <Button
                  onClick={exportData}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1">
                  <button
                    onClick={() => setChartType("bar")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartType === "bar" ? "bg-[#d4b461] text-black" : "text-zinc-400 hover:text-white"}`}
                    data-testid="btn-chart-bar"
                  >
                    <BarChart2 className="w-3.5 h-3.5" /> Bar
                  </button>
                  <button
                    onClick={() => setChartType("pie")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartType === "pie" ? "bg-[#d4b461] text-black" : "text-zinc-400 hover:text-white"}`}
                    data-testid="btn-chart-pie"
                  >
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-current" /> Pie
                  </button>
                </div>
                <Button
                  onClick={handleClearAll}
                  variant="destructive"
                  size="sm"
                  disabled={clearAllMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Clear All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats Dashboard */}
        {total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-400" />
                  <p className="text-xs text-zinc-500 font-medium">Total Responses</p>
                </div>
                <p className="text-2xl font-bold text-white">{total}</p>
              </CardContent>
            </Card>
            <Card className="border border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-[#d4b461]" />
                  <p className="text-xs text-zinc-500 font-medium">Hot Leads</p>
                </div>
                <p className="text-2xl font-bold text-[#d4b461]">{eliteCounts.yes}</p>
              </CardContent>
            </Card>
            <Card className="border border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-zinc-500 font-medium">Conversion Rate</p>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{eliteYesPct}%</p>
              </CardContent>
            </Card>
            <Card className="border border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-violet-400" />
                  <p className="text-xs text-zinc-500 font-medium">This Week</p>
                </div>
                <p className="text-2xl font-bold text-violet-400">
                  {surveys.filter(s => {
                    const date = new Date(s.completed_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return date > weekAgo;
                  }).length}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── ELITE INTEREST — TIER 5 / 12TH QUESTION ── */}
        {total > 0 && (
          <Card
            className="border-0 overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, rgba(212,180,97,0.12) 0%, rgba(212,180,97,0.04) 50%, rgba(0,0,0,0.4) 100%)",
              border: "1px solid rgba(212,180,97,0.4)",
              boxShadow: "0 0 60px rgba(212,180,97,0.15)",
            }}
            data-testid="card-elite-interest"
          >
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
              style={{ background: GOLD, opacity: 0.08, transform: "translate(35%, -35%)" }} />

            <CardContent className="relative p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Crown className="w-4 h-4" style={{ color: GOLD }} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                      Tier 5 · Elite Interest · Hottest Signal
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">Who wants help scaling their offer?</h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    The most important question — these answers tell you who's ready for high-ticket coaching today.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total answered</p>
                  <p className="text-3xl font-black text-white mt-1">{eliteAnswered}<span className="text-base text-zinc-600 font-normal"> / {total}</span></p>
                </div>
              </div>

              {/* Big stat tiles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {/* YES — most prominent */}
                <div className="rounded-2xl p-5 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(212,180,97,0.18), rgba(212,180,97,0.06))",
                    border: `2px solid ${GOLD}`,
                    boxShadow: `0 0 28px ${GOLD}30`,
                  }}>
                  <div className="absolute top-2 right-2">
                    <div className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: GOLD, color: "#000" }}>
                      🔥 Hot Lead
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-4 h-4" style={{ color: GOLD }} />
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Yes — wants more</p>
                  </div>
                  <p className="text-5xl font-black text-white leading-none">{eliteCounts.yes}</p>
                  <p className="text-sm font-semibold mt-2" style={{ color: GOLD }}>{eliteYesPct}% of answered</p>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Ready for Tier 5 outreach — message these users about Elite right away.
                  </p>
                </div>

                {/* NOT NOW */}
                <div className="rounded-2xl p-5"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <RadioIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Not right now</p>
                  </div>
                  <p className="text-4xl font-black text-zinc-200 leading-none">{eliteCounts.not_now}</p>
                  <p className="text-sm font-semibold text-zinc-400 mt-2">{eliteNotNowPct}% of answered</p>
                  <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                    Open in 3–6 months. Add to nurture sequence.
                  </p>
                </div>

                {/* MAYBE */}
                <div className="rounded-2xl p-5"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-3.5 h-3.5 text-zinc-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Maybe later</p>
                  </div>
                  <p className="text-4xl font-black text-zinc-200 leading-none">{eliteCounts.maybe}</p>
                  <p className="text-sm font-semibold text-zinc-400 mt-2">{eliteMaybePct}% of answered</p>
                  <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                    Long-term prospects — nurture with content & case studies.
                  </p>
                </div>
              </div>

              {/* Hot leads list */}
              {eliteYesUsers.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${GOLD}25` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                        Hot Leads — Reach out to these {eliteYesUsers.length}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                    {eliteYesUsers.map(u => {
                      const initials = (u.user_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <button
                          key={u.user_id}
                          onClick={() => setExpanded(u.user_id)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                          style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20` }}
                          data-testid={`hot-lead-${u.user_id}`}
                        >
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-[10px] font-bold" style={{ background: `${GOLD}20`, color: GOLD }}>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{u.user_name ?? "Unknown"}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                              <Mail className="w-2.5 h-2.5" />
                              <span className="truncate">{u.user_email}</span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {eliteCounts.unanswered > 0 && (
                <p className="text-[11px] text-zinc-600 mt-3 text-center">
                  {eliteCounts.unanswered} user{eliteCounts.unanswered !== 1 ? "s" : ""} haven't been asked yet (older surveys).
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charts — all 10 */}
        {total > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {chartDefs.map(({ icon, title, color, obj, barColor }) => (
                <ChartCard
                  key={title}
                  icon={icon}
                  title={title}
                  iconColor={color}
                  chartEl={makeChart(obj, barColor)}
                />
              ))}

              {/* Summary card */}
              <Card className="border border-card-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-[#d4b461]" />
                    <p className="text-sm font-semibold text-white">Audience Summary</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Most common niche",       value: top(fieldCounts, 1)[0]?.[0],       color: "text-[#d4b461]" },
                      { label: "Top struggle",            value: top(struggleCounts, 1)[0]?.[0],     color: "text-red-400" },
                      { label: "Most common role",        value: top(descriptorCounts, 1)[0]?.[0],   color: "text-violet-400" },
                      { label: "Main content type",       value: top(contentTypeCounts, 1)[0]?.[0],  color: "text-sky-400" },
                      { label: "Top follower range",      value: top(followerCounts, 1)[0]?.[0],     color: "text-emerald-400" },
                      { label: "Top goal",                value: top(goalCounts, 1)[0]?.[0],         color: "text-green-400" },
                      { label: "Most common revenue",     value: top(revenueCounts, 1)[0]?.[0],      color: "text-purple-400" },
                      { label: "Main platform",           value: top(platformCounts, 1)[0]?.[0],     color: "text-blue-400" },
                      { label: "Top referral source",     value: top(heardCounts, 1)[0]?.[0],        color: "text-pink-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
                        <p className={`text-sm font-semibold ${color} truncate`}>{value ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Individual responses */}
        <div>
          <div className="flex items-start gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, field…"
                className="pl-10 h-10 text-sm bg-zinc-900 border-zinc-700"
                data-testid="input-responses-search"
              />
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={filterPlan}
                  onChange={e => setFilterPlan(e.target.value)}
                  className="pl-9 pr-8 h-10 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 appearance-none cursor-pointer hover:border-zinc-600"
                >
                  <option value="">All Plans</option>
                  {uniquePlans.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                </select>
              </div>
              
              <div className="relative">
                <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={filterElite}
                  onChange={e => setFilterElite(e.target.value)}
                  className="pl-9 pr-8 h-10 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 appearance-none cursor-pointer hover:border-zinc-600"
                >
                  <option value="">All Elite Status</option>
                  <option value="yes">Hot Leads (Yes)</option>
                  <option value="not_now">Not Now</option>
                  <option value="maybe">Maybe</option>
                </select>
              </div>
              
              <div className="relative">
                <SortDesc className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="pl-9 pr-8 h-10 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 appearance-none cursor-pointer hover:border-zinc-600"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="elite">Hot Leads First</option>
                </select>
              </div>
              
              {activeFilters > 0 && (
                <Button
                  onClick={() => { setFilterPlan(""); setFilterElite(""); }}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" /> Clear Filters
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                {filtered.length} of {total}
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-zinc-900/60 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border border-card-border">
              <CardContent className="p-12 text-center">
                <p className="text-zinc-500 text-sm">
                  {total === 0
                    ? "No responses yet — they'll appear here when clients complete the onboarding survey."
                    : "No results match your search."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(s => {
                const isOpen = expanded === s.user_id;
                const initials = (s.user_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                const eliteAnswer = s.answers?.eliteInterest;
                const isHotLead = eliteAnswer === "yes";
                return (
                  <Card
                    key={s.user_id}
                    className="border transition-all"
                    style={isHotLead ? { borderColor: `${GOLD}60`, boxShadow: `0 0 16px ${GOLD}15` } : undefined}
                    data-testid={`card-response-${s.user_id}`}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-stretch">
                      <button
                        onClick={() => setExpanded(isOpen ? null : s.user_id)}
                        className="flex-1 flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors rounded-l-xl"
                      >
                        <Avatar className="w-9 h-9 shrink-0">
                          <AvatarFallback
                            className="text-sm font-semibold"
                            style={isHotLead ? { background: `${GOLD}20`, color: GOLD } : { background: "rgb(39,39,42)", color: "rgb(212,212,216)" }}
                          >{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white truncate">{s.user_name ?? "Unknown"}</p>
                            {isHotLead && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                style={{ background: GOLD, color: "#000", letterSpacing: "0.08em" }}
                                data-testid={`badge-hot-lead-${s.user_id}`}
                              >
                                <Crown className="w-2.5 h-2.5" /> Hot Lead
                              </span>
                            )}
                            {s.user_plan && (
                              <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${PLAN_COLORS[s.user_plan] ?? ""}`}>
                                {s.user_plan}
                              </Badge>
                            )}
                            {s.descriptor && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400">
                                {s.descriptor}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 truncate">{s.user_email}</p>
                        </div>
                        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                          {s.field && <span className="text-xs text-zinc-400 truncate max-w-[160px]">{s.field}</span>}
                          {s.follower_count && <span className="text-xs text-zinc-600">{s.follower_count} followers</span>}
                        </div>
                        <div className="shrink-0">
                          {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                        </div>
                      </button>
                      <div className="flex items-center border-l border-zinc-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete response from ${s.user_name}?`)) {
                              deleteResponseMutation.mutate(s.user_id);
                            }
                          }}
                          className="px-4 h-full hover:bg-red-500/10 transition-colors group rounded-r-xl"
                          title="Delete response"
                        >
                          <Trash2 className="w-4 h-4 text-zinc-600 group-hover:text-red-400" />
                        </button>
                      </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-zinc-800/60 px-4 pb-5 pt-4 space-y-5">

                          {/* Elite Interest — top priority answer */}
                          {eliteAnswer && (
                            <div
                              className="rounded-xl p-4"
                              style={{
                                background: isHotLead ? `${GOLD}10` : "rgba(255,255,255,0.03)",
                                border: `1px solid ${isHotLead ? `${GOLD}50` : "rgba(255,255,255,0.08)"}`,
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <Crown className="w-3.5 h-3.5" style={{ color: isHotLead ? GOLD : "#71717a" }} />
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isHotLead ? GOLD : "#71717a" }}>
                                  Tier 5 / Elite Interest (12th Question)
                                </p>
                              </div>
                              <p className="text-sm font-bold" style={{ color: isHotLead ? GOLD : "#fff" }}>
                                {eliteAnswer === "yes" && "🔥 Yes — wants help scaling their offer"}
                                {eliteAnswer === "not_now" && "⏳ Not right now"}
                                {eliteAnswer === "maybe" && "💭 Maybe in the future"}
                              </p>
                              {isHotLead && (
                                <p className="text-xs text-zinc-400 mt-1.5">
                                  This user explicitly asked to know more about Tier 5 — prime outreach candidate.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Row 1 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <SField label="Awareness Level" value={s.awareness} />
                            <SField label="What Best Describes Them" value={s.descriptor} color="text-violet-400" />
                            <SField label="Experience" value={s.experience} />
                            <SField label="Follower Count" value={s.follower_count} color="text-emerald-400" />
                            <SField label="Monthly Revenue" value={s.monthly_revenue} color="text-purple-400" />
                            <SField label="Primary Goal" value={s.primary_goal} color="text-green-400" />
                          </div>

                          {/* Tags */}
                          <div className="space-y-3">
                            <STagField
                              label="Fields / Niches"
                              items={Array.isArray(s.fields) && s.fields.length ? s.fields : s.field ? [s.field] : []}
                              color={GOLD}
                            />
                            <STagField label="Struggles" items={s.struggles} color="#ef4444" />
                            <STagField label="Content Types" items={s.content_types} color="#38bdf8" />
                            <STagField
                              label="Platforms"
                              items={Array.isArray(s.platforms) && s.platforms.length ? s.platforms : s.platform ? [s.platform] : []}
                              color="#60a5fa"
                            />
                            <STagField label="How They Heard About Us" items={s.heard_about} color="#f472b6" />
                          </div>

                          {s.completed_at && (
                            <p className="text-xs text-zinc-600">
                              Submitted {format(new Date(s.completed_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SField({ label, value, color }: { label: string; value?: string | null; color?: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-500 mb-0.5 font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium ${color ?? "text-white"}`}>
        {value ?? <span className="text-zinc-600 italic font-normal">Not answered</span>}
      </p>
    </div>
  );
}

function STagField({ label, items, color }: { label: string; items?: string[] | null; color: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-500 mb-1.5 font-semibold uppercase tracking-wider">{label}</p>
      <TagList items={items ?? []} color={color} />
    </div>
  );
}
