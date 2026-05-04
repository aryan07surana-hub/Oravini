import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AiRefineButton } from "@/components/ui/AiRefineButton";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isToday } from "date-fns";
import {
  LayoutDashboard, Zap, Target, Activity, Megaphone, Users, MessageSquare,
  BarChart3, Settings, Plus, Trash2, Edit2, Send, ChevronRight, AlertCircle,
  Copy, Check, Instagram, Flame, Thermometer, Snowflake, User, Calendar,
  CheckCircle2, XCircle, Search, Filter, LayoutGrid, List, GitBranch,
  Workflow, Eye, MousePointerClick, Radio, Tag, Info, Link2, ShieldCheck,
  RefreshCw, ExternalLink, Wifi, WifiOff, EyeOff, TrendingUp, MessageCircle,
  Play, Clock, ArrowRight, Hash
} from "lucide-react";

const GOLD = "#d4b461";

// ── Status config (lead CRM) ───────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any; dot: string }> = {
  new:       { label: "New",       color: "text-gray-400",   bg: "bg-gray-500/10",   border: "border-gray-500/30",   icon: User,         dot: "bg-gray-400" },
  hot:       { label: "Hot",       color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    icon: Flame,        dot: "bg-red-400" },
  warm:      { label: "Warm",      color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  icon: Thermometer,  dot: "bg-amber-400" },
  cold:      { label: "Cold",      color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   icon: Snowflake,    dot: "bg-blue-400" },
  converted: { label: "Converted", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  icon: CheckCircle2, dot: "bg-green-400" },
  lost:      { label: "Lost",      color: "text-muted-foreground", bg: "bg-muted/20", border: "border-border",        icon: XCircle,      dot: "bg-muted-foreground" },
};
const PIPELINE_STATUSES = ["new", "warm", "hot", "cold"];
const SOURCE_OPTIONS = ["DM", "Comment", "Story Reply", "Referral", "Reel Comment", "Bio Link", "Other"];

// ── Inner nav sections ─────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "overview",      label: "Overview",      icon: LayoutDashboard },
  { id: "automations",   label: "Automations",   icon: GitBranch },
  { id: "keywords",      label: "Keywords",      icon: Hash },
  { id: "broadcast",     label: "Broadcast",     icon: Megaphone },
  { id: "contacts",      label: "Contacts",      icon: Users },
  { id: "quick-replies", label: "Quick Replies", icon: Zap },
  { id: "analytics",     label: "Analytics",     icon: BarChart3 },
  { id: "settings",      label: "Settings",      icon: Settings },
];

// ── Shared helpers ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

// ── Dialogs ────────────────────────────────────────────────────────────────
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] }); toast({ title: "Trigger created!" }); onClose(); },
  });
  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/triggers/${existing?.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] }); toast({ title: "Trigger updated!" }); onClose(); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/dm/triggers/${existing?.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] }); toast({ title: "Trigger deleted" }); onClose(); },
  });

  const submit = () => {
    if (!form.name.trim() || !form.keyword.trim() || !form.replyMessage.trim())
      return toast({ title: "All fields required", variant: "destructive" });
    existing?.id ? updateMutation.mutate(form) : createMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{existing?.id ? "Edit Trigger" : "New Keyword Trigger"}</DialogTitle></DialogHeader>
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
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">Exact match</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="starts_with">Starts with</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Auto-Reply Message</Label>
            <Textarea value={form.replyMessage} onChange={e => setForm(f => ({ ...f, replyMessage: e.target.value }))} placeholder="Thanks for asking! Here's what you need to know..." rows={4} className="mt-1 resize-none" />
            <AiRefineButton text={form.replyMessage} onAccept={v => setForm(f => ({ ...f, replyMessage: v }))} context="Instagram DM auto-reply message" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-xs text-muted-foreground">Active</span>
          </label>
        </div>
        <DialogFooter>
          {existing?.id && <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>Delete</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            {existing?.id ? "Save Changes" : "Create Trigger"}
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
    steps: existing?.steps?.length ? existing.steps : [{ stepOrder: 0, delayMinutes: 0, message: "" }],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/sequences", { ...data, userId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] }); toast({ title: "Sequence created!" }); onClose(); },
  });
  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/sequences/${existing?.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] }); toast({ title: "Sequence updated!" }); onClose(); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/dm/sequences/${existing?.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] }); toast({ title: "Sequence deleted" }); onClose(); },
  });

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { stepOrder: f.steps.length, delayMinutes: 1440, message: "" }] }));
  const removeStep = (i: number) => setForm(f => ({ ...f, steps: f.steps.filter((_: any, j: number) => j !== i).map((s: any, j: number) => ({ ...s, stepOrder: j })) }));
  const updateStep = (i: number, field: string, value: any) => setForm(f => ({ ...f, steps: f.steps.map((s: any, j: number) => j === i ? { ...s, [field]: value } : s) }));

  const submit = () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (form.steps.some((s: any) => !s.message.trim())) return toast({ title: "All step messages required", variant: "destructive" });
    existing?.id ? updateMutation.mutate(form) : createMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{existing?.id ? "Edit Sequence" : "New DM Sequence"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Sequence Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Welcome Sequence" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Auto-Enroll Keyword</Label>
              <Input value={form.triggerKeyword} onChange={e => setForm(f => ({ ...f, triggerKeyword: e.target.value }))} placeholder="start" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Onboarding flow for new leads" className="mt-1" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-semibold">Steps</Label>
              <Button variant="outline" size="sm" onClick={addStep} className="gap-1 h-7 text-xs"><Plus className="w-3 h-3" />Add Step</Button>
            </div>
            {form.steps.map((step: any, i: number) => (
              <Card key={i} className="border-purple-500/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400">{i + 1}</div>
                      <p className="text-xs font-semibold text-foreground">Step {i + 1}</p>
                    </div>
                    {form.steps.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeStep(i)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                    )}
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Send after (minutes) — 0 = immediately, 1440 = 1 day</Label>
                    <Input type="number" value={step.delayMinutes} onChange={e => updateStep(i, "delayMinutes", parseInt(e.target.value) || 0)} className="mt-1 h-8 text-xs" min={0} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Message</Label>
                    <Textarea value={step.message} onChange={e => updateStep(i, "message", e.target.value)} placeholder="Hey {{name}}, welcome! Here's what to do next..." rows={3} className="mt-1 resize-none text-xs" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-xs text-muted-foreground">Active</span>
          </label>
        </div>
        <DialogFooter>
          {existing?.id && <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>Delete</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            {existing?.id ? "Save Changes" : "Create Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEditLeadDialog({ open, onClose, existing, clientId, clients, isAdmin }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: existing?.name || "",
    instagramHandle: existing?.instagramHandle || "",
    status: existing?.status || "new",
    notes: existing?.notes || "",
    source: existing?.source || "",
    followUpDate: existing?.followUpDate ? format(new Date(existing.followUpDate), "yyyy-MM-dd") : "",
    lastContactAt: existing?.lastContactAt ? format(new Date(existing.lastContactAt), "yyyy-MM-dd") : "",
    selectedClientId: existing?.clientId || clientId || "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/leads", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] }); toast({ title: "Lead added!" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/leads/${existing?.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] }); toast({ title: "Lead updated!" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    const payload: any = {
      name: form.name.trim(),
      instagramHandle: form.instagramHandle.replace(/^@/, "").trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
      source: form.source || null,
      followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
      lastContactAt: form.lastContactAt ? new Date(form.lastContactAt).toISOString() : null,
    };
    if (isAdmin && form.selectedClientId) payload.clientId = form.selectedClientId;
    existing ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{existing ? "Edit Lead" : "Add New Lead"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          {isAdmin && clients?.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <Select value={form.selectedClientId} onValueChange={v => setForm(f => ({ ...f, selectedClientId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Instagram Handle</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input value={form.instagramHandle.replace(/^@/, "")} onChange={e => setForm(f => ({ ...f, instagramHandle: e.target.value }))} placeholder="handle" className="pl-6" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="How they found you" /></SelectTrigger>
                <SelectContent>{SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Last Contact</Label>
              <Input type="date" value={form.lastContactAt} onChange={e => setForm(f => ({ ...f, lastContactAt: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Follow-Up Date</Label>
              <Input type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Conversation notes, objections, interests..." rows={3} className="mt-1 resize-none" />
            <AiRefineButton text={form.notes || ""} onAccept={v => setForm(f => ({ ...f, notes: v }))} context="lead conversation notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : existing ? "Save Changes" : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendDMDialog({ open, onClose, lead, clientId }: any) {
  const { toast } = useToast();
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [selectedReply, setSelectedReply] = useState("");

  const { data: replies = [] } = useQuery<any[]>({
    queryKey: ["/api/dm/quick-replies", clientId],
    queryFn: () => fetch(`/api/dm/quick-replies${clientId ? `?clientId=${clientId}` : ""}`).then(r => r.json()),
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/instagram/send-dm", data),
    onSuccess: () => { toast({ title: "DM sent!" }); setMessage(""); setRecipientId(""); setSelectedReply(""); onClose(); },
    onError: (e: any) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Send Instagram DM
            {lead?.name && <span className="text-muted-foreground font-normal">— {lead.name}</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">Recipient must have messaged your business within the last 24 hours (Instagram policy).</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Recipient Instagram User ID *</Label>
            <Input value={recipientId} onChange={e => setRecipientId(e.target.value)} placeholder="e.g. 17841400000000000" className="mt-1 font-mono text-sm" />
          </div>
          {replies.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Use Quick Reply Template</Label>
              <Select value={selectedReply} onValueChange={id => { const r = replies.find((x: any) => x.id === id); if (r) setMessage(r.content); setSelectedReply(id); }}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                <SelectContent>{replies.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Message *</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message..." rows={5} className="mt-1 resize-none" />
            <p className="text-[10px] text-muted-foreground mt-1">{message.length} / 1000</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => sendMutation.mutate({ recipientId, message })} disabled={!recipientId.trim() || !message.trim() || sendMutation.isPending} className="gap-2">
            <Send className="w-3.5 h-3.5" />{sendMutation.isPending ? "Sending..." : "Send DM"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lead Card (pipeline) ───────────────────────────────────────────────────
function LeadCard({ lead, onClick, onSendDM }: { lead: any; onClick: () => void; onSendDM: (lead: any) => void }) {
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  const overdue = lead.followUpDate && isPast(new Date(lead.followUpDate)) && !isToday(new Date(lead.followUpDate));
  const dueToday = lead.followUpDate && isToday(new Date(lead.followUpDate));
  return (
    <div onClick={onClick} className={`group p-3.5 rounded-xl border ${cfg.border} bg-card cursor-pointer hover:border-primary/40 hover:shadow-md transition-all space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
          {lead.instagramHandle && (
            <div className="flex items-center gap-1 mt-0.5">
              <Instagram className="w-3 h-3 text-pink-400 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground truncate">@{lead.instagramHandle.replace(/^@/, "")}</p>
            </div>
          )}
        </div>
        <StatusBadge status={lead.status} />
      </div>
      {lead.notes && <p className="text-[11px] text-muted-foreground line-clamp-2">{lead.notes}</p>}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {lead.source && <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{lead.source}</span>}
          {lead.followUpDate && (
            <div className={`flex items-center gap-1 text-[10px] font-medium ${overdue ? "text-red-400" : dueToday ? "text-amber-400" : "text-muted-foreground"}`}>
              {overdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
              {overdue ? "Overdue" : dueToday ? "Today" : format(new Date(lead.followUpDate), "MMM d")}
            </div>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onSendDM(lead); }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20">
          <Send className="w-2.5 h-2.5" /> DM
        </button>
      </div>
    </div>
  );
}

// ── Section: Overview ──────────────────────────────────────────────────────
function OverviewSection({ leads, triggers, sequences, setSection }: any) {
  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter((l: any) => l.status === "new").length,
    hotLeads: leads.filter((l: any) => l.status === "hot").length,
    converted: leads.filter((l: any) => l.status === "converted").length,
    activeTriggers: triggers.filter((t: any) => t.isActive).length,
    activeSequences: sequences.filter((s: any) => s.isActive).length,
    totalEnrollments: sequences.reduce((sum: number, s: any) => sum + (s.enrollmentCount || 0), 0),
    triggerFires: triggers.reduce((sum: number, t: any) => sum + (t.triggerCount || 0), 0),
  };

  const statCards = [
    { label: "Total Contacts", value: stats.totalLeads, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/5", icon: Users },
    { label: "New Leads", value: stats.newLeads, color: "text-gray-400", border: "border-gray-500/20", bg: "bg-gray-500/5", icon: User },
    { label: "Hot Leads 🔥", value: stats.hotLeads, color: "text-red-400", border: "border-red-500/20", bg: "bg-red-500/5", icon: Flame },
    { label: "Converted", value: stats.converted, color: "text-green-400", border: "border-green-500/20", bg: "bg-green-500/5", icon: CheckCircle2 },
    { label: "Active Triggers", value: stats.activeTriggers, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5", icon: Target },
    { label: "Active Sequences", value: stats.activeSequences, color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/5", icon: GitBranch },
    { label: "Total Enrollments", value: stats.totalEnrollments, color: "text-pink-400", border: "border-pink-500/20", bg: "bg-pink-500/5", icon: Activity },
    { label: "Trigger Fires", value: stats.triggerFires, color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/5", icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">DM Automation Overview</h2>
        <p className="text-sm text-muted-foreground">Your full Instagram DM automation dashboard — ManyChat style.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`${s.border} ${s.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${s.color} opacity-20`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Add Contact", icon: Users, color: "text-blue-400", section: "contacts" },
            { label: "New Keyword", icon: Hash, color: "text-amber-400", section: "keywords" },
            { label: "New Sequence", icon: GitBranch, color: "text-purple-400", section: "automations" },
            { label: "Broadcast", icon: Megaphone, color: "text-pink-400", section: "broadcast" },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.label} onClick={() => setSection(a.section)} className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-muted/30 transition-all flex flex-col items-center gap-2 text-center group">
                <Icon className={`w-6 h-6 ${a.color} group-hover:scale-110 transition-transform`} />
                <span className="text-xs font-medium text-foreground">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      {(triggers.length > 0 || sequences.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Automations</p>
          <div className="space-y-2">
            {triggers.filter((t: any) => t.isActive).slice(0, 3).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center"><Hash className="w-4 h-4 text-amber-400" /></div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">keyword: "{t.keyword}" · {t.triggerCount || 0} fires</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
              </div>
            ))}
            {sequences.filter((s: any) => s.isActive).slice(0, 3).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center"><GitBranch className="w-4 h-4 text-purple-400" /></div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.steps?.length || 0} steps · {s.enrollmentCount || 0} enrolled</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Automations (Sequences) ──────────────────────────────────────
function AutomationsSection({ sequences, userId }: any) {
  const [dialog, setDialog] = useState<any>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Automations</h2>
          <p className="text-sm text-muted-foreground">Multi-step DM drip sequences — set once, run forever.</p>
        </div>
        <Button onClick={() => setDialog({})} className="gap-2"><Plus className="w-4 h-4" />New Sequence</Button>
      </div>

      {sequences.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-foreground mb-1">No sequences yet</p>
          <p className="text-xs text-muted-foreground mb-4">Create a drip campaign to nurture leads automatically</p>
          <Button onClick={() => setDialog({})} className="gap-2"><Plus className="w-4 h-4" />Create First Sequence</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sequences.map((seq: any) => (
            <Card key={seq.id} className={seq.isActive ? "border-purple-500/30" : "opacity-60"}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-foreground">{seq.name}</h3>
                      <Badge variant={seq.isActive ? "default" : "secondary"} className="text-[10px]">{seq.isActive ? "Active" : "Paused"}</Badge>
                      <span className="text-xs text-muted-foreground">· {seq.enrollmentCount || 0} enrolled</span>
                    </div>
                    {seq.description && <p className="text-xs text-muted-foreground mb-2">{seq.description}</p>}
                    {seq.triggerKeyword && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Hash className="w-3 h-3 text-amber-400" />
                        <span className="text-xs text-muted-foreground">Auto-enroll on keyword: <span className="text-amber-400 font-mono">"{seq.triggerKeyword}"</span></span>
                      </div>
                    )}
                    {/* Flow visualizer */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {(seq.steps || []).map((step: any, i: number) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 font-medium">
                            {i === 0 ? "Instant" : `+${step.delayMinutes >= 1440 ? `${Math.round(step.delayMinutes / 1440)}d` : `${step.delayMinutes}m`}`}
                          </div>
                          {i < (seq.steps?.length || 0) - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDialog(seq)}><Edit2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialog && <SequenceDialog open={!!dialog} onClose={() => setDialog(null)} existing={dialog.id ? dialog : null} userId={userId} />}
    </div>
  );
}

// ── Section: Keywords ──────────────────────────────────────────────────────
function KeywordsSection({ triggers, userId }: any) {
  const [dialog, setDialog] = useState<any>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Keyword Triggers</h2>
          <p className="text-sm text-muted-foreground">Auto-reply the instant someone sends a keyword in your DMs.</p>
        </div>
        <Button onClick={() => setDialog({})} className="gap-2"><Plus className="w-4 h-4" />New Keyword</Button>
      </div>

      {triggers.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-foreground mb-1">No keywords yet</p>
          <p className="text-xs text-muted-foreground mb-4">Add a keyword to auto-reply when someone DMs you a specific word</p>
          <Button onClick={() => setDialog({})} className="gap-2"><Plus className="w-4 h-4" />Add First Keyword</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {triggers.map((t: any) => (
            <Card key={t.id} className={t.isActive ? "border-amber-500/30" : "opacity-60"}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-foreground">{t.name}</p>
                        <Badge variant={t.isActive ? "default" : "secondary"} className="text-[10px]">{t.isActive ? "Active" : "Paused"}</Badge>
                        <span className="text-xs text-muted-foreground">· {t.triggerCount || 0} fires</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded">"{t.keyword}"</span>
                        <span className="text-[10px] text-muted-foreground">({t.matchType?.replace("_", " ")})</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">↳ {t.replyMessage}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDialog(t)}><Edit2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialog && <TriggerDialog open={!!dialog} onClose={() => setDialog(null)} existing={dialog.id ? dialog : null} userId={userId} />}
    </div>
  );
}

// ── Section: Broadcast ─────────────────────────────────────────────────────
function BroadcastSection({ leads, userId }: any) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState("all");
  const [sending, setSending] = useState(false);

  const segmented = leads.filter((l: any) => segment === "all" || l.status === segment);

  const sendBroadcast = async () => {
    if (!message.trim()) return toast({ title: "Message required", variant: "destructive" });
    setSending(true);
    try {
      await apiRequest("POST", "/api/dm/broadcast", { message, segment, userId });
      toast({ title: `Broadcast queued for ${segmented.length} contacts!` });
      setMessage("");
    } catch (e: any) {
      toast({ title: "Broadcast failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Broadcast</h2>
        <p className="text-sm text-muted-foreground">Send a one-time DM to a segment of your contacts.</p>
      </div>

      <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400 leading-relaxed">Instagram only allows DMs to users who messaged you within the last 24 hours. Broadcasts outside this window will be rejected by the API.</p>
      </div>

      <div className="space-y-4 p-5 rounded-xl border border-border bg-card">
        <div>
          <Label className="text-xs text-muted-foreground">Audience Segment</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All contacts ({leads.length})</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                const count = leads.filter((l: any) => l.status === k).length;
                return count > 0 ? <SelectItem key={k} value={k}>{v.label} ({count})</SelectItem> : null;
              })}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">{segmented.length} contacts will receive this broadcast</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Message</Label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Hey! Just wanted to share something exciting with you..." rows={6} className="mt-1 resize-none" />
          <AiRefineButton text={message} onAccept={setMessage} context="Instagram DM broadcast message" />
          <p className="text-[10px] text-muted-foreground mt-1">{message.length} / 1000</p>
        </div>
        <Button onClick={sendBroadcast} disabled={sending || !message.trim() || segmented.length === 0} className="w-full gap-2">
          <Megaphone className="w-4 h-4" />
          {sending ? "Sending..." : `Send to ${segmented.length} contacts`}
        </Button>
      </div>
    </div>
  );
}

// ── Section: Contacts ──────────────────────────────────────────────────────
function ContactsSection({ leads, isLoading, clientId, clients, isAdmin }: any) {
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const [sendDMLead, setSendDMLead] = useState<any>(null);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/leads/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] }); setEditLead(null); toast({ title: "Lead removed" }); },
  });
  const quickStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/dm/leads/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] }),
  });

  const filtered = leads.filter((l: any) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.instagramHandle || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: leads.length,
    hot: leads.filter((l: any) => l.status === "hot").length,
    warm: leads.filter((l: any) => l.status === "warm").length,
    cold: leads.filter((l: any) => l.status === "cold").length,
    converted: leads.filter((l: any) => l.status === "converted").length,
    new: leads.filter((l: any) => l.status === "new").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground">Contacts</h2>
          <p className="text-sm text-muted-foreground">Your full Instagram lead CRM — pipeline + list view.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Add Contact</Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Total", val: stats.total, color: "text-foreground", bg: "bg-card border-border" },
          { label: "New", val: stats.new, color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20" },
          { label: "Hot 🔥", val: stats.hot, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
          { label: "Warm", val: stats.warm, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Cold", val: stats.cold, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Converted ✅", val: stats.converted, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          <Button variant={view === "pipeline" ? "default" : "outline"} size="sm" onClick={() => setView("pipeline")} className="gap-1.5 text-xs h-8"><LayoutGrid className="w-3.5 h-3.5" />Pipeline</Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")} className="gap-1.5 text-xs h-8"><List className="w-3.5 h-3.5" />List</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="pl-8 h-8 text-xs w-44" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pipeline View */}
      {view === "pipeline" && (
        isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{PIPELINE_STATUSES.map(s => <Skeleton key={s} className="h-64 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PIPELINE_STATUSES.map(status => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const col = filtered.filter((l: any) => l.status === status);
              return (
                <div key={status} className={`rounded-xl border ${cfg.border} bg-card/30 p-3 space-y-2 min-h-[200px]`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${cfg.bg}`}><Icon className={`w-3.5 h-3.5 ${cfg.color}`} /></div>
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{col.length}</span>
                  </div>
                  {col.length === 0 ? (
                    <div className="text-center py-8 opacity-40"><Icon className={`w-6 h-6 ${cfg.color} mx-auto mb-1`} /><p className="text-[10px] text-muted-foreground">No leads</p></div>
                  ) : (
                    col.map((lead: any) => <LeadCard key={lead.id} lead={lead} onClick={() => setEditLead(lead)} onSendDM={setSendDMLead} />)
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* List View */}
      {view === "list" && (
        filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No contacts found</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Handle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Follow-Up</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead: any, i: number) => {
                  const overdue = lead.followUpDate && isPast(new Date(lead.followUpDate)) && !isToday(new Date(lead.followUpDate));
                  return (
                    <tr key={lead.id} className={`border-b border-border/50 hover:bg-card/60 transition-colors ${i % 2 === 0 ? "" : "bg-card/20"}`}>
                      <td className="px-4 py-3 font-medium text-foreground text-sm">{lead.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                        {lead.instagramHandle ? <span className="flex items-center gap-1"><Instagram className="w-3 h-3 text-pink-400" />@{lead.instagramHandle}</span> : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{lead.source || "—"}</td>
                      <td className={`px-4 py-3 text-xs hidden lg:table-cell ${overdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
                        {lead.followUpDate ? format(new Date(lead.followUpDate), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-1">
                        <button onClick={() => setSendDMLead(lead)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Send className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditLead(lead)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <AddEditLeadDialog open={addOpen} onClose={() => setAddOpen(false)} clientId={clientId} clients={isAdmin ? clients : undefined} isAdmin={isAdmin} />

      {sendDMLead && <SendDMDialog open={!!sendDMLead} onClose={() => setSendDMLead(null)} lead={sendDMLead} clientId={clientId} />}

      {editLead && (
        <Dialog open={!!editLead} onOpenChange={v => !v && setEditLead(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{editLead.name}</span>
                <button onClick={() => { if (confirm("Delete this lead?")) deleteMutation.mutate(editLead.id); }} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-xs text-muted-foreground mb-3">Quick status update:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                  const Icon = v.icon;
                  return (
                    <button key={k} onClick={() => { quickStatusMutation.mutate({ id: editLead.id, status: k }); setEditLead({ ...editLead, status: k }); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${editLead.status === k ? `${v.bg} ${v.border} ${v.color}` : "border-border text-muted-foreground hover:border-primary/30"}`}>
                      <Icon className="w-3 h-3" />{v.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditLead(null)}>Close</Button>
              <Button onClick={() => { setSendDMLead(editLead); setEditLead(null); }} variant="secondary" className="gap-2"><Send className="w-3.5 h-3.5" />Send DM</Button>
              <Button onClick={() => { const l = editLead; setEditLead(null); setTimeout(() => setEditLead(l), 10); }} className="gap-2"><Edit2 className="w-3.5 h-3.5" />Edit Details</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Section: Quick Replies ─────────────────────────────────────────────────
function QuickRepliesSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: replies = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/quick-replies", clientId],
    queryFn: () => fetch(`/api/dm/quick-replies${clientId ? `?clientId=${clientId}` : ""}`).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/quick-replies", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/quick-replies", clientId] }); setTitle(""); setContent(""); toast({ title: "Template saved!" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/quick-replies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/quick-replies", clientId] }),
  });

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Quick Replies</h2>
        <p className="text-sm text-muted-foreground">Save reusable DM templates. One click to copy and send.</p>
      </div>

      <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">New Template</p>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Template name (e.g. Opening DM, Follow-Up, Objection Handler)" />
        <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your reply template here..." rows={4} className="resize-none" />
        <AiRefineButton text={content} onAccept={setContent} context="Instagram DM reply template" />
        <Button onClick={() => { if (!title.trim() || !content.trim()) return; createMutation.mutate({ title: title.trim(), content: content.trim(), clientId }); }} disabled={!title || !content || createMutation.isPending} className="w-full gap-2">
          <Zap className="w-3.5 h-3.5" />{createMutation.isPending ? "Saving..." : "Save Template"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : replies.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No templates yet — save your first one above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {replies.map((r: any) => (
            <div key={r.id} className="p-4 border border-border bg-card rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{r.title}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => copy(r.content, r.id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                    {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteMutation.mutate(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-4">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section: Analytics ─────────────────────────────────────────────────────
function AnalyticsSection({ leads, triggers, sequences }: any) {
  const totalFires = triggers.reduce((sum: number, t: any) => sum + (t.triggerCount || 0), 0);
  const totalEnrollments = sequences.reduce((sum: number, s: any) => sum + (s.enrollmentCount || 0), 0);
  const converted = leads.filter((l: any) => l.status === "converted").length;
  const conversionRate = leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground">Full performance breakdown of your DM automation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-blue-400" />Engagement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Total Messages Sent", value: totalFires + totalEnrollments, color: "text-foreground" },
              { label: "Trigger Fires", value: totalFires, color: "text-amber-400" },
              { label: "Sequence Messages", value: totalEnrollments, color: "text-purple-400" },
              { label: "Active Conversations", value: leads.filter((l: any) => l.status === "new").length, color: "text-green-400" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MousePointerClick className="w-4 h-4 text-green-400" />Conversion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Total Contacts", value: leads.length, color: "text-foreground" },
              { label: "Converted", value: converted, color: "text-green-400" },
              { label: "Conversion Rate", value: `${conversionRate}%`, color: "text-green-400" },
              { label: "Avg Response Time", value: "< 1 min", color: "text-blue-400" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {triggers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Keywords by Fires</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triggers.sort((a: any, b: any) => (b.triggerCount || 0) - (a.triggerCount || 0)).slice(0, 5).map((t: any) => {
                const pct = totalFires > 0 ? Math.round(((t.triggerCount || 0) / totalFires) * 100) : 0;
                return (
                  <div key={t.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{t.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">"{t.keyword}"</span>
                      </div>
                      <span className="text-sm font-bold text-amber-400">{t.triggerCount || 0}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {sequences.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Sequence Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sequences.sort((a: any, b: any) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0)).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><GitBranch className="w-4 h-4 text-purple-400" /></div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.steps?.length || 0} steps</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-400">{s.enrollmentCount || 0}</p>
                    <p className="text-[10px] text-muted-foreground">enrolled</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Contact Pipeline Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => {
              const count = leads.filter((l: any) => l.status === k).length;
              const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
              const Icon = v.icon;
              return (
                <div key={k} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${v.color}`} />
                      <span className={`text-xs font-medium ${v.color}`}>{v.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${v.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section: Settings ──────────────────────────────────────────────────────
function SettingsSection() {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const { data: account, isLoading, refetch, isFetching } = useQuery<any>({ queryKey: ["/api/meta/account"], staleTime: 30000 });

  const connectMutation = useMutation({
    mutationFn: (shortToken: string) => apiRequest("POST", "/api/meta/refresh-token", { shortToken }),
    onSuccess: () => { toast({ title: "Instagram connected!", description: "Valid for ~60 days." }); setToken(""); refetch(); },
    onError: (e: any) => toast({ title: "Connection failed", description: e.message, variant: "destructive" }),
  });

  const isConnected = account?.connected;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Connect your Instagram Business Account to enable automation.</p>
      </div>

      <div className={`p-4 rounded-xl border flex items-start gap-4 ${isConnected ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isConnected ? "bg-green-500/20" : "bg-red-500/20"}`}>
          {isConnected ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-4 w-40 rounded" /><Skeleton className="h-3 w-60 rounded" /></div>
          ) : isConnected ? (
            <>
              <p className="text-sm font-bold text-green-400 flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Connected</p>
              <p className="text-xs text-muted-foreground mt-0.5">@{account.igUsername} · {account.pageName}{account.followersCount != null && ` · ${account.followersCount.toLocaleString()} followers`}</p>
              {account.expiresAt && <p className="text-[11px] text-muted-foreground mt-1">Token expires: {format(new Date(account.expiresAt), "MMM d, yyyy")}</p>}
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-red-400">Not Connected</p>
              <p className="text-xs text-muted-foreground mt-0.5">{account?.message || "No Instagram account linked yet."}</p>
            </>
          )}
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-white/5">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-2"><Link2 className="w-3.5 h-3.5" />{isConnected ? "Reconnect / Update Token" : "How to Connect"}</p>
        <ol className="space-y-2">
          {[
            <><a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-1">Meta Graph API Explorer <ExternalLink className="w-3 h-3" /></a> → select your app</>,
            <>Click <strong className="text-foreground">Generate Access Token</strong></>,
            <>Grant: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">instagram_basic</code> <code className="text-[10px] bg-muted px-1 py-0.5 rounded">instagram_manage_messages</code> <code className="text-[10px] bg-muted px-1 py-0.5 rounded">pages_show_list</code></>,
            <>Paste token below — we upgrade it to a <strong className="text-foreground">60-day token</strong> automatically</>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Paste your Meta Access Token</Label>
        <div className="relative">
          <Input type={showToken ? "text" : "password"} value={token} onChange={e => setToken(e.target.value)} placeholder="EAA..." className="pr-10 font-mono text-xs" />
          <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Button onClick={() => connectMutation.mutate(token)} disabled={!token.trim() || connectMutation.isPending} className="w-full gap-2">
          <Instagram className="w-4 h-4" />
          {connectMutation.isPending ? "Connecting..." : isConnected ? "Reconnect Instagram" : "Connect Instagram"}
        </Button>
      </div>

      {isConnected && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">For DMs to work, the recipient must have messaged your business first within the last 24 hours (Instagram policy). Make sure your token includes <strong>instagram_manage_messages</strong>.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DMAutomation({ useAdmin = false }: { useAdmin?: boolean }) {
  const { user } = useAuth();
  const Layout = useAdmin ? AdminLayout : ClientLayout;
  const isAdmin = useAdmin || user?.role === "admin";

  const [section, setSection] = useState("overview");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");

  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"], enabled: isAdmin });
  const activeClientId = isAdmin ? (selectedClientId === "all" ? "" : selectedClientId) : (user?.id || "");

  const { data: leads = [], isLoading: leadsLoading } = useQuery<any[]>({
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

  const userId = activeClientId || user?.id || "";

  return (
    <Layout>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">

        {/* ── Inner sidebar ── */}
        <div className="w-52 flex-shrink-0 border-r border-border bg-card/40 flex flex-col overflow-y-auto">
          {/* Brand header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-md">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-foreground tracking-tight">DM Automation</p>
                <p className="text-[9px] text-muted-foreground">ManyChat-style</p>
              </div>
            </div>
          </div>

          {/* Admin client picker */}
          {isAdmin && clients.length > 0 && (
            <div className="p-3 border-b border-border">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nav items */}
          <nav className="flex-1 p-2 space-y-0.5">
            {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group text-left ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-xs">{label}</span>
                  {!active && <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />}
                </button>
              );
            })}
          </nav>

          {/* Footer hint */}
          <div className="p-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Connect Instagram in Settings to enable live DM sending
            </p>
          </div>
        </div>

        {/* ── Content area ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {section === "overview" && <OverviewSection leads={leads} triggers={triggers} sequences={sequences} setSection={setSection} />}
          {section === "automations" && <AutomationsSection sequences={sequences} userId={userId} />}
          {section === "keywords" && <KeywordsSection triggers={triggers} userId={userId} />}
          {section === "broadcast" && <BroadcastSection leads={leads} userId={userId} />}
          {section === "contacts" && <ContactsSection leads={leads} isLoading={leadsLoading} clientId={activeClientId} clients={clients} isAdmin={isAdmin} />}
          {section === "quick-replies" && <QuickRepliesSection clientId={activeClientId} />}
          {section === "analytics" && <AnalyticsSection leads={leads} triggers={triggers} sequences={sequences} />}
          {section === "settings" && <SettingsSection />}
        </div>
      </div>
    </Layout>
  );
}
