/**
 * Campaign tree panel — embedded in Tracking page Meta Ads section.
 * Campaign → Ad Sets → Ads with inline edits, bulk ops, create modal.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Layers, ChevronRight, ChevronDown, Plus, Pause, Play,
  Trash2, Edit2, Check, X, TrendingUp, DollarSign, Eye, MousePointer,
  Zap, Target, CheckSquare, Square, Minus
} from "lucide-react";

const OBJECTIVES = ["CONVERSIONS","TRAFFIC","AWARENESS","LEADS","ENGAGEMENT","APP_INSTALLS","VIDEO_VIEWS","REACH"];

function fmt$(n: any) { return `$${parseFloat(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtN(n: any) { return parseInt(n||0).toLocaleString(); }
function fmtPct(n: any) { return `${parseFloat(n||0).toFixed(2)}%`; }
function fmtROAS(n: any) { return `${parseFloat(n||0).toFixed(2)}x`; }

const STATUS_CONFIG: Record<string, { cls: string; dot: string }> = {
  ACTIVE: { cls: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5", dot: "bg-emerald-400" },
  PAUSED: { cls: "border-yellow-500/20 text-yellow-400 bg-yellow-500/5", dot: "bg-yellow-400" },
  DELETED: { cls: "border-red-500/20 text-red-400 bg-red-500/5", dot: "bg-red-400" },
  ARCHIVED: { cls: "border-border text-muted-foreground", dot: "bg-muted-foreground" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ARCHIVED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function InlineEdit({ value, onSave, prefix = "" }: any) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  if (!editing) return (
    <button onClick={() => setEditing(true)} className="group flex items-center gap-1 hover:text-foreground transition-colors text-xs">
      <span>{prefix}{value}</span>
      <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60" />
    </button>
  );
  return (
    <div className="flex items-center gap-1">
      <Input value={val} onChange={e => setVal(e.target.value)}
        className="h-6 w-20 text-xs px-1 py-0 font-mono" autoFocus
        onKeyDown={e => { if (e.key === "Enter") { onSave(val); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
      />
      <button onClick={() => { onSave(val); setEditing(false); }} className="text-emerald-400"><Check className="w-3 h-3" /></button>
      <button onClick={() => setEditing(false)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
    </div>
  );
}

function AdRow({ ad, clientId, onMutate }: any) {
  const { toast } = useToast();
  const patch = useMutation({
    mutationFn: (body: any) => apiRequest("PATCH", `/api/meta-cm/ad/${clientId}/${ad.id}`, body),
    onSuccess: () => { toast({ title: "Ad updated" }); onMutate(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/meta-cm/ad/${clientId}/${ad.id}`),
    onSuccess: () => { toast({ title: "Ad deleted" }); onMutate(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const ins = ad.insights || {};
  const spend = parseFloat(ins.spend || 0);
  const revenue = (ins.action_values || []).filter((a: any) => a.action_type === "omni_purchase").reduce((s: number, a: any) => s + parseFloat(a.value || 0), 0);
  const roas = spend > 0 ? revenue / spend : 0;
  return (
    <tr className="border-b border-card-border/20 hover:bg-muted/5 text-xs">
      <td className="pl-20 pr-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 rounded-full bg-muted-foreground/30 flex-shrink-0" />
          <span className="text-muted-foreground truncate max-w-[160px]">{ad.name}</span>
        </div>
      </td>
      <td className="px-3 py-2"><StatusBadge status={ad.status} /></td>
      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{spend > 0 ? fmt$(spend) : "—"}</td>
      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{roas > 0 ? `${roas.toFixed(2)}x` : "—"}</td>
      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{ins.ctr ? fmtPct(ins.ctr) : "—"}</td>
      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{ins.impressions ? fmtN(ins.impressions) : "—"}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 justify-end">
          {ad.status === "ACTIVE"
            ? <button onClick={() => patch.mutate({ status: "PAUSED" })} className="p-1 rounded hover:bg-yellow-500/10 text-yellow-400"><Pause className="w-3 h-3" /></button>
            : <button onClick={() => patch.mutate({ status: "ACTIVE" })} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400"><Play className="w-3 h-3" /></button>
          }
          <button onClick={() => { if (confirm("Delete ad?")) del.mutate(); }} className="p-1 rounded hover:bg-red-500/10 text-red-400"><Trash2 className="w-3 h-3" /></button>
        </div>
      </td>
    </tr>
  );
}

function AdSetRow({ adset, clientId, onMutate }: any) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const { data: ads = [], refetch: refetchAds, isLoading: adsLoading } = useQuery<any[]>({
    queryKey: ["/api/meta-cm/ads", clientId, adset.id],
    queryFn: () => apiRequest("GET", `/api/meta-cm/ads/${clientId}/${adset.id}`),
    enabled: expanded,
  });
  const patch = useMutation({
    mutationFn: (body: any) => apiRequest("PATCH", `/api/meta-cm/adset/${clientId}/${adset.id}`, body),
    onSuccess: () => { toast({ title: "Ad set updated" }); onMutate(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/meta-cm/adset/${clientId}/${adset.id}`),
    onSuccess: () => { toast({ title: "Ad set deleted" }); onMutate(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const ins = adset.insights || {};
  const budget = adset.daily_budget ? parseFloat(adset.daily_budget) / 100 : null;
  return (
    <>
      <tr className="border-b border-card-border/30 hover:bg-muted/5 text-xs bg-muted/5">
        <td className="pl-12 pr-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <div className="w-1.5 h-1.5 rounded-sm bg-blue-400/60 flex-shrink-0" />
            <span className="text-foreground/80 font-medium truncate max-w-[160px]">{adset.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">({adset.optimization_goal?.replace(/_/g," ")})</span>
          </div>
        </td>
        <td className="px-3 py-2"><StatusBadge status={adset.status} /></td>
        <td className="px-3 py-2 text-right font-mono">{parseFloat(ins.spend||0) > 0 ? fmt$(ins.spend) : "—"}</td>
        <td className="px-3 py-2 text-right font-mono text-muted-foreground">—</td>
        <td className="px-3 py-2 text-right font-mono">{ins.ctr ? fmtPct(ins.ctr) : "—"}</td>
        <td className="px-3 py-2 text-right font-mono">{ins.impressions ? fmtN(ins.impressions) : "—"}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1 justify-end">
            {budget != null && <InlineEdit value={budget.toFixed(2)} prefix="$" onSave={(v: string) => patch.mutate({ dailyBudget: parseFloat(v) })} />}
            {adset.status === "ACTIVE"
              ? <button onClick={() => patch.mutate({ status: "PAUSED" })} className="p-1 rounded hover:bg-yellow-500/10 text-yellow-400"><Pause className="w-3 h-3" /></button>
              : <button onClick={() => patch.mutate({ status: "ACTIVE" })} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400"><Play className="w-3 h-3" /></button>
            }
            <button onClick={() => { if (confirm("Delete ad set?")) del.mutate(); }} className="p-1 rounded hover:bg-red-500/10 text-red-400"><Trash2 className="w-3 h-3" /></button>
          </div>
        </td>
      </tr>
      {expanded && (adsLoading
        ? <tr><td colSpan={7} className="pl-20 py-2 text-[10px] text-muted-foreground">Loading ads...</td></tr>
        : ads.length === 0
        ? <tr><td colSpan={7} className="pl-20 py-2 text-[10px] text-muted-foreground italic">No ads in this ad set</td></tr>
        : ads.map(ad => <AdRow key={ad.id} ad={ad} clientId={clientId} onMutate={refetchAds} />)
      )}
    </>
  );
}

function CampaignRow({ campaign, clientId, selected, onSelect, onMutate }: any) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const { data: adsets = [], refetch: refetchAdsets, isLoading: adsetsLoading } = useQuery<any[]>({
    queryKey: ["/api/meta-cm/adsets", clientId, campaign.campaign_id],
    queryFn: () => apiRequest("GET", `/api/meta-cm/adsets/${clientId}/${campaign.campaign_id}`),
    enabled: expanded,
  });
  const patch = useMutation({
    mutationFn: (body: any) => apiRequest("PATCH", `/api/meta-cm/campaign/${clientId}/${campaign.campaign_id}`, body),
    onSuccess: () => { toast({ title: "Campaign updated" }); onMutate(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/meta-cm/campaign/${clientId}/${campaign.campaign_id}`),
    onSuccess: () => { toast({ title: "Campaign deleted" }); onMutate(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const budget = campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null;
  const roasNum = parseFloat(campaign.roas || 0);
  return (
    <>
      <tr className={`border-b border-card-border/50 transition-colors text-xs ${selected ? "bg-primary/5" : "hover:bg-muted/10"}`}>
        <td className="pl-3 pr-2 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => onSelect(campaign.campaign_id)} className="flex-shrink-0">
              {selected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />}
            </button>
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="w-2 h-2 rounded-sm bg-primary/60 flex-shrink-0" />
            <span className="font-semibold text-foreground truncate max-w-[160px]">{campaign.campaign_name}</span>
            <span className="text-[10px] text-muted-foreground font-mono uppercase opacity-60">
              {campaign.objective?.replace("OUTCOME_","").replace(/_/g," ")}
            </span>
          </div>
        </td>
        <td className="px-3 py-3"><StatusBadge status={campaign.status} /></td>
        <td className="px-3 py-3 text-right font-mono font-semibold">{fmt$(campaign.spend)}</td>
        <td className={`px-3 py-3 text-right font-mono font-semibold ${roasNum >= 3 ? "text-emerald-400" : roasNum >= 1 ? "text-foreground" : roasNum > 0 ? "text-red-400" : "text-muted-foreground"}`}>
          {roasNum > 0 ? fmtROAS(roasNum) : "—"}
        </td>
        <td className="px-3 py-3 text-right font-mono">{fmtPct(campaign.ctr)}</td>
        <td className="px-3 py-3 text-right font-mono">{fmtN(campaign.impressions)}</td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1 justify-end">
            {budget != null && <InlineEdit value={budget.toFixed(2)} prefix="$" onSave={(v: string) => patch.mutate({ dailyBudget: parseFloat(v) })} />}
            {campaign.status === "ACTIVE"
              ? <button onClick={() => patch.mutate({ status: "PAUSED" })} className="p-1.5 rounded hover:bg-yellow-500/10 text-yellow-400"><Pause className="w-3.5 h-3.5" /></button>
              : <button onClick={() => patch.mutate({ status: "ACTIVE" })} className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400"><Play className="w-3.5 h-3.5" /></button>
            }
            <button onClick={() => { if (confirm(`Delete "${campaign.campaign_name}"?`)) del.mutate(); }} className="p-1.5 rounded hover:bg-red-500/10 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>
      {expanded && (adsetsLoading
        ? <tr><td colSpan={7} className="pl-12 py-2 text-[10px] text-muted-foreground">Loading ad sets...</td></tr>
        : adsets.length === 0
        ? <tr><td colSpan={7} className="pl-12 py-2 text-[10px] text-muted-foreground italic">No ad sets — create one in Meta Ads Manager first</td></tr>
        : adsets.map(as => <AdSetRow key={as.id} adset={as} clientId={clientId} onMutate={refetchAdsets} />)
      )}
    </>
  );
}

function CreateCampaignModal({ open, onClose, clientId, onCreated }: any) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("CONVERSIONS");
  const [dailyBudget, setDailyBudget] = useState("");
  const [status, setStatus] = useState("PAUSED");
  const create = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/meta-cm/campaign/${clientId}`, body),
    onSuccess: (data) => { toast({ title: `Campaign "${data.name}" created` }); onCreated(); onClose(); setName(""); setDailyBudget(""); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4 text-primary" /> New Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Campaign Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Summer Sale 2026" className="mt-1 h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Objective</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Daily Budget ($)</Label>
              <Input value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} placeholder="100" type="number" min="1" className="mt-1 h-9 text-sm font-mono" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Initial Status</Label>
            <div className="flex gap-2 mt-1.5">
              {["PAUSED","ACTIVE"].map(s => (
                <button key={s} onClick={() => setStatus(s)} className={`flex-1 h-8 rounded-lg text-xs font-semibold border transition-colors ${status === s ? (s === "ACTIVE" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-yellow-500/20 border-yellow-500/30 text-yellow-400") : "border-border text-muted-foreground hover:bg-accent/20"}`}>{s}</button>
              ))}
            </div>
            {status === "ACTIVE" && <p className="text-[10px] text-amber-400 mt-1">⚠️ Will start spending immediately</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ name, objective, dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined, status })} className="gap-1.5">
            {create.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MetaAdsCampaignsPanel({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bulking, setBulking] = useState(false);

  const { data: summary } = useQuery<any>({
    queryKey: ["/api/meta-cm/summary", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-cm/summary/${clientId}`),
    enabled: !!clientId,
  });

  const { data: campaigns = [], refetch: refetchCampaigns, isLoading } = useQuery<any[]>({
    queryKey: ["/api/meta-cm/campaigns", clientId, statusFilter],
    queryFn: () => apiRequest("GET", `/api/meta-cm/campaigns/${clientId}?status=${statusFilter}&sort=spend&dir=desc`),
    enabled: !!clientId,
  });

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await apiRequest("POST", `/api/meta-cm/sync/${clientId}`);
      toast({ title: `Synced ${r.synced} campaigns` });
      refetchCampaigns();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally { setSyncing(false); }
  }

  async function handleBulkAction(action: "pause" | "activate" | "delete") {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selectedIds.size} campaign(s)?`)) return;
    setBulking(true);
    try {
      const r = await apiRequest("POST", `/api/meta-cm/bulk/${clientId}`, { ids: [...selectedIds], action });
      toast({ title: `Done: ${r.ok} succeeded, ${r.fail} failed` });
      setSelectedIds(new Set());
      refetchCampaigns();
    } catch (e: any) {
      toast({ title: "Bulk action failed", description: e.message, variant: "destructive" });
    } finally { setBulking(false); }
  }

  function toggleAll() {
    setSelectedIds(selectedIds.size === campaigns.length ? new Set() : new Set(campaigns.map((c: any) => c.campaign_id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const allSelected = campaigns.length > 0 && selectedIds.size === campaigns.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      {summary && (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { l: "Campaigns", v: fmtN(summary.total_campaigns) },
            { l: "Active", v: fmtN(summary.active_campaigns), cls: "text-emerald-400" },
            { l: "Paused", v: fmtN(summary.paused_campaigns), cls: "text-yellow-400" },
            { l: "Spend", v: fmt$(summary.total_spend), cls: "text-blue-400" },
            { l: "Impr.", v: `${(parseInt(summary.total_impressions||0)/1000).toFixed(0)}K` },
            { l: "Clicks", v: fmtN(summary.total_clicks) },
            { l: "Avg ROAS", v: fmtROAS(summary.avg_roas), cls: "text-purple-400" },
            { l: "Avg CTR", v: fmtPct(summary.avg_ctr) },
          ].map(({ l, v, cls = "text-foreground" }) => (
            <div key={l} className="bg-card border border-card-border rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">{l}</p>
              <p className={`text-sm font-bold mt-0.5 ${cls}`}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{campaigns.length} campaigns</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5">
              <span className="text-xs font-semibold text-primary">{selectedIds.size} sel.</span>
              <button onClick={() => handleBulkAction("pause")} disabled={bulking} className="text-[10px] text-yellow-400 hover:text-yellow-300 px-1">Pause</button>
              <button onClick={() => handleBulkAction("activate")} disabled={bulking} className="text-[10px] text-emerald-400 hover:text-emerald-300 px-1">Activate</button>
              <button onClick={() => handleBulkAction("delete")} disabled={bulking} className="text-[10px] text-red-400 hover:text-red-300 px-1">Delete</button>
              {bulking && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync
          </Button>
        </div>
      </div>

      {/* Tree table */}
      <div className="border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/20 border-b border-card-border">
              <tr>
                <th className="text-left p-3 text-muted-foreground font-medium min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                      {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : someSelected ? <Minus className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                    Campaign / Ad Set / Ad
                  </div>
                </th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-right p-3 text-muted-foreground font-medium">Spend</th>
                <th className="text-right p-3 text-muted-foreground font-medium">ROAS</th>
                <th className="text-right p-3 text-muted-foreground font-medium">CTR</th>
                <th className="text-right p-3 text-muted-foreground font-medium">Impr.</th>
                <th className="text-right p-3 text-muted-foreground font-medium min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({length:4}).map((_,i) => (
                  <tr key={i} className="border-b border-card-border/40">
                    {Array.from({length:7}).map((_,j) => <td key={j} className="p-3"><div className="h-4 bg-muted/30 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Layers className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No campaigns. Click Sync to pull from Meta.</p>
                  </td>
                </tr>
              ) : campaigns.map((c: any) => (
                <CampaignRow key={c.campaign_id} campaign={c} clientId={clientId}
                  selected={selectedIds.has(c.campaign_id)} onSelect={toggleSelect} onMutate={refetchCampaigns} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCampaignModal open={showCreate} onClose={() => setShowCreate(false)} clientId={clientId} onCreated={refetchCampaigns} />
    </div>
  );
}
