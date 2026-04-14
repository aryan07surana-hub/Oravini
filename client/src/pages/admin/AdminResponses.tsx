import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, ChevronDown, ChevronUp, Users, TrendingUp, Target, DollarSign, Layers, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const GOLD = "#d4b461";

const PLAN_COLORS: Record<string, string> = {
  free:    "border-zinc-600 text-zinc-400",
  starter: "border-blue-500/40 text-blue-400",
  growth:  "border-violet-500/40 text-violet-400",
  pro:     "border-emerald-500/40 text-emerald-400",
  elite:   `border-[#d4b461]/60 text-[#d4b461]`,
};

const PIE_COLORS = [GOLD, "#60a5fa", "#4ade80", "#f87171", "#a78bfa", "#fb923c", "#34d399"];
const BAR_COLOR = GOLD;

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
      <span className="text-xs text-zinc-400 w-44 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color ?? GOLD }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs text-zinc-400 w-16 text-right">{count} <span className="text-zinc-600">({pct}%)</span></span>
    </div>
  );
}

export default function AdminResponses() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  const { data: surveys = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/onboarding-surveys"],
  });

  const filtered = surveys.filter(s =>
    !search ||
    s.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.field?.toLowerCase().includes(search.toLowerCase())
  );

  const total = surveys.length;

  const fieldCounts: Record<string, number> = {};
  const struggleCounts: Record<string, number> = {};
  const goalCounts: Record<string, number> = {};
  const platformCounts: Record<string, number> = {};
  const revenueCounts: Record<string, number> = {};

  for (const s of surveys) {
    if (s.field) fieldCounts[s.field] = (fieldCounts[s.field] ?? 0) + 1;
    if (s.primary_goal) goalCounts[s.primary_goal] = (goalCounts[s.primary_goal] ?? 0) + 1;
    if (s.platform) platformCounts[s.platform] = (platformCounts[s.platform] ?? 0) + 1;
    if (s.monthly_revenue) revenueCounts[s.monthly_revenue] = (revenueCounts[s.monthly_revenue] ?? 0) + 1;
    if (Array.isArray(s.struggles)) {
      for (const str of s.struggles) struggleCounts[str] = (struggleCounts[str] ?? 0) + 1;
    }
  }

  const top = (obj: Record<string, number>, n = 6) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

  const toBarData = (obj: Record<string, number>, n = 6) =>
    top(obj, n).map(([name, value]) => ({ name: name.length > 22 ? name.slice(0, 20) + "…" : name, value }));

  const toPieData = (obj: Record<string, number>, n = 6) =>
    top(obj, n).map(([name, value]) => ({ name, value }));

  const renderChart = (data: { name: string; value: number }[], colorStart?: string) => {
    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: any) => [`${v} response${v !== 1 ? "s" : ""}`, ""]} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} />
            <Legend formatter={(v) => <span className="text-xs text-zinc-400">{v}</span>} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={14}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
          <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" fill={colorStart ?? BAR_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Onboarding Responses</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Survey answers from clients — {total} total response{total !== 1 ? "s" : ""}</p>
          </div>
          {total > 0 && (
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
          )}
        </div>

        {total > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-[#d4b461]" />
                  <p className="text-sm font-semibold text-white">Top Fields</p>
                </div>
                {renderChart(toBarData(fieldCounts))}
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-semibold text-white">Biggest Struggles</p>
                </div>
                {renderChart(toBarData(struggleCounts), "#ef4444")}
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-semibold text-white">Primary Goals</p>
                </div>
                {renderChart(toBarData(goalCounts), "#22c55e")}
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-semibold text-white">Platforms</p>
                </div>
                {renderChart(toPieData(platformCounts), "#60a5fa")}
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-semibold text-white">Current Revenue</p>
                </div>
                {renderChart(toPieData(revenueCounts), "#a78bfa")}
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-[#d4b461]" />
                  <p className="text-sm font-semibold text-white">Summary</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Most common field", value: top(fieldCounts, 1)[0]?.[0], color: "text-[#d4b461]" },
                    { label: "Top struggle", value: top(struggleCounts, 1)[0]?.[0], color: "text-red-400" },
                    { label: "Top goal", value: top(goalCounts, 1)[0]?.[0], color: "text-emerald-400" },
                    { label: "Main platform", value: top(platformCounts, 1)[0]?.[0], color: "text-blue-400" },
                    { label: "Most common revenue", value: top(revenueCounts, 1)[0]?.[0], color: "text-violet-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
                      <p className={`text-sm font-semibold ${color}`}>{value ?? "—"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Individual responses */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or field…"
                className="pl-9 h-9 text-sm bg-zinc-900 border-zinc-700"
                data-testid="input-responses-search"
              />
            </div>
            <span className="text-xs text-zinc-500">{filtered.length} of {total}</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-zinc-900/60 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border border-card-border">
              <CardContent className="p-12 text-center">
                <p className="text-zinc-500 text-sm">{total === 0 ? "No responses yet — they'll appear here when clients complete the onboarding survey." : "No results match your search."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(s => {
                const isOpen = expanded === s.user_id;
                const initials = (s.user_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <Card key={s.user_id} className="border border-card-border transition-all" data-testid={`card-response-${s.user_id}`}>
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpanded(isOpen ? null : s.user_id)}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors rounded-xl"
                      >
                        <Avatar className="w-9 h-9 shrink-0">
                          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-sm font-semibold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white truncate">{s.user_name ?? "Unknown"}</p>
                            {s.user_plan && (
                              <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${PLAN_COLORS[s.user_plan] ?? ""}`}>
                                {s.user_plan}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 truncate">{s.user_email}</p>
                        </div>
                        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                          {s.field && <span className="text-xs text-zinc-400">{s.field}</span>}
                          {s.platform && <span className="text-xs text-zinc-600">{s.platform}</span>}
                        </div>
                        <div className="shrink-0">
                          {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-zinc-800/60 px-4 pb-4 pt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ResponseField label="Field / Niche" value={s.field} />
                            <ResponseField label="Primary Platform" value={s.platform} />
                            <ResponseField label="Experience" value={s.experience} />
                            <ResponseField label="Monthly Revenue" value={s.monthly_revenue} />
                            <ResponseField label="Primary Goal" value={s.primary_goal} />
                            <div>
                              <p className="text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">Biggest Struggles</p>
                              {Array.isArray(s.struggles) && s.struggles.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {s.struggles.map((str: string) => (
                                    <span key={str} className="inline-block text-xs px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400">{str}</span>
                                  ))}
                                </div>
                              ) : <p className="text-xs text-zinc-600 italic">None specified</p>}
                            </div>
                          </div>
                          {s.completed_at && (
                            <p className="text-xs text-zinc-600 mt-3">Submitted {format(new Date(s.completed_at), "MMM d, yyyy 'at' h:mm a")}</p>
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

function ResponseField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-white">{value ?? <span className="text-zinc-600 italic">Not answered</span>}</p>
    </div>
  );
}
