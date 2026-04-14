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
  Star, FileText, Clock, Plus, Trash2, Pencil, BarChart2, ArrowLeft, Bell, ChevronRight, RefreshCw, Crown
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

  const { data: allPosts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/content/${clientId}`],
    enabled: !!clientId,
  });

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

export default function AdminTracking() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const eliteClients = clients.filter((c: any) => c.tier === "elite");
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
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Sales Tracking", desc: "Track deals and revenue pipeline", icon: TrendingUp },
                { label: "Ad Tracking", desc: "Monitor paid ad performance and ROI", icon: BarChart2 },
              ].map(({ label, desc, icon: Icon }) => (
                <div key={label} className="p-4 rounded-xl border border-dashed border-border bg-card/50 flex items-center gap-3 opacity-60">
                  <Clock className="w-8 h-8 text-muted-foreground opacity-40" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
                </div>
              ))}
            </div>

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
