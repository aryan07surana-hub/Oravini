/**
 * CONTENT INTELLIGENCE INSIGHTS COMPONENT
 * Shows viral pattern analysis and content scoring for tracked posts
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Sparkles, Brain, TrendingUp, AlertCircle, CheckCircle2, 
  Zap, Target, Loader2, ChevronDown, ChevronUp, Eye, BarChart2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";

interface IntelligenceInsightsProps {
  postId: string;
  postTitle: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  platform: string;
  niche?: string;
}

export function ContentIntelligenceInsights({
  postId,
  postTitle,
  views,
  likes,
  comments,
  saves,
  platform,
  niche
}: IntelligenceInsightsProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const analyzeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/content/${postId}/analyze`, { niche }),
    onSuccess: (data) => {
      setAnalysis(data);
      setExpanded(true);
      toast({ 
        title: "Analysis complete!", 
        description: `Content scored ${data.score}/100 - ${data.rating}` 
      });
    },
    onError: (e: any) => {
      toast({ 
        title: "Analysis failed", 
        description: e.message, 
        variant: "destructive" 
      });
    },
  });

  const scoreColor = analysis?.score >= 85 
    ? GOLD 
    : analysis?.score >= 70 
    ? "#34d399" 
    : analysis?.score >= 50 
    ? "#60a5fa" 
    : "#f87171";

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">AI Content Intelligence</p>
            <p className="text-[10px] text-muted-foreground">See what makes content go viral</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis && (
            <Badge 
              variant="outline" 
              className="text-xs font-bold border-2"
              style={{ 
                borderColor: scoreColor, 
                background: `${scoreColor}15`, 
                color: scoreColor 
              }}
            >
              {analysis.score}/100
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3">
          {!analysis ? (
            <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <p className="text-base font-bold text-foreground mb-2">
                🚀 Unlock Viral Insights
              </p>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Get your viral score, see what patterns work, and learn exactly how to improve this post
              </p>
              <Button
                size="lg"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="gap-2 bg-primary hover:bg-primary/90 text-black font-bold shadow-lg"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Your Content...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Analyze This Post Now
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Score breakdown */}
              <div 
                className="rounded-2xl border-2 p-5"
                style={{ 
                  borderColor: scoreColor, 
                  background: `linear-gradient(135deg, ${scoreColor}08, ${scoreColor}15)` 
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      🎯 Your Viral Score
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p 
                        className="text-5xl font-black"
                        style={{ color: scoreColor }}
                      >
                        {analysis.score}
                      </p>
                      <span className="text-xl text-muted-foreground font-bold">/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="outline"
                      className="text-sm font-bold border-2 px-3 py-1"
                      style={{ 
                        borderColor: scoreColor, 
                        background: `${scoreColor}20`, 
                        color: scoreColor 
                      }}
                    >
                      {analysis.rating}
                    </Badge>
                    {views > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 justify-end">
                        <Eye className="w-3 h-3" />
                        {views.toLocaleString()} views
                      </p>
                    )}
                  </div>
                </div>

                {/* Score breakdown bars */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-foreground mb-2">📊 Score Breakdown:</p>
                  {Object.entries(analysis.breakdown).map(([key, data]: [string, any]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-foreground">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <span className="text-xs font-bold" style={{ color: scoreColor }}>
                          {data.score}/{data.max}
                        </span>
                      </div>
                      <Progress 
                        value={data.percentage} 
                        className="h-2"
                        style={{ 
                          backgroundColor: 'rgba(255,255,255,0.15)' 
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected patterns */}
              {analysis.patterns && analysis.patterns.length > 0 && (
                <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-400">
                        ✅ What's Working ({analysis.patterns.length} patterns found)
                      </p>
                      <p className="text-[10px] text-muted-foreground">These viral patterns are in your content</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.patterns.slice(0, 5).map((pattern: any) => (
                      <Badge
                        key={pattern.pattern}
                        variant="outline"
                        className="text-xs font-semibold border-2 border-emerald-500/40 bg-emerald-500/15 text-emerald-300 px-3 py-1"
                      >
                        {pattern.name} · {pattern.score}% match
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing patterns */}
              {analysis.missingPatterns && analysis.missingPatterns.length > 0 && (
                <div className="rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-400">
                        ⚡ Missing Viral Patterns
                      </p>
                      <p className="text-[10px] text-muted-foreground">Add these to boost your reach</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {analysis.missingPatterns.slice(0, 3).map((pattern: any) => (
                      <div 
                        key={pattern.pattern}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">{pattern.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            💥 {pattern.avgBoost}x more views · {pattern.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top improvements */}
              {analysis.improvements && analysis.improvements.length > 0 && (
                <div className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Target className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-400">
                        🎯 How to Improve This Post
                      </p>
                      <p className="text-[10px] text-muted-foreground">Quick wins to boost your score</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analysis.improvements.slice(0, 2).map((imp: any, i: number) => (
                      <div 
                        key={i}
                        className="rounded-xl border-2 border-blue-500/20 bg-blue-500/5 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-foreground">
                            {i + 1}. {imp.category}
                          </p>
                          <Badge 
                            variant="outline"
                            className="text-xs font-bold border-2 border-blue-500/40 bg-blue-500/15 text-blue-300"
                          >
                            {imp.expectedIncrease}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground mb-2 font-medium">
                          💡 {imp.fix}
                        </p>
                        {imp.examples && imp.examples.length > 0 && (
                          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 mt-2">
                            <p className="text-xs text-blue-300 font-semibold">
                              Example: "{imp.examples[0]}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Re-analyze button */}
              <Button
                size="lg"
                variant="outline"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="w-full gap-2 border-2 border-primary/30 hover:bg-primary/10 font-bold"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Re-analyzing Your Content...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    🔄 Re-analyze This Post
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface BulkAnalysisButtonProps {
  postIds: string[];
  niche?: string;
  onComplete?: () => void;
}

export function BulkAnalysisButton({ 
  postIds, 
  niche, 
  onComplete 
}: BulkAnalysisButtonProps) {
  const { toast } = useToast();
  const [resultsOpen, setResultsOpen] = useState(false);
  const [results, setResults] = useState<any>(null);

  const bulkMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/content/bulk-analyze", { 
      postIds, 
      niche 
    }),
    onSuccess: (data) => {
      setResults(data);
      setResultsOpen(true);
      toast({ 
        title: "Bulk analysis complete!", 
        description: `Analyzed ${data.analyzed} posts` 
      });
      onComplete?.();
    },
    onError: (e: any) => {
      toast({ 
        title: "Bulk analysis failed", 
        description: e.message, 
        variant: "destructive" 
      });
    },
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => bulkMutation.mutate()}
        disabled={bulkMutation.isPending || postIds.length === 0}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
      >
        {bulkMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing {postIds.length} posts...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4" />
            Analyze All with Intelligence
          </>
        )}
      </Button>

      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Bulk Analysis Results
            </DialogTitle>
          </DialogHeader>

          {results && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {results.analyzed}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    Posts Analyzed
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {results.results.filter((r: any) => r.score >= 70).length}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    Strong Posts
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {results.results.filter((r: any) => r.score < 50).length}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    Need Work
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Posts Ranked by Score
                </p>
                {results.results.map((result: any, i: number) => {
                  const scoreColor = result.score >= 85 
                    ? GOLD 
                    : result.score >= 70 
                    ? "#34d399" 
                    : result.score >= 50 
                    ? "#60a5fa" 
                    : "#f87171";

                  return (
                    <div
                      key={result.postId}
                      className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ 
                          background: `${scoreColor}20`, 
                          color: scoreColor 
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {result.title || "Untitled"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{ 
                              borderColor: `${scoreColor}30`, 
                              background: `${scoreColor}10`, 
                              color: scoreColor 
                            }}
                          >
                            {result.score}/100 · {result.rating}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {result.patternsDetected} patterns
                          </span>
                          {result.viralScore > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              · {result.viralScore.toFixed(1)} viral score
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
