import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

export function AILeadScoring({ lead }: { lead: any }) {
  const { toast } = useToast();
  const [showReason, setShowReason] = useState(false);

  const scoreMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/dm/leads/${lead.id}/score`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] });
      toast({ 
        title: "Lead scored!", 
        description: `Score: ${data.score}/10 - ${data.reason}` 
      });
    },
    onError: (e: any) => toast({ 
      title: "Scoring failed", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  const getScoreColor = (score: number) => {
    if (score >= 8) return { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", icon: TrendingUp };
    if (score >= 5) return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", icon: Minus };
    return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", icon: TrendingDown };
  };

  const hasScore = lead.leadScore != null;
  const scoreConfig = hasScore ? getScoreColor(lead.leadScore) : null;
  const ScoreIcon = scoreConfig?.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">AI Lead Score</p>
        </div>
        <Button
          onClick={() => scoreMutation.mutate()}
          disabled={scoreMutation.isPending}
          size="sm"
          variant="outline"
          className="gap-1.5 h-7"
        >
          <Sparkles className="w-3 h-3" />
          {scoreMutation.isPending ? "Scoring..." : hasScore ? "Re-score" : "Score Lead"}
        </Button>
      </div>

      {hasScore ? (
        <div className={`p-4 rounded-xl border ${scoreConfig?.border} ${scoreConfig?.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {ScoreIcon && <ScoreIcon className={`w-5 h-5 ${scoreConfig?.text}`} />}
              <span className={`text-3xl font-bold ${scoreConfig?.text}`}>
                {lead.leadScore}/10
              </span>
            </div>
            <Badge className={`${scoreConfig?.bg} ${scoreConfig?.text} ${scoreConfig?.border}`}>
              {lead.leadScore >= 8 ? "High Priority" : lead.leadScore >= 5 ? "Medium Priority" : "Low Priority"}
            </Badge>
          </div>
          {lead.leadScoreReason && (
            <div>
              <button
                onClick={() => setShowReason(!showReason)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                {showReason ? "Hide" : "Show"} reasoning
              </button>
              {showReason && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {lead.leadScoreReason}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-border text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-xs text-muted-foreground">
            Use AI to score this lead's potential
          </p>
        </div>
      )}
    </div>
  );
}

export function LeadScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;

  const getScoreColor = (s: number) => {
    if (s >= 8) return { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" };
    if (s >= 5) return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" };
    return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" };
  };

  const config = getScoreColor(score);

  return (
    <Badge className={`${config.bg} ${config.text} ${config.border} text-[10px] gap-1`}>
      <Sparkles className="w-2.5 h-2.5" />
      {score}/10
    </Badge>
  );
}
