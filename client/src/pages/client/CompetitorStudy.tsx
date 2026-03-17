import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Instagram, Eye, Heart, MessageCircle, TrendingUp, TrendingDown,
  Sparkles, Loader2, Trash2, ChevronRight, Target, Zap, AlertTriangle,
  BarChart2, Clock, Star, CheckCircle, XCircle, ArrowRight, Users, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const ASSESSMENT_STYLES: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  winning: { label: "Winning", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", icon: TrendingUp },
  competitive: { label: "Competitive", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: BarChart2 },
  losing: { label: "Needs Work", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: TrendingDown },
};

function MetricCard({ label, clientVal, compVal, unit = "" }: { label: string; clientVal: any; compVal: any; unit?: string }) {
  const cv = typeof clientVal === "number" ? clientVal : 0;
  const cc = typeof compVal === "number" ? compVal : 0;
  const better = cv >= cc;
  return (
    <div className="bg-card border border-card-border rounded-xl p-3 space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">You</p>
          <p className={`text-lg font-bold ${better ? "text-green-400" : "text-foreground"}`}>
            {typeof cv === "number" ? cv.toLocaleString() : cv}{unit}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mb-1" />
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-0.5">Competitor</p>
          <p className={`text-lg font-bold ${!better ? "text-red-400" : "text-foreground"}`}>
            {typeof cc === "number" ? cc.toLocaleString() : cc}{unit}
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalysisReport({ analysis, onDelete }: { analysis: any; onDelete: () => void }) {
  const report = analysis.report as any;
  const assessment = report?.overallAssessment || "competitive";
  const style = ASSESSMENT_STYLES[assessment] || ASSESSMENT_STYLES.competitive;
  const AssessIcon = style.icon;
  const cm = report?.clientMetrics;
  const comp = report?.competitorMetrics;

  return (
    <div className="border border-primary/20 rounded-2xl overflow-hidden">
      <div className="bg-primary/5 border-b border-primary/20 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Instagram className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{analysis.clientHandle}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-semibold text-sm text-foreground">{analysis.competitorHandle}</span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${style.bg} ${style.color}`}>
                  <AssessIcon className="w-3 h-3" />
                  {style.label}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(analysis.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
          </div>
          <button onClick={onDelete} data-testid={`delete-analysis-${analysis.id}`} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-accent flex-shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {report?.summary && (
          <div className="p-4 bg-card border border-card-border rounded-xl">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Executive Summary</p>
            <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
          </div>
        )}

        {cm && comp && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Metrics Comparison</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="Avg Views" clientVal={cm.avgViews} compVal={comp.avgViews} />
              <MetricCard label="Avg Likes" clientVal={cm.avgLikes} compVal={comp.avgLikes} />
              <MetricCard label="Engagement Rate" clientVal={cm.avgEngagementRate} compVal={comp.avgEngagementRate} unit="%" />
              <MetricCard label="Posts/Week" clientVal={cm.postsPerWeek} compVal={comp.postsPerWeek} />
            </div>
          </div>
        )}

        {report?.keyMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Views", value: report.keyMetrics.viewsComparison },
              { label: "Engagement", value: report.keyMetrics.engagementComparison },
              { label: "Posting Freq.", value: report.keyMetrics.frequencyComparison },
            ].filter(m => m.value).map(m => (
              <div key={m.label} className="bg-card border border-card-border rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{m.label}</p>
                <p className="text-xs text-foreground mt-1">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {report?.clientStrengths?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">Your Strengths</p>
              </div>
              <div className="space-y-1.5">
                {report.clientStrengths.map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-foreground">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report?.clientWeaknesses?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Areas to Improve</p>
              </div>
              <div className="space-y-1.5">
                {report.clientWeaknesses.map((w: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-foreground">{w}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report?.competitorEdge?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Competitor Edge</p>
              </div>
              <div className="space-y-1.5">
                {report.competitorEdge.map((e: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-foreground">{e}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report?.winningStrategies?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Winning Strategies to Steal</p>
              </div>
              <div className="space-y-1.5">
                {report.winningStrategies.map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-foreground">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {report?.recommendations?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Action Plan for You</p>
            </div>
            <div className="space-y-2">
              {report.recommendations.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-foreground">{r}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {report?.contentGaps?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-purple-400" />
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Content Gaps to Fill</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.contentGaps.map((g: string, i: number) => (
                <span key={i} className="text-xs px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full">{g}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompetitorStudy({ useAdmin = false }: { useAdmin?: boolean }) {
  const Layout = useAdmin ? AdminLayout : ClientLayout;
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientUrl, setClientUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Scraping profiles...");

  const { data: analyses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/competitor/analyses"],
  });

  const loadingSteps = [
    "Scraping your Instagram profile...",
    "Scraping competitor's profile...",
    "Calculating engagement metrics...",
    "Comparing content strategies...",
    "Generating AI insights...",
  ];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/competitor/analyses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitor/analyses"] });
      toast({ title: "Analysis deleted" });
    },
  });

  const analyze = async () => {
    if (!clientUrl.trim() || !competitorUrl.trim()) {
      toast({ title: "Both URLs required", description: "Enter your Instagram URL and competitor's URL", variant: "destructive" });
      return;
    }
    if (!clientUrl.includes("instagram.com") || !competitorUrl.includes("instagram.com")) {
      toast({ title: "Invalid URL", description: "Please enter valid Instagram profile URLs", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgress(Math.min(step * 18, 90));
      setLoadingText(loadingSteps[Math.min(step - 1, loadingSteps.length - 1)]);
    }, 1800);

    try {
      await apiRequest("POST", "/api/competitor/analyze", {
        clientUrl: clientUrl.trim(),
        competitorUrl: competitorUrl.trim(),
        clientId: user?.id,
      });
      clearInterval(interval);
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/competitor/analyses"] });
      toast({ title: "Analysis complete!", description: "Your competitor report is ready." });
      setClientUrl("");
      setCompetitorUrl("");
    } catch (e: any) {
      clearInterval(interval);
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
      setProgress(0);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Competitor Study</h1>
              <p className="text-sm text-muted-foreground">AI-powered Instagram competitor analysis</p>
            </div>
          </div>
        </div>

        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">New Analysis</h2>
            </div>

            {analyzing ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="relative">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping" />
                </div>
                <div className="w-full max-w-xs space-y-2">
                  <p className="text-sm font-medium text-foreground animate-pulse">{loadingText}</p>
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{progress}% complete — this takes 30–60 seconds</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Instagram URL</Label>
                    <div className="relative mt-1.5">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
                      <Input
                        value={clientUrl}
                        onChange={e => setClientUrl(e.target.value)}
                        placeholder="https://instagram.com/youraccount"
                        className="pl-9"
                        data-testid="input-client-url"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Competitor Instagram URL</Label>
                    <div className="relative mt-1.5">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                      <Input
                        value={competitorUrl}
                        onChange={e => setCompetitorUrl(e.target.value)}
                        placeholder="https://instagram.com/competitor"
                        className="pl-9"
                        data-testid="input-competitor-url"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-card border border-card-border rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">Both accounts must be <strong className="text-foreground">public</strong> Instagram profiles. Analysis takes 30–60 seconds.</p>
                </div>
                <Button
                  onClick={analyze}
                  disabled={!clientUrl || !competitorUrl}
                  className="w-full gap-2"
                  data-testid="button-analyze"
                >
                  <Sparkles className="w-4 h-4" /> Analyze & Generate Report
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Past Analyses</h2>
            {analyses.length > 0 && <span className="text-xs text-muted-foreground">{analyses.length} saved</span>}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl">
              <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No analyses yet</p>
              <p className="text-xs text-muted-foreground mt-1">Enter two Instagram URLs above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((a: any) => (
                <AnalysisReport
                  key={a.id}
                  analysis={a}
                  onDelete={() => deleteMutation.mutate(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
