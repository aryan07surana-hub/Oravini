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
  ChevronDown,
  ChevronRight,
  CircleDot,
  Download,
  FolderKanban,
  Gauge,
  KanbanSquare,
  Layers3,
  Loader2,
  MessageSquare,
  Plus,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Users,
  Zap,
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

const priorityColor: Record<ActionPriority, string> = {
  critical: "border-rose-500/40 bg-rose-500/10",
  high: "border-amber-500/30 bg-amber-500/10",
  medium: "border-zinc-700 bg-zinc-800/30",
  low: "border-zinc-800 bg-zinc-900/30",
};

const statusOptions: ActionStatus[] = ["pending", "in_progress", "review", "blocked", "completed"];
const ownerOptions: ActionOwner[] = ["admin", "manager", "team", "client"];
const priorityOptions: ActionPriority[] = ["critical", "high", "medium", "low"];
const roleOptions: TeamRole[] = ["admin", "manager", "executor"];

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
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<ProjectSummaryResponse>({
    queryKey: ["/api/admin/project-trackers"],
  });

  const selectedProject = useMemo(
    () => data?.projects.find((p) => p.client.id === selectedClientId) ?? data?.projects[0],
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
      // Auto-expand active phase
      const active = selectedProject.tracker.phases.find((p) => p.status === "in_progress");
      if (active) setExpandedPhases(new Set([active.id]));
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
      toast({ title: "Project tracker saved", description: "Mission board synced for client and admin." });
    },
    onError: (error: any) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  const updateDraft = (updater: (current: ProjectTracker) => ProjectTracker) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const weeklyReview = useMemo(() => {
    if (!draft) return { done: 0, stuck: 0, late: 0, highPriorityOpen: 0 };
    const actions = draft.phases.flatMap((phase) => phase.steps.flatMap((step) => step.actions));
    const now = Date.now();
    return {
      done: actions.filter((a) => a.status === "completed").length,
      stuck: actions.filter((a) => a.status === "blocked").length,
      late: actions.filter((a) => a.dueDate && a.status !== "completed" && new Date(a.dueDate).getTime() < now).length,
      highPriorityOpen: actions.filter((a) => a.status !== "completed" && (a.priority === "critical" || a.priority === "high")).length,
    };
  }, [draft]);

  const exportReport = () => {
    if (!draft) return;
    const payload = { clientId: draft.clientId, projectName: draft.projectName, exportedAt: new Date().toISOString(), weeklyReview, tracker: draft };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.projectName.replace(/\s+/g, "-").toLowerCase()}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: "Tier 5 Clients", value: data?.metrics.totalClients ?? 0, icon: Users },
    { label: "Active Projects", value: data?.metrics.activeProjects ?? 0, icon: FolderKanban },
    { label: "Blocked", value: data?.metrics.blockedProjects ?? 0, icon: ShieldAlert },
    { label: "Approvals", value: data?.metrics.approvalsPending ?? 0, icon: Sparkles },
  ];

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* ═══════════════ HEADER ═══════════════ */}
        <div className="relative overflow-hidden rounded-[28px] border border-card-border bg-[radial-gradient(circle_at_top_left,_rgba(212,180,97,0.15),_transparent_30%),linear-gradient(140deg,#0f0f10_0%,#131314_58%,#171718_100%)] p-6">
          <div className="absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_center,_rgba(212,180,97,0.1),_transparent_60%)] pointer-events-none" />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <Badge className="rounded-full border border-[#d4b461]/30 bg-[#d4b461]/15 text-[#f3deb0]">Admin Command Center</Badge>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">Project Tracker</h1>
              <p className="text-sm text-muted-foreground">Full delivery control across all Tier 5 client missions.</p>
            </div>
            {/* Alerts */}
            <div className="rounded-2xl border border-card-border bg-black/25 backdrop-blur px-4 py-3 min-w-[260px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4b461]">Live Alerts</p>
              <div className="mt-2 space-y-1.5">
                {(data?.alerts.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">All missions stable.</p>
                ) : (
                  data?.alerts.slice(0, 3).map((alert) => (
                    <div key={`${alert.clientId}-${alert.type}`} className="flex items-start gap-2 rounded-lg border border-card-border bg-black/30 px-2.5 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-foreground">{alert.clientName}</p>
                        <p className="text-[10px] text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ STAT CARDS ═══════════════ */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {statCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-[20px] border border-card-border bg-gradient-to-br from-[#141414] to-[#0d0d0d] p-4">
              <div className="w-10 h-10 rounded-xl bg-[#d4b461]/15 text-[#d4b461] flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ═══════════════ CLIENT SELECTOR + MAIN CONTENT ═══════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
          {/* Left: Client list */}
          <div className="rounded-[24px] border border-card-border bg-card overflow-hidden">
            <div className="border-b border-card-border bg-black/20 px-4 py-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Client Missions</p>
            </div>
            <div className="divide-y divide-card-border max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : (
                (data?.projects || []).map((project) => {
                  const active = project.client.id === selectedProject?.client.id;
                  return (
                    <button key={project.client.id} onClick={() => setSelectedClientId(project.client.id)} className={`w-full text-left p-3 transition-all ${active ? "bg-[#141414] border-l-2 border-[#d4b461]" : "hover:bg-black/20"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">{project.client.name}</p>
                        <Badge className={`text-[8px] border ${healthTone[project.tracker.health]}`}>{project.tracker.health.replace("_", " ")}</Badge>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{project.currentPhase?.title || "—"}</span>
                          <span className="font-semibold text-[#d4b461]">{project.completion}%</span>
                        </div>
                        <Progress value={project.completion} className="h-1 mt-1.5 bg-white/10" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Main editing area */}
          <div className="space-y-6">
            {!draft ? (
              <div className="rounded-[24px] border border-card-border bg-card p-12 text-center text-muted-foreground">
                <Layers3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                Select a client mission to manage.
              </div>
            ) : (
              <>
                {/* ─── STICKY SAVE BAR ─── */}
                <div className="sticky top-0 z-20 rounded-[20px] border border-card-border bg-[#0f0f10]/95 backdrop-blur-md p-3 flex items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={`border ${healthTone[draft.health]}`}>{draft.health.replace("_", " ")}</Badge>
                    <p className="text-sm font-semibold text-foreground truncate">{draft.projectName}</p>
                    <span className="text-xs text-muted-foreground hidden md:inline">· {selectedProject?.currentPhase?.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={exportReport} className="h-8 rounded-lg border-card-border">
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                    </Button>
                    <Button size="sm" onClick={() => saveTracker.mutate()} disabled={saveTracker.isPending} className="h-8 rounded-lg min-w-[100px]">
                      {saveTracker.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                      {saveTracker.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>

                {/* ─── TABBED SECTIONS ─── */}
                <Tabs defaultValue="command" className="space-y-4">
                  <TabsList className="!grid !grid-cols-2 md:!grid-cols-6 bg-black/30 border border-card-border h-auto w-full gap-1 p-1 rounded-2xl">
                    <TabsTrigger value="command" className="rounded-xl text-xs">Command</TabsTrigger>
                    <TabsTrigger value="phases" className="rounded-xl text-xs">Phases</TabsTrigger>
                    <TabsTrigger value="operations" className="rounded-xl text-xs">Operations</TabsTrigger>
                    <TabsTrigger value="pipeline" className="rounded-xl text-xs">Pipeline</TabsTrigger>
                    <TabsTrigger value="team" className="rounded-xl text-xs">Team</TabsTrigger>
                    <TabsTrigger value="analytics" className="rounded-xl text-xs">Analytics</TabsTrigger>
                  </TabsList>

                  {/* ═══ TAB: COMMAND ═══ */}
                  <TabsContent value="command" className="space-y-4">
                    {/* Project settings */}
                    <div className="rounded-[20px] border border-card-border bg-card p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4b461] mb-4">Project Settings</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1.5">Project Name</p>
                          <Input value={draft.projectName} onChange={(e) => updateDraft((c) => ({ ...c, projectName: e.target.value }))} />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1.5">Success Manager</p>
                          <Input value={draft.managerName} onChange={(e) => updateDraft((c) => ({ ...c, managerName: e.target.value }))} />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1.5">Target Date</p>
                          <Input type="date" value={draft.targetDate ? draft.targetDate.slice(0, 10) : ""} onChange={(e) => updateDraft((c) => ({ ...c, targetDate: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1.5">Status</p>
                          <Select value={draft.projectStatus} onValueChange={(v: any) => updateDraft((c) => ({ ...c, projectStatus: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{["active", "paused", "blocked", "completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Command matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-[20px] border border-card-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4b461] mb-2">Current Focus</p>
                        <Textarea value={draft.currentFocus} onChange={(e) => updateDraft((c) => ({ ...c, currentFocus: e.target.value }))} rows={3} />
                      </div>
                      <div className="rounded-[20px] border border-card-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4b461] mb-2">Next Client Action</p>
                        <Textarea value={draft.nextClientAction} onChange={(e) => updateDraft((c) => ({ ...c, nextClientAction: e.target.value }))} rows={3} />
                      </div>
                      <div className="rounded-[20px] border border-card-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4b461] mb-2">Risk Pulse</p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="rounded-lg bg-black/30 p-2 text-center">
                            <p className="text-lg font-semibold text-foreground">{weeklyReview.stuck}</p>
                            <p className="text-[9px] text-muted-foreground">Blocked</p>
                          </div>
                          <div className="rounded-lg bg-black/30 p-2 text-center">
                            <p className="text-lg font-semibold text-foreground">{weeklyReview.late}</p>
                            <p className="text-[9px] text-muted-foreground">Late</p>
                          </div>
                          <div className="rounded-lg bg-black/30 p-2 text-center">
                            <p className="text-lg font-semibold text-foreground">{weeklyReview.done}</p>
                            <p className="text-[9px] text-muted-foreground">Done</p>
                          </div>
                          <div className="rounded-lg bg-black/30 p-2 text-center">
                            <p className="text-lg font-semibold text-[#d4b461]">{weeklyReview.highPriorityOpen}</p>
                            <p className="text-[9px] text-muted-foreground">High Priority</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tactical queue */}
                    <div className="rounded-[20px] border border-card-border bg-card p-5">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-3"><Swords className="w-4 h-4" /> Next Actions</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {selectedProject?.summary.nextActions.slice(0, 6).map((action) => (
                          <div key={action.id} className="rounded-xl border border-card-border bg-black/20 p-3">
                            <p className="text-xs font-medium text-foreground">{action.title}</p>
                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                              <span>{action.phaseTitle}</span>
                              <Badge variant="outline" className="text-[8px] border-card-border">{action.owner}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ═══ TAB: PHASES ═══ */}
                  <TabsContent value="phases" className="space-y-3">
                    {draft.phases.map((phase, phaseIndex) => {
                      const isExpanded = expandedPhases.has(phase.id);
                      const isActive = phase.status === "in_progress";
                      return (
                        <div key={phase.id} className={`rounded-[20px] border transition-all ${isActive ? "border-[#d4b461]/30" : "border-card-border"} bg-card overflow-hidden`}>
                          {/* Phase header */}
                          <button onClick={() => togglePhase(phase.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/10 transition-colors">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${isActive ? "bg-[#d4b461]/15 text-[#d4b461]" : phase.status === "completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-800/50 text-zinc-500"}`}>
                              {phase.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : phaseIndex + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{phase.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{phase.description}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={`text-[8px] border ${healthTone[phase.status === "completed" ? "completed" : phase.status === "in_progress" ? "on_track" : "watch"] || "border-zinc-700 bg-zinc-800/50 text-zinc-500"}`}>
                                {phase.status.replace("_", " ")}
                              </Badge>
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </button>

                          {/* Phase content */}
                          {isExpanded && (
                            <div className="border-t border-card-border p-4 space-y-4">
                              {/* Phase meta */}
                              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_180px] gap-3">
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1">Title</p>
                                  <Input value={phase.title} onChange={(e) => updateDraft((c) => { const phases = [...c.phases]; phases[phaseIndex] = { ...phase, title: e.target.value }; return { ...c, phases }; })} />
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1">Objective</p>
                                  <Input value={phase.objective} onChange={(e) => updateDraft((c) => { const phases = [...c.phases]; phases[phaseIndex] = { ...phase, objective: e.target.value }; return { ...c, phases }; })} />
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1">Status</p>
                                  <Select value={phase.status} onValueChange={(v: any) => updateDraft((c) => { const phases = [...c.phases]; phases[phaseIndex] = { ...phase, status: v }; return { ...c, phases }; })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{["locked", "in_progress", "review", "completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Steps */}
                              {phase.steps.map((step, stepIndex) => (
                                <div key={step.id} className="rounded-xl border border-card-border bg-black/15 p-4 space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <Input value={step.title} className="font-semibold text-sm" onChange={(e) => updateDraft((c) => { const phases = [...c.phases]; const steps = [...phase.steps]; steps[stepIndex] = { ...step, title: e.target.value }; phases[phaseIndex] = { ...phase, steps }; return { ...c, phases }; })} />
                                    </div>
                                    <Badge variant="outline" className="text-[9px] border-card-border shrink-0">{step.status.replace("_", " ")}</Badge>
                                  </div>

                                  {/* Actions grid */}
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                                    {step.actions.map((action, actionIndex) => (
                                      <div key={action.id} className={`rounded-lg border p-3 space-y-2 ${priorityColor[action.priority]}`}>
                                        <Input value={action.title} className="text-xs" onChange={(e) => updateDraft((c) => { const phases = [...c.phases]; const steps = [...phase.steps]; const actions = [...step.actions]; actions[actionIndex] = { ...action, title: e.target.value }; steps[stepIndex] = { ...step, actions }; phases[phaseIndex] = { ...phase, steps }; return { ...c, phases }; })} />
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <Select value={action.status} onValueChange={(v: any) => updateDraft((c) => { const phases = [...c.phases]; const steps = [...phase.steps]; const actions = [...step.actions]; actions[actionIndex] = { ...action, status: v }; steps[stepIndex] = { ...step, actions }; phases[phaseIndex] = { ...phase, steps }; return { ...c, phases }; })}>
                                            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                                          </Select>
                                          <Select value={action.owner} onValueChange={(v: any) => updateDraft((c) => { const phases = [...c.phases]; const steps = [...phase.steps]; const actions = [...step.actions]; actions[actionIndex] = { ...action, owner: v }; steps[stepIndex] = { ...step, actions }; phases[phaseIndex] = { ...phase, steps }; return { ...c, phases }; })}>
                                            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>{ownerOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                          </Select>
                                          <Select value={action.priority} onValueChange={(v: any) => updateDraft((c) => { const phases = [...c.phases]; const steps = [...phase.steps]; const actions = [...step.actions]; actions[actionIndex] = { ...action, priority: v }; steps[stepIndex] = { ...step, actions }; phases[phaseIndex] = { ...phase, steps }; return { ...c, phases }; })}>
                                            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>{priorityOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                          </Select>
                                          <Input type="date" className="h-7 text-[10px]" value={action.dueDate ? action.dueDate.slice(0, 10) : ""} onChange={(e) => updateDraft((c) => { const phases = [...c.phases]; const steps = [...phase.steps]; const actions = [...step.actions]; actions[actionIndex] = { ...action, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null }; steps[stepIndex] = { ...step, actions }; phases[phaseIndex] = { ...phase, steps }; return { ...c, phases }; })} />
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                          <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={action.clientVisible} onChange={(e) => updateDraft((c) => { const phases = [...c.phases]; const steps = [...phase.steps]; const actions = [...step.actions]; actions[actionIndex] = { ...action, clientVisible: e.target.checked }; steps[stepIndex] = { ...step, actions }; phases[phaseIndex] = { ...phase, steps }; return { ...c, phases }; })} />
                                            Visible
                                          </label>
                                          <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={action.requiresApproval} onChange={(e) => updateDraft((c) => { const phases = [...c.phases]; const steps = [...phase.steps]; const actions = [...step.actions]; actions[actionIndex] = { ...action, requiresApproval: e.target.checked }; steps[stepIndex] = { ...step, actions }; phases[phaseIndex] = { ...phase, steps }; return { ...c, phases }; })} />
                                            Approval
                                          </label>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </TabsContent>

                  {/* ═══ TAB: OPERATIONS ═══ */}
                  <TabsContent value="operations" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Execution Board */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><KanbanSquare className="w-4 h-4 text-[#d4b461]" /> Execution Board</p>
                        <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-1">
                          {(draft.executionColumns || []).map((col, index) => (
                            <div key={col.id} className="rounded-lg border border-card-border bg-black/20 p-3 space-y-2">
                              <Input value={col.title} className="text-xs font-semibold" onChange={(e) => updateDraft((c) => { const executionColumns = [...c.executionColumns]; executionColumns[index] = { ...col, title: e.target.value }; return { ...c, executionColumns }; })} />
                              <div className="grid grid-cols-2 gap-2">
                                <Select value={col.status} onValueChange={(v: any) => updateDraft((c) => { const executionColumns = [...c.executionColumns]; executionColumns[index] = { ...col, status: v }; return { ...c, executionColumns }; })}>
                                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={col.owner} onValueChange={(v: any) => updateDraft((c) => { const executionColumns = [...c.executionColumns]; executionColumns[index] = { ...col, owner: v }; return { ...c, executionColumns }; })}>
                                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>{ownerOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <Textarea rows={1} value={col.notes} className="text-[10px]" onChange={(e) => updateDraft((c) => { const executionColumns = [...c.executionColumns]; executionColumns[index] = { ...col, notes: e.target.value }; return { ...c, executionColumns }; })} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SOPs */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><Gauge className="w-4 h-4 text-[#d4b461]" /> SOPs & Playbooks</p>
                        <div className="space-y-3">
                          {(draft.sopTemplates || []).map((template, index) => (
                            <div key={template.id} className="rounded-lg border border-card-border bg-black/20 p-3 space-y-2">
                              <Input value={template.title} className="font-semibold text-xs" onChange={(e) => updateDraft((c) => { const sopTemplates = [...c.sopTemplates]; sopTemplates[index] = { ...template, title: e.target.value }; return { ...c, sopTemplates }; })} />
                              <Textarea value={template.purpose} rows={2} className="text-[10px]" onChange={(e) => updateDraft((c) => { const sopTemplates = [...c.sopTemplates]; sopTemplates[index] = { ...template, purpose: e.target.value }; return { ...c, sopTemplates }; })} />
                              <p className="text-[10px] text-muted-foreground">{template.steps.length} steps defined</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Automation Rules */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><Zap className="w-4 h-4 text-[#d4b461]" /> Automation Rules</p>
                        <div className="space-y-2">
                          {(draft.automationRules || []).map((rule, index) => (
                            <div key={rule.id} className="rounded-lg border border-card-border bg-black/20 p-3 space-y-2">
                              <Input value={rule.title} className="text-xs font-semibold" onChange={(e) => updateDraft((c) => { const automationRules = [...c.automationRules]; automationRules[index] = { ...rule, title: e.target.value }; return { ...c, automationRules }; })} />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <Input value={rule.trigger} className="text-[10px]" placeholder="Trigger" onChange={(e) => updateDraft((c) => { const automationRules = [...c.automationRules]; automationRules[index] = { ...rule, trigger: e.target.value }; return { ...c, automationRules }; })} />
                                <Input value={rule.action} className="text-[10px]" placeholder="Action" onChange={(e) => updateDraft((c) => { const automationRules = [...c.automationRules]; automationRules[index] = { ...rule, action: e.target.value }; return { ...c, automationRules }; })} />
                              </div>
                              <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer">
                                <input type="checkbox" checked={rule.enabled} onChange={(e) => updateDraft((c) => { const automationRules = [...c.automationRules]; automationRules[index] = { ...rule, enabled: e.target.checked }; return { ...c, automationRules }; })} />
                                Enabled
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Deliverables */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><Layers3 className="w-4 h-4 text-[#d4b461]" /> Deliverables</p>
                        <div className="space-y-2">
                          {(draft.deliverables || []).map((deliverable, index) => (
                            <div key={deliverable.id} className="rounded-lg border border-card-border bg-black/20 p-3 grid grid-cols-1 md:grid-cols-[1fr_120px_80px] gap-2 items-center">
                              <Input value={deliverable.title} className="text-xs" onChange={(e) => updateDraft((c) => { const deliverables = [...c.deliverables]; deliverables[index] = { ...deliverable, title: e.target.value }; return { ...c, deliverables }; })} />
                              <Select value={deliverable.status} onValueChange={(v: any) => updateDraft((c) => { const deliverables = [...c.deliverables]; deliverables[index] = { ...deliverable, status: v }; return { ...c, deliverables }; })}>
                                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{["queued", "in_progress", "review", "approved"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                              </Select>
                              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <input type="checkbox" checked={!!deliverable.approvalRequired} onChange={(e) => updateDraft((c) => { const deliverables = [...c.deliverables]; deliverables[index] = { ...deliverable, approvalRequired: e.target.checked }; return { ...c, deliverables }; })} />
                                Approval
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ═══ TAB: PIPELINE ═══ */}
                  <TabsContent value="pipeline" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Funnel Stages */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-[#d4b461]" /> Funnel Stages</p>
                        <div className="space-y-2">
                          {(draft.funnelStages || []).map((stage, index) => (
                            <div key={stage.id} className="rounded-lg border border-card-border bg-black/20 p-3 grid grid-cols-[1fr_100px_80px_100px] gap-2 items-center">
                              <Input value={stage.title} className="text-xs" onChange={(e) => updateDraft((c) => { const funnelStages = [...c.funnelStages]; funnelStages[index] = { ...stage, title: e.target.value }; return { ...c, funnelStages }; })} />
                              <Input value={stage.metricLabel} className="text-[10px]" onChange={(e) => updateDraft((c) => { const funnelStages = [...c.funnelStages]; funnelStages[index] = { ...stage, metricLabel: e.target.value }; return { ...c, funnelStages }; })} />
                              <Input value={stage.metricValue} className="text-[10px]" onChange={(e) => updateDraft((c) => { const funnelStages = [...c.funnelStages]; funnelStages[index] = { ...stage, metricValue: e.target.value }; return { ...c, funnelStages }; })} />
                              <Select value={stage.status} onValueChange={(v: any) => updateDraft((c) => { const funnelStages = [...c.funnelStages]; funnelStages[index] = { ...stage, status: v }; return { ...c, funnelStages }; })}>
                                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{["stable", "watch", "critical"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* CRM Pipeline */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-[#d4b461]" /> CRM Pipeline</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(draft.crmPipeline || []).map((stage, index) => (
                            <div key={stage.id} className="rounded-lg border border-card-border bg-black/20 p-3 grid grid-cols-[1fr_60px] gap-2 items-center">
                              <Input value={stage.title} className="text-xs" onChange={(e) => updateDraft((c) => { const crmPipeline = [...c.crmPipeline]; crmPipeline[index] = { ...stage, title: e.target.value }; return { ...c, crmPipeline }; })} />
                              <Input type="number" value={stage.count} className="text-xs text-center" onChange={(e) => updateDraft((c) => { const crmPipeline = [...c.crmPipeline]; crmPipeline[index] = { ...stage, count: Number(e.target.value || 0) }; return { ...c, crmPipeline }; })} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Content Pipeline */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><MessageSquare className="w-4 h-4 text-[#d4b461]" /> Content Pipeline</p>
                        <div className="space-y-2">
                          {(draft.contentPipeline || []).map((item, index) => (
                            <div key={item.id} className="rounded-lg border border-card-border bg-black/20 p-3 grid grid-cols-[80px_1fr_120px] gap-2 items-center">
                              <Badge variant="outline" className="text-[9px] border-card-border justify-center">{item.stage}</Badge>
                              <Input value={item.title} className="text-xs" onChange={(e) => updateDraft((c) => { const contentPipeline = [...c.contentPipeline]; contentPipeline[index] = { ...item, title: e.target.value }; return { ...c, contentPipeline }; })} />
                              <Select value={item.status} onValueChange={(v: any) => updateDraft((c) => { const contentPipeline = [...c.contentPipeline]; contentPipeline[index] = { ...item, status: v }; return { ...c, contentPipeline }; })}>
                                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Communication Threads */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><MessageSquare className="w-4 h-4 text-[#d4b461]" /> Communication Threads</p>
                        {(draft.communicationThreads || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">No active threads.</p>
                        ) : (
                          <div className="space-y-2">
                            {(draft.communicationThreads || []).map((thread, index) => (
                              <div key={thread.id} className="rounded-lg border border-card-border bg-black/20 p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <Input value={thread.topic} className="text-xs" onChange={(e) => updateDraft((c) => { const communicationThreads = [...c.communicationThreads]; communicationThreads[index] = { ...thread, topic: e.target.value }; return { ...c, communicationThreads }; })} />
                                  <Badge variant="outline" className="text-[8px] border-card-border shrink-0">{thread.type}</Badge>
                                </div>
                                <Textarea value={thread.lastMessage} rows={2} className="text-[10px]" onChange={(e) => updateDraft((c) => { const communicationThreads = [...c.communicationThreads]; communicationThreads[index] = { ...thread, lastMessage: e.target.value }; return { ...c, communicationThreads }; })} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ═══ TAB: TEAM ═══ */}
                  <TabsContent value="team" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Team Members */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-[#d4b461]" /> Team Members</p>
                        <div className="space-y-2">
                          {(draft.teamMembers || []).map((member, index) => (
                            <div key={member.id} className="rounded-lg border border-card-border bg-black/20 p-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_120px] gap-2 items-center">
                              <Input value={member.name} className="text-xs" onChange={(e) => updateDraft((c) => { const teamMembers = [...c.teamMembers]; teamMembers[index] = { ...member, name: e.target.value }; return { ...c, teamMembers }; })} />
                              <Input value={member.focus} className="text-[10px]" placeholder="Focus area" onChange={(e) => updateDraft((c) => { const teamMembers = [...c.teamMembers]; teamMembers[index] = { ...member, focus: e.target.value }; return { ...c, teamMembers }; })} />
                              <Select value={member.role} onValueChange={(v: TeamRole) => updateDraft((c) => { const teamMembers = [...c.teamMembers]; teamMembers[index] = { ...member, role: v }; return { ...c, teamMembers }; })}>
                                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{roleOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Weekly Review */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-[#d4b461]" /> Weekly Review</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-card-border bg-black/20 p-3 text-center">
                            <p className="text-2xl font-semibold text-foreground">{weeklyReview.done}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Completed</p>
                          </div>
                          <div className="rounded-lg border border-card-border bg-black/20 p-3 text-center">
                            <p className="text-2xl font-semibold text-rose-400">{weeklyReview.stuck}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Blocked</p>
                          </div>
                          <div className="rounded-lg border border-card-border bg-black/20 p-3 text-center">
                            <p className="text-2xl font-semibold text-amber-400">{weeklyReview.late}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Overdue</p>
                          </div>
                          <div className="rounded-lg border border-card-border bg-black/20 p-3 text-center">
                            <p className="text-2xl font-semibold text-[#d4b461]">{weeklyReview.highPriorityOpen}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">High Priority</p>
                          </div>
                        </div>
                      </div>

                      {/* Client Feed */}
                      <div className="rounded-[20px] border border-card-border bg-card p-5 lg:col-span-2">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4"><CircleDot className="w-4 h-4 text-[#d4b461]" /> Client Updates Feed</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                          {draft.updates.slice(0, 6).map((update) => (
                            <div key={update.id} className="flex items-start gap-2.5 rounded-lg border border-card-border bg-black/20 p-3">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${update.type === "milestone" ? "bg-emerald-500/15" : update.type === "alert" ? "bg-amber-500/15" : "bg-sky-500/15"}`}>
                                {update.type === "alert" ? <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> : update.type === "milestone" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Activity className="w-3.5 h-3.5 text-sky-400" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium text-foreground">{update.title}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{update.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ═══ TAB: ANALYTICS ═══ */}
                  <TabsContent value="analytics" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="rounded-[20px] border border-card-border bg-card p-4 text-center">
                        <p className="text-xs text-muted-foreground">Completion</p>
                        <p className="text-3xl font-semibold text-foreground mt-2">{selectedProject?.completion ?? 0}%</p>
                        <Progress value={selectedProject?.completion ?? 0} className="h-1.5 mt-3" />
                      </div>
                      <div className="rounded-[20px] border border-card-border bg-card p-4 text-center">
                        <p className="text-xs text-muted-foreground">Blocked Items</p>
                        <p className="text-3xl font-semibold text-rose-400 mt-2">{weeklyReview.stuck}</p>
                      </div>
                      <div className="rounded-[20px] border border-card-border bg-card p-4 text-center">
                        <p className="text-xs text-muted-foreground">Approvals Pending</p>
                        <p className="text-3xl font-semibold text-amber-400 mt-2">{selectedProject?.summary.approvalCount ?? 0}</p>
                      </div>
                      <div className="rounded-[20px] border border-card-border bg-card p-4 text-center">
                        <p className="text-xs text-muted-foreground">CRM Closed</p>
                        <p className="text-3xl font-semibold text-[#d4b461] mt-2">{draft.crmPipeline?.find((x) => x.id === "crm-closed")?.count ?? 0}</p>
                      </div>
                    </div>

                    {/* Funnel overview */}
                    <div className="rounded-[20px] border border-card-border bg-card p-5">
                      <p className="text-xs font-semibold text-foreground mb-4">Funnel Performance Overview</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(draft.funnelStages || []).map((stage, idx) => (
                          <div key={stage.id} className="flex items-center gap-2">
                            <div className={`rounded-lg border px-3 py-2 ${stage.status === "critical" ? "border-rose-500/30 bg-rose-500/10" : stage.status === "watch" ? "border-amber-500/30 bg-amber-500/10" : "border-card-border bg-black/20"}`}>
                              <p className="text-[10px] text-muted-foreground">{stage.title}</p>
                              <p className="text-xs font-semibold text-foreground">{stage.metricValue}</p>
                            </div>
                            {idx < (draft.funnelStages?.length || 0) - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button variant="outline" onClick={exportReport} className="rounded-xl">
                        <Download className="w-4 h-4 mr-2" /> Export Full Report
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
