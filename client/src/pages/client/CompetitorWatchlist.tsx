import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Instagram, Plus, Trash2, RefreshCw, Bell, BellOff, Eye, Heart,
  MessageCircle, TrendingUp, TrendingDown, Clock, Users, Activity,
  ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle,
  Zap, FileText, BarChart2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const GOLD = "#d4b461";

const ALERT_ICONS: Record<string, any> = {
  follower_spike: TrendingUp,
  bio_change: FileText,
  new_post: Instagram,
  engagement_spike: Zap,
  post_count_jump: BarChart2,
};

const ALERT_COLORS: Record<string, string> = {
  follower_spike: "text-green-400 bg-green-500/10 border-green-500/20",
  bio_change: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  new_post: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  engagement_spike: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  post_count_jump: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, "") + "/";
  const handle = raw.replace(/^@/, "").trim();
  return handle ? `https://www.instagram.com/${handle}/` : "";
}

function StatChip({ icon: Icon, val, label, color = "text-foreground" }: { icon: any; val: any; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon className={`w-3 h-3 ${color}`} />
      <p className={`text-xs font-bold ${color}`}>{val ?? "—"}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DeltaBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (!current || !previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return null;
  const up = pct > 0;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${up ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
      {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function SnapshotChart({ snapshots }: { snapshots: any[] }) {
  if (snapshots.length < 2) return null;
  const data = [...snapshots].reverse().slice(-14).map(s => ({
    date: format(new Date(s.scannedAt), "MMM d"),
    followers: s.followerCount ?? 0,
    engagement: parseFloat((s.avgEngagement ?? 0).toFixed(2)),
    views: Math.round(s.avgViews ?? 0),
  }));

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">14-Day Trend</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] text-muted-foreground mb-1">Followers</p>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={data}>
              <Line type="monotone" dataKey="followers" stroke={GOLD} strokeWidth={1.5} dot={false} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8, fontSize: 10 }}
                formatter={(v: any) => [Number(v).toLocaleString(), "Followers"]}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground mb-1">Avg Views</p>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={data}>
              <Line type="monotone" dataKey="views" stroke="#e879a0" strokeWidth={1.5} dot={false} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8, fontSize: 10 }}
                formatter={(v: any) => [Number(v).toLocaleString(), "Views"]}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function WatchlistCard({
  item,
  onRemove,
  onScan,
  scanning,
}: {
  item: any;
  onRemove: () => void;
  onScan: () => void;
  scanning: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: snapshots = [] } = useQuery<any[]>({
    queryKey: ["competitor-snapshots", item.id],
    queryFn: () => apiRequest("GET", `/api/competitor/watchlist/${item.id}/snapshots`),
    enabled: expanded,
  });

  const latest = snapshots[0];
  const previous = snapshots[1];

  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-pink-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.avatarUrl
            ? <img src={item.avatarUrl} alt={item.handle} className="w-full h-full object-cover" />
            : <Instagram className="w-4 h-4 text-pink-400" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">@{item.handle}</p>
            {item.displayName && item.displayName !== item.handle && (
              <span className="text-[10px] text-muted-foreground">{item.displayName}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {item.lastScannedAt ? (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Scanned {formatDistanceToNow(new Date(item.lastScannedAt), { addSuffix: true })}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Not yet scanned</span>
            )}
            {latest?.followerCount && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                {(latest.followerCount).toLocaleString()} followers
                <DeltaBadge current={latest.followerCount} previous={previous?.followerCount ?? null} />
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={onScan}
            disabled={scanning}
            className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
            title="Scan now"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(e => !e)}
            className="h-7 w-7 p-0 hover:bg-muted/40"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="h-7 w-7 p-0 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick stats row */}
      {latest && (
        <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-border border-t border-border px-2 py-2">
          <StatChip icon={Users} val={latest.followerCount ? `${(latest.followerCount / 1000).toFixed(1)}k` : "—"} label="Followers" color="text-primary" />
          <StatChip icon={Eye} val={latest.avgViews ? `${Math.round(latest.avgViews).toLocaleString()}` : "—"} label="Avg Views" color="text-blue-400" />
          <StatChip icon={Heart} val={latest.avgLikes ? Math.round(latest.avgLikes).toLocaleString() : "—"} label="Avg Likes" color="text-pink-400" />
          <StatChip icon={MessageCircle} val={latest.avgComments ? Math.round(latest.avgComments) : "—"} label="Comments" />
          <StatChip icon={Activity} val={latest.avgEngagement ? `${(latest.avgEngagement).toFixed(1)}%` : "—"} label="Engagement" color="text-green-400" />
        </div>
      )}

      {/* Expanded: trend charts + recent posts */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <SnapshotChart snapshots={snapshots} />

          {/* Bio */}
          {latest?.bio && (
            <div className="bg-muted/10 border border-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Bio</p>
              <p className="text-xs text-foreground leading-relaxed">{latest.bio}</p>
            </div>
          )}

          {/* Recent Posts */}
          {latest?.recentPosts?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Recent Posts</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(latest.recentPosts as any[]).slice(0, 5).map((post: any, i: number) => (
                  <a
                    key={i}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-xl overflow-hidden bg-muted/30 border border-border hover:border-primary/40 transition-colors"
                  >
                    {post.thumbnail
                      ? <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Instagram className="w-4 h-4 text-muted-foreground" /></div>}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <p className="text-[9px] text-white font-bold">{post.views ? `${(post.views / 1000).toFixed(1)}k` : ""} views</p>
                      <p className="text-[9px] text-white">{post.likes ? `${(post.likes / 1000).toFixed(1)}k` : ""} ❤️</p>
                    </div>
                    {post.type === "reel" && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-black/60 rounded-full flex items-center justify-center">
                        <span className="text-[6px] text-white">▶</span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {snapshots.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No snapshot data yet — click scan to pull the latest.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompetitorWatchlist({ useAdmin = false, activeClientId = "" }: { useAdmin?: boolean; activeClientId?: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const { data: watchlist = [], isLoading: loadingList } = useQuery<any[]>({
    queryKey: ["competitor-watchlist"],
    queryFn: () => apiRequest("GET", "/api/competitor/watchlist"),
  });

  const { data: alerts = [] } = useQuery<any[]>({
    queryKey: ["competitor-alerts"],
    queryFn: () => apiRequest("GET", "/api/competitor/alerts"),
  });

  const unreadCount = (alerts as any[]).filter((a: any) => !a.isRead).length;

  const addMutation = useMutation({
    mutationFn: (competitorUrl: string) => apiRequest("POST", "/api/competitor/watchlist", { competitorUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitor-watchlist"] });
      setNewUrl("");
      toast({ title: "Competitor added to watchlist" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/competitor/watchlist/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitor-watchlist"] });
      toast({ title: "Removed from watchlist" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/competitor/alerts/mark-read", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-alerts"] }),
  });

  const handleAdd = async () => {
    const url = normalizeUrl(newUrl);
    if (!url) return toast({ title: "Enter a valid Instagram URL or @handle", variant: "destructive" });
    setAdding(true);
    try {
      await addMutation.mutateAsync(url);
    } finally {
      setAdding(false);
    }
  };

  const handleScan = async (id: string) => {
    setScanningId(id);
    try {
      await apiRequest("POST", `/api/competitor/watchlist/${id}/scan`, {});
      qc.invalidateQueries({ queryKey: ["competitor-watchlist"] });
      qc.invalidateQueries({ queryKey: ["competitor-snapshots", id] });
      qc.invalidateQueries({ queryKey: ["competitor-alerts"] });
      toast({ title: "Scan complete" });
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setScanningId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Competitor Watch List</h3>
          <p className="text-xs text-muted-foreground">Track up to 7 Instagram accounts — auto-scanned daily at 8AM UTC</p>
        </div>
        <button
          onClick={() => { setAlertsOpen(o => !o); if (!alertsOpen && unreadCount > 0) markReadMutation.mutate(); }}
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors text-xs font-semibold"
        >
          {unreadCount > 0 ? <Bell className="w-3.5 h-3.5 text-yellow-400" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
          Alerts
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Alerts panel */}
      {alertsOpen && (
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs font-bold text-foreground">Recent Alerts</p>
            <button onClick={() => setAlertsOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {(alerts as any[]).length === 0 && (
              <div className="py-8 text-center">
                <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-xs text-muted-foreground">No alerts yet — alerts fire when competitors change</p>
              </div>
            )}
            {(alerts as any[]).map((alert: any) => {
              const Icon = ALERT_ICONS[alert.alertType] ?? Bell;
              const cls = ALERT_COLORS[alert.alertType] ?? "text-muted-foreground bg-muted/10 border-border";
              return (
                <div key={alert.id} className={`flex items-start gap-3 px-4 py-3 ${!alert.isRead ? "bg-primary/3" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{alert.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!alert.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add competitor */}
      <div className="bg-card border border-card-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-foreground mb-3">Add a competitor to track</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="@handle or instagram.com/handle"
              className="h-9 pl-8 text-sm bg-muted/20 border-border"
              onKeyDown={e => e.key === "Enter" && !adding && handleAdd()}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={adding || !newUrl.trim() || (watchlist as any[]).length >= 7}
            size="sm"
            className="h-9 gap-1.5"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {adding ? "Adding…" : "Add"}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-muted-foreground">
            {(watchlist as any[]).length}/7 slots used · Initial scan happens on add
          </p>
          {adding && (
            <p className="text-[10px] text-primary animate-pulse">Scraping profile data…</p>
          )}
        </div>
      </div>

      {/* Watchlist cards */}
      {loadingList ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading watchlist…</span>
        </div>
      ) : (watchlist as any[]).length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Instagram className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">No competitors tracked yet</p>
          <p className="text-xs text-muted-foreground">Add up to 7 Instagram accounts above to start monitoring them</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(watchlist as any[]).map((item: any) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onRemove={() => removeMutation.mutate(item.id)}
              onScan={() => handleScan(item.id)}
              scanning={scanningId === item.id}
            />
          ))}
        </div>
      )}

      {/* Info footer */}
      <div className="flex items-start gap-2 p-3 bg-muted/10 border border-border rounded-xl">
        <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Auto-scan runs daily at 8AM UTC and checks followers, bio, post count, and engagement.
          Alerts fire for: follower changes ≥5%, bio edits, new posts, and engagement spikes ≥20%.
        </p>
      </div>
    </div>
  );
}
