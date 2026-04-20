import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Trash2, TrendingDown, Users, Star, RefreshCw, BarChart2,
  Clock, Wrench, Heart, RotateCcw, AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";

const PLAN_COLORS: Record<string, string> = {
  free: "#71717a",
  starter: "#818cf8",
  growth: "#d4b461",
  pro: "#34d399",
  elite: "#d4b461",
};

const RATING_STARS: Record<string, number> = {
  "⭐ Very poor": 1,
  "⭐⭐ Poor": 2,
  "⭐⭐⭐ Average": 3,
  "⭐⭐⭐⭐ Good": 4,
  "⭐⭐⭐⭐⭐ Excellent": 5,
};

function tally(arr: any[], key: string): Record<string, number> {
  return arr.reduce((acc: Record<string, number>, row: any) => {
    const v = row[key] || "Unknown";
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
}

function BreakdownBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-zinc-300 truncate">{label}</p>
          <span className="text-xs font-bold ml-2 shrink-0" style={{ color }}>{count} <span className="text-zinc-600 font-normal">({pct}%)</span></span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: `${color}0d`, border: `1px solid ${color}25` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminChurnAnalysis() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: surveys, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/deletion-surveys"],
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/deletion-surveys/reset", { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deletion-surveys"] });
      toast({ title: "All churn data cleared", description: "Deletion surveys have been reset." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset data", variant: "destructive" });
    },
  });

  const rows = surveys || [];
  const total = rows.length;

  // Aggregate stats
  const reasonTally = tally(rows, "reason");
  const planTally = tally(rows, "user_plan");
  const durationTally = tally(rows, "duration");
  const featureTally = tally(rows, "favorite_feature");
  const returnTally = tally(rows, "would_return");

  const avgRating = total > 0
    ? (rows.reduce((s, r) => s + (RATING_STARS[r.rating] || 3), 0) / total).toFixed(1)
    : "—";

  const wouldReturnYes = rows.filter(r => r.would_return === "Yes, definitely").length;
  const wouldReturnPct = total > 0 ? Math.round((wouldReturnYes / total) * 100) : 0;

  const SECTION_COLORS = ["#f87171", "#a78bfa", "#60a5fa", "#34d399", "#fb923c"];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Churn Analysis</h1>
                <p className="text-xs text-zinc-500">Exit survey responses from deleted accounts</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
              {total} response{total !== 1 ? "s" : ""}
            </Badge>
            {total > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset All Churn Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {total} deletion survey responses. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => resetMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {resetMutation.isPending ? "Resetting..." : "Reset All Data"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Trash2}    label="Total Deletions" value={total}            sub="all time"                        color="#f87171" />
          <StatCard icon={Star}      label="Avg Rating"      value={avgRating}         sub="out of 5"                        color={GOLD}    />
          <StatCard icon={RotateCcw} label="Would Return"    value={`${wouldReturnPct}%`} sub={`${wouldReturnYes} users`}   color="#34d399" />
          <StatCard icon={Users}     label="Most Common"     value={Object.entries(reasonTally).sort((a,b)=>b[1]-a[1])[0]?.[0]?.split(" ").slice(0,2).join(" ") || "—"} sub="top reason" color="#a78bfa" />
        </div>

        {/* Breakdown Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
          </div>
        ) : total === 0 ? (
          <div className="rounded-2xl border border-zinc-800 p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-500">No deletion surveys yet</p>
            <p className="text-xs text-zinc-600 mt-1">Responses will appear here when members delete their accounts</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Deletion Reasons */}
              <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-bold text-foreground">Why They Left</p>
                </div>
                <div className="space-y-3">
                  {Object.entries(reasonTally).sort((a, b) => b[1] - a[1]).map(([k, v], i) => (
                    <BreakdownBar key={k} label={k} count={v} total={total} color={SECTION_COLORS[i % SECTION_COLORS.length]} />
                  ))}
                </div>
              </div>

              {/* Would Return */}
              <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-bold text-foreground">Would They Come Back?</p>
                </div>
                <div className="space-y-3">
                  {Object.entries(returnTally).sort((a, b) => b[1] - a[1]).map(([k, v], i) => (
                    <BreakdownBar key={k} label={k} count={v} total={total} color={["#34d399", "#60a5fa", "#f59e0b", "#f87171", "#71717a"][i % 5]} />
                  ))}
                </div>
              </div>

              {/* Membership Duration */}
              <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-bold text-foreground">How Long Were They Members?</p>
                </div>
                <div className="space-y-3">
                  {Object.entries(durationTally).sort((a, b) => b[1] - a[1]).map(([k, v], i) => (
                    <BreakdownBar key={k} label={k} count={v} total={total} color={SECTION_COLORS[i % SECTION_COLORS.length]} />
                  ))}
                </div>
              </div>

              {/* Favourite Feature */}
              <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="w-4 h-4 text-purple-400" />
                  <p className="text-sm font-bold text-foreground">Most Loved Feature</p>
                </div>
                <div className="space-y-3">
                  {Object.entries(featureTally).sort((a, b) => b[1] - a[1]).map(([k, v], i) => (
                    <BreakdownBar key={k} label={k} count={v} total={total} color={["#a78bfa", GOLD, "#34d399", "#60a5fa", "#f472b6", "#71717a"][i % 6]} />
                  ))}
                </div>
              </div>
            </div>

            {/* By Plan */}
            <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4" style={{ color: GOLD }} />
                <p className="text-sm font-bold text-foreground">Deletions by Plan</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(planTally).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
                  <div key={plan} className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: `${PLAN_COLORS[plan] || "#71717a"}10`, border: `1px solid ${PLAN_COLORS[plan] || "#71717a"}25` }}>
                    <span className="text-xs font-bold capitalize" style={{ color: PLAN_COLORS[plan] || "#71717a" }}>{plan}</span>
                    <span className="text-base font-black text-foreground">{count}</span>
                    <span className="text-[10px] text-zinc-600">({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full Responses Table */}
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
                <p className="text-sm font-bold text-foreground">All Responses</p>
                <span className="text-xs text-zinc-500">{total} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      {["Member", "Plan", "Reason", "Duration", "Rating", "Would Return", "Date"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {rows.map((row: any) => {
                      const planColor = PLAN_COLORS[row.user_plan] || "#71717a";
                      return (
                        <tr key={row.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-semibold text-foreground">{row.user_name || "Unknown"}</p>
                            <p className="text-zinc-600 text-[10px]">{row.user_email || ""}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: `${planColor}18`, color: planColor }}>
                              {row.user_plan || "free"}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="text-zinc-300 leading-snug">{row.reason}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{row.duration}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{row.rating}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`font-medium ${row.would_return === "Yes, definitely" ? "text-emerald-400" : row.would_return === "No" ? "text-red-400" : "text-zinc-400"}`}>
                              {row.would_return}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                            {row.created_at ? format(new Date(row.created_at), "MMM d, yyyy") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </AdminLayout>
  );
}
