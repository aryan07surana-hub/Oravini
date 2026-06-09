import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Monitor, Video, Circle, Pause, Play, Trash2,
  Download, Link2, Copy, Check, Clock, Eye, Share2,
  Mic, MicOff, Camera, CameraOff, Loader2, StopCircle,
  Search, Code2, Lock, Globe, Mail, BarChart3,
  Pencil, X, Timer, Sparkles, Grid3X3,
  List, MoreVertical, Film, Scissors, RotateCcw,
  Pen, Square as SquareIcon, ArrowUpRight, Highlighter, Eraser,
  Layers, MousePointer2, Type, ScrollText, Wand2,
  Languages, Subtitles, MessageSquare, Smile, Plus,
  ChevronUp, ChevronDown, GripVertical, Play as PlayIcon,
  Trophy, Target, Activity, Zap, RefreshCw, BookOpen,
} from "lucide-react";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";

type Recording = {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  views: number;
  isPublic: boolean;
  createdAt: string;
  videoType: string;
  category?: string;
  tags?: string[];
  allowDownload?: boolean;
};

type Transcript = {
  text: string;
  words: Array<{ word: string; start: number; end: number }>;
  segments: Array<{ start: number; end: number; text: string }>;
  duration: number;
  language?: string;
};

type Annotation = {
  id: string;
  type: "arrow" | "circle" | "rectangle" | "highlight" | "freehand" | "text";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  text?: string;
  points?: Array<{ x: number; y: number }>;
  timestamp: number; // when in recording it appeared
  ttl: number; // ms to display
};

type SequenceClip = {
  recordingId: string;
  title: string;
  duration: number;
  videoUrl: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function fmtFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Annotation Toolbar (during recording) ────────────────────────────────────
type AnnotationTool = "none" | "arrow" | "rectangle" | "circle" | "highlight" | "freehand" | "text";

function AnnotationToolbar({
  tool, onToolChange, color, onColorChange, onClear,
}: {
  tool: AnnotationTool; onToolChange: (t: AnnotationTool) => void;
  color: string; onColorChange: (c: string) => void; onClear: () => void;
}) {
  const tools: { id: AnnotationTool; icon: any; label: string }[] = [
    { id: "none", icon: MousePointer2, label: "Select" },
    { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
    { id: "rectangle", icon: SquareIcon, label: "Box" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "highlight", icon: Highlighter, label: "Highlight" },
    { id: "freehand", icon: Pen, label: "Pen" },
    { id: "text", icon: Type, label: "Text" },
  ];
  const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ffffff"];

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9100] flex items-center gap-1 p-2 rounded-2xl shadow-2xl"
      style={{ background: "rgba(15,15,18,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
      {tools.map((t) => {
        const Icon = t.icon;
        const active = tool === t.id;
        return (
          <button key={t.id} onClick={() => onToolChange(t.id)}
            title={t.label}
            className="p-2 rounded-lg transition-all"
            style={{
              background: active ? `${GOLD}25` : "transparent",
              color: active ? GOLD : "rgba(255,255,255,0.5)",
            }}>
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
      <div className="w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />
      {colors.map((c) => (
        <button key={c} onClick={() => onColorChange(c)}
          className="w-5 h-5 rounded-full transition-all"
          style={{
            background: c,
            border: color === c ? `2px solid ${GOLD}` : "2px solid rgba(255,255,255,0.1)",
            transform: color === c ? "scale(1.15)" : "scale(1)",
          }} />
      ))}
      <div className="w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />
      <button onClick={onClear} title="Clear all"
        className="p-2 rounded-lg transition-all hover:bg-white/5"
        style={{ color: "rgba(255,255,255,0.5)" }}>
        <Eraser className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Cursor Highlight Effect ──────────────────────────────────────────────────
function CursorHighlight({ enabled }: { enabled: boolean }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [clicks, setClicks] = useState<Array<{ id: number; x: number; y: number }>>([]);
  useEffect(() => {
    if (!enabled) return;
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    const click = (e: MouseEvent) => {
      const id = Date.now();
      setClicks((c) => [...c, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setClicks((c) => c.filter((cl) => cl.id !== id)), 600);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("click", click);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("click", click); };
  }, [enabled]);
  if (!enabled) return null;
  return (
    <>
      <div className="fixed pointer-events-none z-[9099] rounded-full transition-transform duration-100"
        style={{
          width: 40, height: 40,
          left: pos.x - 20, top: pos.y - 20,
          background: `radial-gradient(circle, ${GOLD}66 0%, transparent 70%)`,
          mixBlendMode: "screen",
        }} />
      {clicks.map((c) => (
        <div key={c.id} className="fixed pointer-events-none z-[9098] rounded-full"
          style={{
            width: 60, height: 60,
            left: c.x - 30, top: c.y - 30,
            border: `2px solid ${GOLD}`,
            animation: "ripple 0.6s ease-out forwards",
          }} />
      ))}
      <style>{`@keyframes ripple { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }`}</style>
    </>
  );
}

// ── Teleprompter Overlay ─────────────────────────────────────────────────────
function Teleprompter({ script, speed, onClose }: { script: string; speed: number; onClose: () => void }) {
  const [scrollPos, setScrollPos] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setScrollPos((s) => s + speed);
    }, 50);
    return () => clearInterval(interval);
  }, [paused, speed]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = scrollPos;
  }, [scrollPos]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-[9050] rounded-2xl overflow-hidden"
      style={{ background: "rgba(0,0,0,0.85)", border: `2px solid ${GOLD}55`, backdropFilter: "blur(8px)" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: GOLD }}>
          <ScrollText className="w-3.5 h-3.5" /> Teleprompter
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPaused(!paused)} className="p-1 rounded" style={{ color: "rgba(255,255,255,0.6)" }}>
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setScrollPos(0)} className="p-1 rounded" style={{ color: "rgba(255,255,255,0.6)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 rounded" style={{ color: "rgba(255,255,255,0.6)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div ref={ref} className="px-6 py-4 overflow-hidden h-[180px] text-2xl leading-relaxed font-medium text-white">
        <div className="whitespace-pre-wrap">{script || "(Add a script in settings before recording)"}</div>
      </div>
    </div>
  );
}

// ── Recording Mode Selector ──────────────────────────────────────────────────
type RecordingMode = "screen" | "screen_cam" | "cam_only";

function ModeSelector({ mode, onMode }: { mode: RecordingMode; onMode: (m: RecordingMode) => void }) {
  const modes: { id: RecordingMode; icon: any; label: string; desc: string }[] = [
    { id: "screen", icon: Monitor, label: "Screen Only", desc: "Record your screen" },
    { id: "screen_cam", icon: Film, label: "Screen + Camera", desc: "Screen with face bubble" },
    { id: "cam_only", icon: Camera, label: "Camera Only", desc: "Record yourself" },
  ];
  return (
    <div className="flex items-center gap-3">
      {modes.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button key={m.id} onClick={() => onMode(m.id)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all flex-1"
            style={{
              background: active ? `${GOLD}12` : "rgba(255,255,255,0.02)",
              border: `1.5px solid ${active ? `${GOLD}66` : "rgba(255,255,255,0.08)"}`,
            }}>
            <Icon className="w-6 h-6" style={{ color: active ? GOLD : "rgba(255,255,255,0.4)" }} />
            <span className="text-xs font-semibold" style={{ color: active ? GOLD : "rgba(255,255,255,0.6)" }}>{m.label}</span>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{m.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Countdown Overlay ────────────────────────────────────────────────────────
function CountdownOverlay({ count, onDone }: { count: number; onDone: () => void }) {
  const [n, setN] = useState(count);
  useEffect(() => {
    if (n <= 0) { onDone(); return; }
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="text-center">
        <div className="text-8xl font-black animate-pulse" style={{ color: GOLD }}>{n}</div>
        <div className="text-sm mt-4" style={{ color: "rgba(255,255,255,0.5)" }}>Recording starts in...</div>
      </div>
    </div>
  );
}

// ── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ recording, onClose }: { recording: Recording; onClose: () => void }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const shareUrl = `${window.location.origin}/watch-video/${recording.id}`;
  const embedCode = `<iframe src="${window.location.origin}/embed/${recording.id}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied!" });
  };

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "#0c0c10", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5" style={{ color: GOLD }} /> Share Recording
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Share Link</label>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="flex-1 px-3 py-2 rounded-lg text-sm bg-transparent text-white/80" style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
              <Button onClick={() => copy(shareUrl, "link")} size="sm" className="rounded-lg px-3" style={{ background: `${GOLD}20`, color: GOLD }}>
                {copiedField === "link" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Code2 className="w-3 h-3 inline mr-1" />Embed Code
            </label>
            <div className="flex gap-2">
              <input readOnly value={embedCode} className="flex-1 px-3 py-2 rounded-lg text-xs bg-transparent text-white/60 font-mono" style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
              <Button onClick={() => copy(embedCode, "embed")} size="sm" className="rounded-lg px-3" style={{ background: `${GOLD}20`, color: GOLD }}>
                {copiedField === "embed" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Share to:</span>
            {["Twitter", "LinkedIn", "WhatsApp"].map((platform) => (
              <button key={platform} onClick={() => {
                const urls: Record<string, string> = {
                  Twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(recording.title)}`,
                  LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                  WhatsApp: `https://wa.me/?text=${encodeURIComponent(`${recording.title} - ${shareUrl}`)}`,
                };
                window.open(urls[platform], "_blank");
              }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                {platform}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ recording, onClose, onSave }: { recording: Recording; onClose: () => void; onSave: (data: any) => void }) {
  const [title, setTitle] = useState(recording.title);
  const [description, setDescription] = useState(recording.description || "");
  const [isPublic, setIsPublic] = useState(recording.isPublic);
  const [allowDownload, setAllowDownload] = useState(recording.allowDownload ?? true);

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "#0c0c10", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Pencil className="w-5 h-5" style={{ color: GOLD }} /> Edit Recording
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-transparent border-white/10 text-white" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-transparent border-white/10 text-white resize-none" placeholder="Add a description..." />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>Public link</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>Allow download</span>
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>Cancel</Button>
            <Button onClick={() => onSave({ title, description, isPublic, allowDownload })} className="flex-1 rounded-xl" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── AI Studio Modal — Captions, Summary, Coach, Translate, Repurpose ─────────
function AIStudioModal({ recording, onClose }: { recording: Recording; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"captions" | "summary" | "coach" | "translate" | "repurpose" | "trim">("summary");
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiCoach, setAiCoach] = useState<any>(null);
  const [translation, setTranslation] = useState<{ text: string; lang: string } | null>(null);
  const [targetLang, setTargetLang] = useState("Spanish");
  const [silences, setSilences] = useState<any[]>([]);
  const [repurposed, setRepurposed] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  // Auto-transcribe on mount
  useEffect(() => {
    transcribeNow();
  }, []);

  const transcribeNow = async () => {
    setTranscribing(true);
    try {
      const res = await apiRequest("POST", `/api/screen-recordings/${recording.id}/transcribe`);
      const data = await res.json();
      setTranscript(data.transcript);
      toast({ title: "Transcription complete!" });
    } catch (e: any) {
      toast({ title: "Transcription failed", description: e.message, variant: "destructive" });
    } finally {
      setTranscribing(false);
    }
  };

  const generateSummary = async () => {
    if (!transcript) return;
    setBusy(true);
    try {
      const res = await apiRequest("POST", `/api/screen-recordings/${recording.id}/ai-summary`, { transcript });
      const data = await res.json();
      setAiSummary(data);
    } catch (e: any) {
      toast({ title: "Summary failed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const applySummary = async () => {
    if (!aiSummary) return;
    await apiRequest("PATCH", `/api/video-events/${recording.id}`, {
      title: aiSummary.title,
      description: aiSummary.summary,
      tags: aiSummary.tags,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/screen-recordings"] });
    toast({ title: "Applied to recording!" });
  };

  const runCoach = async () => {
    if (!transcript) return;
    setBusy(true);
    try {
      const res = await apiRequest("POST", `/api/screen-recordings/${recording.id}/coach`, { transcript });
      setAiCoach(await res.json());
    } catch (e: any) {
      toast({ title: "Coach analysis failed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const translate = async () => {
    if (!transcript) return;
    setBusy(true);
    try {
      const res = await apiRequest("POST", `/api/screen-recordings/${recording.id}/translate`, { transcript, targetLanguage: targetLang });
      const data = await res.json();
      setTranslation({ text: data.translatedText, lang: data.language });
    } catch (e: any) {
      toast({ title: "Translation failed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const detectSilences = async () => {
    if (!transcript) return;
    setBusy(true);
    try {
      const res = await apiRequest("POST", `/api/screen-recordings/${recording.id}/detect-silences`, { words: transcript.words, threshold: 1.0 });
      const data = await res.json();
      setSilences(data.silences);
    } catch (e: any) {
      toast({ title: "Detection failed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const repurpose = async () => {
    if (!transcript) return;
    setBusy(true);
    try {
      const res = await apiRequest("POST", `/api/screen-recordings/${recording.id}/repurpose`, { transcript, count: 5 });
      const data = await res.json();
      setRepurposed(data.clips || []);
    } catch (e: any) {
      toast({ title: "Repurpose failed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const tabs = [
    { id: "summary" as const, icon: Wand2, label: "AI Summary" },
    { id: "captions" as const, icon: Subtitles, label: "Captions" },
    { id: "coach" as const, icon: Trophy, label: "AI Coach" },
    { id: "trim" as const, icon: Scissors, label: "Smart Trim" },
    { id: "translate" as const, icon: Languages, label: "Translate" },
    { id: "repurpose" as const, icon: Sparkles, label: "Repurpose" },
  ];

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col" style={{ background: "#0c0c10", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: GOLD }} /> AI Studio
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{recording.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: tab === t.id ? `${GOLD}15` : "transparent",
                  color: tab === t.id ? GOLD : "rgba(255,255,255,0.5)",
                }}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading transcript */}
          {transcribing && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: GOLD }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Transcribing audio with Whisper...</p>
              <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>This usually takes 10-30 seconds</p>
            </div>
          )}

          {!transcribing && !transcript && (
            <div className="text-center py-12">
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>No transcript yet</p>
              <Button onClick={transcribeNow} className="rounded-xl" style={{ background: `${GOLD}15`, color: GOLD }}>
                <Subtitles className="w-4 h-4 mr-2" /> Transcribe Now
              </Button>
            </div>
          )}

          {transcript && tab === "summary" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">AI-Generated Summary & Chapters</h4>
                <Button onClick={generateSummary} disabled={busy} size="sm" className="rounded-lg" style={{ background: `${GOLD}15`, color: GOLD }}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
                  Generate
                </Button>
              </div>
              {aiSummary ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl" style={{ background: "rgba(212,180,97,0.05)", border: `1px solid ${GOLD}22` }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: GOLD }}>Suggested Title</div>
                    <div className="text-base font-semibold text-white">{aiSummary.title}</div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Summary</div>
                    <div className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{aiSummary.summary}</div>
                  </div>
                  {aiSummary.chapters?.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>Chapters</div>
                      <div className="space-y-2">
                        {aiSummary.chapters.map((ch: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 py-1">
                            <span className="text-xs font-mono shrink-0 w-12 pt-0.5" style={{ color: GOLD }}>{fmtDuration(ch.startSeconds)}</span>
                            <div>
                              <div className="text-sm font-semibold text-white">{ch.title}</div>
                              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{ch.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiSummary.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {aiSummary.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                  <Button onClick={applySummary} className="w-full rounded-xl" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>
                    <Check className="w-4 h-4 mr-2" /> Apply to Recording
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Click Generate to create AI summary, chapters, and tags from the transcript.</div>
              )}
            </div>
          )}

          {transcript && tab === "captions" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-semibold text-white flex-1">Auto-Generated Captions</h4>
                <Button onClick={() => {
                  // Build SRT
                  const srt = transcript.segments.map((seg, i) => {
                    const fmt = (s: number) => {
                      const h = Math.floor(s / 3600).toString().padStart(2, "0");
                      const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
                      const sec = Math.floor(s % 60).toString().padStart(2, "0");
                      const ms = Math.floor((s % 1) * 1000).toString().padStart(3, "0");
                      return `${h}:${m}:${sec},${ms}`;
                    };
                    return `${i + 1}\n${fmt(seg.start)} --> ${fmt(seg.end)}\n${seg.text.trim()}\n`;
                  }).join("\n");
                  const blob = new Blob([srt], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${recording.title}.srt`;
                  a.click();
                }} size="sm" className="rounded-lg" style={{ background: `${GOLD}15`, color: GOLD }}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download .srt
                </Button>
              </div>
              <div className="rounded-xl p-4 max-h-[400px] overflow-y-auto space-y-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {transcript.segments.map((seg, i) => (
                  <div key={i} className="flex gap-3 py-1.5 hover:bg-white/[0.03] rounded px-2 -mx-2 transition-all">
                    <span className="text-xs font-mono shrink-0 w-12 pt-0.5" style={{ color: GOLD }}>{fmtDuration(seg.start)}</span>
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{seg.text.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transcript && tab === "coach" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">AI Presentation Coach</h4>
                <Button onClick={runCoach} disabled={busy} size="sm" className="rounded-lg" style={{ background: `${GOLD}15`, color: GOLD }}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5 mr-1.5" />}
                  Analyze
                </Button>
              </div>
              {aiCoach ? (
                <div className="space-y-3">
                  {/* Score */}
                  <div className="p-4 rounded-xl text-center" style={{ background: `linear-gradient(135deg, ${GOLD}10, ${GOLD}03)`, border: `1px solid ${GOLD}33` }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: GOLD }}>Overall Score</div>
                    <div className="text-4xl font-black" style={{ color: GOLD }}>{aiCoach.overallScore}/100</div>
                  </div>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <Activity className="w-4 h-4 mb-1" style={{ color: GOLD }} />
                      <div className="text-lg font-bold text-white">{aiCoach.wpm}</div>
                      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Words/min</div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <Zap className="w-4 h-4 mb-1" style={{ color: "#f59e0b" }} />
                      <div className="text-lg font-bold text-white">{aiCoach.totalFillers}</div>
                      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Filler words</div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <Pause className="w-4 h-4 mb-1" style={{ color: "#ef4444" }} />
                      <div className="text-lg font-bold text-white">{aiCoach.longPauses}</div>
                      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Long pauses</div>
                    </div>
                  </div>
                  {/* Filler breakdown */}
                  {aiCoach.fillerWords && Object.keys(aiCoach.fillerWords).length > 0 && (
                    <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Filler Word Breakdown</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(aiCoach.fillerWords).map(([word, count]) => (
                          <span key={word} className="px-2 py-1 rounded text-[10px]" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>"{word}" {count as number}x</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Strengths */}
                  {aiCoach.strengths?.length > 0 && (
                    <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <div className="text-[10px] uppercase tracking-wider mb-2 text-green-400">✓ Strengths</div>
                      <ul className="space-y-1 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                        {aiCoach.strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {/* Improvements */}
                  {aiCoach.improvements?.length > 0 && (
                    <div className="p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <div className="text-[10px] uppercase tracking-wider mb-2 text-yellow-400">→ Improvements</div>
                      <ul className="space-y-1 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                        {aiCoach.improvements.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {/* Top tip */}
                  {aiCoach.tip && (
                    <div className="p-3 rounded-xl" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22` }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: GOLD }}>💡 Top Tip</div>
                      <div className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{aiCoach.tip}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Click Analyze to get coaching feedback on your delivery.</div>
              )}
            </div>
          )}

          {transcript && tab === "trim" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Smart Trim — Detected Silences</h4>
                <Button onClick={detectSilences} disabled={busy} size="sm" className="rounded-lg" style={{ background: `${GOLD}15`, color: GOLD }}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5 mr-1.5" />}
                  Detect Silences
                </Button>
              </div>
              {silences.length > 0 ? (
                <>
                  <div className="p-4 rounded-xl" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22` }}>
                    <div className="text-sm font-semibold text-white mb-1">Found {silences.length} silences</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Total: {fmtDuration(silences.reduce((sum, s) => sum + s.duration, 0))} could be trimmed
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {silences.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <Pause className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                        <span className="text-xs font-mono" style={{ color: GOLD }}>{fmtDuration(s.start)}</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>→</span>
                        <span className="text-xs font-mono" style={{ color: GOLD }}>{fmtDuration(s.end)}</span>
                        <span className="text-xs ml-auto" style={{ color: "rgba(255,255,255,0.5)" }}>{s.duration.toFixed(1)}s gap</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Click Detect to find silences over 1s in your recording.</div>
              )}
            </div>
          )}

          {transcript && tab === "translate" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white flex-1">Translate Captions</h4>
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-transparent text-white/70"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                  {["Spanish", "French", "German", "Portuguese", "Italian", "Hindi", "Japanese", "Korean", "Chinese", "Arabic", "Russian", "Dutch", "Polish", "Turkish", "Vietnamese"].map((l) => (
                    <option key={l} value={l} style={{ background: "#111" }}>{l}</option>
                  ))}
                </select>
                <Button onClick={translate} disabled={busy} size="sm" className="rounded-lg" style={{ background: `${GOLD}15`, color: GOLD }}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Languages className="w-3.5 h-3.5 mr-1.5" />}
                  Translate
                </Button>
              </div>
              {translation && (
                <div className="rounded-xl p-4 max-h-[400px] overflow-y-auto" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: GOLD }}>{translation.lang}</div>
                  <div className="text-sm whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.85)" }}>{translation.text}</div>
                </div>
              )}
            </div>
          )}

          {transcript && tab === "repurpose" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Repurpose to Short Clips</h4>
                <Button onClick={repurpose} disabled={busy} size="sm" className="rounded-lg" style={{ background: `${GOLD}15`, color: GOLD }}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  Find Viral Moments
                </Button>
              </div>
              {repurposed.length > 0 ? (
                <div className="space-y-2">
                  {repurposed.map((clip: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: `${GOLD}15`, color: GOLD }}>{i + 1}</div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{clip.title}</div>
                          <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{clip.reason}</div>
                          <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                            <span className="font-mono">{fmtDuration(clip.startSeconds)} → {fmtDuration(clip.endSeconds)}</span>
                            <span>•</span>
                            <span>{(clip.endSeconds - clip.startSeconds).toFixed(0)}s</span>
                          </div>
                          {clip.platforms?.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {clip.platforms.map((p: string) => (
                                <span key={p} className="px-1.5 py-0.5 rounded text-[10px] capitalize" style={{ background: `${GOLD}10`, color: GOLD }}>{p}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Click Find Viral Moments to extract 5 short clips for social media.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sequence Builder Modal ───────────────────────────────────────────────────
function SequenceBuilderModal({ recordings, onClose }: { recordings: Recording[]; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sequenceName, setSequenceName] = useState("My Sequence");
  const [selected, setSelected] = useState<Recording[]>([]);
  const [transition, setTransition] = useState<"fade" | "cut" | "slide">("fade");
  const playerRef = useRef<HTMLVideoElement>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const { data: savedSequences = [] } = useQuery<any[]>({
    queryKey: ["/api/screen-recordings/sequences"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/screen-recordings/sequences");
      return res.json();
    },
  });

  const createSeq = useMutation({
    mutationFn: async (data: { name: string; transition: string; clipIds: string[] }) => {
      const res = await apiRequest("POST", "/api/screen-recordings/sequences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/screen-recordings/sequences"] });
      toast({ title: "Sequence saved!", description: `${selected.length} clips • ${sequenceName}` });
      setSelected([]);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const deleteSeq = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/screen-recordings/sequences/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/screen-recordings/sequences"] }),
  });

  const saveSequence = () => {
    if (selected.length === 0) return;
    createSeq.mutate({
      name: sequenceName,
      transition,
      clipIds: selected.map((r) => r.id),
    });
  };

  const deleteSequence = (id: string) => deleteSeq.mutate(id);

  const addClip = (rec: Recording) => {
    if (selected.find((s) => s.id === rec.id)) return;
    setSelected((s) => [...s, rec]);
  };

  const removeClip = (id: string) => setSelected((s) => s.filter((c) => c.id !== id));

  const moveClip = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= selected.length) return;
    const newList = [...selected];
    [newList[idx], newList[newIdx]] = [newList[newIdx], newList[idx]];
    setSelected(newList);
  };

  // Preview: chain play
  const startPreview = () => {
    if (selected.length === 0) return;
    setPreviewIdx(0);
    setPlaying(true);
  };

  useEffect(() => {
    if (!playing || !playerRef.current) return;
    const v = playerRef.current;
    v.src = selected[previewIdx]?.videoUrl || "";
    v.play().catch(() => { });
    const onEnd = () => {
      if (previewIdx < selected.length - 1) {
        setPreviewIdx(previewIdx + 1);
      } else {
        setPlaying(false);
      }
    };
    v.addEventListener("ended", onEnd);
    return () => v.removeEventListener("ended", onEnd);
  }, [playing, previewIdx, selected]);

  const totalDuration = selected.reduce((sum, r) => sum + (r.duration || 0), 0);

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl flex flex-col" style={{ background: "#0c0c10", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5" style={{ color: GOLD }} /> Sequence Builder
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Stitch clips into a multi-part reel</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-0">
          {/* Left: clip library */}
          <div className="overflow-y-auto p-5 border-r" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: GOLD }}>Available Recordings</h4>
            <div className="space-y-2">
              {recordings.map((rec) => {
                const added = selected.find((s) => s.id === rec.id);
                return (
                  <button key={rec.id} onClick={() => addClip(rec)} disabled={!!added}
                    className="w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left disabled:opacity-40"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-16 aspect-video bg-black rounded overflow-hidden flex-shrink-0">
                      <video src={rec.videoUrl} className="w-full h-full object-cover" preload="metadata"
                        onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{rec.title}</div>
                      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {rec.duration ? fmtDuration(rec.duration) : "—"}
                      </div>
                    </div>
                    {added ? <Check className="w-4 h-4" style={{ color: "#22c55e" }} /> : <Plus className="w-4 h-4" style={{ color: GOLD }} />}
                  </button>
                );
              })}
            </div>

            {/* Saved sequences */}
            {savedSequences.length > 0 && (
              <>
                <h4 className="text-xs font-semibold uppercase tracking-wider mt-6 mb-3" style={{ color: GOLD }}>Saved Sequences</h4>
                <div className="space-y-2">
                  {savedSequences.map((seq) => (
                    <div key={seq.id} className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ background: "rgba(212,180,97,0.03)", border: `1px solid ${GOLD}22` }}>
                      <Layers className="w-4 h-4" style={{ color: GOLD }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{seq.name}</div>
                        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{seq.clipIds?.length || 0} clips</div>
                      </div>
                      <button onClick={() => deleteSequence(seq.id)} className="p-1 rounded" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: timeline + preview */}
          <div className="overflow-y-auto p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Input value={sequenceName} onChange={(e) => setSequenceName(e.target.value)}
                placeholder="Sequence name..." className="bg-transparent border-white/10 text-white text-sm" />
              <select value={transition} onChange={(e) => setTransition(e.target.value as any)}
                className="px-3 py-2 rounded-lg text-xs bg-transparent text-white/70" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <option value="fade" style={{ background: "#111" }}>Fade</option>
                <option value="cut" style={{ background: "#111" }}>Cut</option>
                <option value="slide" style={{ background: "#111" }}>Slide</option>
              </select>
            </div>

            {/* Preview */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden mb-3 flex items-center justify-center">
              {selected.length > 0 ? (
                <video ref={playerRef} className="w-full h-full" controls />
              ) : (
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Add clips to preview</div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Button onClick={startPreview} disabled={selected.length === 0} size="sm" className="rounded-lg flex-1"
                style={{ background: `${GOLD}15`, color: GOLD }}>
                <PlayIcon className="w-3.5 h-3.5 mr-1.5" /> Play Sequence
              </Button>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {selected.length} clips • {fmtDuration(totalDuration)}
              </span>
            </div>

            {/* Timeline */}
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: GOLD }}>Timeline</h4>
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {selected.length === 0 ? (
                <div className="text-center py-8 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.3)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                  Click clips on the left to add them here
                </div>
              ) : (
                selected.map((clip, idx) => (
                  <div key={clip.id} className="flex items-center gap-2 p-2 rounded-lg group"
                    style={{ background: "rgba(212,180,97,0.04)", border: `1px solid ${GOLD}33` }}>
                    <GripVertical className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
                    <span className="text-[10px] font-mono" style={{ color: GOLD }}>{idx + 1}</span>
                    <span className="text-xs flex-1 truncate text-white/80">{clip.title}</span>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{clip.duration ? fmtDuration(clip.duration) : "—"}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveClip(idx, -1)} className="p-1 rounded" style={{ color: "rgba(255,255,255,0.4)" }}>
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => moveClip(idx, 1)} className="p-1 rounded" style={{ color: "rgba(255,255,255,0.4)" }}>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button onClick={() => removeClip(clip.id)} className="p-1 rounded" style={{ color: "rgba(239,68,68,0.6)" }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button onClick={saveSequence} disabled={selected.length === 0} className="mt-3 rounded-xl"
              style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>
              <Check className="w-4 h-4 mr-2" /> Save Sequence
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comments / Reactions Panel ───────────────────────────────────────────────
function CommentsPanel({ recordingId, videoUrl, onClose }: { recordingId: string; videoUrl: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: [`/api/screen-recordings/${recordingId}/comments`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/screen-recordings/${recordingId}/comments`);
      return res.json();
    },
  });

  const addComment = useMutation({
    mutationFn: async (data: { text?: string; emoji?: string; timestamp: number }) => {
      const res = await apiRequest("POST", `/api/screen-recordings/${recordingId}/comments`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/screen-recordings/${recordingId}/comments`] });
      setText("");
      setEmoji(null);
    },
  });

  const submitComment = () => {
    if (!text.trim() && !emoji) return;
    addComment.mutate({
      text: text.trim() || undefined,
      emoji: emoji || undefined,
      timestamp: Math.floor(currentTime),
    });
  };

  const reactions = ["❤️", "🔥", "😂", "👍", "👏", "🤔", "💯", "🎯"];

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col" style={{ background: "#0c0c10", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5" style={{ color: GOLD }} /> Reactions & Comments
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 grid grid-cols-2 overflow-hidden">
          {/* Left: video */}
          <div className="p-5 border-r overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <video ref={videoRef} src={videoUrl}
              onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
              controls className="w-full rounded-xl bg-black" />
            <div className="text-xs mt-2 font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
              At {fmtDuration(currentTime)}
            </div>

            {/* Quick reactions */}
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Quick React</div>
              <div className="flex flex-wrap gap-1.5">
                {reactions.map((r) => (
                  <button key={r}
                    onClick={() => addComment.mutate({ emoji: r, timestamp: Math.floor(currentTime) })}
                    className="text-2xl p-2 rounded-lg transition-all hover:scale-110"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Add text comment */}
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Add Comment</div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
                placeholder="Leave a timestamped comment..."
                className="bg-transparent border-white/10 text-white resize-none" />
              <Button onClick={submitComment} disabled={!text.trim() && !emoji} size="sm" className="mt-2 rounded-lg"
                style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>
                Post at {fmtDuration(currentTime)}
              </Button>
            </div>
          </div>

          {/* Right: timeline of comments */}
          <div className="p-5 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: GOLD }}>{comments.length} reactions</div>
            {comments.length === 0 ? (
              <div className="text-center py-12 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>No reactions yet. Be the first!</div>
            ) : (
              <div className="space-y-2">
                {comments.map((c) => (
                  <button key={c.id} onClick={() => { if (videoRef.current) videoRef.current.currentTime = c.timestamp; }}
                    className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all hover:bg-white/[0.03]"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${GOLD}20`, color: GOLD }}>{c.userName[0]?.toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{c.userName}</span>
                        <span className="text-[10px] font-mono" style={{ color: GOLD }}>{fmtDuration(c.timestamp)}</span>
                      </div>
                      {c.emoji && <div className="text-2xl mt-1">{c.emoji}</div>}
                      {c.text && <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{c.text}</div>}
                      <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{fmtTimeAgo(c.createdAt)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Draggable Camera Bubble (live preview during recording) ──────────────────
function DraggableCamBubble({
  videoRef, position, onPositionChange, size, shape, dragging, setDragging,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  position: { x: number; y: number };
  onPositionChange: (p: { x: number; y: number }) => void;
  size: "sm" | "md" | "lg";
  shape: "circle" | "square";
  dragging: boolean;
  setDragging: (d: boolean) => void;
}) {
  const sizeMap = { sm: 120, md: 168, lg: 220 };
  const px = sizeMap[size];
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    dragOffsetRef.current = {
      dx: e.clientX - (rect.left + rect.width / 2),
      dy: e.clientY - (rect.top + rect.height / 2),
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const cx = e.clientX - dragOffsetRef.current.dx;
      const cy = e.clientY - dragOffsetRef.current.dy;
      onPositionChange({
        x: Math.max(0.05, Math.min(0.95, cx / window.innerWidth)),
        y: Math.max(0.05, Math.min(0.95, cy / window.innerHeight)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, onPositionChange, setDragging]);

  // Position is in normalized coordinates of the OUTPUT FRAME (which roughly equals the screen).
  // For the on-screen preview we use the same fractions of the window.
  const left = position.x * window.innerWidth - px / 2;
  const top = position.y * window.innerHeight - px / 2;

  return (
    <div
      onMouseDown={handleMouseDown}
      className="fixed z-50 overflow-hidden shadow-2xl select-none"
      style={{
        left, top, width: px, height: px,
        borderRadius: shape === "circle" ? "50%" : "18%",
        border: `3px solid ${GOLD}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 ${dragging ? "4px" : "0px"} ${GOLD}55`,
        cursor: dragging ? "grabbing" : "grab",
        transition: dragging ? "none" : "box-shadow 0.2s",
      }}>
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover pointer-events-none" />
      {/* Drag handle hint */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-semibold pointer-events-none"
        style={{ background: "rgba(0,0,0,0.6)", color: "#fff", opacity: dragging ? 1 : 0.7 }}>
        {dragging ? "DRAGGING" : "DRAG ME"}
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function ScreenRecorder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<"record" | "library" | "sequences">("record");

  // Recording config
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("screen_cam");
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [countdownEnabled, setCountdownEnabled] = useState(true);
  const [cursorHighlight, setCursorHighlight] = useState(true);
  const [annotationsEnabled, setAnnotationsEnabled] = useState(true);
  const [teleprompterEnabled, setTeleprompterEnabled] = useState(false);
  const [teleprompterScript, setTeleprompterScript] = useState("");
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(0.5);
  const [showTeleprompterEditor, setShowTeleprompterEditor] = useState(false);
  const [quality, setQuality] = useState<"720p" | "1080p" | "1440p" | "source">("1080p");
  const [frameRate, setFrameRate] = useState<30 | 60>(30);
  // Camera bubble customization (position is fraction 0-1 of output frame; size is fraction of output height; shape: circle or square)
  const [camPosition, setCamPosition] = useState<{ x: number; y: number }>({ x: 0.97, y: 0.97 }); // bottom-right by default
  const [camSize, setCamSize] = useState<"sm" | "md" | "lg">("md"); // 0.16 / 0.22 / 0.3 of height
  const [camShape, setCamShape] = useState<"circle" | "square">("circle");
  const [draggingCam, setDraggingCam] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTitle, setRecordingTitle] = useState("");
  const [recordingDescription, setRecordingDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Annotations
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>("none");
  const [annotationColor, setAnnotationColor] = useState("#ef4444");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawingNow, setDrawingNow] = useState<Annotation | null>(null);

  // Library
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "views" | "title">("newest");
  const [shareModal, setShareModal] = useState<Recording | null>(null);
  const [editModal, setEditModal] = useState<Recording | null>(null);
  const [aiStudioModal, setAIStudioModal] = useState<Recording | null>(null);
  const [commentsModal, setCommentsModal] = useState<Recording | null>(null);
  const [sequenceBuilderOpen, setSequenceBuilderOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ rec: Recording; x: number; y: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const camPreviewRef = useRef<HTMLVideoElement>(null);
  const liveCamRef = useRef<HTMLVideoElement>(null);
  const annotCanvasRef = useRef<HTMLCanvasElement>(null);

  // Composition canvas (renders screen + cam + annotations into one stream)
  const compositionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenVideoElRef = useRef<HTMLVideoElement | null>(null);
  const camVideoElRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const cursorClicksRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  // Live refs for state used inside animation loop
  const annotationsRef = useRef<Annotation[]>([]);
  const drawingNowRef = useRef<Annotation | null>(null);
  const cursorHighlightRef = useRef(true);
  const recordingModeRef = useRef<RecordingMode>("screen_cam");
  const camEnabledRef = useRef(true);
  const camPositionRef = useRef<{ x: number; y: number }>({ x: 0.97, y: 0.97 });
  const camSizeRef = useRef<"sm" | "md" | "lg">("md");
  const camShapeRef = useRef<"circle" | "square">("circle");

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: recordings = [], isLoading } = useQuery<Recording[]>({
    queryKey: ["/api/screen-recordings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/screen-recordings");
      return res.json();
    },
  });

  // Keep refs in sync with state for use inside animation loop
  useEffect(() => { cursorHighlightRef.current = cursorHighlight; }, [cursorHighlight]);
  useEffect(() => { recordingModeRef.current = recordingMode; }, [recordingMode]);
  useEffect(() => { camEnabledRef.current = camEnabled; }, [camEnabled]);
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);
  useEffect(() => { drawingNowRef.current = drawingNow; }, [drawingNow]);
  useEffect(() => { camPositionRef.current = camPosition; }, [camPosition]);
  useEffect(() => { camSizeRef.current = camSize; }, [camSize]);
  useEffect(() => { camShapeRef.current = camShape; }, [camShape]);

  const filteredRecordings = useMemo(() => {
    let list = [...recordings];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "newest": list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "oldest": list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "views": list.sort((a, b) => b.views - a.views); break;
      case "title": list.sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    return list;
  }, [recordings, searchQuery, sortBy]);

  const stats = useMemo(() => ({
    total: recordings.length,
    totalViews: recordings.reduce((sum, r) => sum + r.views, 0),
    totalDuration: recordings.reduce((sum, r) => sum + (r.duration || 0), 0),
  }), [recordings]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async ({ blob, title, description }: { blob: Blob; title: string; description: string }) => {
      const formData = new FormData();
      formData.append("video", blob, `screen-recording-${Date.now()}.webm`);
      formData.append("title", title || `Recording ${new Date().toLocaleString()}`);
      if (description) formData.append("description", description);
      const res = await fetch("/api/screen-recordings/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/screen-recordings"] });
      setPreviewUrl(null);
      setRecordedBlob(null);
      setRecordingTitle("");
      setRecordingDescription("");
      setActiveTab("library");
      toast({ title: "Recording saved!", description: "Your recording is ready to share." });
    },
    onError: () => { toast({ title: "Upload failed", variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/screen-recordings/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/screen-recordings"] }); toast({ title: "Deleted" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [k: string]: any }) => {
      const res = await apiRequest("PATCH", `/api/video-events/${id}`, data);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/screen-recordings"] }); toast({ title: "Updated!" }); },
  });

  const togglePublicMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const res = await apiRequest("PATCH", `/api/video-events/${id}`, { isPublic });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/screen-recordings"] }); },
  });

  // ── Recording Logic ───────────────────────────────────────────────────────
  // Track global mouse position for cursor highlight composition (smoothed)
  useEffect(() => {
    const onMove = (e: MouseEvent) => { cursorPosRef.current = { x: e.clientX, y: e.clientY }; };
    const onClick = (e: MouseEvent) => {
      cursorClicksRef.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
      cursorClicksRef.current = cursorClicksRef.current.filter((c) => Date.now() - c.t < 800);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("click", onClick); };
  }, []);

  const actuallyStartRecording = useCallback(async () => {
    try {
      let screenStream: MediaStream | null = null;
      let camStream: MediaStream | null = null;
      let audioStream: MediaStream | null = null;

      // Quality preset → target dimensions and bitrate
      const QUALITY_PRESETS: Record<string, { w: number; h: number; bitrate: number }> = {
        "720p": { w: 1280, h: 720, bitrate: 4_000_000 },
        "1080p": { w: 1920, h: 1080, bitrate: 8_000_000 },
        "1440p": { w: 2560, h: 1440, bitrate: 14_000_000 },
        "source": { w: 0, h: 0, bitrate: 10_000_000 },
      };
      const preset = QUALITY_PRESETS[quality];

      if (recordingMode !== "cam_only") {
        // Request the highest quality the screen can give. Browser will negotiate.
        const screenConstraints: any = {
          video: {
            frameRate: { ideal: frameRate, max: frameRate },
            width: quality === "source" ? undefined : { ideal: preset.w },
            height: quality === "source" ? undefined : { ideal: preset.h },
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
          },
        };
        screenStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);
        screenStreamRef.current = screenStream;
      }

      if (recordingMode === "screen_cam" || recordingMode === "cam_only") {
        try {
          // High-quality camera. cam_only goes full output res; bubble mode gets HD source so the bubble looks crisp.
          const camConstraints: any = {
            video: {
              width: { ideal: recordingMode === "cam_only" ? preset.w || 1920 : 1280 },
              height: { ideal: recordingMode === "cam_only" ? preset.h || 1080 : 720 },
              frameRate: { ideal: frameRate, max: frameRate },
              facingMode: "user",
            },
            audio: false,
          };
          camStream = await navigator.mediaDevices.getUserMedia(camConstraints);
          camStreamRef.current = camStream;
          if (liveCamRef.current) liveCamRef.current.srcObject = camStream;
        } catch { /* */ }
      }

      if (micEnabled) {
        try {
          // High quality voice: 48kHz Opus, processing on
          audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 2,
            },
          });
          audioStreamRef.current = audioStream;
        } catch { /* */ }
      }

      // ── COMPOSITION CANVAS PIPELINE ──
      // Determine output dimensions
      let outputWidth: number, outputHeight: number;
      if (recordingMode === "cam_only" && camStream) {
        const settings = camStream.getVideoTracks()[0].getSettings();
        outputWidth = settings.width || preset.w || 1920;
        outputHeight = settings.height || preset.h || 1080;
      } else if (screenStream) {
        const settings = screenStream.getVideoTracks()[0].getSettings();
        const sw = settings.width || 1920;
        const sh = settings.height || 1080;
        if (quality === "source") {
          outputWidth = sw;
          outputHeight = sh;
        } else {
          // Match preset but preserve aspect ratio
          const screenAspect = sw / sh;
          if (screenAspect >= preset.w / preset.h) {
            outputWidth = preset.w;
            outputHeight = Math.round(preset.w / screenAspect);
          } else {
            outputHeight = preset.h;
            outputWidth = Math.round(preset.h * screenAspect);
          }
          // Round to even numbers (codec friendly)
          outputWidth = outputWidth - (outputWidth % 2);
          outputHeight = outputHeight - (outputHeight % 2);
        }
      } else {
        outputWidth = preset.w || 1920;
        outputHeight = preset.h || 1080;
      }

      // Create source video elements
      const screenVid = document.createElement("video");
      screenVid.muted = true;
      screenVid.playsInline = true;
      if (screenStream) {
        screenVid.srcObject = screenStream;
        await screenVid.play().catch(() => { });
      }
      screenVideoElRef.current = screenVid;

      const camVid = document.createElement("video");
      camVid.muted = true;
      camVid.playsInline = true;
      if (camStream) {
        camVid.srcObject = camStream;
        await camVid.play().catch(() => { });
      }
      camVideoElRef.current = camVid;

      // Composition canvas
      const compCanvas = document.createElement("canvas");
      compCanvas.width = outputWidth;
      compCanvas.height = outputHeight;
      compositionCanvasRef.current = compCanvas;
      const compCtx = compCanvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!compCtx) throw new Error("Canvas 2D context unavailable");

      // High-quality compositing: keep video crisp, smooth annotations
      compCtx.imageSmoothingEnabled = true;
      compCtx.imageSmoothingQuality = "high";

      // Compute scale factors for translating screen coords to canvas coords
      const getScreenScale = () => {
        const isUsingScreen = recordingMode !== "cam_only";
        if (!isUsingScreen) return { sx: 0, sy: 0 };
        const sx = outputWidth / window.innerWidth;
        const sy = outputHeight / window.innerHeight;
        return { sx, sy };
      };

      // Smoothed cursor position (eased toward real position) for buttery cursor glow
      let smoothCursor: { x: number; y: number } | null = null;
      const SMOOTH_FACTOR = 0.25; // 0=no smoothing, 1=instant

      // Render loop
      const renderFrame = () => {
        if (!compCtx) return;

        // 1. Paint base video (screen or cam)
        if (recordingModeRef.current === "cam_only") {
          if (camVid.readyState >= 2) {
            // Cover-fit camera into output
            const camAspect = (camVid.videoWidth || outputWidth) / (camVid.videoHeight || outputHeight);
            const outAspect = outputWidth / outputHeight;
            let sw = camVid.videoWidth, sh = camVid.videoHeight;
            let sx = 0, sy = 0;
            if (camAspect > outAspect) {
              // Camera wider — crop sides
              sw = sh * outAspect;
              sx = (camVid.videoWidth - sw) / 2;
            } else {
              sh = sw / outAspect;
              sy = (camVid.videoHeight - sh) / 2;
            }
            compCtx.drawImage(camVid, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
          } else {
            compCtx.fillStyle = "#000";
            compCtx.fillRect(0, 0, outputWidth, outputHeight);
          }
        } else {
          if (screenVid.readyState >= 2) {
            // Letterbox screen video into canvas (preserve aspect)
            const screenAspect = (screenVid.videoWidth || outputWidth) / (screenVid.videoHeight || outputHeight);
            const outAspect = outputWidth / outputHeight;
            let dw = outputWidth, dh = outputHeight, dx = 0, dy = 0;
            if (screenAspect > outAspect) {
              dh = outputWidth / screenAspect;
              dy = (outputHeight - dh) / 2;
            } else if (screenAspect < outAspect) {
              dw = outputHeight * screenAspect;
              dx = (outputWidth - dw) / 2;
            }
            // Black letterbox bars
            if (dx > 0 || dy > 0) {
              compCtx.fillStyle = "#000";
              compCtx.fillRect(0, 0, outputWidth, outputHeight);
            }
            compCtx.drawImage(screenVid, dx, dy, dw, dh);
          } else {
            compCtx.fillStyle = "#000";
            compCtx.fillRect(0, 0, outputWidth, outputHeight);
          }
        }

        // 2. Paint annotations
        if (recordingModeRef.current !== "cam_only") {
          const { sx, sy } = getScreenScale();
          // Use canvas-relative scale matching the output (annotations were drawn in window pixels)
          const all = drawingNowRef.current ? [...annotationsRef.current, drawingNowRef.current] : annotationsRef.current;
          all.forEach((a) => {
            compCtx.strokeStyle = a.color;
            compCtx.fillStyle = a.color;
            compCtx.lineWidth = Math.max(3, outputHeight / 270); // ~4px at 1080p, 5px at 1440p
            compCtx.lineCap = "round";
            compCtx.lineJoin = "round";
            const sX = a.startX * sx;
            const sY = a.startY * sy;
            const eX = a.endX * sx;
            const eY = a.endY * sy;
            // Subtle drop shadow for depth
            compCtx.shadowColor = "rgba(0,0,0,0.4)";
            compCtx.shadowBlur = 4;
            compCtx.shadowOffsetX = 1;
            compCtx.shadowOffsetY = 1;
            if (a.type === "rectangle") {
              compCtx.strokeRect(sX, sY, eX - sX, eY - sY);
            } else if (a.type === "circle") {
              const r = Math.sqrt((eX - sX) ** 2 + (eY - sY) ** 2);
              compCtx.beginPath();
              compCtx.arc(sX, sY, r, 0, Math.PI * 2);
              compCtx.stroke();
            } else if (a.type === "arrow") {
              const headLen = Math.max(18, outputHeight / 60);
              const angle = Math.atan2(eY - sY, eX - sX);
              compCtx.beginPath();
              compCtx.moveTo(sX, sY);
              compCtx.lineTo(eX, eY);
              compCtx.stroke();
              compCtx.beginPath();
              compCtx.moveTo(eX, eY);
              compCtx.lineTo(eX - headLen * Math.cos(angle - Math.PI / 6), eY - headLen * Math.sin(angle - Math.PI / 6));
              compCtx.lineTo(eX - headLen * Math.cos(angle + Math.PI / 6), eY - headLen * Math.sin(angle + Math.PI / 6));
              compCtx.closePath();
              compCtx.fill();
            } else if (a.type === "freehand" && a.points) {
              compCtx.beginPath();
              a.points.forEach((p, i) => {
                const px = p.x * sx;
                const py = p.y * sy;
                if (i === 0) compCtx.moveTo(px, py);
                else compCtx.lineTo(px, py);
              });
              compCtx.stroke();
            } else if (a.type === "highlight") {
              compCtx.shadowBlur = 0;
              compCtx.fillStyle = a.color + "55";
              compCtx.fillRect(Math.min(sX, eX), Math.min(sY, eY), Math.abs(eX - sX), Math.abs(eY - sY));
            }
            compCtx.shadowColor = "transparent";
            compCtx.shadowBlur = 0;
            compCtx.shadowOffsetX = 0;
            compCtx.shadowOffsetY = 0;
          });

          // 3. Cursor highlight (smooth, soft glow) + click ripples
          if (cursorHighlightRef.current && cursorPosRef.current) {
            const targetX = cursorPosRef.current.x * sx;
            const targetY = cursorPosRef.current.y * sy;
            if (!smoothCursor) {
              smoothCursor = { x: targetX, y: targetY };
            } else {
              smoothCursor.x += (targetX - smoothCursor.x) * SMOOTH_FACTOR;
              smoothCursor.y += (targetY - smoothCursor.y) * SMOOTH_FACTOR;
            }
            const cx = smoothCursor.x;
            const cy = smoothCursor.y;
            const glowRadius = Math.max(40, outputHeight / 27); // scales with res
            const grad = compCtx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
            grad.addColorStop(0, "rgba(212,180,97,0.55)");
            grad.addColorStop(0.6, "rgba(212,180,97,0.15)");
            grad.addColorStop(1, "rgba(212,180,97,0)");
            compCtx.fillStyle = grad;
            compCtx.beginPath();
            compCtx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
            compCtx.fill();

            // Click ripples (eased)
            cursorClicksRef.current.forEach((click) => {
              const age = Date.now() - click.t;
              if (age > 800) return;
              const t = age / 800;
              const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
              const radius = (Math.max(20, outputHeight / 54)) + eased * (Math.max(60, outputHeight / 18));
              compCtx.strokeStyle = `rgba(212,180,97,${1 - t})`;
              compCtx.lineWidth = Math.max(2, outputHeight / 540);
              compCtx.beginPath();
              compCtx.arc(click.x * sx, click.y * sy, radius, 0, Math.PI * 2);
              compCtx.stroke();
            });
          }
        }

        // 4. Camera bubble (only for screen_cam mode) — Loom-style with shadow + ring + draggable position
        if (recordingModeRef.current === "screen_cam" && camEnabledRef.current && camVid.readyState >= 2) {
          const sizeMap = { sm: 0.16, md: 0.22, lg: 0.30 } as const;
          const sizeFraction = sizeMap[camSizeRef.current];
          const bubbleSize = Math.floor(outputHeight * sizeFraction);
          const margin = Math.floor(outputHeight * 0.025);
          // camPosition is normalized (0..1) representing the CENTER of the bubble in output coords
          // Default 0.97/0.97 puts the bubble's right/bottom edges at 97% of the screen
          const cxB = Math.max(bubbleSize / 2 + margin, Math.min(outputWidth - bubbleSize / 2 - margin, camPositionRef.current.x * outputWidth));
          const cyB = Math.max(bubbleSize / 2 + margin, Math.min(outputHeight - bubbleSize / 2 - margin, camPositionRef.current.y * outputHeight));
          const bx = cxB - bubbleSize / 2;
          const by = cyB - bubbleSize / 2;
          const radius = bubbleSize / 2;
          const cornerRadius = bubbleSize * 0.18; // for rounded square

          const drawShape = (path: () => void) => {
            compCtx.beginPath();
            path();
            compCtx.closePath();
          };
          const buildShapePath = () => {
            if (camShapeRef.current === "circle") {
              compCtx.beginPath();
              compCtx.arc(cxB, cyB, radius, 0, Math.PI * 2);
              compCtx.closePath();
            } else {
              // Rounded square
              const r = cornerRadius;
              compCtx.beginPath();
              compCtx.moveTo(bx + r, by);
              compCtx.lineTo(bx + bubbleSize - r, by);
              compCtx.quadraticCurveTo(bx + bubbleSize, by, bx + bubbleSize, by + r);
              compCtx.lineTo(bx + bubbleSize, by + bubbleSize - r);
              compCtx.quadraticCurveTo(bx + bubbleSize, by + bubbleSize, bx + bubbleSize - r, by + bubbleSize);
              compCtx.lineTo(bx + r, by + bubbleSize);
              compCtx.quadraticCurveTo(bx, by + bubbleSize, bx, by + bubbleSize - r);
              compCtx.lineTo(bx, by + r);
              compCtx.quadraticCurveTo(bx, by, bx + r, by);
              compCtx.closePath();
            }
          };

          // Drop shadow
          compCtx.save();
          compCtx.shadowColor = "rgba(0,0,0,0.5)";
          compCtx.shadowBlur = bubbleSize * 0.12;
          compCtx.shadowOffsetX = 0;
          compCtx.shadowOffsetY = bubbleSize * 0.04;
          compCtx.fillStyle = "#000";
          buildShapePath();
          compCtx.fill();
          compCtx.restore();

          // Camera content (cover-fit with shape clip)
          compCtx.save();
          buildShapePath();
          compCtx.clip();

          const camAspect = (camVid.videoWidth || 16) / (camVid.videoHeight || 9);
          let sw = camVid.videoWidth, sh = camVid.videoHeight;
          let sx = 0, sy = 0;
          if (camAspect > 1) {
            sw = sh;
            sx = (camVid.videoWidth - sw) / 2;
          } else if (camAspect < 1) {
            sh = sw;
            sy = (camVid.videoHeight - sh) / 2;
          }
          compCtx.drawImage(camVid, sx, sy, sw, sh, bx, by, bubbleSize, bubbleSize);
          compCtx.restore();

          // Outer gold ring with subtle gradient
          const ringWidth = Math.max(3, bubbleSize * 0.025);
          const ringGrad = compCtx.createLinearGradient(bx, by, bx + bubbleSize, by + bubbleSize);
          ringGrad.addColorStop(0, "#f0c84b");
          ringGrad.addColorStop(1, "#d4b461");
          compCtx.strokeStyle = ringGrad;
          compCtx.lineWidth = ringWidth;
          if (camShapeRef.current === "circle") {
            compCtx.beginPath();
            compCtx.arc(cxB, cyB, radius - ringWidth / 2, 0, Math.PI * 2);
            compCtx.stroke();
          } else {
            buildShapePath();
            compCtx.stroke();
          }
        }

      };
      // setInterval keeps running when tab is hidden; requestAnimationFrame pauses and kills the cam bubble
      animFrameRef.current = setInterval(renderFrame, Math.round(1000 / frameRate));

      // Capture canvas as video stream at desired frame rate
      const canvasStream = (compCanvas as any).captureStream(frameRate) as MediaStream;
      const videoTracks = canvasStream.getVideoTracks();
      // Apply content hints — "motion" keeps motion smooth, "detail" preserves text clarity
      videoTracks.forEach((t) => { try { (t as any).contentHint = recordingModeRef.current === "cam_only" ? "motion" : "detail"; } catch { } });

      // Audio mix
      const audioContext = new AudioContext({ sampleRate: 48000 });
      const destination = audioContext.createMediaStreamDestination();
      let hasAudio = false;
      if (screenStream) {
        const screenAudio = screenStream.getAudioTracks();
        if (screenAudio.length > 0) {
          const source = audioContext.createMediaStreamSource(new MediaStream(screenAudio));
          // Slight gain reduction so mic stays primary
          const gain = audioContext.createGain();
          gain.gain.value = 0.85;
          source.connect(gain);
          gain.connect(destination);
          hasAudio = true;
        }
      }
      if (audioStream) {
        const source = audioContext.createMediaStreamSource(audioStream);
        const gain = audioContext.createGain();
        gain.gain.value = 1.0;
        source.connect(gain);
        gain.connect(destination);
        hasAudio = true;
      }

      const tracks: MediaStreamTrack[] = [...videoTracks];
      if (hasAudio) tracks.push(...destination.stream.getAudioTracks());

      const combinedStream = new MediaStream(tracks);
      // Pick best codec: VP9 > VP8. Skip av01 (not all browsers encode).
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: preset.bitrate,
        audioBitsPerSecond: 128_000,
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        cleanupStreams();
      };

      if (screenStream) {
        screenStream.getVideoTracks()[0].onended = () => {
          if (mediaRecorderRef.current?.state !== "inactive") stopRecording();
        };
      }

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);

      if (teleprompterEnabled && teleprompterScript) setShowTeleprompter(true);
    } catch (err: any) {
      if (err.name !== "NotAllowedError") toast({ title: "Recording failed", description: err.message, variant: "destructive" });
    }
  }, [recordingMode, micEnabled, teleprompterEnabled, teleprompterScript, quality, frameRate, toast]);

  const startRecording = useCallback(() => {
    if (countdownEnabled) setShowCountdown(true);
    else actuallyStartRecording();
  }, [countdownEnabled, actuallyStartRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    setShowTeleprompter(false);
    setAnnotations([]);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsPaused(!isPaused);
  }, [isPaused]);

  const cleanupStreams = () => {
    if (animFrameRef.current) { clearInterval(animFrameRef.current); animFrameRef.current = null; }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    audioStreamRef.current = null;
    camStreamRef.current = null;
  };

  const discardRecording = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordedBlob(null);
    setRecordingTitle("");
    setRecordingDescription("");
  };

  const saveRecording = () => {
    if (!recordedBlob) return;
    setIsUploading(true);
    uploadMutation.mutate(
      { blob: recordedBlob, title: recordingTitle, description: recordingDescription },
      { onSettled: () => setIsUploading(false) }
    );
  };

  const copyShareLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/watch-video/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Link copied!" });
  };

  // ── Annotation Drawing ────────────────────────────────────────────────────
  const handleAnnotationMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationsEnabled || annotationTool === "none") return;
    const canvas = annotCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newAnnot: Annotation = {
      id: `a-${Date.now()}`,
      type: annotationTool as Exclude<AnnotationTool, "none">,
      startX: x, startY: y, endX: x, endY: y,
      color: annotationColor,
      points: annotationTool === "freehand" ? [{ x, y }] : undefined,
      timestamp: recordingTime,
      ttl: 5000,
    };
    setDrawingNow(newAnnot);
  };
  const handleAnnotationMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingNow) return;
    const canvas = annotCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawingNow({
      ...drawingNow,
      endX: x, endY: y,
      points: drawingNow.points ? [...drawingNow.points, { x, y }] : undefined,
    });
  };
  const handleAnnotationMouseUp = () => {
    if (drawingNow) setAnnotations((a) => [...a, drawingNow]);
    setDrawingNow(null);
  };

  // Draw annotations on canvas
  useEffect(() => {
    const canvas = annotCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const all = drawingNow ? [...annotations, drawingNow] : annotations;
    all.forEach((a) => {
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (a.type === "rectangle") {
        ctx.strokeRect(a.startX, a.startY, a.endX - a.startX, a.endY - a.startY);
      } else if (a.type === "circle") {
        const r = Math.sqrt((a.endX - a.startX) ** 2 + (a.endY - a.startY) ** 2);
        ctx.beginPath();
        ctx.arc(a.startX, a.startY, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.type === "arrow") {
        const headLen = 14;
        const angle = Math.atan2(a.endY - a.startY, a.endX - a.startX);
        ctx.beginPath();
        ctx.moveTo(a.startX, a.startY);
        ctx.lineTo(a.endX, a.endY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(a.endX, a.endY);
        ctx.lineTo(a.endX - headLen * Math.cos(angle - Math.PI / 6), a.endY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(a.endX - headLen * Math.cos(angle + Math.PI / 6), a.endY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (a.type === "freehand" && a.points) {
        ctx.beginPath();
        a.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (a.type === "highlight") {
        ctx.fillStyle = a.color + "55";
        ctx.fillRect(Math.min(a.startX, a.endX), Math.min(a.startY, a.endY), Math.abs(a.endX - a.startX), Math.abs(a.endY - a.startY));
      }
    });
  }, [annotations, drawingNow]);

  // Cam preview when settings are open
  useEffect(() => {
    if (isRecording) return;
    if ((recordingMode === "cam_only" || (recordingMode === "screen_cam" && camEnabled)) && camPreviewRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
        if (camPreviewRef.current) camPreviewRef.current.srcObject = s;
        camStreamRef.current = s;
      }).catch(() => { });
    } else {
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
    }
    return () => {
      if (!isRecording) camStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [recordingMode, camEnabled, isRecording]);

  useEffect(() => {
    return () => { cleanupStreams(); if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) { document.addEventListener("click", handler); return () => document.removeEventListener("click", handler); }
  }, [contextMenu]);

  // Saved sequences for sequences tab (server-backed)
  const { data: savedSequences = [] } = useQuery<any[]>({
    queryKey: ["/api/screen-recordings/sequences"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/screen-recordings/sequences");
      return res.json();
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <ClientLayout>
      <div className="min-h-screen" style={{ background: "#040406" }}>
        {/* Overlays during recording */}
        {showCountdown && <CountdownOverlay count={3} onDone={() => { setShowCountdown(false); actuallyStartRecording(); }} />}
        <CursorHighlight enabled={isRecording && cursorHighlight} />
        {showTeleprompter && <Teleprompter script={teleprompterScript} speed={teleprompterSpeed} onClose={() => setShowTeleprompter(false)} />}

        {/* Annotation overlay */}
        {isRecording && annotationsEnabled && annotationTool !== "none" && (
          <>
            <canvas
              ref={annotCanvasRef}
              className="fixed inset-0 z-[9097]"
              style={{ pointerEvents: "auto", cursor: "crosshair" }}
              onMouseDown={handleAnnotationMouseDown}
              onMouseMove={handleAnnotationMouseMove}
              onMouseUp={handleAnnotationMouseUp}
            />
          </>
        )}
        {isRecording && annotationsEnabled && (
          <AnnotationToolbar
            tool={annotationTool}
            onToolChange={setAnnotationTool}
            color={annotationColor}
            onColorChange={setAnnotationColor}
            onClear={() => setAnnotations([])}
          />
        )}

        {/* Modals */}
        {shareModal && <ShareModal recording={shareModal} onClose={() => setShareModal(null)} />}
        {editModal && <EditModal recording={editModal} onClose={() => setEditModal(null)} onSave={(data) => { updateMutation.mutate({ id: editModal.id, ...data }); setEditModal(null); }} />}
        {aiStudioModal && <AIStudioModal recording={aiStudioModal} onClose={() => setAIStudioModal(null)} />}
        {commentsModal && <CommentsPanel recordingId={commentsModal.id} videoUrl={commentsModal.videoUrl} onClose={() => setCommentsModal(null)} />}
        {sequenceBuilderOpen && <SequenceBuilderModal recordings={recordings} onClose={() => setSequenceBuilderOpen(false)} />}

        {/* Teleprompter editor */}
        {showTeleprompterEditor && (
          <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
            <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "#0c0c10", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ScrollText className="w-5 h-5" style={{ color: GOLD }} /> Teleprompter Script
                </h3>
                <button onClick={() => setShowTeleprompterEditor(false)} style={{ color: "rgba(255,255,255,0.4)" }}><X className="w-5 h-5" /></button>
              </div>
              <Textarea value={teleprompterScript} onChange={(e) => setTeleprompterScript(e.target.value)}
                rows={10} placeholder="Paste your script here..." className="bg-transparent border-white/10 text-white" />
              <div className="flex items-center gap-3 mt-4">
                <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Scroll Speed</label>
                <input type="range" min={0.1} max={2} step={0.1} value={teleprompterSpeed}
                  onChange={(e) => setTeleprompterSpeed(Number(e.target.value))}
                  className="flex-1 accent-yellow-500" />
                <span className="text-xs font-mono" style={{ color: GOLD }}>{teleprompterSpeed.toFixed(1)}x</span>
              </div>
              <Button onClick={() => setShowTeleprompterEditor(false)} className="w-full mt-4 rounded-xl"
                style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>
                Save Script
              </Button>
            </div>
          </div>
        )}

        {/* Context menu */}
        {contextMenu && (
          <div className="fixed z-[9000] rounded-xl py-1 shadow-xl min-w-[180px]"
            style={{ top: contextMenu.y, left: contextMenu.x, background: "#16161a", border: "1px solid rgba(255,255,255,0.1)" }}>
            {[
              { icon: Sparkles, label: "AI Studio", action: () => setAIStudioModal(contextMenu.rec) },
              { icon: MessageSquare, label: "Reactions", action: () => setCommentsModal(contextMenu.rec) },
              { icon: Share2, label: "Share", action: () => setShareModal(contextMenu.rec) },
              { icon: Pencil, label: "Edit details", action: () => setEditModal(contextMenu.rec) },
              { icon: Copy, label: "Copy link", action: () => copyShareLink(contextMenu.rec.id) },
              { icon: Download, label: "Download", action: () => { const a = document.createElement("a"); a.href = contextMenu.rec.videoUrl; a.download = `${contextMenu.rec.title}.webm`; a.click(); } },
              { icon: Trash2, label: "Delete", action: () => deleteMutation.mutate(contextMenu.rec.id), danger: true },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.label} onClick={() => { item.action(); setContextMenu(null); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-all hover:bg-white/5"
                  style={{ color: (item as any).danger ? "#ef4444" : "rgba(255,255,255,0.7)" }}>
                  <Icon className="w-3.5 h-3.5" />{item.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="max-w-7xl mx-auto p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${GOLD}20, ${GOLD}08)` }}>
                <Video className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Oravini Recorder</h1>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Record • Annotate • AI-Enhance • Sequence • Share
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {[
                { icon: Film, label: "Recordings", value: stats.total },
                { icon: Eye, label: "Views", value: stats.totalViews },
                { icon: Clock, label: "Total Time", value: fmtDuration(stats.totalDuration) },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
                    <span className="text-xs font-semibold text-white">{s.value}</span>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl mb-8 w-fit" style={{ background: "rgba(255,255,255,0.04)" }}>
            {([
              ["record", "Record", Circle],
              ["library", "Library", Grid3X3],
              ["sequences", "Sequences", Layers],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActiveTab(id as any)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: activeTab === id ? `${GOLD}15` : "transparent",
                  color: activeTab === id ? GOLD : "rgba(255,255,255,0.5)",
                  border: activeTab === id ? `1px solid ${GOLD}33` : "1px solid transparent",
                }}>
                <Icon className="w-4 h-4" />{label}
                {id === "library" && recordings.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${GOLD}20`, color: GOLD }}>{recordings.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* ══════════════════════════ RECORD TAB ══════════════════════════ */}
          {activeTab === "record" && (
            <div className="max-w-3xl mx-auto">
              {!isRecording && !previewUrl && (
                <div className="space-y-6">
                  {/* Mode selector */}
                  <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: GOLD }}>Recording Mode</div>
                    <ModeSelector mode={recordingMode} onMode={setRecordingMode} />
                  </div>

                  {/* Settings */}
                  <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: GOLD }}>Recording Tools</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { state: micEnabled, set: setMicEnabled, on: Mic, off: MicOff, label: "Microphone" },
                        ...(recordingMode !== "cam_only" ? [{ state: camEnabled, set: setCamEnabled, on: Camera, off: CameraOff, label: "Camera Bubble" }] : []),
                        { state: countdownEnabled, set: setCountdownEnabled, on: Timer, off: Timer, label: "3s Countdown" },
                        { state: cursorHighlight, set: setCursorHighlight, on: MousePointer2, off: MousePointer2, label: "Cursor Glow" },
                        { state: annotationsEnabled, set: setAnnotationsEnabled, on: Pen, off: Pen, label: "Annotations" },
                      ].map((s, i) => {
                        const Icon = s.state ? s.on : s.off;
                        return (
                          <button key={i} onClick={() => s.set(!s.state)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                            style={{
                              background: s.state ? `${GOLD}12` : "rgba(255,255,255,0.03)",
                              border: `1px solid ${s.state ? `${GOLD}44` : "rgba(255,255,255,0.08)"}`,
                              color: s.state ? GOLD : "rgba(255,255,255,0.5)",
                            }}>
                            <Icon className="w-4 h-4" />
                            <span className="text-xs font-medium">{s.label}</span>
                          </button>
                        );
                      })}
                      <button onClick={() => setShowTeleprompterEditor(true)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                        style={{
                          background: teleprompterEnabled ? `${GOLD}12` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${teleprompterEnabled ? `${GOLD}44` : "rgba(255,255,255,0.08)"}`,
                          color: teleprompterEnabled ? GOLD : "rgba(255,255,255,0.5)",
                        }}>
                        <ScrollText className="w-4 h-4" />
                        <span className="text-xs font-medium">Teleprompter</span>
                        {teleprompterScript && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    </div>
                    {teleprompterScript && (
                      <div className="mt-3 flex items-center gap-2">
                        <input type="checkbox" checked={teleprompterEnabled} onChange={(e) => setTeleprompterEnabled(e.target.checked)} />
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                          Enable teleprompter overlay during recording
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quality settings */}
                  <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: GOLD }}>Video Quality</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                      {([
                        { id: "720p" as const, label: "720p", desc: "4 Mbps · Smaller" },
                        { id: "1080p" as const, label: "1080p", desc: "8 Mbps · Loom-grade" },
                        { id: "1440p" as const, label: "1440p", desc: "14 Mbps · Crisp" },
                        { id: "source" as const, label: "Source", desc: "Native res" },
                      ]).map((q) => {
                        const active = quality === q.id;
                        return (
                          <button key={q.id} onClick={() => setQuality(q.id)}
                            className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl transition-all text-left"
                            style={{
                              background: active ? `${GOLD}12` : "rgba(255,255,255,0.03)",
                              border: `1px solid ${active ? `${GOLD}55` : "rgba(255,255,255,0.08)"}`,
                              color: active ? GOLD : "rgba(255,255,255,0.7)",
                            }}>
                            <span className="text-sm font-bold">{q.label}</span>
                            <span className="text-[10px]" style={{ color: active ? `${GOLD}99` : "rgba(255,255,255,0.4)" }}>{q.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Frame rate:</span>
                      <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                        {([30, 60] as const).map((fps) => (
                          <button key={fps} onClick={() => setFrameRate(fps)}
                            className="px-3 py-1.5 text-xs font-semibold transition-all"
                            style={{
                              background: frameRate === fps ? `${GOLD}15` : "transparent",
                              color: frameRate === fps ? GOLD : "rgba(255,255,255,0.5)",
                            }}>{fps} FPS</button>
                        ))}
                      </div>
                      <span className="text-[10px] ml-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {frameRate === 60 ? "Buttery smooth — uses more storage" : "Standard — recommended for most"}
                      </span>
                    </div>
                  </div>

                  {/* Cam preview + bubble position picker */}
                  {(recordingMode === "cam_only" || (recordingMode === "screen_cam" && camEnabled)) && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="p-3 flex items-center justify-between">
                        <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Camera Preview</div>
                        {recordingMode === "screen_cam" && (
                          <div className="text-[10px]" style={{ color: GOLD }}>You can drag the bubble while recording</div>
                        )}
                      </div>
                      <div className="aspect-video bg-black/50 relative overflow-hidden">
                        <video ref={camPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />

                        {/* In screen_cam mode, show a draggable preview bubble inside the preview box */}
                        {recordingMode === "screen_cam" && (
                          <div
                            className="absolute select-none cursor-grab active:cursor-grabbing"
                            style={{
                              left: `calc(${camPosition.x * 100}% - ${camSize === "sm" ? 24 : camSize === "md" ? 36 : 48}px)`,
                              top: `calc(${camPosition.y * 100}% - ${camSize === "sm" ? 24 : camSize === "md" ? 36 : 48}px)`,
                              width: camSize === "sm" ? 48 : camSize === "md" ? 72 : 96,
                              height: camSize === "sm" ? 48 : camSize === "md" ? 72 : 96,
                              borderRadius: camShape === "circle" ? "50%" : "18%",
                              border: `2px solid ${GOLD}`,
                              background: `${GOLD}22`,
                              boxShadow: `0 4px 16px rgba(0,0,0,0.4)`,
                              fontSize: 9,
                              color: GOLD,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              textAlign: "center",
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const target = e.currentTarget.parentElement!;
                              const rect = target.getBoundingClientRect();
                              const onMove = (ev: MouseEvent) => {
                                const x = (ev.clientX - rect.left) / rect.width;
                                const y = (ev.clientY - rect.top) / rect.height;
                                setCamPosition({
                                  x: Math.max(0.05, Math.min(0.95, x)),
                                  y: Math.max(0.05, Math.min(0.95, y)),
                                });
                              };
                              const onUp = () => {
                                window.removeEventListener("mousemove", onMove);
                                window.removeEventListener("mouseup", onUp);
                              };
                              window.addEventListener("mousemove", onMove);
                              window.addEventListener("mouseup", onUp);
                            }}>
                            CAM
                          </div>
                        )}
                      </div>

                      {/* Bubble customizer (only for screen_cam) */}
                      {recordingMode === "screen_cam" && (
                        <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: GOLD }}>Bubble Position & Style</div>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Position presets */}
                            <div>
                              <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Quick Position</div>
                              <div className="grid grid-cols-3 gap-1">
                                {([
                                  { id: "tl", x: 0.1, y: 0.1, label: "↖" },
                                  { id: "tc", x: 0.5, y: 0.1, label: "↑" },
                                  { id: "tr", x: 0.9, y: 0.1, label: "↗" },
                                  { id: "ml", x: 0.1, y: 0.5, label: "←" },
                                  { id: "mc", x: 0.5, y: 0.5, label: "•" },
                                  { id: "mr", x: 0.9, y: 0.5, label: "→" },
                                  { id: "bl", x: 0.1, y: 0.9, label: "↙" },
                                  { id: "bc", x: 0.5, y: 0.9, label: "↓" },
                                  { id: "br", x: 0.9, y: 0.9, label: "↘" },
                                ]).map((p) => {
                                  const active = Math.abs(camPosition.x - p.x) < 0.05 && Math.abs(camPosition.y - p.y) < 0.05;
                                  return (
                                    <button key={p.id} onClick={() => setCamPosition({ x: p.x, y: p.y })}
                                      className="aspect-square rounded-md text-sm font-bold transition-all"
                                      style={{
                                        background: active ? `${GOLD}25` : "rgba(255,255,255,0.04)",
                                        color: active ? GOLD : "rgba(255,255,255,0.5)",
                                        border: `1px solid ${active ? `${GOLD}55` : "rgba(255,255,255,0.06)"}`,
                                      }}>{p.label}</button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              {/* Size */}
                              <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Size</div>
                              <div className="flex items-center rounded-md overflow-hidden mb-2" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                                {(["sm", "md", "lg"] as const).map((s) => (
                                  <button key={s} onClick={() => setCamSize(s)}
                                    className="flex-1 py-1.5 text-xs font-semibold uppercase transition-all"
                                    style={{
                                      background: camSize === s ? `${GOLD}15` : "transparent",
                                      color: camSize === s ? GOLD : "rgba(255,255,255,0.5)",
                                    }}>{s === "sm" ? "Small" : s === "md" ? "Medium" : "Large"}</button>
                                ))}
                              </div>

                              {/* Shape */}
                              <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Shape</div>
                              <div className="flex items-center rounded-md overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                                {(["circle", "square"] as const).map((s) => (
                                  <button key={s} onClick={() => setCamShape(s)}
                                    className="flex-1 py-1.5 text-xs font-semibold capitalize transition-all"
                                    style={{
                                      background: camShape === s ? `${GOLD}15` : "transparent",
                                      color: camShape === s ? GOLD : "rgba(255,255,255,0.5)",
                                    }}>{s === "circle" ? "Circle" : "Rounded"}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                            💡 Drag the CAM marker above to position freely, or pick a quick spot. The position bakes into your video.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-center pt-4">
                    <Button onClick={startRecording}
                      className="px-10 py-4 rounded-2xl text-lg font-bold shadow-lg transition-all hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", boxShadow: `0 8px 32px ${GOLD}33` }}>
                      <Circle className="w-5 h-5 mr-2 fill-current" />
                      Start Recording
                    </Button>
                  </div>
                </div>
              )}

              {/* Recording */}
              {isRecording && (
                <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: "0 0 12px rgba(239,68,68,0.5)" }} />
                    <span className="text-red-400 font-mono text-3xl font-bold tabular-nums">{fmtDuration(recordingTime)}</span>
                    {isPaused && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-400">PAUSED</span>}
                  </div>
                  <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Recording in progress...
                  </p>

                  {/* Active tools indicators */}
                  <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                    {micEnabled && <span className="text-[10px] px-2 py-1 rounded" style={{ background: `${GOLD}10`, color: GOLD }}>🎙️ Mic</span>}
                    {cursorHighlight && <span className="text-[10px] px-2 py-1 rounded" style={{ background: `${GOLD}10`, color: GOLD }}>✨ Cursor Glow</span>}
                    {annotationsEnabled && <span className="text-[10px] px-2 py-1 rounded" style={{ background: `${GOLD}10`, color: GOLD }}>✏️ Annotations</span>}
                    {showTeleprompter && <span className="text-[10px] px-2 py-1 rounded" style={{ background: `${GOLD}10`, color: GOLD }}>📜 Teleprompter</span>}
                  </div>

                  {camEnabled && recordingMode === "screen_cam" && (
                    <DraggableCamBubble
                      videoRef={liveCamRef}
                      position={camPosition}
                      onPositionChange={setCamPosition}
                      size={camSize}
                      shape={camShape}
                      dragging={draggingCam}
                      setDragging={setDraggingCam}
                    />
                  )}

                  <div className="flex items-center justify-center gap-3">
                    <Button onClick={togglePause} variant="outline" className="rounded-xl px-5"
                      style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
                      {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                      {isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button onClick={stopRecording} className="rounded-xl px-8"
                      style={{ background: "#ef4444", color: "#fff", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>
                      <StopCircle className="w-5 h-5 mr-2" /> Stop
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview & save */}
              {previewUrl && !isRecording && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <video src={previewUrl} controls className="w-full max-h-[420px] bg-black" />
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <Clock className="w-3 h-3" /> Duration: {fmtDuration(recordingTime)}
                      {recordedBlob && <><span>•</span> Size: {fmtFileSize(recordedBlob.size)}</>}
                    </div>
                    <Input value={recordingTitle} onChange={(e) => setRecordingTitle(e.target.value)}
                      placeholder="Give your recording a title..."
                      className="bg-transparent border-white/10 text-white placeholder:text-white/30 text-lg font-semibold" />
                    <Textarea value={recordingDescription} onChange={(e) => setRecordingDescription(e.target.value)}
                      placeholder="Add a description (optional)..." rows={2}
                      className="bg-transparent border-white/10 text-white placeholder:text-white/30 resize-none" />
                    <div className="p-3 rounded-xl flex items-center gap-2 text-xs" style={{ background: `${GOLD}05`, border: `1px solid ${GOLD}22`, color: "rgba(255,255,255,0.7)" }}>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      After saving, open AI Studio for auto-captions, summary, coaching feedback, and more.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button onClick={discardRecording} variant="outline" className="rounded-xl"
                        style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Discard
                      </Button>
                      <div className="flex-1" />
                      <Button onClick={() => { if (previewUrl) { const a = document.createElement("a"); a.href = previewUrl; a.download = `${recordingTitle || "recording"}.webm`; a.click(); } }}
                        variant="outline" className="rounded-xl" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                        <Download className="w-4 h-4 mr-2" /> Download
                      </Button>
                      <Button onClick={saveRecording} disabled={isUploading} className="rounded-xl px-8"
                        style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>
                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {isUploading ? "Uploading..." : "Save & Share"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════ LIBRARY TAB ══════════════════════════ */}
          {activeTab === "library" && (
            <div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search recordings..."
                      className="pl-10 bg-transparent border-white/10 text-white placeholder:text-white/30" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 rounded-lg text-xs bg-transparent text-white/70 cursor-pointer"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="newest" style={{ background: "#111" }}>Newest</option>
                    <option value="oldest" style={{ background: "#111" }}>Oldest</option>
                    <option value="views" style={{ background: "#111" }}>Most Viewed</option>
                    <option value="title" style={{ background: "#111" }}>Title A-Z</option>
                  </select>
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <button onClick={() => setViewMode("grid")} className="p-2"
                      style={{ background: viewMode === "grid" ? `${GOLD}15` : "transparent", color: viewMode === "grid" ? GOLD : "rgba(255,255,255,0.4)" }}>
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode("list")} className="p-2"
                      style={{ background: viewMode === "list" ? `${GOLD}15` : "transparent", color: viewMode === "list" ? GOLD : "rgba(255,255,255,0.4)" }}>
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <Button onClick={() => setActiveTab("record")} className="rounded-xl text-xs"
                    style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>
                    <Circle className="w-3 h-3 mr-1.5 fill-current" /> New Recording
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
                </div>
              ) : filteredRecordings.length === 0 ? (
                <div className="text-center py-20 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: `${GOLD}10` }}>
                    <Monitor className="w-7 h-7" style={{ color: "rgba(255,255,255,0.2)" }} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {searchQuery ? "No recordings match your search" : "No recordings yet"}
                  </h3>
                  <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {searchQuery ? "Try different keywords" : "Record your first screen video"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setActiveTab("record")} className="rounded-xl"
                      style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>
                      <Circle className="w-4 h-4 mr-2 fill-current" /> Start Recording
                    </Button>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRecordings.map((rec) => (
                    <div key={rec.id}
                      className="group rounded-xl overflow-hidden transition-all hover:ring-1"
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ rec, x: e.clientX, y: e.clientY }); }}>
                      <div className="relative aspect-video bg-black/60 overflow-hidden">
                        <video src={rec.videoUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          preload="metadata" onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }} />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(0,0,0,0.4)" }}>
                          <button onClick={() => window.open(`/watch-video/${rec.id}`, "_blank")}
                            className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${GOLD}dd` }}>
                            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                          </button>
                        </div>
                        {rec.duration && (
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[11px] font-mono font-semibold"
                            style={{ background: "rgba(0,0,0,0.85)", color: "rgba(255,255,255,0.85)" }}>
                            {fmtDuration(rec.duration)}
                          </div>
                        )}
                        {rec.isPublic && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"
                            style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>
                            <Globe className="w-2.5 h-2.5" /> Public
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-white truncate mb-1">{rec.title}</h3>
                        {rec.description && <p className="text-xs truncate mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{rec.description}</p>}
                        <div className="flex items-center gap-3 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTimeAgo(rec.createdAt)}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{rec.views}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <button onClick={() => setAIStudioModal(rec)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-white/5"
                            style={{ color: GOLD }}>
                            <Sparkles className="w-3 h-3" /> AI
                          </button>
                          <button onClick={() => setShareModal(rec)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-white/5"
                            style={{ color: "rgba(255,255,255,0.5)" }}>
                            <Share2 className="w-3 h-3" /> Share
                          </button>
                          <button onClick={() => setCommentsModal(rec)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-white/5"
                            style={{ color: "rgba(255,255,255,0.5)" }}>
                            <MessageSquare className="w-3 h-3" />
                          </button>
                          <button onClick={() => copyShareLink(rec.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-white/5"
                            style={{ color: "rgba(255,255,255,0.5)" }}>
                            {copiedId === rec.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button onClick={() => togglePublicMutation.mutate({ id: rec.id, isPublic: !rec.isPublic })}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] transition-all hover:bg-white/5"
                            style={{ color: rec.isPublic ? "#22c55e" : "rgba(255,255,255,0.4)" }}>
                            {rec.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          </button>
                          <div className="flex-1" />
                          <button onClick={(e) => { e.stopPropagation(); setContextMenu({ rec, x: e.clientX, y: e.clientY }); }}
                            className="p-1.5 rounded-lg transition-all hover:bg-white/5"
                            style={{ color: "rgba(255,255,255,0.3)" }}>
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRecordings.map((rec) => (
                    <div key={rec.id}
                      className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/[0.03] group"
                      style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ rec, x: e.clientX, y: e.clientY }); }}>
                      <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-black/50 flex-shrink-0">
                        <video src={rec.videoUrl} className="w-full h-full object-cover" preload="metadata"
                          onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }} />
                        {rec.duration && (
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono"
                            style={{ background: "rgba(0,0,0,0.8)", color: "rgba(255,255,255,0.8)" }}>
                            {fmtDuration(rec.duration)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{rec.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                          <span>{fmtTimeAgo(rec.createdAt)}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{rec.views}</span>
                          {rec.isPublic ? (
                            <span className="flex items-center gap-1 text-green-400"><Globe className="w-3 h-3" />Public</span>
                          ) : (
                            <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Private</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setAIStudioModal(rec)} className="p-2 rounded-lg hover:bg-white/5" style={{ color: GOLD }}><Sparkles className="w-4 h-4" /></button>
                        <button onClick={() => setShareModal(rec)} className="p-2 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)" }}><Share2 className="w-4 h-4" /></button>
                        <button onClick={() => setCommentsModal(rec)} className="p-2 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)" }}><MessageSquare className="w-4 h-4" /></button>
                        <button onClick={() => setEditModal(rec)} className="p-2 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)" }}><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteMutation.mutate(rec.id)} className="p-2 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.3)" }}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════ SEQUENCES TAB ══════════════════════════ */}
          {activeTab === "sequences" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Recording Sequences</h2>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Stitch multiple recordings into a single playable reel — perfect for tutorials and series
                  </p>
                </div>
                <Button onClick={() => setSequenceBuilderOpen(true)} className="rounded-xl text-xs"
                  style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>
                  <Plus className="w-4 h-4 mr-1.5" /> New Sequence
                </Button>
              </div>

              {savedSequences.length === 0 ? (
                <div className="text-center py-20 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: `${GOLD}10` }}>
                    <Layers className="w-7 h-7" style={{ color: GOLD }} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No sequences yet</h3>
                  <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Build a multi-clip reel by combining recordings. Great for "Day 1 / Day 2 / Day 3" series, tutorial sets, or product walkthroughs.
                  </p>
                  <Button onClick={() => setSequenceBuilderOpen(true)} className="rounded-xl"
                    style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }}>
                    <Plus className="w-4 h-4 mr-2" /> Create First Sequence
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedSequences.map((seq) => (
                    <div key={seq.id} className="rounded-xl p-5 transition-all hover:scale-[1.01]"
                      style={{ background: "rgba(212,180,97,0.04)", border: `1px solid ${GOLD}33` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4" style={{ color: GOLD }} />
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>Sequence</span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-1">{seq.name}</h3>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {seq.clipIds?.length || 0} clips • {seq.transition} transition
                      </p>
                      <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Created {fmtTimeAgo(seq.createdAt)}
                      </p>
                      <Button onClick={() => setSequenceBuilderOpen(true)} size="sm" className="w-full mt-4 rounded-lg"
                        style={{ background: `${GOLD}15`, color: GOLD }}>
                        <PlayIcon className="w-3.5 h-3.5 mr-1.5" /> Open
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
