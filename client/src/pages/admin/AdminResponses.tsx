import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search, ChevronDown, ChevronUp, Users, TrendingUp, Target,
  DollarSign, Layers, BarChart2, Lightbulb, Star, Radio as RadioIcon,
  Megaphone, Video, MapPin,
} from "lucide-react";
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

  const { data: surveys = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/onboarding-surveys"],
  });

  const filtered = surveys.filter(s =>
    !search ||
    s.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.field?.toLowerCase().includes(search.toLowerCase()) ||
    s.descriptor?.toLowerCase().includes(search.toLowerCase())
  );

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
  }

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
            <h1 className="text-2xl font-bold text-white">Onboarding Responses</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Survey answers from clients — {total} total response{total !== 1 ? "s" : ""}
            </p>
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
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, field…"
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

                      {isOpen && (
                        <div className="border-t border-zinc-800/60 px-4 pb-5 pt-4 space-y-5">

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
