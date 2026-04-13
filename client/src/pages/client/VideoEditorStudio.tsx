import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Film, Upload, Scissors, Captions, Palette, Gauge, Play, Download,
  Loader2, CheckCircle2, XCircle, Clock, Trash2, ChevronDown, ChevronUp,
  Volume2, Wand2, RefreshCw, AlertCircle, Mic,
} from "lucide-react";

const GOLD = "#d4b461";

type VideoEdit = {
  id: number; userId: string; title: string; originalFilename: string;
  filePath: string; fileUrl?: string; duration?: number;
  transcript?: { text: string; words: {word: string; start: number; end: number}[]; duration?: number };
  silences?: {start: number; end: number; duration: number}[];
  status: string; shotstackRenderId?: string; outputUrl?: string;
  settings?: any; createdAt: string;
};

type Settings = {
  removeSilences: boolean; silenceThreshold: string;
  addCaptions: boolean; captionStyle: string;
  colorGrade: string; speed: string;
};

const DEFAULT_SETTINGS: Settings = {
  removeSilences: true, silenceThreshold: "0.5",
  addCaptions: true, captionStyle: "bold",
  colorGrade: "none", speed: "1",
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${parseFloat(sec) < 10 ? "0" : ""}${sec}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    uploaded:     { label: "Uploaded",     color: "text-zinc-400 bg-zinc-500/15 border-zinc-500/25",     icon: Clock },
    transcribing: { label: "Transcribing", color: "text-blue-400 bg-blue-500/15 border-blue-500/25",   icon: Loader2 },
    transcribed:  { label: "Ready",        color: "text-green-400 bg-green-500/15 border-green-500/25", icon: CheckCircle2 },
    rendering:    { label: "Rendering",    color: "text-amber-400 bg-amber-500/15 border-amber-500/25", icon: Loader2 },
    done:         { label: "Done",         color: "text-primary bg-primary/15 border-primary/25",       icon: CheckCircle2 },
    failed:       { label: "Failed",       color: "text-red-400 bg-red-500/15 border-red-500/25",       icon: XCircle },
  };
  const s = map[status] || map.uploaded;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.color}`}>
      <s.icon className={`w-2.5 h-2.5 ${["transcribing","rendering"].includes(status) ? "animate-spin" : ""}`} />
      {s.label}
    </span>
  );
}

function PillSelect({ options, value, onChange }: { options: {label: string; value: string}[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${value === o.value ? "bg-primary/20 text-primary border-primary/40" : "text-zinc-400 border-zinc-700/50 hover:text-zinc-200"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const set = (k: keyof Settings, v: any) => onChange({ ...settings, [k]: v });
  return (
    <div className="space-y-4">
      {/* Silence Removal */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold text-foreground">Remove Silences</span>
          </div>
          <button onClick={() => set("removeSilences", !settings.removeSilences)}
            className={`w-9 h-5 rounded-full transition-colors relative ${settings.removeSilences ? "bg-primary" : "bg-zinc-700"}`}
            data-testid="toggle-remove-silences">
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings.removeSilences ? "left-[18px]" : "left-0.5"}`} />
          </button>
        </div>
        {settings.removeSilences && (
          <div className="pl-5.5 space-y-1">
            <p className="text-[10px] text-muted-foreground">Gap threshold</p>
            <PillSelect value={settings.silenceThreshold} onChange={v => set("silenceThreshold", v)}
              options={[{ label: "0.3s (tight)", value: "0.3" }, { label: "0.5s", value: "0.5" }, { label: "1s (relaxed)", value: "1" }]} />
          </div>
        )}
      </div>

      {/* Captions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Captions className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold text-foreground">Burn Captions</span>
          </div>
          <button onClick={() => set("addCaptions", !settings.addCaptions)}
            className={`w-9 h-5 rounded-full transition-colors relative ${settings.addCaptions ? "bg-primary" : "bg-zinc-700"}`}
            data-testid="toggle-captions">
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings.addCaptions ? "left-[18px]" : "left-0.5"}`} />
          </button>
        </div>
        {settings.addCaptions && (
          <div className="pl-5.5 space-y-1">
            <p className="text-[10px] text-muted-foreground">Caption style</p>
            <PillSelect value={settings.captionStyle} onChange={v => set("captionStyle", v)}
              options={[{ label: "Bold", value: "bold" }, { label: "Netflix", value: "netflix" }, { label: "Minimal", value: "minimal" }, { label: "Karaoke", value: "karaoke" }]} />
          </div>
        )}
      </div>

      {/* Color Grade */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-foreground">Color Grade</span>
        </div>
        <PillSelect value={settings.colorGrade} onChange={v => set("colorGrade", v)}
          options={[{ label: "None", value: "none" }, { label: "Cinematic", value: "cinematic" }, { label: "Warm", value: "warm" }, { label: "Cool", value: "cool" }, { label: "Bright", value: "bright" }]} />
      </div>

      {/* Speed */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-bold text-foreground">Playback Speed</span>
        </div>
        <PillSelect value={settings.speed} onChange={v => set("speed", v)}
          options={[{ label: "0.75x", value: "0.75" }, { label: "1x", value: "1" }, { label: "1.25x", value: "1.25" }, { label: "1.5x", value: "1.5" }]} />
      </div>
    </div>
  );
}

function TranscriptPanel({ edit }: { edit: VideoEdit }) {
  const words = edit.transcript?.words || [];
  const silences = (edit.silences || []) as {start: number; end: number; duration: number}[];
  const totalSilence = silences.reduce((s, x) => s + x.duration, 0);
  const duration = edit.duration || 0;

  if (!words.length) {
    return <div className="text-center py-12 text-muted-foreground text-sm">No transcript available</div>;
  }

  const isSilentAt = (t: number) => silences.some(s => t >= s.end && t <= s.start + s.duration);

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Words", value: words.length.toLocaleString() },
          { label: "Silences", value: silences.length.toString() },
          { label: "Removable", value: `${totalSilence.toFixed(1)}s` },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900/60 rounded-lg p-2 text-center border border-zinc-800/60">
            <p className="text-xs font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Silence markers */}
      {silences.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Detected Silences</p>
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
            {silences.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] bg-red-500/5 border border-red-500/15 rounded px-2 py-1">
                <span className="text-red-400 font-mono">{fmtTime(s.start)} → {fmtTime(s.end)}</span>
                <span className="text-red-400/60">{s.duration.toFixed(2)}s gap</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full transcript */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Transcript</p>
        <div className="bg-zinc-900/40 rounded-xl p-3 max-h-64 overflow-y-auto border border-zinc-800/60">
          <p className="text-xs text-foreground leading-relaxed">{edit.transcript?.text}</p>
        </div>
      </div>
    </div>
  );
}

export default function VideoEditorStudio() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"studio" | "renders">("studio");
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: renders = [] } = useQuery<VideoEdit[]>({ queryKey: ["/api/video-studio"] });

  const { data: activeJob, refetch: refetchJob } = useQuery<VideoEdit>({
    queryKey: ["/api/video-studio", activeJobId],
    queryFn: () => fetch(`/api/video-studio/${activeJobId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeJobId,
    refetchInterval: activeJobId && ["transcribing", "rendering", "uploaded"].includes(renders.find(r => r.id === activeJobId)?.status || "done") ? 3000 : false,
  });

  const { data: jobStatus, refetch: refetchStatus } = useQuery<VideoEdit>({
    queryKey: ["/api/video-studio", activeJobId, "status"],
    queryFn: () => fetch(`/api/video-studio/${activeJobId}/status`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeJobId && activeJob?.status === "rendering",
    refetchInterval: activeJob?.status === "rendering" ? 5000 : false,
  });

  const currentJob = jobStatus?.status === "done" ? jobStatus : (activeJob || null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/video-studio/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-studio"] }); if (activeJobId) setActiveJobId(null); },
  });

  const renderMutation = useMutation({
    mutationFn: ({ id, settings }: { id: number; settings: Settings }) =>
      apiRequest("POST", `/api/video-studio/${id}/render`, { settings }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-studio"] });
      qc.invalidateQueries({ queryKey: ["/api/video-studio", activeJobId] });
      toast({ title: "Render started!", description: "Shotstack is processing your video. This takes 1–3 minutes." });
    },
    onError: (e: any) => toast({ title: "Render failed", description: e.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (activeJob?.status === "rendering") {
      const t = setInterval(() => refetchStatus(), 5000);
      return () => clearInterval(t);
    }
  }, [activeJob?.status]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;
    const allowed = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-matroska", "video/x-m4v", "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp4|mov|webm|avi|mkv|m4v|mp3|m4a|wav)$/i)) {
      toast({ title: "Invalid file type", description: "Please upload a video or audio file.", variant: "destructive" });
      return;
    }
    const title = videoTitle || file.name.replace(/\.[^/.]+$/, "");
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("video", file);
    formData.append("title", title);

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
        toast({ title: "Upload complete!", description: "Transcribing your video…" });
      } else {
        toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      }
    };
    xhr.onerror = () => { setIsUploading(false); toast({ title: "Upload failed", variant: "destructive" }); };
    xhr.send(formData);
  }, [videoTitle, toast, qc]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const activeStatus = currentJob?.status;
  const isProcessing = ["transcribing", "uploaded"].includes(activeStatus || "");
  const isReady = activeStatus === "transcribed";
  const isRendering = activeStatus === "rendering";
  const isDone = activeStatus === "done";
  const isFailed = activeStatus === "failed";

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Film className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Video Studio</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Upload raw footage → AI transcribes → edit → Shotstack renders it</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[{ id: "studio", label: "Studio" }, { id: "renders", label: `My Renders${renders.length > 0 ? ` (${renders.length})` : ""}` }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${tab === t.id ? "bg-primary/15 text-primary border-primary/30" : "text-zinc-400 border-zinc-700/50 hover:text-zinc-200"}`}
                data-testid={`tab-${t.id}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Studio Tab ── */}
        {tab === "studio" && (
          <div className="space-y-5">

            {/* Upload zone — shown when no active job */}
            {!activeJobId && !isUploading && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="Video title (optional)" className="h-9 text-sm bg-card border-zinc-700/60 max-w-xs" data-testid="input-video-title" />
                </div>
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${isDragging ? "border-primary/60 bg-primary/5" : "border-zinc-700/60 bg-card hover:border-primary/30 hover:bg-primary/3"}`}
                  data-testid="upload-zone"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground">Drop your video here</p>
                      <p className="text-sm text-muted-foreground mt-1">MP4, MOV, WebM, AVI, MKV — up to 200MB</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Also accepts audio: MP3, M4A, WAV</p>
                    </div>
                    <Button size="sm" className="bg-primary text-black hover:bg-primary/90 gap-2" data-testid="btn-browse-files">
                      <Upload className="w-3.5 h-3.5" />Browse Files
                    </Button>
                  </div>
                  <input ref={fileRef} type="file" className="hidden" accept="video/*,audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} data-testid="input-file" />
                </div>

                {/* Past renders quick pick */}
                {renders.filter(r => r.status === "transcribed").length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Or continue editing</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {renders.filter(r => r.status === "transcribed").slice(0, 4).map(r => (
                        <button key={r.id} onClick={() => setActiveJobId(r.id)}
                          className="flex items-center gap-3 p-3 bg-card border border-zinc-700/50 rounded-xl hover:border-primary/30 transition-all text-left"
                          data-testid={`btn-open-job-${r.id}`}>
                          <Film className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{r.title}</p>
                            <p className="text-[10px] text-muted-foreground">{r.duration ? fmtTime(r.duration) : "—"} · {r.transcript?.words?.length || 0} words</p>
                          </div>
                          <StatusBadge status={r.status} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="bg-card border border-zinc-700/60 rounded-2xl p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Uploading video…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{uploadProgress}%</p>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Transcribing state */}
            {activeJobId && isProcessing && (
              <div className="bg-card border border-blue-500/20 rounded-2xl p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                  <Mic className="w-7 h-7 text-blue-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Reading your video…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">AI is transcribing with word-level timestamps. Takes 15–60 seconds.</p>
                </div>
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
                <button onClick={() => setActiveJobId(null)} className="text-xs text-muted-foreground hover:text-foreground">Upload a different file</button>
              </div>
            )}

            {/* ── Studio — Ready to edit ── */}
            {activeJobId && isReady && currentJob && (
              <div className="space-y-4">
                {/* Job header */}
                <div className="flex items-center gap-3 bg-card border border-green-500/20 rounded-2xl px-5 py-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{currentJob.title}</p>
                    <p className="text-xs text-muted-foreground">{currentJob.duration ? fmtTime(currentJob.duration) : "—"} · {currentJob.transcript?.words?.length || 0} words · {(currentJob.silences as any[] || []).length} silences detected</p>
                  </div>
                  <StatusBadge status={currentJob.status} />
                  <button onClick={() => setActiveJobId(null)} className="text-muted-foreground hover:text-foreground ml-2" data-testid="btn-close-studio">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Two-column studio */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* Settings — left */}
                  <div className="lg:col-span-2 bg-card border border-zinc-700/60 rounded-2xl p-5 space-y-5">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-primary" />
                      <p className="text-sm font-bold text-foreground">Edit Settings</p>
                    </div>
                    <SettingsPanel settings={settings} onChange={setSettings} />
                    <div className="border-t border-zinc-800/60 pt-4">
                      <Button
                        onClick={() => renderMutation.mutate({ id: currentJob.id, settings })}
                        disabled={renderMutation.isPending}
                        className="w-full bg-primary text-black hover:bg-primary/90 font-bold gap-2"
                        data-testid="btn-render"
                      >
                        {renderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Render My Video
                      </Button>
                      <p className="text-[10px] text-muted-foreground/60 text-center mt-2">Powered by Shotstack · 1–3 min</p>
                    </div>
                  </div>

                  {/* Transcript — right */}
                  <div className="lg:col-span-3 bg-card border border-zinc-700/60 rounded-2xl p-5">
                    <button className="flex items-center justify-between w-full mb-3" onClick={() => setShowTranscript(v => !v)}>
                      <div className="flex items-center gap-2">
                        <Captions className="w-4 h-4 text-blue-400" />
                        <p className="text-sm font-bold text-foreground">Transcript & Silences</p>
                      </div>
                      {showTranscript ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {showTranscript && <TranscriptPanel edit={currentJob} />}
                    {!showTranscript && (
                      <div className="text-center py-6 text-muted-foreground text-sm cursor-pointer" onClick={() => setShowTranscript(true)}>
                        Click to view transcript &amp; detected silences
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rendering state */}
            {activeJobId && isRendering && currentJob && (
              <div className="bg-card border border-amber-500/20 rounded-2xl p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                  <Film className="w-7 h-7 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Shotstack is rendering your video…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This usually takes 1–3 minutes. We'll update automatically.</p>
                </div>
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin mx-auto" />
                <div className="flex items-center gap-2 justify-center">
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 border text-[10px]">Job: {currentJob.shotstackRenderId?.slice(0, 8)}…</Badge>
                  <button onClick={() => refetchStatus()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Check status
                  </button>
                </div>
              </div>
            )}

            {/* Done state */}
            {activeJobId && isDone && currentJob && (
              <div className="bg-card border border-primary/20 rounded-2xl p-8 text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-black text-foreground">Your video is ready!</p>
                  <p className="text-sm text-muted-foreground mt-1">{currentJob.title}</p>
                </div>
                {currentJob.outputUrl && (
                  <div className="space-y-3">
                    <video src={currentJob.outputUrl} controls className="w-full max-w-lg mx-auto rounded-xl border border-zinc-700/60" />
                    <a href={currentJob.outputUrl} target="_blank" rel="noreferrer" download>
                      <Button className="bg-primary text-black hover:bg-primary/90 gap-2 font-bold" data-testid="btn-download">
                        <Download className="w-4 h-4" />Download Video
                      </Button>
                    </a>
                  </div>
                )}
                <button onClick={() => setActiveJobId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  Upload another video
                </button>
              </div>
            )}

            {/* Failed state */}
            {activeJobId && isFailed && (
              <div className="bg-card border border-red-500/20 rounded-2xl p-8 text-center space-y-4">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-foreground">Processing failed</p>
                  <p className="text-xs text-muted-foreground mt-1">Something went wrong. Please try uploading again.</p>
                </div>
                <button onClick={() => { deleteMutation.mutate(activeJobId); setActiveJobId(null); }} className="text-xs text-red-400 hover:text-red-300">
                  Remove &amp; start over
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Renders Tab ── */}
        {tab === "renders" && (
          <div className="space-y-3">
            {renders.length === 0 ? (
              <div className="bg-card border border-zinc-700/60 rounded-2xl p-12 text-center space-y-3">
                <Film className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">No videos yet</p>
                <p className="text-xs text-muted-foreground/60">Upload a video in the Studio tab to get started</p>
              </div>
            ) : (
              renders.map(r => (
                <div key={r.id} className="bg-card border border-zinc-700/50 rounded-xl p-4 flex items-center gap-4" data-testid={`card-render-${r.id}`}>
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
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
                  <div className="flex items-center gap-2">
                    {r.status === "transcribed" && (
                      <Button size="sm" variant="outline" onClick={() => { setActiveJobId(r.id); setTab("studio"); }} className="text-xs border-primary/30 text-primary" data-testid={`btn-edit-${r.id}`}>
                        Edit
                      </Button>
                    )}
                    {r.status === "done" && r.outputUrl && (
                      <a href={r.outputUrl} target="_blank" rel="noreferrer" download>
                        <Button size="sm" className="bg-primary text-black text-xs gap-1.5" data-testid={`btn-dl-${r.id}`}>
                          <Download className="w-3 h-3" />Download
                        </Button>
                      </a>
                    )}
                    {r.status === "rendering" && (
                      <Button size="sm" variant="outline" onClick={() => { setActiveJobId(r.id); setTab("studio"); }} className="text-xs border-amber-500/30 text-amber-400">
                        View
                      </Button>
                    )}
                    <button onClick={() => deleteMutation.mutate(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" data-testid={`btn-delete-render-${r.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
