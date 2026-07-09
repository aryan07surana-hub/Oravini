import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play, Pause, Upload, Download, Scissors, Zap, Palette,
  Type, Trash2, Plus, ChevronLeft, Loader2,
  Bold, Italic, Volume2, VolumeX, ZoomIn, ZoomOut,
  ChevronRight, ChevronDown, Copy, SkipBack, SkipForward,
  Music, Wand2, Film, Mic2, Sliders,
  PictureInPicture2, Undo2, Redo2, Move,
  Hash, Sparkles, Languages, Subtitles,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ColorGrade   = "none" | "warm" | "cool" | "cinematic" | "vivid" | "bw";
type AspectRatio  = "16:9" | "9:16" | "1:1";
type TextAnim     = "none" | "fade" | "pop" | "typewriter" | "slide-up";
type TransType    = "none" | "fade" | "dissolve" | "wipe-left" | "wipe-right" | "zoom" | "slide-left";
type ActiveTool   = "none" | "split" | "text" | "speed" | "color" | "volume"
                  | "transition" | "kenburns" | "ai" | "music" | "broll" | "teleprompter" | "dub";
type CaptionStyle = "bold" | "neon" | "minimal" | "filled" | "gradient" | "highlight";

interface CaptionWord {
  word: string; start: number; end: number;
}

interface CaptionTrack {
  words: CaptionWord[];
  style: CaptionStyle;
  fontSize: number;
  y: number;
  color: string;
  highlightColor: string;
}

interface TextOverlay {
  id: string; text: string; x: number; y: number;
  fontSize: number; color: string; bold: boolean; italic: boolean;
  startTime: number; endTime: number;
  animation: TextAnim; animDur: number;
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
  transition: Transition; // transition from previous clip INTO this clip
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

const TOOL_DOCK: { id: ActiveTool; icon: any; label: string }[] = [
  { id: "split",      icon: Scissors,        label: "Split"      },
  { id: "text",       icon: Type,            label: "Text"       },
  { id: "speed",      icon: Zap,             label: "Speed"      },
  { id: "color",      icon: Palette,         label: "Filter"     },
  { id: "volume",     icon: Volume2,         label: "Volume"     },
  { id: "transition", icon: Film,            label: "Transition" },
  { id: "kenburns",   icon: Move,            label: "Ken Burns"  },
  { id: "ai",         icon: Wand2,           label: "AI Tools"   },
  { id: "teleprompter", icon: Hash,          label: "Script"     },
  { id: "music",      icon: Music,           label: "Music"      },
  { id: "broll",      icon: PictureInPicture2, label: "B-Roll"   },
];

const DUB_LANGUAGES = [
  { code: "es", label: "Spanish" }, { code: "fr", label: "French" },
  { code: "de", label: "German" }, { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" }, { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" }, { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" }, { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" }, { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" }, { code: "tr", label: "Turkish" },
  { code: "vi", label: "Vietnamese" },
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
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);

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

  // ── Word-by-word captions ──────────────────────────────────────────────────────
  const [captionTrack, setCaptionTrack]                 = useState<CaptionTrack | null>(null);
  const [captionStyle, setCaptionStyle]                 = useState<CaptionStyle>("bold");
  const [isGeneratingBroll, setIsGeneratingBroll]       = useState(false);

  // ── Dubbing ─────────────────────────────────────────────────────────────────────
  const [dubbedTracks, setDubbedTracks]                 = useState<Record<string, CaptionWord[]>>({});
  const [selectedDubLang, setSelectedDubLang]           = useState<string | null>(null);
  const [isTranslating, setIsTranslating]               = useState(false);

  // ── Teleprompter ────────────────────────────────────────────────────────────────
  const [teleprompterScript, setTeleprompterScript]     = useState("");
  const [teleprompterVisible, setTeleprompterVisible]   = useState(false);
  const [teleprompterSpeed, setTeleprompterSpeed]       = useState(1);
  const teleprompterRef                                 = useRef<HTMLDivElement>(null);
  const teleprompterPosRef                              = useRef(0);

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
  const captionTrackRef = useRef<CaptionTrack | null>(null);

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
  useEffect(() => { captionTrackRef.current = captionTrack; }, [captionTrack]);

  // ─── Word-by-word caption helper ──────────────────────────────────────────────
  const getActiveWordIndex = (words: CaptionWord[], time: number): number => {
    return words.findIndex(w => time >= w.start && time < w.end);
  };

  const captionStyles: Record<CaptionStyle, { label: string; desc: string; preview: string }> = {
    bold:       { label: "Bold",       desc: "Bold white with yellow highlight",       preview: "bg-white text-black" },
    neon:       { label: "Neon",       desc: "Cyan glow with scale pop",               preview: "bg-cyan-500 text-black" },
    minimal:    { label: "Minimal",    desc: "Small text, subtle underline",            preview: "bg-transparent text-white border-b" },
    filled:     { label: "Filled Box", desc: "Highlight words in colored boxes",        preview: "bg-yellow-500 text-black" },
    gradient:   { label: "Gradient",   desc: "Gradient text with no background",        preview: "bg-gradient-to-r from-pink-500 to-cyan-500 text-white" },
    highlight:  { label: "Highlight",  desc: "Highlighter pen effect",                  preview: "bg-yellow-300/80 text-black" },
  };

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

  // ─── Playback RAF loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    const tick = (now: number) => {
      const dt = lastTickRef.current ? (now - lastTickRef.current) / 1000 : 0;
      lastTickRef.current = now;
      setGlobalTime(prev => {
        const next = prev + dt;
        if (next >= totDurRef.current) { setIsPlaying(false); return Math.max(0, totDurRef.current - 0.01); }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying]);

  // ─── Teleprompter auto-scroll during playback ─────────────────────────────────
  useEffect(() => {
    teleprompterPosRef.current = 0;
    if (teleprompterRef.current) teleprompterRef.current.style.transform = "translateY(0)";
  }, [teleprompterScript]);

  useEffect(() => {
    if (!isPlaying || !teleprompterVisible || !teleprompterScript) return;
    const el = teleprompterRef.current;
    if (!el) return;
    const scrollPxPerSec = teleprompterSpeed * 55;
    const interval = setInterval(() => {
      teleprompterPosRef.current += scrollPxPerSec * 0.05;
      el.style.transform = `translateY(${-teleprompterPosRef.current}px)`;
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, teleprompterVisible, teleprompterScript, teleprompterSpeed]);

  // ─── Sync double-buffered video to globalTime ─────────────────────────────────
  useEffect(() => {
    if (!clips.length) return;
    const info = clipAtGlobalTime(clips, globalTime);
    if (!info) return;
    const { clip, localTime } = info;

    const curVid = activeBuffer === "a" ? videoARef.current : videoBRef.current;
    const nxtVid = activeBuffer === "a" ? videoBRef.current : videoARef.current;
    if (!curVid) return;

    if (lastClipIdRef.current !== clip.id) {
      lastClipIdRef.current = clip.id;
      if (nxtVid) {
        nxtVid.pause();
        nxtVid.src = clip.blobUrl;
        nxtVid.playbackRate = clip.speed;
        nxtVid.volume = clip.muted ? 0 : clip.volume * masterVolRef.current;
        const grade = COLOR_GRADES.find(g => g.id === clip.colorGrade);
        nxtVid.style.filter = grade?.filter ?? "";
        nxtVid.addEventListener("canplay", () => {
          nxtVid.currentTime = localTime;
          setActiveBuffer(prev => prev === "a" ? "b" : "a");
          if (isPlayingRef.current) nxtVid.play().catch(() => {});
        }, { once: true });
        nxtVid.load();
      } else {
        curVid.src = clip.blobUrl;
        curVid.playbackRate = clip.speed;
        curVid.volume = clip.muted ? 0 : clip.volume * masterVolRef.current;
        const grade = COLOR_GRADES.find(g => g.id === clip.colorGrade);
        curVid.style.filter = grade?.filter ?? "";
        curVid.addEventListener("loadedmetadata", () => {
          curVid.currentTime = localTime;
          if (isPlayingRef.current) curVid.play().catch(() => {});
        }, { once: true });
        curVid.load();
      }
    } else {
      const diff = Math.abs(curVid.currentTime - localTime);
      if (diff > 0.3) curVid.currentTime = localTime;
      curVid.playbackRate = clip.speed;
      curVid.volume = clip.muted ? 0 : clip.volume * masterVolRef.current;
      const grade = COLOR_GRADES.find(g => g.id === clip.colorGrade);
      curVid.style.filter = grade?.filter ?? "";
    }
  }, [globalTime, clips, activeBuffer]);

  // ─── Sync audio tracks ────────────────────────────────────────────────────────
  useEffect(() => {
    audioTracks.forEach(at => {
      const el = audioElemsRef.current.get(at.id);
      if (!el) return;
      el.volume = at.volume * masterVolRef.current;
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
  }, [globalTime, isPlaying, audioTracks]);

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

  // ─── AI: Auto-captions ────────────────────────────────────────────────────────
  const autoCaption = async () => {
    if (!selectedClip?.filePath) { toast({ title: "Select a clip with uploaded file first", variant: "destructive" }); return; }
    setIsCaptioning(true);
    try {
      const res = await fetch("/api/video-clip-editor/transcribe", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: selectedClip.filePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const words: CaptionWord[] = data.words || [];
      if (!words.length) { toast({ title: "No speech detected" }); return; }

      const clipStartT = clipStartGlobalTime(clips, clips.findIndex(c => c.id === selectedClip.id));
      const shifted = words.map(w => ({
        ...w,
        start: clipStartT + w.start / selectedClip.speed,
        end:   clipStartT + w.end / selectedClip.speed,
      }));

      // Store word-level caption track for animated word-by-word rendering
      setCaptionTrack({
        words: shifted,
        style: captionStyle,
        fontSize: 32,
        y: 0.85,
        color: "#ffffff",
        highlightColor: "#d4b461",
      });

      // Also create chunk-based text overlays as fallback
      const chunkSize = 4;
      const chunks: CaptionWord[][] = [];
      for (let i = 0; i < words.length; i += chunkSize) chunks.push(words.slice(i, i + chunkSize));
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
      setActiveTool("ai");
      toast({ title: `Captions ready — ${words.length} words synced` });
    } catch (e: any) {
      toast({ title: "Caption failed", description: e.message, variant: "destructive" });
    } finally { setIsCaptioning(false); }
  };

  // ─── AI: Translate captions (dubbing) ─────────────────────────────────────────
  const translateCaptions = async (targetLanguage: string) => {
    if (!captionTrack?.words.length) { toast({ title: "Generate captions first", variant: "destructive" }); return; }
    setIsTranslating(true);
    setSelectedDubLang(targetLanguage);
    try {
      const fullText = captionTrack.words.map(w => w.word).join(" ");
      const langLabel = DUB_LANGUAGES.find(l => l.code === targetLanguage)?.label || targetLanguage;
      const res = await fetch("/api/video-clip-editor/translate-captions", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, targetLanguage: langLabel }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      // Map translated words back onto same timestamps
      const translatedWords = data.translatedText.split(/\s+/).filter(Boolean);
      const sourceCount = captionTrack.words.length;
      const dubbed: CaptionWord[] = translatedWords.map((tw: string, i: number) => {
        const srcIdx = Math.min(i, sourceCount - 1);
        return { ...captionTrack.words[srcIdx], word: tw };
      });
      setDubbedTracks(prev => ({ ...prev, [targetLanguage]: dubbed }));
      toast({ title: `Dubbed to ${langLabel} — ${dubbed.length} words` });
    } catch (e: any) {
      setSelectedDubLang(null);
      toast({ title: "Translation failed", description: e.message, variant: "destructive" });
    } finally { setIsTranslating(false); }
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

  // ─── AI B-roll Generator ──────────────────────────────────────────────────────
  const generateAiBroll = async () => {
    if (!selectedClip?.filePath) { toast({ title: "Select a clip with uploaded file first", variant: "destructive" }); return; }
    if (!captionTrack?.words.length) { toast({ title: "Generate captions first", variant: "destructive" }); return; }
    setIsGeneratingBroll(true);
    try {
      const keywords = [...new Set(captionTrack.words
        .filter(w => w.word.length > 3 && !["this","that","with","from","have","been","were","they","what","when","where","which","their","there","about","would","could","should","after","before","other","every","still","also","just","more","some","them","then","only","very","your","into","than"].includes(w.word.toLowerCase()))
        .map(w => w.word.replace(/[^\w]/g, ''))
        .filter(w => w.length > 3)
      )].slice(0, 8);
      if (!keywords.length) { toast({ title: "No strong keywords found in captions" }); return; }
      toast({ title: `Generating b-roll images for: ${keywords.slice(0, 3).join(", ")}…` });
      const keyword = keywords[Math.floor(Math.random() * keywords.length)];
      const res = await fetch("/api/video-clip-editor/generate-image", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `Cinematic b-roll shot of ${keyword}, professional video composition, 16:9` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Generation failed");
      if (data.brollPath) {
        pushHistory();
        const dur = 3;
        const gTime = globalTime;
        const newClip: BrollClip = {
          id: uid(), file: null as any, blobUrl: data.url || `/uploads/${data.brollPath}`,
          filePath: data.brollPath, duration: dur,
          startGlobal: gTime, endGlobal: gTime + dur,
          x: 0, y: 0, width: 0.5, thumbnails: [],
        };
        setBrollClips(prev => [...prev, newClip]);
        toast({ title: `B-roll added for "${keyword}"` });
      }
    } catch (e: any) {
      toast({ title: "B-roll generation failed", description: e.message, variant: "destructive" });
    } finally { setIsGeneratingBroll(false); }
  };

  // ─── Export ───────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const unuploaded = clips.filter(c => !c.filePath);
    if (unuploaded.length) { toast({ title: "Still uploading…", variant: "destructive" }); return; }
    setIsExporting(true); setExportUrl(null); setExportProgress("Sending to server…");
    try {
      const payload = {
        aspectRatio, masterVolume,
        clips: clips.map((c, ci) => ({
          filePath: c.filePath, trimStart: c.trimStart, trimEnd: c.trimEnd,
          speed: c.speed, colorGrade: c.colorGrade, volume: c.volume, muted: c.muted,
          noiseReduce: c.noiseReduce, kenBurns: c.kenBurns, transition: c.transition,
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
      vid?.play().catch(() => {});
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

        {/* ── Minimal top bar ───────────────────────────────────────────────── */}
        <header className="h-11 flex items-center justify-between px-4 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <a href="/dashboard" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
              <ChevronLeft className="w-3.5 h-3.5" />
            </a>
            <p className="text-sm font-semibold text-white">Clip Editor</p>
            <input ref={fileRef} type="file" accept="video/*" multiple className="hidden"
              onChange={e => handleFiles(Array.from(e.target.files ?? []))} />
            <input ref={audioFileRef} type="file" accept="audio/*,.mp3,.m4a,.wav" multiple className="hidden"
              onChange={e => handleAudioFiles(Array.from(e.target.files ?? []))} />
            <input ref={brollFileRef} type="file" accept="video/*" multiple className="hidden"
              onChange={e => handleBrollFiles(Array.from(e.target.files ?? []))} />
            {isUploading && (
              <span className="flex items-center gap-1 text-xs text-primary/80 ml-1">
                <Loader2 className="w-3 h-3 animate-spin" /> {uploadQueue}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={!canUndo}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed" title="Undo (⌘Z)">
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={redo} disabled={!canRedo}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed" title="Redo (⌘⇧Z)">
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-zinc-700 mx-1" />
            {exportUrl ? (
              <a href={exportUrl} download>
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-black font-bold h-7 text-xs px-3 gap-1">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </a>
            ) : (
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-black font-bold h-7 text-xs px-3 gap-1"
                onClick={handleExport} disabled={isExporting || isUploading}>
                {isExporting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{exportProgress || "Export"}</>
                  : <><Zap className="w-3.5 h-3.5" /> Export</>}
              </Button>
            )}
          </div>
        </header>

        {/* ── Main area ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* ── Preview ──────────────────────────────────────────────────── */}
          <div className="flex-1 flex items-center justify-center bg-black relative min-h-0">
            <div ref={previewRef}
              className="relative bg-black rounded-xl overflow-hidden shadow-2xl"
              style={{ aspectRatio: previewAspect, height: "calc(100% - 60px)", maxWidth: "100%" }}
              onClick={() => { setSelectedClipId(null); setSelectedTextId(null); setSelectedBrollId(null); }}>

              {/* Double-buffered video */}
              <div className="absolute inset-0" style={kbStyle}>
                <video ref={videoARef} className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: activeBuffer === "a" ? 1 : 0, transition: "opacity 0.15s ease" }}
                  playsInline src={clips[0]?.blobUrl} />
                <video ref={videoBRef} className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: activeBuffer === "b" ? 1 : 0, transition: "opacity 0.15s ease" }}
                  playsInline />
              </div>

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

              {/* Teleprompter overlay (auto-scrolls during playback) */}
              {teleprompterVisible && teleprompterScript && (
                <div
                  className="absolute inset-x-0 top-0 bottom-0 overflow-hidden pointer-events-none z-30">
                  <div ref={teleprompterRef}
                    className="px-6 py-8 space-y-4 text-center">
                    {teleprompterScript.split("\n").filter(l => l.trim()).map((line, i) => {
                      return (
                        <p key={i} className="text-white/90 text-lg leading-relaxed font-medium drop-shadow-lg"
                          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Word-by-word animated captions (Captions AI style) */}
              {captionTrack && captionTrack.words.length > 0 && (() => {
                const words = selectedDubLang && dubbedTracks[selectedDubLang] ? dubbedTracks[selectedDubLang] : captionTrack.words;
                const activeIdx = getActiveWordIndex(words, globalTime);
                if (activeIdx < 0) return null;
                const style = captionTrack.style;
                const total = words.length;
                // Show context window around active word
                const ctxStart = Math.max(0, activeIdx - 4);
                const ctxEnd = Math.min(total, activeIdx + 5);
                const visibleWords = words.slice(ctxStart, ctxEnd);
                const localActive = activeIdx - ctxStart;

                const highlightBase: Record<CaptionStyle, string> = {
                  bold:      "text-white",
                  neon:      "text-white",
                  minimal:   "text-white/80",
                  filled:    "text-white",
                  gradient:  "text-white",
                  highlight: "text-white",
                };

                return (
                  <div className="absolute inset-x-0 pointer-events-none flex items-center justify-center"
                    style={{ top: `${captionTrack.y * 100}%`, transform: "translateY(-50%)" }}>
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 px-4 max-w-[90%]"
                      style={{ fontSize: `${captionTrack.fontSize}px` }}>
                      {visibleWords.map((w, i) => {
                        const isActive = i === localActive;
                        const isPast = i < localActive;
                        const isFuture = i > localActive;

                        let wordStyle: React.CSSProperties = {};
                        let wordClasses = "transition-all duration-100";

                        if (style === "bold") {
                          wordClasses += isActive ? " text-[#d4b461] scale-110 font-black" : isPast ? " text-zinc-400" : " text-zinc-200/60";
                          wordStyle = { textShadow: isActive ? "0 0 20px rgba(212,180,97,0.6)" : "0 2px 4px rgba(0,0,0,0.8)" };
                        } else if (style === "neon") {
                          wordClasses += isActive ? " text-cyan-300 scale-125 font-bold" : isPast ? " text-zinc-500" : " text-zinc-600";
                          wordStyle = { textShadow: isActive ? "0 0 12px rgba(34,211,238,0.8), 0 0 30px rgba(34,211,238,0.4)" : "0 2px 4px rgba(0,0,0,0.8)" };
                        } else if (style === "minimal") {
                          wordClasses += isActive ? " text-white font-semibold underline underline-offset-4 decoration-2 decoration-white/60" : " text-zinc-400/60";
                          wordStyle = { textShadow: "0 1px 2px rgba(0,0,0,0.5)" };
                        } else if (style === "filled") {
                          wordClasses += " rounded-md px-1.5 -mx-1.5";
                          wordClasses += isActive ? " bg-[#d4b461] text-black font-bold scale-110" : isPast ? " bg-zinc-700/40 text-zinc-400" : " bg-zinc-800/30 text-zinc-500";
                        } else if (style === "gradient") {
                          wordClasses += isActive ? " bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent font-black scale-110" : isPast ? " text-zinc-500" : " text-zinc-600/50";
                          wordStyle = { textShadow: isActive ? "0 0 30px rgba(251,191,36,0.3)" : "none" };
                        } else if (style === "highlight") {
                          wordClasses += isActive ? " bg-yellow-300/80 text-black font-bold rounded-sm px-1 -mx-1" : isPast ? " text-zinc-400/60" : " text-zinc-500/30";
                        }

                        return (
                          <span key={i} className={wordClasses} style={{
                            ...wordStyle,
                            transition: "all 0.08s cubic-bezier(0.34,1.56,0.64,1)",
                          }}>
                            {w.word.replace(/[^\w\s'-]/g, '')}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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
                      textShadow: "0 2px 8px rgba(0,0,0,0.9)",
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

            {/* ── Floating overlay controls ──────────────────────────────── */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-zinc-800 shadow-xl z-20">
              <button onClick={togglePlay}
                className="w-7 h-7 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors" title="Space / K">
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-black fill-black" /> : <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />}
              </button>
              <span className="text-[10px] font-mono text-zinc-400 min-w-[60px] text-center">
                {fmtTime(globalTime)} / {fmtTime(totDur)}
              </span>
              <div className="w-px h-5 bg-zinc-700 mx-0.5" />
              {TOOL_DOCK.map(({ id, icon: Icon, label }) => (
                <button key={id}
                  onClick={() => {
                    if (id === "split") { splitAtPlayhead(); return; }
                    if (id === "music") { audioFileRef.current?.click(); return; }
                    if (id === "broll") { brollFileRef.current?.click(); return; }
                    setActiveTool(prev => prev === id ? "none" : id);
                  }}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${activeTool === id ? "text-primary bg-primary/15" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}
                  title={label}>
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
              <div className="w-px h-5 bg-zinc-700 mx-0.5" />
              <div className="flex items-center gap-0.5">
                {(["16:9", "9:16", "1:1"] as AspectRatio[]).map(ar => (
                  <button key={ar} onClick={() => setAspectRatio(ar)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${aspectRatio === ar ? "bg-primary text-black" : "text-zinc-500 hover:text-white"}`}>
                    {ar}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Slide-up tool panel ──────────────────────────────────────── */}
          {activeTool !== "none" && (
            <div className="border-t border-zinc-800 bg-zinc-900 flex-shrink-0 overflow-y-auto"
              style={{ maxHeight: "40vh" }}>
              <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
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
                 : activeTool === "teleprompter" ? "Teleprompter"
                 : activeTool === "broll"     ? "B-Roll / PiP"
                 : activeTool === "dub"      ? "Dubbing"
                 : ""}
              </p>
            </div>

            <div className="flex-1 p-3 space-y-3 overflow-y-auto text-xs">

              {/* ── Split ───── */}
              {activeTool === "split" && (
                <div className="space-y-3">
                  <p className="text-zinc-400">Position playhead then cut. Shortcut: <code className="text-primary">S</code></p>
                  <div className="bg-zinc-800 rounded-xl p-3">Cut at: <span className="font-mono text-primary">{fmtTime(globalTime)}</span></div>
                  <Button onClick={splitAtPlayhead} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold gap-2">
                    <Scissors className="w-4 h-4" /> Split here
                  </Button>
                </div>
              )}

              {/* ── Text ───── */}
              {activeTool === "text" && (
                <div className="space-y-3">
                  <Button onClick={addText} size="sm" className="w-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add text
                  </Button>
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
                  <div className="bg-zinc-800 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between"><span className="text-zinc-500">Original</span><span className="font-mono">{fmtTime(selectedClip.trimEnd - selectedClip.trimStart)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">At {selectedClip.speed}×</span><span className="font-mono text-primary">{fmtTime((selectedClip.trimEnd - selectedClip.trimStart) / selectedClip.speed)}</span></div>
                  </div>
                </div>
              )}

              {/* ── Color ───── */}
              {activeTool === "color" && selectedClip && (
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_GRADES.map(g => (
                    <button key={g.id} onClick={() => { pushHistory(); updateClip(selectedClip.id, { colorGrade: g.id }); }}
                      className={`rounded-xl overflow-hidden border-2 transition-all ${selectedClip.colorGrade === g.id ? "border-primary" : "border-zinc-700 hover:border-zinc-500"}`}>
                      <div className={`h-10 bg-gradient-to-br ${g.preview}`} style={{ filter: g.filter }} />
                      <p className={`py-1 text-center text-[10px] font-bold ${selectedClip.colorGrade === g.id ? "text-primary bg-primary/10" : "text-zinc-400 bg-zinc-800/50"}`}>{g.label}</p>
                    </button>
                  ))}
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
                        <span>Clip volume</span><span>{Math.round(selectedClip.volume * 100)}%</span>
                      </div>
                      <input type="range" min="0" max="2" step="0.01" value={selectedClip.volume}
                        onChange={e => updateClip(selectedClip.id, { volume: +e.target.value })}
                        className="w-full accent-primary" disabled={selectedClip.muted} />
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
                  {selectedClip && (
                    <>
                      {/* Auto Captions */}
                      <button onClick={autoCaption} disabled={isCaptioning || !selectedClip.filePath}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-50">
                        {isCaptioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Subtitles className="w-4 h-4 text-primary" />}
                        <div className="text-left">
                          <p className="font-semibold">Generate Word-by-Word Captions</p>
                          <p className="text-[9px] text-zinc-500">Whisper AI animated captions</p>
                        </div>
                      </button>

                      {/* Caption style selector (when captions exist) */}
                      {captionTrack && (
                        <div className="space-y-1.5 bg-zinc-800/60 rounded-xl p-2.5">
                          <p className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> Caption Style
                          </p>
                          <div className="grid grid-cols-2 gap-1">
                            {(Object.entries(captionStyles) as [CaptionStyle, typeof captionStyles[CaptionStyle]][]).map(([key, cs]) => (
                              <button key={key} onClick={() => { setCaptionStyle(key); setCaptionTrack(prev => prev ? { ...prev, style: key } : prev); }}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold text-left transition-all border ${
                                  captionStyle === key
                                    ? "bg-primary/20 border-primary/50 text-primary"
                                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                }`}>
                                <span className="block leading-tight">{cs.label}</span>
                                <span className="block text-[8px] font-normal text-zinc-500 mt-0.5">{cs.desc}</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="range" min="20" max="56" value={captionTrack.fontSize}
                              onChange={e => setCaptionTrack(prev => prev ? { ...prev, fontSize: +e.target.value } : prev)}
                              className="flex-1 accent-primary h-1" />
                            <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{captionTrack.fontSize}</span>
                          </div>
                        </div>
                      )}

                      {/* AI B-roll Generator */}
                      <button onClick={generateAiBroll} disabled={isGeneratingBroll || !selectedClip.filePath}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-50">
                        {isGeneratingBroll ? <Loader2 className="w-4 h-4 animate-spin" /> : <PictureInPicture2 className="w-4 h-4 text-purple-400" />}
                        <div className="text-left">
                          <p className="font-semibold">AI B-Roll Generator</p>
                          <p className="text-[9px] text-zinc-500">Generate b-roll images from transcript</p>
                        </div>
                      </button>

                      {/* Remove Silence */}
                      <button onClick={removeSilence} disabled={isRemovingSilence || !selectedClip.filePath}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-50">
                        {isRemovingSilence ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic2 className="w-4 h-4 text-green-400" />}
                        <div className="text-left">
                          <p className="font-semibold">Remove Silence</p>
                          <p className="text-[9px] text-zinc-500">Auto-detect and cut silent gaps</p>
                        </div>
                      </button>

                      {/* Detect Scenes */}
                      <button onClick={detectScenes} disabled={isDetectingScenes || !selectedClip.filePath}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-50">
                        {isDetectingScenes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4 text-blue-400" />}
                        <div className="text-left">
                          <p className="font-semibold">Detect Scenes</p>
                          <p className="text-[9px] text-zinc-500">Split at scene changes</p>
                        </div>
                      </button>

                      {/* Noise Reduction toggle */}
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
                  {!selectedClip && <p className="text-zinc-500 text-center py-2">Select a clip in the timeline</p>}

                  {/* Dubbing (when captions exist) — shown even without a selected clip */}
                  {captionTrack && (
                    <div className="space-y-1.5 bg-zinc-800/60 rounded-xl p-2.5">
                      <p className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1.5">
                        <Languages className="w-3 h-3" /> Dubbing
                      </p>
                      <p className="text-[9px] text-zinc-500">Translate captions to another language</p>
                      <div className="grid grid-cols-3 gap-1">
                        {DUB_LANGUAGES.map(lang => {
                          const isActive = selectedDubLang === lang.code;
                          const isDone = !!dubbedTracks[lang.code];
                          return (
                            <button key={lang.code} onClick={() => {
                              if (isDone) { setSelectedDubLang(isActive ? null : lang.code); return; }
                              translateCaptions(lang.code);
                            }} disabled={isTranslating}
                              className={`px-1.5 py-1 rounded-lg text-[10px] font-semibold text-center transition-all border ${
                                isActive
                                  ? "bg-primary/20 border-primary/50 text-primary"
                                  : isDone
                                    ? "bg-green-900/30 border-green-700/50 text-green-400"
                                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                              }`}>
                              {lang.label}
                            </button>
                          );
                        })}
                      </div>
                      {isTranslating && (
                        <div className="flex items-center gap-2 text-primary text-[10px]">
                          <Loader2 className="w-3 h-3 animate-spin" /> Translating…
                        </div>
                      )}
                      {selectedDubLang && (
                        <button onClick={() => { setSelectedDubLang(null); }}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2">
                          Show original
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Teleprompter ───── */}
              {activeTool === "teleprompter" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTeleprompterVisible(v => !v)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${teleprompterVisible ? "bg-primary text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
                      {teleprompterVisible ? "Hide Overlay" : "Show Overlay"}
                    </button>
                  </div>
                  {teleprompterVisible && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>Scroll speed: {teleprompterSpeed.toFixed(1)}x</span>
                      </div>
                      <input type="range" min="0.3" max="3" step="0.1" value={teleprompterSpeed}
                        onChange={e => setTeleprompterSpeed(+e.target.value)}
                        className="w-full accent-primary" />
                    </div>
                  )}
                  <textarea value={teleprompterScript} onChange={e => setTeleprompterScript(e.target.value)}
                    placeholder="Paste or type your script here. Each line is one card that appears during recording."
                    className="w-full h-44 bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-primary/50 font-mono leading-relaxed" />
                  <div className="flex items-center justify-between text-[10px] text-zinc-600">
                    <span>{teleprompterScript.split(/\s+/).filter(Boolean).length} words</span>
                    <span>~{Math.round(teleprompterScript.split(/\s+/).filter(Boolean).length / (teleprompterSpeed * 150) * 60)}s at {teleprompterSpeed}x</span>
                  </div>
                  {teleprompterScript && (
                    <Button onClick={() => setTeleprompterVisible(true)}
                      className="w-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 gap-1.5 text-xs">
                      <Play className="w-3 h-3" /> Preview teleprompter
                    </Button>
                  )}
                  <p className="text-[9px] text-zinc-600 leading-relaxed">
                    The teleprompter scrolls over your video during playback. Write one line per card.
                  </p>
                </div>
              )}

              {/* ── Music ───── */}
              {activeTool === "music" && (
                <div className="space-y-3">
                  <Button onClick={() => audioFileRef.current?.click()} size="sm"
                    className="w-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Import audio
                  </Button>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500"><span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> Master</span><span>{Math.round(masterVolume * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.01" value={masterVolume}
                      onChange={e => setMasterVolume(+e.target.value)} className="w-full accent-primary" />
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
                  {!audioTracks.length && <p className="text-zinc-600 text-center py-4">No music yet. Import an MP3.</p>}
                </div>
              )}

              {/* ── B-Roll ───── */}
              {activeTool === "broll" && (
                <div className="space-y-3">
                  <Button onClick={() => brollFileRef.current?.click()} size="sm"
                    className="w-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Import B-roll clip
                  </Button>
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
                  <div className="bg-zinc-800 rounded-xl overflow-hidden aspect-video">
                    {selectedClip.thumbnails[0] && <img src={selectedClip.thumbnails[0]} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-zinc-500">Duration</span><span className="font-mono">{fmtTime(selectedClip.trimEnd - selectedClip.trimStart)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Speed</span><span>{selectedClip.speed}×</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Filter</span><span className="capitalize">{selectedClip.colorGrade}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Ken Burns</span><span>{selectedClip.kenBurns.enabled ? "On" : "Off"}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Noise reduce</span><span>{selectedClip.noiseReduce ? "On" : "Off"}</span></div>
                  </div>
                  <div className="space-y-1.5">
                    <button onClick={() => duplicateClip(selectedClip.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <button onClick={() => deleteClip(selectedClip.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete clip
                    </button>
                  </div>
                </div>
              )}

              {/* ── Project stats (no tool, no clip) ───── */}
              {activeTool === "none" && !selectedClip && (
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-zinc-500">Clips</span><span>{clips.length}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Total duration</span><span className="font-mono">{fmtTime(totDur)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Aspect ratio</span><span>{aspectRatio}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Text overlays</span><span>{textOverlays.length}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Music tracks</span><span>{audioTracks.length}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">B-roll clips</span><span>{brollClips.length}</span></div>
                  <p className="text-[9px] text-zinc-600 pt-2">
                    Space=play · S=split · Del=delete · ←/→=frame · ⌘Z=undo
                  </p>
                </div>
              )}

              {/* Fallback: tool needs clip */}
              {["speed","color","kenburns"].includes(activeTool) && !selectedClip && (
                <p className="text-zinc-500 text-center py-4">Select a clip in the timeline first</p>
              )}
            </div>
            </div>
          )}
        </div>

        {/* ── Timeline ────────────────────────────────────────────────────────── */}
        <div className="border-t border-zinc-800 bg-zinc-950 flex-shrink-0 overflow-hidden" style={{ height: timelineCollapsed ? "28px" : "140px" }}>
          {/* Toggle handle */}
          <button onClick={() => setTimelineCollapsed(c => !c)}
            className="w-full h-7 flex items-center justify-start gap-2 px-3 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors flex-shrink-0">
            <svg className={`w-3 h-3 transition-transform ${timelineCollapsed ? "" : "rotate-90"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
            Timeline
          </button>

          {!timelineCollapsed && (
            <div className="overflow-x-auto overflow-y-hidden relative" ref={timelineRef}
              onMouseDown={onTimelineMouseDown} style={{ height: "calc(100% - 28px)", cursor: "default" }}>
              <div style={{ width: `${contentWidth}px`, minWidth: "100%", height: "100%", position: "relative" }}>

                {/* Time ruler */}
                <div className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-800" style={{ height: "16px", width: `${contentWidth}px` }}>
                  {totDur > 0 && Array.from({ length: Math.ceil(totDur) + 1 }).map((_, i) => (
                    <div key={i} className="absolute flex flex-col items-center" style={{ left: `${(i / totDur) * contentWidth}px` }}>
                      <span className="text-[7px] text-zinc-600 font-mono">{i}s</span>
                      <div className="w-px h-1.5 bg-zinc-700" />
                    </div>
                  ))}
                </div>

                {/* Text overlay track */}
                <div className="absolute" style={{ top: "16px", left: 0, right: 0, height: "14px", width: `${contentWidth}px` }}>
                  {textOverlays.map(t => (
                    <div key={t.id} data-notimeline
                      className={`absolute top-0.5 h-3 rounded-sm flex items-center px-1 cursor-pointer pointer-events-auto ${selectedTextId === t.id ? "bg-primary/70" : "bg-primary/30 hover:bg-primary/50"}`}
                      style={{ left: totDur > 0 ? `${(t.startTime / totDur) * contentWidth}px` : "0", width: totDur > 0 ? `${((t.endTime - t.startTime) / totDur) * contentWidth}px` : "0", minWidth: "4px" }}
                      onClick={e => { e.stopPropagation(); setSelectedTextId(t.id); setActiveTool("text"); }}>
                      <span className="text-[6px] text-white truncate">{t.text}</span>
                    </div>
                  ))}
                </div>

                {/* Clip filmstrip row */}
                <div className="absolute flex gap-0.5" style={{ top: "30px", left: 0, height: "70px", width: `${contentWidth}px` }}>
                  {clips.map((clip, idx) => {
                    const effDur   = (clip.trimEnd - clip.trimStart) / clip.speed;
                    const widthPx  = totDur > 0 ? (effDur / totDur) * contentWidth : contentWidth / clips.length;
                    const clipLeft = totDur > 0 ? (clipStartGlobalTime(clips, idx) / totDur) * contentWidth : 0;
                    const isSelected = selectedClipId === clip.id;
                    const isDragOver = dragOverIdx === idx;
                    const grade = COLOR_GRADES.find(g => g.id === clip.colorGrade);

                    return (
                      <div key={clip.id}
                        className={`absolute h-full rounded-lg overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0
                          ${isSelected ? "border-primary shadow-[0_0_12px_rgba(212,180,97,0.4)]" : "border-zinc-700 hover:border-zinc-500"}
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
                        <div className="absolute bottom-0.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                          <span className="text-[6px] text-white/80 font-mono">{fmtTime(effDur)}</span>
                          <div className="flex items-center gap-0.5">
                            {clip.speed !== 1 && <span className="text-[6px] text-primary font-bold">{clip.speed}×</span>}
                            {clip.muted && <VolumeX className="w-2 h-2 text-red-400" />}
                            {clip.kenBurns.enabled && <Move className="w-2 h-2 text-blue-400" />}
                            {clip.noiseReduce && <Mic2 className="w-2 h-2 text-green-400" />}
                          </div>
                        </div>
                        <div className="absolute top-0.5 left-1.5 text-[6px] text-white/50 font-bold">{idx + 1}</div>

                        {/* Trim handles */}
                        <div data-notimeline data-trimhandle
                          className="absolute left-0 top-0 bottom-0 w-2 bg-primary/80 cursor-ew-resize z-10 flex items-center justify-center"
                          onMouseDown={e => { e.stopPropagation(); pushHistory(); draggingTrimRef.current = { clipId: clip.id, handle: "start" }; }}>
                          <div className="w-0.5 h-4 bg-black/50 rounded" />
                        </div>
                        <div data-notimeline data-trimhandle
                          className="absolute right-0 top-0 bottom-0 w-2 bg-primary/80 cursor-ew-resize z-10 flex items-center justify-center"
                          onMouseDown={e => { e.stopPropagation(); pushHistory(); draggingTrimRef.current = { clipId: clip.id, handle: "end" }; }}>
                          <div className="w-0.5 h-4 bg-black/50 rounded" />
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
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer w-4 h-10 rounded flex flex-col items-center justify-center transition-colors
                          ${selectedTransIdx === i && activeTool === "transition" ? "bg-primary/80" : trans.type !== "none" ? "bg-blue-500/60 hover:bg-blue-500/80" : "bg-zinc-700/60 hover:bg-zinc-600/80"}`}
                        style={{ left: `${pillLeft}px` }}
                        onClick={e => { e.stopPropagation(); setSelectedTransIdx(i); setActiveTool("transition"); }}>
                        <Film className="w-2.5 h-2.5 text-white/70" />
                        {trans.type !== "none" && <span className="text-[5px] text-white/80 font-bold">{trans.duration}s</span>}
                      </div>
                    );
                  })}

                  {/* Add clip */}
                  <button data-notimeline
                    className="absolute flex-shrink-0 h-full w-8 rounded-lg border-2 border-dashed border-zinc-700 hover:border-primary/40 flex items-center justify-center transition-colors"
                    style={{ left: `${contentWidth + 4}px` }}
                    onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                    <Plus className="w-3.5 h-3.5 text-zinc-600" />
                  </button>
                </div>

                {/* B-roll track */}
                {brollClips.length > 0 && (
                  <div className="absolute" style={{ top: "100px", left: 0, height: "20px", width: `${contentWidth}px` }}>
                    <div className="h-full w-full relative">
                      {brollClips.map(b => {
                        const left  = totDur > 0 ? (b.startGlobal / totDur) * contentWidth : 0;
                        const width = totDur > 0 ? ((b.endGlobal - b.startGlobal) / totDur) * contentWidth : 60;
                        return (
                          <div key={b.id} data-notimeline
                            className={`absolute top-0.5 h-4 rounded overflow-hidden border cursor-pointer ${selectedBrollId === b.id ? "border-primary" : "border-purple-500/40"}`}
                            style={{ left: `${left}px`, width: `${Math.max(width, 20)}px` }}
                            onClick={e => { e.stopPropagation(); setSelectedBrollId(b.id); setActiveTool("broll"); }}>
                            <div className="h-full bg-purple-500/20 flex items-center px-1 gap-1">
                              <PictureInPicture2 className="w-2 h-2 text-purple-400 flex-shrink-0" />
                              <span className="text-[6px] text-purple-300 truncate">{b.file.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Audio track row */}
                {audioTracks.length > 0 && (
                  <div className="absolute" style={{ top: brollClips.length > 0 ? "120px" : "100px", left: 0, height: "20px", width: `${contentWidth}px` }}>
                    {audioTracks.map(at => {
                      const left  = totDur > 0 ? (at.startOffset / totDur) * contentWidth : 0;
                      const width = totDur > 0 ? (at.duration / totDur) * contentWidth : contentWidth;
                      return (
                        <div key={at.id} data-notimeline
                          className={`absolute top-0.5 h-4 rounded overflow-hidden border cursor-grab active:cursor-grabbing ${selectedAudioId === at.id ? "border-green-400" : "border-green-500/30"}`}
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
                            <div className="absolute inset-0 flex items-center px-1.5 pointer-events-none">
                              <Music className="w-2 h-2 text-green-400 flex-shrink-0 mr-0.5" />
                              <span className="text-[6px] text-green-300 truncate">{at.name}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Playhead */}
                <div className="absolute top-0 bottom-0 pointer-events-none z-30"
                  style={{ left: `${playheadPct}%` }}>
                  <div className="w-0.5 h-full bg-white/90 relative">
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-[7px] font-mono text-white whitespace-nowrap">
                      {fmtTime(globalTime)}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
