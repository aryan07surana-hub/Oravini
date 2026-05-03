import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Star, ThumbsUp, AlertCircle, TrendingUp, MessageSquare,
  Users, BarChart2, Filter, ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const STAR_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          fill={i < count ? STAR_COLORS[count] : "none"}
          stroke={i < count ? STAR_COLORS[count] : "#52525b"}
        />
      ))}
    </div>
  );
}

function NPSBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-500 text-xs">—</span>;
  const color = score >= 9 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : score >= 7 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    : "bg-red-500/10 text-red-400 border-red-500/20";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>{score}/10</span>;
}

function Pill({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
      <span className="text-zinc-500">{label}:</span>
      <span className="font-medium">{value.replace(/_/g, " ")}</span>
    </span>
  );
}

export default function AdminFeedback() {
  const { data: feedback, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/feedback"],
  });

  const [filterSource, setFilterSource] = useState<"all" | "dashboard" | "settings">("all");
  const [filterRating, setFilterRating] = useState<number | "all">("all");

  const filtered = (feedback || []).filter(f => {
    if (filterSource !== "all" && f.source !== filterSource) return false;
    if (filterRating !== "all" && f.overallRating !== filterRating) return false;
    return true;
  });

  const avgRating = feedback?.length
    ? (feedback.filter(f => f.overallRating).reduce((a, f) => a + f.overallRating, 0) / feedback.filter(f => f.overallRating).length).toFixed(1)
    : "—";

  const avgNps = feedback?.length
    ? (feedback.filter(f => f.npsScore !== null).reduce((a, f) => a + f.npsScore, 0) / feedback.filter(f => f.npsScore !== null).length).toFixed(1)
    : "—";

  const promoters = (feedback || []).filter(f => f.npsScore >= 9).length;
  const detractors = (feedback || []).filter(f => f.npsScore !== null && f.npsScore <= 6).length;
  const npsScore = feedback?.filter(f => f.npsScore !== null).length
    ? Math.round(((promoters - detractors) / feedback.filter(f => f.npsScore !== null).length) * 100)
    : null;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Feedback Responses</h1>
          <p className="text-muted-foreground mt-1">All feedback submitted by Oravini members</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
              </div>
              <p className="text-2xl font-bold">{isLoading ? "—" : (feedback || []).length}</p>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Rating</span>
              </div>
              <p className="text-2xl font-bold">{isLoading ? "—" : avgRating}</p>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg NPS</span>
              </div>
              <p className="text-2xl font-bold">{isLoading ? "—" : avgNps}</p>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">NPS Score</span>
              </div>
              <p className={`text-2xl font-bold ${npsScore === null ? "" : npsScore >= 50 ? "text-emerald-400" : npsScore >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                {isLoading ? "—" : npsScore === null ? "—" : npsScore > 0 ? `+${npsScore}` : npsScore}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="w-3 h-3" /> Filter:
          </div>
          {(["all", "dashboard", "settings"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterSource(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterSource === s ? "bg-primary text-primary-foreground border-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
            >
              {s === "all" ? "All Sources" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="w-px h-5 bg-zinc-700 self-center mx-1" />
          {(["all", 5, 4, 3, 2, 1] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilterRating(r)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterRating === r ? "bg-primary text-primary-foreground border-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
            >
              {r === "all" ? "All Ratings" : `${r}★`}
            </button>
          ))}
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
          ) : filtered.length === 0 ? (
            <Card className="border border-card-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <MessageSquare className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No feedback submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((fb: any) => {
              const initials = fb.userName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
              return (
                <Card key={fb.id} className="border border-card-border">
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{fb.userName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{fb.userEmail || ""}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {fb.overallRating && <StarRow count={fb.overallRating} />}
                        <div className="flex items-center gap-2">
                          <NPSBadge score={fb.npsScore} />
                          <Badge variant="outline" className="text-[10px]">{fb.source}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {fb.submittedAt ? format(new Date(fb.submittedAt), "MMM d, yyyy") : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pills row */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Pill label="Ease" value={fb.easeOfUse} />
                      <Pill label="Completed goal" value={fb.completedPurpose} />
                      <Pill label="Issue type" value={fb.issueType} />
                      <Pill label="Issue freq" value={fb.issueFrequency} />
                      <Pill label="Importance" value={fb.feedbackImportance} />
                      <Pill label="Stop using" value={fb.wouldStopUsing} />
                    </div>

                    {/* Text fields */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {fb.purposeToday && (
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Purpose today</p>
                          <p className="text-sm text-foreground">{fb.purposeToday}</p>
                        </div>
                      )}
                      {fb.mostLiked && (
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Most liked</p>
                          <p className="text-sm text-foreground">{fb.mostLiked}</p>
                        </div>
                      )}
                      {fb.mostUsefulFeature && (
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Most useful feature</p>
                          <p className="text-sm text-foreground">{fb.mostUsefulFeature}</p>
                        </div>
                      )}
                      {fb.issueDescription && (
                        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3">
                          <p className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Issue description</p>
                          <p className="text-sm text-foreground">{fb.issueDescription}</p>
                        </div>
                      )}
                      {fb.improvement && (
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Improvement suggestion</p>
                          <p className="text-sm text-foreground">{fb.improvement}</p>
                        </div>
                      )}
                      {fb.wishedFeature && (
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Wished feature</p>
                          <p className="text-sm text-foreground">{fb.wishedFeature}</p>
                        </div>
                      )}
                      {fb.immediateChange && (
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Immediate change</p>
                          <p className="text-sm text-foreground">{fb.immediateChange}</p>
                        </div>
                      )}
                      {fb.npsReason && (
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">NPS reason</p>
                          <p className="text-sm text-foreground">{fb.npsReason}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
