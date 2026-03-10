import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, FileText, CheckSquare, Mic, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

function CallCard({ call }: { call: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card data-testid={`call-card-${call.id}`} className="border border-card-border hover:border-primary/30 transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{call.title}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(call.callDate), "MMMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            data-testid={`expand-call-${call.id}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            {call.summary && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Call Summary</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-lg p-3">
                  {call.summary}
                </p>
              </div>
            )}

            {call.feedbackNotes && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-3.5 h-3.5 text-purple-500" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Feedback Notes</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-lg p-3">
                  {call.feedbackNotes}
                </p>
              </div>
            )}

            {call.actionSteps && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Action Steps</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  {call.actionSteps.split("\n").filter(Boolean).map((step: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <span className="text-xs font-bold text-primary mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-muted-foreground">{step.replace(/^\d+\.\s*/, "")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {call.recordingUrl && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-3.5 h-3.5 text-orange-500" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Recording</p>
                </div>
                <a
                  href={call.recordingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                  data-testid={`recording-link-${call.id}`}
                >
                  Open recording
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientCalls() {
  const { user } = useAuth();

  const { data: calls, isLoading } = useQuery<any[]>({
    queryKey: [`/api/calls/${user?.id}`],
    enabled: !!user?.id,
  });

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Call Feedback</h1>
          <p className="text-muted-foreground mt-1">Summaries, feedback, and action steps from your coaching sessions</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : (calls || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No call recordings yet</h3>
            <p className="text-sm text-muted-foreground">Your coach will upload feedback after each session</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(calls || []).map((call: any) => (
              <CallCard key={call.id} call={call} />
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
