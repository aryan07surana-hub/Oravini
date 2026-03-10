import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  ArrowLeft, TrendingUp, FileText, Phone, Bell, Trash2,
  Plus, CheckCircle2, Circle, Clock, Save, Calendar, Mail,
  Sliders, ChevronRight, ExternalLink, Download, KeyRound, Eye, EyeOff
} from "lucide-react";
import { format } from "date-fns";

export default function AdminClientDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [progressValues, setProgressValues] = useState<any>(null);
  const [addingDoc, setAddingDoc] = useState(false);
  const [addingCall, setAddingCall] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [addingReminder, setAddingReminder] = useState(false);
  const [docForm, setDocForm] = useState({ title: "", description: "", fileUrl: "", fileType: "strategy", fileSize: "" });
  const [callForm, setCallForm] = useState({ title: "", summary: "", feedbackNotes: "", actionSteps: "", callDate: "", recordingUrl: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "" });
  const [reminderMsg, setReminderMsg] = useState("");
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [showCredPassword, setShowCredPassword] = useState(false);

  const { data: client, isLoading } = useQuery<any>({
    queryKey: [`/api/clients/${id}`],
  });

  const { data: prog } = useQuery<any>({
    queryKey: [`/api/progress/${id}`],
  });

  useEffect(() => {
    if (prog && !progressValues) setProgressValues(prog);
  }, [prog]);

  const { data: docs, isLoading: docsLoading } = useQuery<any[]>({
    queryKey: ["/api/documents", { clientId: id }],
    queryFn: async () => {
      const res = await fetch(`/api/documents?clientId=${id}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: calls, isLoading: callsLoading } = useQuery<any[]>({
    queryKey: [`/api/calls/${id}`],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: [`/api/tasks/${id}`],
  });

  const updateProgress = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/progress/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/progress/${id}`] });
      toast({ title: "Progress updated!" });
    },
  });

  const addDoc = useMutation({
    mutationFn: () => apiRequest("POST", "/api/documents", { ...docForm, clientId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", { clientId: id }] });
      toast({ title: "Document added!" });
      setAddingDoc(false);
      setDocForm({ title: "", description: "", fileUrl: "", fileType: "strategy", fileSize: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addCall = useMutation({
    mutationFn: () => apiRequest("POST", "/api/calls", { ...callForm, clientId: id, callDate: new Date(callForm.callDate).toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/calls/${id}`] });
      toast({ title: "Call feedback added!" });
      setAddingCall(false);
      setCallForm({ title: "", summary: "", feedbackNotes: "", actionSteps: "", callDate: "", recordingUrl: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addTask = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tasks", { ...taskForm, clientId: id, dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${id}`] });
      toast({ title: "Task added!" });
      setAddingTask(false);
      setTaskForm({ title: "", description: "", dueDate: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendReminder = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications", { clientId: id, message: reminderMsg, type: "reminder" }),
    onSuccess: () => {
      toast({ title: "Reminder sent!" });
      setAddingReminder(false);
      setReminderMsg("");
    },
  });

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => apiRequest("DELETE", `/api/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", { clientId: id }] });
      toast({ title: "Document deleted" });
    },
  });

  const deleteClient = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      navigate("/admin/clients");
    },
  });

  const toggleTask = useMutation({
    mutationFn: ({ taskId, completed }: any) => apiRequest("PATCH", `/api/tasks/${taskId}`, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/tasks/${id}`] }),
  });

  const updateClientEmail = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/clients/${id}`, { email: credEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Email updated!", description: "Client login email has been changed." });
      setCredEmail("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetClientPassword = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/clients/${id}/reset-password`, { newPassword: credPassword }),
    onSuccess: () => {
      toast({ title: "Password reset!", description: "Client password has been updated." });
      setCredPassword("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </AdminLayout>
  );

  if (!client) return (
    <AdminLayout>
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Client not found</p>
      </div>
    </AdminLayout>
  );

  const initials = client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const pValues = progressValues || prog || { offerCreation: 0, funnelProgress: 0, contentProgress: 0, monetizationProgress: 0 };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8 flex-wrap">
          <button onClick={() => navigate("/admin/clients")} className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-start gap-4 flex-1 flex-wrap">
            <Avatar className="w-14 h-14">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>
                {client.program && <Badge variant="secondary" className="text-xs">{client.program}</Badge>}
                {client.nextCallDate && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Next call: {format(new Date(client.nextCallDate), "MMM d 'at' h:mm a")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5 h-8">
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Remove Client</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">Are you sure you want to remove {client.name}? This will delete all their data.</p>
                  <DialogFooter>
                    <Button variant="destructive" onClick={() => deleteClient.mutate()} disabled={deleteClient.isPending}>
                      {deleteClient.isPending ? "Removing..." : "Yes, Remove Client"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-xl">
            <TabsTrigger value="progress" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /><span className="hidden sm:inline">Progress</span></TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">Docs</span></TabsTrigger>
            <TabsTrigger value="calls" className="gap-1.5"><Phone className="w-3.5 h-3.5" /><span className="hidden sm:inline">Calls</span></TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5"><Sliders className="w-3.5 h-3.5" /><span className="hidden sm:inline">Tasks</span></TabsTrigger>
            <TabsTrigger value="reminders" className="gap-1.5"><Bell className="w-3.5 h-3.5" /><span className="hidden sm:inline">Notify</span></TabsTrigger>
            <TabsTrigger value="access" className="gap-1.5"><KeyRound className="w-3.5 h-3.5" /><span className="hidden sm:inline">Access</span></TabsTrigger>
          </TabsList>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <Card className="border border-card-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Update Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { key: "offerCreation", label: "Offer Creation" },
                  { key: "funnelProgress", label: "Funnel Progress" },
                  { key: "contentProgress", label: "Content Progress" },
                  { key: "monetizationProgress", label: "Monetization Progress" },
                ].map(({ key, label }) => (
                  <div key={key} data-testid={`admin-progress-${key}`}>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">{label}</Label>
                      <span className="text-sm font-bold text-primary">{pValues[key] || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={pValues[key] || 0}
                      onChange={(e) => setProgressValues((p: any) => ({ ...(p || pValues), [key]: parseInt(e.target.value) }))}
                      className="w-full accent-primary"
                      data-testid={`slider-${key}`}
                    />
                    <Progress value={pValues[key] || 0} className="h-1.5 mt-1" />
                  </div>
                ))}
                <Button
                  data-testid="button-save-progress"
                  onClick={() => updateProgress.mutate(pValues)}
                  disabled={updateProgress.isPending}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateProgress.isPending ? "Saving..." : "Save Progress"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{(docs || []).length} documents</p>
              <Dialog open={addingDoc} onOpenChange={setAddingDoc}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5" data-testid="button-add-doc">
                    <Plus className="w-3.5 h-3.5" />
                    Add Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Share Document</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Title</Label><Input data-testid="input-doc-title" placeholder="Document title" className="mt-1.5" value={docForm.title} onChange={(e) => setDocForm(p => ({ ...p, title: e.target.value }))} /></div>
                    <div><Label>Description</Label><Textarea placeholder="Brief description" className="mt-1.5" value={docForm.description} onChange={(e) => setDocForm(p => ({ ...p, description: e.target.value }))} /></div>
                    <div><Label>File URL / Link</Label><Input data-testid="input-doc-url" placeholder="https://drive.google.com/..." className="mt-1.5" value={docForm.fileUrl} onChange={(e) => setDocForm(p => ({ ...p, fileUrl: e.target.value }))} /></div>
                    <div><Label>File Size (optional)</Label><Input placeholder="e.g. 2.4 MB" className="mt-1.5" value={docForm.fileSize} onChange={(e) => setDocForm(p => ({ ...p, fileSize: e.target.value }))} /></div>
                    <div>
                      <Label>Type</Label>
                      <Select value={docForm.fileType} onValueChange={(v) => setDocForm(p => ({ ...p, fileType: v }))}>
                        <SelectTrigger className="mt-1.5" data-testid="select-doc-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["recording", "summary", "audit", "strategy", "worksheet", "contract", "other"].map((t) => (
                            <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button data-testid="button-save-doc" onClick={() => addDoc.mutate()} disabled={!docForm.title || !docForm.fileUrl || addDoc.isPending}>
                      {addDoc.isPending ? "Adding..." : "Share Document"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {docsLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : (docs || []).length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No documents shared yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(docs || []).map((doc: any) => (
                  <div key={doc.id} data-testid={`admin-doc-${doc.id}`} className="flex items-center gap-3 p-3.5 bg-card border border-card-border rounded-xl">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="capitalize">{doc.fileType}</span>
                        <span>·</span>
                        <span>{format(new Date(doc.createdAt), "MMM d")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button onClick={() => deleteDoc.mutate(doc.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Calls Tab */}
          <TabsContent value="calls" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{(calls || []).length} sessions</p>
              <Dialog open={addingCall} onOpenChange={setAddingCall}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5" data-testid="button-add-call">
                    <Plus className="w-3.5 h-3.5" />
                    Add Call Feedback
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Upload Call Feedback</DialogTitle></DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    <div><Label>Session Title</Label><Input data-testid="input-call-title" placeholder="Week 10 Strategy Call" className="mt-1.5" value={callForm.title} onChange={(e) => setCallForm(p => ({ ...p, title: e.target.value }))} /></div>
                    <div><Label>Call Date & Time</Label><Input data-testid="input-call-date" type="datetime-local" className="mt-1.5" value={callForm.callDate} onChange={(e) => setCallForm(p => ({ ...p, callDate: e.target.value }))} /></div>
                    <div><Label>Summary</Label><Textarea placeholder="What was discussed..." rows={3} className="mt-1.5" value={callForm.summary} onChange={(e) => setCallForm(p => ({ ...p, summary: e.target.value }))} /></div>
                    <div><Label>Feedback Notes</Label><Textarea placeholder="Your observations about the client..." rows={3} className="mt-1.5" value={callForm.feedbackNotes} onChange={(e) => setCallForm(p => ({ ...p, feedbackNotes: e.target.value }))} /></div>
                    <div><Label>Action Steps</Label><Textarea placeholder="1. Task one&#10;2. Task two..." rows={3} className="mt-1.5" value={callForm.actionSteps} onChange={(e) => setCallForm(p => ({ ...p, actionSteps: e.target.value }))} /></div>
                    <div><Label>Recording URL (optional)</Label><Input placeholder="https://..." className="mt-1.5" value={callForm.recordingUrl} onChange={(e) => setCallForm(p => ({ ...p, recordingUrl: e.target.value }))} /></div>
                  </div>
                  <DialogFooter>
                    <Button data-testid="button-save-call" onClick={() => addCall.mutate()} disabled={!callForm.title || !callForm.callDate || addCall.isPending}>
                      {addCall.isPending ? "Saving..." : "Save Feedback"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {callsLoading ? (
              Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : (calls || []).length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
                <Phone className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No call records yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(calls || []).map((call: any) => (
                  <Card key={call.id} className="border border-card-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{call.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(call.callDate), "MMMM d, yyyy 'at' h:mm a")}
                          </p>
                          {call.summary && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{call.summary}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => { apiRequest("DELETE", `/api/calls/${call.id}`).then(() => queryClient.invalidateQueries({ queryKey: [`/api/calls/${id}`] })); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{(tasks || []).length} tasks</p>
              <Dialog open={addingTask} onOpenChange={setAddingTask}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5" data-testid="button-add-task">
                    <Plus className="w-3.5 h-3.5" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Assign Task</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Task Title</Label><Input data-testid="input-task-title" placeholder="Complete offer page" className="mt-1.5" value={taskForm.title} onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))} /></div>
                    <div><Label>Description (optional)</Label><Textarea placeholder="More details..." className="mt-1.5" value={taskForm.description} onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))} /></div>
                    <div><Label>Due Date (optional)</Label><Input type="date" className="mt-1.5" value={taskForm.dueDate} onChange={(e) => setTaskForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
                  </div>
                  <DialogFooter>
                    <Button data-testid="button-save-task" onClick={() => addTask.mutate()} disabled={!taskForm.title || addTask.isPending}>
                      {addTask.isPending ? "Adding..." : "Add Task"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {tasksLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : (tasks || []).length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(tasks || []).map((task: any) => (
                  <div key={task.id} data-testid={`admin-task-${task.id}`} className={`flex items-center gap-3 p-3.5 rounded-xl border ${task.completed ? "opacity-60 bg-muted/30 border-border" : "bg-card border-card-border"}`}>
                    <button onClick={() => toggleTask.mutate({ taskId: task.id, completed: !task.completed })} className="flex-shrink-0">
                      {task.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(task.dueDate), "MMM d")}
                        </p>
                      )}
                    </div>
                    <button onClick={() => { apiRequest("DELETE", `/api/tasks/${task.id}`).then(() => queryClient.invalidateQueries({ queryKey: [`/api/tasks/${id}`] })); }} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="space-y-4">
            <Card className="border border-card-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Send Reminder / Notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Message</Label>
                  <Textarea
                    data-testid="input-reminder-message"
                    placeholder="e.g. Don't forget to upload your content before our next call!"
                    value={reminderMsg}
                    onChange={(e) => setReminderMsg(e.target.value)}
                    className="mt-1.5"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    "Prepare for your next call",
                    "Upload your content this week",
                    "Complete the worksheet",
                    "Check your action items",
                  ].map((template) => (
                    <button
                      key={template}
                      onClick={() => setReminderMsg(template)}
                      className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      {template}
                    </button>
                  ))}
                </div>
                <Button
                  data-testid="button-send-reminder"
                  onClick={() => sendReminder.mutate()}
                  disabled={!reminderMsg.trim() || sendReminder.isPending}
                  className="gap-2"
                >
                  <Bell className="w-4 h-4" />
                  {sendReminder.isPending ? "Sending..." : "Send Notification"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access Tab */}
          <TabsContent value="access" className="space-y-4">
            {/* Change Email */}
            <Card className="border border-card-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Change Login Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current email</p>
                  <p className="text-sm font-medium text-foreground">{client?.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>New email address</Label>
                  <Input
                    data-testid="input-client-new-email"
                    type="email"
                    placeholder="newaddress@example.com"
                    value={credEmail}
                    onChange={(e) => setCredEmail(e.target.value)}
                  />
                </div>
                <Button
                  data-testid="button-update-client-email"
                  onClick={() => updateClientEmail.mutate()}
                  disabled={!credEmail || credEmail === client?.email || updateClientEmail.isPending}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateClientEmail.isPending ? "Saving..." : "Update Email"}
                </Button>
              </CardContent>
            </Card>

            {/* Reset Password */}
            <Card className="border border-card-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Reset Client Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Set a new password for this client. Share it with them securely.</p>
                <div className="space-y-2">
                  <Label>New password</Label>
                  <div className="relative">
                    <Input
                      data-testid="input-client-new-password"
                      type={showCredPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={credPassword}
                      onChange={(e) => setCredPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  data-testid="button-reset-client-password"
                  onClick={() => resetClientPassword.mutate()}
                  disabled={!credPassword || credPassword.length < 6 || resetClientPassword.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  {resetClientPassword.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
