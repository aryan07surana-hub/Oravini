import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  MessageCircle, Plus, Trash2, Edit2, Zap, Send, Play, Pause, Clock,
  Target, TrendingUp, Users, Activity, Settings, ChevronRight, AlertCircle,
  BarChart3, Radio, Tag, Filter, Copy, CheckCircle2, XCircle, Megaphone,
  GitBranch, Workflow, MessageSquare, Eye, MousePointerClick, Share2
} from "lucide-react";

export default function ManyChatDMTracker({ useAdmin = false }: { useAdmin?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const Layout = useAdmin ? AdminLayout : ClientLayout;
  const isAdmin = useAdmin || user?.role === "admin";

  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [triggerDialog, setTriggerDialog] = useState<any>(null);
  const [sequenceDialog, setSequenceDialog] = useState<any>(null);
  const [broadcastDialog, setBroadcastDialog] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    enabled: isAdmin,
  });

  const activeClientId = isAdmin ? (selectedClientId === "all" ? "" : selectedClientId) : (user?.id || "");

  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["/api/dm/leads", activeClientId],
    queryFn: () => fetch(`/api/dm/leads${activeClientId ? `?clientId=${activeClientId}` : ""}`).then(r => r.json()),
  });

  const { data: triggers = [] } = useQuery<any[]>({
    queryKey: ["/api/dm/triggers", activeClientId],
    queryFn: () => fetch(`/api/dm/triggers${activeClientId ? `?userId=${activeClientId}` : ""}`).then(r => r.json()),
  });

  const { data: sequences = [] } = useQuery<any[]>({
    queryKey: ["/api/dm/sequences", activeClientId],
    queryFn: () => fetch(`/api/dm/sequences${activeClientId ? `?userId=${activeClientId}` : ""}`).then(r => r.json()),
  });

  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter((l: any) => l.status === "new").length,
    activeTriggers: triggers.filter((t: any) => t.isActive).length,
    activeSequences: sequences.filter((s: any) => s.isActive).length,
    totalEnrollments: sequences.reduce((sum: number, s: any) => sum + (s.enrollmentCount || 0), 0),
    totalTriggerFires: triggers.reduce((sum: number, t: any) => sum + (t.triggerCount || 0), 0),
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">ManyChat Automation</h1>
              <p className="text-xs text-muted-foreground">Instagram DM automation & lead management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && clients.length > 0 && (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-44 h-9 text-xs">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => setBroadcastDialog(true)} className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Megaphone className="w-4 h-4" />Broadcast
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.totalLeads}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">New Leads</p>
                  <p className="text-2xl font-bold text-green-400">{stats.newLeads}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Triggers</p>
                  <p className="text-2xl font-bold text-amber-400">{stats.activeTriggers}</p>
                </div>
                <Target className="w-8 h-8 text-amber-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Sequences</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.activeSequences}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-pink-500/20 bg-pink-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Enrollments</p>
                  <p className="text-2xl font-bold text-pink-400">{stats.totalEnrollments}</p>
                </div>
                <GitBranch className="w-8 h-8 text-pink-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Trigger Fires</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.totalTriggerFires}</p>
                </div>
                <Zap className="w-8 h-8 text-orange-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="automation">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="automation" className="gap-1.5 text-xs">
              <Workflow className="w-3.5 h-3.5" />Automation
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-1.5 text-xs">
              <Target className="w-3.5 h-3.5" />Keywords
            </TabsTrigger>
            <TabsTrigger value="sequences" className="gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5" />Sequences
            </TabsTrigger>
            <TabsTrigger value="audience" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />Audience
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" />Settings
            </TabsTrigger>
          </TabsList>

          {/* Automation Tab - Flow Builder Overview */}
          <TabsContent value="automation" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-purple-400" />
                    Automation Flows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">Visual automation builder coming soon. For now, use Keywords and Sequences.</p>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <p className="text-xs font-semibold">Welcome Flow</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Trigger: "start" → 3 steps → 12 enrolled</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <p className="text-xs font-semibold">Pricing Flow</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Trigger: "price" → Instant reply → 47 fires</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-400" />
                    Growth Tools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                      <div>
                        <p className="text-xs font-semibold">Comment Auto-Reply</p>
                        <p className="text-[10px] text-muted-foreground">Reply to comments automatically</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                      <div>
                        <p className="text-xs font-semibold">Story Mention Reply</p>
                        <p className="text-[10px] text-muted-foreground">Auto-reply to story mentions</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                      <div>
                        <p className="text-xs font-semibold">DM Link in Bio</p>
                        <p className="text-[10px] text-muted-foreground">Generate ref links for bio</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => setTriggerDialog({})}>
                    <Target className="w-5 h-5 text-amber-400" />
                    <span className="text-xs">New Keyword</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => setSequenceDialog({})}>
                    <Activity className="w-5 h-5 text-purple-400" />
                    <span className="text-xs">New Sequence</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => setBroadcastDialog(true)}>
                    <Megaphone className="w-5 h-5 text-pink-400" />
                    <span className="text-xs">Send Broadcast</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <span className="text-xs">View Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keywords Tab */}
          <TabsContent value="keywords" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Auto-reply when someone sends a keyword</p>
              <Button onClick={() => setTriggerDialog({})} className="gap-2 h-9 text-sm">
                <Plus className="w-4 h-4" />Add Trigger
              </Button>
            </div>

            {triggers.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-muted-foreground">No triggers yet. Create one to auto-reply to keywords.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {triggers.map((trigger: any) => (
                  <Card key={trigger.id} className={trigger.isActive ? "border-green-500/30" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-semibold text-foreground">{trigger.name}</h3>
                            <Badge variant={trigger.isActive ? "default" : "secondary"} className="text-[10px]">
                              {trigger.isActive ? "Active" : "Paused"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">• {trigger.triggerCount || 0} uses</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Keyword:</span> "{trigger.keyword}" ({trigger.matchType})
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              <span className="font-medium">Reply:</span> {trigger.replyMessage}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setTriggerDialog(trigger)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sequences Tab */}
          <TabsContent value="sequences" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Multi-step automated message flows</p>
              <Button onClick={() => setSequenceDialog({})} className="gap-2 h-9 text-sm">
                <Plus className="w-4 h-4" />Add Sequence
              </Button>
            </div>

            {sequences.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-muted-foreground">No sequences yet. Create a drip campaign.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {sequences.map((seq: any) => (
                  <Card key={seq.id} className={seq.isActive ? "border-purple-500/30" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-semibold text-foreground">{seq.name}</h3>
                            <Badge variant={seq.isActive ? "default" : "secondary"} className="text-[10px]">
                              {seq.isActive ? "Active" : "Paused"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">• {seq.enrollmentCount || 0} enrolled</span>
                          </div>
                          {seq.description && (
                            <p className="text-xs text-muted-foreground mb-2">{seq.description}</p>
                          )}
                          {seq.triggerKeyword && (
                            <p className="text-xs text-muted-foreground mb-2">
                              <span className="font-medium">Auto-enroll on:</span> "{seq.triggerKeyword}"
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {(seq.steps || []).map((step: any, i: number) => (
                              <div key={i} className="flex items-center gap-1">
                                <div className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400">
                                  Step {i + 1} • {step.delayMinutes}m
                                </div>
                                {i < seq.steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSequenceDialog(seq)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Leads</CardTitle>
              </CardHeader>
              <CardContent>
                {leads.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-muted-foreground">No leads captured yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leads.slice(0, 10).map((lead: any) => (
                      <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border border-card-border bg-card/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">{lead.name}</p>
                          {lead.instagramUsername && (
                            <p className="text-xs text-muted-foreground">@{lead.instagramUsername}</p>
                          )}
                          {lead.lastMessage && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.lastMessage}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{lead.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Instagram Connection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-400 leading-relaxed">
                      <p className="font-semibold mb-1">Setup Required</p>
                      <p>Connect your Instagram Business Account to enable automation. Go to the Instagram tab in DM Tracker to connect.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2">
                    <Settings className="w-4 h-4" />
                    Configure Instagram Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Trigger Dialog */}
        {triggerDialog && (
          <TriggerDialog
            open={!!triggerDialog}
            onClose={() => setTriggerDialog(null)}
            existing={triggerDialog.id ? triggerDialog : null}
            userId={activeClientId || user?.id}
          />
        )}

        {/* Sequence Dialog */}
        {sequenceDialog && (
          <SequenceDialog
            open={!!sequenceDialog}
            onClose={() => setSequenceDialog(null)}
            existing={sequenceDialog.id ? sequenceDialog : null}
            userId={activeClientId || user?.id}
          />
        )}
      </div>
    </Layout>
  );
}

function TriggerDialog({ open, onClose, existing, userId }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: existing?.name || "",
    keyword: existing?.keyword || "",
    matchType: existing?.matchType || "contains",
    replyMessage: existing?.replyMessage || "",
    isActive: existing?.isActive !== false,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/triggers", { ...data, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] });
      toast({ title: "Trigger created!" });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/triggers/${existing.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] });
      toast({ title: "Trigger updated!" });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/dm/triggers/${existing.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] });
      toast({ title: "Trigger deleted" });
      onClose();
    },
  });

  const submit = () => {
    if (!form.name.trim() || !form.keyword.trim() || !form.replyMessage.trim()) {
      return toast({ title: "All fields required", variant: "destructive" });
    }
    if (existing?.id) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing?.id ? "Edit Trigger" : "Create Trigger"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Trigger Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pricing Inquiry" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Keyword</Label>
              <Input value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))} placeholder="price" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Match Type</Label>
              <Select value={form.matchType} onValueChange={v => setForm(f => ({ ...f, matchType: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">Exact</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="starts_with">Starts With</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Auto-Reply Message</Label>
            <Textarea value={form.replyMessage} onChange={e => setForm(f => ({ ...f, replyMessage: e.target.value }))} placeholder="Thanks for asking! Our pricing..." rows={4} className="mt-1 resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4" />
            <Label className="text-xs text-muted-foreground">Active</Label>
          </div>
        </div>
        <DialogFooter>
          {existing?.id && (
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            {existing?.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SequenceDialog({ open, onClose, existing, userId }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: existing?.name || "",
    description: existing?.description || "",
    triggerKeyword: existing?.triggerKeyword || "",
    isActive: existing?.isActive !== false,
    steps: existing?.steps || [{ stepOrder: 0, delayMinutes: 0, message: "" }],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/sequences", { ...data, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] });
      toast({ title: "Sequence created!" });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/sequences/${existing.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] });
      toast({ title: "Sequence updated!" });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/dm/sequences/${existing.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] });
      toast({ title: "Sequence deleted" });
      onClose();
    },
  });

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [...f.steps, { stepOrder: f.steps.length, delayMinutes: 1440, message: "" }],
    }));
  };

  const removeStep = (index: number) => {
    setForm(f => ({
      ...f,
      steps: f.steps.filter((_: any, i: number) => i !== index).map((s: any, i: number) => ({ ...s, stepOrder: i })),
    }));
  };

  const updateStep = (index: number, field: string, value: any) => {
    setForm(f => ({
      ...f,
      steps: f.steps.map((s: any, i: number) => i === index ? { ...s, [field]: value } : s),
    }));
  };

  const submit = () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (form.steps.some((s: any) => !s.message.trim())) return toast({ title: "All step messages required", variant: "destructive" });
    if (existing?.id) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing?.id ? "Edit Sequence" : "Create Sequence"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Sequence Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Sequence" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description (optional)</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Onboarding flow for new leads" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Auto-Enroll Keyword (optional)</Label>
            <Input value={form.triggerKeyword} onChange={e => setForm(f => ({ ...f, triggerKeyword: e.target.value }))} placeholder="start" className="mt-1" />
            <p className="text-[10px] text-muted-foreground mt-1">When someone sends this keyword, they'll be enrolled automatically</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Sequence Steps</Label>
              <Button variant="outline" size="sm" onClick={addStep} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" />Add Step
              </Button>
            </div>
            {form.steps.map((step: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Step {i + 1}</p>
                    {form.steps.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeStep(i)} className="h-6 w-6 p-0">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Delay (minutes)</Label>
                    <Input type="number" value={step.delayMinutes} onChange={e => updateStep(i, "delayMinutes", parseInt(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Message</Label>
                    <Textarea value={step.message} onChange={e => updateStep(i, "message", e.target.value)} placeholder="Message content..." rows={3} className="mt-1 resize-none text-xs" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4" />
            <Label className="text-xs text-muted-foreground">Active</Label>
          </div>
        </div>
        <DialogFooter>
          {existing?.id && (
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            {existing?.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
