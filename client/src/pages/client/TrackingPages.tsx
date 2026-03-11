import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
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
import {
  Instagram, Youtube, Eye, Heart, MessageCircle, Bookmark, Users, TrendingUp,
  Star, AlertTriangle, FileText, Clock, ChevronRight, ArrowLeft, Plus, Trash2,
  Pencil, BarChart2, Bell
} from "lucide-react";
import { format, subWeeks, isAfter } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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

function PostForm({ clientId, platform, post, onClose }: { clientId: string; platform: string; post?: any; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!post;
  const isYt = platform === "youtube";
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
      if (!isEdit) {
        toast({ title: "Post logged!", description: "You'll receive a reminder in 48–72 hours to update your metrics." });
      } else {
        toast({ title: "Post updated!" });
      }
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
          <Input value={form.postUrl} onChange={e => set("postUrl", e.target.value)} placeholder={isYt ? "https://youtube.com/watch?v=..." : "https://instagram.com/p/..."} className="mt-1" />
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
              {isYt ? (
                <SelectItem value="video">Video</SelectItem>
              ) : (
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
          <div>
            <Label className="text-xs">Views</Label>
            <Input type="number" min="0" value={form.views} onChange={e => set("views", e.target.value)} className="mt-1 h-9" />
          </div>
          {!isYt && (
            <>
              <div>
                <Label className="text-xs">Likes</Label>
                <Input type="number" min="0" value={form.likes} onChange={e => set("likes", e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Comments</Label>
                <Input type="number" min="0" value={form.comments} onChange={e => set("comments", e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Saves</Label>
                <Input type="number" min="0" value={form.saves} onChange={e => set("saves", e.target.value)} className="mt-1 h-9" />
              </div>
            </>
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

function ReportGenerator({ posts, platform }: { posts: any[]; platform: "instagram" | "youtube" }) {
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
            <Button variant="outline" className="h-12 flex flex-col gap-0.5" onClick={() => setPeriod(2)} data-testid="button-report-2weeks">
              <span className="text-sm font-semibold">Last 2 Weeks</span>
              <span className="text-[10px] text-muted-foreground">14-day summary</span>
            </Button>
            <Button variant="outline" className="h-12 flex flex-col gap-0.5" onClick={() => setPeriod(4)} data-testid="button-report-4weeks">
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
  const totalSubs = filtered.reduce((s, p) => s + p.subscribersGained, 0);

  return (
    <Card className="border border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Last {period * 7} Days Report
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPeriod(null)} data-testid="button-close-report">
            <ArrowLeft className="w-3 h-3 mr-1" /> New Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No posts logged in the last {period * 7} days.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Posts", value: filtered.length, icon: FileText, color: "text-primary" },
                { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
                platform === "instagram"
                  ? { label: "Total Engagement", value: totalEngagement.toLocaleString(), icon: Heart, color: "text-red-400" }
                  : { label: "Subscribers Gained", value: `+${totalSubs}`, icon: Users, color: "text-green-400" },
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {best.views.toLocaleString()} views · {CONTENT_TYPE_LABELS[best.contentType]} · {format(new Date(best.postDate), "MMM d")}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All Posts in Period</p>
              {filtered.sort((a, b) => b.views - a.views).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 bg-card border border-card-border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.title || "Untitled"}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(p.postDate), "MMM d")} · {p.views.toLocaleString()} views</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] border ${TYPE_COLORS[p.contentType] || ""}`}>
                    {CONTENT_TYPE_LABELS[p.contentType]}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ContentTrackingIndex() {
  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tracking</h1>
          <p className="text-muted-foreground mt-1">Monitor your content performance and growth</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Content Tracking</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/tracking/content/instagram">
              <Card className="border border-card-border hover:border-pink-500/40 hover:bg-pink-500/5 transition-all duration-200 cursor-pointer group" data-testid="card-instagram-tracking">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-pink-500/20 transition-colors">
                    <Instagram className="w-6 h-6 text-pink-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Instagram</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Track reels, carousels, posts & stories</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/tracking/content/youtube">
              <Card className="border border-card-border hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-200 cursor-pointer group" data-testid="card-youtube-tracking">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/20 transition-colors">
                    <Youtube className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">YouTube</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Track video views & subscriber growth</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Coming Soon</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Sales Tracking", desc: "Track deals, pipelines, and revenue conversions", color: "text-emerald-400" },
              { label: "Ad Tracking", desc: "Monitor paid ad performance and ROI", color: "text-blue-400" },
            ].map(({ label, desc, color }) => (
              <Card key={label} className="border border-dashed border-border bg-card/50 opacity-70" data-testid={`card-${label.toLowerCase().replace(" ", "-")}`}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">Coming Soon</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export function InstagramTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);

  const { data: allPosts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/content/${user?.id}`],
    enabled: !!user?.id,
  });

  const posts = allPosts.filter(p => p.platform === "instagram");

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${user?.id}`] });
      toast({ title: "Post deleted" });
    },
  });

  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalFollowers = posts.reduce((s, p) => s + p.followersGained, 0);
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
  const totalEngagement = posts.reduce((s, p) => s + p.likes + p.comments + p.saves, 0);

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/tracking/content">
            <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-tracking">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-pink-500/10 rounded-xl flex items-center justify-center">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Instagram Tracking</h1>
              <p className="text-xs text-muted-foreground">Log and track your Instagram content performance</p>
            </div>
          </div>
          <div className="ml-auto">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-log-instagram-post">
                  <Plus className="w-4 h-4 mr-1.5" /> Log Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Log Instagram Post</DialogTitle></DialogHeader>
                <PostForm clientId={user?.id!} platform="instagram" onClose={() => setAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Posts", value: posts.length, icon: Instagram, color: "text-pink-400" },
            { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
            { label: "Total Engagement", value: totalEngagement.toLocaleString(), icon: Heart, color: "text-red-400" },
            { label: "Followers Gained", value: `+${totalFollowers}`, icon: Users, color: "text-green-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border border-card-border">
              <CardContent className="p-4">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Instagram className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground font-medium">No Instagram posts logged yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Log Post" to start tracking your content</p>
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Log Your First Post
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => (
              <Card key={post.id} data-testid={`ig-post-${post.id}`} className="border border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">{post.title || "Untitled"}</span>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${TYPE_COLORS[post.contentType] || ""}`}>{CONTENT_TYPE_LABELS[post.contentType]}</Badge>
                        {post.funnelStage && <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${FUNNEL_COLORS[post.funnelStage] || ""}`}>{FUNNEL_LABELS[post.funnelStage]}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{format(new Date(post.postDate), "MMMM d, yyyy")}</p>
                      {post.postUrl && <a href={post.postUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline block mb-2 truncate">{post.postUrl}</a>}
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" />{post.views.toLocaleString()}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="w-3 h-3" />{post.likes.toLocaleString()}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="w-3 h-3" />{post.comments.toLocaleString()}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Bookmark className="w-3 h-3" />{post.saves.toLocaleString()}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />+{post.followersGained}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button onClick={() => setEditPost(post)} data-testid={`edit-ig-${post.id}`} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        {editPost?.id === post.id && (
                          <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
                            <PostForm clientId={user?.id!} platform="instagram" post={editPost} onClose={() => setEditPost(null)} />
                          </DialogContent>
                        )}
                      </Dialog>
                      <button onClick={() => del.mutate(post.id)} data-testid={`delete-ig-${post.id}`} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-accent">
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
          <ReportGenerator posts={posts} platform="instagram" />
        </div>

        <div className="bg-card/50 border border-dashed border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <Bell className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Metric Reminders</p>
            <p className="text-xs text-muted-foreground mt-0.5">After logging a post, you'll receive a reminder notification in 48–72 hours to update your metrics with the latest numbers.</p>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export function YouTubeTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);

  const { data: allPosts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/content/${user?.id}`],
    enabled: !!user?.id,
  });

  const posts = allPosts.filter(p => p.platform === "youtube");

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${user?.id}`] });
      toast({ title: "Video deleted" });
    },
  });

  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalSubs = posts.reduce((s, p) => s + p.subscribersGained, 0);

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/tracking/content">
            <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-tracking-yt">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center">
              <Youtube className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">YouTube Tracking</h1>
              <p className="text-xs text-muted-foreground">Log and track your YouTube video performance</p>
            </div>
          </div>
          <div className="ml-auto">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-log-youtube-video">
                  <Plus className="w-4 h-4 mr-1.5" /> Log Video
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Log YouTube Video</DialogTitle></DialogHeader>
                <PostForm clientId={user?.id!} platform="youtube" onClose={() => setAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Videos Posted", value: posts.length, icon: Youtube, color: "text-red-400" },
            { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
            { label: "Subscribers Gained", value: `+${totalSubs}`, icon: Users, color: "text-green-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border border-card-border">
              <CardContent className="p-4">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Youtube className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground font-medium">No YouTube videos logged yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Log Video" to start tracking your content</p>
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Log Your First Video
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => (
              <Card key={post.id} data-testid={`yt-post-${post.id}`} className="border border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Youtube className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{post.title || "Untitled Video"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(post.postDate), "MMMM d, yyyy")}</p>
                      {post.postUrl && <a href={post.postUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 block truncate">{post.postUrl}</a>}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" />{post.views.toLocaleString()} views</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />+{post.subscribersGained} subs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button onClick={() => setEditPost(post)} data-testid={`edit-yt-${post.id}`} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        {editPost?.id === post.id && (
                          <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Edit Video</DialogTitle></DialogHeader>
                            <PostForm clientId={user?.id!} platform="youtube" post={editPost} onClose={() => setEditPost(null)} />
                          </DialogContent>
                        )}
                      </Dialog>
                      <button onClick={() => del.mutate(post.id)} data-testid={`delete-yt-${post.id}`} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-accent">
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
          <ReportGenerator posts={posts} platform="youtube" />
        </div>

        <div className="bg-card/50 border border-dashed border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <Bell className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Metric Reminders</p>
            <p className="text-xs text-muted-foreground mt-0.5">After logging a video, you'll receive a reminder notification in 48–72 hours to update your metrics with the latest numbers.</p>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
