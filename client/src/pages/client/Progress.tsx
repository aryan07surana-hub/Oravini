import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock3,
  FileText,
  Lock,
  Radar,
  Rocket,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Users,
  Zap,
} from "lucide-react";

import ClientLayout from "@/components/layout/ClientLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const priorityTone = {
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  medium: "border-zinc-600/30 bg-zinc-600/10 text-zinc-300",
  low: "border-zinc-700/30 bg-zinc-700/10 text-zinc-400",
} as const;

const statusIcon = {
  pending: <CircleDashed className="w-3.5 h-3.5 text-zinc-500" />,
  in_progress: <Activity className="w-3.5 h-3.5 text-sky-400" />,
  review: <Clock3 className="w-3.5 h-3.5 text-amber-400" />,
  blocked: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
};

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
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

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
      toast({ title: "Tracker updated", description: "Your project tracker now reflects the latest action." });
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

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  // Auto-expand active phase
  useMemo(() => {
    if (data?.tracker) {
      const activePhase = data.tracker.phases.find((p) => p.status === "in_progress");
      if (activePhase) setExpandedPhases(new Set([activePhase.id]));
    }
  }, [data?.tracker]);

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
            <a href="/select-plan" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm mt-6" style={{ background: "#d4b461", color: "#000" }}>
              Upgrade to Tier 5 <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-5 lg:p-8 max-w-7xl mx-auto space-y-6">
        {isLoading || !data ? (
          <div className="space-y-4">
            <Skeleton className="h-56 w-full rounded-[28px]" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[24px]" />)}
            </div>
            <Skeleton className="h-96 w-full rounded-[28px]" />
          </div>
        ) : (
          <>
            {/* ═══════════════ HERO SECTION ═══════════════ */}
            <div className="relative overflow-hidden rounded-[30px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(212,180,97,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.08),_transparent_24%),linear-gradient(135deg,rgba(10,10,10,0.98)_0%,rgba(17,17,20,0.98)_100%)] p-6 lg:p-8">
              <div className="absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,_rgba(212,180,97,0.1),_transparent_60%)] pointer-events-none" />
              <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                {/* Left: Project info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={`border ${toneMap[data.tracker.health]}`}>{data.tracker.health.replace("_", " ")}</Badge>
                    <span className="text-xs text-zinc-500">{data.tracker.programName}</span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-white">{data.tracker.projectName}</h1>
                  <p className="text-sm text-zinc-400">Managed by {data.tracker.managerName}</p>

                  {/* Current phase highlight */}
                  <div className="rounded-2xl border border-[#d4b461]/20 bg-[#d4b461]/5 px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#d4b461]">You Are Here</p>
                    <p className="text-lg font-semibold text-white mt-2">{data.currentPhase?.title || data.summary.currentPhaseTitle}</p>
                    <p className="text-sm text-zinc-300 mt-1">{data.tracker.currentFocus}</p>
                  </div>
                </div>

                {/* Right: Progress ring */}
                <div className="rounded-[24px] border border-white/10 bg-black/30 p-5 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-4 border-[#d4b461]/30 flex items-center justify-center relative">
                    <span className="text-2xl font-bold text-white">{data.completion}%</span>
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(212,180,97,0.5)" strokeWidth="4" strokeDasharray={`${(data.completion / 100) * 226} 226`} strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3 uppercase tracking-[0.2em]">Mission Progress</p>
                  <div className="grid grid-cols-3 gap-2 mt-4 w-full">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white">{data.summary.clientQueueCount}</p>
                      <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-500">For You</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white">{data.summary.approvalCount}</p>
                      <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-500">Approvals</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white">{data.summary.blockerCount}</p>
                      <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-500">Blockers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════ PHASE STEPPER (horizontal) ═══════════════ */}
            <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-4 overflow-x-auto">
              <div className="flex items-center gap-1 min-w-max">
                {data.tracker.phases.map((phase, i) => {
                  const isActive = phase.status === "in_progress";
                  const isCompleted = phase.status === "completed";
                  const isLocked = phase.status === "locked";
                  return (
                    <div key={phase.id} className="flex items-center">
                      <button
                        onClick={() => !isLocked && togglePhase(phase.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-medium whitespace-nowrap ${
                          isActive ? "bg-[#d4b461]/15 border border-[#d4b461]/30 text-[#f3deb0]" :
                          isCompleted ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" :
                          "bg-zinc-900/50 border border-zinc-800 text-zinc-500"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : isLocked ? <Lock className="w-3 h-3" /> : <span className="w-4 h-4 rounded-full bg-[#d4b461]/30 flex items-center justify-center text-[9px] font-bold text-[#d4b461]">{i + 1}</span>}
                        <span className="hidden md:inline">{phase.title.length > 18 ? phase.title.slice(0, 18) + "…" : phase.title}</span>
                        <span className="md:hidden">{i + 1}</span>
                      </button>
                      {i < data.tracker.phases.length - 1 && <ChevronRight className="w-3 h-3 text-zinc-700 mx-0.5 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ═══════════════ MAIN CONTENT: TABBED SECTIONS ═══════════════ */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="!grid !grid-cols-2 md:!grid-cols-5 bg-zinc-900/80 border border-zinc-800 h-auto w-full gap-1 p-1 rounded-2xl">
                <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-[#d4b461]/15 data-[state=active]:text-[#f3deb0]">Overview</TabsTrigger>
                <TabsTrigger value="phases" className="rounded-xl data-[state=active]:bg-[#d4b461]/15 data-[state=active]:text-[#f3deb0]">Mission Map</TabsTrigger>
                <TabsTrigger value="pipeline" className="rounded-xl data-[state=active]:bg-[#d4b461]/15 data-[state=active]:text-[#f3deb0]">Pipeline</TabsTrigger>
                <TabsTrigger value="deliverables" className="rounded-xl data-[state=active]:bg-[#d4b461]/15 data-[state=active]:text-[#f3deb0]">Deliverables</TabsTrigger>
                <TabsTrigger value="updates" className="rounded-xl data-[state=active]:bg-[#d4b461]/15 data-[state=active]:text-[#f3deb0]">Updates</TabsTrigger>
              </TabsList>

              {/* ─── TAB: OVERVIEW ─── */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    {/* Command cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-[20px] border border-zinc-800 bg-[#0c0c0f] p-4">
                        <div className="w-9 h-9 rounded-xl bg-[#d4b461]/15 flex items-center justify-center mb-3">
                          <Target className="w-4 h-4 text-[#d4b461]" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4b461]">Now</p>
                        <p className="text-sm text-zinc-100 mt-2 leading-relaxed">{data.tracker.currentFocus}</p>
                      </div>
                      <div className="rounded-[20px] border border-zinc-800 bg-[#0c0c0f] p-4">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center mb-3">
                          <Swords className="w-4 h-4 text-sky-400" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-400">Your Next Step</p>
                        <p className="text-sm text-zinc-100 mt-2 leading-relaxed">{data.tracker.nextClientAction}</p>
                      </div>
                      <div className="rounded-[20px] border border-zinc-800 bg-[#0c0c0f] p-4">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">Status</p>
                        <p className="text-sm text-zinc-100 mt-2 leading-relaxed capitalize">{data.tracker.projectStatus} · Phase {data.tracker.phases.findIndex((p) => p.status === "in_progress") + 1} of {data.tracker.phases.length}</p>
                      </div>
                    </div>

                    {/* Funnel Health */}
                    <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[#d4b461]" />
                          <p className="text-sm font-semibold text-white">Funnel Health</p>
                        </div>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400">{data.tracker.funnelStages?.length || 0} stages</Badge>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {(data.tracker.funnelStages || []).map((stage, idx) => (
                          <div key={stage.id} className="flex items-center gap-2 shrink-0">
                            <div className={`rounded-xl border px-3 py-2 min-w-[100px] ${stage.status === "critical" ? "border-rose-500/30 bg-rose-500/10" : stage.status === "watch" ? "border-amber-500/30 bg-amber-500/10" : "border-zinc-800 bg-zinc-900/50"}`}>
                              <p className="text-xs font-medium text-zinc-200">{stage.title}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{stage.metricLabel}</p>
                              <p className="text-sm font-semibold text-[#d4b461] mt-1">{stage.metricValue}</p>
                            </div>
                            {idx < (data.tracker.funnelStages?.length || 0) - 1 && <ArrowRight className="w-3 h-3 text-zinc-700 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CRM Snapshot */}
                    <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-[#d4b461]" />
                        <p className="text-sm font-semibold text-white">Pipeline Snapshot</p>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                        {(data.tracker.crmPipeline || []).map((stage) => (
                          <div key={stage.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-center">
                            <p className="text-lg font-semibold text-white">{stage.count}</p>
                            <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-500 mt-0.5">{stage.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Execution Board */}
                    <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Rocket className="w-4 h-4 text-[#d4b461]" />
                          <p className="text-sm font-semibold text-white">Execution Board</p>
                        </div>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400">{data.tracker.executionColumns?.length || 0} sections</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
                        {(data.tracker.executionColumns || []).map((col) => (
                          <div key={col.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-zinc-100">{col.title}</p>
                              <span className="flex items-center gap-1">{statusIcon[col.status]}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">{col.owner} · {col.status.replace("_", " ")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right column: Your Queue + Team + Quick Links */}
                  <div className="space-y-4">
                    {/* Your Queue */}
                    <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-[#d4b461]" />
                        <p className="text-sm font-semibold text-white">Your Queue</p>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400 ml-auto">{clientActions.filter((a) => a.status !== "completed").length}</Badge>
                      </div>
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {clientActions.filter((a) => a.status !== "completed").slice(0, 6).map((action) => (
                          <div key={action.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white">{action.title}</p>
                                <p className="text-[10px] text-zinc-500 mt-1">{action.phaseTitle}</p>
                              </div>
                              <Badge className={`text-[9px] border ${priorityTone[action.priority as keyof typeof priorityTone]}`}>{action.priority}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {action.status !== "in_progress" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 text-zinc-200" onClick={() => updateAction.mutate({ actionId: action.id, status: "in_progress" })}>Start</Button>
                              )}
                              <Button size="sm" className="h-7 text-xs" onClick={() => updateAction.mutate({ actionId: action.id, status: "completed" })}>Complete</Button>
                            </div>
                          </div>
                        ))}
                        {clientActions.filter((a) => a.status !== "completed").length === 0 && (
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-white">You're clear</p>
                            <p className="text-xs text-zinc-400 mt-1">The team has the ball. Next action will appear here.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Execution Team */}
                    <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-[#d4b461]" />
                        <p className="text-sm font-semibold text-white">Your Team</p>
                      </div>
                      <div className="space-y-2">
                        {(data.tracker.teamMembers || []).map((member) => (
                          <div key={member.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#d4b461]/15 flex items-center justify-center text-[10px] font-bold text-[#d4b461]">
                              {member.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-zinc-100">{member.name}</p>
                              <p className="text-[10px] text-zinc-500">{member.focus}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Links */}
                    <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                      <p className="text-sm font-semibold text-white mb-3">Quick Links</p>
                      <div className="space-y-2">
                        <Link href="/dashboard" className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-xs text-zinc-200 hover:border-zinc-700 transition-colors">
                          Dashboard <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link href="/documents" className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-xs text-zinc-200 hover:border-zinc-700 transition-colors">
                          Shared Documents <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ─── TAB: MISSION MAP (Phases) ─── */}
              <TabsContent value="phases" className="space-y-3">
                {data.tracker.phases.map((phase, index) => {
                  const isExpanded = expandedPhases.has(phase.id);
                  const isActive = phase.status === "in_progress";
                  const isCompleted = phase.status === "completed";
                  const isLocked = phase.status === "locked";
                  const phaseActions = phase.steps.flatMap((s) => s.actions.filter((a) => a.clientVisible));
                  const completedCount = phaseActions.filter((a) => a.status === "completed").length;

                  return (
                    <div key={phase.id} className={`rounded-[20px] border transition-all ${isActive ? "border-[#d4b461]/30 bg-[#d4b461]/[0.03]" : isCompleted ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-zinc-800 bg-[#0c0c0f]"} ${isLocked ? "opacity-60" : ""}`}>
                      {/* Phase header - always visible */}
                      <button
                        onClick={() => !isLocked && togglePhase(phase.id)}
                        className="w-full flex items-center gap-4 p-4 text-left"
                        disabled={isLocked}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-[#d4b461]/15 text-[#d4b461]" : isCompleted ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800/50 text-zinc-500"}`}>
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isLocked ? <Lock className="w-4 h-4" /> : <span className="text-sm font-bold">{index + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-semibold ${isActive ? "text-[#f3deb0]" : isCompleted ? "text-emerald-300" : "text-zinc-300"}`}>{phase.title}</p>
                            <Badge className={`text-[9px] border ${isActive ? "border-[#d4b461]/30 bg-[#d4b461]/10 text-[#d4b461]" : isCompleted ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-800/50 text-zinc-500"}`}>
                              {phase.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">{phase.description}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {!isLocked && (
                            <span className="text-[10px] text-zinc-500">{completedCount}/{phaseActions.length}</span>
                          )}
                          {!isLocked && (
                            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          )}
                        </div>
                      </button>

                      {/* Phase content - collapsible */}
                      {isExpanded && !isLocked && (
                        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/50 pt-4">
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4b461]">Objective</p>
                            <p className="text-sm text-zinc-200 mt-1">{phase.objective}</p>
                          </div>

                          {phase.steps.map((step) => (
                            <div key={step.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                  <p className="text-sm font-medium text-zinc-100">{step.title}</p>
                                  <p className="text-[10px] text-zinc-500 mt-0.5">{step.description}</p>
                                </div>
                                <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                  {statusIcon[step.status]}
                                  {step.status.replace("_", " ")}
                                </span>
                              </div>

                              <div className="space-y-2">
                                {step.actions.filter((a) => a.clientVisible).map((action) => {
                                  const canUpdate = action.owner === "client" && action.status !== "completed";
                                  return (
                                    <div key={action.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2 min-w-0">
                                          {statusIcon[action.status]}
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium text-white">{action.title}</p>
                                            <p className="text-[10px] text-zinc-500 mt-0.5">{action.description}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <Badge className={`text-[8px] border ${priorityTone[action.priority]}`}>{action.priority}</Badge>
                                          {action.requiresApproval && <Badge className="text-[8px] border border-amber-500/30 bg-amber-500/10 text-amber-300">approval</Badge>}
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
                                        <div className="flex items-center gap-3">
                                          <span>Owner: {action.owner}</span>
                                          {action.dueDate && <span>Due: {new Date(action.dueDate).toLocaleDateString()}</span>}
                                        </div>
                                        {canUpdate && (
                                          <div className="flex items-center gap-1.5">
                                            {action.status !== "in_progress" && (
                                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-zinc-700" onClick={() => updateAction.mutate({ actionId: action.id, status: "in_progress" })}>Start</Button>
                                            )}
                                            <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => updateAction.mutate({ actionId: action.id, status: "completed" })}>Done</Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </TabsContent>

              {/* ─── TAB: PIPELINE ─── */}
              <TabsContent value="pipeline" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Funnel Stages */}
                  <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-4 h-4 text-[#d4b461]" />
                      <p className="text-sm font-semibold text-white">Funnel Stages</p>
                    </div>
                    <div className="space-y-2">
                      {(data.tracker.funnelStages || []).map((stage) => (
                        <div key={stage.id} className={`rounded-xl border p-3 flex items-center justify-between ${stage.status === "critical" ? "border-rose-500/30 bg-rose-500/5" : stage.status === "watch" ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-950/80"}`}>
                          <div>
                            <p className="text-sm font-medium text-zinc-100">{stage.title}</p>
                            <p className="text-[10px] text-zinc-500">{stage.metricLabel}</p>
                          </div>
                          <p className="text-lg font-semibold text-[#d4b461]">{stage.metricValue}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CRM Pipeline */}
                  <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-4 h-4 text-[#d4b461]" />
                      <p className="text-sm font-semibold text-white">CRM Pipeline</p>
                    </div>
                    <div className="space-y-2">
                      {(data.tracker.crmPipeline || []).map((stage) => (
                        <div key={stage.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 flex items-center justify-between">
                          <p className="text-sm text-zinc-200">{stage.title}</p>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div className="h-full bg-[#d4b461]/60 rounded-full" style={{ width: `${Math.min((stage.count / Math.max(...(data.tracker.crmPipeline || []).map((s) => s.count), 1)) * 100, 100)}%` }} />
                            </div>
                            <p className="text-sm font-semibold text-white w-8 text-right">{stage.count}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content Pipeline */}
                  <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-[#d4b461]" />
                      <p className="text-sm font-semibold text-white">Content Pipeline</p>
                    </div>
                    <div className="space-y-2">
                      {(data.tracker.contentPipeline || []).map((item) => (
                        <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {statusIcon[item.status]}
                            <div>
                              <p className="text-xs font-medium text-zinc-100">{item.title}</p>
                              <p className="text-[10px] text-zinc-500 capitalize">{item.stage}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[9px]">{item.status.replace("_", " ")}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Automation Rules */}
                  <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-4 h-4 text-[#d4b461]" />
                      <p className="text-sm font-semibold text-white">Active Automations</p>
                    </div>
                    <div className="space-y-2">
                      {(data.tracker.automationRules || []).filter((r) => r.enabled).map((rule) => (
                        <div key={rule.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                          <p className="text-xs font-medium text-zinc-100">{rule.title}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">{rule.trigger} → {rule.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ─── TAB: DELIVERABLES ─── */}
              <TabsContent value="deliverables" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {(data.tracker.deliverables || []).map((deliverable) => {
                    const statusColor = deliverable.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : deliverable.status === "review" ? "border-amber-500/30 bg-amber-500/5" : deliverable.status === "in_progress" ? "border-sky-500/30 bg-sky-500/5" : "border-zinc-800 bg-zinc-950/80";
                    return (
                      <div key={deliverable.id} className={`rounded-[20px] border p-4 ${statusColor}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{deliverable.title}</p>
                            <p className="text-[10px] text-zinc-500 mt-1 capitalize">{deliverable.type} · v{deliverable.version || 1}</p>
                          </div>
                          <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[9px]">{deliverable.status.replace("_", " ")}</Badge>
                        </div>
                        {deliverable.approvalRequired && (
                          <div className="flex items-center gap-1.5 mt-3">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <p className="text-[10px] text-amber-400">Your approval required</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* ─── TAB: UPDATES ─── */}
              <TabsContent value="updates" className="space-y-4">
                <div className="rounded-[24px] border border-zinc-800 bg-[#0c0c0f] p-5">
                  <div className="space-y-4">
                    {data.tracker.updates.map((update) => (
                      <div key={update.id} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${update.type === "milestone" ? "bg-emerald-500/15" : update.type === "alert" ? "bg-amber-500/15" : update.type === "client" ? "bg-sky-500/15" : "bg-zinc-800/50"}`}>
                          {update.type === "milestone" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : update.type === "alert" ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <Activity className="w-4 h-4 text-sky-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-white">{update.title}</p>
                            <p className="text-[10px] text-zinc-500 shrink-0">{new Date(update.createdAt).toLocaleDateString()}</p>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">{update.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
