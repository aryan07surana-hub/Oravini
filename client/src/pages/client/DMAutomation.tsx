import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Bot, Plus, Trash2, Edit2, Zap, Play, Pause, TrendingUp, MessageSquare,
  Clock, Users, CheckCircle2, AlertCircle, ArrowRight, Copy, Check, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AiRefineButton } from "@/components/ui/AiRefineButton";

const MATCH_TYPES = [
  { value: "exact", label: "Exact Match", desc: "Keyword must match exactly" },
  { value: "contains", label: "Contains", desc: "Message contains keyword" },
  { value: "starts_with", label: "Starts With", desc: "Message starts with keyword" },
];

function TriggerCard({ trigger, onEdit, onDelete, onToggle }: any) {
  const matchType = MATCH_TYPES.find(m => m.value === trigger.matchType);
  return (
    <div className="p-4 border border-card-border bg-card rounded-xl space-y-3 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{trigger.name}</h3>
            {trigger.isActive ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
                <Play className="w-2.5 h-2.5 mr-1" />Active
              </Badge>
            ) : (
              <Badge className="bg-muted/20 text-muted-foreground border-border text-[10px]">
                <Pause className="w-2.5 h-2.5 mr-1" />Paused
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">{trigger.keyword}</span>
            <span>·</span>
            <span>{matchType?.label}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />{trigger.triggerCount || 0} triggers
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={trigger.isActive} onCheckedChange={() => onToggle(trigger.id, !trigger.isActive)} />
          <button onClick={() => onEdit(trigger)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(trigger.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-muted/20 border border-border">
        <p className="text-xs text-muted-foreground mb-1">Auto-Reply:</p>
        <p className="text-xs text-foreground line-clamp-2">{trigger.replyMessage}</p>
      </div>
    </div>
  );
}

function SequenceCard({ sequence, onEdit, onDelete, onToggle }: any) {
  const { data: steps = [] } = useQuery<any[]>({
    queryKey: [`/api/dm/sequences/${sequence.id}/steps`],
    queryFn: () => fetch(`/api/dm/sequences/${sequence.id}/steps`).then(r => r.json()),
  });

  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: [`/api/dm/sequences/${sequence.id}/enrollments`],
    queryFn: () => fetch(`/api/dm/sequences/${sequence.id}/enrollments`).then(r => r.json()),
  });

  const activeEnrollments = enrollments.filter((e: any) => !e.completed).length;
  const completedEnrollments = enrollments.filter((e: any) => e.completed).length;

  return (
    <div className="p-4 border border-card-border bg-card rounded-xl space-y-3 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{sequence.name}</h3>
            {sequence.isActive ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
                <Play className="w-2.5 h-2.5 mr-1" />Active
              </Badge>
            ) : (
              <Badge className="bg-muted/20 text-muted-foreground border-border text-[10px]">
                <Pause className="w-2.5 h-2.5 mr-1" />Paused
              </Badge>
            )}
          </div>
          {sequence.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{sequence.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />{steps.length} steps
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />{activeEnrollments} active
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />{completedEnrollments} completed
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={sequence.isActive} onCheckedChange={() => onToggle(sequence.id, !sequence.isActive)} />
          <button onClick={() => onEdit(sequence)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(sequence.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {steps.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.slice(0, 3).map((step: any, i: number) => (
            <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium">
                {step.delayDays === 0 ? "Instant" : `Day ${step.delayDays}`}
              </div>
              {i < Math.min(steps.length - 1, 2) && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
          {steps.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{steps.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
}

function TriggerDialog({ open, onClose, existing, clientId }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: existing?.name || "",
    keyword: existing?.keyword || "",
    matchType: existing?.matchType || "contains",
    replyMessage: existing?.replyMessage || "",
    isActive: existing?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/triggers", { ...data, userId: clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] });
      toast({ title: "Trigger created!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/triggers/${existing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] });
      toast({ title: "Trigger updated!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (!form.keyword.trim()) return toast({ title: "Keyword required", variant: "destructive" });
    if (!form.replyMessage.trim()) return toast({ title: "Reply message required", variant: "destructive" });
    
    const payload = {
      name: form.name.trim(),
      keyword: form.keyword.trim().toLowerCase(),
      matchType: form.matchType,
      replyMessage: form.replyMessage.trim(),
      isActive: form.isActive,
    };
    
    if (existing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Trigger" : "Create Auto-Reply Trigger"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Trigger Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Message" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Keyword *</Label>
              <Input value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))} placeholder="e.g. hello" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Match Type</Label>
              <Select value={form.matchType} onValueChange={v => setForm(f => ({ ...f, matchType: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATCH_TYPES.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <div>
                        <p className="text-xs font-medium">{m.label}</p>
                        <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Auto-Reply Message *</Label>
            <Textarea value={form.replyMessage} onChange={e => setForm(f => ({ ...f, replyMessage: e.target.value }))} placeholder="Hey! Thanks for reaching out..." rows={4} className="mt-1 resize-none" />
            <AiRefineButton text={form.replyMessage} onAccept={v => setForm(f => ({ ...f, replyMessage: v }))} context="Instagram DM auto-reply message" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <div>
              <p className="text-xs font-medium text-foreground">Active</p>
              <p className="text-[10px] text-muted-foreground">Trigger will auto-reply when active</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Saving..." : existing ? "Save Changes" : "Create Trigger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SequenceDialog({ open, onClose, existing, clientId }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: existing?.name || "",
    description: existing?.description || "",
    isActive: existing?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/sequences", { ...data, userId: clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] });
      toast({ title: "Sequence created!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/sequences/${existing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] });
      toast({ title: "Sequence updated!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      isActive: form.isActive,
    };
    
    if (existing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Sequence" : "Create DM Sequence"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Sequence Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Series" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this sequence for?" rows={2} className="mt-1 resize-none" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <div>
              <p className="text-xs font-medium text-foreground">Active</p>
              <p className="text-[10px] text-muted-foreground">New enrollments will be processed</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Saving..." : existing ? "Save Changes" : "Create Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DMAutomation({ useAdmin = false }: { useAdmin?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const Layout = useAdmin ? AdminLayout : ClientLayout;
  const isAdmin = useAdmin || user?.role === "admin";

  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<any>(null);
  const [sequenceDialogOpen, setSequenceDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<any>(null);

  const activeClientId = user?.id || "";

  const { data: triggers = [], isLoading: triggersLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/triggers", activeClientId],
    queryFn: () => fetch(`/api/dm/triggers${activeClientId ? `?userId=${activeClientId}` : ""}`).then(r => r.json()),
  });

  const { data: sequences = [], isLoading: sequencesLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/sequences", activeClientId],
    queryFn: () => fetch(`/api/dm/sequences${activeClientId ? `?userId=${activeClientId}` : ""}`).then(r => r.json()),
  });

  const deleteTriggerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/triggers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] });
      toast({ title: "Trigger deleted" });
    },
  });

  const toggleTriggerMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/dm/triggers/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] }),
  });

  const deleteSequenceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/sequences/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] });
      toast({ title: "Sequence deleted" });
    },
  });

  const toggleSequenceMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/dm/sequences/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] }),
  });

  const activeTriggers = triggers.filter(t => t.isActive).length;
  const activeSequences = sequences.filter(s => s.isActive).length;
  const totalTriggerCount = triggers.reduce((sum, t) => sum + (t.triggerCount || 0), 0);

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">DM Automation</h1>
              <p className="text-xs text-muted-foreground">Auto-replies & drip sequences</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active Triggers", val: activeTriggers, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: Zap },
            { label: "Active Sequences", val: activeSequences, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: MessageSquare },
            { label: "Total Triggers", val: totalTriggerCount, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: TrendingUp },
            { label: "Total Automations", val: triggers.length + sequences.length, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: Sparkles },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`border rounded-xl p-3 ${s.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>

        <Tabs defaultValue="triggers">
          <TabsList>
            <TabsTrigger value="triggers" className="gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5" />Auto-Replies
            </TabsTrigger>
            <TabsTrigger value="sequences" className="gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />Sequences
            </TabsTrigger>
          </TabsList>

          {/* Triggers Tab */}
          <TabsContent value="triggers" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Automatically reply when someone sends a keyword</p>
              <Button onClick={() => { setEditingTrigger(null); setTriggerDialogOpen(true); }} className="gap-2 h-9 text-sm">
                <Plus className="w-4 h-4" /> New Trigger
              </Button>
            </div>

            {triggersLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
            ) : triggers.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground mb-4">No auto-reply triggers yet</p>
                <Button onClick={() => { setEditingTrigger(null); setTriggerDialogOpen(true); }} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Your First Trigger
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {triggers.map(trigger => (
                  <TriggerCard
                    key={trigger.id}
                    trigger={trigger}
                    onEdit={(t: any) => { setEditingTrigger(t); setTriggerDialogOpen(true); }}
                    onDelete={(id: string) => { if (confirm("Delete this trigger?")) deleteTriggerMutation.mutate(id); }}
                    onToggle={(id: string, isActive: boolean) => toggleTriggerMutation.mutate({ id, isActive })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sequences Tab */}
          <TabsContent value="sequences" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Create multi-step DM drip campaigns</p>
              <Button onClick={() => { setEditingSequence(null); setSequenceDialogOpen(true); }} className="gap-2 h-9 text-sm">
                <Plus className="w-4 h-4" /> New Sequence
              </Button>
            </div>

            {sequencesLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
            ) : sequences.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground mb-4">No DM sequences yet</p>
                <Button onClick={() => { setEditingSequence(null); setSequenceDialogOpen(true); }} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Your First Sequence
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {sequences.map(sequence => (
                  <SequenceCard
                    key={sequence.id}
                    sequence={sequence}
                    onEdit={(s: any) => { setEditingSequence(s); setSequenceDialogOpen(true); }}
                    onDelete={(id: string) => { if (confirm("Delete this sequence?")) deleteSequenceMutation.mutate(id); }}
                    onToggle={(id: string, isActive: boolean) => toggleSequenceMutation.mutate({ id, isActive })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <TriggerDialog
          open={triggerDialogOpen}
          onClose={() => { setTriggerDialogOpen(false); setEditingTrigger(null); }}
          existing={editingTrigger}
          clientId={activeClientId}
        />

        <SequenceDialog
          open={sequenceDialogOpen}
          onClose={() => { setSequenceDialogOpen(false); setEditingSequence(null); }}
          existing={editingSequence}
          clientId={activeClientId}
        />
      </div>
    </Layout>
  );
}
