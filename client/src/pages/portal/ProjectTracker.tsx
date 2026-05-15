import PortalLayout from "./Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderKanban, CheckCircle2, Circle, AlertCircle, Clock, ChevronDown, ChevronUp, User, Target, TrendingUp } from "lucide-react";
import { getProjectCompletion, getCurrentPhase, getProjectTrackerSummary } from "@shared/projectTracker";

const GOLD = "#d4b461";

const HEALTH_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  on_track: { label: "On Track", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  at_risk: { label: "At Risk", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  off_track: { label: "Off Track", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  completed: { label: "Completed", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  not_started: { label: "Not Started", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

const STATUS_ICONS: Record<string, any> = {
  completed: CheckCircle2,
  in_progress: Clock,
  blocked: AlertCircle,
  not_started: Circle,
  pending: Circle,
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: GOLD }} />
    </div>
  );
}

function ClientProjectCard({ summary, onSelect }: { summary: any; onSelect: () => void }) {
  const health = HEALTH_STYLES[summary.tracker?.projectHealth || "not_started"] || HEALTH_STYLES.not_started;
  let completion = 0;
  try { completion = getProjectCompletion(summary.tracker) * 100; } catch {}
  let currentPhase = "";
  try { currentPhase = (getCurrentPhase(summary.tracker) as any)?.title || (getCurrentPhase(summary.tracker) as any)?.name || ""; } catch {}

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-zinc-600 transition-all cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${GOLD}18`, color: GOLD }}>
            {summary.clientName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{summary.clientName}</p>
            <p className="text-xs text-muted-foreground">{summary.tracker?.projectName || "Project"}</p>
          </div>
        </div>
        <Badge className="text-[10px] px-2 flex-shrink-0" style={{ background: health.bg, color: health.color, border: `1px solid ${health.color}33` }}>
          {health.label}
        </Badge>
      </div>
      <ProgressBar value={completion} />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">{Math.round(completion)}% complete</span>
        {currentPhase && <span className="text-xs text-muted-foreground truncate ml-2">{currentPhase}</span>}
      </div>
      {summary.tracker?.targetDate && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <Target className="w-3 h-3" /> Target: {new Date(summary.tracker.targetDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function PhaseView({ tracker, clientId, onSave, isSaving }: { tracker: any; clientId: string; onSave: (t: any) => void; isSaving: boolean }) {
  const updateActionStatus = (phaseIdx: number, stepIdx: number, actionIdx: number, status: string) => {
    const updated = JSON.parse(JSON.stringify(tracker));
    updated.phases[phaseIdx].steps[stepIdx].actions[actionIdx].status = status;
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      {(tracker.phases || []).map((phase: any, pi: number) => {
        const totalActions = phase.steps.flatMap((s: any) => s.actions).length;
        const doneActions = phase.steps.flatMap((s: any) => s.actions).filter((a: any) => a.status === "completed").length;
        return (
          <div key={pi} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <p className="font-semibold text-sm text-foreground">{phase.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{doneActions}/{totalActions} actions complete</p>
              </div>
              <ProgressBar value={totalActions ? (doneActions / totalActions) * 100 : 0} />
            </div>
            <div className="p-4 space-y-3">
              {phase.steps.map((step: any, si: number) => (
                <div key={si}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{step.name}</p>
                  <div className="space-y-1.5">
                    {step.actions.map((action: any, ai: number) => {
                      const Icon = STATUS_ICONS[action.status] || Circle;
                      return (
                        <div key={ai} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent group">
                          <Select
                            value={action.status}
                            onValueChange={(v) => updateActionStatus(pi, si, ai, v)}
                          >
                            <SelectTrigger className="w-auto h-6 border-0 p-0 gap-1.5 focus:ring-0 bg-transparent">
                              <Icon className={`w-4 h-4 flex-shrink-0 ${action.status === "completed" ? "text-green-400" : action.status === "blocked" ? "text-red-400" : action.status === "in_progress" ? "text-amber-400" : "text-muted-foreground"}`} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className={`flex-1 text-sm ${action.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {action.title}
                          </span>
                          {action.priority === "critical" && <Badge className="text-[9px] bg-red-950 text-red-300 px-1.5">Critical</Badge>}
                          {action.dueDate && <span className="text-[10px] text-muted-foreground">{new Date(action.dueDate).toLocaleDateString()}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <Button className="w-full" style={{ background: GOLD, color: "#0a0910" }} onClick={() => onSave(tracker)} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

export default function PortalProjectTracker() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: summaries = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/project-trackers"] });

  const selected = summaries.find((s: any) => s.clientId === selectedClientId);

  const save = useMutation({
    mutationFn: (tracker: any) => apiRequest("PUT", `/api/project-tracker/${selectedClientId}`, tracker),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/project-trackers"] });
      toast({ title: "Project saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const totalComplete = summaries.filter((s: any) => s.tracker?.projectHealth === "completed").length;
  const onTrack = summaries.filter((s: any) => s.tracker?.projectHealth === "on_track").length;

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderKanban className="w-6 h-6" style={{ color: GOLD }} />
              Project Tracker
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{summaries.length} clients · {onTrack} on track · {totalComplete} completed</p>
          </div>
          {selected && (
            <Button variant="outline" size="sm" onClick={() => setSelectedClientId(null)}>
              ← All Clients
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : !selectedClientId ? (
          summaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderKanban className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No projects yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaries.map((s: any) => (
                <ClientProjectCard key={s.clientId} summary={s} onSelect={() => setSelectedClientId(s.clientId)} />
              ))}
            </div>
          )
        ) : selected ? (
          <div>
            <div className="flex items-center gap-3 mb-6 p-4 rounded-xl border border-border bg-card">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `${GOLD}18`, color: GOLD }}>
                {selected.clientName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
              </div>
              <div>
                <p className="font-semibold text-foreground">{selected.clientName}</p>
                <p className="text-sm text-muted-foreground">{selected.tracker?.projectName || "Project"}</p>
              </div>
            </div>
            <PhaseView
              tracker={selected.tracker}
              clientId={selected.clientId}
              onSave={(t) => save.mutate(t)}
              isSaving={save.isPending}
            />
          </div>
        ) : null}
      </div>
    </PortalLayout>
  );
}
