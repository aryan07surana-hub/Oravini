import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play, Pause, Upload, Download, Scissors, Zap, Palette,
  Type, Trash2, Plus, ChevronLeft, Loader2,
  Bold, Italic, Volume2, VolumeX, ZoomIn, ZoomOut,
  ChevronRight, Copy, SkipBack, SkipForward,
  Music, Wand2, Film, Mic2, Sliders,
  PictureInPicture2, Undo2, Redo2, Move,
  MessageSquare, SendHorizonal, X,
  RotateCcw, Eye, Globe, Camera, MapPin, FlipHorizontal2, ImagePlus,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ColorGrade   = "none" | "warm" | "cool" | "cinematic" | "vivid" | "bw";
type AspectRatio  = "16:9" | "9:16" | "1:1";
type TextAnim     = "none" | "fade" | "pop" | "typewriter" | "slide-up";
type TransType    = "none" | "fade" | "dissolve" | "wipe-left" | "wipe-right" | "zoom" | "slide-left";
type ActiveTool   = "none" | "split" | "text" | "speed" | "color" | "volume"
                  | "transition" | "kenburns" | "ai" | "music" | "broll";

interface TextOverlay {
  id: string; text: string; x: number; y: number;
  fontSize: number; color: string; bold: boolean; italic: boolean;
  startTime: number; endTime: number;
  animation: TextAnim; animDur: number;
  bgColor?: string; padding?: number; borderRadius?: number; uppercase?: boolean;
}

interface Transition { type: TransType; duration: number; }

interface KenBurns {
  enabled: boolean;
  zoomStart: number; zoomEnd: number;
  panXStart: number; panYStart: number;
  panXEnd: number; panYEnd: number;
}

interface Clip {
  id: string; file: File; blobUrl: string; filePath: string | null;
  duration: number; trimStart: number; trimEnd: number;
  speed: number; colorGrade: ColorGrade; volume: number; muted: boolean;
  thumbnails: string[]; waveform: number[];
  kenBurns: KenBurns; noiseReduce: boolean;
  transition: Transition;
  speedRamp?: "none" | "ease-in" | "ease-out" | "ease-both";
  reversed?: boolean;
  vignette?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  stabilize?: boolean;
}

interface AudioTrack {
  id: string; file: File; blobUrl: string; filePath: string | null;
  name: string; duration: number; volume: number;
  startOffset: number; waveform: number[];
}

interface BrollClip {
  id: string; file: File; blobUrl: string; filePath: string | null;
  duration: number; startGlobal: number; endGlobal: number;
  x: number; y: number; width: number; thumbnails: string[];
}

interface HistoryEntry {
  clips: Clip[]; textOverlays: TextOverlay[];
  audioTracks: AudioTrack[]; brollClips: BrollClip[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const COLOR_GRADES: { id: ColorGrade; label: string; filter: string; preview: string }[] = [
  { id: "none",      label: "Original",  filter: "",                                                           preview: "from-zinc-600 to-zinc-700" },
  { id: "warm",      label: "Warm",      filter: "sepia(0.2) saturate(1.3) hue-rotate(-8deg)",                 preview: "from-orange-800 to-amber-700" },
  { id: "cool",      label: "Cool",      filter: "saturate(1.1) hue-rotate(12deg) brightness(1.05)",           preview: "from-blue-900 to-cyan-800" },
  { id: "cinematic", label: "Cinematic", filter: "contrast(1.15) saturate(0.8) brightness(0.93)",              preview: "from-slate-900 to-slate-700" },
  { id: "vivid",     label: "Vivid",     filter: "saturate(1.6) contrast(1.12)",                               preview: "from-pink-700 to-violet-700" },
  { id: "bw",        label: "B&W",       filter: "grayscale(1)",                                               preview: "from-zinc-800 to-zinc-500" },
];

const TRANSITIONS: { id: TransType; label: string; icon: string }[] = [
  { id: "none",       label: "Cut",       icon: "✂️" },
  { id: "fade",       label: "Fade",      icon: "⬛" },
  { id: "dissolve",   label: "Dissolve",  icon: "🔀" },
  { id: "wipe-left",  label: "Wipe L",    icon: "◀️" },
  { id: "wipe-right", label: "Wipe R",    icon: "▶️" },
  { id: "zoom",       label: "Zoom",      icon: "🔍" },
  { id: "slide-left", label: "Slide L",   icon: "↩️" },
];

const TEXT_ANIMS: { id: TextAnim; label: string }[] = [
  { id: "none",       label: "None" },
  { id: "fade",       label: "Fade In" },
  { id: "pop",        label: "Pop" },
  { id: "typewriter", label: "Typewriter" },
  { id: "slide-up",   label: "Slide Up" },
];

const SPEEDS  = ["0.3", "0.5", "0.75", "1", "1.25", "1.5", "2", "3"];
const TXT_CLR = ["#ffffff", "#000000", "#d4b461", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f97316"];

const DEFAULT_KB: KenBurns = { enabled: false, zoomStart: 1, zoomEnd: 1.3, panXStart: 0, panYStart: 0, panXEnd: 0, panYEnd: 0 };
const DEFAULT_TRANS: Transition = { type: "none", duration: 0.5 };

const TEXT_TEMPLATES: { id: string; label: string; emoji: string; desc: string; style: Partial<TextOverlay> }[] = [
  { id: "word-highlight", label: "Word Highlight", emoji: "🎯", desc: "TikTok/CapCut",
    style: { bold: true, color: "#000000", bgColor: "#f59e0b", fontSize: 44, x: 0.5, y: 0.85, padding: 6, borderRadius: 4, uppercase: true, animation: "pop" as TextAnim, animDur: 0.2 } },
  { id: "subtitle-pill", label: "Subtitle Pill", emoji: "💬", desc: "Dark bg pill",
    style: { bold: true, color: "#ffffff", bgColor: "rgba(0,0,0,0.82)", fontSize: 30, x: 0.5, y: 0.88, padding: 8, borderRadius: 24, animation: "fade" as TextAnim, animDur: 0.25 } },
  { id: "lower-third", label: "Lower Third", emoji: "📺", desc: "Name bar",
    style: { bold: true, color: "#ffffff", bgColor: "#d4b461", fontSize: 22, x: 0.12, y: 0.82, padding: 8, borderRadius: 4, animation: "slide-up" as TextAnim, animDur: 0.3 } },
  { id: "kinetic-title", label: "Kinetic Title", emoji: "🔥", desc: "Big center pop",
    style: { bold: true, color: "#ffffff", fontSize: 64, x: 0.5, y: 0.5, animation: "pop" as TextAnim, animDur: 0.3 } },
  { id: "hook-text", label: "Hook", emoji: "⚡", desc: "High contrast opener",
    style: { bold: true, color: "#f59e0b", fontSize: 52, x: 0.5, y: 0.3, animation: "slide-up" as TextAnim, animDur: 0.3, uppercase: true } },
  { id: "minimal", label: "Minimal", emoji: "✨", desc: "Clean & simple",
    style: { bold: false, color: "#ffffff", fontSize: 32, x: 0.5, y: 0.9, animation: "fade" as TextAnim, animDur: 0.4 } },
];

const TOOL_DOCK: { id: ActiveTool; icon: any; label: string }[] = [
  { id: "split",      icon: Scissors,        label: "Split"      },
  { id: "text",       icon: Type,            label: "Text"       },
  { id: "speed",      icon: Zap,             label: "Speed"      },
  { id: "color",      icon: Palette,         label: "Filter"     },
  { id: "volume",     icon: Volume2,         label: "Volume"     },
  { id: "transition", icon: Film,            label: "Transition" },
  { id: "kenburns",   icon: Move,            label: "Ken Burns"  },
  { id: "ai",         icon: Wand2,           label: "AI Tools"   },
  { id: "music",      icon: Music,           label: "Music"      },
  { id: "broll",      icon: PictureInPicture2, label: "B-Roll"   },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec.toFixed(1)}`;
}

async function extractThumbnails(blobUrl: string, duration: number, count = 10): Promise<string[]> {
  return new Promise(resolve => {
    const vid = document.createElement("video");
    vid.muted = true; vid.preload = "auto";
    const thumbs: string[] = [];
    let idx = 0;
    const canvas = document.createElement("canvas");
    canvas.width = 80; canvas.height = 45;
    const ctx = canvas.getContext("2d")!;
    vid.onloadedmetadata = () => {
      const step = Math.max(0.1, duration / count);
      const capture = () => {
        if (idx >= count) { resolve(thumbs); return; }
        vid.currentTime = idx * step + step / 2;
      };
      vid.onseeked = () => {
        ctx.drawImage(vid, 0, 0, 80, 45);
        thumbs.push(canvas.toDataURL("image/jpeg", 0.5));
        idx++; capture();
      };
      vid.onerror = () => resolve(thumbs);
      capture();
    };
    vid.onerror = () => resolve([]);
    vid.src = blobUrl;
  });
}

async function extractWaveform(blobUrl: string, samples = 80): Promise<number[]> {
  try {
    const resp = await fetch(blobUrl);
    const buf  = await resp.arrayBuffer();
    const ctx  = new AudioContext();
    const decoded = await ctx.decodeAudioData(buf);
    const data = decoded.getChannelData(0);
    const block = Math.floor(data.length / samples);
    const peaks: number[] = [];
    for (let i = 0; i < samples; i++) {
      let max = 0;
      for (let j = 0; j < block; j++) { const v = Math.abs(data[i * block + j]); if (v > max) max = v; }
      peaks.push(max);
    }
    const mx = Math.max(...peaks, 0.001);
    return peaks.map(p => p / mx);
  } catch { return Array(samples).fill(0.5); }
}

function totalDuration(clips: Clip[]) {
  return clips.reduce((s, c) => s + (c.trimEnd - c.trimStart) / c.speed, 0);
}

function clipStartGlobalTime(clips: Clip[], idx: number) {
  let t = 0;
  for (let i = 0; i < idx; i++) t += (clips[i].trimEnd - clips[i].trimStart) / clips[i].speed;
  return t;
}

function clipAtGlobalTime(clips: Clip[], globalTime: number) {
  let accum = 0;
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const eff = (c.trimEnd - c.trimStart) / c.speed;
    if (globalTime < accum + eff || i === clips.length - 1) {
      return { clip: c, clipIndex: i, localTime: c.trimStart + (globalTime - accum) * c.speed, startT: accum, effDur: eff };
    }
    accum += eff;
  }
  return null;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VideoClipEditor() {
  const { toast } = useToast();

  // ── Core state ───────────────────────────────────────────────────────────────
  const [clips, setClips]                   = useState<Clip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [globalTime, setGlobalTime]         = useState(0);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [aspectRatio, setAspectRatio]       = useState<AspectRatio>("9:16");
  const [activeTool, setActiveTool]         = useState<ActiveTool>("none");
  const [zoom, setZoom]                     = useState(60);
  const [hoverTime, setHoverTime]           = useState<number | null>(null);
  const [activeBuffer, setActiveBuffer]     = useState<"a" | "b">("a");

  // ── Text overlays ─────────────────────────────────────────────────────────────
  const [textOverlays, setTextOverlays]         = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId]     = useState<string | null>(null);
  const [draggingTextId, setDraggingTextId]     = useState<string | null>(null);
  const draggingTextRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  // ── Audio tracks (music layer) ───────────────────────────────────────────────
  const [audioTracks, setAudioTracks]           = useState<AudioTrack[]>([]);
  const [selectedAudioId, setSelectedAudioId]   = useState<string | null>(null);
  const [masterVolume, setMasterVolume]         = useState(1);
  const [audioDuckEnabled, setAudioDuckEnabled] = useState(false);
  const [audioDuckLevel, setAudioDuckLevel]     = useState(0.3);
  const draggingAudioRef = useRef<{ id: string; startX: number; startOffset: number } | null>(null);

  // ── B-roll clips ─────────────────────────────────────────────────────────────
  const [brollClips, setBrollClips]             = useState<BrollClip[]>([]);
  const [selectedBrollId, setSelectedBrollId]   = useState<string | null>(null);
  const draggingBrollRef = useRef<{ id: string; mx: number; my: number; ox: number; oy: number } | null>(null);

  // ── Transitions ──────────────────────────────────────────────────────────────
  const [selectedTransIdx, setSelectedTransIdx] = useState<number | null>(null);

  // ── Clip drag-reorder ─────────────────────────────────────────────────────────
  const [dragClipId, setDragClipId]             = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx]           = useState<number | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // ── Undo / Redo ──────────────────────────────────────────────────────────────
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const pastRef   = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);

  // ── Upload ───────────────────────────────────────────────────────────────────
  const [isUploading, setIsUploading]   = useState(false);
  const [uploadQueue, setUploadQueue]   = useState(0);
  const fileRef      = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const brollFileRef = useRef<HTMLInputElement>(null);

  // ── Export ───────────────────────────────────────────────────────────────────
  const [isExporting, setIsExporting]       = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [exportUrl, setExportUrl]           = useState<string | null>(null);

  // ── AI features ──────────────────────────────────────────────────────────────
  const [isCaptioning, setIsCaptioning]         = useState(false);
  const [isRemovingSilence, setIsRemovingSilence] = useState(false);
  const [isDetectingScenes, setIsDetectingScenes] = useState(false);

  // ── Transcript editor (Captions.ai-style) ────────────────────────────────────
  type WordStamp = { word: string; start: number; end: number };
  const [clipTranscripts, setClipTranscripts]   = useState<Record<string, WordStamp[]>>({});
  const [selectedWordKeys, setSelectedWordKeys] = useState<Set<string>>(new Set());
  const [isTranscribing, setIsTranscribing]     = useState(false);
  const [showTranscript, setShowTranscript]     = useState(false);

  // ── AI Chat ───────────────────────────────────────────────────────────────────
  type ChatMsg = { role: "user" | "assistant"; content: string; actions?: string[] };
  const [chatMessages, setChatMessages]   = useState<ChatMsg[]>([]);
  const [isChatOpen, setIsChatOpen]       = useState(false);
  const [chatInput, setChatInput]         = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Beat sync ─────────────────────────────────────────────────────────────────
  const [beatTimestamps, setBeatTimestamps] = useState<number[]>([]);
  const [isDetectingBeats, setIsDetectingBeats]   = useState(false);

  // ── AI Highlights ─────────────────────────────────────────────────────────────
  const [isGettingHighlights, setIsGettingHighlights] = useState(false);
  const [clipHighlights, setClipHighlights] = useState<Record<string, { start: number; end: number; reason: string }>>({});

  // ── Video loading state ────────────────────────────────────────────────────────
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Robust fallback: poll video readyState so loading overlay never gets stuck
  useEffect(() => {
    if (!clips.length) { setIsVideoReady(false); return; }
    const vid = activeBuffer === "a" ? videoARef.current : videoBRef.current;
    if (!vid) return;
    if (vid.readyState >= 2) { setIsVideoReady(true); return; }
    const mark = () => setIsVideoReady(true);
    vid.addEventListener("loadeddata", mark);
    vid.addEventListener("canplay",    mark);
    // Safety timeout — if nothing fires in 3s, assume ready
    const t = setTimeout(() => setIsVideoReady(true), 3000);
    return () => {
      vid.removeEventListener("loadeddata", mark);
      vid.removeEventListener("canplay",    mark);
      clearTimeout(t);
    };
  }, [activeBuffer, clips]);

  // ── Auto-analyze + onboarding ─────────────────────────────────────────────────
  const [clipAnalysis, setClipAnalysis]   = useState<Record<string, { silenceCount: number }>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAutoEditing, setIsAutoEditing]   = useState(false);
  const isFirstUploadRef = useRef(true);

  // ── Narration recording ───────────────────────────────────────────────────────
  const [isRecording, setIsRecording]       = useState(false);
  const [recordingTime, setRecordingTime]   = useState(0);
  const mediaRecorderRef                    = useRef<MediaRecorder | null>(null);
  const recordingChunksRef                  = useRef<Blob[]>([]);
  const recordingTimerRef                   = useRef<number | null>(null);
  const recordingStartRef                   = useRef<number>(0);

  // ── Watermark ─────────────────────────────────────────────────────────────────
  const [watermarkPath, setWatermarkPath]       = useState<string | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [watermarkPos, setWatermarkPos]         = useState<"tl"|"tr"|"bl"|"br">("br");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.7);
  const watermarkFileInputRef                   = useRef<HTMLInputElement>(null);

  // ── Export quality ────────────────────────────────────────────────────────────
  const [exportQuality, setExportQuality] = useState<"720p"|"1080p"|"4k">("1080p");
  const [exportFps, setExportFps]         = useState<24|30|60>(30);
  const [showExportSettings, setShowExportSettings] = useState(false);

  // ── Timeline markers ──────────────────────────────────────────────────────────
  const [markers, setMarkers] = useState<{ id: string; time: number; label: string; color: string }[]>([]);

  // ── Caption translation ───────────────────────────────────────────────────────
  const [isTranslating, setIsTranslating] = useState(false);
  const [captionLang, setCaptionLang]     = useState("Spanish");

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const videoARef     = useRef<HTMLVideoElement>(null);
  const videoBRef     = useRef<HTMLVideoElement>(null);
  const previewRef    = useRef<HTMLDivElement>(null);
  const timelineRef   = useRef<HTMLDivElement>(null);
  const rafRef        = useRef<number | null>(null);
  const lastTickRef   = useRef<number>(0);
  const draggingTrimRef  = useRef<{ clipId: string; handle: "start" | "end" } | null>(null);
  const draggingPlayRef  = useRef(false);
  const lastClipIdRef    = useRef<string | null>(null);
  const audioElemsRef    = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Live refs for stale-closure safety
  const clipsRef        = useRef<Clip[]>(clips);
  const textOverlaysRef = useRef<TextOverlay[]>(textOverlays);
  const audioTracksRef  = useRef<AudioTrack[]>(audioTracks);
  const brollClipsRef   = useRef<BrollClip[]>(brollClips);
  const totDurRef       = useRef(0);
  const zoomRef         = useRef(60);
  const isPlayingRef    = useRef(false);
  const masterVolRef    = useRef(1);

  const totDur       = useMemo(() => totalDuration(clips), [clips]);
  const selectedClip = clips.find(c => c.id === selectedClipId) ?? null;
  const selectedText = textOverlays.find(t => t.id === selectedTextId) ?? null;
  const selectedAudio = audioTracks.find(a => a.id === selectedAudioId) ?? null;
  const selectedBroll = brollClips.find(b => b.id === selectedBrollId) ?? null;

  // Sync live refs
  useEffect(() => { clipsRef.current = clips; }, [clips]);
  useEffect(() => { textOverlaysRef.current = textOverlays; }, [textOverlays]);
  useEffect(() => { audioTracksRef.current = audioTracks; }, [audioTracks]);
  useEffect(() => { brollClipsRef.current = brollClips; }, [brollClips]);
  useEffect(() => { totDurRef.current = totDur; }, [totDur]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { masterVolRef.current = masterVolume; }, [masterVolume]);
  const globalTimeRef = useRef(0);
  useEffect(() => { globalTimeRef.current = globalTime; }, [globalTime]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // ─── History helpers ─────────────────────────────────────────────────────────
  const snapshot = (): HistoryEntry => ({
    clips:        clipsRef.current.map(c => ({ ...c })),
    textOverlays: textOverlaysRef.current.map(t => ({ ...t })),
    audioTracks:  audioTracksRef.current.map(a => ({ ...a })),
    brollClips:   brollClipsRef.current.map(b => ({ ...b })),
  });

  const pushHistory = useCallback(() => {
    pastRef.current = [...pastRef.current.slice(-49), snapshot()];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []); // eslint-disable-line

  const undo = useCallback(() => {
    if (!pastRef.current.length) return;
    const prev = pastRef.current.pop()!;
    futureRef.current.push(snapshot());
    setClips(prev.clips);
    setTextOverlays(prev.textOverlays);
    setAudioTracks(prev.audioTracks);
    setBrollClips(prev.brollClips);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
  }, []); // eslint-disable-line

  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    const next = futureRef.current.pop()!;
    pastRef.current.push(snapshot());
    setClips(next.clips);
    setTextOverlays(next.textOverlays);
    setAudioTracks(next.audioTracks);
    setBrollClips(next.brollClips);
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
  }, []); // eslint-disable-line

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const totD = totDurRef.current;
      const isPlay = isPlayingRef.current;

      if (e.code === "Space") {
        e.preventDefault();
        if (isPlay) { setIsPlaying(false); }
        else { setGlobalTime(t => t >= totD ? 0 : t); setIsPlaying(true); }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); setSelectedClipId(id => { if (id) { const c = clipsRef.current.find(x => x.id === id); if (c) { pushHistory(); const copy = { ...c, id: uid() }; const idx = clipsRef.current.findIndex(x => x.id === id); setClips(prev => { const n = [...prev]; n.splice(idx + 1, 0, copy); return n; }); } } return id; }); return; }

      switch (e.key) {
        case "s": case "S":
          if (!e.ctrlKey && !e.metaKey) {
            pushHistory();
            setGlobalTime(t => {
              const info = clipAtGlobalTime(clipsRef.current, t);
              if (!info) return t;
              const { clip, clipIndex, localTime } = info;
              if (localTime <= clip.trimStart + 0.1 || localTime >= clip.trimEnd - 0.1) return t;
              const clipA: Clip = { ...clip, id: uid(), trimEnd: localTime };
              const clipB: Clip = { ...clip, id: uid(), trimStart: localTime };
              setClips(prev => { const n = [...prev]; n.splice(clipIndex, 1, clipA, clipB); return n; });
              return t;
            });
          }
          break;
        case "Delete": case "Backspace":
          setSelectedClipId(id => {
            if (id) { pushHistory(); setClips(prev => prev.filter(c => c.id !== id)); return null; }
            return id;
          });
          break;
        case "ArrowLeft":
          e.preventDefault();
          setGlobalTime(t => Math.max(0, t - (e.shiftKey ? 1 : 1/30)));
          break;
        case "ArrowRight":
          e.preventDefault();
          setGlobalTime(t => Math.min(totD, t + (e.shiftKey ? 1 : 1/30)));
          break;
        case "j":
          setGlobalTime(0); setIsPlaying(false);
          break;
        case "l":
          setGlobalTime(totD); setIsPlaying(false);
          break;
        case "k":
          if (isPlay) { setIsPlaying(false); }
          else { setGlobalTime(t => t >= totD ? 0 : t); setIsPlaying(true); }
          break;
        case "m": case "M":
          addMarker();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pushHistory, undo, redo]);

  // ─── Upload video clips ──────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: File[]) => {
    const videos = files.filter(f => f.type.startsWith("video/"));
    if (!videos.length) return;
    setUploadQueue(q => q + videos.length);
    setIsUploading(true);

    for (const file of videos) {
      const blobUrl = URL.createObjectURL(file);
      const duration = await new Promise<number>(res => {
        const v = document.createElement("video");
        v.src = blobUrl;
        v.onloadedmetadata = () => res(v.duration);
        v.onerror = () => res(10);
      });

      const newClip: Clip = {
        id: uid(), file, blobUrl, filePath: null,
        duration, trimStart: 0, trimEnd: duration,
        speed: 1, colorGrade: "none", volume: 1, muted: false,
        thumbnails: [], waveform: [],
        kenBurns: { ...DEFAULT_KB }, noiseReduce: false,
        transition: { ...DEFAULT_TRANS },
      };

      setClips(prev => [...prev, newClip]);

      extractThumbnails(blobUrl, duration, 12).then(thumbs =>
        setClips(prev => prev.map(c => c.id === newClip.id ? { ...c, thumbnails: thumbs } : c))
      );
      extractWaveform(blobUrl).then(wf =>
        setClips(prev => prev.map(c => c.id === newClip.id ? { ...c, waveform: wf } : c))
      );

      const fd = new FormData(); fd.append("video", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/video-clip-editor/upload");
      xhr.withCredentials = true;
      xhr.onload = () => {
        setUploadQueue(prev => { const n = prev - 1; if (n <= 0) setIsUploading(false); return n; });
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setClips(prev => prev.map(c => c.id === newClip.id ? { ...c, filePath: data.filePath } : c));
          // Show onboarding overlay on first ever upload
          if (isFirstUploadRef.current) { isFirstUploadRef.current = false; setTimeout(() => setShowOnboarding(true), 800); }
          // Background silence analysis
          fetch("/api/video-clip-editor/detect-silence", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath: data.filePath }),
          }).then(r => r.json()).then(d => {
            if (d.silentRanges?.length) {
              setClipAnalysis(prev => ({ ...prev, [newClip.id]: { silenceCount: d.silentRanges.length } }));
            }
          }).catch(() => {});
        }
      };
      xhr.onerror = () => setUploadQueue(prev => { const n = prev - 1; if (n <= 0) setIsUploading(false); return n; });
      xhr.send(fd);
    }
  }, []);

  // ─── Upload audio track ──────────────────────────────────────────────────────
  const handleAudioFiles = useCallback(async (files: File[]) => {
    const audios = files.filter(f => f.type.startsWith("audio/") || f.name.match(/\.(mp3|m4a|wav|aac)$/i));
    for (const file of audios) {
      const blobUrl = URL.createObjectURL(file);
      const duration = await new Promise<number>(res => {
        const a = document.createElement("audio");
        a.src = blobUrl;
        a.onloadedmetadata = () => res(a.duration);
        a.onerror = () => res(120);
      });

      const track: AudioTrack = {
        id: uid(), file, blobUrl, filePath: null,
        name: file.name, duration, volume: 0.7,
        startOffset: 0, waveform: [],
      };
      setAudioTracks(prev => [...prev, track]);
      extractWaveform(blobUrl).then(wf =>
        setAudioTracks(prev => prev.map(a => a.id === track.id ? { ...a, waveform: wf } : a))
      );

      const fd = new FormData(); fd.append("video", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/video-clip-editor/upload"); xhr.withCredentials = true;
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setAudioTracks(prev => prev.map(a => a.id === track.id ? { ...a, filePath: data.filePath } : a));
        }
      };
      xhr.send(fd);
    }
    setActiveTool("music");
  }, []);

  // ─── Upload B-roll ──────────────────────────────────────────────────────────
  const handleBrollFiles = useCallback(async (files: File[]) => {
    const videos = files.filter(f => f.type.startsWith("video/"));
    for (const file of videos) {
      const blobUrl = URL.createObjectURL(file);
      const duration = await new Promise<number>(res => {
        const v = document.createElement("video");
        v.src = blobUrl; v.onloadedmetadata = () => res(v.duration); v.onerror = () => res(5);
      });
      const br: BrollClip = {
        id: uid(), file, blobUrl, filePath: null,
        duration, startGlobal: globalTime, endGlobal: Math.min(totDurRef.current, globalTime + duration),
        x: 0.65, y: 0.05, width: 0.33, thumbnails: [],
      };
      setBrollClips(prev => [...prev, br]);
      extractThumbnails(blobUrl, duration, 4).then(thumbs =>
        setBrollClips(prev => prev.map(b => b.id === br.id ? { ...b, thumbnails: thumbs } : b))
      );
      const fd = new FormData(); fd.append("video", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/video-clip-editor/upload"); xhr.withCredentials = true;
      xhr.onload = () => {
        if (xhr.status === 200) {
          const d = JSON.parse(xhr.responseText);
          setBrollClips(prev => prev.map(b => b.id === br.id ? { ...b, filePath: d.filePath } : b));
        }
      };
      xhr.send(fd);
    }
    setActiveTool("broll");
  }, [globalTime]);

  // ─── Playback RAF loop — video drives globalTime (no seeking during playback) ──
  useEffect(() => {
    if (!isPlaying) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      const curVid = activeBuffer === "a" ? videoARef.current : videoBRef.current;
      if (curVid && curVid.readyState >= 2 && !curVid.paused) {
        const curGlobal = globalTimeRef.current;
        const info = clipAtGlobalTime(clipsRef.current, curGlobal);
        if (info) {
          const { startT, clip, effDur } = info;
          if (curVid.currentTime >= clip.trimEnd - 0.05) {
            // Clip boundary — advance global time past this clip
            const nextGlobal = startT + effDur;
            if (nextGlobal >= totDurRef.current) {
              setIsPlaying(false);
              setGlobalTime(Math.max(0, totDurRef.current - 0.02));
              return;
            }
            setGlobalTime(nextGlobal + 0.02);
          } else {
            // Normal playback: derive globalTime from actual video position
            const derived = startT + (curVid.currentTime - clip.trimStart) / clip.speed;
            setGlobalTime(Math.min(totDurRef.current, derived));
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, activeBuffer]);

  // ─── Sync video element on clip change OR scrub (not during smooth playback) ──
  useEffect(() => {
    if (!clips.length) return;
    const info = clipAtGlobalTime(clips, globalTime);
    if (!info) return;
    const { clip, localTime } = info;

    const curVid = activeBuffer === "a" ? videoARef.current : videoBRef.current;
    const nxtVid = activeBuffer === "a" ? videoBRef.current : videoARef.current;
    if (!curVid) return;

    const applyProps = (vid: HTMLVideoElement) => {
      vid.playbackRate = clip.speed;
      vid.volume = clip.muted ? 0 : clip.volume * masterVolRef.current;
      const grade = COLOR_GRADES.find(g => g.id === clip.colorGrade);
      vid.style.filter = grade?.filter ?? "";
    };

    if (lastClipIdRef.current !== clip.id) {
      // ── Clip changed: load new source ──────────────────────────────────────
      const isFirstLoad = !lastClipIdRef.current;
      lastClipIdRef.current = clip.id;

      if (isFirstLoad || !nxtVid) {
        curVid.src = clip.blobUrl;
        applyProps(curVid);
        let done = false;
        const onReady = () => {
          if (done) return; done = true;
          if (localTime > 0.05) curVid.currentTime = localTime;
          if (isPlayingRef.current) curVid.play().catch(() => {});
        };
        curVid.addEventListener("canplay",    onReady, { once: true });
        curVid.addEventListener("loadeddata", onReady, { once: true });
        curVid.load();
      } else {
        nxtVid.pause();
        nxtVid.src = clip.blobUrl;
        applyProps(nxtVid);
        let done = false;
        const onReady = () => {
          if (done) return; done = true;
          nxtVid.currentTime = localTime;
          setActiveBuffer(prev => prev === "a" ? "b" : "a");
          if (isPlayingRef.current) nxtVid.play().catch(() => {});
        };
        nxtVid.addEventListener("canplay",    onReady, { once: true });
        nxtVid.addEventListener("loadeddata", onReady, { once: true });
        nxtVid.load();
      }
    } else {
      // ── Same clip: only sync when PAUSED (scrubbing) — don't fight playback ─
      applyProps(curVid);
      if (!isPlayingRef.current && curVid.readyState >= 2) {
        const diff = Math.abs(curVid.currentTime - localTime);
        if (diff > 0.15) curVid.currentTime = localTime;
      } else if (isPlayingRef.current && curVid.paused && curVid.readyState >= 2) {
        curVid.play().catch(() => {});
      }
    }
  }, [globalTime, clips, activeBuffer]);

  // ─── Sync audio tracks ────────────────────────────────────────────────────────
  useEffect(() => {
    const duckMult = (audioDuckEnabled && isPlaying) ? audioDuckLevel : 1;
    audioTracks.forEach(at => {
      const el = audioElemsRef.current.get(at.id);
      if (!el) return;
      el.volume = Math.min(1, at.volume * masterVolRef.current * duckMult);
      const localT = globalTime - at.startOffset;
      if (localT < 0 || localT > at.duration) {
        el.pause();
      } else {
        const diff = Math.abs(el.currentTime - localT);
        if (diff > 0.3) el.currentTime = localT;
        if (isPlaying && el.paused) el.play().catch(() => {});
        if (!isPlaying && !el.paused) el.pause();
      }
    });
  }, [globalTime, isPlaying, audioTracks, audioDuckEnabled, audioDuckLevel]);

  // ─── Ken Burns transform ──────────────────────────────────────────────────────
  const kbStyle = useMemo(() => {
    if (!clips.length) return {};
    const info = clipAtGlobalTime(clips, globalTime);
    if (!info || !info.clip.kenBurns.enabled) return {};
    const { clip, startT, effDur } = info;
    const prog = effDur > 0 ? (globalTime - startT) / effDur : 0;
    const kb = clip.kenBurns;
    const scale = lerp(kb.zoomStart, kb.zoomEnd, prog);
    const tx = lerp(kb.panXStart, kb.panXEnd, prog) * 100;
    const ty = lerp(kb.panYStart, kb.panYEnd, prog) * 100;
    return { transform: `scale(${scale}) translate(${tx}%, ${ty}%)`, transformOrigin: "center center" };
  }, [clips, globalTime]);

  // ─── Timeline helpers ────────────────────────────────────────────────────────
  const timelineXToTime = useCallback((clientX: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const contentWidth = Math.max(totDurRef.current * zoomRef.current, 100);
    const x = clientX - rect.left + scrollLeft;
    return Math.max(0, Math.min(totDurRef.current, (x / contentWidth) * totDurRef.current));
  }, []);

  const onTimelineMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-notimeline]")) return;
    e.preventDefault();
    draggingPlayRef.current = true;
    setGlobalTime(timelineXToTime(e.clientX));
    setIsPlaying(false);
  };

  // ─── Global mouse handlers ───────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingPlayRef.current) {
        setGlobalTime(timelineXToTime(e.clientX));
      }
      if (draggingTrimRef.current) {
        const { clipId, handle } = draggingTrimRef.current;
        const live = clipsRef.current;
        const idx = live.findIndex(c => c.id === clipId); if (idx < 0) return;
        const clip = live[idx];
        const clipStartT = clipStartGlobalTime(live, idx);
        const tGlobal = timelineXToTime(e.clientX);
        const tLocal  = clip.trimStart + (tGlobal - clipStartT) * clip.speed;
        if (handle === "start") {
          setClips(prev => prev.map(c => c.id === clipId ? { ...c, trimStart: Math.max(0, Math.min(c.trimEnd - 0.2, tLocal)) } : c));
        } else {
          setClips(prev => prev.map(c => c.id === clipId ? { ...c, trimEnd: Math.min(c.duration, Math.max(c.trimStart + 0.2, tLocal)) } : c));
        }
      }
      if (draggingTextId && draggingTextRef.current && previewRef.current) {
        const rect = previewRef.current.getBoundingClientRect();
        const dx = (e.clientX - draggingTextRef.current.mx) / rect.width;
        const dy = (e.clientY - draggingTextRef.current.my) / rect.height;
        setTextOverlays(prev => prev.map(t => t.id === draggingTextId ? {
          ...t,
          x: Math.max(0, Math.min(1, draggingTextRef.current!.ox + dx)),
          y: Math.max(0, Math.min(1, draggingTextRef.current!.oy + dy)),
        } : t));
      }
      if (draggingBrollRef.current && previewRef.current) {
        const { id, mx, my, ox, oy } = draggingBrollRef.current;
        const rect = previewRef.current.getBoundingClientRect();
        const dx = (e.clientX - mx) / rect.width;
        const dy = (e.clientY - my) / rect.height;
        setBrollClips(prev => prev.map(b => b.id === id ? {
          ...b,
          x: Math.max(0, Math.min(0.9, ox + dx)),
          y: Math.max(0, Math.min(0.9, oy + dy)),
        } : b));
      }
      if (draggingAudioRef.current && timelineRef.current) {
        const { id, startX, startOffset } = draggingAudioRef.current;
        const dx = e.clientX - startX;
        const contentWidth = Math.max(totDurRef.current * zoomRef.current, 100);
        const dt = (dx / contentWidth) * totDurRef.current;
        setAudioTracks(prev => prev.map(a => a.id === id ? { ...a, startOffset: Math.max(0, startOffset + dt) } : a));
      }
    };
    const onUp = () => {
      draggingPlayRef.current = false;
      draggingTrimRef.current = null;
      setDraggingTextId(null); draggingTextRef.current = null;
      draggingBrollRef.current = null;
      draggingAudioRef.current = null;
      if (dragClipId !== null) {
        if (dragOverIdx !== null) {
          const fromIdx = clipsRef.current.findIndex(c => c.id === dragClipId);
          if (fromIdx !== -1 && dragOverIdx !== fromIdx) {
            pushHistory();
            setClips(prev => {
              const n = [...prev];
              const [moved] = n.splice(fromIdx, 1);
              const toIdx = dragOverIdx > fromIdx ? dragOverIdx - 1 : dragOverIdx;
              n.splice(toIdx, 0, moved);
              return n;
            });
          }
        }
        setDragClipId(null);
        setDragOverIdx(null);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [draggingTextId, timelineXToTime, dragClipId, dragOverIdx, pushHistory]);

  // ─── Clip operations ──────────────────────────────────────────────────────────
  const splitAtPlayhead = () => {
    const info = clipAtGlobalTime(clips, globalTime);
    if (!info) return;
    const { clip, clipIndex, localTime } = info;
    if (localTime <= clip.trimStart + 0.1 || localTime >= clip.trimEnd - 0.1) {
      toast({ title: "Playhead too close to edge to split", variant: "destructive" }); return;
    }
    pushHistory();
    const A: Clip = { ...clip, id: uid(), trimEnd: localTime };
    const B: Clip = { ...clip, id: uid(), trimStart: localTime, transition: { ...DEFAULT_TRANS } };
    setClips(prev => { const n = [...prev]; n.splice(clipIndex, 1, A, B); return n; });
    toast({ title: "Clip split" });
  };

  const deleteClip    = (id: string) => { pushHistory(); setClips(prev => prev.filter(c => c.id !== id)); if (selectedClipId === id) setSelectedClipId(null); };
  const duplicateClip = (id: string) => { const idx = clips.findIndex(c => c.id === id); if (idx < 0) return; pushHistory(); const copy = { ...clips[idx], id: uid() }; setClips(prev => { const n = [...prev]; n.splice(idx + 1, 0, copy); return n; }); };
  const updateClip    = (id: string, changes: Partial<Clip>) => setClips(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));

  // ─── Text operations ──────────────────────────────────────────────────────────
  const addText = () => {
    pushHistory();
    const ov: TextOverlay = {
      id: uid(), text: "Your text", x: 0.5, y: 0.8,
      fontSize: 40, color: "#ffffff", bold: true, italic: false,
      startTime: globalTime, endTime: Math.min(totDur, globalTime + 3),
      animation: "fade", animDur: 0.4,
    };
    setTextOverlays(prev => [...prev, ov]);
    setSelectedTextId(ov.id); setActiveTool("text");
  };
  const updateText = (id: string, ch: Partial<TextOverlay>) => setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, ...ch } : t));
  const deleteText = (id: string) => { pushHistory(); setTextOverlays(prev => prev.filter(t => t.id !== id)); if (selectedTextId === id) setSelectedTextId(null); };

  // ─── AI: Shared transcribe helper ────────────────────────────────────────────
  const FILLER_WORDS = new Set(["um", "uh", "uhh", "umm", "hmm", "hm", "ahh", "ah", "mhm"]);

  const fetchTranscript = async (clip: Clip): Promise<WordStamp[]> => {
    const cached = clipTranscripts[clip.id];
    if (cached) return cached;
    const res = await fetch("/api/video-clip-editor/transcribe", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: clip.filePath }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const words: WordStamp[] = data.words || [];
    setClipTranscripts(prev => ({ ...prev, [clip.id]: words }));
    return words;
  };

  // ─── AI: Auto-captions ────────────────────────────────────────────────────────
  const autoCaption = async () => {
    if (!selectedClip?.filePath) { toast({ title: "Select a clip with uploaded file first", variant: "destructive" }); return; }
    setIsCaptioning(true);
    try {
      const words = await fetchTranscript(selectedClip);
      if (!words.length) { toast({ title: "No speech detected" }); return; }

      const chunkSize = 4;
      const chunks: WordStamp[][] = [];
      for (let i = 0; i < words.length; i += chunkSize) chunks.push(words.slice(i, i + chunkSize));

      const clipStartT = clipStartGlobalTime(clips, clips.findIndex(c => c.id === selectedClip.id));
      pushHistory();
      const newOverlays: TextOverlay[] = chunks.map(chunk => ({
        id: uid(),
        text: chunk.map(w => w.word).join(" "),
        x: 0.5, y: 0.88,
        fontSize: 36, color: "#ffffff",
        bold: true, italic: false,
        startTime: clipStartT + chunk[0].start / selectedClip.speed,
        endTime:   clipStartT + chunk[chunk.length - 1].end / selectedClip.speed,
        animation: "fade", animDur: 0.25,
      }));
      setTextOverlays(prev => [...prev, ...newOverlays]);
      setActiveTool("text");
      toast({ title: `Generated ${newOverlays.length} caption segments` });
    } catch (e: any) {
      toast({ title: "Caption failed", description: e.message, variant: "destructive" });
    } finally { setIsCaptioning(false); }
  };

  // ─── AI: Transcript editor — transcribe clip, open editor ────────────────────
  const transcribeForEdit = async () => {
    if (!selectedClip?.filePath) { toast({ title: "Select a clip with uploaded file first", variant: "destructive" }); return; }
    setIsTranscribing(true);
    try {
      const words = await fetchTranscript(selectedClip);
      if (!words.length) { toast({ title: "No speech detected" }); return; }
      setSelectedWordKeys(new Set());
      setShowTranscript(true);
      setActiveTool("ai");
      toast({ title: `Transcript ready — ${words.length} words. Click to mark cuts.` });
    } catch (e: any) {
      toast({ title: "Transcription failed", description: e.message, variant: "destructive" });
    } finally { setIsTranscribing(false); }
  };

  // ─── AI: Mark filler words in transcript ─────────────────────────────────────
  const removeFillersFromTranscript = () => {
    if (!selectedClip) return;
    const words = clipTranscripts[selectedClip.id];
    if (!words?.length) { toast({ title: "Transcribe first", variant: "destructive" }); return; }
    const next = new Set(selectedWordKeys);
    let count = 0;
    words.forEach((w, i) => {
      if (FILLER_WORDS.has(w.word.toLowerCase().replace(/[.,!?]/g, ""))) {
        next.add(`${selectedClip.id}|${i}`);
        count++;
      }
    });
    setSelectedWordKeys(next);
    toast({ title: `Marked ${count} filler word${count !== 1 ? "s" : ""}` });
  };

  // ─── AI: Apply transcript cuts — selected words → split + trim ───────────────
  const applyCutsFromTranscript = () => {
    if (!selectedClip) return;
    const words = clipTranscripts[selectedClip.id];
    if (!words?.length) return;

    const clipId = selectedClip.id;
    const markedIdxs = Array.from(selectedWordKeys)
      .filter(k => k.startsWith(`${clipId}|`))
      .map(k => parseInt(k.split("|")[1]))
      .sort((a, b) => a - b);

    if (!markedIdxs.length) { toast({ title: "Select words to cut first" }); return; }

    // Merge consecutive/adjacent marked words into delete ranges
    const deleteRanges: { start: number; end: number }[] = [];
    let rs = words[markedIdxs[0]].start;
    let re = words[markedIdxs[0]].end;
    for (let i = 1; i < markedIdxs.length; i++) {
      const w = words[markedIdxs[i]];
      const prev = words[markedIdxs[i - 1]];
      if (w.start - prev.end < 0.15) {
        re = w.end;
      } else {
        deleteRanges.push({ start: rs, end: re });
        rs = w.start;
        re = w.end;
      }
    }
    deleteRanges.push({ start: rs, end: re });

    pushHistory();
    const clipIdx = clips.findIndex(c => c.id === clipId);
    const newClips: Clip[] = [];
    let cursor = selectedClip.trimStart;

    for (const { start, end } of deleteRanges) {
      const cutStart = selectedClip.trimStart + start;
      const cutEnd   = selectedClip.trimStart + end;
      if (cutStart - cursor > 0.05) {
        newClips.push({ ...selectedClip, id: uid(), trimStart: cursor, trimEnd: cutStart, transition: { ...DEFAULT_TRANS } });
      }
      cursor = cutEnd;
    }
    if (selectedClip.trimEnd - cursor > 0.05) {
      newClips.push({ ...selectedClip, id: uid(), trimStart: cursor, trimEnd: selectedClip.trimEnd, transition: { ...DEFAULT_TRANS } });
    }

    if (!newClips.length) { toast({ title: "Nothing left after cuts — aborting", variant: "destructive" }); return; }
    setClips(p => { const n = [...p]; n.splice(clipIdx, 1, ...newClips); return n; });
    setSelectedWordKeys(new Set());
    setShowTranscript(false);
    toast({ title: `Cut ${deleteRanges.length} segment${deleteRanges.length !== 1 ? "s" : ""} → ${newClips.length} clip${newClips.length !== 1 ? "s" : ""}` });
  };

  // ─── AI: Silence removal ─────────────────────────────────────────────────────
  const removeSilence = async () => {
    if (!selectedClip?.filePath) { toast({ title: "Select a clip with uploaded file first", variant: "destructive" }); return; }
    setIsRemovingSilence(true);
    try {
      const res = await fetch("/api/video-clip-editor/detect-silence", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: selectedClip.filePath, trimStart: selectedClip.trimStart, trimEnd: selectedClip.trimEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const ranges: { start: number; end: number }[] = data.silentRanges || [];
      if (!ranges.length) { toast({ title: "No silent segments found" }); return; }

      pushHistory();
      const clipIdx = clips.findIndex(c => c.id === selectedClip.id);
      const newClips: Clip[] = [];
      let prev = selectedClip.trimStart;
      for (const { start, end } of ranges) {
        if (start - prev > 0.1) newClips.push({ ...selectedClip, id: uid(), trimStart: prev, trimEnd: start, transition: { ...DEFAULT_TRANS } });
        prev = end;
      }
      if (selectedClip.trimEnd - prev > 0.1) newClips.push({ ...selectedClip, id: uid(), trimStart: prev, trimEnd: selectedClip.trimEnd, transition: { ...DEFAULT_TRANS } });
      if (!newClips.length) return;
      setClips(p => { const n = [...p]; n.splice(clipIdx, 1, ...newClips); return n; });
      toast({ title: `Removed ${ranges.length} silent segments, split into ${newClips.length} clips` });
    } catch (e: any) {
      toast({ title: "Silence removal failed", description: e.message, variant: "destructive" });
    } finally { setIsRemovingSilence(false); }
  };

  // ─── AI: Scene detection ──────────────────────────────────────────────────────
  const detectScenes = async () => {
    if (!selectedClip?.filePath) { toast({ title: "Select a clip with uploaded file first", variant: "destructive" }); return; }
    setIsDetectingScenes(true);
    try {
      const res = await fetch("/api/video-clip-editor/detect-scenes", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: selectedClip.filePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const timestamps: number[] = data.timestamps || [];
      if (!timestamps.length) { toast({ title: "No scene changes detected" }); return; }

      pushHistory();
      const clipIdx = clips.findIndex(c => c.id === selectedClip.id);
      const cuts = timestamps.filter(t => t > selectedClip.trimStart + 0.2 && t < selectedClip.trimEnd - 0.2);
      const newClips: Clip[] = [];
      let prev = selectedClip.trimStart;
      for (const t of cuts) { newClips.push({ ...selectedClip, id: uid(), trimStart: prev, trimEnd: t, transition: { ...DEFAULT_TRANS } }); prev = t; }
      newClips.push({ ...selectedClip, id: uid(), trimStart: prev, trimEnd: selectedClip.trimEnd, transition: { ...DEFAULT_TRANS } });
      setClips(p => { const n = [...p]; n.splice(clipIdx, 1, ...newClips); return n; });
      toast({ title: `Detected ${cuts.length} scenes, split into ${newClips.length} clips` });
    } catch (e: any) {
      toast({ title: "Scene detection failed", description: e.message, variant: "destructive" });
    } finally { setIsDetectingScenes(false); }
  };

  // ─── AI Chat: execute actions returned by LLM ────────────────────────────────
  const executeAIActions = async (actions: any[]) => {
    for (const act of actions) {
      const allCurrent = clipsRef.current;
      const targetClip = act.clipId
        ? allCurrent.find(c => c.id === act.clipId)
        : (selectedClipId ? allCurrent.find(c => c.id === selectedClipId) : allCurrent[0]);

      switch (act.type) {
        case "set_speed":
          if (targetClip) { pushHistory(); updateClip(targetClip.id, { speed: Math.max(0.1, Math.min(4, act.value)) }); }
          break;
        case "set_color_grade":
          if (targetClip) { pushHistory(); updateClip(targetClip.id, { colorGrade: act.grade as ColorGrade }); }
          break;
        case "set_volume":
          if (targetClip) { pushHistory(); updateClip(targetClip.id, { volume: Math.max(0, Math.min(1, act.value)), muted: false }); }
          break;
        case "toggle_mute":
          if (targetClip) { pushHistory(); updateClip(targetClip.id, { muted: act.muted ?? !targetClip.muted }); }
          break;
        case "trim_clip":
          if (targetClip) { pushHistory(); updateClip(targetClip.id, { trimStart: act.trimStart, trimEnd: act.trimEnd }); }
          break;
        case "delete_clip":
          if (targetClip) deleteClip(targetClip.id);
          break;
        case "duplicate_clip":
          if (targetClip) duplicateClip(targetClip.id);
          break;
        case "enable_noise_reduce":
          if (targetClip) { pushHistory(); updateClip(targetClip.id, { noiseReduce: act.value ?? true }); }
          break;
        case "add_transition":
          if (targetClip) { pushHistory(); updateClip(targetClip.id, { transition: { type: act.transType ?? "fade", duration: act.duration ?? 0.5 } }); }
          break;
        case "reorder_clips":
          if (act.order?.length) {
            pushHistory();
            setClips(prev => {
              const ordered: Clip[] = [];
              for (const id of act.order) { const c = prev.find(x => x.id === id); if (c) ordered.push(c); }
              return ordered.length === prev.length ? ordered : prev;
            });
          }
          break;
        case "add_captions":
          if (targetClip?.filePath) {
            setSelectedClipId(targetClip.id);
            setIsCaptioning(true);
            try {
              const words = await fetchTranscript(targetClip);
              if (words.length) {
                const chunkSize = 4;
                const chunks: WordStamp[][] = [];
                for (let i = 0; i < words.length; i += chunkSize) chunks.push(words.slice(i, i + chunkSize));
                const clipStartT = clipStartGlobalTime(clipsRef.current, clipsRef.current.findIndex(c => c.id === targetClip.id));
                pushHistory();
                const overlays: TextOverlay[] = chunks.map(chunk => ({
                  id: uid(), text: chunk.map(w => w.word).join(" "),
                  x: 0.5, y: 0.88, fontSize: 36, color: "#ffffff",
                  bold: true, italic: false,
                  startTime: clipStartT + chunk[0].start / targetClip.speed,
                  endTime:   clipStartT + chunk[chunk.length - 1].end / targetClip.speed,
                  animation: "fade" as TextAnim, animDur: 0.25,
                }));
                setTextOverlays(prev => [...prev, ...overlays]);
                toast({ title: `Generated ${overlays.length} caption segments` });
              } else {
                toast({ title: "No speech detected in clip" });
              }
            } catch (e: any) {
              toast({ title: "Caption failed", description: e.message, variant: "destructive" });
            } finally { setIsCaptioning(false); }
          } else {
            toast({ title: "Clip needs to finish uploading first", variant: "destructive" });
          }
          break;
        case "remove_silences":
          if (targetClip?.filePath) {
            setSelectedClipId(targetClip.id);
            setIsRemovingSilence(true);
            try {
              const r = await fetch("/api/video-clip-editor/detect-silence", {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filePath: targetClip.filePath, trimStart: targetClip.trimStart, trimEnd: targetClip.trimEnd }),
              });
              const d = await r.json();
              if (r.ok && d.silentRanges?.length) {
                pushHistory();
                const clipIdx = clipsRef.current.findIndex(c => c.id === targetClip.id);
                const newClips: Clip[] = [];
                let prev2 = targetClip.trimStart;
                for (const { start, end } of d.silentRanges) {
                  if (start - prev2 > 0.1) newClips.push({ ...targetClip, id: uid(), trimStart: prev2, trimEnd: start, transition: { ...DEFAULT_TRANS } });
                  prev2 = end;
                }
                if (targetClip.trimEnd - prev2 > 0.1) newClips.push({ ...targetClip, id: uid(), trimStart: prev2, trimEnd: targetClip.trimEnd, transition: { ...DEFAULT_TRANS } });
                if (newClips.length) { setClips(p => { const n = [...p]; n.splice(clipIdx, 1, ...newClips); return n; }); toast({ title: `Removed ${d.silentRanges.length} silences` }); }
              } else {
                toast({ title: "No silent segments found" });
              }
            } catch (e: any) {
              toast({ title: "Silence removal failed", description: e.message, variant: "destructive" });
            } finally { setIsRemovingSilence(false); }
          } else {
            toast({ title: "Clip needs to finish uploading first", variant: "destructive" });
          }
          break;
        case "detect_scenes":
          if (targetClip?.filePath) {
            setSelectedClipId(targetClip.id);
            setIsDetectingScenes(true);
            try {
              const r = await fetch("/api/video-clip-editor/detect-scenes", {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filePath: targetClip.filePath }),
              });
              const d = await r.json();
              if (r.ok && d.timestamps?.length) {
                pushHistory();
                const clipIdx = clipsRef.current.findIndex(c => c.id === targetClip.id);
                const cuts = d.timestamps.filter((t: number) => t > targetClip.trimStart + 0.2 && t < targetClip.trimEnd - 0.2);
                const newClips: Clip[] = [];
                let prev2 = targetClip.trimStart;
                for (const t of cuts) { newClips.push({ ...targetClip, id: uid(), trimStart: prev2, trimEnd: t, transition: { ...DEFAULT_TRANS } }); prev2 = t; }
                newClips.push({ ...targetClip, id: uid(), trimStart: prev2, trimEnd: targetClip.trimEnd, transition: { ...DEFAULT_TRANS } });
                setClips(p => { const n = [...p]; n.splice(clipIdx, 1, ...newClips); return n; });
                toast({ title: `Split into ${newClips.length} scenes` });
              } else {
                toast({ title: "No scene changes detected" });
              }
            } catch (e: any) {
              toast({ title: "Scene detection failed", description: e.message, variant: "destructive" });
            } finally { setIsDetectingScenes(false); }
          } else {
            toast({ title: "Clip needs to finish uploading first", variant: "destructive" });
          }
          break;
        case "remove_fillers":
          if (targetClip?.filePath) {
            setSelectedClipId(targetClip.id);
            setIsTranscribing(true);
            try {
              const words = await fetchTranscript(targetClip);
              if (words.length) {
                const fillerWords = new Set(["um", "uh", "uhh", "umm", "hmm", "hm", "ahh", "ah", "mhm"]);
                const next = new Set<string>();
                let count = 0;
                words.forEach((w, i) => {
                  if (fillerWords.has(w.word.toLowerCase().replace(/[.,!?]/g, ""))) {
                    next.add(`${targetClip.id}|${i}`);
                    count++;
                  }
                });
                setSelectedWordKeys(next);
                setShowTranscript(true);
                setActiveTool("ai");
                toast({ title: `Marked ${count} filler words — review in AI Tools panel then click Cut` });
              }
            } catch (e: any) {
              toast({ title: "Transcription failed", description: e.message, variant: "destructive" });
            } finally { setIsTranscribing(false); }
          } else {
            toast({ title: "Clip needs to finish uploading first", variant: "destructive" });
          }
          break;
        default:
          break;
      }
    }
  };

  // ─── AI Chat: send message ────────────────────────────────────────────────────
  const sendChatMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || isChatLoading) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setIsChatLoading(true);
    try {
      const resp = await fetch("/api/video-clip-editor/ai-chat", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          context: {
            clips: clips.map((c, i) => ({
              id: c.id,
              name: c.file?.name ?? `Clip ${i + 1}`,
              duration: c.duration,
              trimStart: c.trimStart,
              trimEnd: c.trimEnd,
              speed: c.speed,
              colorGrade: c.colorGrade,
              volume: c.volume,
              muted: c.muted,
              noiseReduce: c.noiseReduce,
              hasFile: !!c.filePath,
            })),
            selectedClipId,
            currentTime: globalTime,
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message);
      const actionLabels = (data.actions || []).map((a: any) => a.type.replace(/_/g, " "));
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response || "Done!", actions: actionLabels }]);
      if (data.actions?.length) await executeAIActions(data.actions);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: "assistant", content: `Sorry, something went wrong: ${e.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ─── Beat sync: detect beats from audio track via Web Audio API ──────────────
  const detectBeatsFromTrack = async (at: AudioTrack) => {
    setIsDetectingBeats(true);
    try {
      const resp = await fetch(at.blobUrl);
      const arrayBuf = await resp.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
      const data = audioBuf.getChannelData(0);
      const sr = audioBuf.sampleRate;
      const winSize = Math.round(sr * 0.05);
      const hop = Math.round(sr * 0.025);
      const energies: number[] = [];
      for (let i = 0; i < data.length - winSize; i += hop) {
        let e = 0;
        for (let j = 0; j < winSize; j++) e += data[i + j] ** 2;
        energies.push(e / winSize);
      }
      // Smooth with a 9-point moving average
      const smoothed = energies.map((_, i) => {
        const w = energies.slice(Math.max(0, i - 4), i + 5);
        return w.reduce((s, v) => s + v, 0) / w.length;
      });
      const beats: number[] = [];
      let lastBeat = -0.4;
      for (let i = 4; i < smoothed.length - 4; i++) {
        const local = smoothed.slice(i - 4, i + 5).reduce((s, v) => s + v, 0) / 9;
        if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1] && smoothed[i] > local * 1.5) {
          const t = (i * hop) / sr;
          if (t - lastBeat > 0.28) { beats.push(parseFloat(t.toFixed(3))); lastBeat = t; }
        }
      }
      audioCtx.close();
      setBeatTimestamps(beats);
      toast({ title: `Found ${beats.length} beats in "${at.name}"` });
    } catch (e: any) {
      toast({ title: "Beat detection failed", description: e.message, variant: "destructive" });
    } finally { setIsDetectingBeats(false); }
  };

  const snapClipsToBeats = () => {
    if (!beatTimestamps.length || !clips.length) { toast({ title: "Detect beats from a music track first" }); return; }
    const beatsInRange = beatTimestamps.filter(t => t <= totDur + 2);
    if (beatsInRange.length < clips.length) { toast({ title: "Not enough beats to snap all clips", variant: "destructive" }); return; }
    pushHistory();
    const perClip = Math.floor(beatsInRange.length / clips.length);
    setClips(prev => prev.map((clip, i) => {
      const beatDur = (beatsInRange[Math.min((i + 1) * perClip, beatsInRange.length - 1)] ?? beatsInRange[beatsInRange.length - 1])
                    - (beatsInRange[i * perClip] ?? 0);
      const newEnd = Math.min(clip.duration, clip.trimStart + beatDur);
      return { ...clip, trimEnd: newEnd };
    }));
    toast({ title: `Snapped ${clips.length} clips to beat grid` });
  };

  // ─── AI Highlights: best 30–90s from a clip ───────────────────────────────────
  const getHighlights = async (clip: Clip) => {
    if (!clip.filePath) { toast({ title: "Clip must finish uploading first", variant: "destructive" }); return; }
    setIsGettingHighlights(true);
    try {
      const resp = await fetch("/api/video-clip-editor/highlights", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: clip.filePath }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message);
      setClipHighlights(prev => ({ ...prev, [clip.id]: { start: data.start, end: data.end, reason: data.reason } }));
      setSelectedClipId(clip.id);
      toast({ title: "Highlight found!", description: data.reason });
    } catch (e: any) {
      toast({ title: "Highlights failed", description: e.message, variant: "destructive" });
    } finally { setIsGettingHighlights(false); }
  };

  const applyHighlight = (clipId: string) => {
    const h = clipHighlights[clipId];
    if (!h) return;
    pushHistory();
    updateClip(clipId, { trimStart: h.start, trimEnd: h.end });
    setClipHighlights(prev => { const n = { ...prev }; delete n[clipId]; return n; });
    toast({ title: `Trimmed to highlight: ${h.start.toFixed(1)}s – ${h.end.toFixed(1)}s` });
  };

  // ─── Auto-edit: one click to clean a clip ─────────────────────────────────────
  const autoEdit = async (clip: Clip) => {
    if (!clip.filePath) { toast({ title: "Still uploading", variant: "destructive" }); return; }
    setIsAutoEditing(true);
    setShowOnboarding(false);
    setSelectedClipId(clip.id);
    try {
      // Remove silences
      const r = await fetch("/api/video-clip-editor/detect-silence", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: clip.filePath, trimStart: clip.trimStart, trimEnd: clip.trimEnd }),
      });
      const d = await r.json();
      if (r.ok && d.silentRanges?.length) {
        pushHistory();
        const clipIdx = clipsRef.current.findIndex(c => c.id === clip.id);
        const newClips: Clip[] = [];
        let prev2 = clip.trimStart;
        for (const { start, end } of d.silentRanges) {
          if (start - prev2 > 0.1) newClips.push({ ...clip, id: uid(), trimStart: prev2, trimEnd: start, transition: { ...DEFAULT_TRANS } });
          prev2 = end;
        }
        if (clip.trimEnd - prev2 > 0.1) newClips.push({ ...clip, id: uid(), trimStart: prev2, trimEnd: clip.trimEnd, transition: { ...DEFAULT_TRANS } });
        if (newClips.length) setClips(p => { const n = [...p]; n.splice(clipIdx, 1, ...newClips); return n; });
      }
      // Add captions
      const words = await fetchTranscript(clip);
      if (words.length) {
        const chunkSize = 4;
        const chunks: WordStamp[][] = [];
        for (let i = 0; i < words.length; i += chunkSize) chunks.push(words.slice(i, i + chunkSize));
        const clipStartT = clipStartGlobalTime(clipsRef.current, clipsRef.current.findIndex(c => c.id === clip.id));
        pushHistory();
        setTextOverlays(prev => [...prev, ...chunks.map(chunk => ({
          id: uid(), text: chunk.map(w => w.word).join(" "),
          x: 0.5, y: 0.88, fontSize: 36, color: "#ffffff",
          bold: true, italic: false,
          bgColor: "rgba(0,0,0,0.8)", padding: 8, borderRadius: 20,
          startTime: clipStartT + chunk[0].start / clip.speed,
          endTime: clipStartT + chunk[chunk.length - 1].end / clip.speed,
          animation: "fade" as TextAnim, animDur: 0.25,
        }))]);
      }
      toast({ title: "Auto-edit complete — silences removed + captions added" });
    } catch (e: any) {
      toast({ title: "Auto-edit failed", description: e.message, variant: "destructive" });
    } finally { setIsAutoEditing(false); }
  };

  // ─── Add text from template ───────────────────────────────────────────────────
  const addTextFromTemplate = (templateId: string) => {
    const tpl = TEXT_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    pushHistory();
    const ov: TextOverlay = {
      id: uid(), text: "Your text here",
      x: 0.5, y: 0.85, fontSize: 40, color: "#ffffff",
      bold: true, italic: false,
      startTime: globalTime, endTime: Math.min(totDur, globalTime + 4),
      animation: "fade", animDur: 0.3,
      ...tpl.style,
    };
    setTextOverlays(prev => [...prev, ov]);
    setSelectedTextId(ov.id);
    setActiveTool("text");
  };

  // ─── Export ───────────────────────────────────────────────────────────────────
  // ─── SRT Export ───────────────────────────────────────────────────────────────
  const exportSRT = () => {
    if (!textOverlays.length) { toast({ title: "No captions to export" }); return; }
    const sorted = [...textOverlays].sort((a, b) => a.startTime - b.startTime);
    const fmt = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 1000);
      return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
    };
    const srt = sorted.map((t, i) => `${i + 1}\n${fmt(t.startTime)} --> ${fmt(t.endTime)}\n${t.text}`).join("\n\n");
    const blob = new Blob([srt], { type: "text/srt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "captions.srt"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${sorted.length} captions as .srt` });
  };

  // ─── Thumbnail generator ───────────────────────────────────────────────────────
  const generateThumbnail = () => {
    const vid = activeBuffer === "a" ? videoARef.current : videoBRef.current;
    if (!vid) { toast({ title: "Play a clip first" }); return; }
    const canvas = document.createElement("canvas");
    canvas.width = vid.videoWidth || 1920; canvas.height = vid.videoHeight || 1080;
    canvas.getContext("2d")?.drawImage(vid, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `thumbnail-${fmtTime(globalTime).replace(/:/g, "-")}.jpg`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Thumbnail downloaded" });
    }, "image/jpeg", 0.95);
  };

  // ─── Narration recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const recDuration = (Date.now() - recordingStartRef.current) / 1000;
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `narration-${Date.now()}.webm`, { type: "audio/webm" });
        const blobUrl = URL.createObjectURL(blob);
        const fd = new FormData(); fd.append("video", file);
        try {
          const res = await fetch("/api/video-clip-editor/upload", { method: "POST", credentials: "include", body: fd });
          const d = await res.json();
          const narNum = audioTracksRef.current.filter((a: AudioTrack) => a.name.startsWith("Narration")).length + 1;
          const track: AudioTrack = {
            id: uid(), file, blobUrl, filePath: d.filePath ?? null,
            name: `Narration ${narNum}`, duration: recDuration,
            volume: 1, startOffset: globalTime, waveform: [],
          };
          setAudioTracks(prev => [...prev, track]);
          setActiveTool("music");
          toast({ title: `Narration (${recDuration.toFixed(1)}s) added` });
        } catch { toast({ title: "Narration upload failed", variant: "destructive" }); }
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();
      setIsRecording(true); setRecordingTime(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((Date.now() - recordingStartRef.current) / 1000);
      }, 100);
    } catch (e: any) {
      toast({ title: "Microphone access denied", description: e.message, variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current !== null) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // ─── Watermark upload ──────────────────────────────────────────────────────────
  const handleWatermarkFile = async (file: File) => {
    setWatermarkPreview(URL.createObjectURL(file));
    const fd = new FormData(); fd.append("video", file);
    try {
      const res = await fetch("/api/video-clip-editor/upload", { method: "POST", credentials: "include", body: fd });
      const d = await res.json();
      setWatermarkPath(d.filePath ?? null);
      toast({ title: "Watermark uploaded" });
    } catch { toast({ title: "Watermark upload failed", variant: "destructive" }); }
  };

  // ─── Timeline marker ───────────────────────────────────────────────────────────
  const addMarker = (time?: number) => {
    const t = time !== undefined ? time : globalTimeRef.current;
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"];
    setMarkers(prev => [...prev, { id: uid(), time: t, label: `Mark ${prev.length + 1}`, color: colors[prev.length % colors.length] }]);
  };

  // ─── Caption translation ───────────────────────────────────────────────────────
  const translateCaptions = async (lang: string) => {
    if (!textOverlays.length) { toast({ title: "No captions to translate" }); return; }
    setIsTranslating(true);
    try {
      const res = await fetch("/api/video-clip-editor/translate-captions", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions: textOverlays.map(t => ({ id: t.id, text: t.text })), targetLanguage: lang }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      pushHistory();
      setTextOverlays(prev => prev.map(t => {
        const tr = data.translations.find((x: any) => x.id === t.id);
        return tr ? { ...t, text: tr.text } : t;
      }));
      toast({ title: `Translated ${data.translations.length} captions to ${lang}` });
    } catch (e: any) {
      toast({ title: "Translation failed", description: e.message, variant: "destructive" });
    } finally { setIsTranslating(false); }
  };

  const handleExport = async () => {
    const unuploaded = clips.filter(c => !c.filePath);
    if (unuploaded.length) { toast({ title: "Still uploading…", variant: "destructive" }); return; }
    setIsExporting(true); setExportUrl(null); setExportProgress("Sending to server…");
    try {
      const payload = {
        aspectRatio, masterVolume,
        audioDuckEnabled, audioDuckLevel,
        exportQuality, exportFps,
        watermarkPath, watermarkPos, watermarkOpacity,
        clips: clips.map((c, ci) => ({
          filePath: c.filePath, trimStart: c.trimStart, trimEnd: c.trimEnd,
          speed: c.speed, speedRamp: c.speedRamp, colorGrade: c.colorGrade, volume: c.volume, muted: c.muted,
          noiseReduce: c.noiseReduce, kenBurns: c.kenBurns, transition: c.transition,
          reversed: c.reversed, vignette: c.vignette,
          brightness: c.brightness, contrast: c.contrast, saturation: c.saturation, hue: c.hue,
          stabilize: c.stabilize,
          textOverlays: textOverlays
            .filter(t => {
              const cst = clipStartGlobalTime(clips, ci);
              const ced = cst + (c.trimEnd - c.trimStart) / c.speed;
              return t.startTime < ced && t.endTime > cst;
            })
            .map(t => {
              const cst = clipStartGlobalTime(clips, ci);
              return { ...t, startTime: Math.max(0, t.startTime - cst), endTime: Math.max(0, t.endTime - cst) };
            }),
        })),
        audioTracks: audioTracks.filter(a => a.filePath).map(a => ({
          filePath: a.filePath, startOffset: a.startOffset, duration: a.duration, volume: a.volume,
        })),
        brollClips: brollClips.filter(b => b.filePath).map(b => ({
          filePath: b.filePath, startGlobal: b.startGlobal, endGlobal: b.endGlobal,
          x: b.x, y: b.y, width: b.width,
        })),
      };
      setExportProgress("Processing with FFmpeg…");
      const res = await fetch("/api/video-clip-editor/process", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setExportUrl(data.downloadUrl);
      toast({ title: "Export ready!" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally { setIsExporting(false); setExportProgress(""); }
  };

  // ─── Toggle play ──────────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!clips.length) return;
    if (isPlaying) {
      const vid = activeBuffer === "a" ? videoARef.current : videoBRef.current;
      vid?.pause();
      setIsPlaying(false);
    } else {
      if (globalTime >= totDur) setGlobalTime(0);
      const vid = activeBuffer === "a" ? videoARef.current : videoBRef.current;
      if (vid) {
        const doPlay = () => vid.play().catch(() => {});
        // readyState >= 2 = HAVE_CURRENT_DATA, safe to play + seek
        if (vid.readyState >= 2) {
          doPlay();
        } else {
          // Video still loading — play as soon as it's ready
          vid.addEventListener("canplay", doPlay, { once: true });
        }
      }
      setIsPlaying(true);
    }
  };

  const previewAspect = aspectRatio === "9:16" ? "9/16" : aspectRatio === "1:1" ? "1/1" : "16/9";
  const playheadPct   = totDur > 0 ? (globalTime / totDur) * 100 : 0;
  const contentWidth  = Math.max(totDur * zoom, 100);

  // ─── Empty state ──────────────────────────────────────────────────────────────
  if (!clips.length) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800 bg-zinc-900">
          <a href="/dashboard" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="w-3.5 h-3.5" /> Dashboard
          </a>
          <div className="w-px h-4 bg-zinc-700" />
          <p className="text-sm font-black text-white">Clip Editor</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10">
          <div
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); }}
            onClick={() => fileRef.current?.click()}
            className="w-full max-w-lg border-2 border-dashed border-zinc-700 hover:border-primary/60 hover:bg-primary/3 rounded-3xl flex flex-col items-center gap-5 py-20 cursor-pointer transition-all group"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-white">Drop video clips here</p>
              <p className="text-sm text-zinc-500 mt-1">or click to browse · MP4, MOV, WebM</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-zinc-600">
              <span>✂️ Trim &amp; split</span><span>·</span><span>📝 Captions</span><span>·</span>
              <span>🎵 Music</span><span>·</span><span>🎨 Color grade</span><span>·</span><span>🤖 AI tools</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="video/*" multiple className="hidden"
            onChange={e => handleFiles(Array.from(e.target.files ?? []))} />
        </div>
      </div>
    );
  }

  // ─── Editor ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes vce-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes vce-popIn  { from { opacity: 0; transform: translate(-50%,-50%) scale(0.5); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
        @keyframes vce-slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); } to { opacity: 1; transform: translate(-50%,-50%); } }
        .vce-fade  { animation: vce-fadeIn  0.35s ease forwards; }
        .vce-pop   { animation: vce-popIn   0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .vce-slide { animation: vce-slideUp 0.35s ease forwards; }
      `}</style>

      {/* Hidden audio elements for music playback */}
      {audioTracks.map(at => (
        <audio key={at.id} src={at.blobUrl}
          ref={el => { if (el) audioElemsRef.current.set(at.id, el); else audioElemsRef.current.delete(at.id); }} />
      ))}

      <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden select-none">

        {/* ── Top bar ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900 flex-shrink-0 gap-3">
          <div className="flex items-center gap-2">
            <a href="/dashboard" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
              <ChevronLeft className="w-3.5 h-3.5" /> Dashboard
            </a>
            <div className="w-px h-4 bg-zinc-700" />
            <p className="text-sm font-black text-white">AI Clip Editor</p>
            <a href="/ai-video-planner" className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors ml-1">
              <Wand2 className="w-3 h-3" /> AI Planner
            </a>
            {isUploading && (
              <span className="flex items-center gap-1 text-xs text-primary/80">
                <Loader2 className="w-3 h-3 animate-spin" /> {uploadQueue} uploading…
              </span>
            )}
          </div>

          {/* Undo/redo */}
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={!canUndo}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed" title="Undo (⌘Z)">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={!canRedo}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed" title="Redo (⌘⇧Z)">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Aspect ratio */}
          <div className="flex items-center gap-0.5 bg-zinc-800 rounded-lg p-0.5">
            {(["16:9", "9:16", "1:1"] as AspectRatio[]).map(ar => (
              <button key={ar} onClick={() => setAspectRatio(ar)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${aspectRatio === ar ? "bg-primary text-black" : "text-zinc-400 hover:text-white"}`}>
                {ar}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white text-xs gap-1.5 h-7"
              onClick={() => fileRef.current?.click()}>
              <Plus className="w-3.5 h-3.5" /> Add clip
            </Button>
            <input ref={fileRef} type="file" accept="video/*" multiple className="hidden"
              onChange={e => handleFiles(Array.from(e.target.files ?? []))} />
            <input ref={audioFileRef} type="file" accept="audio/*,.mp3,.m4a,.wav" multiple className="hidden"
              onChange={e => handleAudioFiles(Array.from(e.target.files ?? []))} />
            <input ref={brollFileRef} type="file" accept="video/*" multiple className="hidden"
              onChange={e => handleBrollFiles(Array.from(e.target.files ?? []))} />
            <input ref={watermarkFileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleWatermarkFile(f); }} />

            {/* Thumbnail capture */}
            <button onClick={generateThumbnail} title="Capture thumbnail"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* Watermark toggle */}
            <button onClick={() => watermarkFileInputRef.current?.click()} title="Add watermark/logo"
              className={`p-1.5 rounded-lg transition-colors ${watermarkPath ? "text-primary bg-primary/10" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>
              <ImagePlus className="w-3.5 h-3.5" />
            </button>

            {/* Add timeline marker */}
            <button onClick={() => addMarker()} title="Add marker at playhead (M)"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {/* Export quality */}
            <div className="relative">
              <button onClick={() => setShowExportSettings(s => !s)}
                className="flex items-center gap-1 px-2 h-7 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs transition-colors">
                <Sliders className="w-3 h-3" /> {exportQuality} · {exportFps}fps
              </button>
              {showExportSettings && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl w-52 space-y-3">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1.5">Resolution</p>
                    <div className="grid grid-cols-3 gap-1">
                      {(["720p","1080p","4k"] as const).map(q => (
                        <button key={q} onClick={() => setExportQuality(q)}
                          className={`py-1.5 rounded-lg border text-[10px] font-bold transition-all ${exportQuality === q ? "bg-primary/20 border-primary/50 text-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1.5">Frame Rate</p>
                    <div className="grid grid-cols-3 gap-1">
                      {([24,30,60] as const).map(f => (
                        <button key={f} onClick={() => setExportFps(f)}
                          className={`py-1.5 rounded-lg border text-[10px] font-bold transition-all ${exportFps === f ? "bg-primary/20 border-primary/50 text-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                          {f}fps
                        </button>
                      ))}
                    </div>
                  </div>
                  {watermarkPath && (
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1.5">Watermark Position</p>
                      <div className="grid grid-cols-2 gap-1">
                        {([["tl","↖ Top Left"],["tr","↗ Top Right"],["bl","↙ Bot Left"],["br","↘ Bot Right"]] as const).map(([pos, label]) => (
                          <button key={pos} onClick={() => setWatermarkPos(pos)}
                            className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all ${watermarkPos === pos ? "bg-primary/20 border-primary/50 text-primary" : "border-zinc-700 text-zinc-400"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-1 mt-2">
                        <div className="flex justify-between text-[10px] text-zinc-500"><span>Opacity</span><span>{Math.round(watermarkOpacity * 100)}%</span></div>
                        <input type="range" min="0.1" max="1" step="0.05" value={watermarkOpacity}
                          onChange={e => setWatermarkOpacity(+e.target.value)} className="w-full accent-primary" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {exportUrl ? (
              <div className="flex items-center gap-2">
                <a href={exportUrl} download>
                  <Button size="sm" className="bg-green-500 hover:bg-green-600 text-black font-black gap-1.5 h-7 text-xs">
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                </a>
                <button onClick={() => setExportUrl(null)} className="text-zinc-600 hover:text-white text-xs transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-black font-black gap-1.5 h-7 text-xs shadow-lg shadow-primary/20"
                onClick={handleExport} disabled={isExporting || isUploading}>
                {isExporting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{exportProgress ? exportProgress.replace("…","") : "Exporting"}</>
                  : <><Zap className="w-3.5 h-3.5" /> Export · {exportQuality}</>}
              </Button>
            )}
          </div>
        </div>

        {/* ── Main area ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Preview ─────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col items-center justify-center bg-black min-w-0 gap-3 py-3">
            <div ref={previewRef}
              className="relative bg-black rounded-xl overflow-hidden shadow-2xl"
              style={{ aspectRatio: previewAspect, height: "calc(100% - 60px)", maxWidth: "100%" }}
              onClick={() => { setSelectedClipId(null); setSelectedTextId(null); setSelectedBrollId(null); }}>

              {/* Double-buffered video */}
              <div className="absolute inset-0" style={kbStyle}>
                <video ref={videoARef} className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: activeBuffer === "a" ? 1 : 0, transition: "opacity 0.12s ease" }}
                  playsInline preload="auto"
                  onCanPlay={() => setIsVideoReady(true)}
                  onWaiting={() => { if (activeBuffer === "a") setIsVideoReady(false); }}
                  onPlaying={() => setIsVideoReady(true)} />
                <video ref={videoBRef} className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: activeBuffer === "b" ? 1 : 0, transition: "opacity 0.12s ease" }}
                  playsInline preload="auto"
                  onCanPlay={() => setIsVideoReady(true)}
                  onWaiting={() => { if (activeBuffer === "b") setIsVideoReady(false); }}
                  onPlaying={() => setIsVideoReady(true)} />
              </div>

              {/* Loading overlay */}
              {clips.length > 0 && !isVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 pointer-events-none">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-xs text-zinc-400 font-medium">Loading…</span>
                  </div>
                </div>
              )}

              {/* B-roll overlays */}
              {brollClips.filter(b => globalTime >= b.startGlobal && globalTime <= b.endGlobal).map(b => (
                <div key={b.id}
                  className={`absolute cursor-move rounded-lg overflow-hidden shadow-xl border-2 transition-colors ${selectedBrollId === b.id ? "border-primary" : "border-white/20 hover:border-white/40"}`}
                  style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.width * 100}%` }}
                  onMouseDown={e => {
                    e.stopPropagation();
                    setSelectedBrollId(b.id); setActiveTool("broll");
                    draggingBrollRef.current = { id: b.id, mx: e.clientX, my: e.clientY, ox: b.x, oy: b.y };
                  }}>
                  <video src={b.blobUrl} className="w-full" playsInline muted
                    ref={el => {
                      if (!el) return;
                      const local = globalTime - b.startGlobal;
                      if (Math.abs(el.currentTime - local) > 0.3) el.currentTime = local;
                      if (isPlaying && el.paused) el.play().catch(() => {});
                      else if (!isPlaying && !el.paused) el.pause();
                    }} />
                </div>
              ))}

              {/* Text overlays */}
              {textOverlays.filter(t => globalTime >= t.startTime && globalTime <= t.endTime).map(t => {
                const elapsed = globalTime - t.startTime;
                const inAnim = elapsed < t.animDur;
                const displayText = t.animation === "typewriter" && inAnim
                  ? t.text.slice(0, Math.floor((elapsed / t.animDur) * t.text.length)) || " "
                  : t.text;
                const animClass = !inAnim ? ""
                  : t.animation === "fade"     ? "vce-fade"
                  : t.animation === "pop"      ? "vce-pop"
                  : t.animation === "slide-up" ? "vce-slide"
                  : "";
                return (
                  <div key={t.id} className={`absolute cursor-move ${animClass}`}
                    style={{
                      left: `${t.x * 100}%`, top: `${t.y * 100}%`,
                      transform: "translate(-50%,-50%)",
                      fontSize: `${t.fontSize}px`, color: t.color,
                      fontWeight: t.bold ? 900 : 400, fontStyle: t.italic ? "italic" : "normal",
                      textShadow: t.bgColor ? "none" : "0 2px 8px rgba(0,0,0,0.9)",
                      background: t.bgColor || "transparent",
                      padding: t.bgColor ? `${t.padding ?? 6}px ${(t.padding ?? 6) * 2}px` : undefined,
                      borderRadius: t.bgColor ? `${t.borderRadius ?? 4}px` : undefined,
                      textTransform: t.uppercase ? "uppercase" : undefined,
                      letterSpacing: t.uppercase ? "0.04em" : undefined,
                      outline: selectedTextId === t.id ? "2px dashed #d4b461" : "2px solid transparent",
                      outlineOffset: 4, userSelect: "none", whiteSpace: "nowrap",
                    }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      setSelectedTextId(t.id); setActiveTool("text");
                      setDraggingTextId(t.id);
                      draggingTextRef.current = { mx: e.clientX, my: e.clientY, ox: t.x, oy: t.y };
                    }}>
                    {displayText}
                  </div>
                );
              })}

              {/* Vignette overlay for current clip */}
              {(() => { const info = clipAtGlobalTime(clips, globalTime); return info?.clip.vignette; })() && (
                <div className="absolute inset-0 pointer-events-none rounded-xl"
                  style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)" }} />
              )}

              {/* Watermark overlay */}
              {watermarkPreview && (
                <img src={watermarkPreview} alt="watermark"
                  className="absolute pointer-events-none select-none"
                  style={{
                    opacity: watermarkOpacity,
                    width: "20%",
                    ...(watermarkPos === "tl" ? { top: "4%", left: "4%" }
                      : watermarkPos === "tr" ? { top: "4%", right: "4%" }
                      : watermarkPos === "bl" ? { bottom: "4%", left: "4%" }
                      : { bottom: "4%", right: "4%" }),
                  }} />
              )}

              {activeTool === "split" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-dashed border-red-400/60 rounded-xl absolute inset-3" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-400/70" />
                  <div className="bg-red-500/80 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    Click Split to cut here
                  </div>
                </div>
              )}
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-3">
              <button onClick={() => { setGlobalTime(0); setIsPlaying(false); setIsVideoReady(false); }}
                className="text-zinc-500 hover:text-white transition-colors" title="J — go to start">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => { setIsPlaying(false); setGlobalTime(t => Math.max(0, t - 1/30)); }}
                className="text-zinc-500 hover:text-white transition-colors" title="← frame back">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                title="Space / K">
                {isPlaying
                  ? <Pause className="w-4 h-4 text-black fill-black" />
                  : <Play className="w-4 h-4 text-black fill-black ml-0.5" />}
              </button>
              <button onClick={() => { setIsPlaying(false); setGlobalTime(t => Math.min(totDur, t + 1/30)); }}
                className="text-zinc-500 hover:text-white transition-colors" title="→ frame forward">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => { setGlobalTime(totDur); setIsPlaying(false); }}
                className="text-zinc-500 hover:text-white transition-colors" title="L — go to end">
                <SkipBack className="w-4 h-4 rotate-180" />
              </button>

              <div className="flex items-center gap-1.5 ml-1 bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1">
                <span className="text-xs font-mono text-white tabular-nums">{fmtTime(globalTime)}</span>
                <span className="text-zinc-600 text-xs">/</span>
                <span className="text-xs font-mono text-zinc-500 tabular-nums">{fmtTime(totDur)}</span>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={() => setZoom(z => Math.max(20, z / 1.5))} className="text-zinc-600 hover:text-white transition-colors" title="Zoom out">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-zinc-600 font-mono w-8 text-center">{Math.round(zoom)}px</span>
                <button onClick={() => setZoom(z => Math.min(400, z * 1.5))} className="text-zinc-600 hover:text-white transition-colors" title="Zoom in">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Properties panel ─────────────────────────────────────────────── */}
          <div className="w-64 border-l border-zinc-800 bg-zinc-900 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                {activeTool === "none"       ? (selectedClip ? "Clip Properties" : "Project")
                : activeTool === "split"     ? "Split"
                : activeTool === "text"      ? "Text Overlays"
                : activeTool === "speed"     ? "Speed"
                : activeTool === "color"     ? "Color Filter"
                : activeTool === "volume"    ? "Volume"
                : activeTool === "transition"? "Transition"
                : activeTool === "kenburns"  ? "Ken Burns"
                : activeTool === "ai"        ? "AI Tools"
                : activeTool === "music"     ? "Music Track"
                : activeTool === "broll"     ? "B-Roll / PiP"
                : ""}
              </p>
            </div>

            {/* ── Always-visible AI quick actions ── */}
            <div className="flex-shrink-0 border-b border-zinc-800 px-3 pt-2.5 pb-3 bg-zinc-900">
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">AI Tools</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={autoCaption}
                  disabled={isCaptioning || !selectedClip?.filePath}
                  title="Whisper AI word-level captions"
                  className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700/50 enabled:hover:border-primary/40"
                >
                  {isCaptioning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Type className="w-3.5 h-3.5 text-primary" />}
                  <span className="text-[9px] font-semibold text-zinc-300">Captions</span>
                </button>
                <button
                  onClick={removeSilence}
                  disabled={isRemovingSilence || !selectedClip?.filePath}
                  title="Auto-cut silent gaps"
                  className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700/50 enabled:hover:border-green-500/40"
                >
                  {isRemovingSilence ? <Loader2 className="w-3.5 h-3.5 animate-spin text-green-400" /> : <Mic2 className="w-3.5 h-3.5 text-green-400" />}
                  <span className="text-[9px] font-semibold text-zinc-300">Silence</span>
                </button>
                <button
                  onClick={detectScenes}
                  disabled={isDetectingScenes || !selectedClip?.filePath}
                  title="Split at scene changes"
                  className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700/50 enabled:hover:border-blue-500/40"
                >
                  {isDetectingScenes ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Film className="w-3.5 h-3.5 text-blue-400" />}
                  <span className="text-[9px] font-semibold text-zinc-300">Scenes</span>
                </button>
                <button
                  onClick={() => selectedClip && (() => { pushHistory(); updateClip(selectedClip.id, { noiseReduce: !selectedClip.noiseReduce }); })()}
                  disabled={!selectedClip}
                  title="AI audio cleanup on export"
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${selectedClip?.noiseReduce ? "bg-amber-500/15 border-amber-500/40" : "bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700/50 enabled:hover:border-amber-500/40"}`}
                >
                  <Sliders className={`w-3.5 h-3.5 ${selectedClip?.noiseReduce ? "text-amber-400" : "text-zinc-400"}`} />
                  <span className={`text-[9px] font-semibold ${selectedClip?.noiseReduce ? "text-amber-400" : "text-zinc-300"}`}>
                    Noise{selectedClip?.noiseReduce ? " ✓" : ""}
                  </span>
                </button>
              </div>
              {/* Highlights - full width */}
              <button
                onClick={() => selectedClip && getHighlights(selectedClip)}
                disabled={isGettingHighlights || !selectedClip?.filePath}
                title="AI picks the best 30–90s from your clip"
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700/50 enabled:hover:border-purple-500/40"
              >
                {isGettingHighlights ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <Zap className="w-3.5 h-3.5 text-purple-400" />}
                <span className="text-[9px] font-semibold text-zinc-300">AI Highlights</span>
              </button>
              {!selectedClip && (
                <p className="text-[9px] text-zinc-600 text-center mt-1.5">Select a clip to enable AI tools</p>
              )}
              {/* Highlight result banner */}
              {selectedClip && clipHighlights[selectedClip.id] && (
                <div className="col-span-2 bg-purple-500/10 border border-purple-500/30 rounded-xl p-2.5 space-y-1.5">
                  <p className="text-[9px] text-purple-300 leading-relaxed">{clipHighlights[selectedClip.id].reason}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-purple-400">
                      {clipHighlights[selectedClip.id].start.toFixed(1)}s → {clipHighlights[selectedClip.id].end.toFixed(1)}s
                    </span>
                    <button onClick={() => applyHighlight(selectedClip.id)}
                      className="text-[9px] font-bold bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded-lg transition-colors">
                      Apply
                    </button>
                  </div>
                </div>
              )}
              {/* Analysis badge */}
              {selectedClip && clipAnalysis[selectedClip.id] && (
                <div className="col-span-2 flex items-center gap-2 text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
                  <Mic2 className="w-3 h-3 flex-shrink-0" />
                  <span>{clipAnalysis[selectedClip.id].silenceCount} silent gaps found — hit Silence to remove them</span>
                </div>
              )}
            </div>

            <div className="flex-1 p-3 space-y-3 overflow-y-auto text-xs">

              {/* ── Split ───── */}
              {activeTool === "split" && (
                <div className="space-y-3">
                  <p className="text-zinc-400 text-[11px] leading-relaxed">Click the timeline to position the playhead, then split.</p>
                  <div className="bg-zinc-800 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Cut at</span>
                      <span className="font-mono text-primary text-sm font-bold">{fmtTime(globalTime)}</span>
                    </div>
                    {selectedClip && (
                      <div className="flex justify-between text-[10px] text-zinc-600">
                        <span>Clip</span><span>{clips.findIndex(c => c.id === selectedClipId) + 1}</span>
                      </div>
                    )}
                  </div>
                  <Button onClick={splitAtPlayhead} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold gap-2">
                    <Scissors className="w-4 h-4" /> Split here
                  </Button>
                  <p className="text-[9px] text-zinc-600 text-center">Shortcut: <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">S</kbd></p>
                </div>
              )}

              {/* ── Text ───── */}
              {activeTool === "text" && (
                <div className="space-y-3">
                  {/* Templates */}
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Templates</p>
                    <div className="grid grid-cols-2 gap-1">
                      {TEXT_TEMPLATES.map(tpl => (
                        <button key={tpl.id} onClick={() => addTextFromTemplate(tpl.id)}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 hover:border-zinc-600 transition-all text-left">
                          <span className="text-sm">{tpl.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-zinc-200 truncate">{tpl.label}</p>
                            <p className="text-[8px] text-zinc-600 truncate">{tpl.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-px bg-zinc-800" />
                  <Button onClick={addText} size="sm" className="w-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Blank text
                  </Button>
                  {/* Translate captions */}
                  {textOverlays.length > 0 && (
                    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px] font-bold text-white">Translate Captions</span>
                      </div>
                      <select value={captionLang} onChange={e => setCaptionLang(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs px-2 py-1.5">
                        {["Spanish","French","German","Portuguese","Italian","Japanese","Korean","Chinese","Arabic","Hindi","Dutch","Russian"].map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <button onClick={() => translateCaptions(captionLang)} disabled={isTranslating}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors text-[10px] font-bold disabled:opacity-40">
                        {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                        Translate {textOverlays.length} caption{textOverlays.length !== 1 ? "s" : ""}
                      </button>
                    </div>
                  )}
                  {/* SRT export */}
                  {textOverlays.length > 0 && (
                    <button onClick={exportSRT}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700 transition-colors text-[10px] font-bold">
                      <Download className="w-3 h-3" /> Export as .srt
                    </button>
                  )}
                  {textOverlays.map(t => (
                    <div key={t.id} onClick={() => setSelectedTextId(t.id)}
                      className={`bg-zinc-800 rounded-xl p-3 space-y-3 cursor-pointer ${selectedTextId === t.id ? "ring-1 ring-primary/50" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white truncate font-semibold">{t.text}</span>
                        <button onClick={e => { e.stopPropagation(); deleteText(t.id); }} className="text-zinc-600 hover:text-red-400 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {selectedTextId === t.id && (
                        <div className="space-y-2.5" onClick={e => e.stopPropagation()}>
                          <Input value={t.text} onChange={e => updateText(t.id, { text: e.target.value })}
                            className="bg-zinc-900 border-zinc-700 text-white text-xs h-8" />
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateText(t.id, { bold: !t.bold })}
                              className={`p-1.5 rounded-lg border ${t.bold ? "bg-primary/20 border-primary/40 text-primary" : "border-zinc-700 text-zinc-500"}`}>
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => updateText(t.id, { italic: !t.italic })}
                              className={`p-1.5 rounded-lg border italic ${t.italic ? "bg-primary/20 border-primary/40 text-primary" : "border-zinc-700 text-zinc-500"}`}>
                              <Italic className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex-1 flex items-center gap-1">
                              <span className="text-[10px] text-zinc-600">Size</span>
                              <input type="range" min="16" max="96" value={t.fontSize}
                                onChange={e => updateText(t.id, { fontSize: +e.target.value })}
                                className="flex-1 accent-primary" />
                            </div>
                          </div>
                          {/* Colors */}
                          <div className="flex gap-1.5 flex-wrap">
                            {TXT_CLR.map(c => (
                              <button key={c} onClick={() => updateText(t.id, { color: c })}
                                className="w-5 h-5 rounded-full border-2"
                                style={{ background: c, borderColor: t.color === c ? "#d4b461" : "transparent" }} />
                            ))}
                          </div>
                          {/* Animation */}
                          <div>
                            <p className="text-[9px] text-zinc-500 mb-1">Animation</p>
                            <div className="grid grid-cols-3 gap-1">
                              {TEXT_ANIMS.map(a => (
                                <button key={a.id} onClick={() => updateText(t.id, { animation: a.id })}
                                  className={`py-1 rounded-lg border text-[9px] font-semibold transition-all ${t.animation === a.id ? "bg-primary/20 border-primary/50 text-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Timing */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[9px] text-zinc-600 mb-1">Start (s)</p>
                              <Input type="number" value={t.startTime.toFixed(1)} step="0.1" min={0}
                                onChange={e => updateText(t.id, { startTime: +e.target.value })}
                                className="bg-zinc-900 border-zinc-700 text-white text-xs h-7 px-2" />
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-600 mb-1">End (s)</p>
                              <Input type="number" value={t.endTime.toFixed(1)} step="0.1"
                                onChange={e => updateText(t.id, { endTime: +e.target.value })}
                                className="bg-zinc-900 border-zinc-700 text-white text-xs h-7 px-2" />
                            </div>
                          </div>
                          <p className="text-[9px] text-zinc-600">Drag text on video to reposition</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {!textOverlays.length && <p className="text-zinc-600 text-center py-4">No text. Click Add text.</p>}
                </div>
              )}

              {/* ── Speed ───── */}
              {activeTool === "speed" && selectedClip && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {SPEEDS.map(s => (
                      <button key={s} onClick={() => { pushHistory(); updateClip(selectedClip.id, { speed: +s }); }}
                        className={`py-2 rounded-xl text-xs font-black border transition-all ${selectedClip.speed === +s ? "bg-primary/20 border-primary/50 text-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                        {s}×
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Custom speed</span>
                      <span className="font-mono text-primary">{selectedClip.speed.toFixed(2)}×</span>
                    </div>
                    <input type="range" min="0.1" max="4" step="0.05" value={selectedClip.speed}
                      onChange={e => updateClip(selectedClip.id, { speed: parseFloat(e.target.value) })}
                      onMouseUp={() => pushHistory()}
                      className="w-full accent-primary" />
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between"><span className="text-zinc-500">Original</span><span className="font-mono">{fmtTime(selectedClip.trimEnd - selectedClip.trimStart)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">At {selectedClip.speed.toFixed(2)}×</span><span className="font-mono text-primary">{fmtTime((selectedClip.trimEnd - selectedClip.trimStart) / selectedClip.speed)}</span></div>
                  </div>
                  {/* Speed ramp */}
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Speed Ramp <span className="text-zinc-700 normal-case">(applied on export)</span></p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["none","ease-in","ease-out","ease-both"] as const).map(r => (
                        <button key={r} onClick={() => { pushHistory(); updateClip(selectedClip.id, { speedRamp: r }); }}
                          className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all ${(selectedClip.speedRamp ?? "none") === r ? "bg-primary/20 border-primary/50 text-primary" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                          {r === "none" ? "Linear" : r === "ease-in" ? "Slow→Fast" : r === "ease-out" ? "Fast→Slow" : "Ease Both"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-px bg-zinc-800" />
                  {/* Reverse */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FlipHorizontal2 className="w-3.5 h-3.5 text-zinc-400" />
                      <div>
                        <p className="text-[10px] text-zinc-300 font-semibold">Reverse Clip</p>
                        <p className="text-[8px] text-zinc-600">Plays backwards on export</p>
                      </div>
                    </div>
                    <button onClick={() => { pushHistory(); updateClip(selectedClip.id, { reversed: !selectedClip.reversed }); }}
                      className={`w-9 h-5 rounded-full transition-colors relative ${selectedClip.reversed ? "bg-primary" : "bg-zinc-700"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${selectedClip.reversed ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  {/* Stabilize */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                      <div>
                        <p className="text-[10px] text-zinc-300 font-semibold">Stabilize</p>
                        <p className="text-[8px] text-zinc-600">Removes camera shake on export</p>
                      </div>
                    </div>
                    <button onClick={() => { pushHistory(); updateClip(selectedClip.id, { stabilize: !selectedClip.stabilize }); }}
                      className={`w-9 h-5 rounded-full transition-colors relative ${selectedClip.stabilize ? "bg-blue-500" : "bg-zinc-700"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${selectedClip.stabilize ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Color ───── */}
              {activeTool === "color" && selectedClip && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {COLOR_GRADES.map(g => (
                      <button key={g.id} onClick={() => { pushHistory(); updateClip(selectedClip.id, { colorGrade: g.id }); }}
                        className={`rounded-xl overflow-hidden border-2 transition-all ${selectedClip.colorGrade === g.id ? "border-primary" : "border-zinc-700 hover:border-zinc-500"}`}>
                        <div className={`h-10 bg-gradient-to-br ${g.preview}`} style={{ filter: g.filter }} />
                        <p className={`py-1 text-center text-[10px] font-bold ${selectedClip.colorGrade === g.id ? "text-primary bg-primary/10" : "text-zinc-400 bg-zinc-800/50"}`}>{g.label}</p>
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-zinc-800" />
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Adjustments</p>
                  {([
                    { key: "brightness" as const, label: "Brightness", min: -0.5, max: 0.5, step: 0.01, def: 0 },
                    { key: "contrast"   as const, label: "Contrast",   min: 0.5,  max: 2,   step: 0.05, def: 1 },
                    { key: "saturation" as const, label: "Saturation", min: 0,    max: 3,   step: 0.05, def: 1 },
                    { key: "hue"        as const, label: "Hue",        min: -180, max: 180, step: 1,    def: 0 },
                  ] as { key: keyof Clip; label: string; min: number; max: number; step: number; def: number }[]).map(({ key, label, min, max, step, def }) => {
                    const val = (selectedClip[key] as number | undefined) ?? def;
                    return (
                      <div key={key} className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span>{label}</span>
                          <span className="font-mono">{typeof val === "number" ? (key === "hue" ? `${val.toFixed(0)}°` : val.toFixed(2)) : "—"}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={val as number}
                          onChange={e => { updateClip(selectedClip.id, { [key]: +e.target.value }); }}
                          onMouseUp={() => pushHistory()}
                          className="w-full accent-primary" />
                      </div>
                    );
                  })}
                  <button onClick={() => { pushHistory(); updateClip(selectedClip.id, { brightness: 0, contrast: 1, saturation: 1, hue: 0 }); }}
                    className="w-full text-[10px] text-zinc-500 hover:text-white border border-zinc-700/50 rounded-lg py-1.5 transition-colors">
                    Reset Adjustments
                  </button>
                  <div className="h-px bg-zinc-800" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[10px] text-zinc-300 font-semibold">Vignette</span>
                    </div>
                    <button onClick={() => { pushHistory(); updateClip(selectedClip.id, { vignette: !selectedClip.vignette }); }}
                      className={`w-9 h-5 rounded-full transition-colors relative ${selectedClip.vignette ? "bg-primary" : "bg-zinc-700"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${selectedClip.vignette ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Volume ───── */}
              {activeTool === "volume" && selectedClip && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { pushHistory(); updateClip(selectedClip.id, { muted: !selectedClip.muted }); }}
                      className={`p-2 rounded-lg border ${selectedClip.muted ? "bg-red-500/20 border-red-500/40 text-red-400" : "border-zinc-700 text-zinc-400"}`}>
                      {selectedClip.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>Clip volume</span>
                        <span className={selectedClip.volume > 1 ? "text-amber-400 font-mono" : "font-mono"}>
                          {Math.round(selectedClip.volume * 100)}%{selectedClip.volume > 1 ? " ↑boost" : ""}
                        </span>
                      </div>
                      <input type="range" min="0" max="2" step="0.01" value={selectedClip.volume}
                        onChange={e => updateClip(selectedClip.id, { volume: +e.target.value })}
                        className="w-full accent-primary" disabled={selectedClip.muted} />
                      <div className="flex justify-between text-[8px] text-zinc-700">
                        <span>0%</span><span>100%</span><span>200%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> Master volume</span>
                      <span>{Math.round(masterVolume * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" value={masterVolume}
                      onChange={e => setMasterVolume(+e.target.value)}
                      className="w-full accent-primary" />
                  </div>
                </div>
              )}

              {/* ── Transition ───── */}
              {activeTool === "transition" && selectedTransIdx !== null && (() => {
                const clip = clips[selectedTransIdx + 1];
                if (!clip) return null;
                return (
                  <div className="space-y-3">
                    <p className="text-zinc-400">Between clip {selectedTransIdx + 1} → {selectedTransIdx + 2}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TRANSITIONS.map(tr => (
                        <button key={tr.id}
                          onClick={() => { pushHistory(); updateClip(clip.id, { transition: { ...clip.transition, type: tr.id } }); }}
                          className={`py-2 rounded-xl border text-[10px] font-semibold flex items-center gap-1.5 px-2 transition-all ${clip.transition.type === tr.id ? "bg-primary/20 border-primary/50 text-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                          <span>{tr.icon}</span>{tr.label}
                        </button>
                      ))}
                    </div>
                    {clip.transition.type !== "none" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span>Duration</span><span>{clip.transition.duration.toFixed(1)}s</span>
                        </div>
                        <input type="range" min="0.1" max="1.5" step="0.1" value={clip.transition.duration}
                          onChange={e => updateClip(clip.id, { transition: { ...clip.transition, duration: +e.target.value } })}
                          className="w-full accent-primary" />
                      </div>
                    )}
                  </div>
                );
              })()}
              {activeTool === "transition" && selectedTransIdx === null && (
                <p className="text-zinc-500 text-center py-4">Click a transition pill between clips</p>
              )}

              {/* ── Ken Burns ───── */}
              {activeTool === "kenburns" && selectedClip && (() => {
                const kb = selectedClip.kenBurns;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300 font-semibold">Enable</span>
                      <button onClick={() => { pushHistory(); updateClip(selectedClip.id, { kenBurns: { ...kb, enabled: !kb.enabled } }); }}
                        className={`w-9 h-5 rounded-full transition-colors relative ${kb.enabled ? "bg-primary" : "bg-zinc-700"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${kb.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    {kb.enabled && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-zinc-500"><span>Zoom start</span><span>{kb.zoomStart.toFixed(1)}×</span></div>
                          <input type="range" min="1" max="2.5" step="0.05" value={kb.zoomStart}
                            onChange={e => updateClip(selectedClip.id, { kenBurns: { ...kb, zoomStart: +e.target.value } })}
                            className="w-full accent-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-zinc-500"><span>Zoom end</span><span>{kb.zoomEnd.toFixed(1)}×</span></div>
                          <input type="range" min="1" max="2.5" step="0.05" value={kb.zoomEnd}
                            onChange={e => updateClip(selectedClip.id, { kenBurns: { ...kb, zoomEnd: +e.target.value } })}
                            className="w-full accent-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {([["panXStart","Pan X start"],["panYStart","Pan Y start"],["panXEnd","Pan X end"],["panYEnd","Pan Y end"]] as const).map(([field, label]) => (
                            <div key={field} className="space-y-1">
                              <p className="text-[9px] text-zinc-500">{label}</p>
                              <input type="range" min="-0.3" max="0.3" step="0.01" value={kb[field]}
                                onChange={e => updateClip(selectedClip.id, { kenBurns: { ...kb, [field]: +e.target.value } })}
                                className="w-full accent-primary" />
                            </div>
                          ))}
                        </div>
                        <button onClick={() => updateClip(selectedClip.id, { kenBurns: { ...DEFAULT_KB, enabled: true } })}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300">Reset defaults</button>
                      </>
                    )}
                  </div>
                );
              })()}
              {activeTool === "kenburns" && !selectedClip && (
                <p className="text-zinc-500 text-center py-4">Select a clip first</p>
              )}

              {/* ── AI Tools ───── */}
              {activeTool === "ai" && (
                <div className="space-y-2.5">
                  {!selectedClip && <p className="text-zinc-500 text-center py-2">Select a clip in the timeline</p>}
                  {selectedClip && (
                    <>
                      {/* ── Transcript Editor (Captions.ai-style) ── */}
                      <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50">
                          <div className="flex items-center gap-2">
                            <Type className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[11px] font-bold text-white">Transcript Editor</span>
                          </div>
                          <button
                            onClick={transcribeForEdit}
                            disabled={isTranscribing || !selectedClip.filePath}
                            className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors disabled:opacity-40"
                          >
                            {isTranscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            {clipTranscripts[selectedClip.id] ? "Re-transcribe" : "Transcribe"}
                          </button>
                        </div>

                        {/* Transcript word display */}
                        {clipTranscripts[selectedClip.id] ? (
                          <div className="p-3 space-y-3">
                            <p className="text-[9px] text-zinc-500 leading-relaxed">
                              Click words to mark for deletion. Red = will be cut.
                            </p>

                            {/* Word cloud */}
                            <div className="leading-6 max-h-40 overflow-y-auto">
                              {clipTranscripts[selectedClip.id].map((w, i) => {
                                const key = `${selectedClip.id}|${i}`;
                                const marked = selectedWordKeys.has(key);
                                const isFiller = FILLER_WORDS.has(w.word.toLowerCase().replace(/[.,!?]/g, ""));
                                return (
                                  <span key={i}
                                    onClick={() => {
                                      setSelectedWordKeys(prev => {
                                        const next = new Set(prev);
                                        next.has(key) ? next.delete(key) : next.add(key);
                                        return next;
                                      });
                                    }}
                                    className={`inline-block cursor-pointer px-0.5 rounded text-[11px] transition-all select-none mr-0.5 ${
                                      marked
                                        ? "bg-red-500/30 text-red-400 line-through"
                                        : isFiller
                                          ? "text-amber-400/70 hover:bg-zinc-700"
                                          : "text-zinc-200 hover:bg-zinc-700"
                                    }`}
                                    title={`${w.start.toFixed(2)}s – ${w.end.toFixed(2)}s`}
                                  >
                                    {w.word}
                                  </span>
                                );
                              })}
                            </div>

                            {/* Action bar */}
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                onClick={removeFillersFromTranscript}
                                className="flex items-center gap-1 text-[9px] font-bold px-2 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                              >
                                <Mic2 className="w-3 h-3" /> Remove Fillers
                              </button>
                              <button
                                onClick={() => setSelectedWordKeys(new Set())}
                                disabled={selectedWordKeys.size === 0}
                                className="flex items-center gap-1 text-[9px] font-bold px-2 py-1.5 rounded-lg bg-zinc-700/60 text-zinc-400 border border-zinc-600/50 hover:bg-zinc-700 transition-colors disabled:opacity-40"
                              >
                                Clear
                              </button>
                            </div>

                            {selectedWordKeys.size > 0 && (
                              <button
                                onClick={applyCutsFromTranscript}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-white font-bold text-[11px] transition-colors"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                                Cut {selectedWordKeys.size} word{selectedWordKeys.size !== 1 ? "s" : ""} from video
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="px-3 py-4 text-center">
                            <p className="text-[9px] text-zinc-500">Transcribe to edit by text — delete words, cut fillers, trim without touching the timeline</p>
                          </div>
                        )}
                      </div>

                      {/* ── Other AI tools ── */}
                      <button onClick={autoCaption} disabled={isCaptioning || !selectedClip.filePath}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-50">
                        {isCaptioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4 text-primary" />}
                        <div className="text-left">
                          <p className="font-semibold">Burn Captions</p>
                          <p className="text-[9px] text-zinc-500">4-word chunks · Whisper AI</p>
                        </div>
                      </button>
                      <button onClick={removeSilence} disabled={isRemovingSilence || !selectedClip.filePath}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-50">
                        {isRemovingSilence ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic2 className="w-4 h-4 text-green-400" />}
                        <div className="text-left">
                          <p className="font-semibold">Remove Silence</p>
                          <p className="text-[9px] text-zinc-500">FFmpeg silence detection</p>
                        </div>
                      </button>
                      <button onClick={detectScenes} disabled={isDetectingScenes || !selectedClip.filePath}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-50">
                        {isDetectingScenes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4 text-blue-400" />}
                        <div className="text-left">
                          <p className="font-semibold">Detect Scenes</p>
                          <p className="text-[9px] text-zinc-500">Split at scene changes</p>
                        </div>
                      </button>
                      <div className="flex items-center justify-between py-2 px-3 bg-zinc-800 rounded-xl">
                        <div>
                          <p className="font-semibold text-zinc-200">Noise Reduction</p>
                          <p className="text-[9px] text-zinc-500">AI audio cleanup on export</p>
                        </div>
                        <button onClick={() => { pushHistory(); updateClip(selectedClip.id, { noiseReduce: !selectedClip.noiseReduce }); }}
                          className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${selectedClip.noiseReduce ? "bg-primary" : "bg-zinc-700"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${selectedClip.noiseReduce ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Music ───── */}
              {activeTool === "music" && (
                <div className="space-y-3">
                  <button onClick={() => audioFileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors text-xs font-bold">
                    <Plus className="w-4 h-4" /> Import MP3 / WAV
                  </button>
                  {/* Narration recorder */}
                  {isRecording ? (
                    <button onClick={stopRecording}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-bold animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      Stop ({recordingTime.toFixed(1)}s)
                    </button>
                  ) : (
                    <button onClick={startRecording}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-bold">
                      <Mic2 className="w-4 h-4" /> Record Narration
                    </button>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500"><span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> Master</span><span>{Math.round(masterVolume * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.01" value={masterVolume}
                      onChange={e => setMasterVolume(+e.target.value)} className="w-full accent-primary" />
                  </div>
                  {/* Audio ducking */}
                  <div className="bg-zinc-800/60 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-300 font-semibold">Duck music during clips</span>
                      <button onClick={() => setAudioDuckEnabled(e => !e)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${audioDuckEnabled ? "bg-primary" : "bg-zinc-700"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${audioDuckEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    {audioDuckEnabled && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span>Duck to</span><span className="font-mono">{Math.round(audioDuckLevel * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="0.9" step="0.05" value={audioDuckLevel}
                          onChange={e => setAudioDuckLevel(+e.target.value)} className="w-full accent-primary" />
                      </div>
                    )}
                  </div>
                  {audioTracks.map(at => (
                    <div key={at.id} onClick={() => setSelectedAudioId(at.id)}
                      className={`bg-zinc-800 rounded-xl p-3 space-y-2 cursor-pointer ${selectedAudioId === at.id ? "ring-1 ring-green-500/50" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Music className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          <span className="text-white truncate font-semibold">{at.name}</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); pushHistory(); setAudioTracks(prev => prev.filter(a => a.id !== at.id)); if (selectedAudioId === at.id) setSelectedAudioId(null); }}
                          className="text-zinc-600 hover:text-red-400 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {selectedAudioId === at.id && (
                        <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-between text-[10px] text-zinc-500"><span>Volume</span><span>{Math.round(at.volume * 100)}%</span></div>
                          <input type="range" min="0" max="1" step="0.01" value={at.volume}
                            onChange={e => setAudioTracks(prev => prev.map(a => a.id === at.id ? { ...a, volume: +e.target.value } : a))}
                            className="w-full accent-green-500" />
                          <div className="flex justify-between text-[10px] text-zinc-500"><span>Offset</span><span>{at.startOffset.toFixed(1)}s</span></div>
                          <p className="text-[9px] text-zinc-600">Drag the track in the timeline to reposition</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Beat sync */}
                  {audioTracks.length > 0 && (
                    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-200">Beat Sync</p>
                          <p className="text-[9px] text-zinc-500">{beatTimestamps.length ? `${beatTimestamps.length} beats detected` : "Detect beats, then snap clips"}</p>
                        </div>
                        <button onClick={() => detectBeatsFromTrack(audioTracks[0])} disabled={isDetectingBeats}
                          className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 disabled:opacity-40 transition-colors">
                          {isDetectingBeats ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          Detect
                        </button>
                      </div>
                      {beatTimestamps.length > 0 && (
                        <button onClick={snapClipsToBeats}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors text-[10px] font-bold">
                          <Music className="w-3.5 h-3.5" /> Snap {clips.length} clips to beats
                        </button>
                      )}
                    </div>
                  )}
                  {!audioTracks.length && <p className="text-zinc-600 text-center py-4">No music yet. Import an MP3.</p>}
                </div>
              )}

              {/* ── B-Roll ───── */}
              {activeTool === "broll" && (
                <div className="space-y-3">
                  <button onClick={() => brollFileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors text-xs font-bold">
                    <Plus className="w-4 h-4" /> Import B-Roll Clip
                  </button>
                  {brollClips.map(b => (
                    <div key={b.id} onClick={() => setSelectedBrollId(b.id)}
                      className={`bg-zinc-800 rounded-xl p-3 space-y-2 cursor-pointer ${selectedBrollId === b.id ? "ring-1 ring-primary/50" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <PictureInPicture2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-white truncate font-semibold">{b.file.name}</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); pushHistory(); setBrollClips(prev => prev.filter(x => x.id !== b.id)); if (selectedBrollId === b.id) setSelectedBrollId(null); }}
                          className="text-zinc-600 hover:text-red-400 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {selectedBrollId === b.id && (
                        <div className="space-y-2" onClick={e => e.stopPropagation()}>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[9px] text-zinc-600 mb-1">Size</p>
                              <input type="range" min="0.1" max="0.8" step="0.05" value={b.width}
                                onChange={e => setBrollClips(prev => prev.map(x => x.id === b.id ? { ...x, width: +e.target.value } : x))}
                                className="w-full accent-primary" />
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-600 mb-1">Start (s)</p>
                              <Input type="number" value={b.startGlobal.toFixed(1)} step="0.1" min={0}
                                onChange={e => setBrollClips(prev => prev.map(x => x.id === b.id ? { ...x, startGlobal: +e.target.value } : x))}
                                className="bg-zinc-900 border-zinc-700 text-white text-xs h-7 px-2" />
                            </div>
                          </div>
                          <p className="text-[9px] text-zinc-600">Drag the PiP box in preview to reposition</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {!brollClips.length && <p className="text-zinc-600 text-center py-4">No B-roll yet. Import a clip.</p>}
                </div>
              )}

              {/* ── Clip info (no tool) ───── */}
              {activeTool === "none" && selectedClip && (
                <div className="space-y-3">
                  {/* Thumbnail */}
                  <div className="bg-zinc-800 rounded-xl overflow-hidden relative group"
                    style={{ aspectRatio: aspectRatio === "9:16" ? "9/16" : aspectRatio === "1:1" ? "1/1" : "16/9" }}>
                    {selectedClip.thumbnails[0]
                      ? <img src={selectedClip.thumbnails[0]} className="w-full h-full object-contain" alt="" />
                      : <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
                        </div>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={generateThumbnail} title="Download thumbnail"
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[9px] backdrop-blur-sm transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between items-center">
                      <span className="text-[8px] font-mono text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {fmtTime(selectedClip.trimEnd - selectedClip.trimStart)}
                      </span>
                      {selectedClip.speed !== 1 && (
                        <span className="text-[8px] font-bold text-primary bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                          {selectedClip.speed}×
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Filename */}
                  <p className="text-[10px] text-zinc-400 truncate font-medium px-0.5" title={selectedClip.file.name}>
                    {selectedClip.file.name}
                  </p>

                  {/* Active effects badges */}
                  {(() => {
                    const badges: { label: string; color: string }[] = [];
                    if (selectedClip.colorGrade !== "none") badges.push({ label: selectedClip.colorGrade, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" });
                    if (selectedClip.kenBurns.enabled)      badges.push({ label: "Ken Burns", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" });
                    if (selectedClip.noiseReduce)           badges.push({ label: "Denoise", color: "text-green-400 bg-green-500/10 border-green-500/20" });
                    if (selectedClip.vignette)              badges.push({ label: "Vignette", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" });
                    if (selectedClip.reversed)              badges.push({ label: "Reversed", color: "text-red-400 bg-red-500/10 border-red-500/20" });
                    if (selectedClip.stabilize)             badges.push({ label: "Stabilize", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" });
                    if ((selectedClip.speedRamp ?? "none") !== "none") badges.push({ label: `Ramp: ${selectedClip.speedRamp}`, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" });
                    if (!badges.length) return null;
                    return (
                      <div className="flex flex-wrap gap-1">
                        {badges.map(b => (
                          <span key={b.label} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border capitalize ${b.color}`}>{b.label}</span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Inline trim */}
                  <div className="bg-zinc-800/60 rounded-xl p-3 space-y-2">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Trim</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-zinc-600 mb-1">In (s)</p>
                        <Input type="number" value={selectedClip.trimStart.toFixed(2)} step="0.1" min={0} max={selectedClip.trimEnd - 0.1}
                          onChange={e => { pushHistory(); updateClip(selectedClip.id, { trimStart: Math.max(0, Math.min(selectedClip.trimEnd - 0.1, +e.target.value)) }); }}
                          className="bg-zinc-900 border-zinc-700 text-white text-xs h-7 px-2" />
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-600 mb-1">Out (s)</p>
                        <Input type="number" value={selectedClip.trimEnd.toFixed(2)} step="0.1" max={selectedClip.duration}
                          onChange={e => { pushHistory(); updateClip(selectedClip.id, { trimEnd: Math.min(selectedClip.duration, Math.max(selectedClip.trimStart + 0.1, +e.target.value)) }); }}
                          className="bg-zinc-900 border-zinc-700 text-white text-xs h-7 px-2" />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => duplicateClip(selectedClip.id)}
                      className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs">
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <button onClick={() => deleteClip(selectedClip.id)}
                      className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-xs">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              )}

              {/* ── Project stats (no tool, no clip) ───── */}
              {activeTool === "none" && !selectedClip && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-black text-white">{clips.length}</p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Clips</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-black text-primary font-mono">{fmtTime(totDur)}</p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Duration</p>
                    </div>
                  </div>
                  <div className="bg-zinc-800/60 rounded-xl p-3 space-y-1.5 text-[10px]">
                    <div className="flex justify-between"><span className="text-zinc-500">Format</span><span>{aspectRatio} · {exportQuality} · {exportFps}fps</span></div>
                    {textOverlays.length > 0 && <div className="flex justify-between"><span className="text-zinc-500">Captions</span><span>{textOverlays.length}</span></div>}
                    {audioTracks.length > 0 && <div className="flex justify-between"><span className="text-zinc-500">Music</span><span>{audioTracks.length} track{audioTracks.length > 1 ? "s" : ""}</span></div>}
                    {brollClips.length > 0 && <div className="flex justify-between"><span className="text-zinc-500">B-roll</span><span>{brollClips.length}</span></div>}
                    {markers.length > 0 && <div className="flex justify-between"><span className="text-zinc-500">Markers</span><span>{markers.length}</span></div>}
                    {watermarkPath && <div className="flex justify-between"><span className="text-zinc-500">Watermark</span><span className="text-primary">On</span></div>}
                  </div>
                  <div className="bg-zinc-800/40 rounded-xl p-3">
                    <p className="text-[9px] text-zinc-500 mb-1.5 font-semibold uppercase tracking-wider">Shortcuts</p>
                    <div className="space-y-1 text-[9px] text-zinc-600">
                      {[
                        ["Space", "Play / Pause"],
                        ["S", "Split at playhead"],
                        ["Del", "Delete selected clip"],
                        ["← →", "Step one frame"],
                        ["M", "Add timeline marker"],
                        ["⌘Z / ⌘⇧Z", "Undo / Redo"],
                        ["⌘D", "Duplicate clip"],
                      ].map(([key, desc]) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 flex-shrink-0">{key}</kbd>
                          <span className="text-zinc-600">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-700 text-center">Click a clip to inspect it</p>
                </div>
              )}

              {/* Fallback: tool needs clip */}
              {["speed","color","kenburns"].includes(activeTool) && !selectedClip && (
                <p className="text-zinc-500 text-center py-4">Select a clip in the timeline first</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Tool dock ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-0.5 py-1.5 border-t border-zinc-800 bg-zinc-900 flex-shrink-0 flex-wrap">
          {TOOL_DOCK.map(({ id, icon: Icon, label }) => (
            <button key={id}
              onClick={() => setActiveTool(prev => prev === id ? "none" : id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${activeTool === id ? "text-primary bg-primary/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-semibold">{label}</span>
            </button>
          ))}
          <div className="w-px h-6 bg-zinc-800 mx-1" />
          <button onClick={() => setZoom(z => Math.min(300, z + 30))} className="p-1.5 text-zinc-600 hover:text-zinc-300" title="Zoom in timeline">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom(z => Math.max(20, z - 30))} className="p-1.5 text-zinc-600 hover:text-zinc-300" title="Zoom out timeline">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Timeline ────────────────────────────────────────────────────────── */}
        <div className="border-t border-zinc-800 bg-zinc-950 flex-shrink-0" style={{ height: "200px" }}>
          <div className="h-full overflow-x-auto overflow-y-hidden relative" ref={timelineRef}
            onMouseDown={onTimelineMouseDown}
            onMouseMove={e => { if (!draggingPlayRef.current) setHoverTime(timelineXToTime(e.clientX)); }}
            onMouseLeave={() => setHoverTime(null)}
            style={{ cursor: "default" }}>
            <div style={{ width: `${contentWidth}px`, minWidth: "100%", height: "100%", position: "relative" }}>

              {/* Time ruler */}
              <div className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-800" style={{ height: "20px", width: `${contentWidth}px` }}>
                {totDur > 0 && Array.from({ length: Math.ceil(totDur) + 1 }).map((_, i) => (
                  <div key={i} className="absolute flex flex-col items-center" style={{ left: `${(i / totDur) * contentWidth}px` }}>
                    <span className="text-[8px] text-zinc-600 font-mono">{i}s</span>
                    <div className="w-px h-2 bg-zinc-700" />
                  </div>
                ))}
              </div>

              {/* Text overlay track */}
              <div className="absolute" style={{ top: "20px", left: 0, right: 0, height: "18px", width: `${contentWidth}px` }}>
                {textOverlays.map(t => (
                  <div key={t.id} data-notimeline
                    className={`absolute top-1 h-4 rounded-sm flex items-center px-1.5 cursor-pointer pointer-events-auto ${selectedTextId === t.id ? "bg-primary/70" : "bg-primary/30 hover:bg-primary/50"}`}
                    style={{ left: totDur > 0 ? `${(t.startTime / totDur) * contentWidth}px` : "0", width: totDur > 0 ? `${((t.endTime - t.startTime) / totDur) * contentWidth}px` : "0", minWidth: "4px" }}
                    onClick={e => { e.stopPropagation(); setSelectedTextId(t.id); setActiveTool("text"); }}>
                    <span className="text-[7px] text-white truncate">{t.text}</span>
                  </div>
                ))}
              </div>

              {/* Clip filmstrip row */}
              <div className="absolute flex gap-0.5" style={{ top: "38px", left: 0, height: "96px", width: `${contentWidth}px` }}>
                {clips.map((clip, idx) => {
                  const effDur   = (clip.trimEnd - clip.trimStart) / clip.speed;
                  const widthPx  = totDur > 0 ? (effDur / totDur) * contentWidth : contentWidth / clips.length;
                  const clipLeft = totDur > 0 ? (clipStartGlobalTime(clips, idx) / totDur) * contentWidth : 0;
                  const isSelected = selectedClipId === clip.id;
                  const isDragOver = dragOverIdx === idx;
                  const grade = COLOR_GRADES.find(g => g.id === clip.colorGrade);

                  const isCurrentlyPlaying = isPlaying && (() => { const info = clipAtGlobalTime(clips, globalTime); return info?.clip.id === clip.id; })();

                  return (
                    <div key={clip.id}
                      className={`absolute h-full rounded-lg overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0
                        ${isSelected ? "border-primary shadow-[0_0_12px_rgba(212,180,97,0.4)]" : isCurrentlyPlaying ? "border-white/60 shadow-[0_0_8px_rgba(255,255,255,0.15)]" : "border-zinc-700 hover:border-zinc-500"}
                        ${isDragOver ? "border-l-4 border-l-primary" : ""}
                        ${dragClipId === clip.id ? "opacity-50" : ""}`}
                      style={{ left: `${clipLeft}px`, width: `${widthPx}px`, minWidth: "30px" }}
                      onClick={e => { e.stopPropagation(); setSelectedClipId(clip.id); }}
                      onMouseEnter={() => { if (dragClipId) setDragOverIdx(idx); }}
                      onMouseDown={e => {
                        if ((e.target as HTMLElement).closest("[data-trimhandle]")) return;
                        dragStartPos.current = { x: e.clientX, y: e.clientY };
                        const startId = clip.id;
                        const startMove = (me: MouseEvent) => {
                          if (!dragStartPos.current) return;
                          const dist = Math.hypot(me.clientX - dragStartPos.current.x, me.clientY - dragStartPos.current.y);
                          if (dist > 8) { setDragClipId(startId); window.removeEventListener("mousemove", startMove); }
                        };
                        window.addEventListener("mousemove", startMove);
                        window.addEventListener("mouseup", () => window.removeEventListener("mousemove", startMove), { once: true });
                      }}
                    >
                      {/* Filmstrip */}
                      <div className="absolute inset-0 flex overflow-hidden" style={{ filter: grade?.filter }}>
                        {clip.thumbnails.length > 0
                          ? clip.thumbnails.map((th, ti) => (
                            <img key={ti} src={th} className="h-full flex-shrink-0 object-cover"
                              style={{ width: `${100 / clip.thumbnails.length}%` }} alt="" draggable={false} />
                          ))
                          : <div className="flex-1 bg-zinc-800 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                          </div>
                        }
                      </div>

                      {/* Waveform SVG */}
                      {clip.waveform.length > 0 && (
                        <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" preserveAspectRatio="none">
                          <g fill="white">
                            {clip.waveform.map((amp, wi) => (
                              <rect key={wi}
                                x={`${(wi / clip.waveform.length) * 100}%`}
                                y={`${50 - amp * 45}%`}
                                width={`${102 / clip.waveform.length}%`}
                                height={`${amp * 90}%`} />
                            ))}
                          </g>
                        </svg>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

                      {/* Clip info */}
                      <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                        <span className="text-[7px] text-white/80 font-mono">{fmtTime(effDur)}</span>
                        <div className="flex items-center gap-1">
                          {clip.speed !== 1 && <span className="text-[7px] text-primary font-bold">{clip.speed}×</span>}
                          {clip.muted && <VolumeX className="w-2.5 h-2.5 text-red-400" />}
                          {clip.kenBurns.enabled && <Move className="w-2.5 h-2.5 text-blue-400" />}
                          {clip.noiseReduce && <Mic2 className="w-2.5 h-2.5 text-green-400" />}
                          {clip.reversed && <RotateCcw className="w-2.5 h-2.5 text-red-300" />}
                          {clip.vignette && <Eye className="w-2.5 h-2.5 text-purple-400" />}
                          {clip.stabilize && <FlipHorizontal2 className="w-2.5 h-2.5 text-cyan-400" />}
                        </div>
                      </div>
                      <div className="absolute top-1 left-1.5 text-[7px] text-white/50 font-bold">{idx + 1}</div>
                      <div className="absolute top-1 left-5 right-1.5 text-[7px] text-white/50 truncate pointer-events-none leading-tight">
                        {clip.file.name.replace(/\.[^.]+$/, '').slice(0, 24)}
                      </div>

                      {/* Trim handles */}
                      <div data-notimeline data-trimhandle
                        className="absolute left-0 top-0 bottom-0 w-3.5 bg-primary/80 cursor-ew-resize z-10 flex items-center justify-center hover:bg-primary transition-colors"
                        onMouseDown={e => { e.stopPropagation(); pushHistory(); draggingTrimRef.current = { clipId: clip.id, handle: "start" }; }}>
                        <div className="w-0.5 h-6 bg-black/50 rounded" />
                      </div>
                      <div data-notimeline data-trimhandle
                        className="absolute right-0 top-0 bottom-0 w-3.5 bg-primary/80 cursor-ew-resize z-10 flex items-center justify-center hover:bg-primary transition-colors"
                        onMouseDown={e => { e.stopPropagation(); pushHistory(); draggingTrimRef.current = { clipId: clip.id, handle: "end" }; }}>
                        <div className="w-0.5 h-6 bg-black/50 rounded" />
                      </div>
                    </div>
                  );
                })}

                {/* Transition pills between clips */}
                {clips.slice(0, -1).map((_, i) => {
                  const nextStart = clipStartGlobalTime(clips, i + 1);
                  const pillLeft  = totDur > 0 ? (nextStart / totDur) * contentWidth : 0;
                  const trans = clips[i + 1].transition;
                  return (
                    <div key={`tr-${i}`} data-notimeline
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer w-5 h-14 rounded flex flex-col items-center justify-center transition-colors
                        ${selectedTransIdx === i && activeTool === "transition" ? "bg-primary/80" : trans.type !== "none" ? "bg-blue-500/60 hover:bg-blue-500/80" : "bg-zinc-700/60 hover:bg-zinc-600/80"}`}
                      style={{ left: `${pillLeft}px` }}
                      onClick={e => { e.stopPropagation(); setSelectedTransIdx(i); setActiveTool("transition"); }}>
                      <Film className="w-3 h-3 text-white/70" />
                      {trans.type !== "none" && <span className="text-[6px] text-white/80 font-bold mt-0.5">{trans.duration}s</span>}
                    </div>
                  );
                })}

                {/* Add clip */}
                <button data-notimeline
                  className="absolute flex-shrink-0 h-full w-10 rounded-lg border-2 border-dashed border-zinc-700 hover:border-primary/40 flex items-center justify-center transition-colors"
                  style={{ left: `${contentWidth + 4}px` }}
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                  <Plus className="w-4 h-4 text-zinc-600" />
                </button>
              </div>

              {/* B-roll track */}
              {brollClips.length > 0 && (
                <div className="absolute" style={{ top: "134px", left: 0, height: "32px", width: `${contentWidth}px` }}>
                  <div className="h-full w-full relative">
                    {brollClips.map(b => {
                      const left  = totDur > 0 ? (b.startGlobal / totDur) * contentWidth : 0;
                      const width = totDur > 0 ? ((b.endGlobal - b.startGlobal) / totDur) * contentWidth : 60;
                      return (
                        <div key={b.id} data-notimeline
                          className={`absolute top-1 h-7 rounded-lg overflow-hidden border cursor-pointer ${selectedBrollId === b.id ? "border-primary" : "border-purple-500/40"}`}
                          style={{ left: `${left}px`, width: `${Math.max(width, 20)}px` }}
                          onClick={e => { e.stopPropagation(); setSelectedBrollId(b.id); setActiveTool("broll"); }}>
                          <div className="h-full bg-purple-500/20 flex items-center px-1.5 gap-1">
                            <PictureInPicture2 className="w-3 h-3 text-purple-400 flex-shrink-0" />
                            <span className="text-[8px] text-purple-300 truncate">{b.file.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Audio track row */}
              {audioTracks.length > 0 && (
                <div className="absolute" style={{ top: brollClips.length > 0 ? "166px" : "134px", left: 0, height: "32px", width: `${contentWidth}px` }}>
                  {audioTracks.map(at => {
                    const left  = totDur > 0 ? (at.startOffset / totDur) * contentWidth : 0;
                    const width = totDur > 0 ? (at.duration / totDur) * contentWidth : contentWidth;
                    return (
                      <div key={at.id} data-notimeline
                        className={`absolute top-1 h-7 rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing ${selectedAudioId === at.id ? "border-green-400" : "border-green-500/30"}`}
                        style={{ left: `${left}px`, width: `${Math.max(width, 30)}px` }}
                        onMouseDown={e => {
                          e.stopPropagation(); setSelectedAudioId(at.id); setActiveTool("music");
                          draggingAudioRef.current = { id: at.id, startX: e.clientX, startOffset: at.startOffset };
                        }}
                        onClick={e => e.stopPropagation()}>
                        <div className="h-full bg-green-500/15 relative overflow-hidden">
                          {at.waveform.length > 0 && (
                            <svg className="absolute inset-0 w-full h-full opacity-60" preserveAspectRatio="none">
                              <g fill="#22c55e">
                                {at.waveform.map((amp, wi) => (
                                  <rect key={wi}
                                    x={`${(wi / at.waveform.length) * 100}%`}
                                    y={`${50 - amp * 45}%`}
                                    width={`${102 / at.waveform.length}%`}
                                    height={`${amp * 90}%`} />
                                ))}
                              </g>
                            </svg>
                          )}
                          <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                            <Music className="w-3 h-3 text-green-400 flex-shrink-0 mr-1" />
                            <span className="text-[8px] text-green-300 truncate">{at.name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Beat markers */}
              {beatTimestamps.map((t, i) => (
                <div key={i} className="absolute top-5 bottom-0 pointer-events-none z-20 w-px bg-green-500/30"
                  style={{ left: totDur > 0 ? `${(t / totDur) * contentWidth}px` : 0 }}>
                  <div className="w-1 h-1 bg-green-500/60 rounded-full -ml-0.5" />
                </div>
              ))}

              {/* Timeline markers */}
              {markers.map(m => (
                <div key={m.id} className="absolute top-0 bottom-0 z-25 group"
                  style={{ left: totDur > 0 ? `${(m.time / totDur) * contentWidth}px` : 0 }}>
                  <div className="w-px h-full opacity-60" style={{ background: m.color }} />
                  <div className="absolute top-0 -translate-x-1/2 cursor-pointer" title={m.label}
                    onClick={e => { e.stopPropagation(); setGlobalTime(m.time); }}>
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent"
                      style={{ borderTopColor: m.color }} />
                  </div>
                  <div className="absolute top-8 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[7px] font-bold px-1 py-0.5 rounded whitespace-nowrap"
                      style={{ background: m.color, color: "#000" }}>{m.label}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setMarkers(prev => prev.filter(x => x.id !== m.id)); }}
                    className="absolute top-6 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-white bg-red-500 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">
                    ×
                  </button>
                </div>
              ))}

              {/* Ghost playhead on hover */}
              {hoverTime !== null && totDur > 0 && (
                <div className="absolute top-0 bottom-0 pointer-events-none z-20"
                  style={{ left: `${(hoverTime / totDur) * 100}%` }}>
                  <div className="w-px h-full bg-white/30" />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800/90 border border-zinc-700 rounded px-1.5 py-0.5 text-[8px] font-mono text-zinc-400 whitespace-nowrap">
                    {fmtTime(hoverTime)}
                  </div>
                </div>
              )}

              {/* Playhead */}
              <div className="absolute top-0 bottom-0 pointer-events-none z-30"
                style={{ left: `${playheadPct}%` }}>
                <div className="w-0.5 h-full bg-white/90 relative">
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[8px] font-mono text-white whitespace-nowrap">
                    {fmtTime(globalTime)}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Edit Onboarding Overlay ──────────────────────────────────────── */}
      {showOnboarding && clips.length > 0 && (() => {
        const firstClip = clips[0];
        const analysis = clipAnalysis[firstClip.id];
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowOnboarding(false)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 bg-primary/15 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Wand2 className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-black text-white">Your clip is ready</h2>
                  {analysis && (
                    <p className="text-sm text-zinc-400 mt-1">
                      Found <span className="text-amber-400 font-bold">{analysis.silenceCount} silent gaps</span> — AI can clean those up instantly.
                    </p>
                  )}
                  {!analysis && <p className="text-sm text-zinc-500 mt-1">What would you like to do first?</p>}
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => firstClip && autoEdit(firstClip)}
                    disabled={isAutoEditing || !firstClip?.filePath}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-primary text-black font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {isAutoEditing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    <div className="text-left">
                      <p className="font-black">Auto-Edit</p>
                      <p className="text-xs font-normal opacity-70">Remove silences + add captions in one click</p>
                    </div>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setShowOnboarding(false); firstClip && getHighlights(firstClip); }}
                      disabled={!firstClip?.filePath}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 disabled:opacity-50 transition-colors text-xs font-bold">
                      <Zap className="w-4 h-4 text-purple-400" /> Get Highlights
                    </button>
                    <button onClick={() => { setShowOnboarding(false); setSelectedClipId(firstClip?.id ?? null); autoCaption(); }}
                      disabled={!firstClip?.filePath}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors text-xs font-bold">
                      <Type className="w-4 h-4" /> Add Captions
                    </button>
                  </div>
                  <button onClick={() => setShowOnboarding(false)}
                    className="w-full py-2.5 rounded-xl text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                    Start editing manually →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Export progress overlay ─────────────────────────────────────────────── */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-8 w-80 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-white font-black text-lg">Rendering…</p>
              <p className="text-zinc-400 text-sm mt-1">{exportProgress || "Processing with FFmpeg"}</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "Uploading clips", done: exportProgress !== "Sending to server…" && !!exportProgress },
                { label: "Processing video", done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-green-500" : "bg-zinc-700"}`}>
                    {step.done && <span className="text-white text-[8px] font-black">✓</span>}
                  </div>
                  <span className={step.done ? "text-zinc-300 line-through" : "text-zinc-400"}>{step.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600">Large files may take a minute…</p>
          </div>
        </div>
      )}

      {/* ── AI Chat Widget ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {isChatOpen && (
          <div className="w-80 h-[420px] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-white">AI Editor</span>
                <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">beta</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
              {chatMessages.length === 0 && (
                <div className="text-center py-6">
                  <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                  <p className="text-xs text-zinc-500 mb-3">Describe how you want to edit your video</p>
                  <div className="space-y-1.5">
                    {[
                      "Remove silences from clip 1",
                      "Add captions to the selected clip",
                      "Make it 1.5x speed with cinematic filter",
                      "Remove filler words like um and uh",
                    ].map(ex => (
                      <button key={ex} onClick={() => setChatInput(ex)}
                        className="block w-full text-left text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors">
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role === "user" ? "bg-primary text-black font-medium" : "bg-zinc-800 text-zinc-200"}`}>
                    {m.content}
                    {m.actions?.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.actions.map(a => (
                          <span key={a} className="text-[9px] bg-zinc-700/80 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{a}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="text-[10px] text-zinc-400">Thinking…</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-zinc-800 flex gap-2 flex-shrink-0">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                placeholder="e.g. remove silences and add captions"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 min-w-0"
              />
              <button onClick={sendChatMessage} disabled={!chatInput.trim() || isChatLoading}
                className="w-8 h-8 rounded-xl bg-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors">
                <SendHorizonal className="w-3.5 h-3.5 text-black" />
              </button>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button onClick={() => setIsChatOpen(v => !v)}
          className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all hover:scale-105 ${isChatOpen ? "bg-zinc-700 text-white" : "bg-primary text-black"}`}>
          {isChatOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}
