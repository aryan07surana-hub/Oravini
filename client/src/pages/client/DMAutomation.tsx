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
  Play, Clock, ArrowRight, Hash, Database, UserPlus, Globe, Download, Bot,
  Crosshair, BarChart2, SlidersHorizontal, Bell, PhoneCall, Mail, FileText,
  Sparkles
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
  { id: "comment-bot",   label: "Comment Bot",   icon: MessageSquare },
  { id: "story-reply",   label: "Story Reply",   icon: Radio },
  { id: "flow-builder",  label: "Flow Builder",  icon: Workflow },
  { id: "live-chat",     label: "Live Chat",     icon: MessageCircle },
  { id: "ai-bot",        label: "AI Bot",        icon: Activity },
  { id: "opt-in-links",  label: "Opt-in Links",  icon: Link2 },
  { id: "custom-fields", label: "Custom Fields", icon: Database },
  { id: "welcome-dm",    label: "Welcome DM",    icon: UserPlus },
  { id: "webhooks",      label: "Webhooks",      icon: Globe },
  { id: "click-links",   label: "Click Links",   icon: MousePointerClick },
  { id: "scheduled",     label: "Scheduled",     icon: Calendar },
  { id: "competitor",    label: "Competitor",    icon: Crosshair },
  { id: "funnel-stats",  label: "Funnel Stats",  icon: BarChart2 },
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

// ── Section: Comment Bot ──────────────────────────────────────────────────
function CommentBotSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", keyword: "", postUrl: "", replyMessage: "", alsoDm: false, dmMessage: "", isActive: true });
  const [editing, setEditing] = useState<any>(null);

  const { data: rules = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/comment-replies", userId],
    queryFn: () => fetch(`/api/dm/comment-replies${userId ? `?userId=${userId}` : ""}`).then(r => r.json()),
  });

  const resetForm = () => setForm({ name: "", keyword: "", postUrl: "", replyMessage: "", alsoDm: false, dmMessage: "", isActive: true });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/comment-replies", { ...data, userId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/comment-replies", userId] }); toast({ title: "Rule created!" }); setOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/dm/comment-replies/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/comment-replies", userId] }); toast({ title: "Rule updated!" }); setEditing(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/comment-replies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/comment-replies", userId] }),
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/dm/comment-replies/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/comment-replies", userId] }),
  });

  const F = editing ? editing : form;
  const setF = (patch: any) => editing ? setEditing((p: any) => ({ ...p, ...patch })) : setForm(p => ({ ...p, ...patch }));

  const handleSave = () => {
    if (!F.name || !F.replyMessage) return;
    if (editing) updateMutation.mutate({ id: editing.id, data: editing });
    else createMutation.mutate(form);
  };

  const RuleForm = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Rule name</Label>
          <Input value={F.name} onChange={e => setF({ name: e.target.value })} placeholder="e.g. Reel info trigger" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Trigger keyword (optional)</Label>
          <Input value={F.keyword} onChange={e => setF({ keyword: e.target.value })} placeholder='"info", "price", any' />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Specific post URL (optional)</Label>
          <Input value={F.postUrl} onChange={e => setF({ postUrl: e.target.value })} placeholder="https://instagram.com/p/..." />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Comment reply message</Label>
          <Textarea value={F.replyMessage} onChange={e => setF({ replyMessage: e.target.value })} placeholder="Write the reply to the comment..." rows={3} className="resize-none" />
        </div>
        <div className="col-span-2 flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border">
          <button onClick={() => setF({ alsoDm: !F.alsoDm })}
            className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${F.alsoDm ? "bg-primary" : "bg-muted"}`}>
            <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${F.alsoDm ? "translate-x-4" : ""}`} />
          </button>
          <span className="text-xs text-muted-foreground">Also send a DM to the commenter</span>
        </div>
        {F.alsoDm && (
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">DM message</Label>
            <Textarea value={F.dmMessage} onChange={e => setF({ dmMessage: e.target.value })} placeholder="Write the DM to send..." rows={2} className="resize-none" />
          </div>
        )}
      </div>
      <Button onClick={handleSave} disabled={!F.name || !F.replyMessage || createMutation.isPending || updateMutation.isPending} className="w-full gap-2">
        <Zap className="w-3.5 h-3.5" />{editing ? "Save Changes" : "Create Rule"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Comment Auto-Reply</h2>
          <p className="text-sm text-muted-foreground">Auto-reply to comments — with optional DM follow-up.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); resetForm(); setOpen(v => !v); }} className="gap-2">
          <Plus className="w-3.5 h-3.5" />Add Rule
        </Button>
      </div>

      {open && !editing && (
        <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">New Rule</p>
          {RuleForm}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : rules.length === 0 && !open ? (
        <div className="text-center py-14 border border-dashed border-border rounded-xl">
          <MessageSquare className="w-9 h-9 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">No rules yet — click "Add Rule" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((r: any) => (
            <div key={r.id}>
              {editing?.id === r.id ? (
                <div className="p-5 border border-primary/30 bg-primary/5 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Editing Rule</p>
                    <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                  {RuleForm}
                </div>
              ) : (
                <div className="p-4 border border-border bg-card rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleMutation.mutate({ id: r.id, isActive: !r.isActive })}
                        className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${r.isActive ? "bg-green-500" : "bg-muted"}`}>
                        <span className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${r.isActive ? "translate-x-4" : ""}`} />
                      </button>
                      <p className="text-sm font-semibold text-foreground">{r.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.triggerCount > 0 && <Badge variant="secondary" className="text-[10px]">{r.triggerCount} fires</Badge>}
                      <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm("Delete this rule?")) deleteMutation.mutate(r.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {r.keyword && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">keyword: "{r.keyword}"</span>}
                    {r.postUrl && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-[180px]">post: {r.postUrl}</span>}
                    {r.alsoDm && <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">+ DM follow-up</span>}
                    {!r.keyword && !r.postUrl && <span className="opacity-60">Matches all comments</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{r.replyMessage}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section: Story Reply ───────────────────────────────────────────────────
function StoryReplySection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: config, isLoading } = useQuery<any>({
    queryKey: ["/api/dm/story-reply", userId],
    queryFn: () => fetch("/api/dm/story-reply").then(r => r.json()),
  });

  if (!loaded && config) { setMessage(config.replyMessage || ""); setIsActive(config.isActive ?? false); setLoaded(true); }

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/dm/story-reply", { replyMessage: message, isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/story-reply", userId] }); toast({ title: "Story reply saved!" }); },
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Story Mention Reply</h2>
        <p className="text-sm text-muted-foreground">Auto-reply when someone mentions you in their story.</p>
      </div>

      <div className={`flex items-center justify-between p-4 rounded-xl border ${isActive ? "border-green-500/30 bg-green-500/5" : "border-border bg-card/30"}`}>
        <div>
          <p className="text-sm font-semibold text-foreground">Story mention auto-reply</p>
          <p className="text-xs text-muted-foreground">{isActive ? "Active — replies will be sent automatically" : "Inactive — no replies will be sent"}</p>
        </div>
        <button onClick={() => setIsActive(v => !v)}
          className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${isActive ? "bg-green-500" : "bg-muted"}`}>
          <span className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isActive ? "translate-x-5" : ""}`} />
        </button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Reply message</Label>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Hey! Thanks for mentioning me 🙌 What's up?" rows={5} className="resize-none" />
        <AiRefineButton text={message} onAccept={setMessage} context="Instagram story mention reply message" />
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">Instagram sends a story mention notification when someone tags you. This reply is triggered by that webhook event. Requires your Instagram to be connected and <strong>instagram_manage_messages</strong> permission.</p>
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={!message.trim() || saveMutation.isPending} className="w-full gap-2">
        <Check className="w-3.5 h-3.5" />{saveMutation.isPending ? "Saving..." : "Save Story Reply Config"}
      </Button>
    </div>
  );
}

// ── Section: Flow Builder ─────────────────────────────────────────────────
const NODE_TYPES = [
  { type: "trigger",   label: "Trigger",    color: "bg-amber-500/10 border-amber-500/30 text-amber-400",   icon: Zap },
  { type: "message",   label: "Message",    color: "bg-blue-500/10 border-blue-500/30 text-blue-400",      icon: MessageSquare },
  { type: "wait",      label: "Wait",       color: "bg-purple-500/10 border-purple-500/30 text-purple-400", icon: Clock },
  { type: "condition", label: "Condition",  color: "bg-orange-500/10 border-orange-500/30 text-orange-400", icon: GitBranch },
  { type: "add_tag",   label: "Add Tag",    color: "bg-green-500/10 border-green-500/30 text-green-400",   icon: Tag },
  { type: "end",       label: "End",        color: "bg-muted/30 border-border text-muted-foreground",       icon: CheckCircle2 },
] as const;

function FlowNode({ node, idx, total, onEdit, onDelete, onMove }: any) {
  const cfg = NODE_TYPES.find(n => n.type === node.type) || NODE_TYPES[0];
  const Icon = cfg.icon;
  return (
    <div className="relative flex flex-col items-center">
      <div className={`w-full max-w-xs border rounded-xl p-3 bg-card ${cfg.color.split(" ").slice(0, 2).join(" ")}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 ${cfg.color.split(" ")[2]}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color.split(" ")[2]}`}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-0.5">
            {idx > 0 && <button onClick={() => onMove(idx, -1)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors text-[10px]">↑</button>}
            {idx < total - 1 && <button onClick={() => onMove(idx, 1)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors text-[10px]">↓</button>}
            <button onClick={() => onEdit(idx)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-3 h-3" /></button>
            <button onClick={() => onDelete(idx)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {node.type === "trigger" && (node.data?.keyword ? `Keyword: "${node.data.keyword}"` : "Matches any DM")}
          {node.type === "message" && (node.data?.text || "No message set")}
          {node.type === "wait" && `Wait ${node.data?.hours || 1} hour${(node.data?.hours || 1) !== 1 ? "s" : ""}`}
          {node.type === "condition" && (node.data?.tagCheck ? `If contact has tag "${node.data.tagCheck}"` : "If condition...")}
          {node.type === "add_tag" && (node.data?.tag ? `Add tag: "${node.data.tag}"` : "Set tag...")}
          {node.type === "end" && "Flow complete"}
        </p>
        {node.type === "condition" && (
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-medium">YES →</span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-medium">NO →</span>
          </div>
        )}
      </div>
      {idx < total - 1 && (
        <div className="flex flex-col items-center my-1">
          <div className="w-0.5 h-4 bg-border" />
          <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90" />
        </div>
      )}
    </div>
  );
}

function FlowBuilderSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [editNodeIdx, setEditNodeIdx] = useState<number | null>(null);
  const [nodeEdit, setNodeEdit] = useState<any>({});

  const { data: flows = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/flows", userId],
    queryFn: () => fetch(`/api/dm/flows${userId ? `?userId=${userId}` : ""}`).then(r => r.json()),
  });

  const createFlow = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/flows", { ...data, userId }),
    onSuccess: (newFlow: any) => { queryClient.invalidateQueries({ queryKey: ["/api/dm/flows", userId] }); setSelectedFlow(newFlow); setCreating(false); setNewFlowName(""); toast({ title: "Flow created!" }); },
  });
  const updateFlow = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/dm/flows/${id}`, data),
    onSuccess: (updated: any) => { queryClient.invalidateQueries({ queryKey: ["/api/dm/flows", userId] }); setSelectedFlow(updated); toast({ title: "Flow saved!" }); },
  });
  const deleteFlow = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/flows/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/flows", userId] }); setSelectedFlow(null); },
  });

  const nodes: any[] = selectedFlow?.nodes || [];

  const addNode = (type: string) => {
    const newNode = { id: Date.now().toString(), type, data: {} };
    const updated = [...nodes, newNode];
    updateFlow.mutate({ id: selectedFlow.id, data: { nodes: updated } });
    setSelectedFlow((p: any) => ({ ...p, nodes: updated }));
  };

  const deleteNode = (idx: number) => {
    const updated = nodes.filter((_: any, i: number) => i !== idx);
    updateFlow.mutate({ id: selectedFlow.id, data: { nodes: updated } });
    setSelectedFlow((p: any) => ({ ...p, nodes: updated }));
  };

  const moveNode = (idx: number, dir: number) => {
    const arr = [...nodes];
    const tmp = arr[idx]; arr[idx] = arr[idx + dir]; arr[idx + dir] = tmp;
    updateFlow.mutate({ id: selectedFlow.id, data: { nodes: arr } });
    setSelectedFlow((p: any) => ({ ...p, nodes: arr }));
  };

  const saveNodeEdit = () => {
    if (editNodeIdx === null) return;
    const updated = nodes.map((n: any, i: number) => i === editNodeIdx ? { ...n, data: nodeEdit } : n);
    updateFlow.mutate({ id: selectedFlow.id, data: { nodes: updated } });
    setSelectedFlow((p: any) => ({ ...p, nodes: updated }));
    setEditNodeIdx(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Visual Flow Builder</h2>
        <p className="text-sm text-muted-foreground">Build branching DM flows with triggers, messages, conditions, and tags.</p>
      </div>
      <div className="flex gap-4 h-[calc(100vh-200px)]">
        {/* Flow list */}
        <div className="w-52 flex-shrink-0 border border-border rounded-xl bg-card/30 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flows</span>
            <button onClick={() => setCreating(v => !v)} className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {creating && (
            <div className="p-3 border-b border-border space-y-2">
              <Input value={newFlowName} onChange={e => setNewFlowName(e.target.value)} placeholder="Flow name..." className="h-8 text-xs" autoFocus />
              <Button size="sm" className="w-full h-7 text-xs" onClick={() => { if (newFlowName.trim()) createFlow.mutate({ name: newFlowName.trim(), nodes: [{ id: "1", type: "trigger", data: {} }] }); }} disabled={!newFlowName.trim()}>Create</Button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? [1,2].map(i => <Skeleton key={i} className="h-10 rounded-lg" />) : flows.map((f: any) => (
              <button key={f.id} onClick={() => { setSelectedFlow(f); setEditNodeIdx(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedFlow?.id === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <p className="truncate">{f.name}</p>
                <p className={`text-[9px] mt-0.5 ${selectedFlow?.id === f.id ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>{f.nodes?.length || 0} nodes</p>
              </button>
            ))}
            {!isLoading && flows.length === 0 && !creating && (
              <p className="text-[11px] text-muted-foreground text-center py-4 px-2">Click + to create your first flow</p>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 border border-border rounded-xl bg-card/20 overflow-y-auto">
          {!selectedFlow ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center opacity-40">
                <Workflow className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Select or create a flow to start building</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selectedFlow.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{nodes.length} node{nodes.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { if (confirm("Delete this flow?")) deleteFlow.mutate(selectedFlow.id); }} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Node canvas */}
              <div className="flex flex-col items-center gap-0 py-4">
                {nodes.map((node: any, idx: number) => (
                  <FlowNode key={node.id} node={node} idx={idx} total={nodes.length}
                    onEdit={(i: number) => { setEditNodeIdx(i); setNodeEdit(nodes[i]?.data || {}); }}
                    onDelete={deleteNode} onMove={moveNode} />
                ))}
              </div>

              {/* Node editor */}
              {editNodeIdx !== null && nodes[editNodeIdx] && (
                <div className="p-4 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Edit {nodes[editNodeIdx].type} node</p>
                    <button onClick={() => setEditNodeIdx(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                  {nodes[editNodeIdx].type === "trigger" && (
                    <Input value={nodeEdit.keyword || ""} onChange={e => setNodeEdit((p: any) => ({ ...p, keyword: e.target.value }))} placeholder='Trigger keyword (e.g. "info", "price")' />
                  )}
                  {nodes[editNodeIdx].type === "message" && (
                    <Textarea value={nodeEdit.text || ""} onChange={e => setNodeEdit((p: any) => ({ ...p, text: e.target.value }))} placeholder="Write your message..." rows={3} className="resize-none" />
                  )}
                  {nodes[editNodeIdx].type === "wait" && (
                    <div className="flex items-center gap-2">
                      <Input type="number" min={1} max={168} value={nodeEdit.hours || 1} onChange={e => setNodeEdit((p: any) => ({ ...p, hours: Number(e.target.value) }))} className="w-24" />
                      <span className="text-xs text-muted-foreground">hours to wait before next node</span>
                    </div>
                  )}
                  {nodes[editNodeIdx].type === "condition" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Check if contact has tag</Label>
                      <Input value={nodeEdit.tagCheck || ""} onChange={e => setNodeEdit((p: any) => ({ ...p, tagCheck: e.target.value }))} placeholder='Tag name (e.g. "customer", "interested")' />
                      <p className="text-[11px] text-muted-foreground">YES branch continues to next node. NO branch ends the flow (or add another end node).</p>
                    </div>
                  )}
                  {nodes[editNodeIdx].type === "add_tag" && (
                    <Input value={nodeEdit.tag || ""} onChange={e => setNodeEdit((p: any) => ({ ...p, tag: e.target.value }))} placeholder='Tag to add (e.g. "interested", "booked")' />
                  )}
                  {nodes[editNodeIdx].type === "end" && (
                    <Input value={nodeEdit.label || ""} onChange={e => setNodeEdit((p: any) => ({ ...p, label: e.target.value }))} placeholder='End label (e.g. "Converted", "Dropped off")' />
                  )}
                  <Button size="sm" onClick={saveNodeEdit} className="gap-2"><Check className="w-3.5 h-3.5" />Save Node</Button>
                </div>
              )}

              {/* Add node buttons */}
              <div className="border-t border-border pt-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">Add node</p>
                <div className="flex flex-wrap gap-2">
                  {NODE_TYPES.filter(n => n.type !== "end" || nodes.every((nd: any) => nd.type !== "end")).map(({ type, label, color, icon: Icon }) => (
                    <button key={type} onClick={() => addNode(type)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${color} hover:opacity-80 transition-opacity`}>
                      <Icon className="w-3 h-3" />{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section: Live Chat ─────────────────────────────────────────────────────
function LiveChatSection() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState("");

  const { data: convData, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ["/api/dm/conversations"],
    queryFn: () => fetch("/api/dm/conversations").then(r => r.json()),
    refetchInterval: 15000,
  });

  const conversations: any[] = convData?.conversations || [];
  const connected = convData?.connected;

  const sendMutation = useMutation({
    mutationFn: ({ recipientId, message }: any) => apiRequest("POST", "/api/meta/send-dm", { recipientId, message }),
    onSuccess: () => { setReply(""); toast({ title: "Message sent!" }); refetch(); },
    onError: (e: any) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const msgs = selected?.messages?.data || [];
  const otherParticipant = selected?.participants?.data?.find((p: any) => p.name !== "Me") || selected?.participants?.data?.[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Live Chat Inbox</h2>
          <p className="text-sm text-muted-foreground">Real-time DM inbox — reply directly from here.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border ${connected ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? "Connected" : "Not connected"}
          </div>
          <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!connected ? (
        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <WifiOff className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">Connect your Instagram in Settings to see live DMs</p>
        </div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-220px)] border border-border rounded-xl overflow-hidden">
          {/* Conversation list */}
          <div className="w-64 flex-shrink-0 border-r border-border bg-card/30 flex flex-col">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 px-4"><MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" /><p className="text-xs text-muted-foreground">No conversations yet</p></div>
              ) : conversations.map((c: any) => {
                const other = c.participants?.data?.find((p: any) => p.name !== "Me") || c.participants?.data?.[0];
                const lastMsg = c.messages?.data?.[0];
                return (
                  <button key={c.id} onClick={() => setSelected(c)}
                    className={`w-full p-3 text-left border-b border-border/50 hover:bg-muted/30 transition-colors ${selected?.id === c.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                    <p className="text-xs font-semibold text-foreground truncate">{other?.name || "User"}</p>
                    {lastMsg && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lastMsg.message}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message thread */}
          <div className="flex-1 flex flex-col">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center opacity-30">
                <div className="text-center"><MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Select a conversation</p></div>
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-border bg-card/30">
                  <p className="text-sm font-semibold text-foreground">{otherParticipant?.name || "User"}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col-reverse">
                  {[...msgs].reverse().map((m: any, i: number) => {
                    const isMe = m.from?.id !== otherParticipant?.id;
                    return (
                      <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-xl text-xs ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          <p>{m.message}</p>
                          {m.created_time && <p className={`text-[9px] mt-1 opacity-60`}>{new Date(m.created_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 border-t border-border bg-card/30 flex items-end gap-2">
                  <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a message..." rows={2} className="resize-none text-xs flex-1"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (reply.trim() && otherParticipant?.id) sendMutation.mutate({ recipientId: otherParticipant.id, message: reply.trim() }); } }} />
                  <Button size="sm" className="h-10 gap-2 flex-shrink-0" disabled={!reply.trim() || sendMutation.isPending}
                    onClick={() => { if (otherParticipant?.id) sendMutation.mutate({ recipientId: otherParticipant.id, message: reply.trim() }); }}>
                    <Send className="w-3.5 h-3.5" />{sendMutation.isPending ? "..." : "Send"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: AI Bot ────────────────────────────────────────────────────────
function AIBotSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [cfg, setCfg] = useState({ isActive: false, personality: "friendly", instructions: "", fallbackMessage: "", keywordsOnly: false, keywords: [] as string[] });
  const [loaded, setLoaded] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [testReply, setTestReply] = useState("");
  const [newKw, setNewKw] = useState("");

  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/dm/ai-bot", userId], queryFn: () => fetch("/api/dm/ai-bot").then(r => r.json()) });
  if (!loaded && data && !isLoading) { setCfg({ isActive: data.isActive || false, personality: data.personality || "friendly", instructions: data.instructions || "", fallbackMessage: data.fallbackMessage || "", keywordsOnly: data.keywordsOnly || false, keywords: data.keywords || [] }); setLoaded(true); }

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/dm/ai-bot", cfg),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/ai-bot", userId] }); toast({ title: "AI Bot saved!" }); },
  });
  const testMutation = useMutation({
    mutationFn: (message: string) => apiRequest("POST", "/api/dm/ai-bot/test", { message }),
    onSuccess: (data: any) => setTestReply(data.reply || ""),
    onError: (e: any) => toast({ title: "Test failed", description: e.message, variant: "destructive" }),
  });

  const addKw = () => { if (newKw.trim() && !cfg.keywords.includes(newKw.trim())) { setCfg(p => ({ ...p, keywords: [...p.keywords, newKw.trim()] })); setNewKw(""); } };
  const rmKw = (kw: string) => setCfg(p => ({ ...p, keywords: p.keywords.filter(k => k !== kw) }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">AI-Powered Bot</h2>
        <p className="text-sm text-muted-foreground">Claude (Haiku) replies to DMs automatically based on your instructions.</p>
      </div>

      {/* Active toggle */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${cfg.isActive ? "border-green-500/30 bg-green-500/5" : "border-border bg-card/30"}`}>
        <div>
          <p className="text-sm font-semibold text-foreground">AI Bot {cfg.isActive ? "Active" : "Inactive"}</p>
          <p className="text-xs text-muted-foreground">{cfg.isActive ? "Auto-replying to incoming DMs with AI" : "AI bot is off — DMs will not be auto-replied"}</p>
        </div>
        <button onClick={() => setCfg(p => ({ ...p, isActive: !p.isActive }))}
          className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${cfg.isActive ? "bg-green-500" : "bg-muted"}`}>
          <span className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${cfg.isActive ? "translate-x-5" : ""}`} />
        </button>
      </div>

      {/* Personality */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Personality</Label>
        <div className="grid grid-cols-4 gap-2">
          {["friendly", "professional", "casual", "salesy"].map(p => (
            <button key={p} onClick={() => setCfg(prev => ({ ...prev, personality: p }))}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold capitalize transition-all ${cfg.personality === p ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Bot instructions</Label>
        <Textarea value={cfg.instructions} onChange={e => setCfg(p => ({ ...p, instructions: e.target.value }))}
          placeholder="e.g. You help potential coaching clients. Always mention the free discovery call. Never reveal pricing." rows={4} className="resize-none" />
      </div>

      {/* Fallback */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Fallback message (when AI can't respond)</Label>
        <Input value={cfg.fallbackMessage} onChange={e => setCfg(p => ({ ...p, fallbackMessage: e.target.value }))} placeholder="Hey! I'll get back to you soon 🙌" />
      </div>

      {/* Keywords only */}
      <div className="space-y-3 p-4 border border-border rounded-xl bg-card/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Keywords-only mode</p>
            <p className="text-xs text-muted-foreground">Only reply when message contains specific keywords</p>
          </div>
          <button onClick={() => setCfg(p => ({ ...p, keywordsOnly: !p.keywordsOnly }))}
            className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${cfg.keywordsOnly ? "bg-primary" : "bg-muted"}`}>
            <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${cfg.keywordsOnly ? "translate-x-5" : ""}`} />
          </button>
        </div>
        {cfg.keywordsOnly && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={newKw} onChange={e => setNewKw(e.target.value)} placeholder="Add keyword..." className="h-8 text-xs" onKeyDown={e => e.key === "Enter" && addKw()} />
              <Button size="sm" onClick={addKw} disabled={!newKw.trim()} className="h-8 gap-1"><Plus className="w-3 h-3" />Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cfg.keywords.map(kw => (
                <span key={kw} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                  {kw}
                  <button onClick={() => rmKw(kw)} className="hover:text-red-400 transition-colors"><XCircle className="w-3 h-3" /></button>
                </span>
              ))}
              {cfg.keywords.length === 0 && <p className="text-[11px] text-muted-foreground">No keywords yet</p>}
            </div>
          </div>
        )}
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full gap-2">
        <Check className="w-3.5 h-3.5" />{saveMutation.isPending ? "Saving..." : "Save AI Bot Config"}
      </Button>

      {/* Test panel */}
      <div className="p-4 border border-border rounded-xl bg-card/30 space-y-3">
        <p className="text-xs font-semibold text-foreground">Test Bot Response</p>
        <div className="flex gap-2">
          <Input value={testMsg} onChange={e => setTestMsg(e.target.value)} placeholder="Type a test message..." className="text-xs" onKeyDown={e => e.key === "Enter" && testMsg.trim() && testMutation.mutate(testMsg)} />
          <Button size="sm" onClick={() => testMutation.mutate(testMsg)} disabled={!testMsg.trim() || testMutation.isPending} className="gap-2 flex-shrink-0">
            <Play className="w-3.5 h-3.5" />{testMutation.isPending ? "..." : "Test"}
          </Button>
        </div>
        {testReply && (
          <div className="p-3 rounded-xl bg-muted/30 border border-border">
            <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Activity className="w-3 h-3 text-purple-400" />AI Reply</p>
            <p className="text-xs text-foreground">{testReply}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section: Opt-in Links ─────────────────────────────────────────────────
function OptInLinksSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [welcome, setWelcome] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const { data: links = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/opt-in-links", userId],
    queryFn: () => fetch("/api/dm/opt-in-links").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/opt-in-links", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/opt-in-links", userId] }); setName(""); setWelcome(""); toast({ title: "Opt-in link created!" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/opt-in-links/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/opt-in-links", userId] }),
  });

  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); toast({ title: "Copied!" }); setTimeout(() => setCopiedId(null), 2000); };
  const getUrl = (refCode: string) => `${origin}/start?ref=${refCode}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Opt-in Links</h2>
        <p className="text-sm text-muted-foreground">Generate unique ref links for your bio — track clicks and opt-ins.</p>
      </div>

      <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">Create New Link</p>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Link name (e.g. Bio Link, Story CTA)" />
        <Textarea value={welcome} onChange={e => setWelcome(e.target.value)} placeholder="Welcome DM message when someone opts in..." rows={3} className="resize-none" />
        <Button onClick={() => { if (!name.trim()) return; createMutation.mutate({ name: name.trim(), welcomeMessage: welcome.trim() }); }} disabled={!name.trim() || createMutation.isPending} className="w-full gap-2">
          <Link2 className="w-3.5 h-3.5" />{createMutation.isPending ? "Creating..." : "Generate Link"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Link2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No links yet — create one above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((l: any) => {
            const url = getUrl(l.refCode);
            const htmlSnippet = `<a href="${url}">Send me a DM</a>`;
            return (
              <div key={l.id} className="p-4 border border-border bg-card rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{l.name}</p>
                  <button onClick={() => { if (confirm("Delete this link?")) deleteMutation.mutate(l.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Clicks", val: l.clickCount || 0, color: "text-blue-400" },
                    { label: "Opt-ins", val: l.optInCount || 0, color: "text-green-400" },
                  ].map(s => (
                    <div key={s.label} className="p-3 rounded-xl bg-muted/20 border border-border text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 font-mono text-[10px] text-muted-foreground truncate">{url}</div>
                    <button onClick={() => copy(url, l.id + "-url")} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                      {copiedId === l.id + "-url" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 font-mono text-[10px] text-muted-foreground truncate">{htmlSnippet}</div>
                    <button onClick={() => copy(htmlSnippet, l.id + "-html")} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                      {copiedId === l.id + "-html" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {l.welcomeMessage && (
                  <p className="text-[11px] text-muted-foreground border-t border-border pt-2">Welcome DM: {l.welcomeMessage}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section: Custom Fields ────────────────────────────────────────────────
function CustomFieldsSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");

  const { data: defs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/custom-field-defs", userId],
    queryFn: () => fetch("/api/dm/custom-field-defs").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/custom-field-defs", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/custom-field-defs", userId] }); setLabel(""); toast({ title: "Field created!" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/custom-field-defs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/custom-field-defs", userId] }),
  });

  const FIELD_TYPES = [
    { value: "text", label: "Text", icon: FileText },
    { value: "email", label: "Email", icon: Mail },
    { value: "phone", label: "Phone", icon: PhoneCall },
    { value: "number", label: "Number", icon: Hash },
    { value: "url", label: "URL", icon: Link2 },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Custom Fields</h2>
        <p className="text-sm text-muted-foreground">Define extra fields to store on each contact — email, budget, city, interest, anything.</p>
      </div>

      <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">Add Field</p>
        <div className="flex gap-2">
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Field label (e.g. Email, Budget, City)" className="flex-1" />
          <Select value={fieldType} onValueChange={setFieldType}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { if (label.trim()) createMutation.mutate({ label: label.trim(), fieldType }); }} disabled={!label.trim() || createMutation.isPending} className="gap-2">
            <Plus className="w-4 h-4" />Add
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">These fields appear on every contact card. Use <code className="bg-muted px-1 rounded text-[10px]">{"{{field_key}}"}</code> in messages to personalize.</p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
        <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          Built-in tokens: <code className="bg-muted/40 px-1 rounded text-[10px]">{"{{first_name}}"}</code> <code className="bg-muted/40 px-1 rounded text-[10px]">{"{{last_name}}"}</code> <code className="bg-muted/40 px-1 rounded text-[10px]">{"{{instagram}}"}</code> <code className="bg-muted/40 px-1 rounded text-[10px]">{"{{email}}"}</code> <code className="bg-muted/40 px-1 rounded text-[10px]">{"{{phone}}"}</code> — available on all contacts automatically.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : defs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No custom fields yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {defs.map((d: any) => {
            const T = FIELD_TYPES.find(t => t.value === d.fieldType) || FIELD_TYPES[0];
            const TIcon = T.icon;
            return (
              <div key={d.id} className="flex items-center justify-between p-3 border border-border bg-card rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><TIcon className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{d.label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{"{{" + d.fieldKey + "}}"} · {T.label}</p>
                  </div>
                </div>
                <button onClick={() => { if (confirm("Delete this field? All stored values will be lost.")) deleteMutation.mutate(d.id); }}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section: Welcome DM ───────────────────────────────────────────────────
function WelcomeDMSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [cfg, setCfg] = useState({ isActive: false, message: "", delayMinutes: 0 });
  const [loaded, setLoaded] = useState(false);

  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/dm/welcome-dm", userId], queryFn: () => fetch("/api/dm/welcome-dm").then(r => r.json()) });
  if (!loaded && data && !isLoading) { setCfg({ isActive: data.isActive || false, message: data.message || "", delayMinutes: data.delayMinutes || 0 }); setLoaded(true); }

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/dm/welcome-dm", cfg),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/welcome-dm", userId] }); toast({ title: "Welcome DM saved!" }); },
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Welcome DM for New Followers</h2>
        <p className="text-sm text-muted-foreground">Auto-send a DM when someone new follows your account. ManyChat's biggest growth hack.</p>
      </div>

      <div className={`flex items-center justify-between p-4 rounded-xl border ${cfg.isActive ? "border-green-500/30 bg-green-500/5" : "border-border bg-card/30"}`}>
        <div>
          <p className="text-sm font-semibold text-foreground">Welcome DM {cfg.isActive ? "Active" : "Inactive"}</p>
          <p className="text-xs text-muted-foreground">{cfg.isActive ? "New followers will receive this DM automatically" : "Off — no welcome DM will be sent"}</p>
        </div>
        <button onClick={() => setCfg(p => ({ ...p, isActive: !p.isActive }))}
          className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${cfg.isActive ? "bg-green-500" : "bg-muted"}`}>
          <span className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${cfg.isActive ? "translate-x-5" : ""}`} />
        </button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Welcome message</Label>
        <Textarea value={cfg.message} onChange={e => setCfg(p => ({ ...p, message: e.target.value }))}
          placeholder="Hey {{first_name}}! Thanks for following! 🙌 I help people with [your niche]. Click the link in my bio to get started!" rows={5} className="resize-none" />
        <AiRefineButton text={cfg.message} onAccept={m => setCfg(p => ({ ...p, message: m }))} context="Instagram welcome DM for new followers" />
        <p className="text-[11px] text-muted-foreground">Use <code className="bg-muted px-1 rounded text-[10px]">{"{{first_name}}"}</code> to personalize.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Delay before sending</Label>
        <div className="flex items-center gap-3">
          <Input type="number" min={0} max={1440} value={cfg.delayMinutes} onChange={e => setCfg(p => ({ ...p, delayMinutes: Number(e.target.value) }))} className="w-24" />
          <span className="text-xs text-muted-foreground">minutes after follow (0 = instant)</span>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">Requires your Instagram webhook to be subscribed to <strong>follow</strong> events in Facebook Developer Console. Once that's set up and your account is connected in Settings, this will trigger automatically.</p>
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={!cfg.message.trim() || saveMutation.isPending} className="w-full gap-2">
        <Check className="w-3.5 h-3.5" />{saveMutation.isPending ? "Saving..." : "Save Welcome DM"}
      </Button>
    </div>
  );
}

// ── Section: Webhooks ─────────────────────────────────────────────────────
const WEBHOOK_EVENTS = [
  { value: "tag_added",       label: "Tag Added",         desc: "Fires when a tag is added to a contact" },
  { value: "status_changed",  label: "Status Changed",    desc: "Fires when contact status changes" },
  { value: "lead_created",    label: "Lead Created",      desc: "Fires when a new contact is added" },
  { value: "opted_out",       label: "Opted Out",         desc: "Fires when a contact unsubscribes (STOP)" },
  { value: "converted",       label: "Converted",         desc: "Fires when contact is marked converted" },
];

function WebhooksSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", url: "", triggerEvent: "tag_added", triggerValue: "", isActive: true });
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const { data: hooks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/webhooks", userId],
    queryFn: () => fetch("/api/dm/webhooks").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/webhooks", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/webhooks", userId] }); setCreating(false); setForm({ name: "", url: "", triggerEvent: "tag_added", triggerValue: "", isActive: true }); toast({ title: "Webhook created!" }); },
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/dm/webhooks/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/webhooks", userId] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/webhooks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/webhooks", userId] }),
  });
  const testMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/dm/webhooks/${id}/test`),
    onSuccess: (data: any) => { setTesting(null); toast({ title: data.ok ? "Test sent! ✓" : `Test failed (status ${data.status})`, variant: data.ok ? "default" : "destructive" }); },
    onError: () => { setTesting(null); toast({ title: "Test failed", variant: "destructive" }); },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Outbound Webhooks</h2>
          <p className="text-sm text-muted-foreground">Send data to Zapier, Make, n8n, or any URL when events happen.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(v => !v)} className="gap-2"><Plus className="w-3.5 h-3.5" />Add Webhook</Button>
      </div>

      {creating && (
        <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">New Webhook</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1"><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Zapier CRM sync" /></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Webhook URL</Label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://hooks.zapier.com/..." /></div>
            <div className="space-y-1">
              <Label className="text-xs">Trigger event</Label>
              <Select value={form.triggerEvent} onValueChange={v => setForm(p => ({ ...p, triggerEvent: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{WEBHOOK_EVENTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Filter value (optional)</Label><Input value={form.triggerValue} onChange={e => setForm(p => ({ ...p, triggerValue: e.target.value }))} placeholder='e.g. specific tag name' /></div>
          </div>
          <Button onClick={() => { if (form.name && form.url) createMutation.mutate(form); }} disabled={!form.name || !form.url || createMutation.isPending} className="w-full gap-2">
            <Globe className="w-3.5 h-3.5" />Create Webhook
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : hooks.length === 0 && !creating ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No webhooks yet — connect Zapier, Make, or any endpoint</p>
        </div>
      ) : (
        <div className="space-y-2">
          {hooks.map((h: any) => {
            const evDef = WEBHOOK_EVENTS.find(e => e.value === h.triggerEvent);
            return (
              <div key={h.id} className="p-4 border border-border bg-card rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleMutation.mutate({ id: h.id, isActive: !h.isActive })}
                      className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${h.isActive ? "bg-green-500" : "bg-muted"}`}>
                      <span className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${h.isActive ? "translate-x-4" : ""}`} />
                    </button>
                    <p className="text-sm font-semibold text-foreground">{h.name}</p>
                    {h.fireCount > 0 && <Badge variant="secondary" className="text-[10px]">{h.fireCount} fires</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setTesting(h.id); testMutation.mutate(h.id); }} disabled={testing === h.id}>
                      <Play className="w-3 h-3" />{testing === h.id ? "Testing..." : "Test"}
                    </Button>
                    <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(h.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground truncate">{h.url}</p>
                <div className="flex gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{evDef?.label || h.triggerEvent}</span>
                  {h.triggerValue && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">filter: "{h.triggerValue}"</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section: Click Links ──────────────────────────────────────────────────
function ClickLinksSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const { data: links = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/click-links", userId],
    queryFn: () => fetch("/api/dm/click-links").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/click-links", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/click-links", userId] }); setLabel(""); setUrl(""); toast({ title: "Tracking link created!" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/click-links/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/click-links", userId] }),
  });

  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); toast({ title: "Copied!" }); setTimeout(() => setCopiedId(null), 2000); };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Click Tracking Links</h2>
        <p className="text-sm text-muted-foreground">Wrap any URL — see exactly who clicked and when. Use in DM messages.</p>
      </div>

      <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">New Tracking Link</p>
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g. Free Guide, Sales Page, Booking Link)" />
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="Destination URL (https://...)" />
        <Button onClick={() => { if (label.trim() && url.trim()) createMutation.mutate({ label: label.trim(), originalUrl: url.trim() }); }} disabled={!label.trim() || !url.trim() || createMutation.isPending} className="w-full gap-2">
          <MousePointerClick className="w-3.5 h-3.5" />{createMutation.isPending ? "Creating..." : "Create Link"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <MousePointerClick className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No tracking links yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((l: any) => {
            const trackUrl = `${origin}/r/${l.shortCode}`;
            return (
              <div key={l.id} className="p-4 border border-border bg-card rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{l.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-xs">{l.originalUrl}</p>
                  </div>
                  <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(l.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xl font-bold text-blue-400">{l.clickCount}</p>
                    <p className="text-[10px] text-muted-foreground">clicks</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 font-mono text-[10px] text-muted-foreground truncate">{trackUrl}</div>
                  <button onClick={() => copy(trackUrl, l.id)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                    {copiedId === l.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section: Scheduled Broadcasts ─────────────────────────────────────────
function ScheduledSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", message: "", targetTag: "", targetStatus: "", scheduledAt: "" });
  const [creating, setCreating] = useState(false);

  const { data: broadcasts = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/dm/scheduled-broadcasts", userId],
    queryFn: () => fetch("/api/dm/scheduled-broadcasts").then(r => r.json()),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/scheduled-broadcasts", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/scheduled-broadcasts", userId] }); setCreating(false); setForm({ name: "", message: "", targetTag: "", targetStatus: "", scheduledAt: "" }); toast({ title: "Broadcast scheduled!" }); },
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/scheduled-broadcasts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/scheduled-broadcasts", userId] }),
  });
  const processMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dm/scheduled-broadcasts/process"),
    onSuccess: (data: any) => { refetch(); toast({ title: `Processed ${data.processed} due broadcast(s)` }); },
  });

  const STATUS_COLORS: Record<string, string> = { pending: "text-amber-400 bg-amber-500/10 border-amber-500/30", sent: "text-green-400 bg-green-500/10 border-green-500/30", cancelled: "text-muted-foreground bg-muted/20 border-border", failed: "text-red-400 bg-red-500/10 border-red-500/30" };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Scheduled Broadcasts</h2>
          <p className="text-sm text-muted-foreground">Schedule DM blasts for a specific date and time — perfect for launches.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => processMutation.mutate()} disabled={processMutation.isPending} className="gap-2 h-8 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${processMutation.isPending ? "animate-spin" : ""}`} />Process Due
          </Button>
          <Button size="sm" onClick={() => setCreating(v => !v)} className="gap-2 h-8"><Plus className="w-3.5 h-3.5" />Schedule</Button>
        </div>
      </div>

      {creating && (
        <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">New Scheduled Broadcast</p>
          <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Broadcast name (e.g. Launch Day DM)" />
          <Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="DM message... Use {{first_name}} to personalize." rows={4} className="resize-none" />
          <AiRefineButton text={form.message} onAccept={m => setForm(p => ({ ...p, message: m }))} context="Instagram DM broadcast message for a launch" />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Filter by tag (optional)</Label><Input value={form.targetTag} onChange={e => setForm(p => ({ ...p, targetTag: e.target.value }))} placeholder='e.g. "interested"' /></div>
            <div className="space-y-1">
              <Label className="text-xs">Filter by status (optional)</Label>
              <Select value={form.targetStatus} onValueChange={v => setForm(p => ({ ...p, targetStatus: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {["new", "warm", "hot", "cold", "converted"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Schedule date & time</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
            </div>
          </div>
          <Button onClick={() => { if (form.name && form.message && form.scheduledAt) createMutation.mutate(form); }} disabled={!form.name || !form.message || !form.scheduledAt || createMutation.isPending} className="w-full gap-2">
            <Calendar className="w-3.5 h-3.5" />Schedule Broadcast
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : broadcasts.length === 0 && !creating ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No scheduled broadcasts yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((b: any) => (
            <div key={b.id} className="p-4 border border-border bg-card rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[b.status] || STATUS_COLORS.pending}`}>{b.status}</span>
                  <p className="text-sm font-semibold text-foreground">{b.name}</p>
                </div>
                {b.status === "pending" && (
                  <button onClick={() => { if (confirm("Cancel this broadcast?")) cancelMutation.mutate(b.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><XCircle className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{b.message}</p>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(b.scheduledAt).toLocaleString()}</span>
                {b.status === "sent" && <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" />{b.recipientCount} sent</span>}
                {b.targetTag && <span>tag: "{b.targetTag}"</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section: Competitor Comment Scraper ───────────────────────────────────
function CompetitorSection() {
  const { toast } = useToast();
  const [postUrl, setPostUrl] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [scraping, setScraping] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [dmMsg, setDmMsg] = useState("");

  const scrape = async () => {
    if (!postUrl.trim()) return;
    setScraping(true);
    try {
      const data = await apiRequest("POST", "/api/dm/competitor-scrape", { postUrl: postUrl.trim() });
      setResults(data.comments || []);
      if (data.message) toast({ title: "Note", description: data.message });
      else toast({ title: `Found ${data.total} commenters` });
    } catch (e: any) {
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
    } finally { setScraping(false); }
  };

  const sendDM = async (from: any) => {
    if (!dmMsg.trim() || !from?.id) return;
    setSendingTo(from.id);
    try {
      await apiRequest("POST", "/api/meta/send-dm", { recipientId: from.id, message: dmMsg.trim() });
      toast({ title: `DM sent to ${from.username || from.id}!` });
    } catch (e: any) {
      toast({ title: "DM failed", description: e.message, variant: "destructive" });
    } finally { setSendingTo(null); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Competitor Comment Scraper</h2>
        <p className="text-sm text-muted-foreground">Pull commenters from any post on your account — then DM them directly.</p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">Instagram's API only allows fetching comments from <strong>your own posts</strong>. Paste any of your post URLs to pull the commenters and send targeted DMs to people who engaged with your content.</p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." className="flex-1" />
          <Button onClick={scrape} disabled={!postUrl.trim() || scraping} className="gap-2 flex-shrink-0">
            <Crosshair className="w-3.5 h-3.5" />{scraping ? "Scraping..." : "Scrape"}
          </Button>
        </div>
        {results.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">DM to send to commenters</Label>
            <Textarea value={dmMsg} onChange={e => setDmMsg(e.target.value)} placeholder="Hey {{first_name}}! I saw you commented on my post..." rows={3} className="resize-none" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{results.length} commenters found</p>
          <div className="border border-border rounded-xl overflow-hidden">
            {results.map((c: any, i: number) => (
              <div key={i} className={`flex items-center justify-between p-3 ${i < results.length - 1 ? "border-b border-border/50" : ""}`}>
                <div>
                  <p className="text-xs font-semibold text-foreground">{c.from?.username || c.from?.name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{c.text}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-shrink-0" disabled={!dmMsg.trim() || sendingTo === c.from?.id}
                  onClick={() => sendDM(c.from)}>
                  <Send className="w-3 h-3" />{sendingTo === c.from?.id ? "..." : "DM"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !scraping && postUrl && (
        <div className="text-center py-10 border border-dashed border-border rounded-xl">
          <Crosshair className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">Paste a post URL and click Scrape to see commenters</p>
        </div>
      )}
    </div>
  );
}

// ── Section: Funnel Stats ─────────────────────────────────────────────────
function FunnelStatsSection({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/dm/funnel-analytics", userId],
    queryFn: () => fetch("/api/dm/funnel-analytics").then(r => r.json()),
    refetchInterval: 30000,
  });

  const logMutation = useMutation({
    mutationFn: (eventType: string) => apiRequest("POST", "/api/dm/funnel-events", { eventType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/funnel-analytics", userId] }),
  });

  const funnel = data?.funnel || [];
  const maxCount = Math.max(...funnel.map((s: any) => s.count), 1);

  const STAGE_COLORS = ["text-amber-400 bg-amber-500/10 border-amber-500/30", "text-blue-400 bg-blue-500/10 border-blue-500/30", "text-purple-400 bg-purple-500/10 border-purple-500/30", "text-green-400 bg-green-500/10 border-green-500/30", "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">DM Funnel Analytics</h2>
        <p className="text-sm text-muted-foreground">Track your full DM funnel — from trigger to conversion — with drop-off rates.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : funnel.length === 0 || data?.total === 0 ? (
        <div className="text-center py-14 border border-dashed border-border rounded-xl">
          <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground mb-2">No funnel events yet</p>
          <p className="text-xs text-muted-foreground">Events are logged automatically as contacts move through your flows. You can also log test events below.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {funnel.map((stage: any, i: number) => {
            const pct = maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0;
            const clr = STAGE_COLORS[i] || STAGE_COLORS[0];
            const [textClr, bgClr, borderClr] = clr.split(" ");
            return (
              <div key={stage.key} className={`p-4 rounded-xl border ${bgClr} ${borderClr}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${textClr}`}>{i + 1}</span>
                    <span className="text-sm font-semibold text-foreground">{stage.stage}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${textClr}`}>{stage.count}</span>
                    {i > 0 && stage.dropOff > 0 && <span className="text-[10px] text-red-400 ml-2">-{stage.dropOff}%</span>}
                  </div>
                </div>
                <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${textClr.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="p-3 rounded-xl border border-border bg-card/30 text-center">
            <p className="text-xs text-muted-foreground">Total events tracked: <span className="font-bold text-foreground">{data?.total || 0}</span></p>
          </div>
        </div>
      )}

      <div className="p-4 border border-border rounded-xl bg-card/30 space-y-2">
        <p className="text-xs font-semibold text-foreground">Log Test Event</p>
        <p className="text-[11px] text-muted-foreground">Use this to test your funnel tracking. In production, events are logged automatically by your flows.</p>
        <div className="flex flex-wrap gap-2">
          {["trigger_fired", "message_sent", "reply_received", "tag_added", "converted"].map(et => (
            <Button key={et} size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => logMutation.mutate(et)}>
              <Plus className="w-3 h-3" />{et.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>
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
          {section === "comment-bot" && <CommentBotSection userId={userId} />}
          {section === "story-reply" && <StoryReplySection userId={userId} />}
          {section === "flow-builder" && <FlowBuilderSection userId={userId} />}
          {section === "live-chat" && <LiveChatSection />}
          {section === "ai-bot" && <AIBotSection userId={userId} />}
          {section === "opt-in-links" && <OptInLinksSection userId={userId} />}
          {section === "custom-fields" && <CustomFieldsSection userId={userId} />}
          {section === "welcome-dm" && <WelcomeDMSection userId={userId} />}
          {section === "webhooks" && <WebhooksSection userId={userId} />}
          {section === "click-links" && <ClickLinksSection userId={userId} />}
          {section === "scheduled" && <ScheduledSection userId={userId} />}
          {section === "competitor" && <CompetitorSection />}
          {section === "funnel-stats" && <FunnelStatsSection userId={userId} />}
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
