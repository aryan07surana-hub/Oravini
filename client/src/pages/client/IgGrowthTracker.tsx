import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Users, TrendingUp, TrendingDown, RefreshCw, Trash2, Plus, Instagram,
  ExternalLink, Clock, Activity
} from "lucide-react";

const GOLD = "#d4b461";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Delta({ latest, prev }: { latest: number; prev: number | null }) {
  if (prev === null || prev === 0) return null;
  const diff = latest - prev;
  if (diff === 0) return <span className="text-xs text-zinc-500">no change</span>;
  const pct = Math.abs((diff / prev) * 100).toFixed(2);
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
      {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {diff > 0 ? "+" : ""}{fmt(diff)} ({pct}%)
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function IgGrowthTracker() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [scanningId, setScanningId] = useState<number | null>(null);

  const { data: profiles = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/ig-tracker"] });

  const addMutation = useMutation({
    mutationFn: (u: string) => apiRequest("POST", "/api/ig-tracker", { username: u }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker"] });
      setUsername("");
      toast({ title: "Profile added", description: "First snapshot captured successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ig-tracker/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker"] });
      if (selectedId === id) setSelectedId(null);
      toast({ title: "Profile removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  async function handleScan(id: number) {
    setScanningId(id);
    try {
      await apiRequest("POST", `/api/ig-tracker/${id}/scan`);
      queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker"] });
      if (selectedId === id) queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker", id, "history"] });
      toast({ title: "Scan complete", description: "Latest follower count captured." });
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanningId(null);
    }
  }

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/ig-tracker", selectedId, "history"],
    enabled: selectedId !== null,
  });

  const chartData = history.map((s: any) => ({
    date: new Date(s.scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    Followers: s.followersCount,
    Following: s.followsCount,
  }));

  const selectedProfile = profiles.find((p: any) => p.id === selectedId);

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[#0a0a0a] p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}33, ${GOLD}11)`, border: `1px solid ${GOLD}33` }}>
              <Instagram className="w-4.5 h-4.5" style={{ color: GOLD }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Instagram Growth Tracker</h1>
              <p className="text-xs text-zinc-500">Monitor follower & following counts over time</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] text-zinc-500">Auto-scans daily at 6AM UTC · Powered by Apify</span>
          </div>
        </div>

        {/* Add Profile */}
        <div className="mb-8 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Track a New Profile</p>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">@</span>
              <Input
                data-testid="input-ig-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && username.trim()) addMutation.mutate(username); }}
                placeholder="username"
                className="pl-7 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-[#d4b461]"
              />
            </div>
            <Button
              data-testid="button-track-profile"
              onClick={() => addMutation.mutate(username)}
              disabled={!username.trim() || addMutation.isPending}
              className="gap-2"
              style={{ background: GOLD, color: "#1a1200" }}
            >
              {addMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning…</>
              ) : (
                <><Plus className="w-4 h-4" /> Track Profile</>
              )}
            </Button>
          </div>
          {addMutation.isPending && (
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Fetching profile data via Apify — this takes ~20 seconds…
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#d4b461] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <Instagram className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">No profiles tracked yet</p>
            <p className="text-xs mt-1">Add an Instagram username above to start monitoring growth</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {profiles.map((profile: any) => {
              const snap = profile.latestSnapshot;
              const prev = profile.prevSnapshot;
              const isSelected = selectedId === profile.id;
              return (
                <div
                  key={profile.id}
                  data-testid={`card-ig-profile-${profile.id}`}
                  onClick={() => setSelectedId(isSelected ? null : profile.id)}
                  className="rounded-2xl border cursor-pointer transition-all duration-200"
                  style={{
                    background: isSelected ? `${GOLD}08` : "rgba(255,255,255,0.02)",
                    borderColor: isSelected ? `${GOLD}55` : "rgba(255,255,255,0.07)",
                    boxShadow: isSelected ? `0 0 0 1px ${GOLD}33` : "none",
                  }}
                >
                  <div className="p-4">
                    {/* Profile header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-shrink-0">
                        {profile.profilePic ? (
                          <img src={profile.profilePic} alt={profile.username} className="w-11 h-11 rounded-full object-cover" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center">
                            <Instagram className="w-5 h-5 text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{profile.fullName || profile.username}</p>
                        <a
                          href={`https://instagram.com/${profile.username}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-[#d4b461] transition-colors"
                        >
                          @{profile.username}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    {/* Stats */}
                    {snap ? (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-xl bg-zinc-800/60 p-3">
                          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1">Followers</p>
                          <p className="text-xl font-bold text-white">{fmt(snap.followersCount)}</p>
                          <Delta latest={snap.followersCount} prev={prev?.followersCount ?? null} />
                        </div>
                        <div className="rounded-xl bg-zinc-800/60 p-3">
                          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1">Following</p>
                          <p className="text-xl font-bold text-white">{fmt(snap.followsCount)}</p>
                          <Delta latest={snap.followsCount} prev={prev?.followsCount ?? null} />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-zinc-800/60 p-3 mb-4 text-center text-xs text-zinc-500">No data yet — scan to start</div>
                    )}

                    {snap && (
                      <div className="flex items-center gap-1 text-[10px] text-zinc-600 mb-4">
                        <Clock className="w-3 h-3" />
                        Last scanned {timeAgo(snap.scannedAt)}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <Button
                        data-testid={`button-scan-${profile.id}`}
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs border-zinc-700 hover:border-[#d4b461] hover:text-[#d4b461]"
                        onClick={() => handleScan(profile.id)}
                        disabled={scanningId === profile.id}
                      >
                        <RefreshCw className={`w-3 h-3 ${scanningId === profile.id ? "animate-spin" : ""}`} />
                        {scanningId === profile.id ? "Scanning…" : "Scan Now"}
                      </Button>
                      <Button
                        data-testid={`button-delete-${profile.id}`}
                        size="sm"
                        variant="ghost"
                        className="text-zinc-600 hover:text-red-400 hover:bg-red-400/10"
                        onClick={() => deleteMutation.mutate(profile.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Growth Chart */}
        {selectedId !== null && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white">
                  Growth History — @{selectedProfile?.username}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">{history.length} data point{history.length !== 1 ? "s" : ""} recorded</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: GOLD }} /> Followers</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block bg-blue-400" /> Following</span>
              </div>
            </div>

            {chartData.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <Users className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Need more data points</p>
                <p className="text-xs mt-1">Scan again tomorrow to see your growth trend</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Followers" stroke={GOLD} strokeWidth={2.5} dot={{ fill: GOLD, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: GOLD }} />
                  <Line type="monotone" dataKey="Following" stroke="#60a5fa" strokeWidth={2} dot={{ fill: "#60a5fa", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#60a5fa" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

      </div>
    </ClientLayout>
  );
}
