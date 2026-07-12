import { useState, useMemo, useEffect } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  BarChart2, RefreshCw, Layers, ChevronRight, ChevronDown, Plus, Pause, Play,
  Trash2, Edit2, Check, X, TrendingUp, TrendingDown, DollarSign, Eye, MousePointer,
  Target, Zap, AlertTriangle, CheckSquare, Square, Minus, Rocket, Bell,
  FlameKindling, GitCompare, Trophy, FileText, Image, Brain, Link,
  Bot, Sliders, ThumbsUp, ThumbsDown, Power
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt$(n: any) { return `$${parseFloat(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtN(n: any) { return parseInt(n||0).toLocaleString(); }
function fmtPct(n: any) { return `${parseFloat(n||0).toFixed(2)}%`; }
function fmtROAS(n: any) { return `${parseFloat(n||0).toFixed(2)}x`; }

const STATUS_CFG: Record<string,{cls:string;dot:string}> = {
  ACTIVE:{cls:"border-emerald-500/20 text-emerald-400 bg-emerald-500/5",dot:"bg-emerald-400"},
  PAUSED:{cls:"border-yellow-500/20 text-yellow-400 bg-yellow-500/5",dot:"bg-yellow-400"},
  ARCHIVED:{cls:"border-border text-muted-foreground",dot:"bg-muted-foreground"},
};

function StatusBadge({status}:{status:string}) {
  const cfg = STATUS_CFG[status]||STATUS_CFG.ARCHIVED;
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>{status}</span>;
}

function InlineEdit({value, onSave, prefix=""}: any) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  if (!editing) return <button onClick={()=>setEditing(true)} className="group flex items-center gap-1 hover:text-foreground text-xs"><span>{prefix}{value}</span><Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60"/></button>;
  return <div className="flex items-center gap-1"><Input value={val} onChange={e=>setVal(e.target.value)} className="h-6 w-20 text-xs px-1 font-mono" autoFocus onKeyDown={e=>{if(e.key==="Enter"){onSave(val);setEditing(false);}if(e.key==="Escape")setEditing(false);}}/><button onClick={()=>{onSave(val);setEditing(false);}} className="text-emerald-400"><Check className="w-3 h-3"/></button><button onClick={()=>setEditing(false)} className="text-muted-foreground"><X className="w-3 h-3"/></button></div>;
}

// ── Ad row ────────────────────────────────────────────────────────────────────
function AdRow({ad, onMutate}: any) {
  const {toast} = useToast();
  const patch = useMutation({
    mutationFn:(body:any)=>apiRequest("PATCH",`/api/my-ads/ad/${ad.id}`,body),
    onSuccess:()=>{toast({title:"Ad updated"});onMutate();},
    onError:(e:any)=>toast({title:"Failed",description:e.message,variant:"destructive"}),
  });
  const ins = ad.insights||{};
  const spend = parseFloat(ins.spend||0);
  return (
    <tr className="border-b border-card-border/20 hover:bg-muted/5 text-xs">
      <td className="pl-20 pr-3 py-2"><div className="flex items-center gap-1.5"><div className="w-1 h-3 rounded-full bg-muted-foreground/30"/><span className="text-muted-foreground truncate max-w-[160px]">{ad.name}</span></div></td>
      <td className="px-3 py-2"><StatusBadge status={ad.status}/></td>
      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{spend>0?fmt$(spend):"—"}</td>
      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{ins.ctr?fmtPct(ins.ctr):"—"}</td>
      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{ins.impressions?fmtN(ins.impressions):"—"}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 justify-end">
          {ad.status==="ACTIVE"?<button onClick={()=>patch.mutate({status:"PAUSED"})} className="p-1 rounded hover:bg-yellow-500/10 text-yellow-400"><Pause className="w-3 h-3"/></button>:<button onClick={()=>patch.mutate({status:"ACTIVE"})} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400"><Play className="w-3 h-3"/></button>}
        </div>
      </td>
    </tr>
  );
}

// ── Ad Set row ────────────────────────────────────────────────────────────────
function AdSetRow({adset, onMutate}: any) {
  const {toast} = useToast();
  const [expanded, setExpanded] = useState(false);
  const {data:ads=[], refetch:refetchAds, isLoading:adsLoading} = useQuery<any[]>({
    queryKey:["/api/my-ads/ads",adset.id],
    queryFn:()=>apiRequest("GET",`/api/my-ads/ads/${adset.id}`),
    enabled:expanded,
  });
  const patch = useMutation({
    mutationFn:(body:any)=>apiRequest("PATCH",`/api/my-ads/adset/${adset.id}`,body),
    onSuccess:()=>{toast({title:"Ad set updated"});onMutate();},
    onError:(e:any)=>toast({title:"Failed",description:e.message,variant:"destructive"}),
  });
  const ins = adset.insights||{};
  const budget = adset.daily_budget?parseFloat(adset.daily_budget)/100:null;
  return (
    <>
      <tr className="border-b border-card-border/30 hover:bg-muted/5 text-xs bg-muted/5">
        <td className="pl-12 pr-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={()=>setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
              {expanded?<ChevronDown className="w-3.5 h-3.5"/>:<ChevronRight className="w-3.5 h-3.5"/>}
            </button>
            <div className="w-1.5 h-1.5 rounded-sm bg-blue-400/60"/>
            <span className="font-medium text-foreground/80 truncate max-w-[160px]">{adset.name}</span>
            <span className="text-[10px] text-muted-foreground">({adset.optimization_goal?.replace(/_/g," ")})</span>
          </div>
        </td>
        <td className="px-3 py-2"><StatusBadge status={adset.status}/></td>
        <td className="px-3 py-2 text-right font-mono">{parseFloat(ins.spend||0)>0?fmt$(ins.spend):"—"}</td>
        <td className="px-3 py-2 text-right font-mono">{ins.ctr?fmtPct(ins.ctr):"—"}</td>
        <td className="px-3 py-2 text-right font-mono">{ins.impressions?fmtN(ins.impressions):"—"}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1 justify-end">
            {budget!=null&&<InlineEdit value={budget.toFixed(2)} prefix="$" onSave={(v:string)=>patch.mutate({dailyBudget:parseFloat(v)})}/>}
            {adset.status==="ACTIVE"?<button onClick={()=>patch.mutate({status:"PAUSED"})} className="p-1 rounded hover:bg-yellow-500/10 text-yellow-400"><Pause className="w-3 h-3"/></button>:<button onClick={()=>patch.mutate({status:"ACTIVE"})} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400"><Play className="w-3 h-3"/></button>}
          </div>
        </td>
      </tr>
      {expanded&&(adsLoading?<tr><td colSpan={6} className="pl-20 py-2 text-[10px] text-muted-foreground">Loading...</td></tr>:ads.length===0?<tr><td colSpan={6} className="pl-20 py-2 text-[10px] text-muted-foreground italic">No ads</td></tr>:ads.map(ad=><AdRow key={ad.id} ad={ad} onMutate={refetchAds}/>))}
    </>
  );
}

// ── Campaign row ──────────────────────────────────────────────────────────────
function CampaignRow({campaign, selected, onSelect, onMutate}: any) {
  const {toast} = useToast();
  const [expanded, setExpanded] = useState(false);
  const {data:adsets=[], refetch:refetchAdsets, isLoading:adsetsLoading} = useQuery<any[]>({
    queryKey:["/api/my-ads/adsets",campaign.campaign_id],
    queryFn:()=>apiRequest("GET",`/api/my-ads/adsets/${campaign.campaign_id}`),
    enabled:expanded,
  });
  const patch = useMutation({
    mutationFn:(body:any)=>apiRequest("PATCH",`/api/my-ads/campaign/${campaign.campaign_id}`,body),
    onSuccess:()=>{toast({title:"Updated"});onMutate();},
    onError:(e:any)=>toast({title:"Failed",description:e.message,variant:"destructive"}),
  });
  const budget = campaign.daily_budget?parseFloat(campaign.daily_budget)/100:null;
  const roasNum = parseFloat(campaign.roas||0);
  return (
    <>
      <tr className={`border-b border-card-border/50 transition-colors text-xs ${selected?"bg-primary/5":"hover:bg-muted/10"}`}>
        <td className="pl-3 pr-2 py-3">
          <div className="flex items-center gap-2">
            <button onClick={()=>onSelect(campaign.campaign_id)} className="flex-shrink-0">
              {selected?<CheckSquare className="w-3.5 h-3.5 text-primary"/>:<Square className="w-3.5 h-3.5 text-muted-foreground"/>}
            </button>
            <button onClick={()=>setExpanded(!expanded)} className="text-muted-foreground flex-shrink-0">
              {expanded?<ChevronDown className="w-4 h-4"/>:<ChevronRight className="w-4 h-4"/>}
            </button>
            <div className="w-2 h-2 rounded-sm bg-primary/60 flex-shrink-0"/>
            <span className="font-semibold text-foreground truncate max-w-[180px]">{campaign.campaign_name}</span>
            <span className="text-[10px] text-muted-foreground opacity-60 font-mono">{campaign.objective?.replace("OUTCOME_","").replace(/_/g," ")}</span>
          </div>
        </td>
        <td className="px-3 py-3"><StatusBadge status={campaign.status}/></td>
        <td className="px-3 py-3 text-right font-mono font-semibold">{fmt$(campaign.spend)}</td>
        <td className={`px-3 py-3 text-right font-mono font-semibold ${roasNum>=3?"text-emerald-400":roasNum>=1?"text-foreground":roasNum>0?"text-red-400":"text-muted-foreground"}`}>{roasNum>0?fmtROAS(roasNum):"—"}</td>
        <td className="px-3 py-3 text-right font-mono">{fmtPct(campaign.ctr)}</td>
        <td className="px-3 py-3 text-right font-mono">{fmtN(campaign.impressions)}</td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1 justify-end">
            {budget!=null&&<InlineEdit value={budget.toFixed(2)} prefix="$" onSave={(v:string)=>patch.mutate({dailyBudget:parseFloat(v)})}/>}
            {campaign.status==="ACTIVE"?<button onClick={()=>patch.mutate({status:"PAUSED"})} className="p-1.5 rounded hover:bg-yellow-500/10 text-yellow-400"><Pause className="w-3.5 h-3.5"/></button>:<button onClick={()=>patch.mutate({status:"ACTIVE"})} className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400"><Play className="w-3.5 h-3.5"/></button>}
          </div>
        </td>
      </tr>
      {expanded&&(adsetsLoading?<tr><td colSpan={7} className="pl-12 py-2 text-[10px] text-muted-foreground">Loading...</td></tr>:adsets.length===0?<tr><td colSpan={7} className="pl-12 py-2 text-[10px] text-muted-foreground italic">No ad sets found</td></tr>:adsets.map(as=><AdSetRow key={as.id} adset={as} onMutate={refetchAdsets}/>))}
    </>
  );
}

// ── Connect screen ────────────────────────────────────────────────────────────
function ConnectScreen({onConnected}: {onConnected:()=>void}) {
  const {toast} = useToast();
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const connect = useMutation({
    mutationFn:()=>apiRequest("POST","/api/my-ads/connect",{accessToken:token,adAccountId:accountId}),
    onSuccess:()=>{toast({title:"Connected!"});onConnected();},
    onError:(e:any)=>toast({title:"Failed",description:e.message,variant:"destructive"}),
  });
  return (
    <div className="max-w-md mx-auto space-y-5 py-8">
      <div className="text-center">
        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart2 className="w-7 h-7 text-blue-400"/>
        </div>
        <h2 className="text-xl font-bold text-foreground">Connect Meta Ads</h2>
        <p className="text-sm text-muted-foreground mt-2">Link your Meta Ads account to track campaigns, spend, ROAS, and manage ads directly here.</p>
      </div>
      <Card className="border border-card-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <Label className="text-xs">Meta Access Token</Label>
            <Input value={token} onChange={e=>setToken(e.target.value)} type="password" placeholder="EAAxxxxxxx..." className="mt-1 h-9 text-xs font-mono"/>
            <p className="text-[10px] text-muted-foreground mt-1">Get from Meta Business Manager → System Users → Generate Token with <code>ads_read</code> scope</p>
          </div>
          <div>
            <Label className="text-xs">Ad Account ID</Label>
            <Input value={accountId} onChange={e=>setAccountId(e.target.value)} placeholder="act_123456789" className="mt-1 h-9 text-xs font-mono"/>
            <p className="text-[10px] text-muted-foreground mt-1">Found in Ads Manager URL or Business Settings → Ad Accounts</p>
          </div>
          <Button className="w-full gap-2" disabled={!token.trim()||!accountId.trim()||connect.isPending} onClick={()=>connect.mutate()}>
            {connect.isPending?<><RefreshCw className="w-4 h-4 animate-spin"/>Connecting...</>:<><Link className="w-4 h-4"/>Connect Account</>}
          </Button>
        </CardContent>
      </Card>
      <div className="text-[10px] text-muted-foreground space-y-1 p-3 rounded-lg border border-border bg-muted/5">
        <p className="font-semibold text-foreground">Setup steps:</p>
        <p>1. Go to business.facebook.com → Settings → System Users</p>
        <p>2. Create or select a system user → Add Assets → Ad Account</p>
        <p>3. Generate Token with <code>ads_read</code>, <code>ads_management</code> scopes</p>
        <p>4. Copy token + Ad Account ID here</p>
      </div>
    </div>
  );
}

// ── Bulk Launch tab ───────────────────────────────────────────────────────────
function BulkLaunchTab() {
  const {toast} = useToast();
  const [pageId, setPageId] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [callToAction, setCallToAction] = useState("LEARN_MORE");
  const [headlinesRaw, setHeadlinesRaw] = useState("");
  const [bodiesRaw, setBodiesRaw] = useState("");
  const [imageUrlsRaw, setImageUrlsRaw] = useState("");
  const [selectedCombos, setSelectedCombos] = useState<Set<string>>(new Set());
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<Set<string>>(new Set());
  const [adStatus, setAdStatus] = useState<"PAUSED"|"ACTIVE">("PAUSED");
  const [activeJobId, setActiveJobId] = useState<number|null>(null);

  const headlines = headlinesRaw.split("\n").map(s=>s.trim()).filter(Boolean);
  const bodies = bodiesRaw.split("\n").map(s=>s.trim()).filter(Boolean);
  const imageUrls = imageUrlsRaw.split("\n").map(s=>s.trim()).filter(Boolean);
  const allCombos = useMemo(()=>{const c:[number,number,number][]=[];headlines.forEach((_,hi)=>bodies.forEach((_,bi)=>imageUrls.forEach((_,ii)=>c.push([hi,bi,ii]))));return c;},[headlines.length,bodies.length,imageUrls.length]);
  const ck=(hi:number,bi:number,ii:number)=>`${hi}-${bi}-${ii}`;
  const totalAds = selectedCombos.size * selectedAdSetIds.size;

  const {data:adSets=[]} = useQuery<any[]>({queryKey:["/api/my-ads/adsets-for-select"],queryFn:()=>apiRequest("GET","/api/my-ads/adsets-for-select")});
  const {data:jobs=[], refetch:refetchJobs} = useQuery<any[]>({queryKey:["/api/my-ads/bulk-jobs"],queryFn:()=>apiRequest("GET","/api/my-ads/bulk-jobs"),refetchInterval:activeJobId?3000:false});
  const {data:activeJob} = useQuery<any>({queryKey:["/api/my-ads/bulk-jobs",activeJobId],queryFn:()=>apiRequest("GET",`/api/my-ads/bulk-jobs/${activeJobId}`),enabled:!!activeJobId,refetchInterval:3000});
  const launch = useMutation({
    mutationFn:(config:any)=>apiRequest("POST","/api/my-ads/bulk-launch",config),
    onSuccess:(data)=>{setActiveJobId(data.jobId);refetchJobs();toast({title:`Queued: creating ${data.totalAds} ads`});},
    onError:(e:any)=>toast({title:"Failed",description:e.message,variant:"destructive"}),
  });

  function handleLaunch() {
    if(!pageId.trim()){toast({title:"Page ID required",variant:"destructive"});return;}
    if(!destinationUrl.trim()){toast({title:"URL required",variant:"destructive"});return;}
    if(selectedCombos.size===0){toast({title:"Select combinations",variant:"destructive"});return;}
    if(selectedAdSetIds.size===0){toast({title:"Select ad sets",variant:"destructive"});return;}
    const combos=allCombos.filter(([h,b,i])=>selectedCombos.has(ck(h,b,i)));
    launch.mutate({pageId:pageId.trim(),destinationUrl:destinationUrl.trim(),callToAction,headlines,bodies,imageUrls,selectedCombinations:combos,adSetIds:[...selectedAdSetIds],adStatus});
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        <div className="border border-card-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold">Creative Config</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Facebook Page ID</Label><Input value={pageId} onChange={e=>setPageId(e.target.value)} placeholder="123456789" className="mt-1 h-8 text-xs font-mono"/></div>
            <div><Label className="text-xs">CTA</Label>
              <Select value={callToAction} onValueChange={setCallToAction}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue/></SelectTrigger>
                <SelectContent>{["LEARN_MORE","SHOP_NOW","SIGN_UP","BOOK_TRAVEL","CONTACT_US","APPLY_NOW","DOWNLOAD","GET_OFFER"].map(c=><SelectItem key={c} value={c}>{c.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs">Destination URL</Label><Input value={destinationUrl} onChange={e=>setDestinationUrl(e.target.value)} placeholder="https://yoursite.com/lp" className="mt-1 h-8 text-xs"/></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs flex items-center gap-1"><FileText className="w-3 h-3"/>Headlines ({headlines.length})</Label><Textarea value={headlinesRaw} onChange={e=>setHeadlinesRaw(e.target.value)} placeholder={"H1\nH2\nH3"} className="mt-1 text-xs h-24 resize-none font-mono"/></div>
            <div><Label className="text-xs flex items-center gap-1"><FileText className="w-3 h-3"/>Body ({bodies.length})</Label><Textarea value={bodiesRaw} onChange={e=>setBodiesRaw(e.target.value)} placeholder={"Body 1\nBody 2"} className="mt-1 text-xs h-24 resize-none font-mono"/></div>
            <div><Label className="text-xs flex items-center gap-1"><Image className="w-3 h-3"/>Images ({imageUrls.length})</Label><Textarea value={imageUrlsRaw} onChange={e=>setImageUrlsRaw(e.target.value)} placeholder={"https://img1.jpg"} className="mt-1 text-xs h-24 resize-none font-mono"/></div>
          </div>
          {allCombos.length>0&&<div className="rounded-lg bg-primary/5 border border-primary/20 p-2 text-xs flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-primary"/><span className="font-semibold">{allCombos.length} combinations</span><span className="text-muted-foreground">= {headlines.length}H × {bodies.length}B × {imageUrls.length}I</span></div>}
        </div>

        {allCombos.length>0&&(
          <div className="border border-card-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Combos ({selectedCombos.size}/{allCombos.length})</p>
              <div className="flex gap-2">
                <button onClick={()=>setSelectedCombos(new Set(allCombos.map(([h,b,i])=>ck(h,b,i))))} className="text-[10px] text-primary hover:underline">All</button>
                <button onClick={()=>setSelectedCombos(new Set())} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {allCombos.map(([hi,bi,ii])=>{const key=ck(hi,bi,ii);const checked=selectedCombos.has(key);return(<div key={key} onClick={()=>{setSelectedCombos(prev=>{const n=new Set(prev);n.has(key)?n.delete(key):n.add(key);return n;});}} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${checked?"border-primary/30 bg-primary/5":"border-border hover:bg-accent/20"}`}><div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${checked?"border-primary bg-primary":"border-border"}`}>{checked&&<Check className="w-2 h-2 text-white"/>}</div><span className="truncate flex-1 font-medium">{headlines[hi]}</span><span className="truncate flex-1 text-muted-foreground">{bodies[bi]}</span><span className="text-blue-400 font-mono text-[9px] flex-shrink-0">img_{ii+1}</span></div>);})}
            </div>
          </div>
        )}

        <div className="border border-card-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Ad Sets ({selectedAdSetIds.size})</p>
            <button onClick={()=>setSelectedAdSetIds(new Set((adSets as any[]).map((a:any)=>a.id)))} className="text-[10px] text-primary hover:underline">Select all</button>
          </div>
          {(adSets as any[]).length===0?<p className="text-xs text-muted-foreground text-center py-2">No ad sets. Create campaigns first.</p>:(
            <div className="max-h-36 overflow-y-auto space-y-1">
              {(adSets as any[]).map((as:any)=>{const checked=selectedAdSetIds.has(as.id);return(<div key={as.id} onClick={()=>{setSelectedAdSetIds(prev=>{const n=new Set(prev);n.has(as.id)?n.delete(as.id):n.add(as.id);return n;});}} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${checked?"border-primary/30 bg-primary/5":"border-border hover:bg-accent/20"}`}><div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${checked?"border-primary bg-primary":"border-border"}`}>{checked&&<Check className="w-2 h-2 text-white"/>}</div><span className="font-medium truncate flex-1">{as.name}</span><Badge variant="outline" className={`text-[9px] border flex-shrink-0 ${as.status==="ACTIVE"?"border-emerald-500/20 text-emerald-400":"border-border text-muted-foreground"}`}>{as.status}</Badge></div>);})}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className={`border rounded-xl p-4 space-y-3 ${totalAds>0?"border-blue-500/30 bg-blue-500/5":"border-card-border"}`}>
          <p className="text-xs font-semibold">Launch Summary</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Combos</span><span className="font-semibold">{selectedCombos.size}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ad Sets</span><span className="font-semibold">{selectedAdSetIds.size}</span></div>
            <div className="flex justify-between border-t border-border pt-1.5"><span className="text-muted-foreground font-semibold">Total Ads</span><span className="font-bold text-lg">{totalAds.toLocaleString()}</span></div>
          </div>
          <div className="flex gap-2">
            {(["PAUSED","ACTIVE"] as const).map(s=><button key={s} onClick={()=>setAdStatus(s)} className={`flex-1 h-7 rounded-lg text-[10px] font-semibold border transition-colors ${adStatus===s?(s==="ACTIVE"?"bg-emerald-600 border-emerald-600 text-white":"bg-yellow-500/20 border-yellow-500/30 text-yellow-400"):"border-border text-muted-foreground"}`}>{s}</button>)}
          </div>
          {adStatus==="ACTIVE"&&<p className="text-[10px] text-amber-400">⚠️ Starts spending immediately</p>}
          <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" disabled={totalAds===0||launch.isPending} onClick={handleLaunch}>
            {launch.isPending?<><RefreshCw className="w-3.5 h-3.5 animate-spin"/>Queuing...</>:<><Rocket className="w-3.5 h-3.5"/>Launch {totalAds>0?totalAds.toLocaleString():""} Ads</>}
          </Button>
        </div>

        {activeJob&&(activeJob.status==="running"||activeJob.status==="pending")&&(
          <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-3">
            <p className="text-[10px] text-blue-400 flex items-center gap-1.5 mb-2"><RefreshCw className="w-3 h-3 animate-spin"/>In Progress</p>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{width:`${activeJob.total_count>0?Math.round(((activeJob.completed_count+activeJob.failed_count)/activeJob.total_count)*100):0}%`}}/></div>
            <p className="text-[10px] text-muted-foreground mt-1">{activeJob.completed_count}/{activeJob.total_count} ads created</p>
          </div>
        )}

        {(jobs as any[]).length>0&&(
          <div className="border border-card-border rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold">Recent Jobs</p>
            {(jobs as any[]).slice(0,5).map((j:any)=>(
              <div key={j.id} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground font-mono">{j.job_type}</span>
                  <Badge variant="outline" className={`text-[9px] border ${j.status==="completed"?"border-emerald-500/20 text-emerald-400":j.status==="running"?"border-blue-500/20 text-blue-400":"border-border text-muted-foreground"}`}>{j.status}</Badge>
                </div>
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden"><div className={`h-full ${j.status==="completed"?"bg-emerald-500":j.status==="running"?"bg-blue-500":"bg-muted-foreground"}`} style={{width:`${j.total_count>0?Math.round(((j.completed_count+j.failed_count)/j.total_count)*100):0}%`}}/></div>
                <p className="text-[9px] text-muted-foreground">{j.completed_count}/{j.total_count} · {format(new Date(j.created_at),"MMM d, h:mm a")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Advisor tab ────────────────────────────────────────────────────────────
const ACTION_COLORS: Record<string,string> = {
  pause: "border-red-500/20 text-red-400 bg-red-500/5",
  scale_budget: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
  activate: "border-blue-500/20 text-blue-400 bg-blue-500/5",
  alert: "border-yellow-500/20 text-yellow-400 bg-yellow-500/5",
};
const ACTION_LABELS: Record<string,string> = {
  pause: "Pause",
  scale_budget: "Scale Budget",
  activate: "Activate",
  alert: "Alert",
};

function AIAdvisorTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    enabled: false,
    pause_if_roas_below: "1.50",
    pause_if_roas_days: 3,
    scale_if_roas_above: "4.00",
    scale_if_roas_days: 3,
    max_budget_increase_pct: "20",
    daily_spend_cap: "500.00",
  });
  const [showHistory, setShowHistory] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [runningRules, setRunningRules] = useState(false);

  const { data: rulesData, refetch: refetchRules } = useQuery<any>({
    queryKey: ["/api/my-ads/ai-rules"],
    queryFn: () => apiRequest("GET", "/api/my-ads/ai-rules"),
  });

  const { data: recs = [], refetch: refetchRecs } = useQuery<any[]>({
    queryKey: ["/api/my-ads/ai-recommendations"],
    queryFn: () => apiRequest("GET", "/api/my-ads/ai-recommendations"),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!rulesData) return;
    setForm({
      enabled: rulesData.enabled ?? false,
      pause_if_roas_below: String(rulesData.pause_if_roas_below ?? "1.50"),
      pause_if_roas_days: rulesData.pause_if_roas_days ?? 3,
      scale_if_roas_above: String(rulesData.scale_if_roas_above ?? "4.00"),
      scale_if_roas_days: rulesData.scale_if_roas_days ?? 3,
      max_budget_increase_pct: String(rulesData.max_budget_increase_pct ?? 20),
      daily_spend_cap: String(rulesData.daily_spend_cap ?? "500.00"),
    });
  }, [rulesData]);

  const saveRules = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/my-ads/ai-rules", form),
    onSuccess: () => { toast({ title: "Rules saved" }); refetchRules(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const approve = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/my-ads/ai-recommendations/${id}/approve`),
    onSuccess: () => { toast({ title: "Action executed on Meta" }); refetchRecs(); },
    onError: (e: any) => toast({ title: "Execution failed", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/my-ads/ai-recommendations/${id}/reject`),
    onSuccess: () => refetchRecs(),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const r = await apiRequest("POST", "/api/my-ads/ai-analyze");
      toast({ title: `${r.count} recommendations generated` });
      refetchRecs();
    } catch (e: any) { toast({ title: "Analysis failed", description: e.message, variant: "destructive" }); }
    finally { setAnalyzing(false); }
  }

  async function handleRunRules() {
    setRunningRules(true);
    try {
      const r = await apiRequest("POST", "/api/my-ads/autopilot-run");
      toast({ title: `Rules checked — ${r.count} new recommendations` });
      refetchRecs();
      refetchRules();
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setRunningRules(false); }
  }

  const pending = (recs as any[]).filter(r => r.status === "pending");
  const history = (recs as any[]).filter(r => r.status !== "pending");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-4 h-4 text-violet-400"/>AI Campaign Advisor
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">LLM analysis + rule engine. Approve recommendations to execute on Meta.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleAnalyze} disabled={analyzing}>
            <Brain className={`w-3.5 h-3.5 ${analyzing ? "animate-pulse" : ""}`}/>
            {analyzing ? "Analyzing..." : "Analyze with AI"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-violet-500/30 text-violet-400 hover:border-violet-500/50" onClick={handleRunRules} disabled={runningRules}>
            <Sliders className="w-3.5 h-3.5"/>
            {runningRules ? "Running..." : "Run Rules"}
          </Button>
        </div>
      </div>

      {/* Autopilot Rules */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Power className="w-3.5 h-3.5 text-violet-400"/>
          <span className="text-xs font-semibold text-foreground">Autopilot Rules</span>
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${form.enabled ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" : "border-border text-muted-foreground"}`}>
            {form.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))}/>
          <Label className="text-xs text-muted-foreground">Auto-generate rule-based recommendations when you click Run Rules</Label>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-[10px] text-muted-foreground">Pause if ROAS below</Label>
            <Input value={form.pause_if_roas_below} onChange={e => setForm(f => ({ ...f, pause_if_roas_below: e.target.value }))} className="h-8 text-xs mt-1 font-mono" placeholder="1.5"/>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Scale if ROAS above</Label>
            <Input value={form.scale_if_roas_above} onChange={e => setForm(f => ({ ...f, scale_if_roas_above: e.target.value }))} className="h-8 text-xs mt-1 font-mono" placeholder="4.0"/>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Max budget increase %</Label>
            <Input value={form.max_budget_increase_pct} onChange={e => setForm(f => ({ ...f, max_budget_increase_pct: e.target.value }))} className="h-8 text-xs mt-1 font-mono" placeholder="20"/>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Daily spend cap ($)</Label>
            <Input value={form.daily_spend_cap} onChange={e => setForm(f => ({ ...f, daily_spend_cap: e.target.value }))} className="h-8 text-xs mt-1 font-mono" placeholder="500"/>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" className="h-8 text-xs" onClick={() => saveRules.mutate()} disabled={saveRules.isPending}>
            {saveRules.isPending ? "Saving..." : "Save Rules"}
          </Button>
          {rulesData?.last_run_at && (
            <span className="text-[10px] text-muted-foreground">Last run: {format(new Date(rulesData.last_run_at), "MMM d, h:mm a")}</span>
          )}
        </div>
      </div>

      {/* Pending recommendations */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
          Pending Actions
          {pending.length > 0 && (
            <span className="bg-violet-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
          )}
        </p>
        {pending.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl">
            <Bot className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2"/>
            <p className="text-xs text-muted-foreground">No pending recommendations.</p>
            <p className="text-[10px] text-muted-foreground mt-1">Click "Analyze with AI" for LLM insights or "Run Rules" to check against your thresholds.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((rec: any) => (
              <div key={rec.id} className={`rounded-xl border p-4 ${ACTION_COLORS[rec.action_type] || "border-border bg-card"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ACTION_COLORS[rec.action_type] || "border-border text-muted-foreground"}`}>
                        {ACTION_LABELS[rec.action_type] || rec.action_type}
                      </span>
                      <Badge variant="outline" className={`text-[9px] ${rec.source === "llm" ? "border-purple-500/20 text-purple-400" : "border-blue-500/20 text-blue-400"}`}>
                        {rec.source === "llm" ? "AI" : "Rule"}
                      </Badge>
                      {rec.suggested_value && (
                        <span className="text-[10px] text-emerald-400 font-mono font-semibold">→ ${rec.suggested_value}/day</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{rec.campaign_name || "Account-level"}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{rec.reason}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2.5 text-[10px] gap-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                      onClick={() => approve.mutate(rec.id)} disabled={approve.isPending}>
                      <ThumbsUp className="w-3 h-3"/>Approve
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2.5 text-[10px] gap-1 text-muted-foreground hover:text-red-400"
                      onClick={() => reject.mutate(rec.id)} disabled={reject.isPending}>
                      <ThumbsDown className="w-3 h-3"/>Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <button className="text-xs text-muted-foreground flex items-center gap-1 mb-2 hover:text-foreground transition-colors" onClick={() => setShowHistory(v => !v)}>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showHistory ? "rotate-90" : ""}`}/>
            History ({history.length})
          </button>
          {showHistory && (
            <div className="space-y-2">
              {history.map((rec: any) => (
                <div key={rec.id} className="rounded-lg border border-border/40 bg-card/30 p-3 flex items-center gap-3">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                    rec.status === "executed" ? "border-emerald-500/20 text-emerald-400" :
                    rec.status === "rejected" ? "border-red-500/20 text-red-400" :
                    "border-border text-muted-foreground"
                  }`}>{rec.status.toUpperCase()}</span>
                  <p className="text-[10px] text-muted-foreground truncate flex-1">
                    <span className="font-medium text-foreground/60">{rec.campaign_name}</span> — {rec.reason.slice(0, 90)}{rec.reason.length > 90 ? "…" : ""}
                  </p>
                  <span className="text-[9px] text-muted-foreground shrink-0">{format(new Date(rec.created_at), "MMM d")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MetaAdsTracking() {
  const {user} = useAuth();
  const {toast} = useToast();
  const plan = (user as any)?.plan;
  const [syncing, setSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("ALL");

  const {data:status, isLoading:statusLoading, refetch:refetchStatus} = useQuery<any>({
    queryKey:["/api/my-ads/status"],
    queryFn:()=>apiRequest("GET","/api/my-ads/status"),
  });

  const {data:summary} = useQuery<any>({
    queryKey:["/api/my-ads/summary"],
    queryFn:()=>apiRequest("GET","/api/my-ads/summary"),
    enabled:status?.connected,
  });

  const {data:campaigns=[], refetch:refetchCampaigns, isLoading:campaignsLoading} = useQuery<any[]>({
    queryKey:["/api/my-ads/campaigns",statusFilter],
    queryFn:()=>apiRequest("GET",`/api/my-ads/campaigns?status=${statusFilter}`),
    enabled:status?.connected,
  });

  const {data:agentLogs=[]} = useQuery<any[]>({
    queryKey:["/api/my-ads/agent-logs"],
    queryFn:()=>apiRequest("GET","/api/my-ads/agent-logs"),
    enabled:status?.connected,
    refetchInterval:60_000,
  });
  const {data:unreadData, refetch:refetchUnread} = useQuery<{count:number}>({
    queryKey:["/api/my-ads/agent-logs/unread-count"],
    queryFn:()=>apiRequest("GET","/api/my-ads/agent-logs/unread-count"),
    enabled:status?.connected,
  });
  const unreadCount = unreadData?.count||0;

  const disconnect = useMutation({
    mutationFn:()=>apiRequest("DELETE","/api/my-ads/connect"),
    onSuccess:()=>{toast({title:"Disconnected"});refetchStatus();},
  });

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await apiRequest("POST","/api/my-ads/sync-campaigns");
      toast({title:`Synced ${r.synced} campaigns`});
      refetchCampaigns();
    } catch(e:any){toast({title:"Sync failed",description:e.message,variant:"destructive"});}
    finally{setSyncing(false);}
  }

  function toggleAll() {
    setSelectedIds(selectedIds.size===campaigns.length?new Set():new Set(campaigns.map((c:any)=>c.campaign_id)));
  }
  function toggleSelect(id:string) {
    setSelectedIds(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  }

  const allSelected = campaigns.length>0&&selectedIds.size===campaigns.length;

  // Access guard
  if(!["pro","elite"].includes(plan)) {
    return (
      <ClientLayout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><BarChart2 className="w-7 h-7 text-yellow-400"/></div>
            <h2 className="text-xl font-bold text-foreground">Tier 4+ Feature</h2>
            <p className="text-sm text-muted-foreground mt-2">Meta Ads tracking is available on <strong>Pro (Tier 4)</strong> and <strong>Elite (Tier 5)</strong> plans.</p>
            <Button className="mt-4" onClick={()=>window.location.href="/select-plan"}>Upgrade Plan</Button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart2 className="w-6 h-6 text-blue-400"/>Meta Ads</h1>
            <p className="text-muted-foreground text-sm mt-1">Campaigns, analytics, bulk launch — all in one place</p>
          </div>
          {status?.connected&&(
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>Connected · {status.adAccountId}</Badge>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="h-8 text-xs gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing?"animate-spin":""}`}/>{syncing?"Syncing...":"Sync"}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={()=>disconnect.mutate()}>Disconnect</Button>
            </div>
          )}
        </div>

        {statusLoading ? (
          <div className="h-32 rounded-xl bg-muted/30 animate-pulse"/>
        ) : !status?.connected ? (
          <ConnectScreen onConnected={refetchStatus}/>
        ) : (
          <>
            {/* Summary */}
            {summary&&(
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {[
                  {l:"Campaigns",v:fmtN(summary.total_campaigns)},
                  {l:"Active",v:fmtN(summary.active_campaigns),cls:"text-emerald-400"},
                  {l:"Paused",v:fmtN(summary.paused_campaigns),cls:"text-yellow-400"},
                  {l:"Spend (30d)",v:fmt$(summary.total_spend),cls:"text-blue-400"},
                  {l:"Impressions",v:`${(parseInt(summary.total_impressions||0)/1000).toFixed(0)}K`},
                  {l:"Clicks",v:fmtN(summary.total_clicks)},
                  {l:"Avg ROAS",v:fmtROAS(summary.avg_roas),cls:"text-purple-400"},
                  {l:"Avg CTR",v:fmtPct(summary.avg_ctr)},
                ].map(({l,v,cls="text-foreground"})=>(
                  <div key={l} className="bg-card border border-card-border rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">{l}</p>
                    <p className={`text-sm font-bold mt-0.5 ${cls}`}>{v}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="campaigns">
              <TabsList className="bg-card border border-card-border flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="campaigns" className="text-xs gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <Layers className="w-3.5 h-3.5"/>Campaigns
                </TabsTrigger>
                <TabsTrigger value="bulk" className="text-xs gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Rocket className="w-3.5 h-3.5"/>Bulk Launch
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs gap-1.5 data-[state=active]:bg-orange-600 data-[state=active]:text-white relative">
                  <Bell className="w-3.5 h-3.5"/>AI Alerts
                  {unreadCount>0&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{unreadCount>9?"9+":unreadCount}</span>}
                </TabsTrigger>
                <TabsTrigger value="ai-advisor" className="text-xs gap-1.5 data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                  <Bot className="w-3.5 h-3.5"/>AI Advisor
                </TabsTrigger>
              </TabsList>

              {/* Campaigns tab */}
              <TabsContent value="campaigns" className="mt-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="ALL">All</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="PAUSED">Paused</SelectItem></SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">{campaigns.length} campaigns</span>
                  </div>
                </div>

                <div className="border border-card-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/20 border-b border-card-border">
                        <tr>
                          <th className="text-left p-3 text-muted-foreground font-medium min-w-[240px]">
                            <div className="flex items-center gap-2">
                              <button onClick={toggleAll} className="text-muted-foreground">
                                {allSelected?<CheckSquare className="w-3.5 h-3.5 text-primary"/>:selectedIds.size>0?<Minus className="w-3.5 h-3.5 text-primary"/>:<Square className="w-3.5 h-3.5"/>}
                              </button>
                              Campaign / Ad Set / Ad
                            </div>
                          </th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">Spend</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">ROAS</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">CTR</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">Impr.</th>
                          <th className="text-right p-3 text-muted-foreground font-medium min-w-[120px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignsLoading?Array.from({length:4}).map((_,i)=>(<tr key={i} className="border-b border-card-border/40">{Array.from({length:7}).map((_,j)=><td key={j} className="p-3"><div className="h-4 bg-muted/30 rounded animate-pulse"/></td>)}</tr>)):campaigns.length===0?(
                          <tr><td colSpan={7} className="py-12 text-center"><Layers className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2"/><p className="text-xs text-muted-foreground">No campaigns. Click Sync to pull from Meta.</p></td></tr>
                        ):campaigns.map((c:any)=><CampaignRow key={c.campaign_id} campaign={c} selected={selectedIds.has(c.campaign_id)} onSelect={toggleSelect} onMutate={refetchCampaigns}/>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Bulk Launch tab */}
              <TabsContent value="bulk" className="mt-4">
                <BulkLaunchTab/>
              </TabsContent>

              {/* AI Alerts tab */}
              <TabsContent value="alerts" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">AI Performance Alerts</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Daily account updates and creative performance analysis from your AI agent.</p>
                  </div>
                  {unreadCount>0&&(
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={()=>apiRequest("PATCH","/api/my-ads/agent-logs/read-all").then(refetchUnread)}>
                      Mark all read
                    </Button>
                  )}
                </div>
                {(agentLogs as any[]).length===0?(
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <Bell className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2"/>
                    <p className="text-xs text-muted-foreground">No alerts yet. Your AI agent runs daily at 8am and Mon/Thu for creative analysis.</p>
                  </div>
                ):(
                  <div className="space-y-3">
                    {(agentLogs as any[]).map((log:any)=>(
                      <div key={log.id} className={`rounded-xl border p-4 space-y-2 ${!log.is_read?"border-primary/20 bg-primary/5":"border-card-border"}`}>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={`text-[10px] border ${log.log_type==="24h_update"?"border-yellow-500/20 text-yellow-400":"border-purple-500/20 text-purple-400"}`}>
                            {log.log_type==="24h_update"?"24h Update":"Creative Alert"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at),"MMM d, h:mm a")}</span>
                        </div>
                        <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{log.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* AI Advisor tab */}
              <TabsContent value="ai-advisor" className="mt-4">
                <AIAdvisorTab/>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
