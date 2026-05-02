import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Users, MonitorPlay, Video,
  BarChart3, Plus, Copy, Check, Trash2, ExternalLink,
  Play, Square, Clock, Eye, Link2, Settings2,
  Radio, Globe, Zap, Film, Phone, Mail,
  Target, UserCheck, Download, Mic, LayoutTemplate,
  ArrowRight, Building, Search, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import VideoHosting from "@/components/video-marketing/VideoHosting";

const GOLD = "#d4b461";

// ── Utility ─────────────────────────────────────────────────────────────────

function CopyBtn({ text, size = "sm" }: { text: string; size?: "sm" | "icon" }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <Button
      variant="ghost"
      size={size === "icon" ? "icon" : "sm"}
      onClick={copy}
      className="h-7 w-7 text-zinc-400 hover:text-white"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = GOLD,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <Card className="bg-zinc-900/60 border-zinc-800">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
            <p className="text-2xl font-black text-white">{value}</p>
            {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}33` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, desc, action }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}33` }}
      >
        <Icon className="w-8 h-8" style={{ color: `${GOLD}80` }} />
      </div>
      <p className="text-base font-semibold text-white mb-2">{title}</p>
      <p className="text-sm text-zinc-500 max-w-xs mb-5">{desc}</p>
      {action}
    </div>
  );
}

function StagePill({ stage }: { stage: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    lead: { color: "#60a5fa", bg: "#60a5fa18", label: "Lead" },
    registered: { color: "#fbbf24", bg: "#fbbf2418", label: "Registered" },
    attended: { color: "#34d399", bg: "#34d39918", label: "Attended" },
    converted: { color: GOLD, bg: `${GOLD}18`, label: "Converted" },
    webinar: { color: "#a78bfa", bg: "#a78bfa18", label: "Webinar" },
  };
  const s = map[stage] || { color: "#71717a", bg: "#71717a18", label: stage };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

// ── WEBINARS TAB ─────────────────────────────────────────────────────────────

const defaultWebinarForm = () => ({
  title: "",
  description: "",
  scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  durationMinutes: 60,
  maxAttendees: "",
  offerUrl: "",
  offerTitle: "",
  isPublic: false,
});

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-red-500/90">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
        style={{ color: "#60a5fa", background: "#60a5fa18" }}
      >
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-zinc-400 bg-zinc-800">
      Completed
    </span>
  );
}

function WebinarsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultWebinarForm());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: webinars = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/webinars"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/webinars", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinars"] });
      setShowCreate(false);
      setForm(defaultWebinarForm());
      toast({ title: "Webinar created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/webinars/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinars"] });
      toast({ title: "Webinar deleted" });
    },
  });

  const startMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/webinars/${id}/start`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinars"] });
      toast({ title: "Webinar is now LIVE! 🔴" });
    },
  });

  const endMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/webinars/${id}/end`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinars"] });
      toast({ title: "Webinar ended" });
    },
  });

  const handleCreate = () => {
    if (!form.title || !form.scheduledAt) {
      toast({ title: "Title and date required", variant: "destructive" });
      return;
    }
    createMut.mutate({
      title: form.title,
      description: form.description || null,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      durationMinutes: Number(form.durationMinutes) || 60,
      maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null,
      offerUrl: form.offerUrl || null,
      offerTitle: form.offerTitle || null,
      isPublic: form.isPublic,
    });
  };

  const live = webinars.filter((w: any) => w.status === "live");
  const upcoming = webinars.filter((w: any) => w.status === "upcoming");
  const completed = webinars.filter((w: any) => w.status === "completed");
  const baseUrl = window.location.origin;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MonitorPlay} label="Total" value={webinars.length} />
        <StatCard icon={Radio} label="Live Now" value={live.length} color="#ef4444" />
        <StatCard icon={Calendar} label="Upcoming" value={upcoming.length} color="#60a5fa" />
        <StatCard icon={Check} label="Completed" value={completed.length} color="#34d399" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Your Webinars</h3>
        <Button
          size="sm"
          className="gap-1.5 font-semibold"
          style={{ background: GOLD, color: "#000" }}
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" /> New Webinar
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />)}
        </div>
      ) : webinars.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="No webinars yet"
          desc="Create your first webinar to start collecting registrations and going live."
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Webinar
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {webinars.map((w: any) => (
            <Card key={w.id} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <StatusBadge status={w.status} />
                      <h4 className="font-bold text-white truncate">{w.title}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                      {w.scheduledAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(w.scheduledAt), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {w.durationMinutes}m
                      </span>
                      {w.maxAttendees && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Max {w.maxAttendees}
                        </span>
                      )}
                      {w.meetingCode && (
                        <span className="font-mono text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded">
                          {w.meetingCode}
                        </span>
                      )}
                    </div>
                    {/* Links */}
                    {expandedId === w.id && w.meetingCode && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-2">
                          <Link2 className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                          <span className="text-[11px] text-zinc-400 flex-1 truncate font-mono">
                            {baseUrl}/join/{w.meetingCode}
                          </span>
                          <CopyBtn text={`${baseUrl}/join/${w.meetingCode}`} size="icon" />
                        </div>
                        {w.description && (
                          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{w.description}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-zinc-400 hover:text-white"
                      onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                    >
                      {expandedId === w.id ? "Less" : "Details"}
                    </Button>
                    {w.status === "upcoming" && (
                      <Button
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1"
                        style={{ background: "#ef4444", color: "#fff" }}
                        onClick={() => startMut.mutate(w.id)}
                        disabled={startMut.isPending}
                      >
                        <Play className="w-3 h-3" /> Go Live
                      </Button>
                    )}
                    {w.status === "live" && (
                      <Button
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1 bg-zinc-700 hover:bg-zinc-600 text-white"
                        onClick={() => endMut.mutate(w.id)}
                        disabled={endMut.isPending}
                      >
                        <Square className="w-3 h-3" /> End
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-red-400"
                      onClick={() => deleteMut.mutate(w.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Create Webinar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Title *</label>
              <Input
                placeholder="e.g. Scale Your Business with Video"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Description</label>
              <Textarea
                placeholder="What will attendees learn?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Duration (minutes)</label>
                <Input
                  type="number"
                  min={15}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Max Attendees (optional)</label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={form.maxAttendees}
                onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="border-t border-zinc-800 pt-3">
              <p className="text-xs font-semibold text-zinc-400 mb-2.5 uppercase tracking-wider">Offer / CTA</p>
              <div className="space-y-3">
                <Input
                  placeholder="Offer button label (e.g. Get the Course)"
                  value={form.offerTitle}
                  onChange={(e) => setForm({ ...form, offerTitle: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <Input
                  placeholder="Offer URL"
                  value={form.offerUrl}
                  onChange={(e) => setForm({ ...form, offerUrl: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="accent-[#d4b461]"
              />
              <label htmlFor="isPublic" className="text-sm text-zinc-300">
                Show on public webinar calendar
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMut.isPending}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Creating…" : "Create Webinar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── VIDEOS TAB ───────────────────────────────────────────────────────────────

function VideosTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    duration: "",
    category: "General",
    isPublic: false,
  });

  const { data: videos = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/video-events"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/video-events", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      setShowCreate(false);
      setForm({ title: "", description: "", videoUrl: "", thumbnailUrl: "", duration: "", category: "General", isPublic: false });
      toast({ title: "Video added!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/video-events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      toast({ title: "Video removed" });
    },
  });

  const categories = ["General", "Training", "Masterclass", "Product Demo", "Tutorial", "Webinar Replay"];
  const totalViews = (videos as any[]).reduce((s: number, v: any) => s + (v.views || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Video} label="Total Videos" value={videos.length} />
        <StatCard icon={Eye} label="Total Views" value={totalViews} color="#60a5fa" />
        <StatCard icon={Globe} label="Public" value={(videos as any[]).filter((v: any) => v.isPublic).length} color="#34d399" />
        <StatCard icon={Film} label="Categories" value={new Set((videos as any[]).map((v: any) => v.category)).size} color="#a78bfa" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Video Library</h3>
        <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Add Video
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl bg-zinc-800" />)}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No videos yet"
          desc="Add your video links to host them in your video library."
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Video
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(videos as any[]).map((v: any) => (
            <Card key={v.id} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden group">
              <div
                className="h-36 flex items-center justify-center relative"
                style={{
                  background: v.thumbnailUrl
                    ? `url(${v.thumbnailUrl}) center/cover no-repeat`
                    : `linear-gradient(135deg, ${GOLD}10, rgba(18,14,30,0.6))`,
                }}
              >
                {!v.thumbnailUrl && (
                  <Film className="w-10 h-10" style={{ color: `${GOLD}50` }} />
                )}
                {v.category && (
                  <Badge className="absolute top-2 right-2 text-[10px]" style={{ background: `${GOLD}22`, color: GOLD, border: "none" }}>
                    {v.category}
                  </Badge>
                )}
                {v.isPublic && (
                  <Badge className="absolute top-2 left-2 text-[10px] bg-green-500/20 text-green-400 border-none">
                    Public
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <h4 className="font-bold text-white text-sm line-clamp-1 mb-1">{v.title}</h4>
                {v.description && (
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{v.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views || 0}</span>
                    {v.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {v.duration}m</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {v.videoUrl && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" asChild>
                        <a href={v.videoUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-red-400"
                      onClick={() => deleteMut.mutate(v.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Add Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Title *</label>
              <Input
                placeholder="Video title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Video URL *</label>
              <Input
                placeholder="https://..."
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Description</label>
              <Textarea
                placeholder="What is this video about?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="text-zinc-300">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Duration (min)</label>
                <Input
                  type="number"
                  placeholder="e.g. 45"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Thumbnail URL (optional)</label>
              <Input
                placeholder="https://..."
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="videoPublic"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="accent-[#d4b461]"
              />
              <label htmlFor="videoPublic" className="text-sm text-zinc-300">Make video publicly accessible</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={() => {
                if (!form.title || !form.videoUrl) {
                  return;
                }
                createMut.mutate({
                  title: form.title,
                  description: form.description || null,
                  videoUrl: form.videoUrl,
                  thumbnailUrl: form.thumbnailUrl || null,
                  duration: form.duration ? Number(form.duration) : null,
                  category: form.category,
                  isPublic: form.isPublic,
                });
              }}
              disabled={createMut.isPending || !form.title || !form.videoUrl}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Adding…" : "Add Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── LANDING PAGES TAB ─────────────────────────────────────────────────────────

function LandingPagesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWebinarId, setSelectedWebinarId] = useState<string>("");
  const [form, setForm] = useState({
    slug: "",
    headline: "",
    subheadline: "",
    presenterName: "",
    presenterTitle: "",
    ctaText: "Register Now",
    accentColor: "#d4b461",
    bodyContent: "",
  });

  const { data: pages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/webinar-landing-pages"],
  });

  const { data: webinars = [] } = useQuery<any[]>({
    queryKey: ["/api/webinars"],
  });

  const createMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("POST", `/api/webinars/${id}/landing-page`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-landing-pages"] });
      setShowCreate(false);
      toast({ title: "Landing page created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const publishMut = useMutation({
    mutationFn: ({ webinarId, published }: { webinarId: number; published: boolean }) =>
      apiRequest("PATCH", `/api/webinars/${webinarId}/landing-page`, { published }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-landing-pages"] });
    },
  });

  const published = (pages as any[]).filter((p: any) => p.published).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={LayoutTemplate} label="Total Pages" value={pages.length} />
        <StatCard icon={Globe} label="Published" value={published} color="#34d399" />
        <StatCard icon={Eye} label="Total Views" value={(pages as any[]).reduce((s: number, p: any) => s + (p.views || 0), 0)} color="#60a5fa" />
        <StatCard icon={UserCheck} label="Registrations" value={(pages as any[]).reduce((s: number, p: any) => s + (p.registrations || 0), 0)} color={GOLD} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Landing Pages</h3>
        <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Page
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />)}
        </div>
      ) : pages.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No landing pages yet"
          desc="Create a registration landing page for your webinar to collect leads."
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Landing Page
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {(pages as any[]).map((p: any) => (
            <Card key={p.id} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className="text-[10px] border-none"
                        style={p.published
                          ? { background: "#34d39918", color: "#34d399" }
                          : { background: "#71717a18", color: "#71717a" }
                        }
                      >
                        {p.published ? "Live" : "Draft"}
                      </Badge>
                      <h4 className="font-bold text-white truncate">{p.headline}</h4>
                    </div>
                    {p.subheadline && (
                      <p className="text-xs text-zinc-500 line-clamp-1 mb-2">{p.subheadline}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      {p.slug && (
                        <span className="flex items-center gap-1 font-mono text-[10px] bg-zinc-800 px-2 py-0.5 rounded">
                          /lp/{p.slug}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views || 0} views</span>
                      <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {p.registrations || 0} signups</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.slug && (
                      <CopyBtn text={`${window.location.origin}/lp/${p.slug}`} size="icon" />
                    )}
                    {p.slug && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" asChild>
                        <a href={`/lp/${p.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      style={p.published
                        ? { color: "#71717a" }
                        : { color: "#34d399" }
                      }
                      onClick={() => publishMut.mutate({ webinarId: p.webinarId, published: !p.published })}
                    >
                      {p.published ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Create Landing Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Link to Webinar</label>
              <Select value={selectedWebinarId} onValueChange={setSelectedWebinarId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select a webinar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {(webinars as any[]).map((w: any) => (
                    <SelectItem key={w.id} value={String(w.id)} className="text-zinc-300">
                      {w.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">URL Slug *</label>
              <Input
                placeholder="e.g. scale-your-business-webinar"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                className="bg-zinc-800 border-zinc-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Headline *</label>
              <Input
                placeholder="How to 10x Your Revenue in 90 Days"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Subheadline</label>
              <Input
                placeholder="Join 500+ entrepreneurs in this free masterclass"
                value={form.subheadline}
                onChange={(e) => setForm({ ...form, subheadline: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Presenter Name</label>
                <Input
                  placeholder="Your Name"
                  value={form.presenterName}
                  onChange={(e) => setForm({ ...form, presenterName: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Presenter Title</label>
                <Input
                  placeholder="CEO, Founder"
                  value={form.presenterTitle}
                  onChange={(e) => setForm({ ...form, presenterTitle: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">CTA Button Text</label>
              <Input
                placeholder="Register Now"
                value={form.ctaText}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Body / Key Points</label>
              <Textarea
                placeholder="What will attendees learn? Add key bullet points..."
                value={form.bodyContent}
                onChange={(e) => setForm({ ...form, bodyContent: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedWebinarId || !form.slug || !form.headline) {
                  toast({ title: "Please fill required fields", variant: "destructive" });
                  return;
                }
                createMut.mutate({
                  id: Number(selectedWebinarId),
                  data: {
                    slug: form.slug,
                    headline: form.headline,
                    subheadline: form.subheadline || null,
                    presenterName: form.presenterName || null,
                    presenterTitle: form.presenterTitle || null,
                    ctaText: form.ctaText || "Register Now",
                    accentColor: form.accentColor,
                    bodyContent: form.bodyContent || null,
                  },
                });
              }}
              disabled={createMut.isPending}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Creating…" : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── CRM / CONTACTS TAB ───────────────────────────────────────────────────────

const STAGES = [
  { id: "lead", label: "Lead", color: "#60a5fa", emoji: "🔵" },
  { id: "registered", label: "Registered", color: "#fbbf24", emoji: "🟡" },
  { id: "attended", label: "Attended", color: "#34d399", emoji: "🟢" },
  { id: "converted", label: "Converted", color: GOLD, emoji: "🟣" },
];

function CRMTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", stage: "lead", segment: "general", notes: "" });

  const { data: contacts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/webinar-contacts"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/webinar-contacts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-contacts"] });
      setShowCreate(false);
      setForm({ name: "", email: "", phone: "", company: "", stage: "lead", segment: "general", notes: "" });
      toast({ title: "Contact added!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/webinar-contacts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-contacts"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/webinar-contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-contacts"] });
      setSelected(null);
      toast({ title: "Contact deleted" });
    },
  });

  const filtered = (contacts as any[]).filter((c: any) => {
    const matchSearch = !search ||
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || c.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Phone", "Company", "Stage", "Segment", "Source", "Date"],
      ...(contacts as any[]).map((c: any) => [
        c.name || "", c.email || "", c.phone || "", c.company || "",
        c.stage || "", c.segment || "", c.source || "",
        c.createdAt ? format(new Date(c.createdAt), "yyyy-MM-dd") : "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "webinar-contacts.csv";
    a.click();
  };

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.id] = (contacts as any[]).filter((c: any) => c.stage === s.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Stage summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((s) => (
          <div
            key={s.id}
            className="p-4 rounded-xl cursor-pointer transition-all"
            style={{
              background: stageFilter === s.id ? `${s.color}18` : "rgba(39,39,42,0.6)",
              border: `1px solid ${stageFilter === s.id ? s.color + "55" : "rgba(63,63,70,0.8)"}`,
            }}
            onClick={() => setStageFilter(stageFilter === s.id ? "all" : s.id)}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: s.color }}>
              {s.emoji} {s.label}
            </p>
            <p className="text-2xl font-black text-white">{stageCounts[s.id] || 0}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white pl-9 h-9"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-zinc-400 hover:text-white gap-1.5"
          onClick={exportCSV}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
        <Button
          size="sm"
          style={{ background: GOLD, color: "#000" }}
          className="font-semibold gap-1.5 h-9"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" /> Add Contact
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-lg bg-zinc-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          desc="Contacts are added automatically when someone registers for a webinar, or add them manually."
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Contact
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Source</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((c: any) => (
                <tr
                  key={c.id}
                  className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  onClick={() => setSelected(c)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: `${GOLD}22`, color: GOLD }}
                      >
                        {(c.name || c.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{c.name || "—"}</p>
                        {c.company && <p className="text-[10px] text-zinc-500">{c.company}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs hidden md:table-cell">{c.email || "—"}</td>
                  <td className="px-4 py-3"><StagePill stage={c.stage || "lead"} /></td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">{c.source || "Manual"}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">
                    {c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-600 hover:text-red-400"
                      onClick={(e) => { e.stopPropagation(); deleteMut.mutate(c.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contact Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Contact Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black"
                  style={{ background: `${GOLD}22`, color: GOLD }}
                >
                  {(selected.name || selected.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white">{selected.name || "No name"}</p>
                  <p className="text-xs text-zinc-400">{selected.email}</p>
                </div>
              </div>

              {selected.phone && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Phone className="w-4 h-4 text-zinc-500" />
                  {selected.phone}
                </div>
              )}
              {selected.company && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Building className="w-4 h-4 text-zinc-500" />
                  {selected.company}
                </div>
              )}
              {selected.webinarCode && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <MonitorPlay className="w-3.5 h-3.5" />
                  Webinar: <span className="font-mono">{selected.webinarCode}</span>
                </div>
              )}

              <div>
                <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">Stage</p>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        updateMut.mutate({ id: selected.id, data: { stage: s.id } });
                        setSelected({ ...selected, stage: s.id });
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={selected.stage === s.id
                        ? { background: `${s.color}25`, color: s.color, border: `1px solid ${s.color}55` }
                        : { background: "rgba(39,39,42,0.6)", color: "#71717a", border: "1px solid rgba(63,63,70,0.6)" }
                      }
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {selected.notes && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Notes</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{selected.notes}</p>
                </div>
              )}

              {selected.email && (
                <Button className="w-full gap-2" asChild style={{ background: GOLD, color: "#000" }}>
                  <a href={`mailto:${selected.email}`}>
                    <Mail className="w-4 h-4" /> Email Contact
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Name</label>
                <Input
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Email</label>
                <Input
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Phone</label>
                <Input
                  placeholder="+1 234 567 8900"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Company</label>
                <Input
                  placeholder="Company name"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Stage</label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-zinc-300">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Segment</label>
                <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="general" className="text-zinc-300">General</SelectItem>
                    <SelectItem value="vip" className="text-zinc-300">VIP</SelectItem>
                    <SelectItem value="webinar" className="text-zinc-300">Webinar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Notes</label>
              <Textarea
                placeholder="Any notes about this contact…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={() => createMut.mutate(form)}
              disabled={createMut.isPending}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Adding…" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── RECORDINGS TAB ───────────────────────────────────────────────────────────

function RecordingsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    recordingUrl: "",
    thumbnailUrl: "",
    duration: "",
    isPublic: false,
  });

  const { data: recordings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/webinar-recordings"],
  });

  const { data: webinars = [] } = useQuery<any[]>({
    queryKey: ["/api/webinars"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/webinar-recordings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-recordings"] });
      setShowCreate(false);
      setForm({ title: "", recordingUrl: "", thumbnailUrl: "", duration: "", isPublic: false });
      toast({ title: "Recording added!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/webinar-recordings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-recordings"] });
      toast({ title: "Recording deleted" });
    },
  });

  const formatDuration = (secs: number | null) => {
    if (!secs) return null;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Mic} label="Total Recordings" value={recordings.length} />
        <StatCard icon={Globe} label="Public" value={(recordings as any[]).filter((r: any) => r.isPublic).length} color="#34d399" />
        <StatCard icon={Clock} label="Completed Webinars" value={(webinars as any[]).filter((w: any) => w.status === "completed").length} color="#60a5fa" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Recordings</h3>
        <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Add Recording
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />)}
        </div>
      ) : recordings.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="No recordings yet"
          desc="Add recording URLs from your completed webinars to share replays with registrants."
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Recording
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {(recordings as any[]).map((r: any) => (
            <Card key={r.id} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: r.thumbnailUrl ? `url(${r.thumbnailUrl}) center/cover` : `${GOLD}12`,
                        border: `1px solid ${GOLD}22`,
                      }}
                    >
                      {!r.thumbnailUrl && <Mic className="w-5 h-5" style={{ color: `${GOLD}80` }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{r.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                        {r.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDuration(r.duration)}
                          </span>
                        )}
                        {r.fileSize && (
                          <span>{(r.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                        )}
                        {r.createdAt && (
                          <span>{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
                        )}
                        <Badge className="text-[10px] border-none" style={r.isPublic
                          ? { background: "#34d39918", color: "#34d399" }
                          : { background: "#71717a18", color: "#71717a" }
                        }>
                          {r.isPublic ? "Public" : "Private"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.shareToken && (
                      <CopyBtn text={`${window.location.origin}/recording/${r.shareToken}`} size="icon" />
                    )}
                    {r.recordingUrl && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" asChild>
                        <a href={r.recordingUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-red-400"
                      onClick={() => deleteMut.mutate(r.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Add Recording</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Title *</label>
              <Input
                placeholder="Webinar recording title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Recording URL *</label>
              <Input
                placeholder="https://..."
                value={form.recordingUrl}
                onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Duration (seconds)</label>
                <Input
                  type="number"
                  placeholder="e.g. 3600"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Thumbnail URL</label>
                <Input
                  placeholder="https://..."
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recPublic"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="accent-[#d4b461]"
              />
              <label htmlFor="recPublic" className="text-sm text-zinc-300">Make recording publicly shareable</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={() => {
                if (!form.title || !form.recordingUrl) return;
                createMut.mutate({
                  title: form.title,
                  recordingUrl: form.recordingUrl,
                  thumbnailUrl: form.thumbnailUrl || null,
                  duration: form.duration ? Number(form.duration) : null,
                  isPublic: form.isPublic,
                });
              }}
              disabled={createMut.isPending || !form.title || !form.recordingUrl}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Adding…" : "Add Recording"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── ANALYTICS TAB ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { data: webinars = [] } = useQuery<any[]>({ queryKey: ["/api/webinars"] });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/webinar-contacts"] });
  const { data: recordings = [] } = useQuery<any[]>({ queryKey: ["/api/webinar-recordings"] });
  const { data: pages = [] } = useQuery<any[]>({ queryKey: ["/api/webinar-landing-pages"] });
  const { data: videos = [] } = useQuery<any[]>({ queryKey: ["/api/video-events"] });

  const totalRegistrations = (webinars as any[]).reduce((s: number, w: any) => s + (w.registrationCount || 0), 0);
  const totalViews = (pages as any[]).reduce((s: number, p: any) => s + (p.views || 0), 0);
  const converted = (contacts as any[]).filter((c: any) => c.stage === "converted").length;
  const convRate = contacts.length > 0 ? Math.round((converted / contacts.length) * 100) : 0;

  const stageFunnel = [
    { stage: "Lead", count: (contacts as any[]).filter((c: any) => c.stage === "lead").length, color: "#60a5fa" },
    { stage: "Registered", count: (contacts as any[]).filter((c: any) => c.stage === "registered").length, color: "#fbbf24" },
    { stage: "Attended", count: (contacts as any[]).filter((c: any) => c.stage === "attended").length, color: "#34d399" },
    { stage: "Converted", count: converted, color: GOLD },
  ];
  const maxCount = Math.max(...stageFunnel.map((s) => s.count), 1);

  const recentWebinars = (webinars as any[])
    .filter((w: any) => w.status === "completed")
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MonitorPlay} label="Total Webinars" value={webinars.length} />
        <StatCard icon={Users} label="Total Contacts" value={contacts.length} color="#60a5fa" />
        <StatCard icon={Eye} label="Landing Page Views" value={totalViews} color="#a78bfa" />
        <StatCard icon={Target} label="Conversion Rate" value={`${convRate}%`} color="#34d399" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CRM Funnel */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-bold">CRM Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stageFunnel.map((s) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-400">{s.stage}</span>
                  <span className="text-xs font-bold text-white">{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.round((s.count / maxCount) * 100)}%`,
                      background: s.color,
                    }}
                  />
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-4">No contacts to display</p>
            )}
          </CardContent>
        </Card>

        {/* Platform Overview */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-bold">Platform Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Live & Upcoming Webinars", value: (webinars as any[]).filter((w: any) => w.status !== "completed").length, icon: MonitorPlay, color: "#60a5fa" },
                { label: "Completed Webinars", value: (webinars as any[]).filter((w: any) => w.status === "completed").length, icon: Check, color: "#34d399" },
                { label: "Videos in Library", value: videos.length, icon: Video, color: "#a78bfa" },
                { label: "Landing Pages", value: pages.length, icon: LayoutTemplate, color: GOLD },
                { label: "Recordings Available", value: recordings.length, icon: Mic, color: "#f87171" },
                { label: "Published Pages", value: (pages as any[]).filter((p: any) => p.published).length, icon: Globe, color: "#34d399" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}18` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="text-sm text-zinc-300">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Completed Webinars */}
      {recentWebinars.length > 0 && (
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-bold">Recent Completed Webinars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentWebinars.map((w: any) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{w.title}</p>
                    <p className="text-xs text-zinc-500">
                      {w.scheduledAt ? format(new Date(w.scheduledAt), "MMM d, yyyy") : "—"}
                      {" · "}{w.durationMinutes}min
                    </p>
                  </div>
                  <Badge className="text-[10px] border-none ml-3" style={{ background: "#34d39918", color: "#34d399" }}>
                    Completed
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── SETTINGS TAB ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { data: webinars = [] } = useQuery<any[]>({ queryKey: ["/api/webinars"] });
  const { toast } = useToast();

  const registerEndpoint = `${window.location.origin}/api/register/:meetingCode`;
  const publicPageBase = `${window.location.origin}/lp/:slug`;

  const publicWebinars = (webinars as any[]).filter((w: any) => w.isPublic);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Integration & Settings</h3>
        <p className="text-sm text-zinc-400">Connect your webinar platform with external tools and view integration details.</p>
      </div>

      {/* Public Registration API */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: GOLD }} />
            Public Registration API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Use this endpoint to allow external websites to register attendees for your webinars automatically.
          </p>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5 font-semibold">POST Endpoint</p>
            <div className="flex items-center gap-2 bg-zinc-800/80 rounded-lg px-3 py-2.5 font-mono text-xs">
              <span className="text-green-400">POST</span>
              <span className="text-zinc-300 flex-1 truncate">{registerEndpoint}</span>
              <CopyBtn text={`${window.location.origin}/api/register/:meetingCode`} size="icon" />
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5 font-semibold">Request Body</p>
            <div className="bg-zinc-800/80 rounded-lg p-3 font-mono text-xs text-zinc-300 space-y-0.5">
              <div><span className="text-purple-400">"name"</span>: <span className="text-green-400">"string"</span> <span className="text-zinc-600">// required</span></div>
              <div><span className="text-purple-400">"email"</span>: <span className="text-green-400">"string"</span> <span className="text-zinc-600">// required</span></div>
              <div><span className="text-purple-400">"phone"</span>: <span className="text-green-400">"string"</span> <span className="text-zinc-600">// optional</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Landing Pages */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: GOLD }} />
            Public Landing Pages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Your landing pages are publicly accessible at this URL pattern. Create and publish them in the Landing Pages tab.
          </p>
          <div className="flex items-center gap-2 bg-zinc-800/80 rounded-lg px-3 py-2.5 font-mono text-xs">
            <span className="text-zinc-300 flex-1 truncate">{publicPageBase}</span>
            <CopyBtn text={publicPageBase} size="icon" />
          </div>
        </CardContent>
      </Card>

      {/* Public Webinars */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4" style={{ color: GOLD }} />
            Public Webinar Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">
            Webinars marked as "public" appear in the public webinar calendar. Toggle this when creating a webinar.
          </p>
          {publicWebinars.length === 0 ? (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-xs text-zinc-500"
              style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.15)" }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: `${GOLD}80` }} />
              No public webinars yet. Create a webinar and check "Show on public calendar".
            </div>
          ) : (
            <div className="space-y-2">
              {publicWebinars.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between py-1.5">
                  <p className="text-sm text-white">{w.title}</p>
                  <Badge className="text-[10px] border-none" style={{ background: `${GOLD}18`, color: GOLD }}>
                    Public
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4" style={{ color: GOLD }} />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Webinars Dashboard", href: "#webinars" },
            { label: "CRM / Contacts", href: "#crm" },
            { label: "Recordings Library", href: "#recordings" },
            { label: "Analytics Overview", href: "#analytics" },
          ].map(({ label }) => (
            <div key={label} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-zinc-300">{label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── MAIN PLATFORM VIEW ────────────────────────────────────────────────────────

export default function PlatformView() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(180deg, #0a0910 0%, #0f0d17 100%)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl px-6 py-4 border-b"
        style={{ background: "rgba(10,9,16,0.85)", borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}
          >
            <MonitorPlay className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide">Video Marketing Studio</h1>
            <p className="text-[10px] text-zinc-500 leading-none">Powered by Oravini</p>
          </div>
          <Badge
            className="ml-auto border-none text-[10px] font-bold"
            style={{ background: `${GOLD}18`, color: GOLD }}
          >
            PRO
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="webinars">
          <TabsList className="mb-8 flex flex-wrap gap-1 h-auto bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl">
            {[
              { value: "webinars", label: "Webinars", icon: MonitorPlay },
              { value: "video-hosting", label: "Video Hosting", icon: Video },
              { value: "videos", label: "Video Library", icon: Video },
              { value: "landing-pages", label: "Landing Pages", icon: LayoutTemplate },
              { value: "crm", label: "CRM", icon: Users },
              { value: "recordings", label: "Recordings", icon: Mic },
              { value: "analytics", label: "Analytics", icon: BarChart3 },
              { value: "settings", label: "Settings", icon: Settings2 },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 text-xs font-semibold data-[state=active]:text-black rounded-lg px-3 py-2"
                style={{
                  // active state overridden by CSS
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="webinars"><WebinarsTab /></TabsContent>
          <TabsContent value="video-hosting"><VideoHosting /></TabsContent>
          <TabsContent value="videos"><VideosTab /></TabsContent>
          <TabsContent value="landing-pages"><LandingPagesTab /></TabsContent>
          <TabsContent value="crm"><CRMTab /></TabsContent>
          <TabsContent value="recordings"><RecordingsTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
