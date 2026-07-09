import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Crown, Rocket, Brain, RefreshCw, CheckCircle2, Layers, Zap, Play, Pause,
  Trash2, ChevronRight, Target, Image, FileText, BarChart2, Plus, X, Check
} from "lucide-react";

const CTA_OPTIONS = [
  "LEARN_MORE", "SHOP_NOW", "SIGN_UP", "BOOK_TRAVEL", "CONTACT_US",
  "APPLY_NOW", "DOWNLOAD", "GET_OFFER", "WATCH_MORE", "MESSAGE_PAGE"
];

function JobStatusBar({ job }: { job: any }) {
  const progress = job.total_count > 0
    ? Math.round(((job.completed_count + job.failed_count) / job.total_count) * 100)
    : 0;

  const color = job.status === "completed" ? "bg-emerald-500"
    : job.status === "failed" ? "bg-red-500"
    : job.status === "running" ? "bg-blue-500"
    : "bg-muted-foreground";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{job.job_type.replace("_", " ")}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{job.completed_count}/{job.total_count} ads</span>
          {job.failed_count > 0 && <span className="text-red-400">{job.failed_count} failed</span>}
          <Badge variant="outline" className={`text-[10px] border ${
            job.status === "completed" ? "border-emerald-500/20 text-emerald-400"
            : job.status === "failed" ? "border-red-500/20 text-red-400"
            : job.status === "running" ? "border-blue-500/20 text-blue-400"
            : "border-border text-muted-foreground"
          }`}>{job.status}</Badge>
        </div>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {format(new Date(job.created_at), "MMM d, h:mm a")}
        {job.completed_at && ` → ${format(new Date(job.completed_at), "h:mm a")}`}
      </p>
    </div>
  );
}

export default function MetaAdsBulkLauncher() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [step, setStep] = useState<"config" | "matrix" | "adsets" | "launch">("config");

  // Form state
  const [pageId, setPageId] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [callToAction, setCallToAction] = useState("LEARN_MORE");
  const [headlinesRaw, setHeadlinesRaw] = useState("");
  const [bodiesRaw, setBodiesRaw] = useState("");
  const [imageUrlsRaw, setImageUrlsRaw] = useState("");
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set());
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<Set<string>>(new Set());
  const [adStatus, setAdStatus] = useState<"PAUSED" | "ACTIVE">("PAUSED");
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  const headlines = headlinesRaw.split("\n").map(s => s.trim()).filter(Boolean);
  const bodies = bodiesRaw.split("\n").map(s => s.trim()).filter(Boolean);
  const imageUrls = imageUrlsRaw.split("\n").map(s => s.trim()).filter(Boolean);

  // All possible combinations
  const allCombinations = useMemo(() => {
    const combos: [number, number, number][] = [];
    headlines.forEach((_, hi) => {
      bodies.forEach((_, bi) => {
        imageUrls.forEach((_, ii) => {
          combos.push([hi, bi, ii]);
        });
      });
    });
    return combos;
  }, [headlines.length, bodies.length, imageUrls.length]);

  const comboKey = (hi: number, bi: number, ii: number) => `${hi}-${bi}-${ii}`;
  const totalSelectedAds = selectedCombinations.size * selectedAdSetIds.size;

  const { data: eliteClients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", { plan: "elite" }],
    queryFn: () => apiRequest("GET", "/api/clients?plan=elite"),
  });

  const { data: adSets = [], isLoading: adSetsLoading } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/adsets", selectedClientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/adsets/${selectedClientId}`),
    enabled: !!selectedClientId,
  });

  const { data: jobs = [], refetch: refetchJobs } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/bulk-jobs", selectedClientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/bulk-jobs/${selectedClientId}`),
    enabled: !!selectedClientId,
    refetchInterval: activeJobId ? 3000 : false,
  });

  // Poll active job
  const { data: activeJob } = useQuery<any>({
    queryKey: ["/api/meta-ads/bulk-jobs/active", selectedClientId, activeJobId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/bulk-jobs/${selectedClientId}/${activeJobId}`),
    enabled: !!activeJobId && !!selectedClientId,
    refetchInterval: 3000,
  });

  const launchMutation = useMutation({
    mutationFn: (config: any) => apiRequest("POST", `/api/meta-ads/bulk-launch/${selectedClientId}`, config),
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      refetchJobs();
      toast({ title: `Job started: creating ${data.totalAds} ads` });
    },
    onError: (e: any) => toast({ title: "Launch failed", description: e.message, variant: "destructive" }),
  });

  function handleSelectAllCombos() {
    const all = new Set(allCombinations.map(([h, b, i]) => comboKey(h, b, i)));
    setSelectedCombinations(all);
  }

  function handleToggleCombo(key: string) {
    setSelectedCombinations(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleLaunch() {
    if (!pageId.trim()) { toast({ title: "Facebook Page ID required", variant: "destructive" }); return; }
    if (!destinationUrl.trim()) { toast({ title: "Destination URL required", variant: "destructive" }); return; }
    if (selectedCombinations.size === 0) { toast({ title: "Select at least one creative combination", variant: "destructive" }); return; }
    if (selectedAdSetIds.size === 0) { toast({ title: "Select at least one ad set", variant: "destructive" }); return; }

    const combos = allCombinations.filter(([h, b, i]) => selectedCombinations.has(comboKey(h, b, i)));

    launchMutation.mutate({
      pageId: pageId.trim(),
      destinationUrl: destinationUrl.trim(),
      callToAction,
      headlines,
      bodies,
      imageUrls,
      selectedCombinations: combos,
      adSetIds: [...selectedAdSetIds],
      adStatus,
    });
  }

  const selectedClient = eliteClients.find((c: any) => c.id === selectedClientId);
  const runningJob = jobs.find((j: any) => j.status === "running" || j.status === "pending");

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="w-6 h-6 text-blue-400" /> Bulk Ad Launcher
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Creative matrix → Meta Batch API → thousands of ads in minutes
          </p>
        </div>

        {/* Client selector */}
        <Card className="border border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-400" /> Client
                </Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger><SelectValue placeholder="Choose a client..." /></SelectTrigger>
                  <SelectContent>
                    {eliteClients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedClient && (
                <Badge variant="outline" className="gap-1.5 border-yellow-500/20 text-yellow-400">
                  <Crown className="w-3 h-3" /> {selectedClient.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedClientId ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <Rocket className="w-10 h-10 text-blue-400/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Select a client to start</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: Config */}
            <div className="lg:col-span-2 space-y-5">

              {/* Step 1: Creative Config */}
              <Card className="border border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">1</div>
                    Creative Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Facebook Page ID</Label>
                      <Input value={pageId} onChange={e => setPageId(e.target.value)}
                        placeholder="123456789" className="mt-1 h-9 text-xs font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs">Call to Action</Label>
                      <Select value={callToAction} onValueChange={setCallToAction}>
                        <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CTA_OPTIONS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Destination URL</Label>
                    <Input value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)}
                      placeholder="https://yoursite.com/landing-page" className="mt-1 h-9 text-xs" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Headlines ({headlines.length})
                      </Label>
                      <Textarea value={headlinesRaw} onChange={e => setHeadlinesRaw(e.target.value)}
                        placeholder={"Headline 1\nHeadline 2\nHeadline 3"}
                        className="mt-1 text-xs h-32 resize-none font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Body Texts ({bodies.length})
                      </Label>
                      <Textarea value={bodiesRaw} onChange={e => setBodiesRaw(e.target.value)}
                        placeholder={"Body text 1\nBody text 2"}
                        className="mt-1 text-xs h-32 resize-none font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <Image className="w-3 h-3" /> Image URLs ({imageUrls.length})
                      </Label>
                      <Textarea value={imageUrlsRaw} onChange={e => setImageUrlsRaw(e.target.value)}
                        placeholder={"https://img1.jpg\nhttps://img2.jpg"}
                        className="mt-1 text-xs h-32 resize-none font-mono" />
                    </div>
                  </div>

                  {allCombinations.length > 0 && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs flex items-center gap-3">
                      <Layers className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-foreground font-semibold">{allCombinations.length} combinations</span>
                      <span className="text-muted-foreground">= {headlines.length} headlines × {bodies.length} bodies × {imageUrls.length} images</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Combination Matrix */}
              {allCombinations.length > 0 && (
                <Card className="border border-card-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">2</div>
                        Select Combinations ({selectedCombinations.size}/{allCombinations.length})
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSelectAllCombos}>Select all</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedCombinations(new Set())}>Clear</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto space-y-1.5">
                      {allCombinations.map(([hi, bi, ii]) => {
                        const key = comboKey(hi, bi, ii);
                        const checked = selectedCombinations.has(key);
                        return (
                          <div
                            key={key}
                            onClick={() => handleToggleCombo(key)}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                              checked ? "border-primary/30 bg-primary/5" : "border-border hover:bg-accent/20"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              checked ? "border-primary bg-primary" : "border-border"
                            }`}>
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
                              <span className="truncate text-foreground font-medium">{headlines[hi]}</span>
                              <span className="truncate text-muted-foreground">{bodies[bi]}</span>
                              <span className="truncate text-blue-400 font-mono text-[10px]">img_{ii + 1}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Ad Set Selection */}
              <Card className="border border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">3</div>
                    Select Ad Sets ({selectedAdSetIds.size} selected)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {adSetsLoading ? (
                    <div className="h-20 rounded-xl bg-muted/30 animate-pulse" />
                  ) : adSets.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No ad sets found. Create campaigns + ad sets in Meta Ads Manager or via Campaign Architect first.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      <div
                        onClick={() => setSelectedAdSetIds(new Set(adSets.map((a: any) => a.id)))}
                        className="text-[10px] text-primary cursor-pointer hover:underline mb-2 inline-block"
                      >
                        Select all ad sets
                      </div>
                      {adSets.map((adSet: any) => {
                        const checked = selectedAdSetIds.has(adSet.id);
                        return (
                          <div
                            key={adSet.id}
                            onClick={() => {
                              setSelectedAdSetIds(prev => {
                                const next = new Set(prev);
                                next.has(adSet.id) ? next.delete(adSet.id) : next.add(adSet.id);
                                return next;
                              });
                            }}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                              checked ? "border-primary/30 bg-primary/5" : "border-border hover:bg-accent/20"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              checked ? "border-primary bg-primary" : "border-border"
                            }`}>
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{adSet.name}</p>
                              <p className="text-muted-foreground text-[10px]">
                                {adSet.campaign?.name} · {adSet.optimization_goal?.replace(/_/g, " ")}
                                {adSet.daily_budget ? ` · $${(parseInt(adSet.daily_budget) / 100).toFixed(2)}/day` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] border flex-shrink-0 ${
                              adSet.status === "ACTIVE" ? "border-emerald-500/20 text-emerald-400" : "border-border text-muted-foreground"
                            }`}>{adSet.status}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Summary + Launch + Jobs */}
            <div className="space-y-4">
              {/* Launch summary */}
              <Card className={`border ${totalSelectedAds > 0 ? "border-blue-500/30 bg-blue-500/5" : "border-card-border"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Launch Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Combinations selected</span>
                      <span className="font-semibold text-foreground">{selectedCombinations.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ad sets</span>
                      <span className="font-semibold text-foreground">{selectedAdSetIds.size}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground font-semibold">Total ads</span>
                      <span className="font-bold text-foreground text-base">{totalSelectedAds.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated time</span>
                      <span className="font-semibold text-foreground">
                        {totalSelectedAds === 0 ? "–"
                          : totalSelectedAds < 50 ? "< 30s"
                          : totalSelectedAds < 500 ? "1–3 min"
                          : totalSelectedAds < 2000 ? "3–8 min"
                          : "8–15 min"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Initial Status</Label>
                    <div className="flex gap-2 mt-1.5">
                      {(["PAUSED", "ACTIVE"] as const).map(s => (
                        <button key={s} onClick={() => setAdStatus(s)}
                          className={`flex-1 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                            adStatus === s
                              ? s === "ACTIVE" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
                              : "border-border text-muted-foreground hover:bg-accent/30"
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    {adStatus === "ACTIVE" && (
                      <p className="text-[10px] text-amber-400 mt-1.5">⚠️ Ads will start spending immediately</p>
                    )}
                  </div>

                  <Button
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={totalSelectedAds === 0 || launchMutation.isPending}
                    onClick={handleLaunch}
                  >
                    {launchMutation.isPending
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Queuing...</>
                      : <><Rocket className="w-4 h-4" /> Launch {totalSelectedAds > 0 ? totalSelectedAds.toLocaleString() : ""} Ads</>
                    }
                  </Button>

                  <p className="text-[10px] text-muted-foreground text-center">
                    Requires <code>ads_management</code> permission
                  </p>
                </CardContent>
              </Card>

              {/* Active job progress */}
              {activeJob && (activeJob.status === "running" || activeJob.status === "pending") && (
                <Card className="border border-blue-500/20 bg-blue-500/5">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-blue-400 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In Progress
                    </p>
                    <JobStatusBar job={activeJob} />
                  </CardContent>
                </Card>
              )}

              {/* Recent jobs */}
              {jobs.length > 0 && (
                <Card className="border border-card-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recent Jobs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {jobs.slice(0, 8).map((job: any) => (
                      <JobStatusBar key={job.id} job={job} />
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
