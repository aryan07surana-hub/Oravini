import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Lock,
  Radar,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";

import ClientLayout from "@/components/layout/ClientLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectTracker } from "@shared/projectTracker";

const toneMap = {
  on_track: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  watch: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  blocked: "border-rose-500/25 bg-rose-500/10 text-rose-400",
  completed: "border-sky-500/25 bg-sky-500/10 text-sky-400",
} as const;

type ProjectTrackerResponse = {
  tracker: ProjectTracker;
  summary: {
    completion: number;
    currentPhaseTitle: string;
    clientQueueCount: number;
    approvalCount: number;
    blockerCount: number;
    nextActions: Array<{
      id: string;
      title: string;
      owner: string;
      status: string;
      phaseTitle: string;
      stepTitle: string;
      dueDate: string | null;
      priority: string;
    }>;
  };
  completion: number;
  currentPhase: { title: string; description: string; objective: string } | null;
};

export default function ClientProgress() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isElite = (user as any)?.plan === "elite";

  const { data, isLoading } = useQuery<ProjectTrackerResponse>({
    queryKey: [`/api/project-tracker/${user?.id}`],
    enabled: !!user?.id && isElite,
  });

  const updateAction = useMutation({
    mutationFn: ({ actionId, status }: { actionId: string; status: string }) =>
      apiRequest("PATCH", `/api/project-tracker/${user?.id}/actions/${actionId}`, { status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/project-tracker/${user?.id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/tasks/${user?.id}`] }),
      ]);
      toast({ title: "Tracker updated", description: "Your project tracker now reflects the latest client action." });
    },
    onError: (error: any) => {
      toast({ title: "Could not update action", description: error.message, variant: "destructive" });
    },
  });

  const clientActions = useMemo(() => {
    if (!data?.tracker) return [];
    return data.tracker.phases.flatMap((phase) =>
      phase.steps.flatMap((step) =>
        step.actions
          .filter((action) => action.clientVisible && action.owner === "client")
          .map((action) => ({ ...action, phaseTitle: phase.title, stepTitle: step.title })),
      ),
    );
  }, [data]);

  const visibleDeliverables = data?.tracker.deliverables ?? [];

  if (!isElite) {
    return (
      <ClientLayout>
        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
          <div className="rounded-[28px] border border-dashed border-primary/30 bg-primary/5 p-10 text-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <Radar className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Project Tracker is a Tier 5 command center</h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto">
              Elite clients get a dedicated mission dashboard with live project phases, approvals, updates, deliverables, and next actions from the team.
            </p>
            <a
              href="/select-plan"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm mt-6"
              style={{ background: "#d4b461", color: "#000" }}
            >
              Upgrade to Tier 5
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-6">
        {isLoading || !data ? (
          <div className="space-y-4">
            <Skeleton className="h-56 w-full rounded-[28px]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 rounded-[24px]" />
              <Skeleton className="h-32 rounded-[24px]" />
              <Skeleton className="h-32 rounded-[24px]" />
            </div>
            <Skeleton className="h-96 w-full rounded-[28px]" />
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-[30px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(212,180,97,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_24%),linear-gradient(135deg,rgba(10,10,10,0.98)_0%,rgba(17,17,20,0.98)_100%)] p-6">
              <div className="absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,_rgba(212,180,97,0.14),_transparent_60%)] pointer-events-none" />
              <div className="relative flex items-start justify-between gap-6 flex-wrap">
                <div className="space-y-4 max-w-2xl">
                  <Badge className={`border ${toneMap[data.tracker.health]}`}>{data.tracker.health.replace("_", " ")}</Badge>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white">{data.tracker.projectName}</h1>
                    <p className="text-sm text-zinc-400 mt-2">
                      {data.tracker.programName} · Managed by {data.tracker.managerName}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">You Are Here</p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <p className="text-lg font-semibold text-white">{data.currentPhase?.title || data.summary.currentPhaseTitle}</p>
                      <span className="text-xs text-zinc-500">Current focus:</span>
                      <span className="text-sm text-zinc-200">{data.tracker.currentFocus}</span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-3">{data.currentPhase?.objective || data.tracker.nextClientAction}</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 min-w-[260px] shadow-2xl shadow-black/20">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-3xl bg-[#d4b461]/15 text-[#d4b461] flex items-center justify-center">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Mission Progress</p>
                      <p className="text-4xl font-semibold text-white">{data.completion}%</p>
                    </div>
                  </div>
                  <Progress value={data.completion} className="h-2 mt-4 bg-white/10" />
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-3 text-center">
                      <p className="text-xl font-semibold text-white">{data.summary.clientQueueCount}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">For You</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-3 text-center">
                      <p className="text-xl font-semibold text-white">{data.summary.approvalCount}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Approvals</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-3 text-center">
                      <p className="text-xl font-semibold text-white">{data.summary.blockerCount}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Blockers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Next Client Action", value: data.tracker.nextClientAction, icon: Swords, tone: "from-[#d4b461]/15 to-transparent" },
                { label: "Active Phase", value: data.summary.currentPhaseTitle, icon: Radar, tone: "from-sky-500/15 to-transparent" },
                { label: "Project Status", value: data.tracker.projectStatus, icon: ShieldCheck, tone: "from-emerald-500/15 to-transparent" },
              ].map(({ label, value, icon: Icon, tone }) => (
                <Card key={label} className={`border-zinc-800 bg-gradient-to-br ${tone}`}>
                  <CardContent className="p-5">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                    <p className="text-base font-semibold text-white mt-2">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
              <div className="space-y-4">
                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Command View</p>
                      <p className="text-lg font-semibold text-white mt-1">What to focus on right now</p>
                    </div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">Tier 5 Coordination</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461]">Now</p>
                      <p className="text-sm text-zinc-100 mt-2">{data.tracker.currentFocus}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461]">Your Next Step</p>
                      <p className="text-sm text-zinc-100 mt-2">{data.tracker.nextClientAction}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461]">Coordination</p>
                      <p className="text-sm text-zinc-100 mt-2">
                        {data.summary.approvalCount > 0
                          ? `${data.summary.approvalCount} approval item(s) waiting`
                          : "No pending approvals from your side"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Fulfillment Pipeline</p>
                      <p className="text-lg font-semibold text-white mt-1">Systematic execution path</p>
                    </div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">7-phase SOP</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
                    {[
                      "Onboarding",
                      "Strategy",
                      "Asset Creation",
                      "Traffic & Content",
                      "Sales System",
                      "Automation Ops",
                      "Optimization",
                    ].map((stage) => {
                      const isActive =
                        data.summary.currentPhaseTitle.toLowerCase().includes(stage.toLowerCase()) ||
                        (stage === "Automation Ops" && data.summary.currentPhaseTitle.toLowerCase().includes("automation"));
                      return (
                        <div
                          key={stage}
                          className={`rounded-2xl border px-3 py-2 ${
                            isActive
                              ? "border-[#d4b461]/40 bg-[#d4b461]/10"
                              : "border-zinc-800 bg-black/20"
                          }`}
                        >
                          <p className={`text-xs font-medium ${isActive ? "text-[#f3deb0]" : "text-zinc-300"}`}>{stage}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">
                    Next step priority: <span className="text-zinc-200">{data.tracker.nextClientAction}</span>
                  </p>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Funnel Health</p>
                      <p className="text-lg font-semibold text-white mt-1">Growth system checkpoints</p>
                    </div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">{data.tracker.funnelStages?.length || 0} stages</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                    {(data.tracker.funnelStages || []).map((stage) => (
                      <div key={stage.id} className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
                        <p className="text-sm font-semibold text-zinc-100">{stage.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">{stage.metricLabel}</p>
                        <p className="text-sm text-[#d4b461] mt-1">{stage.metricValue}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Mission Map</p>
                      <p className="text-lg font-semibold text-white mt-1">Every phase, step, and visible action</p>
                    </div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">{data.tracker.phases.length} phases</Badge>
                  </div>

                  <div className="space-y-4">
                    {data.tracker.phases.map((phase, index) => (
                      <div key={phase.id} className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
                            {phase.status === "completed" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : phase.status === "locked" ? <Lock className="w-5 h-5 text-zinc-500" /> : <span className="text-sm font-semibold">{index + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <p className="text-lg font-semibold text-white">{phase.title}</p>
                                <p className="text-sm text-zinc-500 mt-1">{phase.description}</p>
                              </div>
                              <Badge className="border border-white/10 bg-white/5 text-zinc-200">{phase.status.replace("_", " ")}</Badge>
                            </div>
                            <p className="text-sm text-zinc-300 mt-3">{phase.objective}</p>

                            <div className="space-y-3 mt-4">
                              {phase.steps.map((step) => (
                                <div key={step.id} className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                      <p className="text-sm font-semibold text-zinc-100">{step.title}</p>
                                      <p className="text-xs text-zinc-500 mt-1">{step.description}</p>
                                    </div>
                                    <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{step.status.replace("_", " ")}</span>
                                  </div>
                                  <div className="space-y-2 mt-3">
                                    {step.actions.filter((action) => action.clientVisible).map((action) => {
                                      const canClientUpdate = action.owner === "client";
                                      return (
                                        <div key={action.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-white">{action.title}</p>
                                              <p className="text-xs text-zinc-500 mt-1">{action.description}</p>
                                            </div>
                                            <Badge variant="outline" className="border-zinc-700 text-zinc-300">{action.status.replace("_", " ")}</Badge>
                                          </div>
                                          <div className="flex items-center justify-between gap-3 flex-wrap mt-3 text-[11px] text-zinc-500">
                                            <div className="flex items-center gap-3 flex-wrap">
                                              <span>Owner: {action.owner}</span>
                                              <span>Priority: {action.priority}</span>
                                              {action.dueDate ? <span>Due: {new Date(action.dueDate).toLocaleDateString()}</span> : null}
                                            </div>
                                            {canClientUpdate && action.status !== "completed" ? (
                                              <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" className="h-8 border-zinc-700 text-zinc-200" onClick={() => updateAction.mutate({ actionId: action.id, status: "in_progress" })}>
                                                  Start
                                                </Button>
                                                <Button size="sm" className="h-8" onClick={() => updateAction.mutate({ actionId: action.id, status: "completed" })}>
                                                  Mark done
                                                </Button>
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#d4b461]" />
                    <p className="text-sm font-semibold text-white">Your Queue</p>
                  </div>
                  <div className="space-y-3">
                    {clientActions.filter((action) => action.status !== "completed").slice(0, 5).map((action) => (
                      <div key={action.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
                        <p className="text-sm font-medium text-white">{action.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">{action.phaseTitle} · {action.stepTitle}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline" className="h-8 border-zinc-700 text-zinc-200" onClick={() => updateAction.mutate({ actionId: action.id, status: "in_progress" })}>
                            Start
                          </Button>
                          <Button size="sm" className="h-8" onClick={() => updateAction.mutate({ actionId: action.id, status: "completed" })}>
                            Complete
                          </Button>
                        </div>
                      </div>
                    ))}
                    {clientActions.filter((action) => action.status !== "completed").length === 0 ? (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-white">You’re clear right now</p>
                        <p className="text-xs text-zinc-400 mt-1">The team has the ball. We’ll surface the next client action here.</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-[#d4b461]" />
                    <p className="text-sm font-semibold text-white">Action Columns</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Client Actions</p>
                      <p className="text-lg font-semibold text-white mt-1">{data.summary.clientQueueCount}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Approvals</p>
                      <p className="text-lg font-semibold text-white mt-1">{data.summary.approvalCount}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Blockers</p>
                      <p className="text-lg font-semibold text-white mt-1">{data.summary.blockerCount}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-[#d4b461]" />
                    <p className="text-sm font-semibold text-white">Execution Team</p>
                  </div>
                  <div className="space-y-2">
                    {(data.tracker.teamMembers || []).map((member) => (
                      <div key={member.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
                        <p className="text-sm font-medium text-white">{member.name}</p>
                        <p className="text-xs text-zinc-500 mt-1">{member.role} · {member.focus}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <p className="text-sm font-semibold text-white">Approvals & Deliverables</p>
                  </div>
                  <div className="space-y-3">
                    {visibleDeliverables.map((deliverable) => (
                      <div key={deliverable.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{deliverable.title}</p>
                            <p className="text-xs text-zinc-500 mt-1">{deliverable.type} deliverable · v{deliverable.version || 1}</p>
                          </div>
                          <Badge variant="outline" className="border-zinc-700 text-zinc-300">{deliverable.status.replace("_", " ")}</Badge>
                        </div>
                        {deliverable.approvalRequired ? <p className="text-[11px] text-amber-400 mt-2">Approval required</p> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CircleDashed className="w-4 h-4 text-zinc-300" />
                    <p className="text-sm font-semibold text-white">Pipeline Snapshot</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(data.tracker.crmPipeline || []).map((stage) => (
                      <div key={stage.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                        <p className="text-xs text-zinc-500">{stage.title}</p>
                        <p className="text-lg font-semibold text-white mt-1">{stage.count}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock3 className="w-4 h-4 text-sky-400" />
                    <p className="text-sm font-semibold text-white">Recent Updates</p>
                  </div>
                  <div className="space-y-4">
                    {data.tracker.updates.slice(0, 6).map((update) => (
                      <div key={update.id} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-white shrink-0">
                          {update.type === "milestone" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : update.type === "alert" ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <Activity className="w-4 h-4 text-sky-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{update.title}</p>
                          <p className="text-xs text-zinc-500 mt-1">{update.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CircleDashed className="w-4 h-4 text-zinc-300" />
                    <p className="text-sm font-semibold text-white">Need more context?</p>
                  </div>
                  <div className="space-y-2">
                    <Link href="/dashboard" className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm text-zinc-200 hover:border-zinc-700">
                      Go back to dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/documents" className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm text-zinc-200 hover:border-zinc-700">
                      Review shared documents
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
