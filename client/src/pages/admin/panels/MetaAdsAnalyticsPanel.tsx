/**
 * Analytics panel — embedded in Tracking page Meta Ads section.
 * Ad table, creative matrix, fatigue report, A/B stat test.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import {
  RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Target,
  BarChart2, FlameKindling, GitCompare, ArrowUpRight, ArrowDownRight,
  Eye, MousePointer, DollarSign, Trophy
} from "lucide-react";

function MetricCard({ label, value, icon: Icon, color = "text-foreground" }: any) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-3 text-center">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
      </div>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const cfg: Record<string, any> = {
    winner: { cls: "border-emerald-500/20 text-emerald-400", icon: Trophy },
    average: { cls: "border-blue-500/20 text-blue-400", icon: Target },
    loser: { cls: "border-red-500/20 text-red-400", icon: TrendingDown },
  };
  const c = cfg[tier] || cfg.average;
  const Icon = c.icon;
  return <Badge variant="outline" className={`gap-1 text-[10px] border ${c.cls}`}><Icon className="w-2.5 h-2.5" />{tier}</Badge>;
}

const STATUS_COLORS: Record<string,string> = {
  ACTIVE: "border-emerald-500/20 text-emerald-400",
  PAUSED: "border-yellow-500/20 text-yellow-400",
  ARCHIVED: "border-border text-muted-foreground",
};

type AnalyticsTab = "ads" | "creatives" | "fatigue" | "abtest";

export default function MetaAdsAnalyticsPanel({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("ads");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("spend");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [selectedAdId, setSelectedAdId] = useState<string|null>(null);
  const [abAdId1, setAbAdId1] = useState("");
  const [abAdId2, setAbAdId2] = useState("");
  const [abResult, setAbResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: accountStats } = useQuery<any>({
    queryKey: ["/api/meta-ads/account-stats", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/account-stats/${clientId}`),
    enabled: !!clientId,
  });

  const { data: ads = [], refetch: refetchAds, isLoading: adsLoading } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/ads", clientId, statusFilter, sortBy, sortDir],
    queryFn: () => apiRequest("GET", `/api/meta-ads/ads/${clientId}?status=${statusFilter}&sort_by=${sortBy}&sort_dir=${sortDir}`),
    enabled: !!clientId,
  });

  const { data: creativePerf = [] } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/creative-performance", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/creative-performance/${clientId}`),
    enabled: !!clientId && activeTab === "creatives",
  });

  const { data: fatigueReport = [] } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/fatigue-report", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/fatigue-report/${clientId}`),
    enabled: !!clientId && activeTab === "fatigue",
  });

  const { data: adTrends } = useQuery<any>({
    queryKey: ["/api/meta-ads/ad-trends", clientId, selectedAdId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/ad-trends/${clientId}/${selectedAdId}`),
    enabled: !!clientId && !!selectedAdId,
  });

  const statTestMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/meta-ads/stat-test", body),
    onSuccess: (data) => setAbResult(data),
    onError: (e: any) => toast({ title: "Test failed", description: e.message, variant: "destructive" }),
  });

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await apiRequest("POST", `/api/meta-ads/sync-ads/${clientId}`);
      toast({ title: `Synced ${r.synced} ads` });
      refetchAds();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally { setSyncing(false); }
  }

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }
  const si = (col: string) => sortBy === col ? (sortDir === "desc" ? " ↓" : " ↑") : "";

  const fatiguedCount = (fatigueReport as any[]).filter((a: any) => a.is_fatigued).length;

  const tabs: { id: AnalyticsTab; label: string }[] = [
    { id: "ads", label: "Ad Table" },
    { id: "creatives", label: "Creative Matrix" },
    { id: "fatigue", label: `Fatigue${fatiguedCount > 0 ? ` (${fatiguedCount})` : ""}` },
    { id: "abtest", label: "A/B Test" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      {accountStats && (
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          <MetricCard label="Total Ads" value={parseInt(accountStats.total_ads||0).toLocaleString()} icon={BarChart2} />
          <MetricCard label="Active" value={parseInt(accountStats.active_ads||0).toLocaleString()} icon={undefined} color="text-emerald-400" />
          <MetricCard label="Spend" value={`$${parseFloat(accountStats.total_spend||0).toLocaleString()}`} icon={DollarSign} color="text-blue-400" />
          <MetricCard label="Revenue" value={`$${parseFloat(accountStats.total_revenue||0).toLocaleString()}`} icon={TrendingUp} color="text-purple-400" />
          <MetricCard label="Avg ROAS" value={`${parseFloat(accountStats.avg_roas||0).toFixed(2)}x`} icon={Target} color="text-amber-400" />
          <MetricCard label="Avg CTR" value={`${parseFloat(accountStats.avg_ctr||0).toFixed(2)}%`} icon={MousePointer} />
          <MetricCard label="Impressions" value={`${(parseInt(accountStats.total_impressions||0)/1000).toFixed(0)}K`} icon={Eye} />
        </div>
      )}

      {/* Sub-tabs + sync */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 p-1 bg-muted/20 rounded-lg border border-border w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === t.id ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync Ads
        </Button>
      </div>

      {/* Ad Table */}
      {activeTab === "ads" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{ads.length} ads</span>
          </div>
          <div className="border border-card-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/20 border-b border-card-border">
                  <tr>
                    <th className="text-left p-3 text-muted-foreground font-medium">Ad Name</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-right p-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("spend")}>Spend{si("spend")}</th>
                    <th className="text-right p-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("roas")}>ROAS{si("roas")}</th>
                    <th className="text-right p-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("ctr")}>CTR{si("ctr")}</th>
                    <th className="text-right p-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("cpc")}>CPC{si("cpc")}</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Impr.</th>
                  </tr>
                </thead>
                <tbody>
                  {adsLoading ? Array.from({length:4}).map((_,i) => (
                    <tr key={i} className="border-b border-card-border/40">
                      {Array.from({length:7}).map((_,j) => <td key={j} className="p-3"><div className="h-4 bg-muted/30 rounded animate-pulse" /></td>)}
                    </tr>
                  )) : ads.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">No ads found. Click "Sync Ads" to pull from Meta.</td></tr>
                  ) : ads.map((ad: any) => (
                    <tr key={ad.id} onClick={() => setSelectedAdId(selectedAdId === ad.id ? null : ad.id)}
                      className={`border-b border-card-border/40 hover:bg-muted/10 cursor-pointer ${selectedAdId === ad.id ? "bg-primary/5" : ""}`}>
                      <td className="p-3">
                        <p className="font-medium text-foreground truncate max-w-[180px]">{ad.ad_name}</p>
                        <p className="text-muted-foreground text-[10px] truncate max-w-[180px]">{ad.creative_name}</p>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-[10px] border ${STATUS_COLORS[ad.status] || "border-border text-muted-foreground"}`}>{ad.status}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono">${parseFloat(ad.spend||0).toFixed(2)}</td>
                      <td className={`p-3 text-right font-mono font-semibold ${parseFloat(ad.roas||0) >= 3 ? "text-emerald-400" : parseFloat(ad.roas||0) >= 1 ? "text-foreground" : "text-red-400"}`}>
                        {parseFloat(ad.roas||0).toFixed(2)}x
                      </td>
                      <td className={`p-3 text-right font-mono ${parseFloat(ad.ctr||0) >= 2 ? "text-emerald-400" : "text-foreground"}`}>{parseFloat(ad.ctr||0).toFixed(2)}%</td>
                      <td className="p-3 text-right font-mono">${parseFloat(ad.cpc||0).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono">{parseInt(ad.impressions||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {selectedAdId && adTrends && (
            <div className="border border-card-border rounded-xl p-4">
              <p className="text-xs font-semibold mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Trend — {ads.find((a:any) => a.id === selectedAdId)?.ad_name}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={adTrends.daily||[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date_start" tick={{fontSize:9}} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{fontSize:9}} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{background:"hsl(var(--card))",border:"1px solid hsl(var(--border))",fontSize:10}} />
                  <Legend wrapperStyle={{fontSize:10}} />
                  <Line type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2} dot={false} name="Spend" />
                  <Line type="monotone" dataKey="ctr" stroke="#f59e0b" strokeWidth={2} dot={false} name="CTR%" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Creative Matrix */}
      {activeTab === "creatives" && (
        <div className="space-y-3">
          {creativePerf.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <Target className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No creative data. Sync ads first.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(["winner","average","loser"] as const).map(tier => {
                  const count = (creativePerf as any[]).filter((c:any) => c.tier === tier).length;
                  const colors = {winner:"border-emerald-500/20 bg-emerald-500/5",average:"border-blue-500/20 bg-blue-500/5",loser:"border-red-500/20 bg-red-500/5"};
                  return (
                    <div key={tier} className={`border rounded-xl p-3 ${colors[tier]}`}>
                      <p className="text-xs text-muted-foreground capitalize">{tier}s</p>
                      <p className="text-xl font-bold text-foreground">{count}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border border-card-border rounded-xl overflow-hidden">
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/20 border-b border-card-border sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-muted-foreground font-medium">Creative</th>
                        <th className="text-center p-3 text-muted-foreground font-medium">Tier</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">ROAS</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">CTR</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">Spend</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">Ads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(creativePerf as any[]).map((c:any, i:number) => (
                        <tr key={i} className="border-b border-card-border/40 hover:bg-muted/10">
                          <td className="p-3 font-medium text-foreground truncate max-w-[160px]">{c.creative_name}</td>
                          <td className="p-3 text-center"><TierBadge tier={c.tier} /></td>
                          <td className={`p-3 text-right font-mono font-semibold ${c.tier==="winner"?"text-emerald-400":c.tier==="loser"?"text-red-400":"text-foreground"}`}>{parseFloat(c.avg_roas||0).toFixed(2)}x</td>
                          <td className="p-3 text-right font-mono">{parseFloat(c.avg_ctr||0).toFixed(2)}%</td>
                          <td className="p-3 text-right font-mono">${parseFloat(c.total_spend||0).toFixed(0)}</td>
                          <td className="p-3 text-right font-mono">{c.ad_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Fatigue Report */}
      {activeTab === "fatigue" && (
        <div className="space-y-3">
          {(fatigueReport as any[]).length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <FlameKindling className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Need 6+ days of snapshots for fatigue detection.</p>
            </div>
          ) : (
            <>
              {fatiguedCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs font-semibold text-foreground">{fatiguedCount} ad{fatiguedCount!==1?"s":""} with fatigue signals (CTR dropped ≥25%)</p>
                </div>
              )}
              <div className="border border-card-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/20 border-b border-card-border">
                    <tr>
                      <th className="text-left p-3 text-muted-foreground font-medium">Ad</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Early CTR</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Recent CTR</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Drop</th>
                      <th className="text-center p-3 text-muted-foreground font-medium">Status</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fatigueReport as any[]).map((ad:any, i:number) => (
                      <tr key={i} className={`border-b border-card-border/40 ${ad.is_fatigued ? "bg-red-500/5" : ""}`}>
                        <td className="p-3">
                          <p className="font-medium text-foreground truncate max-w-[180px]">{ad.ad_name}</p>
                          <p className="text-muted-foreground text-[10px]">{ad.creative_name}</p>
                        </td>
                        <td className="p-3 text-right font-mono">{parseFloat(ad.early_ctr||0).toFixed(2)}%</td>
                        <td className="p-3 text-right font-mono">{parseFloat(ad.recent_ctr||0).toFixed(2)}%</td>
                        <td className={`p-3 text-right font-mono font-semibold ${ad.is_fatigued?"text-red-400":"text-foreground"}`}>
                          {ad.ctr_drop_pct > 0 ? "-" : "+"}{Math.abs(ad.ctr_drop_pct).toFixed(1)}%
                        </td>
                        <td className="p-3 text-center">
                          {ad.is_fatigued
                            ? <Badge variant="outline" className="border-red-500/20 text-red-400 gap-1 text-[10px]"><AlertTriangle className="w-2.5 h-2.5" /> Fatigued</Badge>
                            : <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 text-[10px]">Healthy</Badge>
                          }
                        </td>
                        <td className="p-3 text-right font-mono">${parseFloat(ad.total_spend||0).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* A/B Test */}
      {activeTab === "abtest" && (
        <div className="space-y-4 max-w-lg">
          <div className="border border-card-border rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><GitCompare className="w-3.5 h-3.5 text-blue-400" /> Two-Proportion Z-Test</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tests CTR difference statistical significance between two ads</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ad A — ID</Label>
                <Input value={abAdId1} onChange={e => setAbAdId1(e.target.value)} placeholder="123456789" className="mt-1 h-8 text-xs font-mono" />
              </div>
              <div>
                <Label className="text-xs">Ad B — ID</Label>
                <Input value={abAdId2} onChange={e => setAbAdId2(e.target.value)} placeholder="987654321" className="mt-1 h-8 text-xs font-mono" />
              </div>
            </div>
            <Button size="sm" className="gap-2 h-8 text-xs" disabled={!abAdId1.trim()||!abAdId2.trim()||statTestMutation.isPending}
              onClick={() => statTestMutation.mutate({ clientId, adId1: abAdId1.trim(), adId2: abAdId2.trim() })}>
              {statTestMutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing...</> : <><GitCompare className="w-3.5 h-3.5" /> Run Test</>}
            </Button>
          </div>

          {abResult && (
            <div className={`border rounded-xl p-4 space-y-3 ${abResult.significant ? "border-emerald-500/20 bg-emerald-500/5" : "border-card-border"}`}>
              <div className="flex items-center gap-2">
                {abResult.significant ? <Trophy className="w-4 h-4 text-emerald-400" /> : <Target className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="text-xs font-bold text-foreground">{abResult.significant ? "Statistically Significant!" : "Not Significant Yet"}</p>
                  <p className="text-[10px] text-muted-foreground">{abResult.confidence.toFixed(1)}% confidence · Z={abResult.zScore.toFixed(3)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["A","B"].map(side => {
                  const ctr = side === "A" ? abResult.ctrs?.a : abResult.ctrs?.b;
                  const isWinner = abResult.winner === side;
                  return (
                    <div key={side} className={`rounded-lg p-3 border ${isWinner ? "border-emerald-500/30 bg-emerald-500/5" : "border-card-border"}`}>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Ad {side}</p>
                      <p className="text-base font-bold text-foreground">{((ctr||0)*100).toFixed(3)}%</p>
                      <p className="text-[10px] text-muted-foreground">CTR</p>
                      {isWinner && <Badge className="mt-1.5 bg-emerald-600 text-white text-[9px]">Winner</Badge>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">{abResult.significant ? "Safe to scale winner and pause loser." : "Need more data — keep running both."}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
