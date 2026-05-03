import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Download,
  FolderKanban,
  Gauge,
  KanbanSquare,
  Layers3,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Users,
} from "lucide-react";

import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ActionOwner, ActionPriority, ActionStatus, ProjectHealth, ProjectTracker, TeamRole } from "@shared/projectTracker";

const healthTone: Record<ProjectHealth, string> = {
  on_track: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  watch: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  blocked: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  completed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

const statusOptions: ActionStatus[] = ["pending", "in_progress", "review", "blocked", "completed"];
const ownerOptions: ActionOwner[] = ["admin", "manager", "team", "client"];
const priorityOptions: ActionPriority[] = ["critical", "high", "medium", "low"];

type ProjectSummaryResponse = {
  projects: Array<{
    client: { id: string; name: string; email: string; program?: string | null; nextCallDate?: string | null };
    tracker: ProjectTracker;
    completion: number;
    currentPhase: { title: string };
    summary: {
      blockerCount: number;
      approvalCount: number;
      clientQueueCount: number;
      nextActions: Array<{ id: string; title: string; owner: string; phaseTitle: string; dueDate: string | null }>;
    };
  }>;
  metrics: {
    totalClients: number;
    activeProjects: number;
    blockedProjects: number;
    approvalsPending: number;
  };
  alerts: Array<{ clientId: string; clientName: string; type: string; message: string }>;
};

export default function AdminProjectTracker() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [draft, setDraft] = useState<ProjectTracker | null>(null);

  const { data, isLoading } = useQuery<ProjectSummaryResponse>({
    queryKey: ["/api/admin/project-trackers"],
  });

  const selectedProject = useMemo(
    () => data?.projects.find((project) => project.client.id === selectedClientId) ?? data?.projects[0],
    [data, selectedClientId],
  );

  useEffect(() => {
    if (selectedProject && selectedProject.client.id !== selectedClientId) {
      setSelectedClientId(selectedProject.client.id);
    }
  }, [selectedProject, selectedClientId]);

  useEffect(() => {
    if (selectedProject) {
      setDraft(JSON.parse(JSON.stringify(selectedProject.tracker)));
    }
  }, [selectedProject]);

  const saveTracker = useMutation({
    mutationFn: async () => {
      if (!draft?.clientId) throw new Error("No project selected");
      return apiRequest("PUT", `/api/project-tracker/${draft.clientId}`, draft);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/project-trackers"] }),
        draft?.clientId ? queryClient.invalidateQueries({ queryKey: [`/api/project-tracker/${draft.clientId}`] }) : Promise.resolve(),
      ]);
      toast({ title: "Project tracker updated", description: "The mission board is synced for the client and admin team." });
    },
    onError: (error: any) => {
      toast({ title: "Could not save project tracker", description: error.message, variant: "destructive" });
    },
  });

  const updateDraft = (updater: (current: ProjectTracker) => ProjectTracker) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const statCards = [
    { label: "Tier 5 Clients", value: data?.metrics.totalClients ?? 0, icon: Users, tone: "from-[#141414] to-[#0d0d0d]" },
    { label: "Active Projects", value: data?.metrics.activeProjects ?? 0, icon: FolderKanban, tone: "from-[#141414] to-[#0d0d0d]" },
    { label: "Blocked Missions", value: data?.metrics.blockedProjects ?? 0, icon: ShieldAlert, tone: "from-[#141414] to-[#0d0d0d]" },
    { label: "Approvals Live", value: data?.metrics.approvalsPending ?? 0, icon: Sparkles, tone: "from-[#141414] to-[#0d0d0d]" },
  ];

  const roleOptions: TeamRole[] = ["admin", "manager", "executor"];

  const weeklyReview = useMemo(() => {
    if (!draft) return { done: 0, stuck: 0, late: 0, highPriorityOpen: 0 };
    const actions = draft.phases.flatMap((phase) => phase.steps.flatMap((step) => step.actions));
    const now = Date.now();
    return {
      done: actions.filter((action) => action.status === "completed").length,
      stuck: actions.filter((action) => action.status === "blocked").length,
      late: actions.filter((action) => action.dueDate && action.status !== "completed" && new Date(action.dueDate).getTime() < now).length,
      highPriorityOpen: actions.filter((action) => action.status !== "completed" && (action.priority === "critical" || action.priority === "high")).length,
    };
  }, [draft]);

  const exportReport = () => {
    if (!draft) return;
    const payload = {
      clientId: draft.clientId,
      projectName: draft.projectName,
      exportedAt: new Date().toISOString(),
      weeklyReview,
      tracker: draft,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.projectName.replace(/\s+/g, "-").toLowerCase()}-ops-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-[28px] border border-card-border bg-[radial-gradient(circle_at_top_left,_rgba(212,180,97,0.18),_transparent_34%),linear-gradient(140deg,#0f0f10_0%,#131314_58%,#171718_100%)] p-6 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.85)]">
          <div className="absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,_rgba(212,180,97,0.14),_transparent_60%)] pointer-events-none" />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-3 max-w-2xl">
              <Badge className="rounded-full border border-[#d4b461]/30 bg-[#d4b461]/15 text-[#f3deb0] hover:bg-[#d4b461]/20">Admin Project Command Center</Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Track every Tier 5 client like a live campaign</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  This board gives you one place to see progress, blockers, approvals, next actions, and full delivery control across client workspaces.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-card-border bg-black/25 backdrop-blur px-4 py-3 min-w-[280px] shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4b461]">Live Alerts</p>
              <div className="mt-3 space-y-2">
                {(data?.alerts.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No urgent issues right now. All missions look stable.</p>
                ) : (
                  data?.alerts.slice(0, 3).map((alert) => (
                    <div key={`${alert.clientId}-${alert.type}`} className="flex items-start gap-2 rounded-xl border border-card-border bg-black/35 px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-[#d4b461] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{alert.clientName}</p>
                        <p className="text-[11px] text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className={`border border-card-border bg-gradient-to-br ${tone} shadow-sm`}>
              <CardContent className="p-5">
                <div className="w-11 h-11 rounded-2xl bg-[#d4b461]/20 text-[#d4b461] flex items-center justify-center mb-4 shadow-lg shadow-black/20">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-3xl font-semibold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-card-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4 items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b461] mb-2">Selected Client</p>
                <Select value={selectedClientId || selectedProject?.client.id || ""} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a client mission" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.projects || []).map((project) => (
                      <SelectItem key={project.client.id} value={project.client.id}>
                        {project.client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-xl border border-card-border bg-black/25 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">Phase</p>
                  <p className="text-xs text-foreground mt-1 truncate">{selectedProject?.currentPhase?.title || "—"}</p>
                </div>
                <div className="rounded-xl border border-card-border bg-black/25 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">Progress</p>
                  <p className="text-xs text-foreground mt-1">{selectedProject?.completion ?? 0}%</p>
                </div>
                <div className="rounded-xl border border-card-border bg-black/25 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">Approvals</p>
                  <p className="text-xs text-foreground mt-1">{selectedProject?.summary.approvalCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-card-border bg-black/25 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">Blockers</p>
                  <p className="text-xs text-foreground mt-1">{selectedProject?.summary.blockerCount ?? 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <Card className="border border-card-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="border-b border-card-border bg-black/20">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Client Missions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                </div>
              ) : (
                <div className="divide-y divide-card-border">
                  {(data?.projects || []).map((project) => {
                    const active = project.client.id === selectedProject?.client.id;
                    return (
                      <button
                        key={project.client.id}
                        onClick={() => setSelectedClientId(project.client.id)}
                        className={`w-full text-left p-4 transition-all ${active ? "bg-[#141414] text-foreground border-l-2 border-[#d4b461]" : "bg-card hover:bg-black/25"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${active ? "text-foreground" : "text-foreground"}`}>{project.client.name}</p>
                            <p className={`text-xs truncate ${active ? "text-[#d4b461]/90" : "text-muted-foreground"}`}>{project.client.program || "Tier 5 Elite"}</p>
                          </div>
                          <Badge className={`border ${healthTone[project.tracker.health]} ${active ? "bg-[#d4b461]/15 text-[#f3deb0] border-[#d4b461]/35" : ""}`}>
                            {project.tracker.health.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={active ? "text-muted-foreground" : "text-muted-foreground"}>{project.currentPhase?.title || "No phase"}</span>
                            <span className={`font-semibold ${active ? "text-[#d4b461]" : "text-foreground"}`}>{project.completion}%</span>
                          </div>
                          <Progress value={project.completion} className="h-1.5 bg-white/10" />
                          <div className={`flex items-center gap-3 text-[11px] ${active ? "text-muted-foreground" : "text-muted-foreground"}`}>
                            <span>{project.summary.clientQueueCount} client items</span>
                            <span>{project.summary.approvalCount} approvals</span>
                            <span>{project.summary.blockerCount} blockers</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {!draft ? (
              <Card className="border border-card-border shadow-sm bg-card">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Layers3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  Select a client mission to edit the project tracker.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border border-card-border shadow-sm bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Layers3 className="w-4 h-4 text-[#d4b461]" />
                      Command Matrix
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-card-border bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461]">Now</p>
                      <p className="text-sm text-foreground mt-2">{draft.currentFocus}</p>
                    </div>
                    <div className="rounded-2xl border border-card-border bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461]">Next Client Move</p>
                      <p className="text-sm text-foreground mt-2">{draft.nextClientAction}</p>
                    </div>
                    <div className="rounded-2xl border border-card-border bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461]">Risk Pulse</p>
                      <p className="text-sm text-foreground mt-2">
                        {weeklyReview.stuck > 0 || weeklyReview.late > 0
                          ? `${weeklyReview.stuck} blocked · ${weeklyReview.late} late`
                          : "No active delivery risk right now"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-card-border shadow-sm overflow-hidden bg-card">
                  <CardContent className="p-6 bg-[radial-gradient(circle_at_top_right,_rgba(212,180,97,0.12),_transparent_25%),linear-gradient(180deg,#0f0f10_0%,#151516_100%)]">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-4 flex-1 min-w-[260px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`border ${healthTone[draft.health]}`}>{draft.health.replace("_", " ")}</Badge>
                          <Badge variant="outline" className="border-card-border text-muted-foreground">{draft.projectStatus}</Badge>
                          <span className="text-xs text-muted-foreground">Current phase: {selectedProject?.currentPhase?.title || "Mission planning"}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b461] mb-2">Project Name</p>
                            <Input value={draft.projectName} onChange={(e) => updateDraft((current) => ({ ...current, projectName: e.target.value }))} />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b461] mb-2">Success Manager</p>
                            <Input value={draft.managerName} onChange={(e) => updateDraft((current) => ({ ...current, managerName: e.target.value }))} />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b461] mb-2">Target Date</p>
                            <Input type="date" value={draft.targetDate ? draft.targetDate.slice(0, 10) : ""} onChange={(e) => updateDraft((current) => ({ ...current, targetDate: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b461] mb-2">Project Status</p>
                            <Select value={draft.projectStatus} onValueChange={(value: any) => updateDraft((current) => ({ ...current, projectStatus: value }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["active", "paused", "blocked", "completed"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-card-border bg-black/35 px-5 py-4 min-w-[240px] shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#d4b461]/20 text-[#d4b461] flex items-center justify-center">
                            <Gauge className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4b461]">Mission Health</p>
                            <p className="text-3xl font-semibold text-foreground">{selectedProject?.completion ?? 0}%</p>
                          </div>
                        </div>
                        <Progress value={selectedProject?.completion ?? 0} className="h-2" />
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                          <div className="rounded-2xl bg-black/35 p-2 border border-card-border">
                            <p className="text-lg font-semibold text-foreground">{selectedProject?.summary.clientQueueCount ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4b461]">Client</p>
                          </div>
                          <div className="rounded-2xl bg-black/35 p-2 border border-card-border">
                            <p className="text-lg font-semibold text-foreground">{selectedProject?.summary.approvalCount ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4b461]">Approvals</p>
                          </div>
                          <div className="rounded-2xl bg-black/35 p-2 border border-card-border">
                            <p className="text-lg font-semibold text-foreground">{selectedProject?.summary.blockerCount ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4b461]">Blockers</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
                      <div className="rounded-2xl border border-card-border bg-black/30 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b461] mb-2">Current Focus</p>
                        <Textarea value={draft.currentFocus} onChange={(e) => updateDraft((current) => ({ ...current, currentFocus: e.target.value }))} rows={3} />
                      </div>
                      <div className="rounded-2xl border border-card-border bg-black/30 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b461] mb-2">Next Client Action</p>
                        <Textarea value={draft.nextClientAction} onChange={(e) => updateDraft((current) => ({ ...current, nextClientAction: e.target.value }))} rows={3} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
                  <div className="space-y-4">
                    {draft.phases.map((phase, phaseIndex) => (
                      <Card key={phase.id} className="border border-card-border shadow-sm overflow-hidden bg-card">
                        <CardHeader className="border-b border-card-border bg-black/20">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-2 flex-1 min-w-[240px]">
                              <Input
                                value={phase.title}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const phases = [...current.phases];
                                    phases[phaseIndex] = { ...phase, title: e.target.value };
                                    return { ...current, phases };
                                  })
                                }
                                className="text-base font-semibold"
                              />
                              <Textarea
                                value={phase.description}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const phases = [...current.phases];
                                    phases[phaseIndex] = { ...phase, description: e.target.value };
                                    return { ...current, phases };
                                  })
                                }
                                rows={2}
                              />
                            </div>
                            <div className="w-[180px]">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461] mb-2">Phase Status</p>
                              <Select
                                value={phase.status}
                                onValueChange={(value: any) =>
                                  updateDraft((current) => {
                                    const phases = [...current.phases];
                                    phases[phaseIndex] = { ...phase, status: value };
                                    return { ...current, phases };
                                  })
                                }
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["locked", "in_progress", "review", "completed"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div className="rounded-2xl border border-card-border bg-black/30 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461] mb-2">Phase Objective</p>
                            <Textarea
                              value={phase.objective}
                              onChange={(e) =>
                                updateDraft((current) => {
                                  const phases = [...current.phases];
                                  phases[phaseIndex] = { ...phase, objective: e.target.value };
                                  return { ...current, phases };
                                })
                              }
                              rows={2}
                            />
                          </div>

                          {phase.steps.map((step, stepIndex) => (
                            <div key={step.id} className="rounded-[24px] border border-card-border bg-black/20 p-4 shadow-sm">
                              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                                <div className="min-w-[240px] flex-1">
                                  <Input
                                    value={step.title}
                                    onChange={(e) =>
                                      updateDraft((current) => {
                                        const phases = [...current.phases];
                                        const steps = [...phase.steps];
                                        steps[stepIndex] = { ...step, title: e.target.value };
                                        phases[phaseIndex] = { ...phase, steps };
                                        return { ...current, phases };
                                      })
                                    }
                                    className="font-semibold"
                                  />
                                  <Textarea
                                    value={step.description}
                                    onChange={(e) =>
                                      updateDraft((current) => {
                                        const phases = [...current.phases];
                                        const steps = [...phase.steps];
                                        steps[stepIndex] = { ...step, description: e.target.value };
                                        phases[phaseIndex] = { ...phase, steps };
                                        return { ...current, phases };
                                      })
                                    }
                                    rows={2}
                                    className="mt-2"
                                  />
                                </div>
                                <Badge variant="outline" className="text-xs border-card-border text-muted-foreground">{step.status.replace("_", " ")}</Badge>
                              </div>

                              <div className="space-y-3">
                                {step.actions.map((action, actionIndex) => (
                                  <div key={action.id} className="rounded-2xl border border-card-border bg-black/30 p-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-3 items-start">
                                      <div className="space-y-2 min-w-0">
                                        <Input
                                          value={action.title}
                                          onChange={(e) =>
                                            updateDraft((current) => {
                                              const phases = [...current.phases];
                                              const steps = [...phase.steps];
                                              const actions = [...step.actions];
                                              actions[actionIndex] = { ...action, title: e.target.value };
                                              steps[stepIndex] = { ...step, actions };
                                              phases[phaseIndex] = { ...phase, steps };
                                              return { ...current, phases };
                                            })
                                          }
                                        />
                                        <Textarea
                                          value={action.description}
                                          onChange={(e) =>
                                            updateDraft((current) => {
                                              const phases = [...current.phases];
                                              const steps = [...phase.steps];
                                              const actions = [...step.actions];
                                              actions[actionIndex] = { ...action, description: e.target.value };
                                              steps[stepIndex] = { ...step, actions };
                                              phases[phaseIndex] = { ...phase, steps };
                                              return { ...current, phases };
                                            })
                                          }
                                          rows={2}
                                        />
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <Select
                                          value={action.owner}
                                          onValueChange={(value: any) =>
                                            updateDraft((current) => {
                                              const phases = [...current.phases];
                                              const steps = [...phase.steps];
                                              const actions = [...step.actions];
                                              actions[actionIndex] = { ...action, owner: value };
                                              steps[stepIndex] = { ...step, actions };
                                              phases[phaseIndex] = { ...phase, steps };
                                              return { ...current, phases };
                                            })
                                          }
                                        >
                                          <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
                                          <SelectContent>{ownerOptions.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}</SelectContent>
                                        </Select>

                                        <Select
                                          value={action.status}
                                          onValueChange={(value: any) =>
                                            updateDraft((current) => {
                                              const phases = [...current.phases];
                                              const steps = [...phase.steps];
                                              const actions = [...step.actions];
                                              actions[actionIndex] = { ...action, status: value };
                                              steps[stepIndex] = { ...step, actions };
                                              phases[phaseIndex] = { ...phase, steps };
                                              return { ...current, phases };
                                            })
                                          }
                                        >
                                          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                          <SelectContent>{statusOptions.map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent>
                                        </Select>

                                        <Select
                                          value={action.priority}
                                          onValueChange={(value: any) =>
                                            updateDraft((current) => {
                                              const phases = [...current.phases];
                                              const steps = [...phase.steps];
                                              const actions = [...step.actions];
                                              actions[actionIndex] = { ...action, priority: value };
                                              steps[stepIndex] = { ...step, actions };
                                              phases[phaseIndex] = { ...phase, steps };
                                              return { ...current, phases };
                                            })
                                          }
                                        >
                                          <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                                          <SelectContent>{priorityOptions.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent>
                                        </Select>

                                        <Input
                                          type="date"
                                          value={action.dueDate ? action.dueDate.slice(0, 10) : ""}
                                          onChange={(e) =>
                                            updateDraft((current) => {
                                              const phases = [...current.phases];
                                              const steps = [...phase.steps];
                                              const actions = [...step.actions];
                                              actions[actionIndex] = { ...action, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null };
                                              steps[stepIndex] = { ...step, actions };
                                              phases[phaseIndex] = { ...phase, steps };
                                              return { ...current, phases };
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-2">
                                          <label className="flex items-center gap-2">
                                            <input
                                              type="checkbox"
                                              checked={action.clientVisible}
                                              onChange={(e) =>
                                                updateDraft((current) => {
                                                  const phases = [...current.phases];
                                                  const steps = [...phase.steps];
                                                  const actions = [...step.actions];
                                                  actions[actionIndex] = { ...action, clientVisible: e.target.checked };
                                                  steps[stepIndex] = { ...step, actions };
                                                  phases[phaseIndex] = { ...phase, steps };
                                                  return { ...current, phases };
                                                })
                                              }
                                            />
                                            Client visible
                                          </label>
                                          <label className="flex items-center gap-2">
                                            <input
                                              type="checkbox"
                                              checked={action.requiresApproval}
                                              onChange={(e) =>
                                                updateDraft((current) => {
                                                  const phases = [...current.phases];
                                                  const steps = [...phase.steps];
                                                  const actions = [...step.actions];
                                                  actions[actionIndex] = { ...action, requiresApproval: e.target.checked };
                                                  steps[stepIndex] = { ...step, actions };
                                                  phases[phaseIndex] = { ...phase, steps };
                                                  return { ...current, phases };
                                                })
                                              }
                                            />
                                            Approval
                                          </label>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <Card className="border border-card-border shadow-sm bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Swords className="w-4 h-4" />
                          Tactical Queue
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedProject?.summary.nextActions.slice(0, 5).map((action) => (
                          <div key={action.id} className="rounded-2xl border border-card-border bg-black/25 px-3 py-2">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <div className="flex items-center justify-between gap-3 mt-1 text-[11px] text-muted-foreground">
                              <span>{action.phaseTitle}</span>
                              <span>{action.owner}</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border border-card-border shadow-sm bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <CircleDot className="w-4 h-4" />
                          Client Feed
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {draft.updates.slice(0, 6).map((update) => (
                          <div key={update.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-2xl bg-[#d4b461]/20 text-[#d4b461] flex items-center justify-center shrink-0">
                              {update.type === "alert" ? <ShieldAlert className="w-4 h-4" /> : update.type === "milestone" ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{update.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{update.message}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border border-card-border shadow-sm bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Quick Links
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Link href={`/admin/clients/${selectedProject?.client.id || ""}`} className="flex items-center justify-between rounded-2xl border border-card-border px-3 py-2 text-sm text-muted-foreground hover:bg-black/25 hover:text-foreground">
                          Open client detail
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                        <Link href="/admin/clients" className="flex items-center justify-between rounded-2xl border border-card-border px-3 py-2 text-sm text-muted-foreground hover:bg-black/25 hover:text-foreground">
                          View all elite clients
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
                  <Card className="border border-card-border shadow-sm bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-[#d4b461]" />
                        Fulfillment Operating System
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(draft?.sopTemplates || []).map((template, index) => (
                          <div key={template.id} className="rounded-2xl border border-card-border bg-black/20 p-4 space-y-2">
                            <Input
                              value={template.title}
                              onChange={(e) =>
                                updateDraft((current) => {
                                  const sopTemplates = [...current.sopTemplates];
                                  sopTemplates[index] = { ...template, title: e.target.value };
                                  return { ...current, sopTemplates };
                                })
                              }
                              className="font-semibold"
                            />
                            <Textarea
                              value={template.purpose}
                              rows={2}
                              onChange={(e) =>
                                updateDraft((current) => {
                                  const sopTemplates = [...current.sopTemplates];
                                  sopTemplates[index] = { ...template, purpose: e.target.value };
                                  return { ...current, sopTemplates };
                                })
                              }
                            />
                            <p className="text-[11px] text-muted-foreground">{template.steps.length} SOP steps</p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-card-border bg-black/25 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461] mb-3">Funnel & System Overview</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(draft?.funnelStages || []).map((stage, idx) => (
                            <div key={stage.id} className="flex items-center gap-2">
                              <div className="rounded-xl border border-card-border bg-black/30 px-3 py-1.5 text-xs text-foreground">
                                {stage.title}
                                <span className="ml-2 text-[#d4b461]">{stage.metricLabel}: {stage.metricValue}</span>
                              </div>
                              {idx < (draft?.funnelStages.length || 0) - 1 ? <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /> : null}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          Funnel metrics are now tied to each client workspace so performance context stays visible while editing execution.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-card-border bg-black/25 p-4 space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461]">Automation Center</p>
                        {(draft?.automationRules || []).map((rule, index) => (
                          <div key={rule.id} className="rounded-xl border border-card-border bg-black/30 p-3 space-y-2">
                            <Input
                              value={rule.title}
                              onChange={(e) =>
                                updateDraft((current) => {
                                  const automationRules = [...current.automationRules];
                                  automationRules[index] = { ...rule, title: e.target.value };
                                  return { ...current, automationRules };
                                })
                              }
                            />
                            <Input
                              value={rule.trigger}
                              onChange={(e) =>
                                updateDraft((current) => {
                                  const automationRules = [...current.automationRules];
                                  automationRules[index] = { ...rule, trigger: e.target.value };
                                  return { ...current, automationRules };
                                })
                              }
                            />
                            <Input
                              value={rule.action}
                              onChange={(e) =>
                                updateDraft((current) => {
                                  const automationRules = [...current.automationRules];
                                  automationRules[index] = { ...rule, action: e.target.value };
                                  return { ...current, automationRules };
                                })
                              }
                            />
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={rule.enabled}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const automationRules = [...current.automationRules];
                                    automationRules[index] = { ...rule, enabled: e.target.checked };
                                    return { ...current, automationRules };
                                  })
                                }
                              />
                              Rule enabled
                            </label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-card-border shadow-sm bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#d4b461]" />
                        Weekly Review System
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-2xl border border-card-border bg-black/25 p-3 space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4b461]">Team Management</p>
                        {(draft?.teamMembers || []).map((member, index) => (
                          <div key={member.id} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px] gap-2">
                            <Input
                              value={member.name}
                              onChange={(e) =>
                                updateDraft((current) => {
                                  const teamMembers = [...current.teamMembers];
                                  teamMembers[index] = { ...member, name: e.target.value };
                                  return { ...current, teamMembers };
                                })
                              }
                            />
                            <Select
                              value={member.role}
                              onValueChange={(value: TeamRole) =>
                                updateDraft((current) => {
                                  const teamMembers = [...current.teamMembers];
                                  teamMembers[index] = { ...member, role: value };
                                  return { ...current, teamMembers };
                                })
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{roleOptions.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-card-border bg-black/25 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">What got done?</p>
                        <p className="text-xl font-semibold text-foreground">{weeklyReview.done}</p>
                      </div>
                      <div className="rounded-2xl border border-card-border bg-black/25 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">What is stuck?</p>
                        <p className="text-xl font-semibold text-foreground">{weeklyReview.stuck}</p>
                      </div>
                      <div className="rounded-2xl border border-card-border bg-black/25 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">What is late?</p>
                        <p className="text-xl font-semibold text-foreground">{weeklyReview.late}</p>
                      </div>
                      <div className="rounded-2xl border border-card-border bg-black/25 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">Next priority load</p>
                        <p className="text-xl font-semibold text-[#d4b461]">{weeklyReview.highPriorityOpen}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border border-card-border shadow-sm bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <KanbanSquare className="w-4 h-4 text-[#d4b461]" />
                      Advanced Control Modules
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="tasks">
                      <TabsList className="!grid !grid-cols-2 md:!grid-cols-3 xl:!grid-cols-6 bg-black/30 border border-card-border h-auto w-full gap-1 p-1">
                        <TabsTrigger className="w-full" value="tasks">Sections Board</TabsTrigger>
                        <TabsTrigger className="w-full" value="deliverables">Deliverables</TabsTrigger>
                        <TabsTrigger className="w-full" value="crm">CRM</TabsTrigger>
                        <TabsTrigger className="w-full" value="content">Content</TabsTrigger>
                        <TabsTrigger className="w-full" value="comms">Comms</TabsTrigger>
                        <TabsTrigger className="w-full" value="analytics">Analytics</TabsTrigger>
                      </TabsList>

                      <TabsContent value="tasks" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {(draft?.executionColumns || []).map((section, index) => (
                            <div key={section.id} className="rounded-2xl border border-card-border bg-black/20 p-3 space-y-2">
                              <Input
                                value={section.title}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const executionColumns = [...current.executionColumns];
                                    executionColumns[index] = { ...section, title: e.target.value };
                                    return { ...current, executionColumns };
                                  })
                                }
                                className="font-semibold"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Select
                                  value={section.status}
                                  onValueChange={(value: any) =>
                                    updateDraft((current) => {
                                      const executionColumns = [...current.executionColumns];
                                      executionColumns[index] = { ...section, status: value };
                                      return { ...current, executionColumns };
                                    })
                                  }
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{statusOptions.map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select
                                  value={section.owner}
                                  onValueChange={(value: any) =>
                                    updateDraft((current) => {
                                      const executionColumns = [...current.executionColumns];
                                      executionColumns[index] = { ...section, owner: value };
                                      return { ...current, executionColumns };
                                    })
                                  }
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{ownerOptions.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <Textarea
                                rows={2}
                                value={section.notes}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const executionColumns = [...current.executionColumns];
                                    executionColumns[index] = { ...section, notes: e.target.value };
                                    return { ...current, executionColumns };
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="deliverables" className="mt-4">
                        <div className="space-y-3">
                          {(draft?.deliverables || []).map((deliverable, index) => (
                            <div key={deliverable.id} className="rounded-2xl border border-card-border bg-black/20 p-3 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_140px_120px_140px] gap-3">
                              <div className="space-y-2">
                                <Input
                                  value={deliverable.title}
                                  onChange={(e) =>
                                    updateDraft((current) => {
                                      const deliverables = [...current.deliverables];
                                      deliverables[index] = { ...deliverable, title: e.target.value };
                                      return { ...current, deliverables };
                                    })
                                  }
                                />
                                <Input
                                  value={deliverable.type}
                                  onChange={(e) =>
                                    updateDraft((current) => {
                                      const deliverables = [...current.deliverables];
                                      deliverables[index] = { ...deliverable, type: e.target.value };
                                      return { ...current, deliverables };
                                    })
                                  }
                                />
                              </div>
                              <Select
                                value={deliverable.status}
                                onValueChange={(value: any) =>
                                  updateDraft((current) => {
                                    const deliverables = [...current.deliverables];
                                    deliverables[index] = { ...deliverable, status: value };
                                    return { ...current, deliverables };
                                  })
                                }
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["queued", "in_progress", "review", "approved"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                value={deliverable.version || 1}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const deliverables = [...current.deliverables];
                                    deliverables[index] = { ...deliverable, version: Number(e.target.value || 1) };
                                    return { ...current, deliverables };
                                  })
                                }
                              />
                              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={!!deliverable.approvalRequired}
                                  onChange={(e) =>
                                    updateDraft((current) => {
                                      const deliverables = [...current.deliverables];
                                      deliverables[index] = { ...deliverable, approvalRequired: e.target.checked };
                                      return { ...current, deliverables };
                                    })
                                  }
                                />
                                Approval required
                              </label>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="crm" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                          {(draft?.crmPipeline || []).map((stage, index) => (
                            <div key={stage.id} className="rounded-2xl border border-card-border bg-black/20 p-3 space-y-2">
                              <Input
                                value={stage.title}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const crmPipeline = [...current.crmPipeline];
                                    crmPipeline[index] = { ...stage, title: e.target.value };
                                    return { ...current, crmPipeline };
                                  })
                                }
                              />
                              <Input
                                type="number"
                                value={stage.count}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const crmPipeline = [...current.crmPipeline];
                                    crmPipeline[index] = { ...stage, count: Number(e.target.value || 0) };
                                    return { ...current, crmPipeline };
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="content" className="mt-4">
                        <div className="space-y-2">
                          {(draft?.contentPipeline || []).map((item, index) => (
                            <div key={item.id} className="rounded-xl border border-card-border bg-black/20 p-3 grid grid-cols-1 xl:grid-cols-[130px_minmax(0,1fr)_140px] gap-2">
                              <Input value={item.stage} readOnly />
                              <Input
                                value={item.title}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const contentPipeline = [...current.contentPipeline];
                                    contentPipeline[index] = { ...item, title: e.target.value };
                                    return { ...current, contentPipeline };
                                  })
                                }
                              />
                              <Select
                                value={item.status}
                                onValueChange={(value: any) =>
                                  updateDraft((current) => {
                                    const contentPipeline = [...current.contentPipeline];
                                    contentPipeline[index] = { ...item, status: value };
                                    return { ...current, contentPipeline };
                                  })
                                }
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{statusOptions.map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="comms" className="mt-4">
                        <div className="space-y-2">
                          {(draft?.communicationThreads || []).map((thread, index) => (
                            <div key={thread.id} className="rounded-xl border border-card-border bg-black/20 p-3 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <Input
                                  value={thread.topic}
                                  onChange={(e) =>
                                    updateDraft((current) => {
                                      const communicationThreads = [...current.communicationThreads];
                                      communicationThreads[index] = { ...thread, topic: e.target.value };
                                      return { ...current, communicationThreads };
                                    })
                                  }
                                />
                                <Badge variant="outline" className="border-card-border text-muted-foreground">{thread.type}</Badge>
                              </div>
                              <Textarea
                                value={thread.lastMessage}
                                rows={2}
                                onChange={(e) =>
                                  updateDraft((current) => {
                                    const communicationThreads = [...current.communicationThreads];
                                    communicationThreads[index] = { ...thread, lastMessage: e.target.value };
                                    return { ...current, communicationThreads };
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="analytics" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                          <div className="rounded-2xl border border-card-border bg-black/20 p-3">
                            <p className="text-xs text-muted-foreground">Completion</p>
                            <p className="text-2xl font-semibold text-foreground">{selectedProject?.completion ?? 0}%</p>
                          </div>
                          <div className="rounded-2xl border border-card-border bg-black/20 p-3">
                            <p className="text-xs text-muted-foreground">Blocked items</p>
                            <p className="text-2xl font-semibold text-foreground">{weeklyReview.stuck}</p>
                          </div>
                          <div className="rounded-2xl border border-card-border bg-black/20 p-3">
                            <p className="text-xs text-muted-foreground">Approvals pending</p>
                            <p className="text-2xl font-semibold text-foreground">{selectedProject?.summary.approvalCount ?? 0}</p>
                          </div>
                          <div className="rounded-2xl border border-card-border bg-black/20 p-3">
                            <p className="text-xs text-muted-foreground">CRM closed</p>
                            <p className="text-2xl font-semibold text-[#d4b461]">{draft?.crmPipeline?.find((x) => x.id === "crm-closed")?.count ?? 0}</p>
                          </div>
                        </div>
                        <Button onClick={exportReport} className="rounded-xl">
                          <Download className="w-4 h-4 mr-2" />
                          Export report snapshot
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => saveTracker.mutate()} disabled={saveTracker.isPending} className="min-w-[180px] rounded-xl">
                    {saveTracker.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {saveTracker.isPending ? "Saving mission board..." : "Save project tracker"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
