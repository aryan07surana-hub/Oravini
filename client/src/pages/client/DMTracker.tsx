import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AiRefineButton } from "@/components/ui/AiRefineButton";
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
import {
  MessageCircle, Plus, Trash2, Copy, Check, Instagram, Flame, Thermometer,
  Snowflake, Star, User, Clock, Calendar, Edit2, Search, Filter, CheckCircle2,
  XCircle, Zap, LayoutGrid, List, X, ChevronDown, AlertCircle
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any; dot: string }> = {
  new:       { label: "New",       color: "text-gray-400",   bg: "bg-gray-500/10",   border: "border-gray-500/30",   icon: User,        dot: "bg-gray-400" },
  hot:       { label: "Hot",       color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    icon: Flame,       dot: "bg-red-400" },
  warm:      { label: "Warm",      color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  icon: Thermometer, dot: "bg-amber-400" },
  cold:      { label: "Cold",      color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   icon: Snowflake,   dot: "bg-blue-400" },
  converted: { label: "Converted", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  icon: CheckCircle2,dot: "bg-green-400" },
  lost:      { label: "Lost",      color: "text-muted-foreground", bg: "bg-muted/20", border: "border-border",       icon: XCircle,     dot: "bg-muted-foreground" },
};

const SOURCE_OPTIONS = ["DM", "Comment", "Story Reply", "Referral", "Reel Comment", "Bio Link", "Other"];
const PIPELINE_STATUSES = ["new", "warm", "hot", "cold"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

function LeadCard({ lead, onClick }: { lead: any; onClick: () => void }) {
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  const overdue = lead.followUpDate && isPast(new Date(lead.followUpDate)) && !isToday(new Date(lead.followUpDate));
  const dueToday = lead.followUpDate && isToday(new Date(lead.followUpDate));
  return (
    <div
      data-testid={`lead-card-${lead.id}`}
      onClick={onClick}
      className={`group p-3.5 rounded-xl border ${cfg.border} bg-card cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-150 space-y-2`}
    >
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
        {lead.source && <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{lead.source}</span>}
        {lead.followUpDate && (
          <div className={`flex items-center gap-1 text-[10px] font-medium ${overdue ? "text-red-400" : dueToday ? "text-amber-400" : "text-muted-foreground"}`}>
            {overdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
            {overdue ? "Overdue" : dueToday ? "Today" : format(new Date(lead.followUpDate), "MMM d")}
          </div>
        )}
      </div>
    </div>
  );
}

function AddEditLeadDialog({
  open, onClose, existing, clientId, clients, isAdmin
}: {
  open: boolean; onClose: () => void; existing?: any; clientId?: string; clients?: any[]; isAdmin?: boolean;
}) {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] });
      toast({ title: "Lead added!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/leads/${existing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] });
      toast({ title: "Lead updated!" });
      onClose();
    },
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
    if (existing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {isAdmin && clients && clients.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <Select value={form.selectedClientId} onValueChange={v => setForm(f => ({ ...f, selectedClientId: v }))}>
                <SelectTrigger className="mt-1" data-testid="select-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="mt-1" data-testid="input-lead-name" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Instagram Handle</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input value={form.instagramHandle.replace(/^@/, "")} onChange={e => setForm(f => ({ ...f, instagramHandle: e.target.value }))} placeholder="handle" className="pl-6" data-testid="input-lead-handle" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1" data-testid="select-lead-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="How they found you" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
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
              <Input type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} className="mt-1" data-testid="input-follow-up" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Conversation notes, objections, interests..." rows={3} className="mt-1 resize-none" data-testid="input-lead-notes" />
            <AiRefineButton text={form.notes || ""} onAccept={v => setForm(f => ({ ...f, notes: v }))} context="lead conversation notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending} data-testid="button-save-lead">
            {isPending ? "Saving..." : existing ? "Save Changes" : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickRepliesPanel({ clientId, isAdmin }: { clientId: string; isAdmin: boolean }) {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/quick-replies", clientId] });
      setTitle(""); setContent("");
      toast({ title: "Template saved!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/quick-replies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/quick-replies", clientId] }),
  });

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">New Template</p>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Template name (e.g. Opening DM)" data-testid="input-template-title" />
        <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your reply template here..." rows={4} className="resize-none" data-testid="input-template-content" />
        <AiRefineButton text={content} onAccept={setContent} context="DM reply template message" />
        <Button onClick={() => { if (!title.trim() || !content.trim()) return; createMutation.mutate({ title: title.trim(), content: content.trim(), clientId }); }} disabled={!title || !content || createMutation.isPending} className="w-full gap-2" data-testid="button-save-template">
          <Zap className="w-3.5 h-3.5" />{createMutation.isPending ? "Saving..." : "Save Template"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : replies.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl">
          <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No templates yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {replies.map((r: any) => (
            <div key={r.id} className="p-3.5 border border-card-border bg-card rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{r.title}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => copy(r.content, r.id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" data-testid={`copy-template-${r.id}`}>
                    {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteMutation.mutate(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-3">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DMTracker({ useAdmin = false }: { useAdmin?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const Layout = useAdmin ? AdminLayout : ClientLayout;
  const isAdmin = useAdmin || user?.role === "admin";

  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    enabled: isAdmin,
  });

  const activeClientId = isAdmin ? (selectedClientId === "all" ? "" : selectedClientId) : (user?.id || "");

  const { data: leads = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/leads", activeClientId],
    queryFn: () => fetch(`/api/dm/leads${activeClientId ? `?clientId=${activeClientId}` : ""}`).then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] });
      setEditLead(null);
      toast({ title: "Lead removed" });
    },
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/dm/leads/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] }),
  });

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.instagramHandle || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: leads.length,
    hot: leads.filter(l => l.status === "hot").length,
    warm: leads.filter(l => l.status === "warm").length,
    cold: leads.filter(l => l.status === "cold").length,
    converted: leads.filter(l => l.status === "converted").length,
    new: leads.filter(l => l.status === "new").length,
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">DM Tracker</h1>
              <p className="text-xs text-muted-foreground">Track and manage your Instagram leads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && clients.length > 0 && (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-44 h-9 text-xs" data-testid="select-filter-client">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => setAddOpen(true)} className="gap-2 h-9 text-sm" data-testid="button-add-lead">
              <Plus className="w-4 h-4" /> Add Lead
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Total", val: stats.total, color: "text-foreground", bg: "bg-card border-card-border" },
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

        <Tabs defaultValue="pipeline">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList>
              <TabsTrigger value="pipeline" className="gap-1.5 text-xs"><LayoutGrid className="w-3.5 h-3.5" />Pipeline</TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5 text-xs"><List className="w-3.5 h-3.5" />List</TabsTrigger>
              <TabsTrigger value="quick-replies" className="gap-1.5 text-xs"><Zap className="w-3.5 h-3.5" />Quick Replies</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="pl-8 h-8 text-xs w-44" data-testid="input-search-leads" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs w-32" data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pipeline View */}
          <TabsContent value="pipeline" className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {PIPELINE_STATUSES.map(s => <Skeleton key={s} className="h-64 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PIPELINE_STATUSES.map(status => {
                  const cfg = STATUS_CONFIG[status];
                  const Icon = cfg.icon;
                  const col = filtered.filter(l => l.status === status);
                  return (
                    <div key={status} className={`rounded-xl border ${cfg.border} bg-card/30 p-3 space-y-2 min-h-[200px]`}>
                      <div className={`flex items-center justify-between mb-3`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          </div>
                          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{col.length}</span>
                      </div>
                      {col.length === 0 ? (
                        <div className="text-center py-8 opacity-40">
                          <Icon className={`w-6 h-6 ${cfg.color} mx-auto mb-1`} />
                          <p className="text-[10px] text-muted-foreground">No leads</p>
                        </div>
                      ) : (
                        col.map(lead => <LeadCard key={lead.id} lead={lead} onClick={() => setEditLead(lead)} />)
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-4">
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">No leads found</p>
              </div>
            ) : (
              <div className="border border-card-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border bg-card/60">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Handle</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Source</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Follow-Up</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Notes</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead, i) => {
                      const overdue = lead.followUpDate && isPast(new Date(lead.followUpDate)) && !isToday(new Date(lead.followUpDate));
                      return (
                        <tr key={lead.id} className={`border-b border-card-border/50 hover:bg-card/60 transition-colors ${i % 2 === 0 ? "" : "bg-card/20"}`} data-testid={`lead-row-${lead.id}`}>
                          <td className="px-4 py-3 font-medium text-foreground text-sm">{lead.name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                            {lead.instagramHandle ? <span className="flex items-center gap-1"><Instagram className="w-3 h-3 text-pink-400" />@{lead.instagramHandle}</span> : "—"}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{lead.source || "—"}</td>
                          <td className={`px-4 py-3 text-xs hidden lg:table-cell ${overdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
                            {lead.followUpDate ? format(new Date(lead.followUpDate), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-[180px] truncate">{lead.notes || "—"}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => setEditLead(lead)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Quick Replies */}
          <TabsContent value="quick-replies" className="mt-4 max-w-2xl">
            <QuickRepliesPanel clientId={activeClientId} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>

        {/* Add Lead Dialog */}
        <AddEditLeadDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          clientId={activeClientId}
          clients={isAdmin ? clients : undefined}
          isAdmin={isAdmin}
        />

        {/* Edit Lead Dialog */}
        {editLead && (
          <Dialog open={!!editLead} onOpenChange={v => !v && setEditLead(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{editLead.name}</span>
                  <button onClick={() => { if (confirm("Delete this lead?")) deleteMutation.mutate(editLead.id); }} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-accent">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <p className="text-xs text-muted-foreground mb-4">Quick status change:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                    const Icon = v.icon;
                    return (
                      <button
                        key={k}
                        onClick={() => { quickStatusMutation.mutate({ id: editLead.id, status: k }); setEditLead({ ...editLead, status: k }); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${editLead.status === k ? `${v.bg} ${v.border} ${v.color}` : "border-border text-muted-foreground hover:border-primary/30"}`}
                      >
                        <Icon className="w-3 h-3" />{v.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Or click Edit to update all details:</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditLead(null)}>Close</Button>
                <Button onClick={() => { const l = editLead; setEditLead(null); setTimeout(() => setEditLead(l), 10); }} variant="secondary" className="gap-2">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Details
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
