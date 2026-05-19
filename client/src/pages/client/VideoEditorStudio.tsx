import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Film, Upload, Scissors, Captions, Palette, Gauge, Play, Download,
  Loader2, CheckCircle2, XCircle, Clock, Trash2,
  Wand2, AlertCircle, Mic, Sparkles, Clapperboard,
  ArrowRight, FileText, Star, Zap, CheckSquare, Square, X, ExternalLink,
  Volume2, Crop, Type, Layers, Instagram, Youtube, MonitorSmartphone,
  Music, Bell, ImageDown, Sliders, Terminal,
} from "lucide-react";
import OverlayPreview from "@/components/video-editor/OverlayPreview";

type VideoEdit = {
  id: number; userId: string; title: string; originalFilename: string;
  filePath: string; fileUrl?: string; duration?: number;
  transcript?: { text: string; words: { word: string; start: number; end: number }[]; duration?: number };
  silences?: { start: number; end: number; duration: number }[];
  status: string; shotstackRenderId?: string; outputUrl?: string;
  settings?: any; createdAt: string;
};

type Settings = {
  removeSilences: boolean; silenceThreshold: string;
  removeFillers: boolean;
  addCaptions: boolean; captionStyle: string;
  colorGrade: string; speed: string;
  reframe: string; platform: string;
  audioNormalize: boolean; audioRestore: boolean;
  lowerThird: string; watermarkText: string; hookOpener: string;
  addSubscribeCta: boolean; ctaText: string;
  musicUrl: string; musicVolume: string;
};

const DEFAULT_SETTINGS: Settings = {
  removeSilences: true, silenceThreshold: "0.5",
  removeFillers: false,
  addCaptions: true, captionStyle: "bold",
  colorGrade: "none", speed: "1",
  reframe: "none", platform: "original",
  audioNormalize: false, audioRestore: false,
  lowerThird: "", watermarkText: "", hookOpener: "",
  addSubscribeCta: false, ctaText: "",
  musicUrl: "", musicVolume: "0.15",
};

const MODES = [
  { id: "viral", label: "🔥 Viral", desc: "Fast cuts, max energy" },
  { id: "story", label: "🎬 Story", desc: "Narrative + emotion" },
  { id: "sales", label: "💰 Sales", desc: "Problem → CTA" },
  { id: "educational", label: "📚 Educational", desc: "Numbered points" },
  { id: "cinematic", label: "🎥 Cinematic", desc: "B-roll + drama" },
  { id: "personal_brand", label: "🚀 Personal Brand", desc: "Authentic + trust" },
];

const PLATFORMS = [
  { id: "instagram", label: "Instagram Reels" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube Shorts" },
];

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    uploaded:     { label: "Uploaded",     color: "text-zinc-400 bg-zinc-500/15 border-zinc-500/25",     icon: Clock },
    transcribing: { label: "Transcribing", color: "text-blue-400 bg-blue-500/15 border-blue-500/25",     icon: Loader2 },
    transcribed:  { label: "Ready",        color: "text-green-400 bg-green-500/15 border-green-500/25",  icon: CheckCircle2 },
    rendering:    { label: "Rendering",    color: "text-amber-400 bg-amber-500/15 border-amber-500/25",  icon: Loader2 },
    done:         { label: "Done",         color: "text-primary bg-primary/15 border-primary/25",        icon: CheckCircle2 },
    failed:       { label: "Failed",       color: "text-red-400 bg-red-500/15 border-red-500/25",        icon: XCircle },
  };
  const s = map[status] || map.uploaded;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.color}`}>
      <s.icon className={`w-2.5 h-2.5 ${["transcribing", "rendering"].includes(status) ? "animate-spin" : ""}`} />
      {s.label}
    </span>
  );
}

function Toggle({ on, onToggle, testId }: { on: boolean; onToggle: () => void; testId?: string }) {
  return (
    <button onClick={onToggle} data-testid={testId}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${on ? "bg-primary" : "bg-zinc-700"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function Pills({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${value === o.value ? "bg-primary/20 text-primary border-primary/40" : "text-zinc-400 border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-500"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EditControls({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const set = (k: keyof Settings, v: any) => onChange({ ...settings, [k]: v });
  return (
    <div className="space-y-5">

      {/* ── Silence Removal ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold text-foreground">Remove Silences</span>
          </div>
          <Toggle on={settings.removeSilences} onToggle={() => set("removeSilences", !settings.removeSilences)} testId="toggle-remove-silences" />
        </div>
        {settings.removeSilences && (
          <div className="pl-1 space-y-1">
            <p className="text-[10px] text-muted-foreground">Gap threshold</p>
            <Pills value={settings.silenceThreshold} onChange={v => set("silenceThreshold", v)}
              options={[{ label: "0.3s tight", value: "0.3" }, { label: "0.5s", value: "0.5" }, { label: "1s relaxed", value: "1" }]} />
          </div>
        )}
      </div>

      {/* ── Captions ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Captions className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold text-foreground">Burn Captions</span>
          </div>
          <Toggle on={settings.addCaptions} onToggle={() => set("addCaptions", !settings.addCaptions)} testId="toggle-captions" />
        </div>
        {settings.addCaptions && (
          <div className="pl-1 space-y-1">
            <p className="text-[10px] text-muted-foreground">Style</p>
            <div className="grid grid-cols-3 gap-1">
              {([
                { label: "Bold",     value: "bold",     color: "text-white" },
                { label: "TikTok",   value: "tiktok",   color: "text-pink-400" },
                { label: "Reels",    value: "reels",    color: "text-purple-400" },
                { label: "Netflix",  value: "netflix",  color: "text-red-400" },
                { label: "Karaoke",  value: "karaoke",  color: "text-yellow-400" },
                { label: "Cinematic",value: "cinematic",color: "text-amber-400" },
                { label: "Clean",    value: "clean",    color: "text-sky-400" },
                { label: "Dark",     value: "dark",     color: "text-zinc-400" },
                { label: "Minimal",  value: "minimal",  color: "text-zinc-400" },
              ] as { label: string; value: string; color: string }[]).map(o => (
                <button key={o.value} onClick={() => set("captionStyle", o.value)}
                  className={`text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-all ${settings.captionStyle === o.value ? `bg-primary/20 text-primary border-primary/40` : `${o.color} border-zinc-700/50 hover:border-zinc-500 bg-zinc-900/40`}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Color Grade ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-foreground">Color Grade</span>
        </div>
        <Pills value={settings.colorGrade} onChange={v => set("colorGrade", v)}
          options={[
            { label: "None", value: "none" },
            { label: "Cinematic", value: "cinematic" },
            { label: "Warm", value: "warm" },
            { label: "Cool", value: "cool" },
            { label: "Bright", value: "bright" },
            { label: "Vibrant", value: "vibrant" },
            { label: "Dark", value: "dark" },
          ]} />
      </div>

      {/* ── Speed ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-bold text-foreground">Playback Speed</span>
        </div>
        <Pills value={settings.speed} onChange={v => set("speed", v)}
          options={[{ label: "0.75×", value: "0.75" }, { label: "1×", value: "1" }, { label: "1.25×", value: "1.25" }, { label: "1.5×", value: "1.5" }]} />
      </div>

      {/* ── Filler Removal ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-pink-400" />
          <div>
            <span className="text-xs font-bold text-foreground">Remove Fillers</span>
            <p className="text-[10px] text-muted-foreground">Cut um / uh / like / you know</p>
          </div>
        </div>
        <Toggle on={settings.removeFillers} onToggle={() => set("removeFillers", !settings.removeFillers)} />
      </div>

      {/* ── Audio ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-xs font-bold text-foreground">Audio</span>
        </div>
        <div className="space-y-2 pl-1">
          <label className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Normalize (–14 LUFS)</span>
            <Toggle on={settings.audioNormalize} onToggle={() => set("audioNormalize", !settings.audioNormalize)} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Restore / denoise</span>
            <Toggle on={settings.audioRestore} onToggle={() => set("audioRestore", !settings.audioRestore)} />
          </label>
        </div>
      </div>

      {/* ── Reframe ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Crop className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-bold text-foreground">Reframe</span>
        </div>
        <Pills value={settings.reframe} onChange={v => set("reframe", v)}
          options={[{ label: "Original", value: "none" }, { label: "9:16 Portrait", value: "9:16" }, { label: "1:1 Square", value: "1:1" }]} />
      </div>

    </div>
  );
}

// ── Motion Graphics Panel ──────────────────────────────────────────────────────

function MotionGraphicsPanel({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const set = (k: keyof Settings, v: any) => onChange({ ...settings, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hook Opener</p>
        </div>
        <Input
          value={settings.hookOpener}
          onChange={e => set("hookOpener", e.target.value)}
          placeholder='e.g. "Nobody tells you this..."'
          className="h-8 text-xs bg-zinc-900/50 border-zinc-700/60"
        />
        <p className="text-[9px] text-muted-foreground">Shown top-center for first 3 seconds</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Type className="w-3.5 h-3.5 text-blue-400" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lower Third</p>
        </div>
        <Input
          value={settings.lowerThird}
          onChange={e => set("lowerThird", e.target.value)}
          placeholder='e.g. "Aryan Surana | Growth Coach"'
          className="h-8 text-xs bg-zinc-900/50 border-zinc-700/60"
        />
        <p className="text-[9px] text-muted-foreground">Name / title bar at 75% height</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Watermark</p>
        </div>
        <Input
          value={settings.watermarkText}
          onChange={e => set("watermarkText", e.target.value)}
          placeholder="e.g. @yourusername"
          className="h-8 text-xs bg-zinc-900/50 border-zinc-700/60"
        />
        <p className="text-[9px] text-muted-foreground">Persistent top-right corner overlay</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-red-400" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subscribe CTA</p>
          </div>
          <Toggle on={settings.addSubscribeCta} onToggle={() => set("addSubscribeCta", !settings.addSubscribeCta)} />
        </div>
        {settings.addSubscribeCta && (
          <>
            <Input
              value={settings.ctaText}
              onChange={e => set("ctaText", e.target.value)}
              placeholder='e.g. "Follow for more!"'
              className="h-8 text-xs bg-zinc-900/50 border-zinc-700/60"
            />
            <p className="text-[9px] text-muted-foreground">Red button overlay at bottom of frame</p>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Music className="w-3.5 h-3.5 text-green-400" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Background Music</p>
        </div>
        <Input
          value={settings.musicUrl}
          onChange={e => set("musicUrl", e.target.value)}
          placeholder="Direct URL to MP3/M4A file"
          className="h-8 text-xs bg-zinc-900/50 border-zinc-700/60"
        />
        {settings.musicUrl && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground">Vol</span>
            <Pills value={settings.musicVolume} onChange={v => set("musicVolume", v)}
              options={[
                { label: "Subtle 10%", value: "0.10" },
                { label: "15%", value: "0.15" },
                { label: "25%", value: "0.25" },
                { label: "40%", value: "0.40" },
              ]} />
          </div>
        )}
      </div>

      {/* Remotion live preview */}
      <OverlayPreview
        hookOpener={settings.hookOpener}
        lowerThird={settings.lowerThird}
        watermarkText={settings.watermarkText}
        ctaText={settings.ctaText}
        addSubscribeCta={settings.addSubscribeCta}
        reframe={settings.reframe}
        platform={settings.platform}
      />
    </div>
  );
}

// ── Platform Export Panel ─────────────────────────────────────────────────────

const PLATFORM_OPTIONS = [
  { id: "original",       label: "Original",    sub: "Keep source dimensions",  icon: Film },
  { id: "instagram",      label: "Instagram",   sub: "1080×1920 · 9:16",        icon: Instagram },
  { id: "tiktok",         label: "TikTok",      sub: "1080×1920 · 9:16",        icon: MonitorSmartphone },
  { id: "youtube-shorts", label: "YT Shorts",   sub: "1080×1920 · 9:16",        icon: Youtube },
  { id: "square",         label: "Square",      sub: "1080×1080 · 1:1",         icon: MonitorSmartphone },
];

function PlatformPanel({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const set = (k: keyof Settings, v: any) => onChange({ ...settings, [k]: v });
  return (
    <div className="space-y-2">
      {PLATFORM_OPTIONS.map(p => (
        <button key={p.id} onClick={() => set("platform", p.id)}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${settings.platform === p.id ? "bg-primary/10 border-primary/30" : "bg-zinc-900/30 border-zinc-700/40 hover:border-zinc-600"}`}>
          <p.icon className={`w-4 h-4 flex-shrink-0 ${settings.platform === p.id ? "text-primary" : "text-muted-foreground"}`} />
          <div className="min-w-0">
            <p className={`text-xs font-bold ${settings.platform === p.id ? "text-primary" : "text-foreground"}`}>{p.label}</p>
            <p className="text-[9px] text-muted-foreground">{p.sub}</p>
          </div>
          {settings.platform === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />}
        </button>
      ))}
    </div>
  );
}

export default function VideoEditorStudio() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"plan" | "edit" | "renders">("edit");

  // ── Upload state ──────────────────────────────────────────────────────────────
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Video player state ────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // ── Plan state ────────────────────────────────────────────────────────────────
  const [planMode, setPlanMode] = useState("viral");
  const [planPlatform, setPlanPlatform] = useState("instagram");
  const [planDuration, setPlanDuration] = useState("30");
  const [planTopic, setPlanTopic] = useState("");
  const [planResult, setPlanResult] = useState<any>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [scriptExpanded, setScriptExpanded] = useState(false);

  // ── Thumbnail state ───────────────────────────────────────────────────────────
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [isThumbLoading, setIsThumbLoading] = useState(false);

  // ── CLI command state ─────────────────────────────────────────────────────────
  const [cmdInput, setCmdInput] = useState("");
  const [cmdLog, setCmdLog] = useState<{ text: string; ok: boolean }[]>([]);

  // ── Editor plan (from AI Video Editor via localStorage) ───────────────────────
  const [editorPlan, setEditorPlan] = useState<any>(null);
  const [checkedSuggestions, setCheckedSuggestions] = useState<Set<number>>(new Set());
  const [editorBannerDismissed, setEditorBannerDismissed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("oravini_studio_plan");
    if (!raw) return;
    try {
      const plan = JSON.parse(raw);
      if (!plan?.fromEditor) return;
      setEditorPlan(plan);
      // Auto-populate plan tab fields from editor context
      if (plan.mode)           setPlanMode(plan.mode);
      if (plan.platform)       setPlanPlatform(plan.platform);
      if (plan.targetDuration) setPlanDuration(String(plan.targetDuration));
      if (plan.title)          setPlanTopic(plan.title);
      // Auto-apply recommended settings
      if (plan.recommendedSettings && Object.keys(plan.recommendedSettings).length > 0) {
        setSettings(prev => ({ ...prev, ...plan.recommendedSettings }));
      }
      // If has script/hooks, load as plan result so it shows in edit panel
      if (plan.fullScript || plan.hooks?.length) {
        setPlanResult({
          hooks: plan.hooks || [],
          fullScript: plan.fullScript || "",
          timeline: plan.timeline || [],
          title: plan.title || "",
        });
      }
      // Switch to edit tab so they can upload their video immediately
      setTab("edit");
    } catch (_) {}
  }, []);

  // ── Queries ───────────────────────────────────────────────────────────────────
  const { data: renders = [] } = useQuery<VideoEdit[]>({ queryKey: ["/api/video-studio"] });

  const { data: activeJob } = useQuery<VideoEdit>({
    queryKey: ["/api/video-studio", activeJobId],
    queryFn: () => fetch(`/api/video-studio/${activeJobId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return ["transcribing", "uploaded", "rendering"].includes((data as VideoEdit).status) ? 3000 : false;
    },
  });

  const { data: jobStatus } = useQuery<VideoEdit>({
    queryKey: ["/api/video-studio", activeJobId, "status"],
    queryFn: () => fetch(`/api/video-studio/${activeJobId}/status`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeJobId && activeJob?.status === "rendering",
    refetchInterval: activeJob?.status === "rendering" ? 5000 : false,
  });

  const currentJob = (jobStatus?.status === "done" ? jobStatus : activeJob) || null;
  const activeStatus = currentJob?.status;
  const isProcessing = ["transcribing", "uploaded"].includes(activeStatus || "");
  const isReady = activeStatus === "transcribed";
  const isRendering = activeStatus === "rendering";
  const isDone = activeStatus === "done";
  const isFailed = activeStatus === "failed";

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/video-studio/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-studio"] }); setActiveJobId(null); },
  });

  const renderMutation = useMutation({
    mutationFn: ({ id, settings }: { id: number; settings: Settings }) =>
      apiRequest("POST", `/api/video-studio/${id}/render`, { settings }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-studio"] });
      qc.invalidateQueries({ queryKey: ["/api/video-studio", activeJobId] });
      toast({ title: "Render started!", description: "ffmpeg is processing your video. Usually 15–45 seconds." });
    },
    onError: (e: any) => toast({ title: "Render failed", description: e.message, variant: "destructive" }),
  });

  // ── File upload ───────────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;
    const MB = 1024 * 1024;
    if (file.size > 200 * MB) {
      toast({ title: "File too large", description: "Maximum upload size is 200MB.", variant: "destructive" });
      return;
    }
    if (file.size > 25 * MB) {
      toast({ title: "Large file — heads up", description: "Files over 25MB can't be AI-transcribed. You can still render with color grade & speed settings.", duration: 6000 });
    }
    const title = videoTitle || file.name.replace(/\.[^/.]+$/, "");
    setIsUploading(true);
    setUploadProgress(0);

    const fd = new FormData();
    fd.append("video", file);
    fd.append("title", title);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/video-studio/upload");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status === 200) {
        const job = JSON.parse(xhr.responseText);
        setActiveJobId(job.id);
        qc.invalidateQueries({ queryKey: ["/api/video-studio"] });
        toast({ title: "Uploaded! Transcribing now…", description: "Takes 15–60 seconds." });
      } else {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    };
    xhr.onerror = () => { setIsUploading(false); toast({ title: "Upload failed", variant: "destructive" }); };
    xhr.send(fd);
  }, [videoTitle, toast, qc]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ── Plan generator ────────────────────────────────────────────────────────────
  const handleGeneratePlan = async () => {
    if (!planTopic.trim()) { toast({ title: "Enter a topic first", variant: "destructive" }); return; }
    setIsPlanLoading(true);
    try {
      const data = await apiRequest("POST", "/api/video/analyze", {
        inputType: "idea",
        description: planTopic,
        mode: planMode,
        goal: "viral",
        platform: planPlatform,
        targetDuration: planDuration,
      });
      setPlanResult(data);
      toast({ title: "Script generated!", description: "Your plan is ready. Switch to Edit to start recording." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsPlanLoading(false);
    }
  };

  // ── Video player sync ─────────────────────────────────────────────────────────
  const words = (currentJob?.transcript?.words || []) as { word: string; start: number; end: number }[];
  const silences = (currentJob?.silences || []) as { start: number; end: number; duration: number }[];
  const totalDuration = videoDuration || currentJob?.duration || 1;
  const totalSilence = silences.reduce((s, x) => s + x.duration, 0);

  const handleExtractThumbnail = async (atSeconds?: number) => {
    if (!activeJobId) return;
    setIsThumbLoading(true);
    try {
      const res = await apiRequest("POST", `/api/video-studio/${activeJobId}/thumbnail`, { atSeconds: atSeconds ?? currentTime });
      setThumbUrl((res as any).thumbUrl);
      toast({ title: "Thumbnail extracted!", description: "Click to download." });
    } catch (e: any) {
      toast({ title: "Thumbnail failed", description: e.message, variant: "destructive" });
    } finally {
      setIsThumbLoading(false);
    }
  };

  const seekTo = (t: number) => {
    if (videoRef.current) { videoRef.current.currentTime = t; videoRef.current.play(); }
  };

  // ── Natural-language CLI command parser ───────────────────────────────────────
  const handleCmd = () => {
    const raw = cmdInput.trim();
    if (!raw) return;
    const cmd = raw.toLowerCase();
    let result: string | null = null;

    const captionStyles = ["tiktok", "karaoke", "reels", "bold", "netflix", "minimal", "clean", "cinematic", "dark"];
    const colorGrades   = ["cinematic", "warm", "cool", "bright", "vibrant", "dark"];
    const platforms     = ["instagram", "tiktok", "youtube", "twitter", "linkedin", "original"];

    if (/^reset$|^clear all$/.test(cmd)) {
      setSettings(DEFAULT_SETTINGS);
      result = "All settings reset to defaults";
    } else if (/(?:cut|remove)\s+silences?/.test(cmd) || cmd === "cut") {
      setSettings(s => ({ ...s, removeSilences: true }));
      result = "Silence removal → ON";
    } else if (/silence(?:s)?\s+off|no\s+silence(?:s)?/.test(cmd)) {
      setSettings(s => ({ ...s, removeSilences: false }));
      result = "Silence removal → OFF";
    } else if (/remove\s+fillers?|filler(?:s)?\s+on/.test(cmd)) {
      setSettings(s => ({ ...s, removeFillers: true }));
      result = "Filler removal → ON";
    } else if (/filler(?:s)?\s+off|no\s+fillers?/.test(cmd)) {
      setSettings(s => ({ ...s, removeFillers: false }));
      result = "Filler removal → OFF";
    } else if (/no\s+captions?|captions?\s+off/.test(cmd)) {
      setSettings(s => ({ ...s, addCaptions: false }));
      result = "Captions → OFF";
    } else {
      const styleHit = captionStyles.find(style => cmd.includes(style) && (cmd.includes("caption") || cmd.includes("sub")));
      if (styleHit || (/add\s+captions?|captions?\s+on/.test(cmd))) {
        setSettings(s => ({ ...s, addCaptions: true, ...(styleHit ? { captionStyle: styleHit } : {}) }));
        result = `Captions → ON${styleHit ? `, style: ${styleHit}` : ""}`;
      }
    }

    if (!result) {
      const gradeHit = colorGrades.find(g => cmd.includes(g) && (cmd.includes("grade") || cmd.includes("color")));
      if (gradeHit) {
        setSettings(s => ({ ...s, colorGrade: gradeHit }));
        result = `Color grade → ${gradeHit}`;
      } else if (/no\s+(?:color\s+)?grade|grade\s+off|grade\s+none/.test(cmd)) {
        setSettings(s => ({ ...s, colorGrade: "none" }));
        result = "Color grade → none";
      }
    }

    if (!result) {
      const m9 = cmd.match(/reframe\s+(?:to\s+)?9\s*[:/]\s*16|portrait/);
      const m1 = cmd.match(/reframe\s+(?:to\s+)?1\s*[:/]\s*1|square/);
      const mOrig = cmd.match(/reframe\s+(?:to\s+)?(?:16\s*[:/]\s*9|original|landscape|none)/);
      if (m9) { setSettings(s => ({ ...s, reframe: "portrait" })); result = "Reframe → 9:16 (portrait)"; }
      else if (m1) { setSettings(s => ({ ...s, reframe: "square" })); result = "Reframe → 1:1 (square)"; }
      else if (mOrig) { setSettings(s => ({ ...s, reframe: "none" })); result = "Reframe → original"; }
    }

    if (!result) {
      const platHit = platforms.find(p => cmd.includes(p));
      if (platHit && (cmd.includes("export") || cmd.includes("platform") || cmd.includes("for"))) {
        setSettings(s => ({ ...s, platform: platHit }));
        result = `Platform → ${platHit}`;
      }
    }

    if (!result) {
      const hookM = raw.match(/(?:add\s+)?hook(?:\s+opener)?\s+"?([^"]+)"?/i);
      if (hookM) { setSettings(s => ({ ...s, hookOpener: hookM[1].trim() })); result = `Hook opener → "${hookM[1].trim()}"`; }
      const ltM = raw.match(/(?:add\s+)?lower\s+third\s+"?([^"]+)"?/i);
      if (ltM) { setSettings(s => ({ ...s, lowerThird: ltM[1].trim() })); result = `Lower third → "${ltM[1].trim()}"`; }
      const wmM = raw.match(/(?:add\s+)?watermark\s+"?([^"]+)"?/i);
      if (wmM) { setSettings(s => ({ ...s, watermarkText: wmM[1].trim() })); result = `Watermark → "${wmM[1].trim()}"`; }
      const ctaM = raw.match(/(?:subscribe|cta)\s+"?([^"]+)"?/i);
      if (ctaM) { setSettings(s => ({ ...s, addSubscribeCta: true, ctaText: ctaM[1].trim() })); result = `Subscribe CTA → "${ctaM[1].trim()}"`; }
      const musicM = raw.match(/(?:add\s+)?music\s+(https?:\/\/\S+)/i);
      if (musicM) { setSettings(s => ({ ...s, musicUrl: musicM[1] })); result = `Background music → ${musicM[1]}`; }
    }

    if (!result) {
      if (/normalize\s+audio|audio\s+normalize/.test(cmd)) { setSettings(s => ({ ...s, audioNormalize: true })); result = "Audio normalize → ON"; }
      else if (/restore\s+audio|audio\s+restore|denoise|noise\s+remove/.test(cmd)) { setSettings(s => ({ ...s, audioRestore: true })); result = "Audio restore → ON"; }
      else {
        const speedM = cmd.match(/([\d.]+)\s*x|speed\s+(?:up\s+)?([\d.]+)/);
        if (speedM) { const v = speedM[1] || speedM[2]; setSettings(s => ({ ...s, speed: v })); result = `Speed → ${v}x`; }
      }
    }

    const entry = result
      ? { text: `> ${raw}  →  ${result}`, ok: true }
      : { text: `> ${raw}  →  Unknown command. Try: "tiktok captions", "color grade cinematic", "reframe 9:16", "cut silences"`, ok: false };

    setCmdLog(prev => [entry, ...prev].slice(0, 10));
    setCmdInput("");
  };

  // ── Derived video URL ─────────────────────────────────────────────────────────
  const videoUrl = currentJob?.fileUrl?.startsWith("http")
    ? currentJob.fileUrl
    : currentJob?.fileUrl
      ? currentJob.fileUrl
      : null;

  return (
    <ClientLayout>
      <div className="h-full flex flex-col">

        {/* ── Top bar ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-card/30 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Film className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-black text-foreground tracking-tight leading-none">Video Studio</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Plan → Upload → Edit → Render</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: "plan", icon: Sparkles, label: "Plan Script" },
              { id: "edit", icon: Clapperboard, label: "Edit Studio" },
              { id: "renders", icon: Film, label: `Renders${renders.length > 0 ? ` (${renders.length})` : ""}` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${tab === t.id ? "bg-primary/15 text-primary border-primary/30" : "text-zinc-400 border-transparent hover:text-zinc-200 hover:border-zinc-700"}`}
                data-testid={`tab-${t.id}`}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ── PLAN SCRIPT TAB ─────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {tab === "plan" && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
              <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-2xl">
                <Sparkles className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-foreground">AI Script Planner</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Generate your script, hooks & shot list — then record & edit in the Studio</p>
                </div>
                {planResult && (
                  <Button size="sm" onClick={() => setTab("edit")} className="ml-auto bg-primary text-black hover:bg-primary/90 gap-1.5 font-bold flex-shrink-0">
                    Edit Studio <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Mode */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Video Style</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MODES.map(m => (
                    <button key={m.id} onClick={() => setPlanMode(m.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${planMode === m.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-zinc-700/50 text-muted-foreground hover:border-zinc-600"}`}>
                      <p className="text-xs font-bold text-foreground">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform + Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Platform</p>
                  <div className="flex flex-col gap-1.5">
                    {PLATFORMS.map(p => (
                      <button key={p.id} onClick={() => setPlanPlatform(p.id)}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border text-left transition-all ${planPlatform === p.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-zinc-700/50 text-muted-foreground hover:border-zinc-600"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Duration</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["15", "30", "45", "60", "90"].map(d => (
                      <button key={d} onClick={() => setPlanDuration(d)}
                        className={`text-xs font-semibold px-2 py-2 rounded-xl border transition-all ${planDuration === d ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-zinc-700/50 text-muted-foreground hover:border-zinc-600"}`}>
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Topic or Idea</p>
                <Textarea value={planTopic} onChange={e => setPlanTopic(e.target.value)} placeholder="e.g. 5 mistakes beginners make when building their personal brand on Instagram…" className="bg-card border-zinc-700/60 text-sm resize-none h-24" data-testid="input-plan-topic" />
              </div>

              <Button onClick={handleGeneratePlan} disabled={isPlanLoading || !planTopic.trim()}
                className="w-full bg-primary text-black hover:bg-primary/90 font-bold gap-2 h-11" data-testid="btn-generate-plan">
                {isPlanLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your script…</> : <><Wand2 className="w-4 h-4" /> Generate My Script</>}
              </Button>

              {/* Result */}
              {planResult && (
                <div className="space-y-4">
                  <div className="h-px bg-zinc-800/60" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-primary" /> Your Script Plan
                  </p>

                  {/* Hooks */}
                  {planResult.hooks?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">🎣 Hook Options</p>
                      {planResult.hooks.slice(0, 3).map((h: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-card border border-zinc-700/50 rounded-xl">
                          <span className="text-[10px] font-black text-primary mt-0.5 flex-shrink-0">#{i + 1}</span>
                          <p className="text-xs text-foreground">{h}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Script */}
                  {planResult.fullScript && (
                    <div className="space-y-2">
                      <button className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider" onClick={() => setScriptExpanded(v => !v)}>
                        <FileText className="w-3.5 h-3.5" /> Full Script
                        <span className="text-primary">{scriptExpanded ? "▲ hide" : "▼ show"}</span>
                      </button>
                      {scriptExpanded && (
                        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 max-h-64 overflow-y-auto">
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{planResult.fullScript}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  {planResult.timeline?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">🎬 Shot Timeline</p>
                      <div className="space-y-1.5">
                        {planResult.timeline.slice(0, 8).map((seg: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-card border border-zinc-700/40 rounded-xl">
                            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 mt-0.5">{seg.time || `${i * 5}–${(i + 1) * 5}s`}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground">{seg.action || seg.label || seg.title}</p>
                              {seg.note && <p className="text-[10px] text-muted-foreground mt-0.5">{seg.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={() => setTab("edit")} className="w-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 gap-2 font-bold">
                    <Clapperboard className="w-4 h-4" /> Upload & Edit Your Video
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ── EDIT STUDIO TAB ─────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {tab === "edit" && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">

            {/* Upload zone */}
            {!activeJobId && !isUploading && (
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
                  {editorPlan && (
                    <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/30 rounded-2xl space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-primary">Plan synced from AI Video Editor</p>
                          <p className="text-[11px] text-foreground font-semibold mt-0.5 truncate">{editorPlan.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 border px-1.5 py-0 h-4 capitalize">{editorPlan.mode}</Badge>
                            {editorPlan.timeline?.length > 0 && <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20 border px-1.5 py-0 h-4">{editorPlan.timeline.length} edit suggestions</Badge>}
                            {editorPlan.hooks?.length > 0 && <Badge className="text-[9px] bg-green-500/10 text-green-400 border-green-500/20 border px-1.5 py-0 h-4">{editorPlan.hooks.length} hooks</Badge>}
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Settings have been auto-applied. Upload your footage — your script &amp; edit checklist will appear alongside the player.</p>
                    </div>
                  )}

                  {!editorPlan && planResult && (
                    <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground">Script ready</p>
                        <p className="text-[10px] text-muted-foreground">Your script plan is loaded — upload your video to see it alongside the editor</p>
                      </div>
                    </div>
                  )}
                  <Input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="Give your video a title (optional)" className="h-10 bg-card border-zinc-700/60" data-testid="input-video-title" />
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all ${isDragging ? "border-primary/60 bg-primary/5" : "border-zinc-700/60 bg-card hover:border-primary/30 hover:bg-primary/3"}`}
                    data-testid="upload-zone"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-black text-foreground">Drop your video here</p>
                        <p className="text-sm text-muted-foreground mt-1">MP4, MOV, WebM, AVI, MKV, MP3, M4A, WAV — up to 200MB</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">AI transcription &amp; silence removal requires files under 25MB</p>
                      </div>
                      <Button size="sm" className="bg-primary text-black hover:bg-primary/90 gap-2 font-bold" data-testid="btn-browse-files">
                        <Upload className="w-3.5 h-3.5" /> Browse Files
                      </Button>
                    </div>
                    <input ref={fileRef} type="file" className="hidden" accept="video/*,audio/*"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} data-testid="input-file" />
                  </div>

                  {/* Quick-pick: previously transcribed jobs */}
                  {renders.filter(r => r.status === "transcribed").length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Or continue editing</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {renders.filter(r => r.status === "transcribed").slice(0, 4).map(r => (
                          <button key={r.id} onClick={() => setActiveJobId(r.id)}
                            className="flex items-center gap-3 p-3 bg-card border border-zinc-700/50 rounded-xl hover:border-primary/30 transition-all text-left"
                            data-testid={`btn-open-job-${r.id}`}>
                            <Film className="w-4 h-4 text-primary flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground truncate">{r.title}</p>
                              <p className="text-[10px] text-muted-foreground">{r.duration ? fmtTime(r.duration) : "—"} · {r.transcript?.words?.length || 0} words</p>
                            </div>
                            <StatusBadge status={r.status} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!planResult && (
                    <button onClick={() => setTab("plan")} className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 border border-dashed border-zinc-700/50 rounded-xl hover:border-zinc-600">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Generate a script before you record →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="bg-card border border-zinc-700/60 rounded-2xl p-10 text-center space-y-5 w-full max-w-sm mx-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                    <Upload className="w-7 h-7 text-primary animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Uploading…</p>
                    <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Transcribing */}
            {activeJobId && isProcessing && (
              <div className="flex-1 flex items-center justify-center">
                <div className="bg-card border border-blue-500/20 rounded-2xl p-10 text-center space-y-4 w-full max-w-sm mx-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                    <Mic className="w-7 h-7 text-blue-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">AI is reading your video…</p>
                    <p className="text-xs text-muted-foreground mt-1">Whisper AI creates word-level timestamps. Takes 15–60 seconds.</p>
                  </div>
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
                  <button onClick={() => setActiveJobId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                    Upload a different file
                  </button>
                </div>
              </div>
            )}

            {/* ── SPLIT-SCREEN EDITOR (transcribed) ── */}
            {activeJobId && isReady && currentJob && (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] min-h-0 overflow-hidden">

                {/* LEFT: Video + Timeline + Transcript */}
                <div className="flex flex-col min-h-0 border-r border-zinc-800/60 overflow-y-auto">

                  {/* Job header bar */}
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/30 flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{currentJob.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {currentJob.duration ? fmtTime(currentJob.duration) : "—"} · {words.length} words · {silences.length} silences · {totalSilence.toFixed(1)}s removable
                      </p>
                    </div>
                    <StatusBadge status={currentJob.status} />
                    <button onClick={() => setActiveJobId(null)} className="text-muted-foreground hover:text-foreground ml-1 flex-shrink-0">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Video player */}
                  <div className="bg-black flex-shrink-0 relative">
                    {videoUrl ? (
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                        onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration || 0)}
                        className="w-full max-h-[40vh] object-contain"
                        data-testid="video-player"
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center text-muted-foreground text-xs">
                        Video preview loading…
                      </div>
                    )}
                  </div>

                  {/* Silence timeline bar */}
                  <div className="px-4 py-3 border-b border-zinc-800/40 flex-shrink-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timeline</p>
                      <span className="text-[10px] text-muted-foreground font-mono">{fmtTime(currentTime)} / {fmtTime(totalDuration)}</span>
                    </div>
                    <div
                      className="relative w-full h-5 bg-green-500/20 rounded-lg overflow-hidden cursor-pointer border border-zinc-700/40"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        seekTo(pct * totalDuration);
                      }}
                    >
                      {silences.map((s, i) => (
                        <div key={i} title={`${s.duration.toFixed(2)}s silence`}
                          className="absolute top-0 bottom-0 bg-red-500/50 hover:bg-red-500/70 transition-colors"
                          style={{ left: `${(s.start / totalDuration) * 100}%`, width: `${Math.max(0.5, (s.duration / totalDuration) * 100)}%` }}
                        />
                      ))}
                      <div className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                        style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/40 inline-block" /> Speech</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/50 inline-block" /> Silence</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white/70 inline-block" /> Playhead</span>
                    </div>
                  </div>

                  {/* Word-level transcript */}
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Transcript — click any word to seek</p>
                    {words.length > 0 ? (
                      <div className="leading-7">
                        {words.map((w, i) => {
                          const isActive = currentTime >= w.start && currentTime <= w.end;
                          const isSilentBefore = i > 0 && (w.start - words[i - 1].end) >= 0.3;
                          return (
                            <span key={i}>
                              {isSilentBefore && (
                                <span className="inline-flex items-center mx-0.5">
                                  <span className="text-[8px] text-red-400/70 font-mono bg-red-500/8 border border-red-500/15 rounded px-1 py-0.5">
                                    {(w.start - words[i - 1].end).toFixed(1)}s
                                  </span>
                                </span>
                              )}
                              <span
                                onClick={() => seekTo(w.start)}
                                className={`cursor-pointer px-0.5 py-0.5 rounded text-xs transition-all ${
                                  isActive
                                    ? "bg-primary/30 text-primary font-bold ring-1 ring-primary/30"
                                    : "text-foreground/80 hover:bg-zinc-700/50 hover:text-foreground"
                                }`}
                                title={`${fmtTime(w.start)}`}
                              >
                                {w.word}
                              </span>
                              {" "}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No word-level transcript available for this file.</p>
                    )}
                  </div>
                </div>

                {/* RIGHT: Edit controls + script reference */}
                <div className="overflow-y-auto flex flex-col gap-0">

                  {/* ── Editor Plan Banner (from AI Video Editor) ── */}
                  {editorPlan && !editorBannerDismissed && (
                    <div className="mx-4 mt-4 p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-start gap-2.5">
                      <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-primary uppercase tracking-wider">Plan from AI Video Editor</p>
                        <p className="text-[10px] text-foreground mt-0.5 leading-relaxed">
                          <span className="font-bold truncate block">{editorPlan.title}</span>
                          Settings auto-applied for <span className="text-primary font-bold capitalize">{editorPlan.mode}</span> mode.
                        </p>
                        <a href="/video-editor" className="text-[10px] text-primary hover:text-primary/70 flex items-center gap-0.5 mt-1">
                          <ExternalLink className="w-2.5 h-2.5" /> Back to Editor
                        </a>
                      </div>
                      <button onClick={() => setEditorBannerDismissed(true)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* ── Command CLI ── */}
                  <div className="p-5 border-b border-zinc-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal className="w-4 h-4 text-green-400" />
                      <p className="text-sm font-bold text-foreground">Command Mode</p>
                      <span className="text-[9px] text-muted-foreground border border-zinc-700/50 rounded px-1.5 py-0.5 font-mono">CLI</span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800/70 rounded-xl overflow-hidden">
                      {cmdLog.length > 0 && (
                        <div className="px-3 py-2 max-h-32 overflow-y-auto space-y-1 border-b border-zinc-800/50">
                          {cmdLog.map((e, i) => (
                            <p key={i} className={`text-[10px] font-mono leading-snug ${e.ok ? "text-green-400/80" : "text-red-400/80"}`}>{e.text}</p>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className="text-green-400 font-mono text-xs flex-shrink-0">›</span>
                        <input
                          value={cmdInput}
                          onChange={e => setCmdInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleCmd(); }}
                          placeholder="tiktok captions · cut silences · color grade cinematic…"
                          className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-zinc-600 outline-none"
                        />
                        <button onClick={handleCmd}
                          className="text-[10px] font-mono text-green-400/60 hover:text-green-400 transition-colors flex-shrink-0">
                          run
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 mt-1.5 leading-snug">
                      Try: "tiktok captions" · "reframe 9:16" · "export for instagram" · "restore audio" · "reset"
                    </p>
                  </div>

                  {/* Edit settings */}
                  <div className="p-5 border-b border-zinc-800/40">
                    <div className="flex items-center gap-2 mb-4">
                      <Wand2 className="w-4 h-4 text-primary" />
                      <p className="text-sm font-bold text-foreground">Edit Settings</p>
                      {editorPlan && (
                        <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 border px-1.5 py-0 h-4">AI Recommended</Badge>
                      )}
                    </div>
                    <EditControls settings={settings} onChange={setSettings} />
                  </div>

                  {/* Motion Graphics */}
                  <div className="p-5 border-b border-zinc-800/40">
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <p className="text-sm font-bold text-foreground">Motion Graphics</p>
                    </div>
                    <MotionGraphicsPanel settings={settings} onChange={setSettings} />
                  </div>

                  {/* Platform Export */}
                  <div className="p-5 border-b border-zinc-800/40">
                    <div className="flex items-center gap-2 mb-4">
                      <MonitorSmartphone className="w-4 h-4 text-sky-400" />
                      <p className="text-sm font-bold text-foreground">Export Platform</p>
                    </div>
                    <PlatformPanel settings={settings} onChange={setSettings} />
                  </div>

                  {/* Render button */}
                  <div className="p-5 border-b border-zinc-800/40">
                    <Button
                      onClick={() => renderMutation.mutate({ id: currentJob.id, settings })}
                      disabled={renderMutation.isPending}
                      className="w-full bg-primary text-black hover:bg-primary/90 font-black gap-2 h-11 text-sm"
                      data-testid="btn-render"
                    >
                      {renderMutation.isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting render…</>
                        : <><Play className="w-4 h-4" /> Render My Video</>}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/50 text-center mt-2">Server-side ffmpeg · Usually 15–45 sec</p>
                  </div>

                  {/* ── Thumbnail Extractor ── */}
                  <div className="p-5 border-b border-zinc-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageDown className="w-4 h-4 text-violet-400" />
                      <p className="text-sm font-bold text-foreground">Extract Thumbnail</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleExtractThumbnail(currentTime)}
                        disabled={isThumbLoading}
                        className="flex-1 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10">
                        {isThumbLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ImageDown className="w-3.5 h-3.5 mr-1" /> At playhead</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExtractThumbnail(0)}
                        disabled={isThumbLoading}
                        className="flex-1 text-xs border-zinc-700/50 text-muted-foreground hover:text-foreground">
                        Frame 0
                      </Button>
                    </div>
                    {thumbUrl && (
                      <div className="mt-3 space-y-2">
                        <img src={thumbUrl} alt="thumbnail" className="w-full rounded-xl border border-zinc-700/50 object-cover" />
                        <a href={thumbUrl} target="_blank" rel="noreferrer" download>
                          <Button size="sm" className="w-full bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 text-xs gap-1.5">
                            <Download className="w-3.5 h-3.5" /> Download Thumbnail
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* ── AI Edit Suggestions (from Video Editor timeline) ── */}
                  {editorPlan?.timeline?.length > 0 && (
                    <div className="p-5 border-b border-zinc-800/40">
                      <div className="flex items-center gap-2 mb-3">
                        <Scissors className="w-3.5 h-3.5 text-amber-400" />
                        <p className="text-xs font-bold text-foreground">Edit Suggestions</p>
                        <span className="text-[10px] text-muted-foreground">
                          {checkedSuggestions.size}/{editorPlan.timeline.length} done
                        </span>
                      </div>
                      <div className="space-y-2">
                        {editorPlan.timeline.map((item: any, i: number) => {
                          const done = checkedSuggestions.has(i);
                          const actionColors: Record<string, string> = {
                            CUT:    "text-red-400 bg-red-500/10",
                            TRIM:   "text-orange-400 bg-orange-500/10",
                            ADD:    "text-green-400 bg-green-500/10",
                            KEEP:   "text-blue-400 bg-blue-500/10",
                            BROLL:  "text-purple-400 bg-purple-500/10",
                          };
                          const col = actionColors[item.action?.toUpperCase()] || "text-zinc-400 bg-zinc-700/30";
                          return (
                            <button key={i}
                              onClick={() => setCheckedSuggestions(prev => {
                                const next = new Set(prev);
                                next.has(i) ? next.delete(i) : next.add(i);
                                return next;
                              })}
                              className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${done ? "opacity-40 border-zinc-800/30 bg-zinc-900/20" : "border-zinc-700/40 hover:border-zinc-600/60 bg-zinc-900/30"}`}
                            >
                              {done
                                ? <CheckSquare className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              }
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                  {item.action && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${col}`}>{item.action}</span>
                                  )}
                                  {(item.startLabel || item.endLabel) && (
                                    <span className="text-[9px] text-muted-foreground font-mono">{item.startLabel}–{item.endLabel}</span>
                                  )}
                                </div>
                                <p className={`text-[11px] leading-relaxed font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.label}</p>
                                {item.note && <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{item.note}</p>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {checkedSuggestions.size === editorPlan.timeline.length && editorPlan.timeline.length > 0 && (
                        <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <p className="text-[11px] text-green-400 font-bold">All suggestions applied — ready to render!</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Script reference — if plan was generated */}
                  {planResult && (
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs font-bold text-foreground">Script Reference</p>
                        {editorPlan && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 border px-1.5 py-0 h-4">From Editor</Badge>}
                      </div>
                      {planResult.hooks?.[0] && (
                        <div className="p-3 bg-primary/5 border border-primary/15 rounded-xl mb-3">
                          <p className="text-[9px] font-bold text-primary uppercase tracking-wider mb-1">🎣 Top Hook</p>
                          <p className="text-xs text-foreground leading-relaxed">{planResult.hooks[0]}</p>
                        </div>
                      )}
                      {planResult.hooks?.length > 1 && (
                        <div className="space-y-1.5 mb-3">
                          {planResult.hooks.slice(1).map((h: string, i: number) => (
                            <div key={i} className="p-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                              <p className="text-[10px] text-muted-foreground">Hook {i + 2}</p>
                              <p className="text-[11px] text-foreground leading-relaxed">{h}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {planResult.fullScript && (
                        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3 max-h-48 overflow-y-auto">
                          <p className="text-[10px] text-foreground leading-relaxed whitespace-pre-wrap">{planResult.fullScript}</p>
                        </div>
                      )}
                      <button onClick={() => setTab("plan")} className="text-[10px] text-primary hover:text-primary/70 mt-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Edit plan →
                      </button>
                    </div>
                  )}

                  {!planResult && !editorPlan && (
                    <div className="p-5">
                      <button onClick={() => setTab("plan")}
                        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-3 border border-dashed border-zinc-700/50 rounded-xl hover:border-zinc-600">
                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Generate a script plan →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rendering */}
            {activeJobId && isRendering && currentJob && (
              <div className="flex-1 flex items-center justify-center">
                <div className="bg-card border border-amber-500/20 rounded-2xl p-10 text-center space-y-5 w-full max-w-sm mx-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                    <Film className="w-7 h-7 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Rendering your video…</p>
                    <p className="text-xs text-muted-foreground mt-1">ffmpeg is processing on the server. Usually 15–45 sec.</p>
                  </div>
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin mx-auto" />
                </div>
              </div>
            )}

            {/* Done */}
            {activeJobId && isDone && currentJob && (
              <div className="flex-1 overflow-y-auto flex items-start justify-center pt-8 px-6">
                <div className="bg-card border border-primary/20 rounded-2xl p-10 text-center space-y-5 w-full max-w-lg">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-foreground">Video Ready! 🎉</p>
                    <p className="text-sm text-muted-foreground mt-1">{currentJob.title}</p>
                  </div>
                  {currentJob.outputUrl && (
                    <div className="space-y-4">
                      <video src={currentJob.outputUrl} controls className="w-full rounded-xl border border-zinc-700/60" />
                      <a href={currentJob.outputUrl} target="_blank" rel="noreferrer" download>
                        <Button className="bg-primary text-black hover:bg-primary/90 gap-2 font-bold" data-testid="btn-download">
                          <Download className="w-4 h-4" /> Download Video
                        </Button>
                      </a>
                    </div>
                  )}
                  <button onClick={() => setActiveJobId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                    Upload another video
                  </button>
                </div>
              </div>
            )}

            {/* Failed */}
            {activeJobId && isFailed && (
              <div className="flex-1 flex items-center justify-center">
                <div className="bg-card border border-red-500/20 rounded-2xl p-10 text-center space-y-4 w-full max-w-sm mx-6">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Processing failed</p>
                    <p className="text-xs text-muted-foreground mt-1">File may be too large (&gt;25MB) for AI transcription, or in an unsupported format. Try an MP4 under 25MB.</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="outline" onClick={() => { deleteMutation.mutate(activeJobId); }} className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                    <Button size="sm" onClick={() => { deleteMutation.mutate(activeJobId); setActiveJobId(null); }} className="bg-primary text-black hover:bg-primary/90">
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ── RENDERS TAB ─────────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {tab === "renders" && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-3">
              {renders.length === 0 ? (
                <div className="bg-card border border-zinc-700/60 rounded-2xl p-14 text-center space-y-3">
                  <Film className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">No videos yet</p>
                  <Button size="sm" onClick={() => setTab("edit")} className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 gap-2">
                    <Upload className="w-3.5 h-3.5" /> Upload Your First Video
                  </Button>
                </div>
              ) : (
                renders.map(r => (
                  <div key={r.id} className="bg-card border border-zinc-700/50 rounded-xl p-4 flex items-center gap-4" data-testid={`card-render-${r.id}`}>
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/40 flex items-center justify-center flex-shrink-0">
                      <Film className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <StatusBadge status={r.status} />
                        {r.duration && <span className="text-[10px] text-muted-foreground">{fmtTime(r.duration)}</span>}
                        <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.status === "transcribed" && (
                        <Button size="sm" variant="outline" onClick={() => { setActiveJobId(r.id); setTab("edit"); }}
                          className="text-xs border-primary/30 text-primary hover:bg-primary/10" data-testid={`btn-edit-${r.id}`}>
                          Edit
                        </Button>
                      )}
                      {r.status === "done" && r.outputUrl && (
                        <a href={r.outputUrl} target="_blank" rel="noreferrer" download>
                          <Button size="sm" className="bg-primary text-black text-xs gap-1.5 font-bold" data-testid={`btn-dl-${r.id}`}>
                            <Download className="w-3 h-3" /> Download
                          </Button>
                        </a>
                      )}
                      {r.status === "rendering" && (
                        <Button size="sm" variant="outline" onClick={() => { setActiveJobId(r.id); setTab("edit"); }}
                          className="text-xs border-amber-500/30 text-amber-400">
                          View
                        </Button>
                      )}
                      <button onClick={() => deleteMutation.mutate(r.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        data-testid={`btn-delete-render-${r.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
