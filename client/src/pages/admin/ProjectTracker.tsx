import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FolderKanban,
  Gauge,
  Layers3,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ActionOwner, ActionPriority, ActionStatus, ProjectHealth, ProjectTracker } from "@shared/projectTracker";

const healthTone: Record<ProjectHealth, string> = {
  on_track: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  watch: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  blocked: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  completed: "bg-sky-500/10 text-sky-600 border-sky-500/20",
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
    { label: "Tier 5 Clients", value: data?.metrics.totalClients ?? 0, icon: Users, tone: "from-slate-100 to-white" },
    { label: "Active Projects", value: data?.metrics.activeProjects ?? 0, icon: FolderKanban, tone: "from-sky-100 to-white" },
    { label: "Blocked Missions", value: data?.metrics.blockedProjects ?? 0, icon: ShieldAlert, tone: "from-rose-100 to-white" },
    { label: "Approvals Live", value: data?.metrics.approvalsPending ?? 0, icon: Sparkles, tone: "from-amber-100 to-white" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef2ff_100%)] p-6 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)]">
          <div className="absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.12),_transparent_60%)] pointer-events-none" />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-3 max-w-2xl">
              <Badge className="rounded-full border-0 bg-slate-900 text-white hover:bg-slate-900">Admin Project Command Center</Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Track every Tier 5 client like a live campaign</h1>
                <p className="text-sm text-slate-600 mt-2">
                  This board gives you one place to see progress, blockers, approvals, next actions, and full delivery control across client workspaces.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur px-4 py-3 min-w-[280px] shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Live Alerts</p>
              <div className="mt-3 space-y-2">
                {(data?.alerts.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500">No urgent issues right now. All missions look stable.</p>
                ) : (
                  data?.alerts.slice(0, 3).map((alert) => (
                    <div key={`${alert.clientId}-${alert.type}`} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900">{alert.clientName}</p>
                        <p className="text-[11px] text-slate-600">{alert.message}</p>
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
            <Card key={label} className={`border-slate-200 bg-gradient-to-br ${tone} shadow-sm`}>
              <CardContent className="p-5">
                <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center mb-4 shadow-lg shadow-slate-900/10">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-3xl font-semibold text-slate-950">{value}</p>
                <p className="text-sm text-slate-600 mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-slate-50/80">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
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
                <div className="divide-y divide-slate-200">
                  {(data?.projects || []).map((project) => {
                    const active = project.client.id === selectedProject?.client.id;
                    return (
                      <button
                        key={project.client.id}
                        onClick={() => setSelectedClientId(project.client.id)}
                        className={`w-full text-left p-4 transition-all ${active ? "bg-slate-950 text-white" : "bg-white hover:bg-slate-50"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${active ? "text-white" : "text-slate-900"}`}>{project.client.name}</p>
                            <p className={`text-xs truncate ${active ? "text-slate-300" : "text-slate-500"}`}>{project.client.program || "Tier 5 Elite"}</p>
                          </div>
                          <Badge className={`border ${healthTone[project.tracker.health]} ${active ? "bg-white/10 text-white border-white/20" : ""}`}>
                            {project.tracker.health.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={active ? "text-slate-300" : "text-slate-500"}>{project.currentPhase?.title || "No phase"}</span>
                            <span className={`font-semibold ${active ? "text-white" : "text-slate-900"}`}>{project.completion}%</span>
                          </div>
                          <Progress value={project.completion} className="h-1.5 bg-white/10" />
                          <div className={`flex items-center gap-3 text-[11px] ${active ? "text-slate-300" : "text-slate-500"}`}>
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
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-12 text-center text-slate-500">
                  <Layers3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  Select a client mission to edit the project tracker.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                  <CardContent className="p-6 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_25%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-4 flex-1 min-w-[260px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`border ${healthTone[draft.health]}`}>{draft.health.replace("_", " ")}</Badge>
                          <Badge variant="outline" className="border-slate-300 text-slate-700">{draft.projectStatus}</Badge>
                          <span className="text-xs text-slate-500">Current phase: {selectedProject?.currentPhase?.title || "Mission planning"}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">Project Name</p>
                            <Input value={draft.projectName} onChange={(e) => updateDraft((current) => ({ ...current, projectName: e.target.value }))} />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">Success Manager</p>
                            <Input value={draft.managerName} onChange={(e) => updateDraft((current) => ({ ...current, managerName: e.target.value }))} />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">Target Date</p>
                            <Input type="date" value={draft.targetDate ? draft.targetDate.slice(0, 10) : ""} onChange={(e) => updateDraft((current) => ({ ...current, targetDate: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">Project Status</p>
                            <Select value={draft.projectStatus} onValueChange={(value: any) => updateDraft((current) => ({ ...current, projectStatus: value }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["active", "paused", "blocked", "completed"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 min-w-[240px] shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
                            <Gauge className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Mission Health</p>
                            <p className="text-3xl font-semibold text-slate-950">{selectedProject?.completion ?? 0}%</p>
                          </div>
                        </div>
                        <Progress value={selectedProject?.completion ?? 0} className="h-2" />
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                          <div className="rounded-2xl bg-slate-50 p-2">
                            <p className="text-lg font-semibold text-slate-950">{selectedProject?.summary.clientQueueCount ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Client</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-2">
                            <p className="text-lg font-semibold text-slate-950">{selectedProject?.summary.approvalCount ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Approvals</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-2">
                            <p className="text-lg font-semibold text-slate-950">{selectedProject?.summary.blockerCount ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Blockers</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
                      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">Current Focus</p>
                        <Textarea value={draft.currentFocus} onChange={(e) => updateDraft((current) => ({ ...current, currentFocus: e.target.value }))} rows={3} />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">Next Client Action</p>
                        <Textarea value={draft.nextClientAction} onChange={(e) => updateDraft((current) => ({ ...current, nextClientAction: e.target.value }))} rows={3} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
                  <div className="space-y-4">
                    {draft.phases.map((phase, phaseIndex) => (
                      <Card key={phase.id} className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-slate-200 bg-slate-50/80">
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
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Phase Status</p>
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
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Phase Objective</p>
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
                            <div key={step.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
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
                                <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">{step.status.replace("_", " ")}</Badge>
                              </div>

                              <div className="space-y-3">
                                {step.actions.map((action, actionIndex) => (
                                  <div key={action.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_140px_140px_140px_160px] gap-3 items-start">
                                      <div className="space-y-2">
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

                                      <div className="space-y-2">
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
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
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
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Swords className="w-4 h-4" />
                          Tactical Queue
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedProject?.summary.nextActions.slice(0, 5).map((action) => (
                          <div key={action.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-sm font-medium text-slate-900">{action.title}</p>
                            <div className="flex items-center justify-between gap-3 mt-1 text-[11px] text-slate-500">
                              <span>{action.phaseTitle}</span>
                              <span>{action.owner}</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <CircleDot className="w-4 h-4" />
                          Client Feed
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {draft.updates.slice(0, 6).map((update) => (
                          <div key={update.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-2xl bg-slate-950 text-white flex items-center justify-center shrink-0">
                              {update.type === "alert" ? <ShieldAlert className="w-4 h-4" /> : update.type === "milestone" ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900">{update.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{update.message}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Quick Links
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Link href={`/admin/clients/${selectedProject?.client.id || ""}`} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          Open client detail
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                        <Link href="/admin/clients" className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          View all elite clients
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </div>

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
