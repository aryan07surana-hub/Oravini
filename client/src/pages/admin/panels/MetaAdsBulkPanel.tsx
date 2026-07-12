/**
 * Bulk Launcher panel — embedded in Tracking page Meta Ads section.
 * Creative matrix → Meta Batch API → thousands of ads, no page navigation.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RefreshCw, Rocket, Layers, FileText, Image, Check } from "lucide-react";

const CTA_OPTIONS = ["LEARN_MORE","SHOP_NOW","SIGN_UP","BOOK_TRAVEL","CONTACT_US","APPLY_NOW","DOWNLOAD","GET_OFFER","WATCH_MORE","MESSAGE_PAGE"];

function JobBar({ job }: { job: any }) {
  const progress = job.total_count > 0 ? Math.round(((job.completed_count + job.failed_count) / job.total_count) * 100) : 0;
  const color = job.status === "completed" ? "bg-emerald-500" : job.status === "failed" ? "bg-red-500" : job.status === "running" ? "bg-blue-500" : "bg-muted-foreground";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground font-mono">{job.job_type.replace("_"," ")}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{job.completed_count}/{job.total_count}</span>
          {job.failed_count > 0 && <span className="text-red-400">{job.failed_count} fail</span>}
          <Badge variant="outline" className={`text-[9px] border h-4 ${job.status === "completed" ? "border-emerald-500/20 text-emerald-400" : job.status === "running" ? "border-blue-500/20 text-blue-400" : "border-border text-muted-foreground"}`}>{job.status}</Badge>
        </div>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[9px] text-muted-foreground">{format(new Date(job.created_at), "MMM d, h:mm a")}</p>
    </div>
  );
}

export default function MetaAdsBulkPanel({ clientId }: { clientId: string }) {
  const { toast } = useToast();
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

  const headlines = headlinesRaw.split("\n").map(s => s.trim()).filter(Boolean);
  const bodies = bodiesRaw.split("\n").map(s => s.trim()).filter(Boolean);
  const imageUrls = imageUrlsRaw.split("\n").map(s => s.trim()).filter(Boolean);

  const allCombinations = useMemo(() => {
    const c: [number,number,number][] = [];
    headlines.forEach((_,hi) => bodies.forEach((_,bi) => imageUrls.forEach((_,ii) => c.push([hi,bi,ii]))));
    return c;
  }, [headlines.length, bodies.length, imageUrls.length]);

  const ck = (hi: number, bi: number, ii: number) => `${hi}-${bi}-${ii}`;
  const totalAds = selectedCombos.size * selectedAdSetIds.size;

  const { data: adSets = [], isLoading: adSetsLoading } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/adsets", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/adsets/${clientId}`),
    enabled: !!clientId,
  });

  const { data: jobs = [], refetch: refetchJobs } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/bulk-jobs", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/bulk-jobs/${clientId}`),
    enabled: !!clientId,
    refetchInterval: activeJobId ? 3000 : false,
  });

  const { data: activeJob } = useQuery<any>({
    queryKey: ["/api/meta-ads/bulk-jobs/active", clientId, activeJobId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/bulk-jobs/${clientId}/${activeJobId}`),
    enabled: !!activeJobId,
    refetchInterval: 3000,
  });

  const launchMutation = useMutation({
    mutationFn: (config: any) => apiRequest("POST", `/api/meta-ads/bulk-launch/${clientId}`, config),
    onSuccess: (data) => { setActiveJobId(data.jobId); refetchJobs(); toast({ title: `Job started — creating ${data.totalAds} ads` }); },
    onError: (e: any) => toast({ title: "Launch failed", description: e.message, variant: "destructive" }),
  });

  function handleLaunch() {
    if (!pageId.trim()) { toast({ title: "Facebook Page ID required", variant: "destructive" }); return; }
    if (!destinationUrl.trim()) { toast({ title: "Destination URL required", variant: "destructive" }); return; }
    if (selectedCombos.size === 0) { toast({ title: "Select combinations", variant: "destructive" }); return; }
    if (selectedAdSetIds.size === 0) { toast({ title: "Select ad sets", variant: "destructive" }); return; }
    const combos = allCombinations.filter(([h,b,i]) => selectedCombos.has(ck(h,b,i)));
    launchMutation.mutate({ pageId: pageId.trim(), destinationUrl: destinationUrl.trim(), callToAction, headlines, bodies, imageUrls, selectedCombinations: combos, adSetIds: [...selectedAdSetIds], adStatus });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Config */}
        <div className="lg:col-span-2 space-y-4">
          {/* Step 1: Config */}
          <div className="border border-card-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] flex items-center justify-center font-bold">1</span> Creative Config</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Facebook Page ID</Label>
                <Input value={pageId} onChange={e => setPageId(e.target.value)} placeholder="123456789" className="mt-1 h-8 text-xs font-mono" />
              </div>
              <div>
                <Label className="text-xs">CTA</Label>
                <Select value={callToAction} onValueChange={setCallToAction}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CTA_OPTIONS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Destination URL</Label>
              <Input value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} placeholder="https://yoursite.com/lp" className="mt-1 h-8 text-xs" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs flex items-center gap-1"><FileText className="w-3 h-3" /> Headlines ({headlines.length})</Label>
                <Textarea value={headlinesRaw} onChange={e => setHeadlinesRaw(e.target.value)} placeholder={"H1\nH2\nH3"} className="mt-1 text-xs h-28 resize-none font-mono" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><FileText className="w-3 h-3" /> Body ({bodies.length})</Label>
                <Textarea value={bodiesRaw} onChange={e => setBodiesRaw(e.target.value)} placeholder={"Body 1\nBody 2"} className="mt-1 text-xs h-28 resize-none font-mono" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Image className="w-3 h-3" /> Images ({imageUrls.length})</Label>
                <Textarea value={imageUrlsRaw} onChange={e => setImageUrlsRaw(e.target.value)} placeholder={"https://img1.jpg\nhttps://img2.jpg"} className="mt-1 text-xs h-28 resize-none font-mono" />
              </div>
            </div>
            {allCombinations.length > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-xs flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="font-semibold">{allCombinations.length} combinations</span>
                <span className="text-muted-foreground">= {headlines.length}H × {bodies.length}B × {imageUrls.length}I</span>
              </div>
            )}
          </div>

          {/* Step 2: Combinations */}
          {allCombinations.length > 0 && (
            <div className="border border-card-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] flex items-center justify-center font-bold">2</span> Select Combos ({selectedCombos.size}/{allCombinations.length})</p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedCombos(new Set(allCombinations.map(([h,b,i]) => ck(h,b,i))))} className="text-[10px] text-primary hover:underline">All</button>
                  <button onClick={() => setSelectedCombos(new Set())} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {allCombinations.map(([hi,bi,ii]) => {
                  const key = ck(hi,bi,ii);
                  const checked = selectedCombos.has(key);
                  return (
                    <div key={key} onClick={() => { setSelectedCombos(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }); }}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${checked ? "border-primary/30 bg-primary/5" : "border-border hover:bg-accent/20"}`}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${checked ? "border-primary bg-primary" : "border-border"}`}>
                        {checked && <Check className="w-2 h-2 text-white" />}
                      </div>
                      <span className="truncate text-foreground font-medium flex-1">{headlines[hi]}</span>
                      <span className="truncate text-muted-foreground flex-1">{bodies[bi]}</span>
                      <span className="text-blue-400 font-mono text-[9px] flex-shrink-0">img_{ii+1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Ad Sets */}
          <div className="border border-card-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] flex items-center justify-center font-bold">3</span> Select Ad Sets ({selectedAdSetIds.size})</p>
              <button onClick={() => setSelectedAdSetIds(new Set(adSets.map((a: any) => a.id)))} className="text-[10px] text-primary hover:underline">Select all</button>
            </div>
            {adSetsLoading ? <div className="h-16 bg-muted/30 rounded animate-pulse" /> : adSets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No ad sets found. Create campaigns first.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {adSets.map((as: any) => {
                  const checked = selectedAdSetIds.has(as.id);
                  return (
                    <div key={as.id} onClick={() => { setSelectedAdSetIds(prev => { const n = new Set(prev); n.has(as.id) ? n.delete(as.id) : n.add(as.id); return n; }); }}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${checked ? "border-primary/30 bg-primary/5" : "border-border hover:bg-accent/20"}`}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${checked ? "border-primary bg-primary" : "border-border"}`}>
                        {checked && <Check className="w-2 h-2 text-white" />}
                      </div>
                      <span className="font-medium text-foreground truncate flex-1">{as.name}</span>
                      <span className="text-muted-foreground text-[10px]">{as.campaign?.name}</span>
                      <Badge variant="outline" className={`text-[9px] border flex-shrink-0 ${as.status === "ACTIVE" ? "border-emerald-500/20 text-emerald-400" : "border-border text-muted-foreground"}`}>{as.status}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Summary + Launch + Jobs */}
        <div className="space-y-3">
          <div className={`border rounded-xl p-4 space-y-3 ${totalAds > 0 ? "border-blue-500/30 bg-blue-500/5" : "border-card-border"}`}>
            <p className="text-xs font-semibold text-foreground">Launch Summary</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Combos</span><span className="font-semibold">{selectedCombos.size}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ad Sets</span><span className="font-semibold">{selectedAdSetIds.size}</span></div>
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="text-muted-foreground font-semibold">Total Ads</span>
                <span className="font-bold text-lg text-foreground">{totalAds.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Time</span>
                <span className="font-semibold">{totalAds === 0 ? "—" : totalAds < 50 ? "< 30s" : totalAds < 500 ? "1–3 min" : "3–8 min"}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <div className="flex gap-2 mt-1">
                {(["PAUSED","ACTIVE"] as const).map(s => (
                  <button key={s} onClick={() => setAdStatus(s)} className={`flex-1 h-7 rounded-lg text-[10px] font-semibold border transition-colors ${adStatus === s ? (s === "ACTIVE" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-yellow-500/20 border-yellow-500/30 text-yellow-400") : "border-border text-muted-foreground"}`}>{s}</button>
                ))}
              </div>
              {adStatus === "ACTIVE" && <p className="text-[10px] text-amber-400 mt-1">⚠️ Starts spending immediately</p>}
            </div>
            <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" disabled={totalAds === 0 || launchMutation.isPending} onClick={handleLaunch}>
              {launchMutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Queuing...</> : <><Rocket className="w-3.5 h-3.5" /> Launch {totalAds > 0 ? totalAds.toLocaleString() : ""} Ads</>}
            </Button>
          </div>

          {/* Active job */}
          {activeJob && (activeJob.status === "running" || activeJob.status === "pending") && (
            <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-semibold text-blue-400 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" /> In Progress</p>
              <JobBar job={activeJob} />
            </div>
          )}

          {/* Recent jobs */}
          {jobs.length > 0 && (
            <div className="border border-card-border rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">Recent Jobs</p>
              {jobs.slice(0, 6).map((j: any) => <JobBar key={j.id} job={j} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
