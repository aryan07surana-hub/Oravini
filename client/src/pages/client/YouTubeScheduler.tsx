import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Youtube, CheckCircle, XCircle, Loader2, Trash2, Clock, Send, Calendar,
  Link2, Tag, AlignLeft, Film, ChevronDown, ChevronUp, ExternalLink, Plus,
} from "lucide-react";
import { useLocation } from "wouter";

const PRIVACY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "private", label: "Private" },
];

const CATEGORY_OPTIONS = [
  { value: "22", label: "People & Blogs" },
  { value: "26", label: "Howto & Style" },
  { value: "24", label: "Entertainment" },
  { value: "28", label: "Science & Technology" },
  { value: "27", label: "Education" },
  { value: "25", label: "News & Politics" },
  { value: "17", label: "Sports" },
  { value: "10", label: "Music" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: "Scheduled", class: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    posted: { label: "Posted", class: "bg-green-500/10 text-green-400 border-green-500/20" },
    failed: { label: "Failed", class: "bg-red-500/10 text-red-400 border-red-500/20" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.class}`}>{s.label}</span>;
}

export default function YouTubeScheduler() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<"connect" | "post" | "scheduled">("connect");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [category, setCategory] = useState("22");
  const [privacyStatus, setPrivacyStatus] = useState("public");
  const [scheduledFor, setScheduledFor] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("yt_connected") === "1") {
      toast({ title: "YouTube connected!", description: "Your channel is now linked." });
      setActiveTab("post");
      window.history.replaceState({}, "", "/youtube-scheduler");
    } else if (params.get("yt_error")) {
      const msg = decodeURIComponent(params.get("yt_error") || "");
      toast({
        title: "Connection failed",
        description: msg === "missing_code" ? "No authorisation code received. Please try again." : (msg || "Could not connect YouTube."),
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/youtube-scheduler");
    }
  }, []);

  const { data: status, isLoading: statusLoading } = useQuery<any>({
    queryKey: ["/api/youtube/status"],
  });

  const { data: scheduled = [], isLoading: scheduledLoading } = useQuery<any[]>({
    queryKey: ["/api/youtube/scheduled"],
    enabled: activeTab === "scheduled",
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/youtube/disconnect"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/youtube/status"] });
      toast({ title: "YouTube disconnected" });
      setActiveTab("connect");
    },
  });

  const postNowMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/youtube/post", {
      title: title.trim(), description, tags: tagsRaw.split(",").map(t => t.trim()).filter(Boolean),
      category, privacyStatus, videoUrl: videoUrl.trim(),
    }),
    onSuccess: (data: any) => {
      toast({ title: "Video uploaded!", description: `Live at youtube.com/watch?v=${data.videoId}` });
      setTitle(""); setDescription(""); setTagsRaw(""); setVideoUrl(""); setThumbnailUrl("");
    },
    onError: (err: any) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const scheduleMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/youtube/schedule", {
      title: title.trim(), description, tags: tagsRaw.split(",").map(t => t.trim()).filter(Boolean),
      category, privacyStatus, videoUrl: videoUrl.trim(), thumbnailUrl: thumbnailUrl.trim() || null, scheduledFor,
    }),
    onSuccess: () => {
      toast({ title: "Video scheduled!" });
      qc.invalidateQueries({ queryKey: ["/api/youtube/scheduled"] });
      setTitle(""); setDescription(""); setTagsRaw(""); setVideoUrl(""); setThumbnailUrl(""); setScheduledFor("");
      setActiveTab("scheduled");
    },
    onError: (err: any) => toast({ title: "Schedule failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/youtube/scheduled/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/youtube/scheduled"] });
      toast({ title: "Deleted" });
    },
  });

  const isConnected = status?.connected;
  const isPending = postNowMutation.isPending || scheduleMutation.isPending;

  const tabs: { id: string; label: string; disabled?: boolean }[] = [
    { id: "connect", label: "Connect" },
    { id: "post", label: "Post / Schedule", disabled: !isConnected },
    { id: "scheduled", label: "Scheduled" },
  ];

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-600/15 border border-red-600/30">
            <Youtube className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">YouTube Scheduler</h1>
            <p className="text-xs text-muted-foreground">Upload & schedule videos to your YouTube channel</p>
          </div>
          {isConnected && (
            <div className="ml-auto flex items-center gap-2">
              <img src={status.channelThumbnail} alt="" className="w-7 h-7 rounded-full border border-white/10" />
              <span className="text-xs text-zinc-400 font-medium">{status.channelTitle}</span>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">Connected</Badge>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => !t.disabled && setActiveTab(t.id as any)}
              disabled={t.disabled}
              data-testid={`tab-${t.id}`}
              className={[
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                t.disabled ? "text-zinc-600 cursor-not-allowed" : "",
                activeTab === t.id ? "bg-primary text-black" : "text-zinc-400 hover:text-white",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Connect Tab ── */}
        {activeTab === "connect" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-red-600/10 border border-red-600/20">
              <Youtube className="w-8 h-8 text-red-500" />
            </div>
            {statusLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500 mx-auto" />
            ) : isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <p className="text-white font-semibold">Connected to <span className="text-primary">{status.channelTitle}</span></p>
                </div>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => setActiveTab("post")} className="bg-primary text-black hover:bg-primary/90 font-bold" data-testid="go-to-post">
                    <Film className="w-4 h-4 mr-2" /> Schedule a Video
                  </Button>
                  <Button variant="outline" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} className="border-zinc-700 text-zinc-300" data-testid="disconnect-youtube">
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                  Connect your YouTube channel to upload and schedule videos directly from this portal.
                </p>
                <Button
                  onClick={() => window.location.href = "/api/auth/youtube"}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2"
                  data-testid="connect-youtube"
                >
                  <Youtube className="w-4 h-4" /> Connect YouTube Channel
                </Button>
                <p className="text-xs text-zinc-600">
                  Requires YouTube Data API v3 credentials in your Google Cloud Console
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Post / Schedule Tab ── */}
        {activeTab === "post" && isConnected && (
          <div className="space-y-5">
            {/* Mode toggle */}
            <div className="flex gap-2">
              {(["now", "schedule"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  data-testid={`mode-${m}`}
                  className={[
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                    mode === m
                      ? "bg-primary text-black border-primary"
                      : "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600",
                  ].join(" ")}
                >
                  {m === "now" ? <><Send className="w-4 h-4" /> Post Now</> : <><Calendar className="w-4 h-4" /> Schedule</>}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><Film className="w-3.5 h-3.5" /> Video Title *</label>
                <Input
                  value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="My awesome video title..."
                  className="bg-zinc-900 border-zinc-700 text-white"
                  data-testid="input-title"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" /> Description</label>
                <Textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  rows={4} placeholder="Video description..."
                  className="bg-zinc-900 border-zinc-700 text-white resize-none"
                  data-testid="input-description"
                />
              </div>

              {/* Video URL */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Video URL * <span className="text-zinc-600">(direct downloadable link)</span></label>
                <Input
                  value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/my-video.mp4"
                  className="bg-zinc-900 border-zinc-700 text-white"
                  data-testid="input-video-url"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Tags <span className="text-zinc-600">(comma separated)</span></label>
                <Input
                  value={tagsRaw} onChange={e => setTagsRaw(e.target.value)}
                  placeholder="brand, marketing, growth..."
                  className="bg-zinc-900 border-zinc-700 text-white"
                  data-testid="input-tags"
                />
              </div>

              {/* Category + Privacy */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">Category</label>
                  <select
                    value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2"
                    data-testid="select-category"
                  >
                    {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">Privacy</label>
                  <select
                    value={privacyStatus} onChange={e => setPrivacyStatus(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2"
                    data-testid="select-privacy"
                  >
                    {PRIVACY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Schedule time */}
              {mode === "schedule" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Schedule Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor} onChange={e => setScheduledFor(e.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                    data-testid="input-scheduled-for"
                  />
                </div>
              )}

              {/* Submit */}
              <Button
                disabled={isPending || !title.trim() || !videoUrl.trim() || (mode === "schedule" && !scheduledFor)}
                onClick={() => mode === "now" ? postNowMutation.mutate() : scheduleMutation.mutate()}
                className="w-full h-11 font-bold bg-red-600 hover:bg-red-700 text-white gap-2"
                data-testid="submit-youtube"
              >
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === "now" ? "Uploading…" : "Scheduling…"}</>
                  : mode === "now"
                    ? <><Send className="w-4 h-4" /> Upload Now</>
                    : <><Calendar className="w-4 h-4" /> Schedule Video</>
                }
              </Button>

              <p className="text-xs text-zinc-600 text-center">
                The server will download your video from the URL and upload it to YouTube. Ensure the link is direct and publicly accessible.
              </p>
            </div>
          </div>
        )}

        {/* ── Scheduled Tab ── */}
        {activeTab === "scheduled" && (
          <div className="space-y-3">
            {scheduledLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
            ) : scheduled.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-10 text-center">
                <Youtube className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No scheduled videos yet</p>
                <Button size="sm" onClick={() => setActiveTab("post")} className="mt-4 bg-primary text-black font-bold" disabled={!isConnected}>
                  <Plus className="w-4 h-4 mr-1" /> Schedule a Video
                </Button>
              </div>
            ) : (
              scheduled.map((post: any) => (
                <div key={post.id} className="flex items-start gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40" data-testid={`scheduled-yt-${post.id}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-600/10 border border-red-600/20 flex-shrink-0 mt-0.5">
                    <Youtube className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{post.title}</p>
                      <StatusBadge status={post.status} />
                    </div>
                    {post.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{post.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(post.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="capitalize">{post.privacyStatus}</span>
                      {post.youtubeVideoId && (
                        <a href={`https://youtube.com/watch?v=${post.youtubeVideoId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:text-primary/80">
                          <ExternalLink className="w-3 h-3" /> Watch
                        </a>
                      )}
                    </div>
                    {post.errorMessage && <p className="text-xs text-red-400 mt-1">{post.errorMessage}</p>}
                  </div>
                  {post.status === "pending" && (
                    <button
                      onClick={() => deleteMutation.mutate(post.id)}
                      disabled={deleteMutation.isPending}
                      className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
                      data-testid={`delete-yt-${post.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
