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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import {
  Instagram, Youtube, Eye, Heart, MessageCircle, Bookmark, Users, TrendingUp,
  Star, FileText, Clock, ChevronRight, ArrowLeft, Plus, Trash2, Pencil,
  BarChart2, Bell, Sparkles, Loader2, DollarSign, CalendarDays, Activity,
  Calendar, TrendingDown, RefreshCw, Zap, ExternalLink, Inbox, ChevronDown,
  CheckCircle2, AlertCircle, Lightbulb
} from "lucide-react";
import { format, getMonth, getYear, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

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
const CHART_COLORS = ["#d4b461", "#6366f1", "#ec4899", "#22c55e", "#f97316", "#14b8a6"];

function engRate(views: number, likes: number, comments: number, saves: number): number | null {
  if (!views || views === 0) return null;
  return (likes + comments + saves) / views * 100;
}

function EngagementBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">N/A</Badge>;
  const color = rate >= 3
    ? "bg-green-500/10 text-green-400 border-green-500/30"
    : rate >= 1 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
    : "bg-red-500/10 text-red-400 border-red-500/30";
  return <Badge variant="outline" className={`text-[10px] border ${color}`}>{rate.toFixed(2)}% ER</Badge>;
}

function PostForm({ clientId, platform, post, onClose }: { clientId: string; platform: string; post?: any; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!post;
  const isYt = platform === "youtube";
  const [syncing, setSyncing] = useState(false);
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

  const handleSyncStats = async () => {
    if (!form.postUrl) return;
    setSyncing(true);
    try {
      const endpoint = isYt ? "/api/youtube/sync-post" : "/api/instagram/sync-post";
      const data = await apiRequest("POST", endpoint, { postUrl: form.postUrl });
      setForm(f => ({
        ...f,
        views: data.views ?? f.views,
        likes: data.likes ?? f.likes,
        comments: data.comments ?? f.comments,
        ...(data.title && !f.title ? { title: data.title } : {}),
        ...(data.contentType ? { contentType: data.contentType } : {}),
        ...(data.publishedAt && !f.postDate ? { postDate: format(new Date(data.publishedAt), "yyyy-MM-dd") } : {}),
        ...(data.postDate ? { postDate: format(new Date(data.postDate), "yyyy-MM-dd") } : {}),
      }));
      toast({ title: "Stats synced!", description: isYt ? `Fetched real-time data from YouTube.` : `Fetched real-time data from Instagram.` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const liveEr = engRate(+form.views, +form.likes, +form.comments, +form.saves);

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? apiRequest("PATCH", `/api/content/${post.id}`, data)
      : apiRequest("POST", "/api/content", { ...data, clientId, platform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${clientId}`] });
      toast({ title: isEdit ? "Post updated!" : "Post logged!", description: isEdit ? "Metrics recalculated." : "You'll get a reminder to update metrics in 48–72h." });
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
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>{isYt ? "Video Title" : "Title / Description"}</Label>
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder={isYt ? "e.g. How I built my business" : "e.g. Behind the scenes"} className="mt-1" />
        </div>
        <div className="col-span-2">
          <Label>{isYt ? "Video Link (optional)" : "Post Link (optional)"}</Label>
          <div className="flex gap-2 mt-1">
            <Input value={form.postUrl} onChange={e => set("postUrl", e.target.value)} placeholder={isYt ? "https://youtube.com/watch?v=..." : "https://instagram.com/p/..."} className="flex-1" />
            {form.postUrl && (
              <Button type="button" variant="outline" size="sm" onClick={handleSyncStats} disabled={syncing} className="flex-shrink-0 border-primary/30 text-primary hover:bg-primary/10 gap-1.5" data-testid="button-sync-stats">
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {syncing ? "Syncing…" : "Sync Stats"}
              </Button>
            )}
          </div>
          {form.postUrl && (
            <p className="text-[11px] text-muted-foreground mt-1">Paste the {isYt ? "YouTube video" : "Instagram post"} link then click Sync Stats to auto-fill views, likes & comments in real time.</p>
          )}
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
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Initial Metrics</p>
          {!isYt && liveEr !== null && (
            <Badge variant="outline" className={`text-[10px] border ${liveEr >= 3 ? "bg-green-500/10 text-green-400 border-green-500/30" : liveEr >= 1 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
              {liveEr.toFixed(2)}% Engagement Rate
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Views</Label>
            <Input type="number" min="0" value={form.views} onChange={e => set("views", e.target.value)} className="mt-1 h-9" data-testid="input-views" />
          </div>
          {!isYt && (
            <>
              <div>
                <Label className="text-xs">Likes</Label>
                <Input type="number" min="0" value={form.likes} onChange={e => set("likes", e.target.value)} className="mt-1 h-9" data-testid="input-likes" />
              </div>
              <div>
                <Label className="text-xs">Comments</Label>
                <Input type="number" min="0" value={form.comments} onChange={e => set("comments", e.target.value)} className="mt-1 h-9" data-testid="input-comments" />
              </div>
              <div>
                <Label className="text-xs">Saves</Label>
                <Input type="number" min="0" value={form.saves} onChange={e => set("saves", e.target.value)} className="mt-1 h-9" data-testid="input-saves" />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">{isYt ? "Subscribers Gained" : "Followers Gained"}</Label>
            <Input type="number" min="0" value={isYt ? form.subscribersGained : form.followersGained} onChange={e => set(isYt ? "subscribersGained" : "followersGained", e.target.value)} className="mt-1 h-9" />
          </div>
          {isYt && (
            <div>
              <Label className="text-xs">Likes</Label>
              <Input type="number" min="0" value={form.likes} onChange={e => set("likes", e.target.value)} className="mt-1 h-9" />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={mutation.isPending} data-testid="button-submit-post">
          {mutation.isPending ? "Saving..." : isEdit ? "Update Post" : "Log Post"}
        </Button>
      </div>
    </form>
  );
}

function InitialMetricsEdit({ post, clientId, platform, onSuccess }: { post: any; clientId: string; platform: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const isYt = platform === "youtube";
  const [form, setForm] = useState({
    views: post?.views ?? 0,
    likes: post?.likes ?? 0,
    comments: post?.comments ?? 0,
    saves: post?.saves ?? 0,
    followersGained: post?.followersGained ?? 0,
    subscribersGained: post?.subscribersGained ?? 0,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const liveEr = engRate(+form.views, +form.likes, +form.comments, +form.saves);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/content/${post.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${clientId}`] });
      toast({ title: "Metrics updated!", description: "Initial metrics saved." });
      onSuccess();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      {!isYt && liveEr !== null && (
        <div className="flex justify-end">
          <Badge variant="outline" className={`text-[10px] border ${liveEr >= 3 ? "bg-green-500/10 text-green-400 border-green-500/30" : liveEr >= 1 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
            {liveEr.toFixed(2)}% Live ER
          </Badge>
        </div>
      )}
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
        {isYt && (
          <div>
            <Label className="text-xs">Likes</Label>
            <Input type="number" min="0" value={form.likes} onChange={e => set("likes", e.target.value)} className="mt-1 h-9" />
          </div>
        )}
        <div>
          <Label className="text-xs">{isYt ? "Subscribers Gained" : "Followers Gained"}</Label>
          <Input type="number" min="0" value={isYt ? form.subscribersGained : form.followersGained} onChange={e => set(isYt ? "subscribersGained" : "followersGained", e.target.value)} className="mt-1 h-9" />
        </div>
      </div>
      <Button
        onClick={() => mutation.mutate({
          views: +form.views, likes: +form.likes, comments: +form.comments,
          saves: +form.saves, followersGained: +form.followersGained, subscribersGained: +form.subscribersGained,
        })}
        disabled={mutation.isPending}
        className="w-full"
        data-testid="button-save-initial"
      >
        {mutation.isPending ? "Saving..." : "Save Initial Metrics"}
      </Button>
    </div>
  );
}

function MetricsUpdateDialog({ post, clientId, platform, open, onClose }: { post: any; clientId: string; platform: string; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const isYt = platform === "youtube";

  const [form2w, setForm2w] = useState({
    views2w: post?.views2w ?? "",
    likes2w: post?.likes2w ?? "",
    comments2w: post?.comments2w ?? "",
    saves2w: post?.saves2w ?? "",
    followersGained2w: post?.followersGained2w ?? "",
    subscribersGained2w: post?.subscribersGained2w ?? "",
  });

  const [form4w, setForm4w] = useState({
    views4w: post?.views4w ?? "",
    likes4w: post?.likes4w ?? "",
    comments4w: post?.comments4w ?? "",
    saves4w: post?.saves4w ?? "",
    followersGained4w: post?.followersGained4w ?? "",
    subscribersGained4w: post?.subscribersGained4w ?? "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/content/${post.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${clientId}`] });
      toast({ title: "Metrics updated!", description: "Engagement rates recalculated." });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const save2w = () => {
    mutation.mutate(Object.fromEntries(
      Object.entries(form2w).filter(([, v]) => v !== "").map(([k, v]) => [k, +v])
    ));
  };

  const save4w = () => {
    mutation.mutate(Object.fromEntries(
      Object.entries(form4w).filter(([, v]) => v !== "").map(([k, v]) => [k, +v])
    ));
  };

  const er0 = engRate(post?.views, post?.likes, post?.comments, post?.saves);
  const er2 = engRate(post?.views2w, post?.likes2w, post?.comments2w, post?.saves2w);
  const er4 = engRate(post?.views4w, post?.likes4w, post?.comments4w, post?.saves4w);

  if (!open || !post) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Update Metrics — {post.title || "Untitled"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="initial">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="initial">Initial</TabsTrigger>
            <TabsTrigger value="2w">2-Week</TabsTrigger>
            <TabsTrigger value="4w">4-Week</TabsTrigger>
          </TabsList>

          <TabsContent value="initial" className="space-y-4 pt-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Posted {format(new Date(post.postDate), "MMMM d, yyyy")}</p>
              <EngagementBadge rate={er0} />
            </div>
            <InitialMetricsEdit post={post} clientId={clientId} platform={platform} onSuccess={onClose} />
          </TabsContent>

          <TabsContent value="2w" className="space-y-4 pt-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">2-Week performance update</p>
              <EngagementBadge rate={er2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Views at 2 Weeks</Label>
                <Input type="number" min="0" placeholder={post.views?.toString() || "0"} value={form2w.views2w} onChange={e => setForm2w(f => ({ ...f, views2w: e.target.value }))} className="mt-1 h-9" data-testid="input-views2w" />
              </div>
              {!isYt && (
                <>
                  <div>
                    <Label className="text-xs">Likes at 2 Weeks</Label>
                    <Input type="number" min="0" value={form2w.likes2w} onChange={e => setForm2w(f => ({ ...f, likes2w: e.target.value }))} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Comments at 2 Weeks</Label>
                    <Input type="number" min="0" value={form2w.comments2w} onChange={e => setForm2w(f => ({ ...f, comments2w: e.target.value }))} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Saves at 2 Weeks</Label>
                    <Input type="number" min="0" value={form2w.saves2w} onChange={e => setForm2w(f => ({ ...f, saves2w: e.target.value }))} className="mt-1 h-9" />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">{isYt ? "Subscribers at 2 Weeks" : "Followers at 2 Weeks"}</Label>
                <Input type="number" min="0" value={isYt ? form2w.subscribersGained2w : form2w.followersGained2w} onChange={e => setForm2w(f => ({ ...f, [isYt ? "subscribersGained2w" : "followersGained2w"]: e.target.value }))} className="mt-1 h-9" />
              </div>
            </div>
            <Button onClick={save2w} disabled={mutation.isPending} className="w-full" data-testid="button-save-2w">
              {mutation.isPending ? "Saving..." : "Save 2-Week Metrics"}
            </Button>
          </TabsContent>

          <TabsContent value="4w" className="space-y-4 pt-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">4-Week performance update</p>
              <EngagementBadge rate={er4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Views at 4 Weeks</Label>
                <Input type="number" min="0" placeholder={post.views?.toString() || "0"} value={form4w.views4w} onChange={e => setForm4w(f => ({ ...f, views4w: e.target.value }))} className="mt-1 h-9" data-testid="input-views4w" />
              </div>
              {!isYt && (
                <>
                  <div>
                    <Label className="text-xs">Likes at 4 Weeks</Label>
                    <Input type="number" min="0" value={form4w.likes4w} onChange={e => setForm4w(f => ({ ...f, likes4w: e.target.value }))} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Comments at 4 Weeks</Label>
                    <Input type="number" min="0" value={form4w.comments4w} onChange={e => setForm4w(f => ({ ...f, comments4w: e.target.value }))} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Saves at 4 Weeks</Label>
                    <Input type="number" min="0" value={form4w.saves4w} onChange={e => setForm4w(f => ({ ...f, saves4w: e.target.value }))} className="mt-1 h-9" />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">{isYt ? "Subscribers at 4 Weeks" : "Followers at 4 Weeks"}</Label>
                <Input type="number" min="0" value={isYt ? form4w.subscribersGained4w : form4w.followersGained4w} onChange={e => setForm4w(f => ({ ...f, [isYt ? "subscribersGained4w" : "followersGained4w"]: e.target.value }))} className="mt-1 h-9" />
              </div>
            </div>
            <Button onClick={save4w} disabled={mutation.isPending} className="w-full" data-testid="button-save-4w">
              {mutation.isPending ? "Saving..." : "Save 4-Week Metrics"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AIReportGenerator({ posts, platform }: { posts: any[]; platform: "instagram" | "youtube" }) {
  const [stage, setStage] = useState<"idle" | "loading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<any>(null);
  const [loadingText, setLoadingText] = useState("Initializing AI...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  const loadingSteps = [
    "Initializing AI analysis...",
    "Scanning content performance data...",
    "Calculating engagement patterns...",
    "Identifying top performers...",
    "Generating growth insights...",
  ];

  const applyQuickRange = (days: number) => {
    if (posts.length === 0) return;
    const sorted = [...posts].sort((a, b) => new Date(a.postDate).getTime() - new Date(b.postDate).getTime());
    const end = new Date(sorted[sorted.length - 1].postDate);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  };

  const getPostsForPeriod = () => {
    if (!startDate && !endDate) return posts;
    return posts.filter(p => {
      const d = new Date(p.postDate);
      if (startDate && d < new Date(startDate)) return false;
      if (endDate && d > new Date(endDate + "T23:59:59")) return false;
      return true;
    });
  };

  const generate = async () => {
    const filteredPosts = getPostsForPeriod();
    if (filteredPosts.length === 0) {
      toast({ title: "No posts in range", description: "No posts found in the selected date range. Adjust your dates.", variant: "destructive" });
      return;
    }
    setStage("loading");
    setProgress(0);
    setErrorMsg(null);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgress(Math.min(step * 20, 95));
      setLoadingText(loadingSteps[Math.min(step, loadingSteps.length - 1)]);
    }, 900);

    try {
      const data = await apiRequest("POST", "/api/ai/content-report", { posts: filteredPosts, platform });
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setReport(data);
        setStage("done");
      }, 500);
    } catch (e: any) {
      clearInterval(interval);
      setStage("idle");
      const msg: string = e.message || "Report generation failed";
      const isQuota = msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("free-tier");
      if (isQuota) {
        setErrorMsg(msg);
      } else {
        toast({ title: "Report failed", description: msg, variant: "destructive" });
      }
    }
  };

  const filteredForReport = getPostsForPeriod();

  if (stage === "idle") {
    return (
      <div className="border border-primary/20 rounded-2xl p-6 bg-primary/5 flex flex-col items-center gap-4 text-center">
        {errorMsg && (
          <div className="w-full bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-left flex gap-2">
            <span className="text-destructive mt-0.5 flex-shrink-0">⚠️</span>
            <div>
              <p className="text-xs font-semibold text-destructive">AI Quota Exceeded</p>
              <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">AI Report Generator</h3>
          <p className="text-xs text-muted-foreground mt-1">Select a date range and generate AI-powered insights and growth recommendations</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-left">Quick Range</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "1 Week", days: 7 },
                { label: "2 Weeks", days: 14 },
                { label: "4 Weeks", days: 28 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => applyQuickRange(days)}
                  disabled={posts.length === 0}
                  className="p-2 rounded-xl border border-border text-center text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid={`quick-range-${days}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-left">Custom Range</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-left">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={posts.length === 0}
                  className="mt-1 h-8 text-xs"
                  data-testid="input-report-start"
                />
              </div>
              <div className="text-left">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  disabled={posts.length === 0}
                  className="mt-1 h-8 text-xs"
                  data-testid="input-report-end"
                />
              </div>
            </div>
          </div>

          {(startDate || endDate) && (
            <p className="text-xs text-muted-foreground text-left">
              {filteredForReport.length} post{filteredForReport.length !== 1 ? "s" : ""} in selected range
            </p>
          )}
        </div>

        <Button
          onClick={generate}
          disabled={posts.length === 0 || filteredForReport.length === 0}
          data-testid="button-generate-ai-report"
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" /> Generate AI Report
        </Button>
        {posts.length === 0
          ? <p className="text-xs text-muted-foreground">Log some posts first to generate a report.</p>
          : filteredForReport.length === 0 && (startDate || endDate)
          ? <p className="text-xs text-muted-foreground">No posts found in this date range.</p>
          : null
        }
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="border border-primary/20 rounded-2xl p-8 bg-primary/5 flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping" />
        </div>
        <div className="space-y-2 w-full max-w-xs">
          <p className="text-sm font-medium text-foreground animate-pulse">{loadingText}</p>
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{progress}% complete</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="border border-primary/30 rounded-2xl overflow-hidden">
      <div className="bg-primary/10 border-b border-primary/20 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm text-foreground">AI Content Report</p>
            <p className="text-xs text-muted-foreground">{platform === "instagram" ? "Instagram" : "YouTube"} · {filteredForReport.length} posts{startDate || endDate ? ` · ${startDate || "…"} → ${endDate || "…"}` : ""}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setStage("idle")} className="text-xs h-7">
          <RefreshCw className="w-3 h-3 mr-1" /> New Report
        </Button>
      </div>
      <div className="p-5 space-y-4">
        {report.summary && (
          <div className="p-4 bg-card border border-card-border rounded-xl">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Executive Summary</p>
            <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
          </div>
        )}
        {report.insights && report.insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key Insights</p>
            {report.insights.map((insight: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 p-3 bg-card border border-card-border rounded-lg">
                <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{insight}</p>
              </div>
            ))}
          </div>
        )}
        {report.topPost && (
          <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <p className="text-xs font-semibold text-green-400">Top Performing Post</p>
            </div>
            <p className="text-sm font-medium text-foreground">{report.topPost.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{report.topPost.reason}</p>
          </div>
        )}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommendations</p>
            {report.recommendations.map((rec: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{rec}</p>
              </div>
            ))}
          </div>
        )}
        {report.avgEngagement !== undefined && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-card-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-primary">{report.avgEngagement}%</p>
              <p className="text-xs text-muted-foreground">Avg Engagement</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-blue-400">{report.avgViews?.toLocaleString() || "—"}</p>
              <p className="text-xs text-muted-foreground">Avg Views</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-400">{report.growthTrend || "—"}</p>
              <p className="text-xs text-muted-foreground">Growth Trend</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MonthlyAnalyticsCharts({ posts, platform }: { posts: any[]; platform: string }) {
  const isYt = platform === "youtube";

  const byMonth = MONTHS.map((month, i) => {
    const monthPosts = posts.filter(p => getMonth(new Date(p.postDate)) === i);
    const totalViews = monthPosts.reduce((s, p) => s + p.views, 0);
    const avgEr = monthPosts.length > 0
      ? monthPosts.reduce((s, p) => s + (engRate(p.views, p.likes, p.comments, p.saves) || 0), 0) / monthPosts.length
      : 0;
    return { month: month.slice(0, 3), views: totalViews, er: +avgEr.toFixed(2), posts: monthPosts.length };
  }).filter(m => m.posts > 0);

  const typeData = Object.entries(
    posts.reduce((acc, p) => { acc[p.contentType] = (acc[p.contentType] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: CONTENT_TYPE_LABELS[name] || name, value }));

  if (posts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-card-border">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" />Monthly Views</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {byMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="views" fill="#d4b461" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground text-center py-8">No data yet</p>}
          </CardContent>
        </Card>

        {!isYt && (
          <Card className="border border-card-border">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Content Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {typeData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={typeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {typeData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-foreground flex-1">{d.name}</span>
                        <span className="text-xs font-semibold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground text-center py-8">No data yet</p>}
            </CardContent>
          </Card>
        )}

        {!isYt && byMonth.length > 1 && (
          <Card className="border border-card-border lg:col-span-2">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Engagement Rate Trend</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={byMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                  <RechartTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="er" stroke="#d4b461" strokeWidth={2} dot={{ fill: "#d4b461", r: 3 }} name="Engagement %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, platform, clientId, onEdit, onDelete }: { post: any; platform: string; clientId: string; onEdit: (p: any) => void; onDelete: (id: string) => void }) {
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toast } = useToast();
  const isYt = platform === "youtube";
  const er0 = engRate(post.views, post.likes, post.comments, post.saves);
  const er2 = engRate(post.views2w, post.likes2w, post.comments2w, post.saves2w);
  const er4 = engRate(post.views4w, post.likes4w, post.comments4w, post.saves4w);

  const has2w = post.views2w !== null && post.views2w !== undefined;
  const has4w = post.views4w !== null && post.views4w !== undefined;

  const syncCheckpoint = async (checkpoint: "initial" | "2w" | "4w") => {
    if (!post.postUrl) {
      toast({ title: "No URL", description: `This post needs a URL to sync from ${isYt ? "YouTube" : "Instagram"}.`, variant: "destructive" });
      return;
    }
    setSyncing(checkpoint);
    try {
      const endpoint = isYt ? "/api/youtube/sync-checkpoint" : "/api/instagram/sync-checkpoint";
      await apiRequest("POST", endpoint, { postId: post.id, postUrl: post.postUrl, checkpoint });
      queryClient.invalidateQueries({ queryKey: [`/api/content/${clientId}`] });
      toast({ title: "Synced!", description: `${checkpoint === "initial" ? "Initial" : checkpoint === "2w" ? "2-Week" : "4-Week"} metrics updated from ${isYt ? "YouTube" : "Instagram"}.` });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const checkpoints = [
    {
      key: "initial" as const,
      label: "Initial",
      syncedAt: post.initialSyncedAt,
      views: post.views,
      hasData: post.views !== null && post.views !== undefined,
      color: "text-primary",
      bg: "bg-primary/5 border-primary/20",
    },
    {
      key: "2w" as const,
      label: "2-Week",
      syncedAt: post.twoWeekSyncedAt,
      views: post.views2w,
      hasData: has2w,
      color: "text-blue-400",
      bg: "bg-blue-500/5 border-blue-500/20",
    },
    {
      key: "4w" as const,
      label: "4-Week",
      syncedAt: post.fourWeekSyncedAt,
      views: post.views4w,
      hasData: has4w,
      color: "text-purple-400",
      bg: "bg-purple-500/5 border-purple-500/20",
    },
  ];

  return (
    <>
      <Card data-testid={`post-${post.id}`} className="border border-card-border hover:border-primary/30 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold text-foreground">{post.title || "Untitled"}</span>
                <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${TYPE_COLORS[post.contentType] || ""}`}>{CONTENT_TYPE_LABELS[post.contentType]}</Badge>
                {post.funnelStage && <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${FUNNEL_COLORS[post.funnelStage] || ""}`}>{FUNNEL_LABELS[post.funnelStage]}</Badge>}
                {!isYt && <EngagementBadge rate={er0} />}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{format(new Date(post.postDate), "MMMM d, yyyy")}</p>
              {post.postUrl && (
                <a href={post.postUrl} target="_blank" rel="noreferrer" data-testid={`link-view-post-${post.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1 mb-2 transition-colors font-medium">
                  <ExternalLink className="w-3 h-3" />
                  {post.platform === "youtube" ? "Watch on YouTube" : post.contentType === "reel" ? "Watch Reel" : "View on Instagram"}
                </a>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" />{post.views.toLocaleString()}</span>
                {!isYt && <>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="w-3 h-3" />{post.likes.toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="w-3 h-3" />{post.comments.toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Bookmark className="w-3 h-3" />{post.saves.toLocaleString()}</span>
                </>}
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />+{isYt ? post.subscribersGained : post.followersGained}</span>
              </div>

              {(has2w || has4w) && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {has2w && (
                    <div className="flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/20 rounded-lg px-2 py-1">
                      <RefreshCw className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] text-blue-400">2W: {post.views2w?.toLocaleString()} views</span>
                      {!isYt && er2 !== null && <span className="text-[10px] text-blue-400">· {er2.toFixed(1)}% ER</span>}
                    </div>
                  )}
                  {has4w && (
                    <div className="flex items-center gap-1.5 bg-purple-500/5 border border-purple-500/20 rounded-lg px-2 py-1">
                      <RefreshCw className="w-3 h-3 text-purple-400" />
                      <span className="text-[10px] text-purple-400">4W: {post.views4w?.toLocaleString()} views</span>
                      {!isYt && er4 !== null && <span className="text-[10px] text-purple-400">· {er4.toFixed(1)}% ER</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => setSyncOpen(o => !o)}
                data-testid={`regenerate-${post.id}`}
                title="Sync metrics from Instagram"
                className={`transition-colors p-1.5 rounded-lg hover:bg-primary/10 ${syncOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"}`}
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setMetricsOpen(true)} data-testid={`update-metrics-${post.id}`} title="Manually update metrics" className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/10">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onEdit(post)} data-testid={`edit-post-${post.id}`} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(post.id)} data-testid={`delete-post-${post.id}`} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-accent">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {syncOpen && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">Sync from Instagram</p>
                {!post.postUrl && <span className="text-[10px] text-destructive ml-auto">Requires a post URL</span>}
              </div>
              {checkpoints.map(cp => (
                <div key={cp.key} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${cp.bg}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${cp.color}`}>{cp.label}</p>
                    {cp.hasData && (
                      <p className="text-[10px] text-muted-foreground">{cp.views?.toLocaleString()} views</p>
                    )}
                    {cp.syncedAt && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Last synced {format(new Date(cp.syncedAt), "MMM d, h:mm a")}
                      </p>
                    )}
                    {!cp.syncedAt && !cp.hasData && (
                      <p className="text-[10px] text-muted-foreground">Not synced yet</p>
                    )}
                    {!cp.syncedAt && cp.hasData && (
                      <p className="text-[10px] text-muted-foreground">Manually entered</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncCheckpoint(cp.key)}
                    disabled={syncing !== null || !post.postUrl || isYt}
                    className="ml-2 h-7 text-xs gap-1 flex-shrink-0"
                    data-testid={`sync-${cp.key}-${post.id}`}
                  >
                    {syncing === cp.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Sync
                  </Button>
                </div>
              ))}
              {isYt && <p className="text-[10px] text-muted-foreground text-center">Auto-sync is only available for Instagram posts.</p>}
            </div>
          )}
        </CardContent>
      </Card>
      <MetricsUpdateDialog post={post} clientId={clientId} platform={platform} open={metricsOpen} onClose={() => setMetricsOpen(false)} />
    </>
  );
}

function MonthView({ posts, platform, monthKey, onBack, clientId }: { posts: any[]; platform: string; monthKey: string; onBack: () => void; clientId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();
  const isYt = platform === "youtube";

  const [year, month] = monthKey.split("-").map(Number);
  const monthName = MONTHS[month - 1];
  const fullMonthPosts = posts;

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/content/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/content/${clientId}`] }); toast({ title: "Post deleted" }); },
  });

  const totalViews = fullMonthPosts.reduce((s, p) => s + p.views, 0);
  const totalFollowers = fullMonthPosts.reduce((s, p) => s + (isYt ? p.subscribersGained : p.followersGained), 0);
  const avgEr = fullMonthPosts.length > 0
    ? fullMonthPosts.reduce((s, p) => s + (engRate(p.views, p.likes, p.comments, p.saves) || 0), 0) / fullMonthPosts.length
    : 0;
  const bestPost = fullMonthPosts.length > 0 ? [...fullMonthPosts].sort((a, b) => b.views - a.views)[0] : null;

  const byDay: Record<string, any[]> = {};
  fullMonthPosts.forEach(p => {
    const day = format(new Date(p.postDate), "yyyy-MM-dd");
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(p);
  });
  const days = Object.keys(byDay).sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} data-testid="button-back-month" className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{monthName} {year}</h2>
          <p className="text-xs text-muted-foreground">{fullMonthPosts.length} posts · {isYt ? "YouTube" : "Instagram"}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-log-post-month">
            <Plus className="w-4 h-4 mr-1.5" /> Log {isYt ? "Video" : "Post"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Posts This Month", value: fullMonthPosts.length, icon: isYt ? Youtube : Instagram, color: isYt ? "text-red-400" : "text-pink-400" },
          { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
          { label: !isYt ? "Avg Engagement" : "Subscribers", value: !isYt ? `${avgEr.toFixed(2)}%` : `+${totalFollowers}`, icon: !isYt ? Activity : Users, color: "text-primary" },
          { label: !isYt ? "Followers Gained" : "Total Likes", value: `+${totalFollowers}`, icon: Users, color: "text-green-400" },
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

      {bestPost && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-yellow-400">Best Post This Month</p>
            <p className="text-sm font-medium text-foreground mt-0.5">{bestPost.title || "Untitled"}</p>
            <p className="text-xs text-muted-foreground">{bestPost.views.toLocaleString()} views · {format(new Date(bestPost.postDate), "MMM d")}</p>
          </div>
        </div>
      )}

      <MonthlyAnalyticsCharts posts={fullMonthPosts} platform={platform} />

      {fullMonthPosts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          {isYt ? <Youtube className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" /> : <Instagram className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />}
          <p className="text-sm text-muted-foreground font-medium">No posts logged for {monthName}</p>
          <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Log First Post
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Posts</p>
          {days.map(day => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">{format(new Date(day), "EEEE, MMMM d")}</p>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{byDay[day].length}</Badge>
              </div>
              <div className="space-y-2 ml-5">
                {byDay[day].map(post => (
                  <PostCard key={post.id} post={post} platform={platform} clientId={clientId} onEdit={setEditPost} onDelete={(id) => del.mutate(id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-6">
        {showReport ? (
          <AIReportGenerator posts={fullMonthPosts} platform={platform as any} />
        ) : (
          <button onClick={() => setShowReport(true)} data-testid="button-show-ai-report" className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-primary/30 rounded-2xl text-sm text-muted-foreground hover:text-primary hover:border-primary/60 hover:bg-primary/5 transition-all">
            <Sparkles className="w-4 h-4" /> Generate AI Report
          </button>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log {isYt ? "YouTube Video" : "Instagram Post"}</DialogTitle></DialogHeader>
          <PostForm clientId={clientId} platform={platform} onClose={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {editPost && (
        <Dialog open={!!editPost} onOpenChange={() => setEditPost(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
            <PostForm clientId={clientId} platform={platform} post={editPost} onClose={() => setEditPost(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function InstagramSetupCard({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const { data: saved, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/instagram/profile-report"],
    enabled: !!userId,
  });

  const analyze = async () => {
    const input = url.trim();
    if (!input) return;
    let profileUrl = input;
    if (!profileUrl.startsWith("http")) {
      const handle = profileUrl.replace(/^@/, "");
      profileUrl = `https://www.instagram.com/${handle}/`;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/instagram/analyze-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Analysis failed");
      toast({ title: "Profile analysed!", description: `${data.newPostsImported} new posts synced.` });
      setUrl("");
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const re = saved?.report;

  if (isLoading) {
    return (
      <Card className="border border-card-border">
        <CardContent className="p-5">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${re ? "border-primary/30 bg-primary/5" : "border-dashed border-primary/40 bg-primary/5"}`} data-testid="instagram-setup-card">
      <CardContent className="p-5">
        {!re ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Instagram className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Set Up Your Instagram Profile</p>
                <p className="text-xs text-muted-foreground">AI analysis + auto-sync last 30 posts to tracking</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !analyzing && analyze()}
                placeholder="instagram.com/yourhandle or @yourhandle"
                className="h-9 text-sm flex-1"
                disabled={analyzing}
                data-testid="input-instagram-url"
              />
              <Button size="sm" onClick={analyze} disabled={!url.trim() || analyzing} className="flex-shrink-0 gap-1.5" data-testid="button-analyze-profile">
                {analyzing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Analysing…</> : <><Sparkles className="w-3.5 h-3.5" />Analyse</>}
              </Button>
            </div>
            {analyzing && <p className="text-xs text-muted-foreground mt-2 animate-pulse">Scraping posts + running AI analysis… ~30 seconds</p>}
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Instagram className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">@{saved.handle ?? "your profile"}</p>
                  <p className="text-xs text-muted-foreground">{saved.postCount} posts analysed</p>
                </div>
              </div>
              <button
                onClick={() => { setUrl(saved.instagramUrl); }}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-md px-2 py-1 transition-colors"
                data-testid="button-reanalyze"
              >
                <RefreshCw className="w-3 h-3" /> Re-sync
              </button>
            </div>
            {url && (
              <div className="flex gap-2 mb-3">
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="instagram.com/yourhandle" className="h-8 text-sm flex-1" disabled={analyzing} />
                <Button size="sm" onClick={analyze} disabled={!url.trim() || analyzing} className="flex-shrink-0 gap-1.5 h-8 text-xs">
                  {analyzing ? <><RefreshCw className="w-3 h-3 animate-spin" />Running…</> : <><Sparkles className="w-3 h-3" />Run</>}
                </Button>
                <button onClick={() => setUrl("")} className="text-xs text-muted-foreground hover:text-foreground px-1">✕</button>
              </div>
            )}
            {analyzing && <p className="text-xs text-muted-foreground mb-3 animate-pulse">Scraping posts + running AI analysis… ~30 seconds</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[
                { icon: Zap, label: "Niche", value: re.niche, color: "text-yellow-400" },
                { icon: Users, label: "Audience", value: re.audienceType, color: "text-blue-400" },
                { icon: BarChart2, label: "Avg ER", value: re.avgEngagementRate, color: "text-green-400" },
                { icon: Instagram, label: "Top Format", value: re.topContentType, color: "text-pink-400" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-card border border-card-border rounded-xl p-2.5 text-center">
                  <Icon className={`w-3.5 h-3.5 ${color} mx-auto mb-1`} />
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-[11px] font-semibold text-foreground mt-0.5 leading-tight">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3 mb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">AI Summary</p>
              <p className="text-xs text-foreground leading-relaxed">{re.summary}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-card border border-card-border rounded-xl p-3">
                <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Strengths</p>
                <ul className="space-y-1">
                  {(re.strengths || []).map((s: string, i: number) => (
                    <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5"><span className="text-green-400 flex-shrink-0">•</span>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-3">
                <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Gaps</p>
                <ul className="space-y-1">
                  {(re.gaps || []).map((g: string, i: number) => (
                    <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5"><span className="text-yellow-400 flex-shrink-0">•</span>{g}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-3">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Actions</p>
                <ul className="space-y-1">
                  {(re.recommendations || []).map((r: string, i: number) => (
                    <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5"><span className="text-primary flex-shrink-0">•</span>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformTracking({ platform }: { platform: "instagram" | "youtube" }) {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const isYt = platform === "youtube";

  const handleImportProfile = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      let data: any;
      if (isYt) {
        data = await apiRequest("POST", "/api/youtube/import-channel", {
          channelUrl: importUrl.trim(),
          clientId: user?.id,
        });
        queryClient.invalidateQueries({ queryKey: [`/api/content/${user?.id}`] });
        const channelName = data.channel?.title ? ` from ${data.channel.title}` : "";
        toast({ title: `${data.imported} videos imported!`, description: `Real stats pulled directly from YouTube${channelName}.` });
      } else {
        data = await apiRequest("POST", "/api/instagram/sync-profile", {
          profileUrl: importUrl.trim(),
          clientId: user?.id,
          platform,
        });
        queryClient.invalidateQueries({ queryKey: [`/api/content/${user?.id}`] });
        toast({ title: `${data.imported} posts imported!`, description: "Real stats pulled directly from Instagram." });
      }
      setImportOpen(false);
      setImportUrl("");
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const { data: allPosts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/content/${user?.id}`],
    enabled: !!user?.id,
  });

  const posts = allPosts.filter(p => p.platform === platform);

  const monthMap: Record<string, any[]> = {};
  posts.forEach(p => {
    const key = format(new Date(p.postDate), "yyyy-MM");
    if (!monthMap[key]) monthMap[key] = [];
    monthMap[key].push(p);
  });

  const now = new Date();
  const currentKey = format(now, "yyyy-MM");
  if (!monthMap[currentKey]) monthMap[currentKey] = [];

  const sortedMonths = Object.keys(monthMap).sort().reverse();

  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalFollowers = posts.reduce((s, p) => s + (isYt ? p.subscribersGained : p.followersGained), 0);
  const totalPosts = posts.length;

  const backHref = "/tracking/content";

  if (selectedMonth) {
    return (
      <ClientLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <MonthView
            posts={monthMap[selectedMonth] || []}
            platform={platform}
            monthKey={selectedMonth}
            onBack={() => setSelectedMonth(null)}
            clientId={user?.id || ""}
          />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href={backHref}>
            <button data-testid="button-back-content" className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 ${isYt ? "bg-red-500/10" : "bg-pink-500/10"} rounded-xl flex items-center justify-center`}>
              {isYt ? <Youtube className="w-5 h-5 text-red-400" /> : <Instagram className="w-5 h-5 text-pink-400" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{isYt ? "YouTube" : "Instagram"} Tracking</h1>
              <p className="text-xs text-muted-foreground">Month-by-month performance overview</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className={isYt ? "border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5" : "border-pink-500/30 text-pink-400 hover:bg-pink-500/10 gap-1.5"} data-testid={isYt ? "button-import-youtube" : "button-import-instagram"}>
              <RefreshCw className="w-3.5 h-3.5" /> {isYt ? "Import from YouTube" : "Import from Instagram"}
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} data-testid={`button-log-${platform}`}>
              <Plus className="w-4 h-4 mr-1.5" /> Log {isYt ? "Video" : "Post"}
            </Button>
          </div>
        </div>

        {/* Import Profile Dialog */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isYt ? <Youtube className="w-4 h-4 text-red-400" /> : <Instagram className="w-4 h-4 text-pink-400" />}
                {isYt ? "Import Videos from YouTube" : "Import Posts from Instagram"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                {isYt
                  ? "Paste your YouTube channel link and we'll automatically pull your last 20 videos with real views, likes, and comments directly from the YouTube API."
                  : "Paste your Instagram profile link and we'll automatically pull your last 20 posts with real views, likes, and comments."}
              </p>
              <div>
                <Label>{isYt ? "YouTube Channel URL" : "Instagram Profile URL"}</Label>
                <Input
                  className="mt-1"
                  placeholder={isYt ? "https://youtube.com/@yourchannel" : "https://instagram.com/yourhandle"}
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  data-testid="input-import-url"
                />
                {isYt && <p className="text-[11px] text-muted-foreground mt-1">Supports @handle, /channel/, and /user/ URLs.</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handleImportProfile} disabled={importing || !importUrl.trim()} data-testid="button-confirm-import">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {importing ? "Importing…" : isYt ? "Import Videos" : "Import Posts"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Instagram Profile Setup — shown first on Instagram only */}
        {!isYt && user?.id && <InstagramSetupCard userId={user.id} />}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Posts", value: totalPosts, icon: isYt ? Youtube : Instagram, color: isYt ? "text-red-400" : "text-pink-400" },
            { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
            { label: isYt ? "Subscribers Gained" : "Followers Gained", value: `+${totalFollowers}`, icon: Users, color: "text-green-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border border-card-border">
              <CardContent className="p-3">
                <Icon className={`w-4 h-4 ${color} mb-1.5`} />
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Posts by Month</p>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedMonths.map(key => {
                const [yr, mo] = key.split("-").map(Number);
                const mPosts = monthMap[key];
                const mViews = mPosts.reduce((s, p) => s + p.views, 0);
                const mAvgEr = mPosts.length > 0
                  ? mPosts.reduce((s, p) => s + (engRate(p.views, p.likes, p.comments, p.saves) || 0), 0) / mPosts.length
                  : 0;
                const isCurrentMonth = key === currentKey;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedMonth(key)}
                    data-testid={`month-card-${key}`}
                    className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-md group ${
                      isCurrentMonth
                        ? "border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10"
                        : "border-card-border bg-card hover:border-primary/30 hover:bg-accent"
                    }`}
                  >
                    {isCurrentMonth && (
                      <div className="absolute top-2 right-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      </div>
                    )}
                    <p className="text-sm font-bold text-foreground">{MONTHS[mo - 1]}</p>
                    <p className="text-[10px] text-muted-foreground">{yr}</p>
                    <p className="text-xl font-bold text-foreground mt-2">{mPosts.length}</p>
                    <p className="text-[10px] text-muted-foreground">{mPosts.length === 1 ? "post" : "posts"}</p>
                    {mPosts.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">{mViews.toLocaleString()} views</p>
                        {!isYt && <p className="text-[10px] text-primary">{mAvgEr.toFixed(1)}% ER</p>}
                      </div>
                    )}
                    {mPosts.length === 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 opacity-60">No posts yet</p>
                    )}
                    <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Log {isYt ? "YouTube Video" : "Instagram Post"}</DialogTitle></DialogHeader>
            <PostForm clientId={user?.id || ""} platform={platform} onClose={() => setAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}

export function InstagramTracking() {
  return <PlatformTracking platform="instagram" />;
}

export function YouTubeTracking() {
  return <PlatformTracking platform="youtube" />;
}

export function ContentTrackingIndex() {
  return (
    <ClientLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8">
        <div className="max-w-3xl w-full space-y-8">
          <div className="text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart2 className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Content Metrics</h1>
            <p className="text-muted-foreground mt-2">Choose a platform to view your content performance</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Link href="/tracking/content/instagram">
              <div data-testid="card-instagram" className="group cursor-pointer p-7 rounded-2xl border border-card-border bg-card hover:border-pink-500/40 hover:bg-pink-500/5 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-center">
                <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-pink-500/20 transition-colors">
                  <Instagram className="w-7 h-7 text-pink-400" />
                </div>
                <h3 className="font-semibold text-foreground text-base">Instagram</h3>
                <p className="text-xs text-muted-foreground mt-1.5">Reels, carousels, posts & stories</p>
                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground group-hover:text-pink-400 transition-colors">
                  <span>Open</span><ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>

            <Link href="/tracking/content/youtube">
              <div data-testid="card-youtube" className="group cursor-pointer p-7 rounded-2xl border border-card-border bg-card hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-center">
                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-red-500/20 transition-colors">
                  <Youtube className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="font-semibold text-foreground text-base">YouTube</h3>
                <p className="text-xs text-muted-foreground mt-1.5">Video views & subscriber growth</p>
                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground group-hover:text-red-400 transition-colors">
                  <span>Open</span><ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>

            <Link href="/tracking/content/calendar">
              <div data-testid="card-calendar" className="group cursor-pointer p-7 rounded-2xl border border-card-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <CalendarDays className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-base">Calendar</h3>
                <p className="text-xs text-muted-foreground mt-1.5">Visual content posting schedule</p>
                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Open</span><ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export function TrackingHome() {
  const { user } = useAuth();
  const isElite = (user as any)?.plan === "elite";
  const [salesExpanded, setSalesExpanded] = useState(false);

  return (
    <ClientLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8">
        <div className="max-w-3xl w-full space-y-8">
          <div className="text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Tracking</h1>
            <p className="text-muted-foreground mt-2">Select a metrics dashboard to get started</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" data-tour="tracking-home">
            <Link href="/tracking/content">
              <div data-testid="card-tracking-content" className="group cursor-pointer p-6 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                  <BarChart2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Content</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Instagram & YouTube</p>
                <div className="mt-2.5 flex items-center justify-center gap-1 text-[11px] text-primary">
                  <span>Open</span><ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Link>

            <div className="relative">
              <button
                data-testid="card-tracking-sales"
                onClick={() => setSalesExpanded(e => !e)}
                className="w-full group cursor-pointer p-6 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-center"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Sales</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Pipeline & conversions</p>
                <div className="mt-2.5 flex items-center justify-center gap-1 text-[11px] text-primary">
                  <span>{salesExpanded ? "Close" : "Open"}</span>
                  {salesExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
              </button>
              {salesExpanded && (
                <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-card border border-primary/30 rounded-2xl shadow-xl p-4 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sales Tools</p>
                  <Link href="/dm-tracker">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer" data-testid="link-dm-tracker">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Inbox className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">DM Tracker</p>
                        <p className="text-[10px] text-muted-foreground">Hot / Warm / Cold pipeline</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <div data-testid="card-tracking-ads" className="p-6 rounded-2xl border border-dashed border-border bg-card/50 opacity-60 text-center cursor-not-allowed">
              <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">Ad Metrics</h3>
              <p className="text-[11px] text-muted-foreground mt-1">Paid ad performance</p>
              <div className="mt-2.5">
                <Badge variant="outline" className="text-[10px]">Soon</Badge>
              </div>
            </div>

            {isElite && (
              <Link href="/progress">
                <div data-testid="card-tracking-progress" className="group cursor-pointer p-6 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Progress</h3>
                  <p className="text-[11px] text-muted-foreground mt-1">Program milestones</p>
                  <div className="mt-2.5 flex items-center justify-center gap-1 text-[11px] text-primary">
                    <span>Open</span><ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
