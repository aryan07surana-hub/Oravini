import { useState, useEffect } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Target, Layers, DollarSign, FileText, Save, Edit3, X } from "lucide-react";

const tracks = [
  { key: "offerCreation", label: "Offer Creation", description: "Building and refining your core offer", icon: Target, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", bar: "bg-purple-500", accent: "#a855f7" },
  { key: "funnelProgress", label: "Funnel Progress", description: "Sales funnel setup and optimization", icon: Layers, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", bar: "bg-blue-500", accent: "#3b82f6" },
  { key: "contentProgress", label: "Content Progress", description: "Content creation and publishing consistency", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", bar: "bg-emerald-500", accent: "#10b981" },
  { key: "monetizationProgress", label: "Monetization", description: "Revenue generation and monetization systems", icon: DollarSign, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", bar: "bg-orange-500", accent: "#f97316" },
];

function getProgressLabel(value: number) {
  if (value < 25) return { label: "Just Started", color: "text-muted-foreground" };
  if (value < 50) return { label: "In Progress", color: "text-blue-600" };
  if (value < 75) return { label: "Good Progress", color: "text-emerald-600" };
  if (value < 100) return { label: "Almost There", color: "text-orange-600" };
  return { label: "Complete!", color: "text-purple-600" };
}

export default function ClientProgress() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isElite = (user as any)?.plan === "elite";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});

  const { data: prog, isLoading } = useQuery<any>({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (prog) {
      setDraft({
        offerCreation: prog.offerCreation ?? 0,
        funnelProgress: prog.funnelProgress ?? 0,
        contentProgress: prog.contentProgress ?? 0,
        monetizationProgress: prog.monetizationProgress ?? 0,
      });
    }
  }, [prog]);

  const saveProgress = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/progress/${user?.id}`, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/progress/${user?.id}`] });
      setEditing(false);
      toast({ title: "Progress saved!", description: "Your progress has been updated." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const avgProgress = editing
    ? Math.round(Object.values(draft).reduce((a, b) => a + b, 0) / 4)
    : prog ? Math.round((prog.offerCreation + prog.funnelProgress + prog.contentProgress + prog.monetizationProgress) / 4) : 0;

  const handleCancel = () => {
    if (prog) {
      setDraft({
        offerCreation: prog.offerCreation ?? 0,
        funnelProgress: prog.funnelProgress ?? 0,
        contentProgress: prog.contentProgress ?? 0,
        monetizationProgress: prog.monetizationProgress ?? 0,
      });
    }
    setEditing(false);
  };

  if (!isElite) {
    return (
      <ClientLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Progress Milestones</h1>
            <p className="text-muted-foreground mt-1">Track your journey through the program</p>
          </div>
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Progress Milestones — Tier 5 Only</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Upgrade to the Elite plan to unlock your progress milestones, offer creation tracking, funnel progress, and monetization insights.
              </p>
            </div>
            <a
              href="/select-plan"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: "#d4b461", color: "#000" }}
            >
              Upgrade to Elite
            </a>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Progress Tracker</h1>
            <p className="text-muted-foreground mt-1">Track your journey through the program</p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="gap-1.5"
                  data-testid="button-cancel-progress"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveProgress.mutate()}
                  disabled={saveProgress.isPending}
                  className="gap-1.5"
                  data-testid="button-save-progress"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saveProgress.isPending ? "Saving..." : "Save Progress"}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="gap-1.5"
                data-testid="button-edit-progress"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Update Progress
              </Button>
            )}
          </div>
        </div>

        {/* Overall */}
        <Card className="mb-6 border border-card-border bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overall Program Progress</p>
                    <p className="text-3xl font-bold text-foreground mt-0.5">{avgProgress}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold text-primary mt-0.5">{getProgressLabel(avgProgress).label}</p>
                  </div>
                </div>
                <Progress value={avgProgress} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual tracks */}
        <div className="grid grid-cols-1 gap-4">
          {tracks.map(({ key, label, description, icon: Icon, color, bg, bar }) => {
            const value = editing ? (draft[key] ?? 0) : (prog?.[key] ?? 0);
            const status = getProgressLabel(value);
            return (
              <Card key={key} data-testid={`track-${key}`} className={`border transition-all ${editing ? "border-primary/30 shadow-sm" : "border-card-border"}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {isLoading ? (
                            <Skeleton className="h-7 w-16" />
                          ) : (
                            <>
                              <p className={`text-2xl font-bold ${color}`}>{value}%</p>
                              <p className={`text-xs font-medium ${status.color}`}>{status.label}</p>
                            </>
                          )}
                        </div>
                      </div>

                      {isLoading ? (
                        <Skeleton className="h-2 w-full" />
                      ) : editing ? (
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={draft[key] ?? 0}
                            onChange={(e) => setDraft(d => ({ ...d, [key]: parseInt(e.target.value) }))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
                            data-testid={`slider-${key}`}
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            {[0, 25, 50, 75, 100].map(m => <span key={m}>{m}%</span>)}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`absolute inset-y-0 left-0 ${bar} rounded-full transition-all duration-700`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2">
                            {[0, 25, 50, 75, 100].map((m) => (
                              <div key={m} className="flex flex-col items-center">
                                <div className={`w-1 h-1 rounded-full ${value >= m ? color.replace("text-", "bg-") : "bg-muted"}`} />
                                <span className="text-[9px] text-muted-foreground mt-0.5">{m}%</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isLoading && !prog && !editing && (
          <div className="text-center py-12 mt-4">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">Progress tracking not set up yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Update Progress" to set your milestones</p>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
