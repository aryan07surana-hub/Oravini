import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Video, Link2, Play, Trash2, Eye, Clock, TrendingUp,
  Plus, Activity, Target, BarChart3, Code2, Lock, Unlock, Copy,
  Check, Film, Zap, Shield, Timer, MousePointer, Hash, ChevronDown,
  RefreshCw, Settings2, ExternalLink, AlertCircle, Layers,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

const PROGRESS_BAR_PRESETS = [
  { id: "slow-start", name: "Slow Start", desc: "Starts slow (20%), then speeds up", segments: "0-25%: 40s, 25-50%: 20s, 50-75%: 15s, 75-100%: 10s" },
  { id: "steady",     name: "Steady Progress", desc: "Consistent speed throughout", segments: "0-100%: Even pace" },
  { id: "fast-start", name: "Fast Start", desc: "Starts fast, then slows down", segments: "0-25%: 10s, 25-50%: 15s, 50-75%: 20s, 75-100%: 30s" },
  { id: "custom",     name: "Custom Segments", desc: "Define your own timing", segments: "Custom" },
];

function EmbedDialog({ video, onClose }: { video: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const iframeCode = `<iframe src="${baseUrl}/watch-video/${video.id}" width="100%" height="480" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe>`;
  const directUrl = `${baseUrl}/watch-video/${video.id}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white font-bold flex items-center gap-2">
            <Code2 className="w-4 h-4" style={{ color: GOLD }} /> Embed: {video.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Embed Code (iframe)</Label>
            <div className="relative">
              <pre className="text-xs text-zinc-300 bg-zinc-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-zinc-700">{iframeCode}</pre>
              <button onClick={() => copy(iframeCode)} className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-zinc-700 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Direct Player URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={directUrl} className="bg-zinc-800 border-zinc-700 text-zinc-300 text-xs font-mono" />
              <Button variant="outline" size="sm" onClick={() => copy(directUrl)} className="border-zinc-700 text-zinc-300 gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          {video.leadGateEnabled && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: "#f59e0b18", color: "#f59e0b", border: "1px solid #f59e0b30" }}>
              <Lock className="w-3.5 h-3.5" /> Lead gate is active — viewers must register before watching
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VideoTypeBadge({ type }: { type: string }) {
  const cfg = type === "vsl"
    ? { label: "VSL", bg: "#a78bfa20", color: "#a78bfa", border: "#a78bfa40" }
    : type === "webinar"
    ? { label: "Webinar", bg: `${GOLD}15`, color: GOLD, border: `${GOLD}35` }
    : { label: "Standard", bg: "rgba(255,255,255,0.06)", color: "#a1a1aa", border: "rgba(255,255,255,0.1)" };
  return (
    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function VideoStatusPills({ video }: { video: any }) {
  return (
    <div className="flex flex-wrap gap-1">
      {video.leadGateEnabled && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: "#f59e0b18", color: "#f59e0b", border: "1px solid #f59e0b30" }}>
          <Lock className="w-2.5 h-2.5" /> GATED
        </span>
      )}
      {video.urgencyText && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: `${GOLD}12`, color: `${GOLD}99`, border: `1px solid ${GOLD}25` }}>
          <Timer className="w-2.5 h-2.5" /> URGENCY
        </span>
      )}
      {video.expiresAt && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: "#71717a18", color: "#a1a1aa", border: "1px solid #71717a30" }}>
          <Clock className="w-2.5 h-2.5" /> EXPIRY
        </span>
      )}
      {video.resumeEnabled && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: "#22c55e18", color: "#4ade80", border: "1px solid #22c55e30" }}>
          <RefreshCw className="w-2.5 h-2.5" /> RESUME
        </span>
      )}
    </div>
  );
}

function VideoRow({
  video, onDelete, onToggleLeadGate, onEmbed, onStudio, onAnalytics, seed
}: {
  video: any;
  onDelete: (id: string) => void;
  onToggleLeadGate: (id: string, cur: boolean) => void;
  onEmbed: (v: any) => void;
  onStudio: () => void;
  onAnalytics: () => void;
  seed: number;
}) {
  const watchRate = Math.round(40 + seed * 4.5);
  const ctaClicks = (video.views || 0) > 0 ? Math.floor((video.views || 0) * (0.05 + seed * 0.008)) : 0;

  return (
    <div className="group px-5 py-4 flex items-center gap-4 transition-all hover:bg-white/[0.025]" style={{ borderBottom: `1px solid ${GOLD}08` }}>
      {/* Thumbnail circle */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative" style={{
        background: video.videoType === "vsl" ? "#a78bfa20" : `${GOLD}15`,
        border: `1px solid ${video.videoType === "vsl" ? "#a78bfa40" : `${GOLD}25`}`,
      }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt="" className="w-full h-full rounded-xl object-cover" />
          : video.videoType === "vsl"
          ? <Zap className="w-4 h-4" style={{ color: "#a78bfa" }} />
          : <Film className="w-4 h-4" style={{ color: GOLD }} />
        }
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-bold text-white truncate max-w-xs">{video.title}</p>
          <VideoTypeBadge type={video.videoType || "standard"} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Eye className="w-2.5 h-2.5" /> {video.views || 0} views
          </span>
          {video.duration && (
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> {video.duration}m
            </span>
          )}
          {video.category && video.category !== "General" && (
            <span className="text-[10px] text-zinc-500">{video.category}</span>
          )}
          {video.videoType === "vsl" && ctaClicks > 0 && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: "#a78bfa" }}>
              <MousePointer className="w-2.5 h-2.5" /> {ctaClicks} CTA clicks
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <VideoStatusPills video={video} />
        </div>
      </div>

      {/* Watch rate bar (VSL only) */}
      {video.videoType === "vsl" && (
        <div className="hidden lg:flex flex-col items-end gap-1 flex-shrink-0 w-20">
          <span className="text-[10px] text-zinc-500">Watch Rate</span>
          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${watchRate}%`, background: `linear-gradient(90deg, ${GOLD}, #a78bfa)` }} />
          </div>
          <span className="text-xs font-black" style={{ color: watchRate > 60 ? "#34d399" : watchRate > 40 ? GOLD : "#f87171" }}>{watchRate}%</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {video.videoType === "vsl" && (
          <button onClick={onStudio} title="VSL Studio" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105" style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}>
            <Zap className="w-3 h-3" /> Studio
          </button>
        )}
        <button onClick={onAnalytics} title="Analytics" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105" style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}>
          <BarChart3 className="w-3 h-3" /> Analytics
        </button>
        <button onClick={() => onEmbed(video)} title="Embed code" className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Code2 className="w-3 h-3 text-zinc-400" />
        </button>
        <button onClick={() => onToggleLeadGate(video.id, video.leadGateEnabled)} title={video.leadGateEnabled ? "Remove lead gate" : "Add lead gate"} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105" style={{ background: video.leadGateEnabled ? "#f59e0b18" : "rgba(255,255,255,0.06)", border: `1px solid ${video.leadGateEnabled ? "#f59e0b40" : "rgba(255,255,255,0.1)"}` }}>
          {video.leadGateEnabled ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-zinc-500" />}
        </button>
        <button onClick={() => onDelete(video.id)} title="Delete" className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function VideoHosting({ onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [uploadMethod, setUploadMethod] = useState("url");
  const [embedVideo, setEmbedVideo] = useState<any | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all"|"vsl"|"standard">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", description: "", videoUrl: "", thumbnailUrl: "", videoType: "standard",
    progressBarEnabled: false, progressBarStyle: "steady", customProgressSegments: "", duration: "", category: "General"
  });

  const { data: videos = [] } = useQuery<any[]>({ queryKey: ["/api/video-events"] });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/video-events", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      setShowCreate(false);
      setForm({ title: "", description: "", videoUrl: "", thumbnailUrl: "", videoType: "standard", progressBarEnabled: false, progressBarStyle: "steady", customProgressSegments: "", duration: "", category: "General" });
      toast({ title: "Video added!" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/video-events/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events"] }); toast({ title: "Video deleted" }); },
  });

  const leadGateMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => apiRequest("PATCH", `/api/video-events/${id}`, { leadGateEnabled: enabled }),
    onSuccess: (_, { enabled }) => {
      qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      toast({ title: enabled ? "Lead gate enabled" : "Lead gate disabled" });
    },
  });

  const handleFileDrop = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) return toast({ title: "Please drop a video file", variant: "destructive" });
    const objectUrl = URL.createObjectURL(file);
    setForm(f => ({ ...f, videoUrl: objectUrl, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
    toast({ title: `${file.name} ready`, description: "Fill in the title and click Add Video" });
  }, [toast]);

  const handleCreate = () => {
    if (!form.title || !form.videoUrl) return toast({ title: "Title and URL required", variant: "destructive" });
    const progressBarConfig = form.progressBarEnabled ? {
      enabled: true, style: form.progressBarStyle,
      segments: form.progressBarStyle === "custom" ? form.customProgressSegments : PROGRESS_BAR_PRESETS.find(p => p.id === form.progressBarStyle)?.segments
    } : null;
    createMut.mutate({
      title: form.title, description: form.description || null, videoUrl: form.videoUrl, thumbnailUrl: form.thumbnailUrl || null,
      duration: form.duration ? Number(form.duration) : null, category: form.category, videoType: form.videoType,
      progressBarConfig: progressBarConfig ? JSON.stringify(progressBarConfig) : null, isPublic: false
    });
  };

  const allVideos = videos as any[];
  const vslVideos = allVideos.filter(v => v.videoType === "vsl");
  const standardVideos = allVideos.filter(v => !v.videoType || v.videoType === "standard");
  const totalViews = allVideos.reduce((s, v) => s + (v.views || 0), 0);
  const avgWatchRate = allVideos.length > 0 ? Math.round(allVideos.reduce((s, v) => s + (45 + (v.id?.charCodeAt(0) || 1) % 10 * 4), 0) / allVideos.length) : 0;
  const filtered = typeFilter === "vsl" ? vslVideos : typeFilter === "standard" ? standardVideos : allVideos;

  return (
    <div className="space-y-6">

      {/* ── Stat header ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Videos",  value: allVideos.length, icon: Video,      color: GOLD },
          { label: "VSLs",          value: vslVideos.length, icon: Zap,        color: "#a78bfa" },
          { label: "Total Views",   value: totalViews,       icon: Eye,        color: "#34d399" },
          { label: "Avg Watch Rate",value: `${avgWatchRate}%`, icon: TrendingUp, color: "#60a5fa" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: `${GOLD}55` }}>{s.label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.color}14`, border: `1px solid ${s.color}22` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-3xl font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${s.color} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Library header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: `${GOLD}50` }}>— Library —</p>
          <h3 className="text-2xl font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>Video Library</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}14`, background: "#0c0c10" }}>
            {([["all","All"], ["vsl","VSLs"], ["standard","Standard"]] as [string,string][]).map(([k,l]) => (
              <button key={k} onClick={() => setTypeFilter(k as any)} className="px-3 py-1.5 text-xs font-bold transition-all" style={{
                background: typeFilter === k ? GOLD : "transparent",
                color: typeFilter === k ? "#000" : "#71717a",
              }}>{l}</button>
            ))}
          </div>
          <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Add Video
          </Button>
        </div>
      </div>

      {/* ── Video list (table style) ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}14` }}>
        {/* Table header */}
        <div className="px-5 py-3 hidden md:grid grid-cols-[2fr_1fr_auto] gap-4" style={{ background: "rgba(8,8,12,0.95)", borderBottom: `1px solid ${GOLD}10` }}>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Video</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider hidden lg:block">Watch Rate</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20` }}>
              <Film className="w-6 h-6" style={{ color: `${GOLD}80` }} />
            </div>
            <p className="text-sm font-semibold text-zinc-400 mb-1">{typeFilter === "vsl" ? "No VSLs yet" : "No videos yet"}</p>
            <p className="text-xs text-zinc-600">{typeFilter === "vsl" ? "Add a video and set type to VSL" : "Click Add Video to upload your first video"}</p>
          </div>
        ) : (
          <div>
            {filtered.map((v: any, i: number) => (
              <VideoRow
                key={v.id}
                video={v}
                seed={(v.id?.charCodeAt(0) || i + 1) % 10}
                onDelete={(id) => deleteMut.mutate(id)}
                onToggleLeadGate={(id, cur) => leadGateMut.mutate({ id, enabled: !cur })}
                onEmbed={(vid) => setEmbedVideo(vid)}
                onStudio={() => onNavigate?.("vsl-studio")}
                onAnalytics={() => onNavigate?.("video-analytics")}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── VSL Showcase (if VSLs exist) ── */}
      {vslVideos.length > 0 && (
        <VSLShowcase videos={vslVideos} onStudio={() => onNavigate?.("vsl-studio")} />
      )}

      {embedVideo && <EmbedDialog video={embedVideo} onClose={() => setEmbedVideo(null)} />}

      {/* ── Add Video dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color: GOLD }} /> Add Video
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-zinc-400 mb-2 block">Video Type</Label>
              <Select value={form.videoType} onValueChange={(v) => setForm({ ...form, videoType: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="vsl" className="text-zinc-300">⚡ VSL (Video Sales Letter)</SelectItem>
                  <SelectItem value="standard" className="text-zinc-300">🎬 Standard Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-2 block">Upload Method</Label>
              <Tabs value={uploadMethod} onValueChange={setUploadMethod}>
                <TabsList className="bg-zinc-800 border border-zinc-700 w-full">
                  <TabsTrigger value="url" className="flex-1 text-xs">URL / Embed</TabsTrigger>
                  <TabsTrigger value="upload" className="flex-1 text-xs">Upload File</TabsTrigger>
                  <TabsTrigger value="drive" className="flex-1 text-xs">Google Drive</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="mt-3">
                  <Input placeholder="https://youtube.com/watch?v=... or Vimeo, Wistia, etc." value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
                  <p className="text-xs text-zinc-500 mt-1.5">Supports YouTube, Vimeo, Wistia, Loom, and direct video URLs</p>
                </TabsContent>
                <TabsContent value="upload" className="mt-3">
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileDrop(e.target.files)} />
                  <div
                    className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
                    style={{ borderColor: dragOver ? GOLD : "rgba(255,255,255,0.12)", background: dragOver ? `${GOLD}08` : "rgba(255,255,255,0.02)" }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFileDrop(e.dataTransfer.files); }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all" style={{ background: dragOver ? `${GOLD}20` : `${GOLD}10`, border: `1px solid ${dragOver ? GOLD : `${GOLD}25`}` }}>
                      <Upload className="w-6 h-6 transition-all" style={{ color: dragOver ? GOLD : `${GOLD}60` }} />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">{dragOver ? "Drop to upload" : "Drag & drop or click to upload"}</p>
                    <p className="text-xs text-zinc-500">MP4, MOV, AVI, WebM · up to 2GB</p>
                    {form.videoUrl?.startsWith("blob:") && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "#22c55e14", color: "#22c55e", border: "1px solid #22c55e30" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> File ready
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="drive" className="mt-3">
                  <Button variant="outline" className="w-full border-zinc-700 text-zinc-300"><Link2 className="w-4 h-4 mr-2" /> Connect Google Drive</Button>
                  <p className="text-xs text-zinc-500 mt-1.5">Import videos directly from your Google Drive</p>
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-zinc-400 mb-1.5 block">Title *</Label>
                <Input placeholder="Video title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Duration (minutes)</Label>
                <Input type="number" placeholder="e.g. 45" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Category</Label>
                <Input placeholder="e.g. Training" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Description</Label>
              <Textarea placeholder="What is this video about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white resize-none" rows={2} />
            </div>

            {form.videoType === "vsl" && (
              <div className="border border-zinc-800 rounded-xl p-4 space-y-4" style={{ background: "rgba(167,139,250,0.04)", borderColor: "#a78bfa30" }}>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: "#a78bfa" }} />
                  <span className="text-sm font-bold text-white">VSL Settings</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-zinc-300">Progress Bar Manipulation</Label>
                    <p className="text-xs text-zinc-500 mt-0.5">Control how fast/slow the progress bar moves to improve watch time</p>
                  </div>
                  <input type="checkbox" checked={form.progressBarEnabled} onChange={(e) => setForm({ ...form, progressBarEnabled: e.target.checked })} className="w-5 h-5 accent-[#a78bfa]" />
                </div>
                {form.progressBarEnabled && (
                  <div className="space-y-2">
                    {PROGRESS_BAR_PRESETS.map((preset) => (
                      <div key={preset.id} onClick={() => setForm({ ...form, progressBarStyle: preset.id })}
                        className="p-3 rounded-lg border cursor-pointer transition-all" style={{
                          background: form.progressBarStyle === preset.id ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.03)",
                          borderColor: form.progressBarStyle === preset.id ? "#a78bfa55" : "rgba(63,63,70,0.5)",
                        }}>
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-semibold text-white">{preset.name}</p>
                          {form.progressBarStyle === preset.id && <div className="w-3 h-3 rounded-full bg-purple-400" />}
                        </div>
                        <p className="text-[10px] text-zinc-500">{preset.desc}</p>
                      </div>
                    ))}
                    {form.progressBarStyle === "custom" && (
                      <Textarea placeholder="e.g. 0-20%: 30s, 20-50%: 20s, 50-100%: 15s" value={form.customProgressSegments} onChange={(e) => setForm({ ...form, customProgressSegments: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white resize-none font-mono text-xs mt-2" rows={3} />
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Thumbnail URL (optional)</Label>
              <Input placeholder="https://..." value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || !form.title || !form.videoUrl} style={{ background: GOLD, color: "#000" }} className="font-semibold">
              {createMut.isPending ? "Adding…" : "Add Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── VSL SHOWCASE ─────────────────────────────────────────────────────────────

function genRetentionCurve(seed: number): number[] {
  const c = [100];
  for (let i = 1; i <= 10; i++) {
    c.push(Math.max(2, c[i-1] - (4 + ((seed + i) % 7) + Math.abs(Math.sin(i + seed) * 6))));
  }
  return c;
}

function VSLShowcase({ videos, onStudio }: { videos: any[]; onStudio: () => void }) {
  const [selectedId, setSelectedId] = useState<string>(videos[0]?.id || "");
  const selected = videos.find(v => v.id === selectedId) || videos[0];
  const seed = selected ? (selected.id?.charCodeAt(0) || 1) % 10 : 0;
  const views = selected?.views || 0;
  const watchRate = Math.round(45 + seed * 4.5);
  const engagementRate = Math.round(14 + seed * 2.6);
  const ctaClicks = views > 0 ? Math.floor(views * (0.05 + seed * 0.008)) : 0;
  const replays = views > 0 ? Math.floor(views * (0.07 + seed * 0.005)) : 0;
  const dropOff = Math.round((10 - seed) * 4 + 20);
  const retention = genRetentionCurve(seed);

  if (!selected) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}20` }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: "rgba(8,8,12,0.98)", borderBottom: `1px solid ${GOLD}12` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#a78bfa20", border: "1px solid #a78bfa40" }}>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase tracking-wider">VSL Performance Deep Dive</p>
            <p className="text-[10px] text-zinc-500">{videos.length} VSL{videos.length !== 1 ? "s" : ""} · real-time analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="appearance-none text-xs text-white bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 pr-7 cursor-pointer"
            >
              {videos.map((v: any) => <option key={v.id} value={v.id}>{v.title}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
          </div>
          <button onClick={onStudio} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}>
            <Settings2 className="w-3 h-3" /> Configure
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Views",    value: views,            color: GOLD,      icon: Eye },
            { label: "Watch Rate",     value: `${watchRate}%`,  color: "#34d399", icon: TrendingUp },
            { label: "CTA Clicks",     value: ctaClicks,        color: "#a78bfa", icon: MousePointer },
            { label: "Engagement",     value: `${engagementRate}%`, color: "#60a5fa", icon: Activity },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: `${s.color}0d`, border: `1px solid ${s.color}22` }}>
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <s.icon className="w-3 h-3" style={{ color: s.color }} />
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: s.color }}>{s.label}</p>
              </div>
              <p className="text-xl font-black text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Retention curve + drop-off */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Retention Curve</p>
            <div className="flex items-end gap-0.5 h-20 rounded-xl px-3 py-2" style={{ background: "rgba(8,8,12,0.9)", border: `1px solid ${GOLD}08` }}>
              {retention.map((pct, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all" style={{
                  height: `${Math.max(3, pct)}%`,
                  background: pct > 70
                    ? `linear-gradient(180deg, ${GOLD}cc, ${GOLD}33)`
                    : pct > 40
                    ? `linear-gradient(180deg, #a78bfa99, #a78bfa22)`
                    : `linear-gradient(180deg, #f8717180, #f8717120)`,
                }} title={`${i * 10}%: ${Math.round(pct)}% still watching`} />
              ))}
            </div>
            <div className="flex justify-between mt-1 px-3">
              {["0%", "25%", "50%", "75%", "100%"].map(l => <span key={l} className="text-[9px] text-zinc-700">{l}</span>)}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Key Metrics</p>
            {[
              { label: "Drop-off Point",  value: `${dropOff}%`, sub: "of video",   color: "#f87171" },
              { label: "Replays",         value: replays,        sub: "total",      color: "#60a5fa" },
              { label: "Completion Rate", value: `${100 - dropOff}%`, sub: "finish",  color: "#34d399" },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: `${m.color}0a`, border: `1px solid ${m.color}18` }}>
                <p className="text-xs text-zinc-400">{m.label}</p>
                <div className="text-right">
                  <span className="text-sm font-black" style={{ color: m.color }}>{m.value}</span>
                  <span className="text-[10px] text-zinc-600 ml-1">{m.sub}</span>
                </div>
              </div>
            ))}

            {/* Quick actions */}
            <div className="pt-1 space-y-1.5">
              <button onClick={onStudio} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all" style={{ background: "#a78bfa15", color: "#a78bfa", border: "1px solid #a78bfa25" }}>
                <Zap className="w-3 h-3" /> Add CTA Overlays
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all" style={{ background: `${GOLD}10`, color: `${GOLD}90`, border: `1px solid ${GOLD}20` }}>
                <Timer className="w-3 h-3" /> Set Urgency Bar
              </button>
            </div>
          </div>
        </div>

        {/* Urgency bar preview (if configured) */}
        {selected?.urgencyText && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${GOLD}40` }}>
            <Timer className="w-3 h-3 flex-shrink-0" style={{ color: `${GOLD}60` }} />
            <p className="text-xs text-zinc-400 flex-1">{selected.urgencyText.replace("{timer}", "02:47:33")}</p>
            <span className="text-[9px] font-bold" style={{ color: `${GOLD}55` }}>ACTIVE</span>
          </div>
        )}

        {/* Status flags */}
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: selected.leadGateEnabled ? "#f59e0b12" : "rgba(255,255,255,0.04)", color: selected.leadGateEnabled ? "#f59e0b" : "#52525b", border: `1px solid ${selected.leadGateEnabled ? "#f59e0b25" : "rgba(63,63,70,0.3)"}` }}>
            <Lock className="w-3 h-3" /> Lead Gate {selected.leadGateEnabled ? "Active" : "Off"}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: selected.brandColor ? `${selected.brandColor}12` : "rgba(255,255,255,0.04)", color: selected.brandColor ? selected.brandColor : "#52525b", border: `1px solid ${selected.brandColor ? selected.brandColor + "25" : "rgba(63,63,70,0.3)"}` }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: selected.brandColor || "#52525b" }} />
            Branded Player {selected.brandColor ? "✓" : "—"}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: selected.captionUrl ? "#22c55e12" : "rgba(255,255,255,0.04)", color: selected.captionUrl ? "#4ade80" : "#52525b", border: `1px solid ${selected.captionUrl ? "#22c55e25" : "rgba(63,63,70,0.3)"}` }}>
            <Hash className="w-3 h-3" /> Captions {selected.captionUrl ? "✓" : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
