import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload, Loader2, CheckCircle2, XCircle, Send, Undo2, Download, Share2, Copy, Scissors, Captions,
  Palette, Gauge, RectangleHorizontal, Sparkles, Film, AlertTriangle, RotateCcw, Trash2, Eye, EyeOff, Wand2, Clock,
} from "lucide-react";

// ── Types (mirror server/videoEditor/edl.ts) ──────────────────────────────────
type Word = { word: string; start: number; end: number };
type Cut = { start: number; end: number; reason?: string; source?: string };
type EDL = {
  version: 1;
  trim: { start: number; end: number };
  cuts: Cut[];
  captions: { enabled: boolean; style: "bold" | "karaoke" | "minimal" | "boxed"; position: "bottom" | "middle" | "top"; wordsPerLine: number; uppercase: boolean };
  colorGrade: string;
  speed: number;
  aspect: "original" | "9:16" | "1:1" | "16:9";
};
type Job = { id: number; kind: string; status: "queued" | "running" | "done" | "failed"; progress: number; stage: string | null; error: string | null; queuePosition: number; result: any };
type ChatMsg = { role: "user" | "assistant"; content: string; applied?: string[]; engine?: string; undone?: boolean; at?: string };
export type Project = {
  id: number; title: string; status: string; fileUrl?: string | null; sourceRemoteUrl?: string | null; duration?: number;
  transcript?: { text: string; words: Word[]; duration?: number; method?: string; skipped?: boolean } | null;
  edl: EDL; edlSummary: string; keepSegments: { start: number; end: number }[]; outputDuration: number;
  outputUrl?: string | null; outputEngine?: string | null; outputWatermarked?: boolean; outputMeta?: any;
  chatHistory?: ChatMsg[] | null; error?: string | null; job: Job | null; createdAt: string; source?: string;
};
type Caps = { ffmpeg: boolean; transcription: boolean; cloudinary: boolean; shotstack: boolean; renderEngine: "ffmpeg" | "shotstack-stage" | "none"; watermarked: boolean; persistentStorage: boolean };

const BUSY = ["transcribing", "rendering", "importing"];
const CAPTION_PRESETS: { id: EDL["captions"]["style"]; label: string; hint: string }[] = [
  { id: "bold", label: "Bold", hint: "Big white, thick outline" },
  { id: "karaoke", label: "Karaoke", hint: "Spoken word pops yellow" },
  { id: "minimal", label: "Minimal", hint: "Small & clean" },
  { id: "boxed", label: "Boxed", hint: "Subtitle box" },
];
const GRADES = ["none", "cinematic", "warm", "cool", "bright", "vivid", "bw"];
// Browser approximation of the ffmpeg grades (the render uses real ffmpeg filters).
const GRADE_CSS: Record<string, string> = {
  none: "none", cinematic: "contrast(1.18) saturate(0.88) brightness(0.97)", warm: "sepia(0.18) saturate(1.12)",
  cool: "hue-rotate(-12deg) saturate(0.95) brightness(1.02)", bright: "brightness(1.1) contrast(1.04) saturate(1.1)",
  vivid: "saturate(1.4) contrast(1.08)", bw: "grayscale(1) contrast(1.1)",
};
const SUGGESTIONS = [
  "Remove silences and filler words",
  "Karaoke captions at the bottom",
  "Make it 9:16 with a warm grade",
  "Keep only the strongest 30 seconds",
];

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r < 10 ? "0" : ""}${r.toFixed(1)}`;
};

function inKeep(t: number, segs: { start: number; end: number }[]) {
  return segs.find(s => t >= s.start && t < s.end) || null;
}

/** Caption lines in SOURCE time for the live preview (same grouping as the server). */
function captionLines(words: Word[], wordsPerLine: number) {
  const lines: { start: number; end: number; words: Word[] }[] = [];
  let cur: Word[] = [];
  const flush = () => { if (cur.length) lines.push({ start: cur[0].start, end: cur[cur.length - 1].end, words: cur }); cur = []; };
  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (prev && (w.start - prev.end > 0.7 || cur.length >= wordsPerLine)) flush();
    cur.push(w);
    if (/[.!?]$/.test(w.word.trim())) flush();
  }
  flush();
  for (let i = 0; i < lines.length; i++) {
    const n = lines[i + 1];
    if (n && n.start - lines[i].end < 0.35) lines[i].end = n.start;
  }
  return lines;
}

/** Seconds input that commits on blur / Enter (the server clamps and validates). */
function TrimInput({ label, value, max, disabled, onCommit }: { label: string; value: number; max: number; disabled?: boolean; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState(value.toFixed(1));
  useEffect(() => { setDraft(value.toFixed(1)); }, [value]);
  const commit = () => {
    const v = parseFloat(draft);
    if (Number.isFinite(v) && Math.abs(v - value) > 0.04) onCommit(Math.min(Math.max(0, v), max));
    else setDraft(value.toFixed(1));
  };
  return (
    <Input aria-label={`Trim ${label} (seconds)`} data-testid={`input-trim-${label}`} value={draft} disabled={disabled}
      onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      inputMode="decimal" className="h-7 w-16 text-[11px] px-2 bg-zinc-950 border-zinc-700" />
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    transcribing: "text-blue-400 bg-blue-500/15 border-blue-500/25", importing: "text-blue-400 bg-blue-500/15 border-blue-500/25",
    transcribed: "text-green-400 bg-green-500/15 border-green-500/25", rendering: "text-amber-400 bg-amber-500/15 border-amber-500/25",
    done: "text-primary bg-primary/15 border-primary/25", failed: "text-red-400 bg-red-500/15 border-red-500/25",
  };
  const label: Record<string, string> = { transcribed: "Ready to edit", done: "Rendered" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status] || "text-zinc-400 bg-zinc-500/15 border-zinc-500/25"}`}>
      {BUSY.includes(status) && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {label[status] || status}
    </span>
  );
}

function JobBar({ job, label }: { job: Job | null; label: string }) {
  if (!job || (job.status !== "queued" && job.status !== "running")) return null;
  return (
    <div className="p-3 rounded-xl border border-zinc-700/60 bg-zinc-900/60 space-y-2" data-testid="job-progress">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-semibold text-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />{label}</span>
        <span className="text-muted-foreground">{job.status === "queued" ? `Queued${job.queuePosition ? ` · ${job.queuePosition} ahead` : ""}` : `${job.progress}%`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${Math.max(3, job.progress)}%` }} /></div>
      {job.stage && <p className="text-[10px] text-muted-foreground">{job.stage} · runs in the background — you can leave this page</p>}
    </div>
  );
}

// ── Upload / project picker ────────────────────────────────────────────────────
function UploadPanel({ onCreated, caps }: { onCreated: (id: number) => void; caps?: Caps }) {
  const { toast } = useToast();
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [title, setTitle] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/video-studio"] });

  const upload = (file: File) => {
    if (file.size > 1024 * 1024 * 1024) { toast({ title: "File too large", description: "Max 1GB.", variant: "destructive" }); return; }
    const fd = new FormData();
    fd.append("video", file);
    fd.append("title", title || file.name.replace(/\.[^/.]+$/, ""));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/video-studio/upload");
    xhr.withCredentials = true;
    xhr.upload.onprogress = e => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status === 200) { const p = JSON.parse(xhr.responseText); onCreated(p.id); toast({ title: "Uploaded — transcribing in the background" }); }
      else { let m = "Upload failed"; try { m = JSON.parse(xhr.responseText).message || m; } catch { /* html error */ } toast({ title: m, variant: "destructive" }); }
    };
    xhr.onerror = () => { setProgress(null); toast({ title: "Upload failed (network)", variant: "destructive" }); };
    setProgress(0);
    xhr.send(fd);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" className="h-10 bg-card border-zinc-700/60" data-testid="input-video-title" />
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
        onClick={() => progress === null && ref.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${drag ? "border-primary/60 bg-primary/5" : "border-zinc-700/60 bg-card hover:border-primary/30"}`}
        data-testid="upload-zone"
      >
        {progress === null ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"><Upload className="w-7 h-7 text-primary" /></div>
            <p className="text-base font-black text-foreground">Drop a video to start</p>
            <p className="text-xs text-muted-foreground">MP4, MOV, WebM, MKV · any length — audio is extracted for Whisper automatically, so there's no 25MB limit</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-sm mx-auto">
            <p className="text-sm font-bold text-foreground">Uploading… {progress}%</p>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <input ref={ref} type="file" accept="video/*,audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        Or pick a moment in <a href="/clip-finder" className="text-primary hover:underline">Clip Finder</a> and press “Open in Editor”.
      </p>
      {caps && !caps.persistentStorage && (
        <p className="text-[11px] text-amber-400/90 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Files are stored on the server's temporary disk and are removed when it restarts. Download your render when it's done.
        </p>
      )}
      {projects.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent projects</p>
          {projects.slice(0, 12).map(p => (
            <button key={p.id} onClick={() => onCreated(p.id)} className="w-full flex items-center gap-3 p-3 bg-card border border-zinc-700/50 rounded-xl hover:border-primary/30 text-left" data-testid={`project-${p.id}`}>
              <Film className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate flex-1">{p.title}</span>
              {p.source === "clip_finder" && <span className="text-[10px] text-muted-foreground">from Clip Finder</span>}
              <StatusPill status={p.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main editor ────────────────────────────────────────────────────────────────
export default function AIEditStudio({ projectId, onProjectChange }: { projectId: number | null; onProjectChange: (id: number | null) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: caps } = useQuery<Caps>({ queryKey: ["/api/video-studio/capabilities"] });

  // Deep links from Clip Finder: ?project=ID&start=&end=  or  ?yt=VIDEO&start=&end=&title=
  const handledLink = useRef(false);
  useEffect(() => {
    if (handledLink.current) return;
    handledLink.current = true;
    const q = new URLSearchParams(window.location.search);
    const start = parseFloat(q.get("start") || ""), end = parseFloat(q.get("end") || "");
    const clean = () => window.history.replaceState(null, "", window.location.pathname);
    if (q.get("project")) {
      const id = Number(q.get("project"));
      onProjectChange(id);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        apiRequest("PATCH", `/api/video-studio/${id}/edl`, { operations: [{ op: "set_trim", start, end }] })
          .then(() => qc.invalidateQueries({ queryKey: ["/api/video-studio", id] }))
          .catch(() => {});
      }
      clean();
    } else if (q.get("yt")) {
      apiRequest("POST", "/api/video-studio/from-youtube", { videoId: q.get("yt"), start, end, title: q.get("title") || undefined })
        .then((p: any) => { onProjectChange(p.id); toast({ title: "Importing clip from YouTube…" }); })
        .catch((e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }));
      clean();
    }
  }, [onProjectChange, qc, toast]);

  const { data: project, refetch } = useQuery<Project>({
    queryKey: ["/api/video-studio", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/video-studio/${projectId}`, { credentials: "include" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Project not found");
      return r.json();
    },
    enabled: !!projectId,
    // Async job status polling: fast while a job runs, off when idle.
    refetchInterval: q => {
      const d = q.state.data as Project | undefined;
      if (!d) return 2000;
      const busy = BUSY.includes(d.status) || d.job?.status === "queued" || d.job?.status === "running";
      return busy ? 2000 : false;
    },
  });

  // Notify on job completion
  const lastStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!project) return;
    const prev = lastStatus.current;
    lastStatus.current = project.status;
    if (prev === "rendering" && project.status === "done") toast({ title: "Render complete 🎬", description: "Your edited video is ready to download." });
    if (prev && BUSY.includes(prev) && project.error && !BUSY.includes(project.status)) toast({ title: "Something went wrong", description: project.error, variant: "destructive" });
    if (prev !== project.status) qc.invalidateQueries({ queryKey: ["/api/video-studio"], exact: true });
  }, [project, qc, toast]);

  if (!projectId) return <div className="flex-1 overflow-y-auto"><UploadPanel caps={caps} onCreated={id => onProjectChange(id)} /></div>;
  if (!project) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  return <Editor key={project.id} project={project} caps={caps} refetch={refetch} onClose={() => onProjectChange(null)} />;
}

function Editor({ project, caps, refetch, onClose }: { project: Project; caps?: Caps; refetch: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [previewEdit, setPreviewEdit] = useState(true);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [busyOp, setBusyOp] = useState(false);

  const edl = project.edl;
  const words = project.transcript?.words || [];
  const duration = project.duration || edl.trim.end || 0;
  const segs = project.keepSegments || [];
  const ready = project.status === "transcribed" || project.status === "done" || (project.status === "failed" && !!project.transcript);
  const transcriptFailed = project.status === "failed" && !project.transcript;
  const job = project.job;
  const src = project.sourceRemoteUrl || project.fileUrl || undefined;
  // Only words that survive the edit get captions (same rule as the server's remapWords).
  const lines = useMemo(
    () => captionLines(words.filter(w => inKeep((w.start + w.end) / 2, segs)), edl.captions.wordsPerLine),
    [words, segs, edl.captions.wordsPerLine],
  );

  const setProject = (p: Project) => qc.setQueryData(["/api/video-studio", project.id], p);

  // ── EDL preview playback: skip cut ranges, apply speed ──
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = previewEdit ? edl.speed : 1; }, [edl.speed, previewEdit]);
  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    let now = v.currentTime;
    if (previewEdit && segs.length) {
      if (!inKeep(now, segs)) {
        const next = segs.find(s => s.start > now);
        if (next) { v.currentTime = next.start; now = next.start; }
        else if (!v.paused) { v.pause(); v.currentTime = segs[0].start; now = segs[0].start; }
      }
    }
    setT(now);
  };
  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    if (previewEdit && segs.length && !inKeep(v.currentTime, segs)) v.currentTime = segs[0].start;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };
  const seek = (s: number) => { if (videoRef.current) videoRef.current.currentTime = s; setT(s); };

  const activeLine = previewEdit && edl.captions.enabled ? lines.find(l => t >= l.start && t < l.end) : undefined;

  // ── Mutations ──
  const applyOps = async (operations: any[]) => {
    setBusyOp(true);
    try {
      const p = await apiRequest("PATCH", `/api/video-studio/${project.id}/edl`, { operations });
      setProject(p);
      if (p.applied?.length) toast({ title: p.applied.join(" · ") });
    } catch (e: any) { toast({ title: "Edit failed", description: e.message, variant: "destructive" }); }
    finally { setBusyOp(false); }
  };

  const send = async (text: string) => {
    const m = text.trim();
    if (!m || sending) return;
    setSending(true);
    setMsg("");
    // optimistic user bubble
    setProject({ ...project, chatHistory: [...(project.chatHistory || []), { role: "user", content: m }] });
    try {
      const r = await apiRequest("POST", `/api/video-studio/${project.id}/chat`, { message: m });
      setProject(r.project);
    } catch (e: any) {
      toast({ title: "AI edit failed", description: e.message, variant: "destructive" });
      refetch();
    } finally { setSending(false); }
  };
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [project.chatHistory?.length]);

  const undo = async () => {
    try { setProject(await apiRequest("POST", `/api/video-studio/${project.id}/undo`)); }
    catch (e: any) { toast({ title: "Nothing to undo", description: e.message }); }
  };

  const render = async (quality: "preview" | "final") => {
    try {
      const r = await apiRequest("POST", `/api/video-studio/${project.id}/render`, { quality });
      toast({ title: r.watermarked ? "Preview render started (Shotstack sandbox, watermarked)" : "Render started", description: "Runs in the background — status updates automatically." });
      refetch();
    } catch (e: any) { toast({ title: "Couldn't start render", description: e.message, variant: "destructive" }); }
  };

  const retryTranscribe = async () => { try { await apiRequest("POST", `/api/video-studio/${project.id}/transcribe`); refetch(); } catch (e: any) { toast({ title: e.message, variant: "destructive" }); } };
  const skipTranscript = async () => { try { setProject(await apiRequest("POST", `/api/video-studio/${project.id}/skip-transcript`)); } catch (e: any) { toast({ title: e.message, variant: "destructive" }); } };
  const remove = async () => {
    if (!confirm("Delete this project and its uploaded file?")) return;
    await apiRequest("DELETE", `/api/video-studio/${project.id}`);
    qc.invalidateQueries({ queryKey: ["/api/video-studio"], exact: true });
    onClose();
  };

  const shareUrl = project.outputUrl ? (/^https?:/.test(project.outputUrl) ? project.outputUrl : `${window.location.origin}${project.outputUrl}`) : "";
  const share = async () => {
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: project.title, url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); toast({ title: "Link copied" }); }
    } catch { /* user cancelled */ }
  };

  const busy = BUSY.includes(project.status);
  const renderJobActive = job?.kind === "studio_render" && (job.status === "queued" || job.status === "running");
  const aspectCss = edl.aspect === "9:16" ? "9 / 16" : edl.aspect === "1:1" ? "1 / 1" : edl.aspect === "16:9" ? "16 / 9" : undefined;
  const pct = (s: number) => `${duration > 0 ? (s / duration) * 100 : 0}%`;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">← Projects</button>
          <h2 className="text-base font-black text-foreground truncate">{project.title}</h2>
          <StatusPill status={project.status} />
          <span className="text-[11px] text-muted-foreground ml-auto">{project.edlSummary}</span>
          <Button size="sm" variant="ghost" onClick={remove} className="h-7 text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>

        {/* Pipeline state */}
        {project.status === "transcribing" || project.status === "importing" ? (
          <JobBar job={job} label={project.status === "importing" ? "Importing clip" : "Transcribing with Whisper"} />
        ) : null}
        {transcriptFailed && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-3 flex-wrap">
            <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
            <p className="text-xs text-foreground flex-1 min-w-[200px]">{project.error || "Transcription failed."}</p>
            <Button size="sm" variant="outline" onClick={retryTranscribe} className="h-7 text-xs gap-1"><RotateCcw className="w-3 h-3" /> Retry</Button>
            <Button size="sm" variant="ghost" onClick={skipTranscript} className="h-7 text-xs">Edit without captions</Button>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_380px] gap-4">
          {/* ── Left: preview + EDL ── */}
          <div className="space-y-3 min-w-0">
            <div className="relative bg-black rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center" style={{ maxHeight: "60vh" }}>
              <div className="relative h-full max-h-[60vh] w-full" style={aspectCss && previewEdit ? { aspectRatio: aspectCss, width: "auto", maxWidth: "100%", margin: "0 auto" } : undefined}>
                {src ? (
                  <video ref={videoRef} src={src} onTimeUpdate={onTime} onClick={play} playsInline preload="metadata"
                    className="w-full h-full max-h-[60vh] bg-black" data-testid="preview-video"
                    style={{ objectFit: aspectCss && previewEdit ? "cover" : "contain", filter: previewEdit ? GRADE_CSS[edl.colorGrade] || "none" : "none" }} />
                ) : (
                  <div className="aspect-video flex items-center justify-center text-xs text-muted-foreground">Waiting for the video…</div>
                )}
                {activeLine && (
                  <div className={`pointer-events-none absolute inset-x-0 flex justify-center px-4 ${edl.captions.position === "top" ? "top-[8%]" : edl.captions.position === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-[9%]"}`}>
                    <span className={
                      edl.captions.style === "boxed" ? "bg-black/60 text-white text-sm sm:text-base px-2 py-0.5 rounded" :
                      edl.captions.style === "minimal" ? "text-white text-xs sm:text-sm [text-shadow:0_1px_3px_rgba(0,0,0,.9)]" :
                      "text-white font-black text-lg sm:text-2xl uppercase tracking-wide [-webkit-text-stroke:1.5px_black] [paint-order:stroke]"
                    } data-testid="caption-preview">
                      {activeLine.words.map((w, i) => (
                        <span key={i} className={edl.captions.style === "karaoke" && t >= w.start && (i === activeLine.words.length - 1 || t < activeLine.words[i + 1].start) ? "text-yellow-300" : ""}>
                          {(edl.captions.uppercase ? w.word.toUpperCase() : w.word) + " "}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline: trim window, cuts, playhead */}
            <div className="space-y-1.5">
              <div className="relative h-9 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden cursor-pointer" data-testid="edl-timeline"
                onClick={e => { const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * duration); }}>
                <div className="absolute inset-y-0 bg-zinc-700/70" style={{ left: 0, width: pct(edl.trim.start) }} />
                <div className="absolute inset-y-0 bg-zinc-700/70" style={{ left: pct(edl.trim.end), right: 0 }} />
                {segs.map((s, i) => <div key={i} className="absolute inset-y-1 rounded bg-primary/35 border border-primary/50" style={{ left: pct(s.start), width: pct(s.end - s.start) }} />)}
                {edl.cuts.map((c, i) => <div key={`c${i}`} title={c.reason} className="absolute inset-y-0 bg-red-500/40" style={{ left: pct(c.start), width: pct(c.end - c.start) }} />)}
                <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: pct(t) }} />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={play}>Play / Pause</Button>
                <span>{fmt(t)} / {fmt(duration)}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/50" /> kept {segs.length}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/50" /> cut {edl.cuts.length}</span>
                <span>output ≈ {fmt(project.outputDuration)}</span>
                <button onClick={() => setPreviewEdit(v => !v)} className="ml-auto flex items-center gap-1 hover:text-foreground" data-testid="toggle-preview-edit">
                  {previewEdit ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} {previewEdit ? "Previewing edit" : "Showing original"}
                </button>
              </div>
            </div>

            {/* Edit decision list */}
            <div className="rounded-2xl border border-zinc-800 bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground flex items-center gap-2"><Scissors className="w-3.5 h-3.5 text-red-400" /> Edit decision list</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" disabled={!words.length || busyOp} onClick={() => applyOps([{ op: "remove_silences" }])} className="h-7 text-[11px]">Remove silences</Button>
                  <Button size="sm" variant="outline" disabled={!words.length || busyOp} onClick={() => applyOps([{ op: "remove_fillers" }])} className="h-7 text-[11px]">Remove fillers</Button>
                  {edl.cuts.length > 0 && <Button size="sm" variant="ghost" disabled={busyOp} onClick={() => applyOps([{ op: "clear_cuts" }])} className="h-7 text-[11px]">Clear cuts</Button>}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>Trim <b className="text-foreground">{fmt(edl.trim.start)} – {fmt(edl.trim.end)}</b></span>
                <span>Captions <b className="text-foreground">{edl.captions.enabled ? `${edl.captions.style} · ${edl.captions.position}` : "off"}</b></span>
                <span>Grade <b className="text-foreground">{edl.colorGrade}</b></span>
                <span>Speed <b className="text-foreground">{edl.speed}×</b></span>
                <span>Aspect <b className="text-foreground">{edl.aspect}</b></span>
                {(edl.trim.start > 0.01 || edl.trim.end < duration - 0.01) && <button className="text-primary hover:underline" onClick={() => applyOps([{ op: "set_trim", start: 0, end: duration }])}>reset trim</button>}
              </div>
              {/* Trim: cut the start/end of the clip (playhead buttons or exact seconds) */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]" data-testid="trim-controls">
                <span className="font-bold text-foreground">Trim</span>
                <Button size="sm" variant="outline" disabled={busyOp || t >= edl.trim.end - 0.5} onClick={() => applyOps([{ op: "set_trim", start: t, end: edl.trim.end }])} className="h-7 text-[11px]" data-testid="btn-trim-start">Start here ({fmt(t)})</Button>
                <Button size="sm" variant="outline" disabled={busyOp || t <= edl.trim.start + 0.5} onClick={() => applyOps([{ op: "set_trim", start: edl.trim.start, end: t }])} className="h-7 text-[11px]" data-testid="btn-trim-end">End here ({fmt(t)})</Button>
                <TrimInput label="start" value={edl.trim.start} max={duration} disabled={busyOp} onCommit={v => applyOps([{ op: "set_trim", start: v, end: edl.trim.end }])} />
                <span className="text-muted-foreground">–</span>
                <TrimInput label="end" value={edl.trim.end} max={duration} disabled={busyOp} onCommit={v => applyOps([{ op: "set_trim", start: edl.trim.start, end: v }])} />
                <span className="text-muted-foreground">sec</span>
              </div>
              {edl.cuts.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1" data-testid="cut-list">
                  {edl.cuts.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] px-2 py-1 rounded-lg bg-zinc-900/60">
                      <button onClick={() => seek(Math.max(0, c.start - 1))} className="font-mono text-foreground hover:text-primary">{fmt(c.start)}–{fmt(c.end)}</button>
                      <span className="text-muted-foreground truncate flex-1">{c.reason || c.source}</span>
                      <span className="text-[9px] uppercase text-zinc-500">{c.source}</span>
                      <button onClick={() => applyOps([{ op: "uncut", start: c.start, end: c.end }])} className="text-zinc-500 hover:text-primary" title="Restore">restore</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transcript */}
            {words.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-card/40 p-4">
                <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-2"><Captions className="w-3.5 h-3.5 text-blue-400" /> Transcript <span className="text-[10px] font-normal text-muted-foreground">click a word to jump · struck-through words are cut</span></p>
                <div className="max-h-48 overflow-y-auto text-xs leading-relaxed">
                  {words.map((w, i) => {
                    const cut = !inKeep((w.start + w.end) / 2, segs);
                    const active = t >= w.start && t < w.end;
                    return (
                      <span key={i} onClick={() => seek(w.start)} className={`cursor-pointer rounded px-0.5 ${active ? "bg-primary/30 text-foreground" : cut ? "line-through text-zinc-600" : "text-zinc-300 hover:bg-zinc-800"}`}>{w.word} </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: AI chat, quick controls, render ── */}
          <div className="space-y-3 min-w-0">
            <div className="rounded-2xl border border-zinc-800 bg-card/40 flex flex-col" style={{ height: 380 }}>
              <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-bold text-foreground">AI edit chat</p>
                <Button size="sm" variant="ghost" onClick={undo} className="h-6 text-[11px] ml-auto gap-1" data-testid="btn-undo"><Undo2 className="w-3 h-3" /> Undo</Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2" data-testid="chat-log">
                {!(project.chatHistory || []).length && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">Tell the AI what to change. Every reply is applied as concrete edits (timestamps, styles) you can see on the timeline.</p>
                    {SUGGESTIONS.map(s => (
                      <button key={s} disabled={!ready || sending} onClick={() => send(s)} className="block w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg border border-zinc-700/60 hover:border-primary/40 text-zinc-300 disabled:opacity-40">
                        <Wand2 className="w-3 h-3 inline mr-1 text-primary" />{s}
                      </button>
                    ))}
                  </div>
                )}
                {(project.chatHistory || []).map((m, i) => (
                  <div key={i} className={`text-xs rounded-xl px-3 py-2 ${m.role === "user" ? "bg-primary/15 text-foreground ml-6" : "bg-zinc-900/70 text-zinc-200 mr-4"}`}>
                    <p className={m.undone ? "line-through opacity-60" : ""}>{m.content}</p>
                    {m.applied && m.applied.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {m.applied.map((a, j) => <li key={j} className={`text-[10px] text-primary/90 flex gap-1 ${m.undone ? "line-through opacity-60" : ""}`}><CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-px" />{a}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
                {sending && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Editing…</div>}
                <div ref={chatEndRef} />
              </div>
              <form className="p-2 border-t border-zinc-800 flex gap-2" onSubmit={e => { e.preventDefault(); send(msg); }}>
                <Input value={msg} onChange={e => setMsg(e.target.value)} disabled={!ready || sending} placeholder={ready ? "e.g. cut 0:12–0:18 and use karaoke captions" : "Available once transcription finishes"} className="h-9 text-xs bg-zinc-950 border-zinc-700" data-testid="input-chat" />
                <Button type="submit" size="sm" disabled={!ready || sending || !msg.trim()} className="h-9 bg-primary text-black hover:bg-primary/90" data-testid="btn-send-chat"><Send className="w-3.5 h-3.5" /></Button>
              </form>
            </div>

            {/* Quick controls */}
            <div className="rounded-2xl border border-zinc-800 bg-card/40 p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5"><Captions className="w-3 h-3 text-blue-400" /> Captions</p>
                  <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => applyOps([{ op: "set_captions", enabled: !edl.captions.enabled }])}>{edl.captions.enabled ? "turn off" : "turn on"}</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CAPTION_PRESETS.map(c => (
                    <button key={c.id} disabled={busyOp} onClick={() => applyOps([{ op: "set_captions", style: c.id, enabled: true }])} data-testid={`caption-${c.id}`}
                      className={`text-left px-2 py-1.5 rounded-lg border text-[11px] ${edl.captions.enabled && edl.captions.style === c.id ? "border-primary/50 bg-primary/10 text-primary" : "border-zinc-700/60 text-zinc-300 hover:border-zinc-500"}`}>
                      <b>{c.label}</b><span className="block text-[9px] text-muted-foreground">{c.hint}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {(["top", "middle", "bottom"] as const).map(p => (
                    <button key={p} onClick={() => applyOps([{ op: "set_captions", position: p }])} className={`flex-1 text-[10px] py-1 rounded border ${edl.captions.position === p ? "border-primary/50 text-primary" : "border-zinc-700/60 text-zinc-400"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5"><Palette className="w-3 h-3 text-purple-400" /> Color grade</p>
                <div className="flex flex-wrap gap-1">
                  {GRADES.map(g => <button key={g} onClick={() => applyOps([{ op: "set_color_grade", grade: g }])} className={`text-[10px] px-2 py-1 rounded-full border ${edl.colorGrade === g ? "border-primary/50 text-primary bg-primary/10" : "border-zinc-700/60 text-zinc-400"}`}>{g}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5"><RectangleHorizontal className="w-3 h-3 text-amber-400" /> Aspect</p>
                  <div className="flex flex-wrap gap-1">
                    {(["original", "9:16", "1:1", "16:9"] as const).map(a => <button key={a} onClick={() => applyOps([{ op: "set_aspect", value: a }])} className={`text-[10px] px-2 py-1 rounded-full border ${edl.aspect === a ? "border-primary/50 text-primary bg-primary/10" : "border-zinc-700/60 text-zinc-400"}`}>{a}</button>)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5"><Gauge className="w-3 h-3 text-green-400" /> Speed</p>
                  <div className="flex flex-wrap gap-1">
                    {[0.75, 1, 1.25, 1.5].map(s => <button key={s} onClick={() => applyOps([{ op: "set_speed", value: s }])} className={`text-[10px] px-2 py-1 rounded-full border ${edl.speed === s ? "border-primary/50 text-primary bg-primary/10" : "border-zinc-700/60 text-zinc-400"}`}>{s}×</button>)}
                  </div>
                </div>
              </div>
            </div>

            {/* Render */}
            <div className="rounded-2xl border border-zinc-800 bg-card/40 p-4 space-y-3" data-testid="render-panel">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground flex items-center gap-2"><Film className="w-3.5 h-3.5 text-primary" /> Render</p>
                {caps && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${caps.watermarked ? "border-amber-500/40 text-amber-400" : "border-green-500/30 text-green-400"}`}>
                    {caps.renderEngine === "ffmpeg" ? "ffmpeg · clean export, no watermark" : caps.renderEngine === "shotstack-stage" ? "Shotstack sandbox" : "no render engine"}
                  </span>
                )}
              </div>
              {caps?.watermarked && (
                <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2 flex gap-2" data-testid="watermark-notice">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Preview render — upgrade for clean export. The free Shotstack sandbox adds a watermark.
                </p>
              )}
              {renderJobActive ? <JobBar job={job} label="Rendering" /> : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={!ready || busy || caps?.renderEngine === "none"} onClick={() => render("preview")} className="flex-1 h-9 text-xs gap-1" data-testid="btn-render-preview"><Clock className="w-3.5 h-3.5" /> Quick preview (540p)</Button>
                  <Button size="sm" disabled={!ready || busy || caps?.renderEngine === "none"} onClick={() => render("final")} className="flex-1 h-9 text-xs bg-primary text-black hover:bg-primary/90 gap-1 font-bold" data-testid="btn-render"><Film className="w-3.5 h-3.5" /> Render 1080p</Button>
                </div>
              )}
              {project.error && project.status !== "failed" && <p className="text-[11px] text-red-400">{project.error}</p>}
              {project.outputUrl && !renderJobActive && (
                <div className="space-y-2" data-testid="render-output">
                  <video src={project.outputUrl} controls playsInline className="w-full rounded-xl border border-zinc-700/60 bg-black max-h-72" />
                  {project.outputWatermarked && <p className="text-[10px] text-amber-400">Preview render — upgrade for clean export (watermarked).</p>}
                  <p className="text-[10px] text-muted-foreground">
                    {project.outputMeta?.duration ? `${fmt(project.outputMeta.duration)} · ` : ""}{project.outputMeta?.width ? `${project.outputMeta.width}×${project.outputMeta.height} · ` : ""}
                    {project.outputMeta?.sizeBytes ? `${(project.outputMeta.sizeBytes / 1048576).toFixed(1)}MB · ` : ""}{project.outputMeta?.quality || ""}
                    {project.outputMeta?.storage === "local" ? " · stored temporarily — download it" : ""}
                  </p>
                  <div className="flex gap-2">
                    <a href={`/api/video-studio/${project.id}/download`} className="flex-1"><Button size="sm" className="w-full h-8 text-xs gap-1 bg-primary text-black hover:bg-primary/90" data-testid="btn-download"><Download className="w-3.5 h-3.5" /> Download</Button></a>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={share}><Share2 className="w-3.5 h-3.5" /> Share</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { navigator.clipboard.writeText(shareUrl); toast({ title: "Link copied" }); }}><Copy className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
