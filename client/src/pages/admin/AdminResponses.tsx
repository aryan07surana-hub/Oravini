import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search, ChevronDown, ChevronUp, BarChart2, Users, TrendingUp, Target, DollarSign, Layers
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

const PLAN_COLORS: Record<string, string> = {
  free:    "border-zinc-600 text-zinc-400",
  starter: "border-blue-500/40 text-blue-400",
  growth:  "border-violet-500/40 text-violet-400",
  pro:     "border-emerald-500/40 text-emerald-400",
  elite:   `border-[#d4b461]/60 text-[#d4b461]`,
};

function StatBar({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-40 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color ?? GOLD }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs text-zinc-400 w-12 text-right">{count} <span className="text-zinc-600">({pct}%)</span></span>
    </div>
  );
}

export default function AdminResponses() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "field" | "struggle" | "goal">("all");

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

  // Aggregate stats
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
      for (const str of s.struggles) {
        struggleCounts[str] = (struggleCounts[str] ?? 0) + 1;
      }
    }
  }

  const top = (obj: Record<string, number>, n = 5) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Onboarding Responses</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Survey answers from clients at first login — {total} total response{total !== 1 ? "s" : ""}</p>
        </div>

        {/* Aggregate insight cards */}
        {total > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Top fields */}
            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-[#d4b461]" />
                  <p className="text-sm font-semibold text-white">Top Fields</p>
                </div>
                <div className="space-y-2">
                  {top(fieldCounts).map(([label, count]) => (
                    <StatBar key={label} label={label} count={count} total={total} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top struggles */}
            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-semibold text-white">Biggest Struggles</p>
                </div>
                <div className="space-y-2">
                  {top(struggleCounts).map(([label, count]) => (
                    <StatBar key={label} label={label} count={count} total={total} color="#ef4444" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-semibold text-white">Primary Goals</p>
                </div>
                <div className="space-y-2">
                  {top(goalCounts).map(([label, count]) => (
                    <StatBar key={label} label={label} count={count} total={total} color="#22c55e" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Platforms */}
            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-semibold text-white">Platforms</p>
                </div>
                <div className="space-y-2">
                  {top(platformCounts).map(([label, count]) => (
                    <StatBar key={label} label={label} count={count} total={total} color="#60a5fa" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-semibold text-white">Current Revenue</p>
                </div>
                <div className="space-y-2">
                  {top(revenueCounts, 6).map(([label, count]) => (
                    <StatBar key={label} label={label} count={count} total={total} color="#a78bfa" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-[#d4b461]" />
                  <p className="text-sm font-semibold text-white">Summary</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Most common field</p>
                    <p className="text-sm font-semibold text-white">{top(fieldCounts, 1)[0]?.[0] ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Top struggle</p>
                    <p className="text-sm font-semibold text-red-400">{top(struggleCounts, 1)[0]?.[0] ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Top goal</p>
                    <p className="text-sm font-semibold text-emerald-400">{top(goalCounts, 1)[0]?.[0] ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Most used platform</p>
                    <p className="text-sm font-semibold text-blue-400">{top(platformCounts, 1)[0]?.[0] ?? "—"}</p>
                  </div>
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
