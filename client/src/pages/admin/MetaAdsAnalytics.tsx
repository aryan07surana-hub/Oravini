import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Crown, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Zap, Target,
  BarChart2, FlameKindling, GitCompare, ArrowUpRight, ArrowDownRight,
  Eye, MousePointer, DollarSign, Trophy
} from "lucide-react";

function MetricCard({ label, value, sub, trend, icon: Icon, color = "text-foreground" }: any) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[10px] ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "border-emerald-500/20 text-emerald-400",
  PAUSED: "border-yellow-500/20 text-yellow-400",
  ARCHIVED: "border-border text-muted-foreground",
};

function TierBadge({ tier }: { tier: string }) {
  const config: Record<string, { cls: string; icon: any; label: string }> = {
    winner: { cls: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5", icon: Trophy, label: "Winner" },
    average: { cls: "border-blue-500/20 text-blue-400 bg-blue-500/5", icon: Target, label: "Average" },
    loser: { cls: "border-red-500/20 text-red-400 bg-red-500/5", icon: TrendingDown, label: "Loser" },
  };
  const c = config[tier] || config.average;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`gap-1 text-[10px] border ${c.cls}`}>
      <Icon className="w-2.5 h-2.5" />{c.label}
    </Badge>
  );
}

export default function MetaAdsAnalytics() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [activeTab, setActiveTab] = useState<"ads" | "creatives" | "fatigue" | "abtest">("ads");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [abAdId1, setAbAdId1] = useState("");
  const [abAdId2, setAbAdId2] = useState("");
  const [abResult, setAbResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: eliteClients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", { plan: "elite" }],
    queryFn: () => apiRequest("GET", "/api/clients?plan=elite"),
  });

  const { data: accountStats } = useQuery<any>({
    queryKey: ["/api/meta-ads/account-stats", selectedClientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/account-stats/${selectedClientId}`),
    enabled: !!selectedClientId,
  });

  const { data: ads = [], refetch: refetchAds, isLoading: adsLoading } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/ads", selectedClientId, statusFilter, sortBy, sortDir],
    queryFn: () => apiRequest("GET", `/api/meta-ads/ads/${selectedClientId}?status=${statusFilter}&sort_by=${sortBy}&sort_dir=${sortDir}`),
    enabled: !!selectedClientId,
  });

  const { data: creativePerf = [] } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/creative-performance", selectedClientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/creative-performance/${selectedClientId}`),
    enabled: !!selectedClientId && activeTab === "creatives",
  });

  const { data: fatigueReport = [] } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/fatigue-report", selectedClientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/fatigue-report/${selectedClientId}`),
    enabled: !!selectedClientId && activeTab === "fatigue",
  });

  const { data: adTrends } = useQuery<any>({
    queryKey: ["/api/meta-ads/ad-trends", selectedClientId, selectedAdId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/ad-trends/${selectedClientId}/${selectedAdId}`),
    enabled: !!selectedClientId && !!selectedAdId,
  });

  const statTestMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/meta-ads/stat-test", body),
    onSuccess: (data) => setAbResult(data),
    onError: (e: any) => toast({ title: "Stat test failed", description: e.message, variant: "destructive" }),
  });

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await apiRequest("POST", `/api/meta-ads/sync-ads/${selectedClientId}`);
      toast({ title: `Synced ${r.synced} ads` });
      refetchAds();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  const sortIcon = (col: string) =>
    sortBy === col ? (sortDir === "desc" ? " ↓" : " ↑") : "";

  const fatiguedCount = fatigueReport.filter((a: any) => a.is_fatigued).length;
  const selectedClient = eliteClients.find((c: any) => c.id === selectedClientId);

  const tabs = [
    { id: "ads", label: "Ad Table", icon: BarChart2 },
    { id: "creatives", label: "Creative Matrix", icon: Target },
    { id: "fatigue", label: "Fatigue Report", icon: FlameKindling },
    { id: "abtest", label: "A/B Test", icon: GitCompare },
  ] as const;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-purple-400" /> Ad Analytics
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Ad-level insights, creative performance, fatigue detection, statistical testing
            </p>
          </div>
        </div>

        {/* Client + Sync */}
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
              {selectedClientId && (
                <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-2 mt-5">
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Sync Ads"}
                </Button>
              )}
              {selectedClient && (
                <Badge variant="outline" className="gap-1.5 border-yellow-500/20 text-yellow-400 mt-5">
                  <Crown className="w-3 h-3" /> {selectedClient.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedClientId ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <BarChart2 className="w-10 h-10 text-purple-400/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Select a client to view analytics</p>
          </div>
        ) : (
          <>
            {/* Account stats */}
            {accountStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <MetricCard label="Total Ads" value={accountStats.total_ads?.toLocaleString()} icon={BarChart2} color="text-foreground" />
                <MetricCard label="Active" value={accountStats.active_ads?.toLocaleString()} icon={Zap} color="text-emerald-400" />
                <MetricCard label="Spend (30d)" value={`$${parseFloat(accountStats.total_spend || 0).toLocaleString()}`} icon={DollarSign} color="text-blue-400" />
                <MetricCard label="Revenue (30d)" value={`$${parseFloat(accountStats.total_revenue || 0).toLocaleString()}`} icon={TrendingUp} color="text-purple-400" />
                <MetricCard label="Avg ROAS" value={`${parseFloat(accountStats.avg_roas || 0).toFixed(2)}x`} icon={Target} color="text-amber-400" />
                <MetricCard label="Avg CTR" value={`${parseFloat(accountStats.avg_ctr || 0).toFixed(2)}%`} icon={MousePointer} color="text-foreground" />
                <MetricCard label="Impressions" value={`${(parseInt(accountStats.total_impressions || 0) / 1000).toFixed(0)}K`} icon={Eye} color="text-foreground" />
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit border border-border">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-card text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.id === "fatigue" && fatiguedCount > 0 && (
                      <Badge className="bg-red-500 text-white text-[10px] h-4 w-4 p-0 flex items-center justify-center rounded-full">
                        {fatiguedCount}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab: Ad Table */}
            {activeTab === "ads" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">{ads.length} ads</span>
                </div>

                {/* Ad table */}
                <div className="border border-card-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/20 border-b border-card-border">
                        <tr>
                          <th className="text-left p-3 text-muted-foreground font-medium">Ad Name</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                          <th
                            className="text-right p-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                            onClick={() => toggleSort("spend")}
                          >Spend{sortIcon("spend")}</th>
                          <th
                            className="text-right p-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                            onClick={() => toggleSort("roas")}
                          >ROAS{sortIcon("roas")}</th>
                          <th
                            className="text-right p-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                            onClick={() => toggleSort("ctr")}
                          >CTR{sortIcon("ctr")}</th>
                          <th
                            className="text-right p-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                            onClick={() => toggleSort("cpc")}
                          >CPC{sortIcon("cpc")}</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">Impressions</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">Clicks</th>
                          <th className="text-center p-3 text-muted-foreground font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adsLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-card-border/40">
                              {Array.from({ length: 9 }).map((_, j) => (
                                <td key={j} className="p-3"><div className="h-4 bg-muted/30 rounded animate-pulse" /></td>
                              ))}
                            </tr>
                          ))
                        ) : ads.length === 0 ? (
                          <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No ads found. Click "Sync Ads" to pull from Meta.</td></tr>
                        ) : (
                          ads.map((ad: any) => (
                            <tr
                              key={ad.id}
                              className={`border-b border-card-border/40 hover:bg-muted/10 cursor-pointer transition-colors ${selectedAdId === ad.id ? "bg-primary/5" : ""}`}
                              onClick={() => setSelectedAdId(selectedAdId === ad.id ? null : ad.id)}
                            >
                              <td className="p-3">
                                <p className="font-medium text-foreground truncate max-w-[200px]">{ad.ad_name}</p>
                                <p className="text-muted-foreground text-[10px] truncate max-w-[200px]">{ad.creative_name}</p>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className={`text-[10px] border ${STATUS_COLORS[ad.status] || "border-border text-muted-foreground"}`}>
                                  {ad.status}
                                </Badge>
                              </td>
                              <td className="p-3 text-right font-mono">${parseFloat(ad.spend || 0).toFixed(2)}</td>
                              <td className={`p-3 text-right font-mono font-semibold ${parseFloat(ad.roas || 0) >= 3 ? "text-emerald-400" : parseFloat(ad.roas || 0) >= 1 ? "text-foreground" : "text-red-400"}`}>
                                {parseFloat(ad.roas || 0).toFixed(2)}x
                              </td>
                              <td className={`p-3 text-right font-mono ${parseFloat(ad.ctr || 0) >= 2 ? "text-emerald-400" : "text-foreground"}`}>
                                {parseFloat(ad.ctr || 0).toFixed(2)}%
                              </td>
                              <td className="p-3 text-right font-mono">${parseFloat(ad.cpc || 0).toFixed(2)}</td>
                              <td className="p-3 text-right font-mono">{parseInt(ad.impressions || 0).toLocaleString()}</td>
                              <td className="p-3 text-right font-mono">{parseInt(ad.clicks || 0).toLocaleString()}</td>
                              <td className="p-3 text-center">
                                {ad.synced_at && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(ad.synced_at).toLocaleDateString()}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Selected ad trend chart */}
                {selectedAdId && adTrends && (
                  <Card className="border border-card-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        Performance Trend — {ads.find((a: any) => a.id === selectedAdId)?.ad_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={adTrends.daily || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date_start" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2} dot={false} name="Spend ($)" />
                          <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#10b981" strokeWidth={2} dot={false} name="ROAS" />
                          <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="#f59e0b" strokeWidth={2} dot={false} name="CTR (%)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Tab: Creative Performance Matrix */}
            {activeTab === "creatives" && (
              <div className="space-y-4">
                {creativePerf.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No creative data. Sync ads first.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {(["winner", "average", "loser"] as const).map(tier => {
                        const count = creativePerf.filter((c: any) => c.tier === tier).length;
                        const colors = {
                          winner: "border-emerald-500/20 bg-emerald-500/5",
                          average: "border-blue-500/20 bg-blue-500/5",
                          loser: "border-red-500/20 bg-red-500/5",
                        };
                        return (
                          <div key={tier} className={`border rounded-xl p-4 ${colors[tier]}`}>
                            <p className="text-xs text-muted-foreground capitalize">{tier}s</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
                            <p className="text-[10px] text-muted-foreground">creatives</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {/* Bar chart: avg ROAS by creative */}
                      <Card className="border border-card-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">ROAS by Creative</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={creativePerf.slice(0, 15)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <YAxis dataKey="creative_name" type="category" tick={{ fontSize: 9 }} width={100} stroke="hsl(var(--muted-foreground))" />
                              <Tooltip
                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                                formatter={(v: any) => [`${parseFloat(v).toFixed(2)}x`, "ROAS"]}
                              />
                              <Bar dataKey="avg_roas" fill="#6366f1" radius={[0, 4, 4, 0]} name="Avg ROAS" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Table */}
                      <Card className="border border-card-border overflow-hidden">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Creative Rankings</CardTitle>
                        </CardHeader>
                        <div className="overflow-auto max-h-72">
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
                              {creativePerf.map((c: any, i: number) => (
                                <tr key={i} className="border-b border-card-border/40 hover:bg-muted/10">
                                  <td className="p-3 font-medium text-foreground truncate max-w-[150px]">{c.creative_name}</td>
                                  <td className="p-3 text-center"><TierBadge tier={c.tier} /></td>
                                  <td className={`p-3 text-right font-mono font-semibold ${c.tier === "winner" ? "text-emerald-400" : c.tier === "loser" ? "text-red-400" : "text-foreground"}`}>
                                    {parseFloat(c.avg_roas || 0).toFixed(2)}x
                                  </td>
                                  <td className="p-3 text-right font-mono">{parseFloat(c.avg_ctr || 0).toFixed(2)}%</td>
                                  <td className="p-3 text-right font-mono">${parseFloat(c.total_spend || 0).toFixed(0)}</td>
                                  <td className="p-3 text-right font-mono">{c.ad_count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: Fatigue Report */}
            {activeTab === "fatigue" && (
              <div className="space-y-4">
                {fatigueReport.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <FlameKindling className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No fatigue data. Need at least 6 days of ad snapshots.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {fatiguedCount} ad{fatiguedCount !== 1 ? "s" : ""} showing fatigue signals
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CTR dropped ≥25% in recent days vs. early performance
                        </p>
                      </div>
                    </div>

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
                          {fatigueReport.map((ad: any, i: number) => (
                            <tr key={i} className={`border-b border-card-border/40 ${ad.is_fatigued ? "bg-red-500/5" : ""}`}>
                              <td className="p-3">
                                <p className="font-medium text-foreground truncate max-w-[200px]">{ad.ad_name}</p>
                                <p className="text-muted-foreground text-[10px]">{ad.creative_name}</p>
                              </td>
                              <td className="p-3 text-right font-mono">{parseFloat(ad.early_ctr || 0).toFixed(2)}%</td>
                              <td className="p-3 text-right font-mono">{parseFloat(ad.recent_ctr || 0).toFixed(2)}%</td>
                              <td className={`p-3 text-right font-mono font-semibold ${ad.is_fatigued ? "text-red-400" : "text-foreground"}`}>
                                {ad.ctr_drop_pct > 0 ? "-" : "+"}{Math.abs(ad.ctr_drop_pct).toFixed(1)}%
                              </td>
                              <td className="p-3 text-center">
                                {ad.is_fatigued ? (
                                  <Badge variant="outline" className="border-red-500/20 text-red-400 gap-1 text-[10px]">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Fatigued
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 text-[10px]">
                                    Healthy
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono">${parseFloat(ad.total_spend || 0).toFixed(0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: A/B Statistical Test */}
            {activeTab === "abtest" && (
              <div className="space-y-5 max-w-2xl">
                <Card className="border border-card-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-blue-400" /> Two-Proportion Z-Test
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Tests whether CTR difference between two ads is statistically significant (not random)
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Ad A — ID</Label>
                        <Input
                          value={abAdId1}
                          onChange={e => setAbAdId1(e.target.value)}
                          placeholder="123456789"
                          className="mt-1 h-9 text-xs font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Find IDs in the Ad Table tab
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs">Ad B — ID</Label>
                        <Input
                          value={abAdId2}
                          onChange={e => setAbAdId2(e.target.value)}
                          placeholder="987654321"
                          className="mt-1 h-9 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <Button
                      className="gap-2"
                      disabled={!abAdId1.trim() || !abAdId2.trim() || statTestMutation.isPending}
                      onClick={() => statTestMutation.mutate({
                        clientId: selectedClientId,
                        adId1: abAdId1.trim(),
                        adId2: abAdId2.trim(),
                      })}
                    >
                      {statTestMutation.isPending
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Testing...</>
                        : <><GitCompare className="w-4 h-4" /> Run Test</>
                      }
                    </Button>
                  </CardContent>
                </Card>

                {abResult && (
                  <Card className={`border ${abResult.significant ? "border-emerald-500/20 bg-emerald-500/5" : "border-card-border"}`}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        {abResult.significant ? (
                          <Trophy className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Target className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {abResult.significant ? "Statistically Significant!" : "Not Significant Yet"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {abResult.confidence.toFixed(1)}% confidence · Z-score: {abResult.zScore.toFixed(3)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-xl p-4 border ${abResult.winner === "A" ? "border-emerald-500/30 bg-emerald-500/5" : "border-card-border"}`}>
                          <p className="text-xs text-muted-foreground mb-1">Ad A</p>
                          <p className="text-lg font-bold text-foreground">{(abResult.ctrs?.a * 100 || 0).toFixed(3)}%</p>
                          <p className="text-[10px] text-muted-foreground">CTR</p>
                          {abResult.winner === "A" && (
                            <Badge className="mt-2 bg-emerald-600 text-white text-[10px]">Winner</Badge>
                          )}
                        </div>
                        <div className={`rounded-xl p-4 border ${abResult.winner === "B" ? "border-emerald-500/30 bg-emerald-500/5" : "border-card-border"}`}>
                          <p className="text-xs text-muted-foreground mb-1">Ad B</p>
                          <p className="text-lg font-bold text-foreground">{(abResult.ctrs?.b * 100 || 0).toFixed(3)}%</p>
                          <p className="text-[10px] text-muted-foreground">CTR</p>
                          {abResult.winner === "B" && (
                            <Badge className="mt-2 bg-emerald-600 text-white text-[10px]">Winner</Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>{"• Z > 1.96 = 95% confidence (significant)"}</p>
                        <p>{"• Z > 2.576 = 99% confidence (highly significant)"}</p>
                        <p>• {!abResult.significant ? "Need more data — keep running both ads" : "You can safely scale the winner and pause the loser"}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
