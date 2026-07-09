import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Instagram, Youtube, Eye, Heart, MessageCircle, Bookmark, Users, TrendingUp,
  Star, FileText, Clock, Plus, Trash2, Pencil, BarChart2, ArrowLeft, Bell, ChevronRight, RefreshCw, Crown,
  DollarSign, MousePointerClick, Target, Zap, Link, CheckCircle2, AlertTriangle, ExternalLink,
  Send, MessageSquare, Play, Pause, Brain, History, Rocket, Check
} from "lucide-react";
import { format, subWeeks, isAfter } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

function fmtF(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

// ── Admin IG Follower Panel ────────────────────────────────────────────────────
function AdminIgProfileCard({ profile, clientId, onScan, onDelete, scanning }: {
  profile: any; clientId: string; onScan: () => void; onDelete: () => void; scanning: boolean;
}) {
  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/ig-tracker", profile.id, "history", clientId],
    queryFn: () => apiRequest("GET", `/api/ig-tracker/${profile.id}/history?clientId=${clientId}`),
  });

  const snap = profile.latestSnapshot;
  const prev = profile.prevSnapshot;
  const delta = snap && prev ? snap.followersCount - prev.followersCount : null;

  const chartData = [...history]
    .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime())
    .slice(-14)
    .map(h => ({ v: h.followersCount }));

  return (
    <Card className="border border-card-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {profile.profilePic
            ? <img src={profile.profilePic} alt={profile.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            : <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0"><Instagram className="w-5 h-5 text-pink-400" /></div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">@{profile.username}</p>
                {profile.fullName && <p className="text-xs text-muted-foreground">{profile.fullName}</p>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={onScan} disabled={scanning} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
                </button>
                <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-end justify-between mt-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-foreground">{snap ? fmtF(snap.followersCount) : "–"}</p>
                <p className="text-[10px] text-muted-foreground">followers</p>
                {delta !== null && delta !== 0 && (
                  <span className={`text-xs font-semibold mt-0.5 block ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {delta > 0 ? "+" : ""}{fmtF(delta)} since last scan
                  </span>
                )}
              </div>
              {chartData.length > 2 && (
                <div className="w-28 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Line type="monotone" dataKey="v" dot={false} stroke="#ec4899" strokeWidth={1.5} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "none", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [fmtF(v), "Followers"]} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminIgFollowerPanel({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [scanningId, setScanningId] = useState<number | null>(null);

  const { data: profiles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/ig-tracker", "admin", clientId],
    queryFn: () => apiRequest("GET", `/api/ig-tracker?clientId=${clientId}`),
    enabled: !!clientId,
  });

  const addMutation = useMutation({
    mutationFn: (u: string) => apiRequest("POST", "/api/ig-tracker", { username: u, clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker", "admin", clientId] });
      toast({ title: "Profile added & scanned!" });
      setUsername("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ig-tracker/${id}?clientId=${clientId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker", "admin", clientId] }); toast({ title: "Profile removed" }); },
  });

  async function handleScan(id: number) {
    setScanningId(id);
    try {
      await apiRequest("POST", `/api/ig-tracker/${id}/scan`, { clientId });
      queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker", "admin", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker", id, "history", clientId] });
      toast({ title: "Scan complete" });
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanningId(null);
    }
  }

  const totalFollowers = profiles.reduce((s: number, p: any) => s + (p.latestSnapshot?.followersCount ?? 0), 0);
  const totalGain = profiles.reduce((s: number, p: any) => {
    const latest = p.latestSnapshot?.followersCount ?? 0;
    const prev = p.prevSnapshot?.followersCount ?? latest;
    return s + (latest - prev);
  }, 0);

  return (
    <div className="space-y-4 border-t border-border pt-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-400" /> IG Follower Growth Tracker
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Track this Elite member's Instagram profiles</p>
        </div>
        {profiles.length > 0 && (
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Total Followers</p>
              <p className="text-sm font-bold text-foreground">{fmtF(totalFollowers)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Gain</p>
              <p className={`text-sm font-bold ${totalGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalGain > 0 ? "+" : ""}{fmtF(totalGain)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Instagram username (e.g. cristiano)"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === "Enter" && username.trim() && addMutation.mutate(username.trim())}
          className="h-9 text-sm"
        />
        <Button size="sm" disabled={!username.trim() || addMutation.isPending} onClick={() => addMutation.mutate(username.trim())} className="h-9 shrink-0">
          {addMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          {addMutation.isPending ? "Scanning..." : "Add"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)}</div>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pink-500/20 p-6 text-center">
          <Instagram className="w-6 h-6 text-pink-400/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No profiles tracked yet — add one above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p: any) => (
            <AdminIgProfileCard
              key={p.id}
              profile={p}
              clientId={clientId}
              scanning={scanningId === p.id}
              onScan={() => handleScan(p.id)}
              onDelete={() => deleteMutation.mutate(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const FUNNEL_LABELS: Record<string, string> = { top: "Top of Funnel", middle: "Middle of Funnel", bottom: "Bottom of Funnel" };
const CONTENT_TYPE_LABELS: Record<string, string> = { reel: "Reel", carousel: "Carousel", story: "Story", video: "Video", post: "Post" };
const FUNNEL_COLORS: Record<string, string> = {
  top: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  middle: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  bottom: "bg-green-500/10 text-green-400 border-green-500/20",
};
const TYPE_COLORS: Record<string, string> = {
  reel: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  carousel: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  story: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  video: "bg-red-500/10 text-red-400 border-red-500/20",
  post: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function PostFormAdmin({ clientId, platform, post, onClose }: { clientId: string; platform: string; post?: any; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!post;
  const isYt = platform === "youtube";

  const { data: trackedProfiles = [] } = useQuery<any[]>({
    queryKey: ["/api/ig-tracker", "admin", clientId],
    queryFn: () => apiRequest("GET", `/api/ig-tracker?clientId=${clientId}`),
    enabled: !isYt && !!clientId,
  });

  const [form, setForm] = useState({
    title: post?.title || "",
    postUrl: post?.postUrl || "",
    postDate: post ? format(new Date(post.postDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    contentType: post?.contentType || (isYt ? "video" : "reel"),
    funnelStage: post?.funnelStage || "top",
    views: post?.views ?? 0,
    likes: post?.likes ?? 0,
    comments: post?.comments ?? 0,
    saves: post?.saves ?? 0,
    followersGained: post?.followersGained ?? 0,
    subscribersGained: post?.subscribersGained ?? 0,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? apiRequest("PATCH", `/api/content/${post.id}`, data)
      : apiRequest("POST", "/api/content", { ...data, clientId, platform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${clientId}`] });
      toast({ title: isEdit ? "Post updated!" : "Post logged!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      postDate: new Date(form.postDate).toISOString(),
      views: +form.views, likes: +form.likes, comments: +form.comments,
      saves: +form.saves, followersGained: +form.followersGained, subscribersGained: +form.subscribersGained,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>{isYt ? "Video Title" : "Title / Description"}</Label>
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder={isYt ? "e.g. How I built my business" : "e.g. Behind the scenes"} className="mt-1" />
        </div>
        <div className="col-span-2">
          <Label>{isYt ? "Video Link (optional)" : "Post Link (optional)"}</Label>
          <Input value={form.postUrl} onChange={e => set("postUrl", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>{isYt ? "Upload Date" : "Date Posted"}</Label>
          <Input type="date" value={form.postDate} onChange={e => set("postDate", e.target.value)} className="mt-1" required />
        </div>
        <div>
          <Label>Content Type</Label>
          <Select value={form.contentType} onValueChange={v => set("contentType", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {isYt ? <SelectItem value="video">Video</SelectItem> : (
                <>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        {!isYt && (
          <div className="col-span-2">
            <Label>Funnel Stage</Label>
            <Select value={form.funnelStage} onValueChange={v => set("funnelStage", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top of Funnel</SelectItem>
                <SelectItem value="middle">Middle of Funnel</SelectItem>
                <SelectItem value="bottom">Bottom of Funnel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Metrics</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Views</Label><Input type="number" min="0" value={form.views} onChange={e => set("views", e.target.value)} className="mt-1 h-9" /></div>
          {!isYt && (
            <>
              <div><Label className="text-xs">Likes</Label><Input type="number" min="0" value={form.likes} onChange={e => set("likes", e.target.value)} className="mt-1 h-9" /></div>
              <div><Label className="text-xs">Comments</Label><Input type="number" min="0" value={form.comments} onChange={e => set("comments", e.target.value)} className="mt-1 h-9" /></div>
              <div><Label className="text-xs">Saves</Label><Input type="number" min="0" value={form.saves} onChange={e => set("saves", e.target.value)} className="mt-1 h-9" /></div>
            </>
          )}
          {/* Live follower reference — Instagram only */}
          {!isYt && trackedProfiles.length > 0 && (
            <div className="col-span-2 rounded-lg bg-pink-500/5 border border-pink-500/20 p-2.5">
              <p className="text-[10px] font-semibold text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> Live Follower Counts (from tracker)
              </p>
              <div className="flex flex-wrap gap-3">
                {trackedProfiles.map((p: any) => {
                  const snap = p.latestSnapshot;
                  const prev = p.prevSnapshot;
                  const delta = snap && prev ? snap.followersCount - prev.followersCount : null;
                  return (
                    <div key={p.id} className="flex items-center gap-1.5">
                      {p.profilePic
                        ? <img src={p.profilePic} alt={p.username} className="w-5 h-5 rounded-full object-cover" />
                        : <Instagram className="w-3.5 h-3.5 text-pink-400" />
                      }
                      <span className="text-[11px] text-muted-foreground">@{p.username}</span>
                      <span className="text-[11px] font-bold text-foreground">{snap ? fmtF(snap.followersCount) : "–"}</span>
                      {delta !== null && delta !== 0 && (
                        <span className={`text-[10px] font-semibold ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {delta > 0 ? "+" : ""}{fmtF(delta)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Reference: enter how many followers <em>this post</em> generated below.</p>
            </div>
          )}

          <div>
            <Label className="text-xs">{isYt ? "Subscribers Gained" : "Followers Gained"}</Label>
            <Input type="number" min="0" value={isYt ? form.subscribersGained : form.followersGained} onChange={e => set(isYt ? "subscribersGained" : "followersGained", e.target.value)} className="mt-1 h-9" />
          </div>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Log Post"}
        </Button>
      </div>
    </form>
  );
}

function AdminReportGenerator({ posts, platform }: { posts: any[]; platform: "instagram" | "youtube" }) {
  const [period, setPeriod] = useState<2 | 4 | null>(null);

  if (!period) {
    return (
      <Card className="border border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" /> Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Generate a performance summary for a specific time period.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 flex flex-col gap-0.5" onClick={() => setPeriod(2)} data-testid="admin-report-2weeks">
              <span className="text-sm font-semibold">Last 2 Weeks</span>
              <span className="text-[10px] text-muted-foreground">14-day summary</span>
            </Button>
            <Button variant="outline" className="h-12 flex flex-col gap-0.5" onClick={() => setPeriod(4)} data-testid="admin-report-4weeks">
              <span className="text-sm font-semibold">Last 4 Weeks</span>
              <span className="text-[10px] text-muted-foreground">28-day summary</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cutoff = subWeeks(new Date(), period);
  const filtered = posts.filter(p => isAfter(new Date(p.postDate), cutoff));
  const best = filtered.length > 0 ? [...filtered].sort((a, b) => b.views - a.views)[0] : null;
  const totalViews = filtered.reduce((s, p) => s + p.views, 0);
  const totalFollowers = filtered.reduce((s, p) => s + p.followersGained + p.subscribersGained, 0);
  const totalEngagement = filtered.reduce((s, p) => s + p.likes + p.comments + p.saves, 0);

  return (
    <Card className="border border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" /> Last {period * 7} Days Report
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPeriod(null)}>
            <ArrowLeft className="w-3 h-3 mr-1" /> New Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No posts in the last {period * 7} days.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Posts", value: filtered.length, icon: FileText, color: "text-primary" },
                { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
                platform === "instagram"
                  ? { label: "Total Engagement", value: totalEngagement.toLocaleString(), icon: Heart, color: "text-red-400" }
                  : { label: "Subscribers Gained", value: `+${filtered.reduce((s, p) => s + p.subscribersGained, 0)}`, icon: Users, color: "text-green-400" },
                { label: "Followers Gained", value: `+${totalFollowers}`, icon: Users, color: "text-green-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-card border border-card-border rounded-xl p-3">
                  <Icon className={`w-4 h-4 ${color} mb-1.5`} />
                  <p className="text-lg font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            {best && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                <Star className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-green-400">Best Performing</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{best.title || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{best.views.toLocaleString()} views · {CONTENT_TYPE_LABELS[best.contentType]} · {format(new Date(best.postDate), "MMM d")}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ClientPostsPanel({ clientId, platform }: { clientId: string; platform: "instagram" | "youtube" }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const isYt = platform === "youtube";

  const { data: _allPosts, isLoading } = useQuery<any[]>({
    queryKey: [`/api/content/${clientId}`],
    enabled: !!clientId,
  });
  const allPosts = _allPosts ?? [];

  const posts = allPosts.filter(p => p.platform === platform);

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${clientId}`] });
      toast({ title: "Post deleted" });
    },
  });

  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalGrowth = posts.reduce((s, p) => s + p.followersGained + p.subscribersGained, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-card-border">
          <CardContent className="p-4">
            {isYt ? <Youtube className="w-5 h-5 text-red-400 mb-2" /> : <Instagram className="w-5 h-5 text-pink-400 mb-2" />}
            <p className="text-xl font-bold text-foreground">{posts.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{isYt ? "Videos Posted" : "Posts Logged"}</p>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="p-4">
            <Eye className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-xl font-bold text-foreground">{totalViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Views</p>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="p-4">
            <Users className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-xl font-bold text-foreground">+{totalGrowth}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{isYt ? "Subscribers Gained" : "Followers Gained"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">
          {isYt ? `YouTube Videos (${posts.length})` : `Instagram Posts (${posts.length})`}
        </h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid={`admin-log-${platform}`}>
              <Plus className="w-4 h-4 mr-1.5" /> {isYt ? "Log Video" : "Log Post"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{isYt ? "Log YouTube Video" : "Log Instagram Post"}</DialogTitle></DialogHeader>
            <PostFormAdmin clientId={clientId} platform={platform} onClose={() => setAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          {isYt ? <Youtube className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" /> : <Instagram className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />}
          <p className="text-sm text-muted-foreground">No {isYt ? "videos" : "posts"} logged yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <Card key={post.id} data-testid={`admin-${platform}-post-${post.id}`} className="border border-card-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {isYt && (
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Youtube className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-foreground truncate">{post.title || "Untitled"}</span>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${TYPE_COLORS[post.contentType] || ""}`}>{CONTENT_TYPE_LABELS[post.contentType]}</Badge>
                      {!isYt && post.funnelStage && <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${FUNNEL_COLORS[post.funnelStage] || ""}`}>{FUNNEL_LABELS[post.funnelStage]}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{format(new Date(post.postDate), "MMMM d, yyyy")}</p>
                    {post.postUrl && <a href={post.postUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline block mb-2 truncate">{post.postUrl}</a>}
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" />{post.views.toLocaleString()}</span>
                      {!isYt && (
                        <>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="w-3 h-3" />{post.likes.toLocaleString()}</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="w-3 h-3" />{post.comments.toLocaleString()}</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Bookmark className="w-3 h-3" />{post.saves.toLocaleString()}</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />+{post.followersGained}</span>
                        </>
                      )}
                      {isYt && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />+{post.subscribersGained} subs</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button onClick={() => setEditPost(post)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </DialogTrigger>
                      {editPost?.id === post.id && (
                        <DialogContent className="max-w-lg">
                          <DialogHeader><DialogTitle>Edit {isYt ? "Video" : "Post"}</DialogTitle></DialogHeader>
                          <PostFormAdmin clientId={clientId} platform={platform} post={editPost} onClose={() => setEditPost(null)} />
                        </DialogContent>
                      )}
                    </Dialog>
                    <button onClick={() => del.mutate(post.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-accent">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-6">
        <AdminReportGenerator posts={posts} platform={platform} />
      </div>

      {/* IG Follower Tracker — Instagram tab only */}
      {platform === "instagram" && <AdminIgFollowerPanel clientId={clientId} />}
    </div>
  );
}

// ── Meta Ads Status badges ─────────────────────────────────────────────────
const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PAUSED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  DELETED: "bg-red-500/10 text-red-400 border-red-500/20",
  ARCHIVED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

function fmtCurrency(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "$0";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRoas(v: string | null) {
  if (!v) return "–";
  const n = parseFloat(v);
  if (isNaN(n)) return "–";
  return n.toFixed(2) + "x";
}

function fmtPct(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "0%";
  return n.toFixed(2) + "%";
}

// ── Admin Meta Ads Panel ────────────────────────────────────────────────────
function AdminMetaAdsPanel({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [tokenInput, setTokenInput] = useState("");
  const [accountIdInput, setAccountIdInput] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // AI agent (campaign creator) state
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessages, setAgentMessages] = useState<Array<{ role: "user" | "assistant"; content: string; error?: boolean }>>([]);

  // Scheduled agent alerts state
  const [runningAlert, setRunningAlert] = useState<"24h_update" | "72h_creative_alert" | null>(null);

  // Campaign action state
  const [scalingId, setScalingId] = useState<string | null>(null);
  const [scaleBudget, setScaleBudget] = useState("");

  const { data: status, isLoading: statusLoading } = useQuery<any>({
    queryKey: ["/api/meta-ads/status", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/status/${clientId}`),
    enabled: !!clientId,
  });

  const { data: campaigns = [], isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/campaigns", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/campaigns/${clientId}`),
    enabled: !!clientId && status?.connected,
  });

  const { data: launchLog = [] } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/launch-log", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/launch-log/${clientId}`),
    enabled: !!clientId && status?.connected,
  });

  const { data: agentLogs = [], refetch: refetchAgentLogs } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/agent-logs", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/agent-logs/${clientId}?limit=20`),
    enabled: !!clientId && status?.connected,
    refetchInterval: 60_000, // poll every minute after manual runs
  });

  const { data: unreadData, refetch: refetchUnread } = useQuery<{ count: number }>({
    queryKey: ["/api/meta-ads/agent-logs/unread", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/agent-logs/${clientId}/unread-count`),
    enabled: !!clientId && status?.connected,
  });
  const unreadCount = unreadData?.count || 0;

  const connectMutation = useMutation({
    mutationFn: (data: { accessToken: string; adAccountId: string }) =>
      apiRequest("POST", `/api/meta-ads/connect/${clientId}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta-ads/status", clientId] });
      toast({ title: `Connected — ${data.adAccountName}` });
      setTokenInput(""); setAccountIdInput(""); setAccounts([]);
    },
    onError: (e: any) => toast({ title: "Connection failed", description: e.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/meta-ads/disconnect/${clientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta-ads/status", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meta-ads/campaigns", clientId] });
      toast({ title: "Disconnected" });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: ({ campaignId, body }: { campaignId: string; body: any }) =>
      apiRequest("PATCH", `/api/meta-ads/campaign/${clientId}/${campaignId}`, body),
    onSuccess: () => { refetchCampaigns(); toast({ title: "Campaign updated" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteCampaign = useMutation({
    mutationFn: (campaignId: string) =>
      apiRequest("DELETE", `/api/meta-ads/campaign/${clientId}/${campaignId}`),
    onSuccess: () => { refetchCampaigns(); toast({ title: "Campaign deleted" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  async function handleFetchAccounts() {
    if (!tokenInput.trim()) return;
    setFetchingAccounts(true);
    try {
      const data = await apiRequest("POST", "/api/meta-ads/list-accounts", { accessToken: tokenInput.trim() });
      setAccounts(data);
      if (data.length === 1) setAccountIdInput(data[0].id);
    } catch (e: any) {
      toast({ title: "Failed to fetch accounts", description: e.message, variant: "destructive" });
    } finally {
      setFetchingAccounts(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const data = await apiRequest("POST", `/api/meta-ads/sync/${clientId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/meta-ads/campaigns", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meta-ads/status", clientId] });
      toast({ title: `Synced — ${data.campaignsCount} campaigns` });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleRunAlert(type: "24h_update" | "72h_creative_alert") {
    setRunningAlert(type);
    try {
      await apiRequest("POST", `/api/meta-ads/agent-run/${clientId}`, { type });
      refetchAgentLogs();
      refetchUnread();
      toast({ title: type === "24h_update" ? "24h update generated" : "Creative alert generated" });
    } catch (e: any) {
      toast({ title: "Agent run failed", description: e.message, variant: "destructive" });
    } finally {
      setRunningAlert(null);
    }
  }

  async function handleMarkAllRead() {
    await apiRequest("PATCH", `/api/meta-ads/agent-logs/${clientId}/read-all`, {});
    refetchAgentLogs();
    refetchUnread();
  }

  async function handleAgentSend() {
    if (!agentInput.trim() || agentLoading) return;
    const instruction = agentInput.trim();
    setAgentInput("");
    setAgentMessages(m => [...m, { role: "user", content: instruction }]);
    setAgentLoading(true);
    try {
      const data = await apiRequest("POST", `/api/meta-ads/agent/${clientId}`, { instruction });
      const lines = [
        data.explanation || "",
        "",
        ...(data.created || []).map((c: any) =>
          `✓ ${c.campaignName} (PAUSED)\n` +
          (c.adSets || []).map((s: any) => `  └ ${s.name}`).join("\n")
        ),
        "",
        data.message,
      ].join("\n").trim();
      setAgentMessages(m => [...m, { role: "assistant", content: lines }]);
      queryClient.invalidateQueries({ queryKey: ["/api/meta-ads/launch-log", clientId] });
      refetchCampaigns();
    } catch (e: any) {
      const msg = e.message || "Failed";
      const isPerm = msg.toLowerCase().includes("ads_management") || msg.toLowerCase().includes("permission");
      setAgentMessages(m => [...m, {
        role: "assistant",
        content: isPerm
          ? "⚠️ ads_management permission required.\n\n1. Go to developers.facebook.com → your app\n2. Add Product → Marketing API\n3. Request: ads_management\n4. Works immediately on your own account in dev mode\n5. Client accounts: Meta App Review needed (1–3 weeks)"
          : `Error: ${msg}`,
        error: true,
      }]);
    } finally {
      setAgentLoading(false);
    }
  }

  const totalSpend = campaigns.reduce((s, c) => s + parseFloat(c.spend || "0"), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const avgRoas = campaigns.filter(c => c.roas).length > 0
    ? campaigns.filter(c => c.roas).reduce((s, c) => s + parseFloat(c.roas), 0) / campaigns.filter(c => c.roas).length
    : null;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  if (statusLoading) {
    return <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />;
  }

  return (
    <div className="space-y-4 border-t border-border pt-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-400" /> Meta Ads
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status?.connected ? "Track performance & manage campaigns with AI" : "Connect client's Meta Ads account"}
          </p>
        </div>
        {status?.connected && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-red-400 hover:text-red-300" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}>
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {/* Not connected — setup form */}
      {!status?.connected && (
        <Card className="border border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Link className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Connect Meta Ads Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter the client's Meta Ads access token. Needs <code className="text-blue-400">ads_read</code> to track, <code className="text-blue-400">ads_management</code> to create & manage.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Access Token</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="EAAj... (Meta Ads access token)" className="h-9 text-xs font-mono" />
                  <Button size="sm" variant="outline" className="h-9 shrink-0 text-xs" onClick={handleFetchAccounts} disabled={!tokenInput.trim() || fetchingAccounts}>
                    {fetchingAccounts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Fetch Accounts"}
                  </Button>
                </div>
              </div>
              {accounts.length > 0 && (
                <div>
                  <Label className="text-xs">Ad Account</Label>
                  <Select value={accountIdInput} onValueChange={setAccountIdInput}>
                    <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Select ad account..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} — {a.id} ({a.currency})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {accounts.length === 0 && tokenInput && (
                <div>
                  <Label className="text-xs">Ad Account ID (manual)</Label>
                  <Input value={accountIdInput} onChange={e => setAccountIdInput(e.target.value)} placeholder="act_123456789 or 123456789" className="mt-1 h-9 text-xs font-mono" />
                </div>
              )}
              <Button className="w-full h-9 text-xs" disabled={!tokenInput.trim() || !accountIdInput.trim() || connectMutation.isPending}
                onClick={() => connectMutation.mutate({ accessToken: tokenInput.trim(), adAccountId: accountIdInput.trim() })}>
                {connectMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
                {connectMutation.isPending ? "Connecting..." : "Save & Connect"}
              </Button>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground/70">How to get the token:</p>
              <p>1. Meta Business Manager → Settings → System Users</p>
              <p>2. Create System User with <code>ads_read</code> + <code>ads_management</code> on client's ad account</p>
              <p>3. Generate access token and paste above</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected — tabbed view */}
      {status?.connected && (
        <div className="space-y-4">
          {/* Account info bar */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{status.adAccountName || status.adAccountId}</p>
              <p className="text-[10px] text-muted-foreground">
                {status.lastSyncedAt ? `Last synced ${format(new Date(status.lastSyncedAt), "MMM d, h:mm a")}` : "Not yet synced — click Sync above"}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20">Connected</Badge>
          </div>

          {/* Summary metric cards */}
          {campaigns.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Spend (30d)", value: fmtCurrency(totalSpend), icon: DollarSign, color: "text-blue-400" },
                { label: "Avg ROAS", value: avgRoas !== null ? fmtRoas(String(avgRoas)) : "–", icon: TrendingUp, color: "text-emerald-400" },
                { label: "Conversions", value: totalConversions.toLocaleString(), icon: Target, color: "text-purple-400" },
                { label: "Avg CTR", value: fmtPct(avgCtr), icon: MousePointerClick, color: "text-orange-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="border border-card-border">
                  <CardContent className="p-4">
                    <Icon className={`w-4 h-4 ${color} mb-2`} />
                    <p className="text-xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Tabs: Overview | Manage */}
          <Tabs defaultValue="overview">
            <TabsList className="bg-card border border-card-border">
              <TabsTrigger value="overview" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart2 className="w-3.5 h-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="manage" className="text-xs gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Rocket className="w-3.5 h-3.5" /> Manage & Create
              </TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs gap-1.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white relative">
                <Bell className="w-3.5 h-3.5" /> AI Alerts
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Overview tab: read-only campaign table ── */}
            <TabsContent value="overview" className="mt-4">
              {campaignsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />)}</div>
              ) : campaigns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-blue-500/20 p-8 text-center">
                  <BarChart2 className="w-8 h-8 text-blue-400/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No campaigns yet — click Sync to pull data from Meta</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Campaign</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Status</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Spend</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Reach</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">CTR</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">CPC</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">ROAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c: any) => (
                        <tr key={c.campaign_id} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground truncate max-w-[180px]">{c.campaign_name || "Untitled"}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{c.objective?.toLowerCase().replace(/_/g, " ") || "—"}</p>
                          </td>
                          <td className="px-3 py-3 hidden sm:table-cell">
                            <Badge variant="outline" className={`text-[10px] border ${CAMPAIGN_STATUS_COLORS[c.status] || "text-muted-foreground"}`}>{c.status || "–"}</Badge>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-foreground">{fmtCurrency(c.spend || "0")}</td>
                          <td className="px-3 py-3 text-right text-muted-foreground hidden md:table-cell">{(c.reach || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-muted-foreground hidden md:table-cell">{fmtPct(c.ctr || "0")}</td>
                          <td className="px-3 py-3 text-right text-muted-foreground hidden lg:table-cell">{fmtCurrency(c.cpc || "0")}</td>
                          <td className="px-3 py-3 text-right font-semibold">
                            <span className={parseFloat(c.roas) >= 2 ? "text-emerald-400" : parseFloat(c.roas) > 0 ? "text-yellow-400" : "text-muted-foreground"}>
                              {fmtRoas(c.roas)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/10">
                        <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Totals</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground sm:hidden">Totals</td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold text-foreground">{fmtCurrency(totalSpend)}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground hidden md:table-cell">{totalImpressions.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground hidden md:table-cell">{fmtPct(avgCtr)}</td>
                        <td className="px-3 py-2.5 hidden lg:table-cell" />
                        <td className="px-3 py-2.5 text-right text-xs font-bold text-emerald-400">{avgRoas !== null ? fmtRoas(String(avgRoas)) : "–"}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ── Manage & Create tab ── */}
            <TabsContent value="manage" className="mt-4 space-y-5">

              {/* AI Agent */}
              <Card className="border border-purple-500/20 bg-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" /> AI Campaign Creator
                    <Badge variant="outline" className="text-[10px] ml-auto border-purple-500/20 text-purple-400">Requires ads_management</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agentMessages.length === 0 && (
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Create a $50/day lead gen campaign, women 25-45 in US",
                        "Launch retargeting campaign $20/day, conversions objective",
                        "3-adset cold traffic $100/day CBO: broad + interest + lookalike",
                      ].map(ex => (
                        <button key={ex} onClick={() => setAgentInput(ex)}
                          className="text-[10px] text-muted-foreground border border-border rounded-full px-2.5 py-1 hover:bg-accent/30 transition-colors">
                          {ex}
                        </button>
                      ))}
                    </div>
                  )}
                  {agentMessages.length > 0 && (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto">
                      {agentMessages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                          {msg.role === "assistant" && (
                            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Brain className="w-2.5 h-2.5 text-purple-400" />
                            </div>
                          )}
                          <div className={`rounded-xl px-3 py-2 text-xs max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                            msg.role === "user" ? "bg-primary/10 border border-primary/20 text-foreground"
                            : msg.error ? "bg-red-500/10 border border-red-500/20 text-red-300"
                            : "bg-card border border-border text-muted-foreground"
                          }`}>{msg.content}</div>
                        </div>
                      ))}
                      {agentLoading && (
                        <div className="flex gap-2">
                          <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <RefreshCw className="w-2.5 h-2.5 text-purple-400 animate-spin" />
                          </div>
                          <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-muted-foreground">Creating campaign...</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={agentInput}
                      onChange={e => setAgentInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAgentSend()}
                      placeholder="e.g. Create a $30/day lead gen campaign, women 30-50, US"
                      className="text-xs h-9"
                      disabled={agentLoading}
                    />
                    <Button size="sm" className="h-9 px-3 shrink-0" onClick={handleAgentSend} disabled={!agentInput.trim() || agentLoading}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign controls */}
              {campaigns.length > 0 && (
                <Card className="border border-card-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Campaign Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Campaign</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Spend</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">ROAS</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c: any) => (
                          <tr key={c.campaign_id} className="border-b border-border last:border-0">
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-foreground truncate max-w-[160px]">{c.campaign_name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{c.objective?.toLowerCase().replace(/_/g, " ")}</p>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <Badge variant="outline" className={`text-[10px] border ${CAMPAIGN_STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge>
                            </td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground hidden md:table-cell">{fmtCurrency(c.spend || "0")}</td>
                            <td className={`px-3 py-2.5 text-right font-semibold hidden md:table-cell ${parseFloat(c.roas) >= 2 ? "text-emerald-400" : parseFloat(c.roas) > 0 ? "text-yellow-400" : "text-muted-foreground"}`}>
                              {fmtRoas(c.roas)}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                {c.status === "ACTIVE" ? (
                                  <button onClick={() => updateCampaign.mutate({ campaignId: c.campaign_id, body: { status: "PAUSED" } })}
                                    className="p-1.5 rounded hover:bg-yellow-500/10 text-yellow-400 transition-colors" title="Pause">
                                    <Pause className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button onClick={() => updateCampaign.mutate({ campaignId: c.campaign_id, body: { status: "ACTIVE" } })}
                                    className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors" title="Activate">
                                    <Play className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {scalingId === c.campaign_id ? (
                                  <div className="flex items-center gap-1">
                                    <Input value={scaleBudget} onChange={e => setScaleBudget(e.target.value)} placeholder="$/day" className="w-16 h-7 text-xs px-1.5" />
                                    <button onClick={() => {
                                      if (scaleBudget) updateCampaign.mutate({ campaignId: c.campaign_id, body: { dailyBudget: parseFloat(scaleBudget) } });
                                      setScalingId(null); setScaleBudget("");
                                    }} className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors">
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => setScalingId(c.campaign_id)}
                                    className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors" title="Set budget">
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button onClick={() => {
                                  if (confirm(`Delete "${c.campaign_name}"?`)) deleteCampaign.mutate(c.campaign_id);
                                }} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Launch log */}
              {launchLog.length > 0 && (
                <Card className="border border-card-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="w-4 h-4 text-muted-foreground" /> Launch History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {launchLog.slice(0, 8).map((log: any) => (
                      <div key={log.id} className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs ${log.status === "error" ? "border-red-500/20 bg-red-500/5" : "border-border"}`}>
                        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${log.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-muted-foreground truncate">{log.instruction}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {format(new Date(log.launched_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── AI Alerts tab ── */}
            <TabsContent value="alerts" className="mt-4 space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">AI Performance Alerts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Auto-runs daily at 8am (account update) and Mon+Thu at 9am (creative analysis). Trigger manually anytime.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {unreadCount > 0 && (
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleMarkAllRead}>
                      Mark all read
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleRunAlert("24h_update")}
                    disabled={!!runningAlert}
                  >
                    {runningAlert === "24h_update" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-yellow-400" />}
                    24h Update
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleRunAlert("72h_creative_alert")}
                    disabled={!!runningAlert}
                  >
                    {runningAlert === "72h_creative_alert" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 text-purple-400" />}
                    Creative Alert
                  </Button>
                </div>
              </div>

              {runningAlert && (
                <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-4 text-xs text-purple-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                  {runningAlert === "24h_update"
                    ? "Pulling account data + generating performance update..."
                    : "Analyzing all creatives, hook rates, ROAS per ad... (may take 30s)"}
                </div>
              )}

              {agentLogs.length === 0 && !runningAlert ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No alerts yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Auto-runs daily. Click "24h Update" or "Creative Alert" above to run now.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agentLogs.map((log: any) => (
                    <Card key={log.id} className={`border transition-colors ${log.is_read ? "border-border" : "border-purple-500/30 bg-purple-500/3"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            log.type === "72h_creative_alert"
                              ? "bg-purple-500/15"
                              : "bg-yellow-500/15"
                          }`}>
                            {log.type === "72h_creative_alert"
                              ? <Brain className="w-4 h-4 text-purple-400" />
                              : <Zap className="w-4 h-4 text-yellow-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                                log.type === "72h_creative_alert" ? "text-purple-400" : "text-yellow-400"
                              }`}>
                                {log.type === "72h_creative_alert" ? "Creative Alert" : "Daily Update"}
                              </span>
                              {!log.is_read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
                              )}
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                {format(new Date(log.created_at), "MMM d, yyyy · h:mm a")}
                              </span>
                            </div>
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                              {log.ai_summary}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

export default function AdminTracking() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: eliteClients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", { plan: "elite" }],
    queryFn: () => apiRequest("GET", "/api/clients?plan=elite"),
  });

  const selectedClient = eliteClients.find((c: any) => c.id === selectedClientId);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Elite Member Tracking</h1>
          <p className="text-muted-foreground mt-1">Content performance tracking for Elite tier members</p>
        </div>

        <Card className="border border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-400" /> Select Elite Member
                </Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger data-testid="admin-client-select">
                    <SelectValue placeholder="Choose an Elite member to view their tracking..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eliteClients.length === 0 ? (
                      <SelectItem value="none" disabled>No Elite members yet</SelectItem>
                    ) : eliteClients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedClient && (
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {selectedClient.name?.[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{selectedClient.name}</p>
                    {selectedClient.program && <p className="text-[10px] text-muted-foreground">{selectedClient.program}</p>}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedClientId ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <Crown className="w-12 h-12 text-yellow-400/30 mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground">Select an Elite member above</p>
            <p className="text-xs text-muted-foreground mt-1">Only Elite tier members are tracked</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-xl border border-dashed border-border bg-card/50 flex items-center gap-3 opacity-60">
                <Clock className="w-8 h-8 text-muted-foreground opacity-40" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Sales Tracking</p>
                  <p className="text-xs text-muted-foreground">Track deals and revenue pipeline</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
              </div>
            </div>

            <AdminMetaAdsPanel clientId={selectedClientId} />

            <Tabs defaultValue="instagram">
              <TabsList className="mb-6 bg-card border border-card-border">
                <TabsTrigger value="instagram" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Instagram className="w-4 h-4" /> Instagram
                </TabsTrigger>
                <TabsTrigger value="youtube" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Youtube className="w-4 h-4" /> YouTube
                </TabsTrigger>
              </TabsList>
              <TabsContent value="instagram">
                <ClientPostsPanel clientId={selectedClientId} platform="instagram" />
              </TabsContent>
              <TabsContent value="youtube">
                <ClientPostsPanel clientId={selectedClientId} platform="youtube" />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
