import { useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Instagram, Youtube, Calendar, BarChart2, Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  Eye, Heart, MessageCircle, Bookmark, Users, TrendingUp, Star, AlertTriangle, FileText
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const FUNNEL_LABELS: Record<string, string> = { top: "Top of Funnel", middle: "Middle of Funnel", bottom: "Bottom of Funnel" };
const CONTENT_TYPE_LABELS: Record<string, string> = { reel: "Reel", carousel: "Carousel", story: "Story", video: "Video" };

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
};

function PostForm({ clientId, platform, post, onClose }: { clientId: string; platform: string; post?: any; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!post;
  const [form, setForm] = useState({
    title: post?.title || "",
    postUrl: post?.postUrl || "",
    postDate: post ? format(new Date(post.postDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    contentType: post?.contentType || (platform === "youtube" ? "video" : "reel"),
    funnelStage: post?.funnelStage || "top",
    views: post?.views || 0,
    likes: post?.likes || 0,
    comments: post?.comments || 0,
    saves: post?.saves || 0,
    followersGained: post?.followersGained || 0,
    subscribersGained: post?.subscribersGained || 0,
  });

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

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, postDate: new Date(form.postDate).toISOString(), views: +form.views, likes: +form.likes, comments: +form.comments, saves: +form.saves, followersGained: +form.followersGained, subscribersGained: +form.subscribersGained });
  };

  const isYt = platform === "youtube";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Title / Description</Label>
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. How I built my funnel" className="mt-1" />
        </div>
        <div className="col-span-2">
          <Label>Post URL (optional)</Label>
          <Input value={form.postUrl} onChange={e => set("postUrl", e.target.value)} placeholder="https://instagram.com/..." className="mt-1" />
        </div>
        <div>
          <Label>Date Posted</Label>
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
          {mutation.isPending ? "Saving..." : isEdit ? "Update Post" : "Log Post"}
        </Button>
      </div>
    </form>
  );
}

function InstagramPanel({ clientId, posts }: { clientId: string; posts: any[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${clientId}`] });
      toast({ title: "Post deleted" });
    },
  });

  const igPosts = posts.filter(p => p.platform === "instagram");
  const totalViews = igPosts.reduce((s, p) => s + p.views, 0);
  const totalFollowers = igPosts.reduce((s, p) => s + p.followersGained, 0);
  const totalLikes = igPosts.reduce((s, p) => s + p.likes, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: igPosts.length, icon: Instagram, color: "text-pink-400" },
          { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
          { label: "Total Likes", value: totalLikes.toLocaleString(), icon: Heart, color: "text-red-400" },
          { label: "Followers Gained", value: totalFollowers.toLocaleString(), icon: Users, color: "text-green-400" },
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

      {/* Add Post button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Instagram Posts ({igPosts.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-instagram-post">
              <Plus className="w-4 h-4 mr-1.5" /> Log Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Log Instagram Post</DialogTitle></DialogHeader>
            <PostForm clientId={clientId} platform="instagram" onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {igPosts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <Instagram className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No Instagram posts logged yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Log Post" to track your content</p>
        </div>
      ) : (
        <div className="space-y-3">
          {igPosts.map((post: any) => (
            <Card key={post.id} data-testid={`post-card-${post.id}`} className="border border-card-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-sm font-semibold text-foreground truncate">{post.title || "Untitled"}</span>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${TYPE_COLORS[post.contentType] || ""}`}>{CONTENT_TYPE_LABELS[post.contentType]}</Badge>
                      {post.funnelStage && <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${FUNNEL_COLORS[post.funnelStage] || ""}`}>{FUNNEL_LABELS[post.funnelStage]}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{format(new Date(post.postDate), "MMMM d, yyyy")}</p>
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
                        <button onClick={() => setEditPost(post)} data-testid={`edit-post-${post.id}`} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
                      </DialogTrigger>
                      {editPost?.id === post.id && (
                        <DialogContent className="max-w-lg">
                          <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
                          <PostForm clientId={clientId} platform="instagram" post={editPost} onClose={() => setEditPost(null)} />
                        </DialogContent>
                      )}
                    </Dialog>
                    <button onClick={() => del.mutate(post.id)} data-testid={`delete-post-${post.id}`} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function YouTubePanel({ clientId, posts }: { clientId: string; posts: any[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${clientId}`] });
      toast({ title: "Post deleted" });
    },
  });

  const ytPosts = posts.filter(p => p.platform === "youtube");
  const totalViews = ytPosts.reduce((s, p) => s + p.views, 0);
  const totalSubs = ytPosts.reduce((s, p) => s + p.subscribersGained, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Videos Posted", value: ytPosts.length, icon: Youtube, color: "text-red-400" },
          { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
          { label: "Subscribers Gained", value: totalSubs.toLocaleString(), icon: Users, color: "text-green-400" },
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

      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">YouTube Videos ({ytPosts.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-youtube-video">
              <Plus className="w-4 h-4 mr-1.5" /> Log Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Log YouTube Video</DialogTitle></DialogHeader>
            <PostForm clientId={clientId} platform="youtube" onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {ytPosts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <Youtube className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No YouTube videos logged yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ytPosts.map((post: any) => (
            <Card key={post.id} data-testid={`yt-card-${post.id}`} className="border border-card-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Youtube className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{post.title || "Untitled Video"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(post.postDate), "MMMM d, yyyy")}</p>
                    {post.postUrl && (
                      <a href={post.postUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 block truncate">{post.postUrl}</a>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" />{post.views.toLocaleString()} views</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />+{post.subscribersGained} subs</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button onClick={() => setEditPost(post)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
                      </DialogTrigger>
                      {editPost?.id === post.id && (
                        <DialogContent className="max-w-lg">
                          <DialogHeader><DialogTitle>Edit Video</DialogTitle></DialogHeader>
                          <PostForm clientId={clientId} platform="youtube" post={editPost} onClose={() => setEditPost(null)} />
                        </DialogContent>
                      )}
                    </Dialog>
                    <button onClick={() => del.mutate(post.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarPanel({ posts }: { posts: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const postsOnDay = (day: Date) => posts.filter(p => isSameDay(new Date(p.postDate), day));
  const selectedPosts = selectedDay ? postsOnDay(selectedDay) : [];

  const platformDot = (platform: string) => platform === "instagram" ? "bg-pink-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2">{d}</div>
        ))}
        {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const dayPosts = postsOnDay(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative p-1.5 rounded-lg min-h-[44px] flex flex-col items-center gap-0.5 border transition-colors ${
                isSelected ? "bg-primary border-primary" : isToday ? "border-primary/40 bg-primary/5" : "border-transparent hover:border-border hover:bg-accent"
              }`}
            >
              <span className={`text-xs font-medium ${isSelected ? "text-primary-foreground" : isToday ? "text-primary" : "text-foreground"}`}>
                {format(day, "d")}
              </span>
              {dayPosts.length > 0 && (
                <div className="flex items-center gap-0.5 flex-wrap justify-center">
                  {dayPosts.slice(0, 3).map((p, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${platformDot(p.platform)}`} />
                  ))}
                  {dayPosts.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayPosts.length - 3}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500" />Instagram</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />YouTube</span>
      </div>

      {/* Selected day posts */}
      {selectedDay && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">{format(selectedDay, "MMMM d, yyyy")}</p>
          {selectedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No content logged for this day</p>
          ) : (
            <div className="space-y-2">
              {selectedPosts.map(post => (
                <div key={post.id} className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl">
                  {post.platform === "instagram" ? <Instagram className="w-4 h-4 text-pink-400 flex-shrink-0" /> : <Youtube className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{post.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">{CONTENT_TYPE_LABELS[post.contentType]} · {post.views.toLocaleString()} views</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] border ${TYPE_COLORS[post.contentType] || ""}`}>{CONTENT_TYPE_LABELS[post.contentType]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportPanel({ posts }: { posts: any[] }) {
  const igPosts = posts.filter(p => p.platform === "instagram");
  const ytPosts = posts.filter(p => p.platform === "youtube");

  const best = [...posts].sort((a, b) => b.views - a.views)[0];
  const worst = posts.length > 1 ? [...posts].sort((a, b) => a.views - b.views)[0] : null;

  const now = new Date();
  const thisMonth = posts.filter(p => {
    const d = new Date(p.postDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalFollowers = posts.reduce((s, p) => s + p.followersGained + p.subscribersGained, 0);
  const avgViews = posts.length ? Math.round(totalViews / posts.length) : 0;

  const byContentType = Object.entries(
    posts.reduce((acc: any, p) => { acc[p.contentType] = (acc[p.contentType] || 0) + 1; return acc; }, {})
  ).sort((a: any, b: any) => b[1] - a[1]);

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl">
        <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-sm text-muted-foreground">Log some content first to generate a report</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Content", value: posts.length, sub: `${thisMonth.length} this month`, icon: FileText },
          { label: "Total Views", value: totalViews.toLocaleString(), sub: `${avgViews.toLocaleString()} avg/post`, icon: Eye },
          { label: "Followers/Subs", value: `+${totalFollowers}`, sub: "Total gained", icon: Users },
          { label: "Best Format", value: byContentType[0] ? CONTENT_TYPE_LABELS[byContentType[0][0]] : "—", sub: `${byContentType[0]?.[1] || 0} posts`, icon: TrendingUp },
        ].map(({ label, value, sub, icon: Icon }) => (
          <Card key={label} className="border border-card-border">
            <CardContent className="p-4">
              <Icon className="w-4 h-4 text-primary mb-2" />
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform breakdown */}
        <Card className="border border-card-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Platform Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-pink-500/10 rounded-lg flex items-center justify-center">
                <Instagram className="w-4 h-4 text-pink-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">Instagram</span>
                  <span className="text-xs text-muted-foreground">{igPosts.length} posts · {igPosts.reduce((s, p) => s + p.views, 0).toLocaleString()} views</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: `${posts.length ? (igPosts.length / posts.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                <Youtube className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">YouTube</span>
                  <span className="text-xs text-muted-foreground">{ytPosts.length} videos · {ytPosts.reduce((s, p) => s + p.views, 0).toLocaleString()} views</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${posts.length ? (ytPosts.length / posts.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best & Worst */}
        <Card className="border border-card-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Performance Highlights</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {best && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                <Star className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-green-400">Best Performer</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{best.title || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{best.views.toLocaleString()} views · {CONTENT_TYPE_LABELS[best.contentType]} · {format(new Date(best.postDate), "MMM d")}</p>
                </div>
              </div>
            )}
            {worst && worst.id !== best?.id && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-orange-400">Needs Improvement</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{worst.title || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{worst.views.toLocaleString()} views · {CONTENT_TYPE_LABELS[worst.contentType]} · {format(new Date(worst.postDate), "MMM d")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ContentTracking() {
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/content/${user?.id}`],
    enabled: !!user?.id,
  });

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Content Tracking</h1>
          <p className="text-muted-foreground mt-1">Log and track your Instagram and YouTube content performance</p>
        </div>

        <Tabs defaultValue="instagram">
          <TabsList className="mb-6 bg-card border border-card-border">
            <TabsTrigger value="instagram" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Instagram className="w-4 h-4" /> Instagram
            </TabsTrigger>
            <TabsTrigger value="youtube" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Youtube className="w-4 h-4" /> YouTube
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="w-4 h-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart2 className="w-4 h-4" /> Report
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : (
            <>
              <TabsContent value="instagram"><InstagramPanel clientId={user?.id!} posts={posts} /></TabsContent>
              <TabsContent value="youtube"><YouTubePanel clientId={user?.id!} posts={posts} /></TabsContent>
              <TabsContent value="calendar"><CalendarPanel posts={posts} /></TabsContent>
              <TabsContent value="report"><ReportPanel posts={posts} /></TabsContent>
            </>
          )}
        </Tabs>

      </div>
    </ClientLayout>
  );
}
