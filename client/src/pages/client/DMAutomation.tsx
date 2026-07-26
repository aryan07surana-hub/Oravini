import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
  Bot, Plus, Trash2, Edit2, Zap, Play, Pause, MessageSquare,
  Users, CheckCircle2, AlertCircle, ArrowRight, Copy, Check,
  MessageCircle, Instagram, Flame, Thermometer, Snowflake, User, Calendar,
  Search, XCircle, LayoutGrid, List, Send, Info,
  Link2, ShieldCheck, RefreshCw, ExternalLink, Wifi, WifiOff, Eye, EyeOff,
  Database, Settings, Webhook, ChevronDown, ChevronUp, BookOpen, Sparkles,
  Target, Trophy, Lock, Layers, Key, Tag
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AiRefineButton } from "@/components/ui/AiRefineButton";
import { ScheduledBroadcastDialog, ScheduledBroadcastsList } from "@/components/dm/ScheduledBroadcastDialog";
import { TagManager, TagFilter } from "@/components/dm/TagManagement";
import { WebhookManager } from "@/components/dm/WebhookManager";
import { ClickTrackingPanel } from "@/components/dm/ClickTrackingPanel";
import { CustomFieldsManager, CustomFieldsEditor } from "@/components/dm/CustomFieldsManager";
import { AILeadScoring, LeadScoreBadge } from "@/components/dm/AILeadScoring";
import { WelcomeDMConfig } from "@/components/dm/WelcomeDMConfig";
import { OptOutToggle, OptOutBadge, OptOutFilter } from "@/components/dm/OptOutManagement";
import { CSVExportButton, CSVExportCard } from "@/components/dm/CSVExport";
import { AIBrainConfig } from "@/components/dm/AIBrainConfig";

// ── DM Tracker constants ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any; dot: string }> = {
  new:       { label: "New",       color: "text-gray-400",   bg: "bg-gray-500/10",   border: "border-gray-500/30",   icon: User,         dot: "bg-gray-400" },
  hot:       { label: "Hot",       color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    icon: Flame,        dot: "bg-red-400" },
  warm:      { label: "Warm",      color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  icon: Thermometer,  dot: "bg-amber-400" },
  cold:      { label: "Cold",      color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   icon: Snowflake,    dot: "bg-blue-400" },
  converted: { label: "Converted", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  icon: CheckCircle2, dot: "bg-green-400" },
  lost:      { label: "Lost",      color: "text-muted-foreground", bg: "bg-muted/20", border: "border-border",       icon: XCircle,      dot: "bg-muted-foreground" },
};

const SOURCE_OPTIONS = ["DM", "Comment", "Story Reply", "Referral", "Reel Comment", "Bio Link", "Other"];
const PIPELINE_STATUSES = ["new", "warm", "hot", "cold"];

const MATCH_TYPES = [
  { value: "exact",      label: "Exact Match", desc: "Keyword must match exactly" },
  { value: "contains",   label: "Contains",    desc: "Message contains keyword" },
  { value: "starts_with",label: "Starts With", desc: "Message starts with keyword" },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

// ── Guide helpers ─────────────────────────────────────────────────────────────

function TabGuide({ id, title, steps, tips }: {
  id: string;
  title: string;
  steps: { icon: any; label: string; desc: string }[];
  tips?: string[];
}) {
  const key = `dm-guide-dismissed-${id}`;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(key) !== "1"; } catch { return true; }
  });
  const dismiss = () => { try { localStorage.setItem(key, "1"); } catch {} setOpen(false); };
  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
      <BookOpen className="w-3.5 h-3.5" /> How to use this tab
    </button>
  );
  return (
    <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-300">{title}</span>
        </div>
        <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-blue-500/10">
          Got it, hide
        </button>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mt-0.5">
                  <span className="text-[10px] font-bold text-blue-400">{i + 1}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <p className="text-xs font-semibold text-foreground">{s.label}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        {tips && tips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-blue-500/10">
            {tips.map((tip, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> {tip}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SetupChecklist({
  isConnected, hasTriggers, hasSequences, hasLeads, hasBroadcasts, hasAiBrain,
  onNavigate,
}: {
  isConnected: boolean; hasTriggers: boolean; hasSequences: boolean;
  hasLeads: boolean; hasBroadcasts: boolean; hasAiBrain: boolean;
  onNavigate: (tab: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("dm-setup-checklist-dismissed") === "1"; } catch { return false; }
  });

  const steps = [
    // Tier 1 — Foundation
    {
      tier: "Foundation",
      tierColor: "text-blue-400",
      tierBg: "bg-blue-500/10 border-blue-500/20",
      items: [
        { label: "Connect Instagram", desc: "Link your Meta account so DMs can be sent and received.", tab: "settings", done: isConnected, icon: Instagram },
        { label: "Set a Welcome DM", desc: "Auto-send a greeting to every new person who messages you.", tab: "settings", done: false, icon: MessageSquare },
      ],
    },
    // Tier 2 — Automation
    {
      tier: "Automation",
      tierColor: "text-violet-400",
      tierBg: "bg-violet-500/10 border-violet-500/20",
      items: [
        { label: "Create Auto-Reply Trigger", desc: "Auto-reply when someone sends a keyword like 'link' or 'info'.", tab: "triggers", done: hasTriggers, icon: Zap },
        { label: "Build a Sequence", desc: "Set up a multi-step DM drip campaign with delays between messages.", tab: "sequences", done: hasSequences, icon: Layers },
        { label: "Add Your First Lead", desc: "Start tracking contacts through your pipeline from New → Converted.", tab: "leads", done: hasLeads, icon: Users },
      ],
    },
    // Tier 3 — Growth
    {
      tier: "Growth",
      tierColor: "text-emerald-400",
      tierBg: "bg-emerald-500/10 border-emerald-500/20",
      items: [
        { label: "Schedule a Broadcast", desc: "Send a mass DM to all your leads at once.", tab: "broadcasts", done: hasBroadcasts, icon: Send },
        { label: "Set Up AI Brain", desc: "Upload your API key and let AI handle DMs in your voice.", tab: "ai-brain", done: hasAiBrain, icon: Bot },
      ],
    },
  ];

  const allItems = steps.flatMap(s => s.items);
  const doneCount = allItems.filter(i => i.done).length;
  const totalCount = allItems.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer" onClick={() => setCollapsed(c => !c)}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Setup Guide</p>
            <p className="text-xs text-muted-foreground">{doneCount} of {totalCount} steps complete</p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-primary">{pct}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pct === 100 && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs gap-1"><Trophy className="w-3 h-3" /> Complete!</Badge>}
          <button onClick={e => { e.stopPropagation(); localStorage.setItem("dm-setup-checklist-dismissed", "1"); setDismissed(true); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted transition-colors">Dismiss</button>
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {!collapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map(tier => (
            <div key={tier.tier} className={`rounded-xl border p-3 space-y-2 ${tier.tierBg}`}>
              <div className="flex items-center gap-1.5 mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${tier.tierColor}`}>{tier.tier}</span>
              </div>
              {tier.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button key={i} onClick={() => onNavigate(item.tab)}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors hover:bg-white/5 ${item.done ? "opacity-70" : ""}`}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${item.done ? "bg-emerald-500/20 border-emerald-500/40" : "border-border bg-muted/20"}`}>
                      {item.done
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        : <Icon className="w-2.5 h-2.5 text-muted-foreground" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1 ml-auto" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DM Tracker sub-components ─────────────────────────────────────────────────

function LeadCard({ lead, onClick, onSendDM }: { lead: any; onClick: () => void; onSendDM: (lead: any) => void }) {
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  const overdue  = lead.followUpDate && isPast(new Date(lead.followUpDate)) && !isToday(new Date(lead.followUpDate));
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
        <div className="flex items-center gap-1">
          <StatusBadge status={lead.status} />
          <OptOutBadge isOptedOut={lead.isOptedOut} />
          <LeadScoreBadge score={lead.leadScore} />
        </div>
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
        <button
          onClick={e => { e.stopPropagation(); onSendDM(lead); }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20"
          data-testid={`button-send-dm-${lead.id}`}
        >
          <Send className="w-2.5 h-2.5" /> DM
        </button>
      </div>
    </div>
  );
}

function AddEditLeadDialog({
  open, onClose, existing, clientId, clients, isAdmin,
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
    followUpDate:   existing?.followUpDate   ? format(new Date(existing.followUpDate),   "yyyy-MM-dd") : "",
    lastContactAt:  existing?.lastContactAt  ? format(new Date(existing.lastContactAt),  "yyyy-MM-dd") : "",
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
      followUpDate:  form.followUpDate  ? new Date(form.followUpDate).toISOString()  : null,
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
                <SelectTrigger className="mt-1" data-testid="select-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
                <SelectTrigger className="mt-1" data-testid="select-lead-status"><SelectValue /></SelectTrigger>
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

const PRESET_TEMPLATES = [
  {
    category: "Opener",
    emoji: "👋",
    title: "Warm Intro DM",
    content: `Hey {{first_name}}! 👋 Saw you engaged with my content and just wanted to personally reach out.

What's the main thing you're working on right now? Always love connecting with people in this space.`,
  },
  {
    category: "Opener",
    emoji: "🔥",
    title: "Keyword Reply (Freebie)",
    content: `Hey {{first_name}}! Thanks for reaching out 🙌

Here's the link you asked for: [INSERT LINK]

Let me know if you have any questions — happy to help!`,
  },
  {
    category: "Follow-up",
    emoji: "📩",
    title: "Soft Follow-Up",
    content: `Hey {{first_name}}, just circling back on this!

Didn't want it to get lost in your DMs. Did you get a chance to check it out?`,
  },
  {
    category: "Follow-up",
    emoji: "⏰",
    title: "Last Follow-Up",
    content: `Hey {{first_name}} — last time reaching out on this, I promise 😄

If the timing isn't right, no worries at all. But if you're still interested, I'd love to connect and see how I can help.

Either way, hope things are going well!`,
  },
  {
    category: "Sales",
    emoji: "💰",
    title: "Price / Offer Reply",
    content: `Hey {{first_name}}! Great question on pricing.

So it really depends on what you're looking for — investment starts at [PRICE] and goes up based on [SCOPE].

But before I give you numbers, can I ask — what's the main outcome you're trying to achieve? That way I can make sure I'm pointing you in the right direction.`,
  },
  {
    category: "Sales",
    emoji: "📅",
    title: "Book a Call",
    content: `Hey {{first_name}}! This is definitely something worth having a quick conversation about.

I have a few spots open this week — here's my calendar link: [LINK]

Pick whatever time works best for you. It's just a short 20-min call, no pressure at all.`,
  },
  {
    category: "Objection",
    emoji: "🤔",
    title: "\"I Need to Think About It\"",
    content: `Hey {{first_name}}, totally understand — it's a big decision and you should feel 100% sure before moving forward.

Can I ask what the main thing is you're still thinking about? Sometimes I can answer it right here and save you the back-and-forth 😊`,
  },
  {
    category: "Objection",
    emoji: "💸",
    title: "\"It's Too Expensive\"",
    content: `Hey {{first_name}}, I hear you — investment is always a consideration.

Out of curiosity, if price wasn't a factor, would this be something you'd want to move on? Just trying to understand if it's the budget or something else holding you back.`,
  },
  {
    category: "Nurture",
    emoji: "🎁",
    title: "Value Drop",
    content: `Hey {{first_name}}! Just thought of you when I came across this — [INSIGHT / TIP / RESOURCE].

Figured you might find it useful given what you mentioned about [TOPIC]. No strings attached, just something I thought you'd appreciate!`,
  },
  {
    category: "Conversion",
    emoji: "✅",
    title: "Post-Purchase Thank You",
    content: `Hey {{first_name}}! So excited to have you on board 🎉

Here's what happens next: [NEXT STEPS]

If you ever have questions or need anything, just reply here — I check DMs daily. Let's get you some amazing results!`,
  },
];

const PRESET_CATEGORIES = ["All", ...Array.from(new Set(PRESET_TEMPLATES.map(t => t.category)))];

function QuickRepliesPanel({ clientId, isAdmin }: { clientId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [title, setTitle]     = useState("");
  const [content, setContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(true);
  const [presetCategory, setPresetCategory] = useState("All");
  const [importingIdx, setImportingIdx] = useState<number | null>(null);

  const { data: _replies, isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/quick-replies", clientId],
    queryFn: () => fetch(`/api/dm/quick-replies${clientId ? `?clientId=${clientId}` : ""}`).then(r => { if (!r.ok) return []; return r.json(); }),
  });
  const replies = _replies ?? [];

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/quick-replies", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/quick-replies", clientId] }); setTitle(""); setContent(""); toast({ title: "Template saved!" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/quick-replies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/quick-replies", clientId] }),
  });

  const importPreset = async (preset: typeof PRESET_TEMPLATES[0], idx: number) => {
    setImportingIdx(idx);
    try {
      await apiRequest("POST", "/api/dm/quick-replies", { title: preset.title, content: preset.content, clientId });
      queryClient.invalidateQueries({ queryKey: ["/api/dm/quick-replies", clientId] });
      toast({ title: `"${preset.title}" imported!` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImportingIdx(null);
    }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPresets = presetCategory === "All"
    ? PRESET_TEMPLATES
    : PRESET_TEMPLATES.filter(t => t.category === presetCategory);

  const importedTitles = new Set(replies.map((r: any) => r.title));

  return (
    <div className="max-w-2xl space-y-4">

      {/* Starter Templates Gallery */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
        <button
          onClick={() => setShowPresets(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-500/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-violet-300">Starter Templates</span>
            <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">{PRESET_TEMPLATES.length} ready-to-use</Badge>
          </div>
          {showPresets ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showPresets && (
          <div className="px-4 pb-4 space-y-3">
            {/* Category filter */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setPresetCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${presetCategory === cat ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "border-border text-muted-foreground hover:border-violet-500/30 hover:text-violet-400"}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredPresets.map((preset, idx) => {
                const globalIdx = PRESET_TEMPLATES.indexOf(preset);
                const alreadyImported = importedTitles.has(preset.title);
                return (
                  <div key={globalIdx} className="p-3 rounded-lg border border-border/50 bg-card/40 space-y-1.5 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base">{preset.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{preset.title}</p>
                          <span className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{preset.category}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => !alreadyImported && importPreset(preset, globalIdx)}
                        disabled={alreadyImported || importingIdx === globalIdx}
                        className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                          alreadyImported
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
                            : "bg-violet-500/10 border-violet-500/20 text-violet-300 hover:bg-violet-500/20"
                        }`}
                      >
                        {alreadyImported ? <><CheckCircle2 className="w-3 h-3" /> Saved</> : importingIdx === globalIdx ? "..." : <><Plus className="w-3 h-3" /> Add</>}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{preset.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Custom template form */}
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

function InstagramConnectPanel({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [token, setToken]         = useState("");
  const [showToken, setShowToken] = useState(false);

  const { data: account, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ["/api/meta/account"],
    staleTime: 30000,
  });

  const connectMutation = useMutation({
    mutationFn: (shortToken: string) => apiRequest("POST", "/api/meta/refresh-token", { shortToken }),
    onSuccess: () => { toast({ title: "Instagram connected!", description: "Your account is now linked. Valid for ~60 days." }); setToken(""); refetch(); },
    onError: (e: any) => toast({ title: "Connection failed", description: e.message, variant: "destructive" }),
  });

  const isConnected = account?.connected;

  return (
    <div className="max-w-2xl space-y-5">
      <div className={`p-4 rounded-xl border flex items-start gap-4 ${isConnected ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isConnected ? "bg-green-500/20" : "bg-red-500/20"}`}>
          {isConnected ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-4 w-40 rounded" /><Skeleton className="h-3 w-60 rounded" /></div>
          ) : isConnected ? (
            <>
              <p className="text-sm font-bold text-green-400 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Connected</p>
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
        <button onClick={() => refetch()} disabled={isFetching} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-white/5" data-testid="button-refresh-meta-status">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5" />
          {isConnected ? "Reconnect / Update Token" : "How to Connect Your Instagram"}
        </p>
        <ol className="space-y-2">
          {[
            <>Open the <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-1">Meta Graph API Explorer <ExternalLink className="w-3 h-3" /></a></>,
            <>Select your <strong className="text-foreground">Facebook App</strong> and click <strong className="text-foreground">Generate Access Token</strong></>,
            <>Grant these permissions: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">instagram_basic</code> <code className="text-[10px] bg-muted px-1 py-0.5 rounded">instagram_manage_messages</code> <code className="text-[10px] bg-muted px-1 py-0.5 rounded">pages_show_list</code></>,
            <>Copy the token and paste it below — we'll automatically upgrade it to a <strong className="text-foreground">60-day token</strong></>,
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
          <Input type={showToken ? "text" : "password"} value={token} onChange={e => setToken(e.target.value)} placeholder="EAA..." className="pr-10 font-mono text-xs" data-testid="input-meta-token" />
          <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Button onClick={() => connectMutation.mutate(token)} disabled={!token.trim() || connectMutation.isPending} className="w-full gap-2" data-testid="button-connect-instagram">
          <Instagram className="w-4 h-4" />
          {connectMutation.isPending ? "Connecting..." : isConnected ? "Reconnect Instagram" : "Connect Instagram"}
        </Button>
      </div>

      {isConnected && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            For DMs to work, your recipient must have messaged your business first within the last 24 hours (Instagram policy). Make sure your token includes the <strong>instagram_manage_messages</strong> permission.
          </p>
        </div>
      )}
    </div>
  );
}

function SendDMDialog({ open, onClose, lead, clientId }: { open: boolean; onClose: () => void; lead: any; clientId: string }) {
  const { toast } = useToast();
  const [recipientId, setRecipientId]       = useState("");
  const [message, setMessage]               = useState("");
  const [selectedReply, setSelectedReply]   = useState("");

  const { data: _replies } = useQuery<any[]>({
    queryKey: ["/api/dm/quick-replies", clientId],
    queryFn: () => fetch(`/api/dm/quick-replies${clientId ? `?clientId=${clientId}` : ""}`).then(r => { if (!r.ok) return []; return r.json(); }),
    enabled: open,
  });
  const replies = _replies ?? [];

  const sendMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/instagram/send-dm", data),
    onSuccess: () => { toast({ title: "DM sent!", description: "Message delivered to recipient." }); setMessage(""); setRecipientId(""); setSelectedReply(""); onClose(); },
    onError: (e: any) => toast({ title: "Failed to send DM", description: e.message, variant: "destructive" }),
  });

  const applyTemplate = (replyId: string) => {
    const r = replies.find((r: any) => r.id === replyId);
    if (r) setMessage(r.content);
    setSelectedReply(replyId);
  };

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
            <p className="text-[11px] leading-relaxed">The recipient must have messaged your business within the last 24 hours for this to work (Instagram messaging policy).</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Recipient Instagram User ID *</Label>
            <Input value={recipientId} onChange={e => setRecipientId(e.target.value)} placeholder="e.g. 17841400000000000" className="mt-1 font-mono text-sm" data-testid="input-dm-recipient-id" />
            <p className="text-[10px] text-muted-foreground mt-1">Numeric Instagram user ID, not the @handle.{lead?.instagramHandle && <span> (@{lead.instagramHandle.replace(/^@/, "")})</span>}</p>
          </div>
          {replies.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Use Quick Reply Template</Label>
              <Select value={selectedReply} onValueChange={applyTemplate}>
                <SelectTrigger className="mt-1 text-xs" data-testid="select-quick-reply"><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                <SelectContent>{replies.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Message *</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message here..." rows={5} className="mt-1 resize-none" data-testid="input-dm-message" />
            <p className="text-[10px] text-muted-foreground mt-1">{message.length} / 1000 characters</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => sendMutation.mutate({ recipientId, message })} disabled={!recipientId.trim() || !message.trim() || sendMutation.isPending} className="gap-2" data-testid="button-send-dm">
            <Send className="w-3.5 h-3.5" />
            {sendMutation.isPending ? "Sending..." : "Send DM"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DM Automation sub-components ──────────────────────────────────────────────

function TriggerCard({ trigger, onEdit, onDelete, onToggle }: any) {
  const matchType = MATCH_TYPES.find(m => m.value === trigger.matchType);
  return (
    <div className="p-4 border border-card-border bg-card rounded-xl space-y-3 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{trigger.name}</h3>
            {trigger.isActive ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]"><Play className="w-2.5 h-2.5 mr-1" />Active</Badge>
            ) : (
              <Badge className="bg-muted/20 text-muted-foreground border-border text-[10px]"><Pause className="w-2.5 h-2.5 mr-1" />Paused</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">{trigger.keyword}</span>
            <span>·</span>
            <span>{matchType?.label}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{trigger.triggerCount || 0} triggers</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={trigger.isActive} onCheckedChange={() => onToggle(trigger.id, !trigger.isActive)} />
          <button onClick={() => onEdit(trigger)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(trigger.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
  const { data: _steps } = useQuery<any[]>({
    queryKey: [`/api/dm/sequences/${sequence.id}/steps`],
    queryFn: () => fetch(`/api/dm/sequences/${sequence.id}/steps`).then(r => { if (!r.ok) return []; return r.json(); }),
  });
  const steps = _steps ?? [];
  const { data: _enrollments } = useQuery<any[]>({
    queryKey: [`/api/dm/sequences/${sequence.id}/enrollments`],
    queryFn: () => fetch(`/api/dm/sequences/${sequence.id}/enrollments`).then(r => { if (!r.ok) return []; return r.json(); }),
  });
  const enrollments = _enrollments ?? [];
  const activeEnrollments    = enrollments.filter((e: any) => !e.completed).length;
  const completedEnrollments = enrollments.filter((e: any) => e.completed).length;

  return (
    <div className="p-4 border border-card-border bg-card rounded-xl space-y-3 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{sequence.name}</h3>
            {sequence.isActive ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]"><Play className="w-2.5 h-2.5 mr-1" />Active</Badge>
            ) : (
              <Badge className="bg-muted/20 text-muted-foreground border-border text-[10px]"><Pause className="w-2.5 h-2.5 mr-1" />Paused</Badge>
            )}
          </div>
          {sequence.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{sequence.description}</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{steps.length} steps</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{activeEnrollments} active</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{completedEnrollments} completed</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={sequence.isActive} onCheckedChange={() => onToggle(sequence.id, !sequence.isActive)} />
          <button onClick={() => onEdit(sequence)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(sequence.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
          {steps.length > 3 && <span className="text-[10px] text-muted-foreground">+{steps.length - 3} more</span>}
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] }); toast({ title: "Trigger created!" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/triggers/${existing?.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] }); toast({ title: "Trigger updated!" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.name.trim())         return toast({ title: "Name required",         variant: "destructive" });
    if (!form.keyword.trim())      return toast({ title: "Keyword required",      variant: "destructive" });
    if (!form.replyMessage.trim()) return toast({ title: "Reply message required",variant: "destructive" });
    const payload = { name: form.name.trim(), keyword: form.keyword.trim().toLowerCase(), matchType: form.matchType, replyMessage: form.replyMessage.trim(), isActive: form.isActive };
    if (existing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{existing ? "Edit Trigger" : "Create Auto-Reply Trigger"}</DialogTitle></DialogHeader>
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
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATCH_TYPES.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <div><p className="text-xs font-medium">{m.label}</p><p className="text-[10px] text-muted-foreground">{m.desc}</p></div>
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
            <div><p className="text-xs font-medium text-foreground">Active</p><p className="text-[10px] text-muted-foreground">Trigger will auto-reply when active</p></div>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>{isPending ? "Saving..." : existing ? "Save Changes" : "Create Trigger"}</Button>
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] }); toast({ title: "Sequence created!" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/sequences/${existing?.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] }); toast({ title: "Sequence updated!" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    const payload = { name: form.name.trim(), description: form.description.trim() || null, isActive: form.isActive };
    if (existing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{existing ? "Edit Sequence" : "Create DM Sequence"}</DialogTitle></DialogHeader>
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
            <div><p className="text-xs font-medium text-foreground">Active</p><p className="text-[10px] text-muted-foreground">New enrollments will be processed</p></div>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>{isPending ? "Saving..." : existing ? "Save Changes" : "Create Sequence"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function DMAutomationInner({ useAdmin = false }: { useAdmin?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const Layout  = useAdmin ? AdminLayout : ClientLayout;
  const isAdmin = useAdmin || user?.role === "admin";

  // Tab navigation (controlled)
  const [activeTab, setActiveTab] = useState("triggers");

  // Automation state
  const [triggerDialogOpen,  setTriggerDialogOpen]  = useState(false);
  const [editingTrigger,     setEditingTrigger]     = useState<any>(null);
  const [sequenceDialogOpen, setSequenceDialogOpen] = useState(false);
  const [editingSequence,    setEditingSequence]    = useState<any>(null);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);

  // Leads state
  const [search,            setSearch]           = useState("");
  const [filterStatus,      setFilterStatus]     = useState("all");
  const [filterTag,         setFilterTag]        = useState("");
  const [filterOptOut,      setFilterOptOut]     = useState("all");
  const [selectedClientId,  setSelectedClientId] = useState("all");
  const [addOpen,           setAddOpen]          = useState(false);
  const [editLead,          setEditLead]         = useState<any>(null);
  const [sendDMLead,        setSendDMLead]       = useState<any>(null);

  // Send DM inline state
  const [sendRecipientId,   setSendRecipientId]  = useState("");
  const [sendMessage,       setSendMessage]      = useState("");
  const [sendSelectedReply, setSendSelectedReply]= useState("");
  const [sent,              setSent]             = useState(false);

  const activeClientId = isAdmin
    ? (selectedClientId === "all" ? "" : selectedClientId)
    : (user?.id || "");

  // Automation queries with error handling
  const { data: _triggers, isLoading: triggersLoading, error: triggersError } = useQuery<any[]>({
    queryKey: ["/api/dm/triggers", activeClientId],
    queryFn:  () => fetch(`/api/dm/triggers${activeClientId ? `?userId=${activeClientId}` : ""}`).then(r => {
      if (!r.ok) return [];
      return r.json();
    }),
    retry: 2,
    staleTime: 30000,
  });
  const triggers = _triggers ?? [];
  const { data: _sequences, isLoading: sequencesLoading, error: sequencesError } = useQuery<any[]>({
    queryKey: ["/api/dm/sequences", activeClientId],
    queryFn:  () => fetch(`/api/dm/sequences${activeClientId ? `?userId=${activeClientId}` : ""}`).then(r => {
      if (!r.ok) return [];
      return r.json();
    }),
    retry: 2,
    staleTime: 30000,
  });
  const sequences = _sequences ?? [];

  // Leads queries with error handling
  const { data: _clients } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    enabled: isAdmin,
    retry: 2,
    staleTime: 60000,
  });
  const clients = _clients ?? [];
  const { data: _leads, isLoading: leadsLoading, error: leadsError } = useQuery<any[]>({
    queryKey: ["/api/dm/leads", activeClientId],
    queryFn:  () => fetch(`/api/dm/leads${activeClientId ? `?clientId=${activeClientId}` : ""}`).then(r => {
      if (!r.ok) return [];
      return r.json();
    }),
    retry: 2,
    staleTime: 30000,
  });
  const leads = _leads ?? [];

  // Quick replies for Send DM tab with error handling
  const { data: _sendReplies } = useQuery<any[]>({
    queryKey: ["/api/dm/quick-replies", activeClientId],
    queryFn:  () => fetch(`/api/dm/quick-replies${activeClientId ? `?clientId=${activeClientId}` : ""}`).then(r => {
      if (!r.ok) return [];
      return r.json();
    }),
    retry: 2,
    staleTime: 30000,
  });
  const sendReplies = _sendReplies ?? [];
  const { data: account, error: accountError } = useQuery<any>({
    queryKey: ["/api/meta/account"],
    staleTime: 30000,
    retry: 1,
  });
  const { data: aiCfg } = useQuery<any>({
    queryKey: ["/api/dm/ai-config", activeClientId],
    queryFn: () => apiRequest("GET", `/api/dm/ai-config${activeClientId ? `?clientId=${activeClientId}` : ""}`),
    staleTime: 60000,
    retry: 1,
  });

  // Automation mutations
  const deleteTriggerMutation  = useMutation({ mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/triggers/${id}`),  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] });  toast({ title: "Trigger deleted" }); } });
  const toggleTriggerMutation  = useMutation({ mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/dm/triggers/${id}`,  { isActive }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] }) });
  const deleteSequenceMutation = useMutation({ mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/sequences/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] }); toast({ title: "Sequence deleted" }); } });
  const toggleSequenceMutation = useMutation({ mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/dm/sequences/${id}`, { isActive }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/sequences"] }) });

  // Lead mutations
  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/leads/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] }); setEditLead(null); toast({ title: "Lead removed" }); },
  });
  const quickStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/dm/leads/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] }),
  });

  // Send DM mutation (inline)
  const sendDMMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/instagram/send-dm", data),
    onSuccess: () => {
      toast({ title: "DM sent!", description: "Your message was delivered." });
      setSent(true); setSendMessage(""); setSendRecipientId(""); setSendSelectedReply("");
      setTimeout(() => setSent(false), 4000);
    },
    onError: (e: any) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  // Computed
  const activeTriggers    = triggers.filter(t => t.isActive).length;
  const activeSequences   = sequences.filter(s => s.isActive).length;
  const totalTriggerCount = triggers.reduce((sum, t) => sum + (t.triggerCount || 0), 0);

  const filteredLeads = leads.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.instagramHandle || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchOptOut = filterOptOut === "all" || (filterOptOut === "opted-out" ? l.isOptedOut : !l.isOptedOut);
    return matchSearch && matchStatus && matchOptOut;
  });

  const leadStats = {
    total: leads.length,
    hot: leads.filter(l => l.status === "hot").length,
    warm: leads.filter(l => l.status === "warm").length,
    cold: leads.filter(l => l.status === "cold").length,
    converted: leads.filter(l => l.status === "converted").length,
    new: leads.filter(l => l.status === "new").length,
  };

  const isConnected = account?.connected;
  const hasAiBrain = !!(aiCfg?.isActive);

  // Show error state if critical queries fail
  if (triggersError || sequencesError || leadsError) {
    return (
      <Layout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">DM Automation</h1>
              <p className="text-xs text-muted-foreground">Leads, auto-replies & sequences</p>
            </div>
          </div>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="max-w-md w-full p-6 space-y-4 text-center border border-red-500/20 bg-red-500/5 rounded-xl">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Failed to Load DM Automation</h2>
              <p className="text-sm text-muted-foreground">
                {(triggersError as any)?.message || (sequencesError as any)?.message || (leadsError as any)?.message || "An error occurred while loading your data"}
              </p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">DM Automation</h1>
            <p className="text-xs text-muted-foreground">Leads, auto-replies & sequences</p>
          </div>
          {isAdmin && clients.length > 0 && (
            <div className="ml-auto">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-44 h-9 text-xs" data-testid="select-filter-client">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active Triggers",   val: activeTriggers,                      color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20",  icon: Zap },
            { label: "Active Sequences",  val: activeSequences,                     color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",    icon: MessageSquare },
            { label: "Total Leads",       val: leadStats.total,                     color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: Users },
            { label: "Converted",         val: leadStats.converted,                 color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",  icon: CheckCircle2 },
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

        {/* Setup Guide Checklist */}
        <SetupChecklist
          isConnected={!!isConnected}
          hasTriggers={triggers.length > 0}
          hasSequences={sequences.length > 0}
          hasLeads={leads.length > 0}
          hasBroadcasts={false}
          hasAiBrain={hasAiBrain}
          onNavigate={tab => setActiveTab(tab)}
        />

        {/* Main Tabs — ordered by setup flow */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="space-y-2">
            {/* Tab tier labels + triggers */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Foundation</span>
              <TabsList className="h-auto flex-wrap bg-transparent gap-1 p-0">
                <TabsTrigger value="settings"      className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><Settings className="w-3.5 h-3.5" />Settings{!isConnected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}</TabsTrigger>
                <TabsTrigger value="triggers"      className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><Zap className="w-3.5 h-3.5" />Auto-Replies</TabsTrigger>
                <TabsTrigger value="quick-replies" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><MessageSquare className="w-3.5 h-3.5" />Templates</TabsTrigger>
              </TabsList>
              <div className="w-px h-5 bg-border mx-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Automation</span>
              <TabsList className="h-auto flex-wrap bg-transparent gap-1 p-0">
                <TabsTrigger value="sequences"     className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><Layers className="w-3.5 h-3.5" />Sequences</TabsTrigger>
                <TabsTrigger value="leads"         className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><MessageCircle className="w-3.5 h-3.5" />Leads</TabsTrigger>
                <TabsTrigger value="broadcasts"    className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><Send className="w-3.5 h-3.5" />Broadcasts</TabsTrigger>
                <TabsTrigger value="send-dm"       className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><Send className="w-3.5 h-3.5" />Send DM</TabsTrigger>
              </TabsList>
              <div className="w-px h-5 bg-border mx-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Advanced</span>
              <TabsList className="h-auto flex-wrap bg-transparent gap-1 p-0">
                <TabsTrigger value="ai-brain"      className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><Bot className="w-3.5 h-3.5" />AI Brain</TabsTrigger>
                <TabsTrigger value="tracking"      className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><Link2 className="w-3.5 h-3.5" />Tracking</TabsTrigger>
                <TabsTrigger value="webhooks"      className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><Webhook className="w-3.5 h-3.5" />Webhooks</TabsTrigger>
                <TabsTrigger value="custom-fields" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:border data-[state=active]:border-border h-8"><Database className="w-3.5 h-3.5" />Fields</TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Auto-Replies Tab */}
          <TabsContent value="triggers" className="mt-4 space-y-4">
            <TabGuide
              id="triggers"
              title="Auto-Replies — Reply instantly when someone sends a keyword"
              steps={[
                { icon: Plus,         label: "Create a trigger",   desc: "Click 'New Trigger' and enter the keyword people send (e.g. 'link', 'price', 'freebie')." },
                { icon: MessageSquare,label: "Write your reply",   desc: "Craft the message that fires automatically. Use {{first_name}} to personalize it." },
                { icon: Zap,          label: "Set match type",     desc: "Choose Exact Match, Contains, or Starts With depending on how precise you need it." },
                { icon: Play,         label: "Enable & test",      desc: "Toggle the trigger on, then DM yourself the keyword to verify it fires correctly." },
              ]}
              tips={["Use 'Contains' for flexibility — e.g. keyword 'price' catches 'what's the price'", "Stack multiple triggers for different keywords", "{{first_name}} auto-fills from the lead's name in your CRM"]}
            />
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
            <TabGuide
              id="sequences"
              title="Sequences — Multi-step DM drip campaigns sent over time"
              steps={[
                { icon: Plus,         label: "Create a sequence",  desc: "Click 'New Sequence', name it (e.g. 'New Lead Nurture'), and add your first step." },
                { icon: Layers,       label: "Add steps",          desc: "Each step has a message + delay. E.g. Step 1 (Day 0), Step 2 (+2 days), Step 3 (+5 days)." },
                { icon: Users,        label: "Enroll leads",       desc: "Leads are enrolled manually or automatically when a trigger fires that's linked to this sequence." },
                { icon: CheckCircle2, label: "Monitor progress",   desc: "Track which leads are on which step and who converted through the sequence." },
              ]}
              tips={["Best for onboarding new followers, nurture campaigns, or sales follow-ups", "Use delays to space out messages — don't spam. Day 0, 2, 5, 10 is a solid cadence", "Personalize with {{first_name}} on every step"]}
            />
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

          {/* Leads Tab */}
          <TabsContent value="leads" className="mt-4 space-y-4">
            <TabGuide
              id="leads"
              title="Leads — Track every contact through your pipeline"
              steps={[
                { icon: Plus,         label: "Add a lead",         desc: "Click 'Add Lead', enter their name and Instagram handle. Leads are also auto-created when triggers fire." },
                { icon: LayoutGrid,   label: "Manage pipeline",    desc: "Move leads across New → Warm → Hot → Converted using the Pipeline view. Drag or edit status." },
                { icon: Calendar,     label: "Set follow-ups",     desc: "Assign a follow-up date to each lead. Overdue follow-ups show in red so nothing falls through." },
                { icon: Send,         label: "DM from the card",   desc: "Click the 'DM' button on any lead card to jump straight to sending them a message." },
              ]}
              tips={["Hot leads = high intent, act fast", "Use the filter bar to segment by status, tag, or opt-out", "CSV export backs up your entire lead list with all fields"]}
            />
            {/* Lead stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: "Total",        val: leadStats.total,     color: "text-foreground", bg: "bg-card border-card-border" },
                { label: "New",          val: leadStats.new,       color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20" },
                { label: "Hot 🔥",       val: leadStats.hot,       color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
                { label: "Warm",         val: leadStats.warm,      color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
                { label: "Cold",         val: leadStats.cold,      color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
                { label: "Converted ✅", val: leadStats.converted, color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
              ].map(s => (
                <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Leads sub-tabs */}
            <Tabs defaultValue="pipeline">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <TabsList>
                    <TabsTrigger value="pipeline" className="gap-1.5 text-xs"><LayoutGrid className="w-3.5 h-3.5" />Pipeline</TabsTrigger>
                    <TabsTrigger value="list"     className="gap-1.5 text-xs"><List className="w-3.5 h-3.5" />List</TabsTrigger>
                  </TabsList>
                  <Button onClick={() => setAddOpen(true)} className="gap-2 h-9 text-sm" data-testid="button-add-lead">
                    <Plus className="w-4 h-4" /> Add Lead
                  </Button>
                  <CSVExportButton clientId={activeClientId} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="pl-8 h-8 text-xs w-44" data-testid="input-search-leads" />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs w-32" data-testid="select-filter-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <OptOutFilter value={filterOptOut} onChange={setFilterOptOut} />
                </div>
              </div>

              {/* Pipeline view */}
              <TabsContent value="pipeline" className="mt-4">
                {leadsLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {PIPELINE_STATUSES.map(s => <Skeleton key={s} className="h-64 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {PIPELINE_STATUSES.map(status => {
                      const cfg  = STATUS_CONFIG[status];
                      const Icon = cfg.icon;
                      const col  = filteredLeads.filter(l => l.status === status);
                      return (
                        <div key={status} className={`rounded-xl border ${cfg.border} bg-card/30 p-3 space-y-2 min-h-[200px]`}>
                          <div className="flex items-center justify-between mb-3">
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
                            col.map(lead => <LeadCard key={lead.id} lead={lead} onClick={() => setEditLead(lead)} onSendDM={setSendDMLead} />)
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* List view */}
              <TabsContent value="list" className="mt-4">
                {leadsLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
                ) : filteredLeads.length === 0 ? (
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
                        {filteredLeads.map((lead, i) => {
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
            </Tabs>
          </TabsContent>

          {/* Send DM Tab */}
          <TabsContent value="send-dm" className="mt-4">
            <div className="max-w-2xl space-y-5">
              <TabGuide
                id="send-dm"
                title="Send DM — Send a one-off DM to any lead"
                steps={[
                  { icon: Instagram,    label: "Must be connected",  desc: "Your Instagram must be linked in Settings before you can send. A green badge confirms it." },
                  { icon: User,         label: "Get their User ID",  desc: "You need the numeric Instagram User ID (e.g. 1784140000) — not the @handle. Get it from the lead card or Meta Graph Explorer." },
                  { icon: MessageSquare,label: "Load a template",    desc: "Use the Quick Reply dropdown to prefill a saved template, then customize it." },
                  { icon: Send,         label: "Send",               desc: "Hit Send DM. Note: Instagram only allows DMs to users who messaged you in the last 24h." },
                ]}
                tips={["24-hour window is a Meta policy — cannot be bypassed", "Use the Templates tab to save your most-used messages", "Lead cards have a quick DM shortcut for faster sending"]}
              />
              {account && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${isConnected ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
                  {isConnected ? (
                    <><Instagram className="w-4 h-4 flex-shrink-0" /><span>Connected as <strong>@{account.igUsername}</strong></span></>
                  ) : (
                    <><WifiOff className="w-4 h-4 flex-shrink-0" /><span>Instagram not connected — connect it in the Instagram tab above.</span></>
                  )}
                </div>
              )}

              <Card className="border-card-border">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <Label className="text-xs text-muted-foreground">Recipient Instagram User ID *</Label>
                    <Input value={sendRecipientId} onChange={e => setSendRecipientId(e.target.value)} placeholder="e.g. 17841400000000000" className="mt-1.5 font-mono text-sm" data-testid="input-dm-recipient-id" />
                    <p className="text-[10px] text-muted-foreground mt-1.5">The numeric Instagram user ID — not the @handle.</p>
                  </div>
                  {sendReplies.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Quick Reply Template</Label>
                      <Select value={sendSelectedReply} onValueChange={id => { const r = sendReplies.find((r: any) => r.id === id); if (r) setSendMessage(r.content); setSendSelectedReply(id); }}>
                        <SelectTrigger className="mt-1.5 text-xs" data-testid="select-quick-reply"><SelectValue placeholder="Choose a template to prefill..." /></SelectTrigger>
                        <SelectContent>{sendReplies.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Message *</Label>
                    <Textarea value={sendMessage} onChange={e => setSendMessage(e.target.value)} placeholder="Type your message..." rows={6} className="mt-1.5 resize-none" data-testid="input-dm-message" />
                    <p className="text-[10px] text-muted-foreground mt-1">{sendMessage.length} / 1000 characters</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">Instagram only allows DMs to users who have messaged your business within the last 24 hours. This is an Instagram policy and cannot be bypassed.</p>
                  </div>
                  <Button onClick={() => sendDMMutation.mutate({ recipientId: sendRecipientId, message: sendMessage })} disabled={!sendRecipientId.trim() || !sendMessage.trim() || sendDMMutation.isPending || sent} className="w-full gap-2" data-testid="button-send-dm">
                    {sent ? <><CheckCircle2 className="w-4 h-4" /> Sent!</> : sendDMMutation.isPending ? "Sending..." : <><Send className="w-4 h-4" /> Send DM</>}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quick Replies Tab */}
          <TabsContent value="quick-replies" className="mt-4 space-y-0">
            <TabGuide
              id="quick-replies"
              title="Templates — Save and reuse your best DM messages"
              steps={[
                { icon: Plus,         label: "Create a template",  desc: "Click 'New Template', give it a name, and write the message you want to reuse." },
                { icon: MessageSquare,label: "Use variables",      desc: "Add {{first_name}}, {{instagram}}, or any custom field to personalize each send." },
                { icon: Copy,         label: "Copy instantly",     desc: "Click the copy icon on any template to instantly copy it to your clipboard." },
                { icon: Send,         label: "Load in Send DM",    desc: "In the Send DM tab, select any template from the dropdown to prefill the message box." },
              ]}
              tips={["Create templates for your most common replies: intro, follow-up, offer, objection handle", "Templates save you minutes every single day"]}
            />
            <QuickRepliesPanel clientId={activeClientId} isAdmin={isAdmin} />
          </TabsContent>

          {/* Broadcasts Tab */}
          <TabsContent value="broadcasts" className="mt-4">
            <div className="space-y-4">
              <TabGuide
                id="broadcasts"
                title="Broadcasts — Send a DM blast to all your leads at once"
                steps={[
                  { icon: Users,        label: "Build your list",    desc: "Broadcasts go to leads in your pipeline. Make sure you've added leads first." },
                  { icon: MessageSquare,label: "Write the message",   desc: "Craft your broadcast message. Use {{first_name}} to personalize at scale." },
                  { icon: Calendar,     label: "Schedule it",        desc: "Choose a send time — schedule broadcasts for when your audience is most active." },
                  { icon: AlertCircle,  label: "Instagram limits",   desc: "Instagram only allows DMs to users who messaged you in the last 24h. This is a Meta policy." },
                ]}
                tips={["Warm leads respond best — filter your list before blasting", "Test your message on one lead first before sending to all", "Track replies in the Leads tab after sending"]}
              />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Scheduled Broadcasts</h3>
                  <p className="text-xs text-muted-foreground">Send mass DMs to your leads</p>
                </div>
                <Button onClick={() => setBroadcastDialogOpen(true)} className="gap-2 h-9 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Send className="w-4 h-4" />
                  Schedule Broadcast
                </Button>
              </div>
              <ScheduledBroadcastsList clientId={activeClientId} />
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="mt-4">
            <TabGuide
              id="webhooks"
              title="Webhooks — Real-time event notifications"
              steps={[
                { icon: Link2,        label: "Add a URL",          desc: "Paste your server endpoint or Zapier/Make webhook URL." },
                { icon: Zap,          label: "Choose events",      desc: "Pick which events fire the webhook: new_lead, trigger_fired, dm_sent, etc." },
                { icon: CheckCircle2, label: "Test it",            desc: "Use the 'Test' button to fire a sample payload and verify your endpoint responds." },
                { icon: RefreshCw,    label: "Monitor & debug",    desc: "Check delivery logs in your receiving service. Webhooks retry on failure." },
              ]}
              tips={["Works with Zapier, Make, n8n, and any HTTP endpoint", "Events include: new_lead, lead_status_changed, dm_sent, trigger_fired"]}
            />
            <WebhookManager clientId={activeClientId} />
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="mt-4">
            <TabGuide
              id="tracking"
              title="Click Tracking — See who clicks your links"
              steps={[
                { icon: Link2,        label: "Create a link",      desc: "Paste any destination URL and give the link a name." },
                { icon: Send,         label: "Use in DMs",         desc: "Copy the tracking URL and paste it into your DM or sequence messages." },
                { icon: CheckCircle2, label: "Track clicks",       desc: "Every click logs the lead, timestamp, and device type automatically." },
                { icon: Target,       label: "Measure ROI",        desc: "See which messages or triggers drive the most link clicks and conversions." },
              ]}
              tips={["Use different links per campaign to A/B test messaging", "Clicks are tied back to the lead record automatically"]}
            />
            <ClickTrackingPanel clientId={activeClientId} />
          </TabsContent>

          {/* Custom Fields Tab */}
          <TabsContent value="custom-fields" className="mt-4">
            <TabGuide
              id="custom-fields"
              title="Custom Fields — Capture any lead data you need"
              steps={[
                { icon: Plus,         label: "Create a field",     desc: "Name your field (e.g. 'Budget', 'Industry', 'Niche') and choose its type." },
                { icon: Users,        label: "Fill per lead",      desc: "Open any lead card and fill in the custom field values for that contact." },
                { icon: MessageSquare,label: "Use in templates",   desc: "Reference fields in DMs with {{field_name}} — they auto-fill per lead." },
                { icon: Database,     label: "Export with CSV",    desc: "All custom field data is included when you export your leads to CSV." },
              ]}
              tips={["Field names become template variables: 'Budget' → {{budget}}", "Great for segmenting leads for targeted broadcasts"]}
            />
            <CustomFieldsManager clientId={activeClientId} />
          </TabsContent>

          {/* AI Brain Tab */}
          <TabsContent value="ai-brain" className="mt-4">
            <TabGuide
              id="ai-brain"
              title="AI Brain — Handle DMs in your voice with your own API key"
              steps={[
                { icon: Key,          label: "Add your API key",   desc: "Paste your Claude (Anthropic) or Gemini (Google) API key. It's encrypted and never logged." },
                { icon: Sparkles,     label: "Write your prompt",  desc: "Describe your voice, goals, and rules. E.g. 'Keep replies under 3 sentences. Never pitch immediately.'" },
                { icon: MessageSquare,label: "Add examples",       desc: "Show 3-5 real DM exchanges in your style. The AI learns your exact tone from these." },
                { icon: Tag,          label: "Set tag rules",      desc: "Define keywords that auto-tag leads. E.g. 'pricing' → tag 'pricing-interest'." },
              ]}
              tips={["Claude claude-opus-4-8 is the default — best quality", "Test before enabling — use the test box to verify replies match your tone", "Toggle 'Active' only when you're confident in the output"]}
            />
            <AIBrainConfig clientId={activeClientId} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4 space-y-6">
            <TabGuide
              id="settings"
              title="Settings — Start here before anything else"
              steps={[
                { icon: Instagram,    label: "Connect Instagram",  desc: "Link your Meta/Instagram account. This is required for all DM sending and auto-replies." },
                { icon: MessageSquare,label: "Set Welcome DM",     desc: "Write a message that's auto-sent when someone DMs you for the first time." },
                { icon: CheckCircle2, label: "Verify connection",  desc: "After connecting, you should see your @username and a green 'Connected' badge." },
                { icon: RefreshCw,    label: "Re-connect if needed", desc: "If your token expires, return here and reconnect — tokens last ~60 days." },
              ]}
              tips={["Must connect Instagram before triggers or AI replies can fire", "Welcome DM fires once per new contact — not on repeat messages"]}
            />
            <WelcomeDMConfig clientId={activeClientId} />
            <div className="border-t border-border pt-6">
              <InstagramConnectPanel clientId={activeClientId} />
            </div>
            <div className="border-t border-border pt-6">
              <CSVExportCard clientId={activeClientId} leadCount={leads.length} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Automation dialogs */}
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
        <ScheduledBroadcastDialog
          open={broadcastDialogOpen}
          onClose={() => setBroadcastDialogOpen(false)}
          clientId={activeClientId}
        />

        {/* Lead dialogs */}
        <AddEditLeadDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          clientId={activeClientId}
          clients={isAdmin ? clients : undefined}
          isAdmin={isAdmin}
        />

        {sendDMLead && (
          <SendDMDialog
            open={!!sendDMLead}
            onClose={() => setSendDMLead(null)}
            lead={sendDMLead}
            clientId={activeClientId}
          />
        )}

        {editLead && (
          <Dialog open={!!editLead} onOpenChange={v => !v && setEditLead(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{editLead.name}</span>
                  <button onClick={() => { if (confirm("Delete this lead?")) deleteLeadMutation.mutate(editLead.id); }} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-accent">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-6">
                <div>
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
                </div>

                <div className="border-t border-border pt-6">
                  <TagManager leadId={editLead.id} clientId={activeClientId} />
                </div>

                <div className="border-t border-border pt-6">
                  <AILeadScoring lead={editLead} />
                </div>

                <div className="border-t border-border pt-6">
                  <OptOutToggle lead={editLead} />
                </div>

                <div className="border-t border-border pt-6">
                  <CustomFieldsEditor leadId={editLead.id} clientId={activeClientId} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditLead(null)}>Close</Button>
                <Button onClick={() => { setSendDMLead(editLead); setEditLead(null); }} variant="secondary" className="gap-2" data-testid="button-send-dm-from-detail">
                  <Send className="w-3.5 h-3.5" /> Send DM
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}

export default function DMAutomation(props: { useAdmin?: boolean }) {
  return (
    <ErrorBoundary>
      <DMAutomationInner {...props} />
    </ErrorBoundary>
  );
}
