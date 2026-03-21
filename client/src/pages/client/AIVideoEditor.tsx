import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Clapperboard, Sparkles, Zap, Target, Copy, Check, ChevronDown, ChevronUp,
  Loader2, Link2, FileText, Lightbulb, Scissors, Volume2, Eye, ListChecks,
  Shuffle, Wand2, Music, Layers, Star, Play, RotateCcw, Hash, Video, Camera,
  Download, CheckSquare, Square, Plus, X, TrendingUp, Trophy, AlertCircle,
  ArrowRight, Image, Film, MessageCircle, Send, Radio
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const MODES = [
  { id: "viral",         label: "Viral",         emoji: "🔥", desc: "Fast cuts, max energy",      color: "from-red-500/20 to-orange-500/10 border-red-500/30",      preview: "bg-gradient-to-br from-red-900 to-orange-900" },
  { id: "story",         label: "Story",         emoji: "🎬", desc: "Narrative + emotion",        color: "from-purple-500/20 to-purple-500/5 border-purple-500/30",  preview: "bg-gradient-to-br from-purple-900 to-indigo-900" },
  { id: "sales",         label: "Sales",         emoji: "💰", desc: "Problem → CTA",              color: "from-green-500/20 to-green-500/5 border-green-500/30",     preview: "bg-gradient-to-br from-green-900 to-emerald-900" },
  { id: "funny",         label: "Funny",         emoji: "😂", desc: "Timing + punchlines",        color: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",  preview: "bg-gradient-to-br from-yellow-900 to-amber-900" },
  { id: "cinematic",     label: "Cinematic",     emoji: "🎥", desc: "B-roll + drama",             color: "from-blue-500/20 to-blue-500/5 border-blue-500/30",        preview: "bg-gradient-to-br from-blue-900 to-slate-900" },
  { id: "educational",   label: "Educational",   emoji: "📚", desc: "Numbered points",            color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",        preview: "bg-gradient-to-br from-cyan-900 to-teal-900" },
  { id: "personal_brand",label: "Personal Brand",emoji: "🚀", desc: "Authentic + trust",          color: "from-primary/20 to-primary/5 border-primary/30",           preview: "bg-gradient-to-br from-yellow-900 to-amber-950" },
];
const GOALS = [
  { id: "viral",     label: "Go Viral",       emoji: "⚡", desc: "Shares & saves" },
  { id: "followers", label: "Get Followers",  emoji: "👥", desc: "Build audience" },
  { id: "sales",     label: "Sell Product",   emoji: "💳", desc: "Drive purchases" },
  { id: "brand",     label: "Build Brand",    emoji: "🏆", desc: "Authority & trust" },
];
const PLATFORMS = [
  { id: "instagram", label: "Instagram Reels", short: "IG" },
  { id: "tiktok",    label: "TikTok",          short: "TT" },
  { id: "youtube",   label: "YouTube Shorts",  short: "YT" },
];
const DURATIONS = ["15", "30", "45", "60", "90"];

// Each template has colour-coded structure for the visual storyboard
type SegType = "hook" | "build" | "body" | "payoff" | "cta" | "transition";
const SEG_COLORS: Record<SegType, string> = {
  hook: "bg-red-500", build: "bg-orange-500", body: "bg-blue-500",
  payoff: "bg-green-500", cta: "bg-primary", transition: "bg-zinc-500",
};
const SEG_TEXT: Record<SegType, string> = {
  hook: "text-red-400", build: "text-orange-400", body: "text-blue-400",
  payoff: "text-green-400", cta: "text-primary", transition: "text-zinc-400",
};

interface TemplateSegment { label: string; time: string; note: string; type: SegType; energy: number; }
interface Template {
  id: string; mode: string; emoji: string; name: string; duration: string;
  tagline: string; structure: TemplateSegment[];
  hooks: string[]; vibe: string; exampleCreators: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "hook-reel", mode: "viral", emoji: "🔥", name: "The Hook Reel", duration: "15–30s",
    tagline: "Grab attention, drop the insight, leave them wanting more",
    vibe: "High-energy, snappy, curiosity-driven", exampleCreators: ["Alex Hormozi", "Iman Gadzhi", "Gary Vee"],
    structure: [
      { label: "Pattern Interrupt",  time: "0–3s",   note: "Bold statement or shocking fact — no intros", type: "hook",    energy: 10 },
      { label: "Problem Hook",       time: "3–8s",   note: "What are they missing or doing wrong?",       type: "hook",    energy: 9  },
      { label: "Value Drop",         time: "8–22s",  note: "The insight/solution they didn't know",       type: "body",    energy: 7  },
      { label: "Follow CTA",         time: "22–30s", note: "Give them a reason to follow right now",      type: "cta",     energy: 8  },
    ],
    hooks: ["Nobody tells you this about X...", "I gained 10k followers doing ONE thing...", "Stop doing X — here's why it's killing your growth"],
  },
  {
    id: "story-arc", mode: "story", emoji: "🎬", name: "The Story Arc", duration: "30–60s",
    tagline: "Emotion first, insight second — make them feel before they think",
    vibe: "Personal, relatable, emotionally-driven", exampleCreators: ["Nas Daily", "Jay Shetty", "Prince Ea"],
    structure: [
      { label: "Open with Conflict",   time: "0–5s",   note: "Start mid-story — drop them in the action",   type: "hook",    energy: 9 },
      { label: "Build Tension",        time: "5–20s",  note: "Show the struggle — audience relates here",    type: "build",   energy: 6 },
      { label: "Turning Point",        time: "20–40s", note: "The realization or discovery",                 type: "payoff",  energy: 8 },
      { label: "Resolution + Lesson",  time: "40–55s", note: "What changed and what they can apply",         type: "payoff",  energy: 7 },
      { label: "CTA",                  time: "55–60s", note: "Invite them to share their own story",         type: "cta",     energy: 6 },
    ],
    hooks: ["I almost quit until I realized...", "This one moment changed everything for me...", "Nobody believed me when I said..."],
  },
  {
    id: "sales-convert", mode: "sales", emoji: "💰", name: "The Sales Converter", duration: "45–60s",
    tagline: "Drive decisions — every second moves them closer to yes",
    vibe: "Direct, proof-driven, urgent", exampleCreators: ["Russell Brunson", "Sabri Suby", "Dan Kennedy"],
    structure: [
      { label: "Pain Hook",        time: "0–5s",   note: "Name the exact frustration they feel daily",  type: "hook",   energy: 9  },
      { label: "Agitate Problem",  time: "5–15s",  note: "Make the pain feel more real and urgent",     type: "build",  energy: 8  },
      { label: "Solution",         time: "15–30s", note: "Your product/service as the obvious answer",  type: "body",   energy: 7  },
      { label: "Social Proof",     time: "30–45s", note: "Result, testimonial, or transformation",      type: "payoff", energy: 8  },
      { label: "CTA + Urgency",    time: "45–60s", note: "Clear next step with urgency element",        type: "cta",    energy: 10 },
    ],
    hooks: ["If you're still struggling with X, this is why...", "We helped 100 people fix X in 30 days...", "Stop wasting money on X that doesn't work..."],
  },
  {
    id: "funny-timing", mode: "funny", emoji: "😂", name: "The Comedy Reel", duration: "15–30s",
    tagline: "Timing is the edit — setup, beat, punchline, reaction",
    vibe: "Absurd, relatable, perfectly timed", exampleCreators: ["Khaby Lame", "Zach King", "Dude Perfect"],
    structure: [
      { label: "Relatable Setup",    time: "0–5s",   note: "Situation everyone recognizes immediately",   type: "hook",       energy: 7  },
      { label: "Escalation",         time: "5–12s",  note: "Build the absurdity — audience anticipates", type: "build",      energy: 8  },
      { label: "Pause (Beat)",       time: "12–14s", note: "Hold 1-2s before punchline — this is key",   type: "transition", energy: 3  },
      { label: "Punchline + React",  time: "14–22s", note: "The unexpected twist or callback",            type: "payoff",     energy: 10 },
      { label: "Tag",                time: "22–30s", note: "Quick second punch or caption callback",      type: "cta",        energy: 7  },
    ],
    hooks: ["When you finally do X and it actually works...", "POV: You tried X and then...", "Nobody talks about what happens when..."],
  },
  {
    id: "cinematic-reveal", mode: "cinematic", emoji: "🎥", name: "The Cinematic Reveal", duration: "30–60s",
    tagline: "Visual storytelling — show, don't tell. Make it beautiful",
    vibe: "Atmospheric, moody, cinematic beauty", exampleCreators: ["Peter McKinnon", "Yes Theory", "Ben Brown"],
    structure: [
      { label: "Atmospheric Open",   time: "0–5s",   note: "B-roll establishing shot, no talking yet",     type: "hook",       energy: 5  },
      { label: "Slow Reveal",        time: "5–20s",  note: "Voiceover over visuals — build curiosity",     type: "build",      energy: 6  },
      { label: "Climax Moment",      time: "20–40s", note: "The visual payoff — music sync cut here",      type: "payoff",     energy: 9  },
      { label: "Text Overlay",       time: "40–55s", note: "On-screen text delivers the takeaway",         type: "body",       energy: 6  },
      { label: "Silent CTA",         time: "55–60s", note: "Minimal text — let the visual do the work",    type: "cta",        energy: 4  },
    ],
    hooks: ["The moment everything changed...", "What most people never see...", "This is what X actually looks like..."],
  },
  {
    id: "educational-breakdown", mode: "educational", emoji: "📚", name: "The Tutorial Breakdown", duration: "30–60s",
    tagline: "Teach one thing perfectly — structure beats entertainment",
    vibe: "Clear, authoritative, value-packed", exampleCreators: ["Mark Rober", "Veritasium", "Ali Abdaal"],
    structure: [
      { label: "Promise Hook",      time: "0–4s",   note: "Tell them exactly what they'll learn",         type: "hook",   energy: 8  },
      { label: "Point 1 + Example", time: "4–18s",  note: "First concept with a concrete example",        type: "body",   energy: 6  },
      { label: "Point 2 + Example", time: "18–32s", note: "Second concept — keep it bite-sized",          type: "body",   energy: 6  },
      { label: "Point 3 + Example", time: "32–46s", note: "Third concept — use visuals if possible",      type: "body",   energy: 7  },
      { label: "Recap + Save CTA",  time: "46–60s", note: "Summarize 3 points, tell them to save this",  type: "cta",    energy: 8  },
    ],
    hooks: ["3 things I wish I knew about X...", "Here's how X actually works in 60 seconds...", "The X framework that changed everything..."],
  },
  {
    id: "personal-brand", mode: "personal_brand", emoji: "🚀", name: "The Brand Builder", duration: "30–60s",
    tagline: "Make them know, like, and trust you — in under a minute",
    vibe: "Raw, vulnerable, authentic", exampleCreators: ["Simon Sinek", "Brené Brown", "Tim Ferriss"],
    structure: [
      { label: "Who You Are Hook", time: "0–5s",   note: "Direct camera address — establish identity fast",  type: "hook",   energy: 8  },
      { label: "Personal Story",   time: "5–20s",  note: "Real moment that shows your values",              type: "build",  energy: 7  },
      { label: "Core Belief",      time: "20–35s", note: "Your unique point of view on the topic",          type: "payoff", energy: 8  },
      { label: "Value Give",       time: "35–50s", note: "One actionable thing they can use today",         type: "body",   energy: 7  },
      { label: "Community CTA",    time: "50–60s", note: "Invite them into your world",                     type: "cta",    energy: 6  },
    ],
    hooks: ["I went from X to Y in Z months — here's how...", "Most people think X but I believe...", "The real reason I started doing X..."],
  },
];

const ACTION_COLORS: Record<string, string> = {
  KEEP: "bg-green-500/20 text-green-400 border-green-500/30",
  CUT: "bg-red-500/20 text-red-400 border-red-500/30",
  TRIM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ADD: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  REORDER: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};
const TYPE_COLORS: Record<string, string> = {
  hook: "bg-red-500", body: "bg-blue-500", payoff: "bg-green-500", cta: "bg-primary", transition: "bg-muted-foreground",
};

// ─── Helper: parse "0–5s" → 5 ─────────────────────────────────────────────────
function parseDuration(time: string): number {
  const m = time.match(/(\d+)[–\-](\d+)/);
  if (!m) return 5;
  return parseInt(m[2]) - parseInt(m[1]);
}

// ─── Template Storyboard Visual ───────────────────────────────────────────────
function StoryboardPreview({ structure, mode }: { structure: TemplateSegment[]; mode: string }) {
  const total = structure.reduce((s, seg) => s + parseDuration(seg.time), 0) || 1;
  const modeObj = MODES.find(m => m.id === mode);
  return (
    <div className="space-y-1.5">
      {/* Mini phone frame mockup */}
      <div className={`relative w-full h-24 rounded-xl overflow-hidden ${modeObj?.preview || "bg-gradient-to-br from-zinc-800 to-zinc-900"} flex items-center justify-center`}>
        <div className="absolute inset-0 bg-black/40" />
        <span className="relative text-4xl">{modeObj?.emoji}</span>
        {/* Overlaid structure segments as vertical strip */}
        <div className="absolute bottom-0 left-0 right-0 flex h-2">
          {structure.map((seg, i) => {
            const width = (parseDuration(seg.time) / total) * 100;
            return (
              <div key={i} className={`${SEG_COLORS[seg.type]} opacity-80`} style={{ width: `${width}%` }} title={seg.label} />
            );
          })}
        </div>
      </div>
      {/* Energy waveform */}
      <div className="flex items-end gap-px h-5">
        {structure.map((seg, i) => {
          const width = Math.max(8, (parseDuration(seg.time) / total) * 100);
          const bars = Math.round(width / 6);
          return Array.from({ length: Math.max(1, bars) }).map((_, j) => (
            <div key={`${i}-${j}`} className={`flex-1 rounded-sm ${SEG_COLORS[seg.type]} opacity-60`} style={{ height: `${(seg.energy / 10) * 20}px` }} />
          ));
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {structure.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${SEG_COLORS[seg.type]}`} />
            <span className={`text-[9px] font-medium ${SEG_TEXT[seg.type]}`}>{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }} className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#d4b461" : "#ef4444";
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
        <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - score / 100)}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-foreground leading-none">{score}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">score</span>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${color} border mb-4`}>
      <div className="w-10 h-10 rounded-xl bg-background/40 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function formatScript(script: string) {
  return script.split(/(\[PAUSE\]|\[ZOOM\]|\[CUT\]|\[BROLL\]|\[TEXT\])/).map((part, i) => {
    if (/^\[(PAUSE|ZOOM|CUT|BROLL|TEXT)\]$/.test(part)) {
      const colors: Record<string, string> = { PAUSE: "bg-blue-500/20 text-blue-400", ZOOM: "bg-yellow-500/20 text-yellow-400", CUT: "bg-red-500/20 text-red-400", BROLL: "bg-purple-500/20 text-purple-400", TEXT: "bg-green-500/20 text-green-400" };
      const key = part.slice(1, -1);
      return <span key={i} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mx-1 ${colors[key] || "bg-muted text-muted-foreground"}`}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

function detectPlatform(url: string) {
  if (/youtube\.com|youtu\.be/.test(url)) return "YouTube";
  if (/tiktok\.com/.test(url)) return "TikTok";
  if (/instagram\.com/.test(url)) return "Instagram";
  return "URL";
}

// ─── Loading Messages ──────────────────────────────────────────────────────────
const IDEA_LOADING_MSGS = [
  "Analyzing trends in your niche…",
  "Mapping out viral content patterns…",
  "Crafting your hook and opening sequence…",
  "Writing your word-for-word script…",
  "Building shot list and visual direction…",
  "Structuring your edit timeline…",
  "Generating caption and hashtag strategy…",
  "Optimizing for engagement and shareability…",
  "Finalizing your complete video plan…",
];
const ANALYZE_LOADING_MSGS = [
  "Processing your content…",
  "Detecting pacing issues and dead zones…",
  "Analyzing audience retention patterns…",
  "Studying high-performing content strategies…",
  "Building your timestamped edit plan…",
  "Generating hook and engagement improvements…",
  "Optimizing caption and visual strategy…",
  "Finalizing your content analysis…",
];

const MOOD_COLORS: Record<string, string> = {
  hype: "text-red-400 bg-red-500/15 border-red-500/30",
  energetic: "text-orange-400 bg-orange-500/15 border-orange-500/30",
  calm: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  emotional: "text-purple-400 bg-purple-500/15 border-purple-500/30",
  cinematic: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
  funny: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
};

const CAPTION_STYLES = [
  { id: "netflix",   name: "Netflix",       desc: "Dark box, clean subtitle",     emoji: "🎬", textClass: "text-white text-sm font-medium tracking-wide text-center",          boxClass: "bg-black/80 px-4 py-2 rounded" },
  { id: "tiktok",    name: "TikTok Bold",   desc: "Viral / Hormozi energy",       emoji: "⚡", textClass: "text-white text-2xl font-black uppercase text-center leading-tight", boxClass: "" },
  { id: "highlight", name: "Keywords",      desc: "Gold highlight on key words",  emoji: "✨", textClass: "text-white text-sm font-bold text-center",                          boxClass: "bg-black/70 px-4 py-2 rounded-xl" },
  { id: "minimal",   name: "Minimal",       desc: "Aesthetic & understated",      emoji: "◽", textClass: "text-white/85 text-xs font-light tracking-[0.15em] text-center",    boxClass: "" },
  { id: "popup",     name: "Word by Word",  desc: "Bold pop-up style",            emoji: "🎯", textClass: "text-black text-sm font-black uppercase tracking-wide",             boxClass: "bg-primary px-5 py-2 rounded-full" },
];

const CAPTION_VARIATIONS = [
  { id: "original", label: "Original",     color: "text-muted-foreground" },
  { id: "engaging", label: "Engaging",     color: "text-blue-400" },
  { id: "viral",    label: "Viral",        color: "text-red-400" },
  { id: "punchy",   label: "Short & Punchy", color: "text-primary" },
];

function getYouTubeEmbedId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function renderHighlightCaption(text: string) {
  const POWER_WORDS = new Set(["stop","never","always","secret","hack","viral","truth","free","money","now","today","proven","instantly","shocking","urgent","limited","exclusive","guaranteed","discover","revealed","warning","attention","mistake","fail","success","change","transform","unlock","skyrocket","explode"]);
  return text.split(" ").map((word, i) => {
    const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    const isKey = word === word.toUpperCase() && word.length > 1 || POWER_WORDS.has(clean);
    return <span key={i}>{i > 0 ? " " : ""}<span className={isKey ? "text-primary font-bold" : ""}>{word}</span></span>;
  });
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AIVideoEditor({ useAdmin }: { useAdmin?: boolean }) {
  const { toast } = useToast();
  const Layout = useAdmin ? AdminLayout : ClientLayout;

  // Input state
  const [inputType, setInputType] = useState<"idea" | "script" | "url" | "describe">("idea");
  const [inputValue, setInputValue] = useState("");
  const [concept, setConcept] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [targetDuration, setTargetDuration] = useState("30");
  const [mode, setMode] = useState("viral");
  const [goal, setGoal] = useState("viral");
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState("");

  // Competitor URLs
  const [showCompetitor, setShowCompetitor] = useState(false);
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(["", "", ""]);
  const [competitorInput, setCompetitorInput] = useState("");

  // Template state
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [aiRecommended, setAiRecommended] = useState<{ id: string; rank: number; reason: string; customization: string }[]>([]);
  const [aiAvoid, setAiAvoid] = useState<string[]>([]);

  // Results
  const [result, setResult] = useState<any>(null);
  const [isIdeaResult, setIsIdeaResult] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");
  const [appliedEdits, setAppliedEdits] = useState<Set<number>>(new Set());

  // Runware image generation
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [generatingThumbnails, setGeneratingThumbnails] = useState(false);
  const [shotImages, setShotImages] = useState<Record<number, string>>({});
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);

  // Loading experience
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chat editing
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string; suggestion?: string; suggestionType?: string; actionLabel?: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const [seekTime, setSeekTime] = useState(0);

  const seekYouTube = (seconds: number) => {
    if (!playerRef.current) return;
    setSeekTime(seconds);
    playerRef.current.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [seconds, true] }), "*");
    playerRef.current.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
  };

  // Audio suggestions
  const [audioSuggestions, setAudioSuggestions] = useState<any[]>([]);
  const [audioTip, setAudioTip] = useState("");
  const [generatingAudio, setGeneratingAudio] = useState(false);

  // Caption system
  const [captionSegments, setCaptionSegments] = useState<any[]>([]);
  const [captionVariation, setCaptionVariation] = useState<"original" | "engaging" | "viral" | "punchy">("original");
  const [captionStyle, setCaptionStyle] = useState("netflix");
  const [captionPosition, setCaptionPosition] = useState<"top" | "center" | "bottom">("bottom");
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [previewCapIdx, setPreviewCapIdx] = useState(0);

  // Active competitor URLs (non-empty)
  const activeCompUrls = competitorUrls.filter(u => u.trim().length > 5);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { inputType, mode, goal, audience, style };
      if (inputType === "url") payload.instagramUrl = inputValue;
      else if (inputType === "script") payload.script = inputValue;
      else payload.description = inputValue;
      if (activeCompUrls.length) payload.competitorUrls = activeCompUrls;
      const [data] = await Promise.all([
        apiRequest("POST", "/api/video/analyze", payload),
        new Promise(r => setTimeout(r, 25000)),
      ]);
      return data;
    },
    onSuccess: (data) => { setResult(data); setIsIdeaResult(false); setActiveTab("timeline"); setAppliedEdits(new Set()); setChatHistory([]); setThumbnails([]); setShotImages({}); setCaptionSegments([]); setAudioSuggestions([]); },
    onError: (err: any) => toast({ title: "Analysis failed", description: err.message, variant: "destructive" }),
  });

  const ideaMutation = useMutation({
    mutationFn: async () => {
      const [data] = await Promise.all([
        apiRequest("POST", "/api/video/idea-builder", {
          concept, mode, goal, audience, style, platform, duration: targetDuration,
          competitorUrls: activeCompUrls,
        }),
        new Promise(r => setTimeout(r, 25000)),
      ]);
      return data;
    },
    onSuccess: (data) => { setResult(data); setIsIdeaResult(true); setActiveTab(data.fullScript ? "script" : "timeline"); setAppliedEdits(new Set()); setChatHistory([]); setThumbnails([]); setShotImages({}); setCaptionSegments([]); setAudioSuggestions([]); },
    onError: (err: any) => toast({ title: "Idea Builder failed", description: err.message, variant: "destructive" }),
  });

  const suggestMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/video/suggest-templates", { concept, mode, goal }),
    onSuccess: (data: any) => {
      setAiRecommended(data.recommendations || []);
      setAiAvoid((data.avoidThese || []).map((a: string) => a.split(":")[0].trim()));
      setShowTemplates(true);
      toast({ title: "AI picked your top templates", description: "Highlighted below — click to explore" });
    },
    onError: (err: any) => toast({ title: "Suggestion failed", description: err.message, variant: "destructive" }),
  });

  const isPending = analyzeMutation.isPending || ideaMutation.isPending;

  // Rotating loading messages — declared after isPending
  useEffect(() => {
    if (!isPending) { setLoadingMsgIdx(0); if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); return; }
    setLoadingMsgIdx(0);
    loadingTimerRef.current = setInterval(() => {
      setLoadingMsgIdx(prev => {
        const msgs = inputType === "idea" ? IDEA_LOADING_MSGS : ANALYZE_LOADING_MSGS;
        return prev < msgs.length - 1 ? prev + 1 : prev;
      });
    }, 3200);
    return () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); };
  }, [isPending]);

  // Chat editing
  const [isChatPending, setIsChatPending] = useState(false);
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !result) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatHistory(h => [...h, { role: "user", content: msg }]);
    setIsChatPending(true);
    try {
      const res = await apiRequest("POST", "/api/video/chat-edit", {
        userMessage: msg,
        context: { title: result.title, summary: result.summary, mode, goal, fullScript: result.fullScript, currentHooks: result.hooks },
      });
      setChatHistory(h => [...h, { role: "ai", content: res.reply || "Got it!", suggestion: res.suggestion, suggestionType: res.suggestionType, actionLabel: res.actionLabel }]);
    } catch (err: any) {
      setChatHistory(h => [...h, { role: "ai", content: "Something went wrong — try again." }]);
    } finally {
      setIsChatPending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  // Audio suggestions
  const generateAudioSuggestions = async () => {
    if (!result) return;
    setGeneratingAudio(true);
    try {
      const res = await apiRequest("POST", "/api/video/suggest-audio", { concept: result.title || concept, mode, goal, platform, title: result.title });
      setAudioSuggestions(res.suggestions || []);
      setAudioTip(res.tip || "");
    } catch (err: any) {
      toast({ title: "Audio suggestions failed", description: err.message, variant: "destructive" });
    } finally { setGeneratingAudio(false); }
  };

  // Caption generation
  const generateCaptions = async () => {
    if (!result) return;
    const script = result.fullScript || result.summary || concept;
    if (!script?.trim()) return toast({ title: "No script to caption", description: "Generate an Idea Builder result first", variant: "destructive" });
    setGeneratingCaptions(true);
    try {
      const res = await apiRequest("POST", "/api/video/generate-captions", { script, title: result.title, duration: Number(targetDuration) || 30 });
      setCaptionSegments(res.segments || []);
      setPreviewCapIdx(0);
      toast({ title: `${res.segments?.length || 0} caption segments ready`, description: "Choose a style and variation below" });
    } catch (err: any) {
      toast({ title: "Caption generation failed", description: err.message, variant: "destructive" });
    } finally { setGeneratingCaptions(false); }
  };

  const handleGenerate = () => {
    if (inputType === "idea") {
      if (!concept.trim() || concept.trim().length < 10) return toast({ title: "Describe your video idea", description: "Give the AI at least a sentence to work with", variant: "destructive" });
      ideaMutation.mutate();
    } else {
      if (!inputValue.trim() || inputValue.trim().length < 5) return toast({ title: "Add some content first", description: "Paste a URL, script, or description", variant: "destructive" });
      analyzeMutation.mutate();
    }
  };

  const toggleApplied = (id: number) => {
    setAppliedEdits(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const addCompetitorUrl = () => {
    if (!competitorInput.trim()) return;
    const slot = competitorUrls.findIndex(u => !u.trim());
    if (slot === -1) return toast({ title: "Max 3 competitor URLs", variant: "destructive" });
    const next = [...competitorUrls]; next[slot] = competitorInput.trim();
    setCompetitorUrls(next); setCompetitorInput("");
  };

  const removeCompetitorUrl = (i: number) => {
    const next = [...competitorUrls]; next[i] = ""; setCompetitorUrls(next);
  };

  const exportPlan = () => {
    if (!result) return;
    const lines = [
      `# Video Edit Plan — ${result.title || "Untitled"}`,
      `Score: ${result.overallScore}/100`, `\n${result.summary}`,
      ...(result.competitorInsights ? [`\n## Competitor Style Insights\n${result.competitorInsights}`] : []),
      `\n## Timeline`,
      ...(result.timeline || []).map((s: any) => `- [${s.action}] ${s.startLabel}–${s.endLabel}: ${s.label} — ${s.note}`),
      `\n## Checklist`, ...(result.checklist || []).map((item: string) => `☐ ${item}`),
      `\n## Post Caption\n${result.captions?.postCaption || ""}`,
      `\n## Hashtags\n${(result.captions?.hashtags || []).join(" ")}`,
    ];
    if (result.fullScript) lines.splice(2, 0, `\n## Full Script\n${result.fullScript}`);
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Edit plan copied!", description: "Paste into Notion, Google Docs, or your editor" });
  };

  const selectedMode = MODES.find(m => m.id === mode);

  const generateThumbnails = async () => {
    if (!result) return;
    setGeneratingThumbnails(true);
    try {
      const title = result.title || concept || "viral video";
      const modeLabel = selectedMode?.label || "Viral";
      const prompts = [
        `YouTube thumbnail, cinematic dramatic, "${title}", ${modeLabel} content creator, high energy, dynamic lighting, vivid bold colors, person looking at camera, professional DSLR photo, sharp focus, no text`,
        `YouTube thumbnail, clean minimalist, "${title}", single subject centered, eye contact, bright studio lighting, contrasting background, compelling face expression, no text, professional photography`,
        `YouTube thumbnail, storytelling visual, "${title}", emotional expression, cinematic color grading, warm tones, depth of field, content creator aesthetic, film still quality, no text`,
        `YouTube thumbnail, high contrast graphic, "${title}", dynamic composition, vibrant neon colors, dramatic shadows, social media optimized, editorial photography style, no text`,
      ];
      const res = await apiRequest("POST", "/api/video/generate-images", { prompts, width: 1280, height: 720 });
      setThumbnails(res.images.map((img: any) => img.url));
      toast({ title: "Thumbnails generated!", description: "4 AI thumbnail concepts ready below" });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingThumbnails(false);
    }
  };

  const generateStoryboard = async () => {
    if (!result?.shotList?.length) return;
    setGeneratingStoryboard(true);
    try {
      const shots = result.shotList.slice(0, 6);
      const modeLabel = selectedMode?.label || "viral";
      const prompts = shots.map((s: any) =>
        `Cinematic film still, ${s.description}, ${modeLabel} social media video style, professional cinematography, dramatic natural lighting, high quality camera, no text overlay, realistic`
      );
      const res = await apiRequest("POST", "/api/video/generate-images", { prompts, width: 768, height: 432 });
      const map: Record<number, string> = {};
      res.images.forEach((img: any, idx: number) => { map[idx] = img.url; });
      setShotImages(map);
      toast({ title: "Storyboard ready!", description: `${res.images.length} shot frames visualized` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingStoryboard(false);
    }
  };

  const TABS = [
    ...(isIdeaResult && result?.fullScript   ? [{ id: "script",   label: "Script",    icon: FileText  }] : []),
    ...(isIdeaResult && result?.shotList?.length ? [{ id: "shotlist", label: "Shot List", icon: Camera  }] : []),
    { id: "timeline",  label: `Edit Plan${appliedEdits.size > 0 ? ` (${appliedEdits.size}/${result?.timeline?.length || 0})` : ""}`, icon: Scissors },
    { id: "captions",  label: "Captions",  icon: Hash       },
    { id: "hooks",     label: "Hooks",     icon: Zap        },
    { id: "audio",     label: "Audio",     icon: Radio      },
    { id: "visuals",   label: "Visuals",   icon: Eye        },
    { id: "checklist", label: "Checklist", icon: ListChecks },
    ...(!isIdeaResult ? [{ id: "variations", label: "Variations", icon: Shuffle }] : []),
  ];

  // Render ─────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Clapperboard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">AI Video Editor</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Your intelligent creative partner — build from idea or optimize existing content</p>
            </div>
          </div>
          <Button variant="outline" size="sm" data-testid="btn-templates" onClick={() => setShowTemplates(v => !v)} className="border-primary/30 text-primary hover:bg-primary/10 gap-2">
            <Layers className="w-4 h-4" />
            Template Library
            {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* ── Template Library ─────────────────────────────────────────────────── */}
        {showTemplates && (
          <div className="space-y-3">
            {/* AI Suggest bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">7 proven video structures</p>
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 gap-2 text-xs"
                data-testid="btn-ai-suggest-templates"
                onClick={() => suggestMutation.mutate()} disabled={suggestMutation.isPending}>
                {suggestMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                AI Suggest Best Templates
              </Button>
              {aiRecommended.length > 0 && (
                <button onClick={() => { setAiRecommended([]); setAiAvoid([]); }} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear suggestions
                </button>
              )}
            </div>

            {/* Avoid banner */}
            {aiAvoid.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">AI suggests avoiding: <span className="font-semibold">{TEMPLATES.filter(t => aiAvoid.includes(t.id)).map(t => t.name).join(", ")}</span> for your concept</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TEMPLATES.map(t => {
                const rec = aiRecommended.find(r => r.id === t.id);
                const isAvoid = aiAvoid.includes(t.id);
                return (
                  <div key={t.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${rec ? "border-primary/60 ring-1 ring-primary/30 shadow-lg shadow-primary/10" : isAvoid ? "border-red-500/30 opacity-60" : "border-card-border"}`}>
                    {/* Rec badge */}
                    {rec && (
                      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <p className="text-xs text-primary font-semibold">AI Pick #{rec.rank} — {rec.reason}</p>
                      </div>
                    )}
                    <button className="w-full p-4 text-left hover:bg-muted/10 transition-colors" onClick={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)} data-testid={`template-${t.id}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl leading-none">{t.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-foreground">{t.name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">{t.duration}</Badge>
                            {rec && <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/30 border">Recommended</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.tagline}</p>
                        </div>
                        {expandedTemplate === t.id ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                      </div>
                      {/* Storyboard preview always visible */}
                      <StoryboardPreview structure={t.structure} mode={t.mode} />
                    </button>

                    {expandedTemplate === t.id && (
                      <div className="border-t border-card-border px-4 pb-4 space-y-4">
                        {/* Creator examples */}
                        <div className="flex items-center gap-2 pt-3 flex-wrap">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Style like:</p>
                          {t.exampleCreators.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-2 border-muted-foreground/20 text-muted-foreground">{c}</Badge>
                          ))}
                        </div>

                        {/* Structure breakdown */}
                        <div className="space-y-2">
                          {t.structure.map((s, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full ${SEG_COLORS[s.type]} flex-shrink-0 mt-1.5`} />
                              <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded w-14 text-center flex-shrink-0">{s.time}</span>
                              <div>
                                <p className={`text-xs font-semibold ${SEG_TEXT[s.type]}`}>{s.label}</p>
                                <p className="text-[11px] text-muted-foreground">{s.note}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* AI customization tip if recommended */}
                        {rec?.customization && (
                          <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground">{rec.customization}</p>
                          </div>
                        )}

                        {/* Example hooks */}
                        <div className="bg-muted/10 rounded-xl p-3">
                          <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-2">Example Hooks</p>
                          {t.hooks.map((h, i) => <p key={i} className="text-xs text-foreground italic mt-1 flex items-start gap-1.5"><ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />"{h}"</p>)}
                        </div>

                        <Button size="sm" variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs gap-2"
                          onClick={() => { setMode(t.mode); setInputType("idea"); setConcept(t.hooks[0]); setShowTemplates(false); toast({ title: `${t.name} loaded — customize your concept below` }); }}>
                          <Wand2 className="w-3.5 h-3.5" />Use this template
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Input Zone ──────────────────────────────────────────────────────── */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          {/* Input type tabs */}
          <div className="flex border-b border-card-border overflow-x-auto">
            {([
              { id: "idea",     label: "Idea Builder",  icon: Sparkles,  desc: "AI writes everything" },
              { id: "script",   label: "Paste Script",  icon: FileText,  desc: "Analyze your content" },
              { id: "url",      label: "Video URL",     icon: Link2,     desc: "Instagram or YouTube" },
              { id: "describe", label: "Quick Describe",icon: Lightbulb, desc: "Short description" },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} data-testid={`input-type-${id}`} onClick={() => { setInputType(id); setInputValue(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs font-semibold transition-colors flex-shrink-0 min-w-[100px] ${inputType === id ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/10"}`}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />{label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {/* Idea Builder */}
            {inputType === "idea" && (
              <div className="space-y-3">
                <Textarea data-testid="input-concept" value={concept} onChange={e => setConcept(e.target.value)}
                  placeholder='e.g. "I want to make a 30-second reel about why most people fail at dieting, targeting busy professionals. Make it high energy like Alex Hormozi."'
                  className="bg-background border-border text-sm min-h-[110px] resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Platform</p>
                    <div className="flex gap-1.5">
                      {PLATFORMS.map(p => (
                        <button key={p.id} onClick={() => setPlatform(p.id)} className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold border transition-all ${platform === p.id ? "bg-primary/15 border-primary/40 text-primary" : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40"}`}>
                          {p.short}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Duration</p>
                    <div className="flex gap-1">
                      {DURATIONS.map(d => (
                        <button key={d} onClick={() => setTargetDuration(d)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${targetDuration === d ? "bg-primary/15 border-primary/40 text-primary" : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40"}`}>
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {inputType === "url" && (() => {
              const liveYtId = getYouTubeEmbedId(inputValue);
              const SEEK_POINTS = [
                { sec: 0, label: "0s", thumb: 0 }, { sec: 5, label: "5s", thumb: 1 },
                { sec: 10, label: "10s", thumb: 2 }, { sec: 15, label: "15s", thumb: 3 },
                { sec: 20, label: "20s", thumb: 1 }, { sec: 25, label: "25s", thumb: 2 },
                { sec: 30, label: "30s", thumb: 3 }, { sec: 35, label: "35s", thumb: 1 },
                { sec: 40, label: "40s", thumb: 2 }, { sec: 45, label: "45s", thumb: 3 },
                { sec: 50, label: "50s", thumb: 1 }, { sec: 60, label: "1:00", thumb: 2 },
              ];
              return (
                <div className="space-y-3">
                  <Input data-testid="input-url" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..." className="bg-background border-border text-sm" />
                  <p className="text-[11px] text-muted-foreground">Paste a YouTube or Instagram link — the video loads live below so you can scrub and analyze frame by frame.</p>

                  {liveYtId && (
                    <div className="space-y-2 mt-1">
                      {/* ── Live Embedded Player ─────────────────────────── */}
                      <div className="relative rounded-2xl overflow-hidden border border-primary/30 shadow-[0_0_48px_rgba(212,180,97,0.15)]" style={{ aspectRatio: "16/9" }}>
                        <iframe
                          ref={playerRef}
                          src={`https://www.youtube.com/embed/${liveYtId}?enablejsapi=1&modestbranding=1&rel=0&origin=${window.location.origin}`}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                          title="Video Preview"
                          data-testid="yt-player-iframe"
                        />
                        {/* Corner badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10 pointer-events-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[9px] text-white/80 font-semibold uppercase tracking-wide">Live Preview</span>
                        </div>
                      </div>

                      {/* ── Film Strip Frame Timeline ─────────────────────── */}
                      <div className="bg-black rounded-xl border border-white/10 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/80">
                          <Film className="w-3.5 h-3.5 text-primary" />
                          <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Frame-by-Frame Timeline</p>
                          <span className="ml-auto text-[9px] text-muted-foreground italic">Click any frame to jump there</span>
                        </div>

                        {/* Scrollable frame strip */}
                        <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                          {SEEK_POINTS.map((pt, i) => (
                            <button
                              key={i}
                              onClick={() => seekYouTube(pt.sec)}
                              className="relative flex-shrink-0 group focus:outline-none"
                              style={{ width: "76px" }}
                              data-testid={`btn-seek-${pt.sec}`}
                              title={`Jump to ${pt.label}`}
                            >
                              {/* Film sprocket top */}
                              <div className="h-[7px] bg-black/90 border-b border-white/10 flex items-center justify-evenly px-1">
                                {[0,1,2].map(j => <div key={j} className="w-[10px] h-[5px] bg-white/15 rounded-sm" />)}
                              </div>
                              {/* Frame image */}
                              <div className="relative h-[42px] overflow-hidden border-r border-black/60">
                                <img
                                  src={`https://img.youtube.com/vi/${liveYtId}/${pt.thumb}.jpg`}
                                  className={`w-full h-full object-cover transition-all duration-200 ${seekTime === pt.sec ? "brightness-110 saturate-150" : "brightness-75 group-hover:brightness-100 group-hover:scale-105"}`}
                                  alt={`Frame at ${pt.label}`}
                                  loading="lazy"
                                />
                                {/* Selected indicator */}
                                {seekTime === pt.sec && (
                                  <div className="absolute inset-0 border-2 border-primary/80 pointer-events-none" />
                                )}
                                {/* Hover play icon */}
                                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${seekTime === pt.sec ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                  <div className="w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                                    <Play className="w-2.5 h-2.5 text-black fill-black" />
                                  </div>
                                </div>
                              </div>
                              {/* Film sprocket bottom */}
                              <div className="h-[7px] bg-black/90 border-t border-white/10 flex items-center justify-evenly px-1">
                                {[0,1,2].map(j => <div key={j} className="w-[10px] h-[5px] bg-white/15 rounded-sm" />)}
                              </div>
                              {/* Time label */}
                              <div className={`text-[8px] text-center py-0.5 font-mono transition-colors ${seekTime === pt.sec ? "text-primary font-bold bg-primary/10" : "text-white/40 group-hover:text-white/80 bg-black/80"}`}>
                                {pt.label}
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Seek bar */}
                        <div className="px-3 py-2 bg-black/60 border-t border-white/5 flex items-center gap-3">
                          <span className="text-[9px] text-muted-foreground font-mono flex-shrink-0">0:00</span>
                          <div className="flex-1 relative h-1.5 bg-white/10 rounded-full cursor-pointer" onClick={e => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            const pct = (e.clientX - rect.left) / rect.width;
                            seekYouTube(Math.round(pct * 60));
                          }} data-testid="btn-seekbar">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(seekTime / 60) * 100}%` }} />
                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(212,180,97,0.8)] -translate-x-1/2" style={{ left: `${(seekTime / 60) * 100}%` }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground font-mono flex-shrink-0">1:00</span>
                        </div>
                      </div>

                      {/* ── Quick AI Actions ──────────────────────────────── */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { icon: Scissors, label: "Cut Points", desc: "AI finds best cuts" },
                          { icon: Zap, label: "Hook Analysis", desc: "Rate first 3 sec" },
                          { icon: Volume2, label: "Audio Detect", desc: "Music & voice levels" },
                        ].map((action, i) => (
                          <div key={i} onClick={() => { setActiveTab && null; }}
                            className="p-3 bg-muted/5 border border-muted/20 rounded-xl text-center hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                            <action.icon className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            <p className="text-[10px] font-bold text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{action.desc}</p>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] text-muted-foreground text-center italic">Video loaded · Click "Build My Video" below to get the full AI breakdown</p>
                    </div>
                  )}
                </div>
              );
            })()}
            {inputType === "script" && (
              <Textarea data-testid="input-script" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Paste your video script, voiceover, or raw content..." className="bg-background border-border text-sm min-h-[120px] resize-none" />
            )}
            {inputType === "describe" && (
              <Textarea data-testid="input-describe" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder='Describe your video concept... e.g. "Alex Hormozi style reel about why sales skills matter more than your product"' className="bg-background border-border text-sm min-h-[100px] resize-none" />
            )}

            {/* Audience + Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Target Audience (optional)</p>
                <Input data-testid="input-audience" value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. fitness beginners, entrepreneurs 25–40..." className="bg-background border-border text-xs h-8" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Style Reference (optional)</p>
                <Input data-testid="input-style" value={style} onChange={e => setStyle(e.target.value)} placeholder="e.g. Alex Hormozi, MrBeast, Gary Vee..." className="bg-background border-border text-xs h-8" />
              </div>
            </div>

            {/* ── Competitor / Fan Reel Style Match ──────────────────────── */}
            <div className="border border-dashed border-muted-foreground/20 rounded-2xl overflow-hidden">
              <button onClick={() => setShowCompetitor(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/10 transition-colors" data-testid="btn-competitor-toggle">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">Make It Like a Competitor / Fan Reel</p>
                  <p className="text-[11px] text-muted-foreground">Paste up to 3 reels — AI extracts their style and applies it to your video</p>
                </div>
                {activeCompUrls.length > 0 && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 border text-[10px]">{activeCompUrls.length} URL{activeCompUrls.length > 1 ? "s" : ""}</Badge>}
                {showCompetitor ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </button>

              {showCompetitor && (
                <div className="border-t border-dashed border-muted-foreground/20 px-4 pb-4 pt-3 space-y-3">
                  <p className="text-[11px] text-muted-foreground">Paste Instagram Reels or YouTube Shorts URLs from creators whose style you want to match. AI will analyze their hook pattern, pacing, cuts, and caption style — then apply similar techniques to your original content.</p>

                  {/* Added URLs */}
                  {competitorUrls.map((url, i) => url.trim() ? (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-purple-500/5 border border-purple-500/15 rounded-xl">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-400 flex-shrink-0">{detectPlatform(url)}</Badge>
                      <p className="text-xs text-foreground flex-1 truncate font-mono">{url}</p>
                      <button onClick={() => removeCompetitorUrl(i)} className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : null)}

                  {/* Add URL input */}
                  {activeCompUrls.length < 3 && (
                    <div className="flex gap-2">
                      <Input value={competitorInput} onChange={e => setCompetitorInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addCompetitorUrl()}
                        placeholder={`Paste competitor reel URL ${activeCompUrls.length + 1}/3...`}
                        className="bg-background border-border text-xs h-9 flex-1" data-testid="input-competitor-url" />
                      <Button size="sm" variant="outline" onClick={addCompetitorUrl} className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-9 gap-1.5 text-xs flex-shrink-0">
                        <Plus className="w-3.5 h-3.5" />Add
                      </Button>
                    </div>
                  )}

                  {activeCompUrls.length === 3 && <p className="text-[11px] text-muted-foreground text-center">Maximum 3 competitor URLs</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Mode + Goal ──────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Editing Mode</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MODES.map(m => (
                <button key={m.id} data-testid={`mode-${m.id}`} onClick={() => setMode(m.id)} className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${mode === m.id ? `bg-gradient-to-br ${m.color}` : "border-card-border bg-card hover:bg-muted/10"}`}>
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <div className="min-w-0"><p className="text-xs font-bold text-foreground truncate">{m.label}</p><p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{m.desc}</p></div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Goal</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GOALS.map(g => (
                <button key={g.id} data-testid={`goal-${g.id}`} onClick={() => setGoal(g.id)} className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${goal === g.id ? "bg-primary/10 border-primary/40" : "border-card-border bg-card hover:bg-muted/10"}`}>
                  <span className="text-lg">{g.emoji}</span>
                  <div><p className="text-xs font-bold text-foreground">{g.label}</p><p className="text-[10px] text-muted-foreground">{g.desc}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Generate Button ──────────────────────────────────────────────────── */}
        <Button data-testid="btn-analyze" onClick={handleGenerate} disabled={isPending} className="w-full h-12 text-sm font-black bg-primary text-black hover:bg-primary/90 gap-2">
          {isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" />Processing your video…</>
            : <><Wand2 className="w-4 h-4" />{inputType === "idea" ? "Build My Video — Generate Full Plan" : "Analyze & Generate Edit Plan"}{activeCompUrls.length > 0 ? ` (+ ${activeCompUrls.length} competitor${activeCompUrls.length > 1 ? "s" : ""})` : ""}</>
          }
        </Button>

        {/* ── Loading state ────────────────────────────────────────────────────── */}
        {isPending && (() => {
          const msgs = inputType === "idea" ? IDEA_LOADING_MSGS : ANALYZE_LOADING_MSGS;
          const currentMsg = msgs[loadingMsgIdx];
          const pct = Math.round(((loadingMsgIdx + 1) / msgs.length) * 100);
          return (
            <div className="bg-card border border-card-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{currentMsg}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Step {loadingMsgIdx + 1} of {msgs.length} — crafting your complete video strategy</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Building</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {msgs.slice(0, loadingMsgIdx + 1).map((step, i) => (
                  <div key={i} className={`flex items-center gap-2 text-[11px] ${i === loadingMsgIdx ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === loadingMsgIdx ? "bg-primary animate-pulse" : "bg-green-400"}`} />
                    <span className="truncate">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Results ──────────────────────────────────────────────────────────── */}
        {result && !isPending && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="bg-card border border-card-border rounded-2xl p-5">
              <div className="flex items-start gap-5">
                <ScoreRing score={result.overallScore ?? 0} />
                <div className="flex-1 min-w-0">
                  {result.title && <p className="text-base font-black text-foreground mb-1">"{result.title}"</p>}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold border">{selectedMode?.emoji} {selectedMode?.label} Mode</Badge>
                    {isIdeaResult && <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs border">Idea Builder</Badge>}
                    {activeCompUrls.length > 0 && <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs border">Competitor Style Match</Badge>}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>

                  {/* Thumbnail generator */}
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={generateThumbnails} disabled={generatingThumbnails}
                      className="border-primary/30 text-primary hover:bg-primary/10 text-xs gap-1.5 h-7" data-testid="btn-generate-thumbnails">
                      {generatingThumbnails ? <><Loader2 className="w-3 h-3 animate-spin" />Generating thumbnails…</> : <><Image className="w-3 h-3" />Generate AI Thumbnails</>}
                    </Button>
                  </div>

                  {/* Competitor insights */}
                  {result.competitorInsights && (
                    <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/15 rounded-xl flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Competitor Style Applied</p>
                        <p className="text-xs text-foreground">{result.competitorInsights}</p>
                      </div>
                    </div>
                  )}
                  {result.styleGuide && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                      {Object.entries(result.styleGuide).slice(0, 6).map(([k, v]) => (
                        <div key={k} className="bg-muted/10 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-xs text-foreground font-medium leading-tight">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Generated Thumbnails Grid */}
              {thumbnails.length > 0 && (
                <div className="mt-4 pt-4 border-t border-card-border">
                  <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                    <Image className="w-3.5 h-3.5 text-primary" />AI Thumbnail Concepts
                    <span className="text-muted-foreground font-normal">— hover to download</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {thumbnails.map((url, i) => (
                      <div key={i} data-testid={`thumbnail-${i}`} className="relative group rounded-xl overflow-hidden border border-muted/20 aspect-video bg-muted/10">
                        <img src={url} alt={`Thumbnail concept ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a href={url} target="_blank" rel="noopener noreferrer" download
                            className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm" title="Download">
                            <Download className="w-4 h-4 text-white" />
                          </a>
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <Badge className="bg-black/70 text-white border-0 text-[9px] px-1.5 py-0.5">Concept {i + 1}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="ghost" onClick={generateThumbnails} disabled={generatingThumbnails}
                    className="mt-2 text-muted-foreground text-xs gap-1.5 h-7" data-testid="btn-regenerate-thumbnails">
                    {generatingThumbnails ? <><Loader2 className="w-3 h-3 animate-spin" />Regenerating…</> : <><RotateCcw className="w-3 h-3" />Regenerate</>}
                  </Button>
                </div>
              )}
            </div>

            {/* Result Tabs */}
            <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
              <div className="flex border-b border-card-border overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} data-testid={`tab-result-${id}`} onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${activeTab === id ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/10"}`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>

              <div className="p-5 space-y-4">

                {/* Script */}
                {activeTab === "script" && result.fullScript && (
                  <div className="space-y-4">
                    <SectionHeader icon={FileText} title="Full Video Script" desc="Word-for-word — record exactly this. Inline markers show editing cues." color="from-green-500/20 to-green-500/5 border-green-500/30" />
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {["[PAUSE]","[ZOOM]","[CUT]","[BROLL]"].map((m, i) => {
                        const c = ["bg-blue-500/20 text-blue-400","bg-yellow-500/20 text-yellow-400","bg-red-500/20 text-red-400","bg-purple-500/20 text-purple-400"][i];
                        return <span key={m} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c}`}>{m}</span>;
                      })}
                      <span className="text-[11px] text-muted-foreground ml-1">= editing cues inline</span>
                    </div>
                    <div className="relative">
                      <div className="absolute top-3 right-3 z-10"><CopyButton text={result.fullScript} /></div>
                      <div className="p-5 bg-muted/10 rounded-2xl border border-muted/20 text-sm text-foreground leading-relaxed pr-10">
                        {formatScript(result.fullScript)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Shot List */}
                {activeTab === "shotlist" && result.shotList?.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <SectionHeader icon={Camera} title="Shot List" desc="Exactly what to film — shot by shot, in order" color="from-cyan-500/20 to-cyan-500/5 border-cyan-500/30" />
                      <Button size="sm" variant="outline" onClick={generateStoryboard} disabled={generatingStoryboard}
                        className="flex-shrink-0 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs gap-1.5 h-8 mt-0.5" data-testid="btn-generate-storyboard">
                        {generatingStoryboard ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</> : <><Film className="w-3 h-3" />Visualize Storyboard</>}
                      </Button>
                    </div>
                    {Object.keys(shotImages).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(shotImages).map(([idx, url]) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden border border-muted/20 aspect-video bg-muted/10 group">
                            <img src={url} alt={`Shot ${Number(idx) + 1} frame`} className="w-full h-full object-cover" />
                            <div className="absolute bottom-1.5 left-1.5">
                              <Badge className="bg-black/70 text-white border-0 text-[9px] px-1.5 py-0.5">Shot {Number(idx) + 1}</Badge>
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                                <Download className="w-3.5 h-3.5 text-white" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2">
                      {result.shotList.map((s: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted/10 rounded-xl border border-muted/20">
                          <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-black text-primary">{s.shot || i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize border-muted-foreground/30">{s.type}</Badge>
                              {s.timestamp && <span className="text-[10px] font-mono text-primary">{s.timestamp}</span>}
                              {s.duration && <span className="text-[10px] text-muted-foreground">{s.duration}</span>}
                              {shotImages[i] && <Badge className="bg-cyan-500/15 text-cyan-400 border-0 text-[9px] px-1.5 py-0">Visualized</Badge>}
                            </div>
                            <p className="text-xs text-foreground">{s.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {result.brollList?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-2"><Video className="w-3.5 h-3.5 text-purple-400" />B-Roll to Source</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {result.brollList.map((b: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 bg-purple-500/5 border border-purple-500/15 rounded-lg">
                              <span className="text-purple-400 text-xs mt-0.5 flex-shrink-0">›</span>
                              <p className="text-xs text-foreground">{b}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit Plan */}
                {activeTab === "timeline" && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <SectionHeader icon={Play} title="Edit Timeline" desc="Click checkboxes to mark edits as applied" color="from-blue-500/20 to-blue-500/5 border-blue-500/30" />
                      {appliedEdits.size > 0 && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border text-xs flex-shrink-0 mt-1">{appliedEdits.size}/{result.timeline?.length} done</Badge>}
                    </div>
                    {result.timeline?.length > 0 && (
                      <div className="flex gap-0.5 h-5 rounded-lg overflow-hidden mb-2">
                        {result.timeline.map((seg: any, i: number) => (
                          <div key={i} className={`flex-1 ${appliedEdits.has(seg.id ?? i) ? "opacity-20" : "opacity-80"} ${TYPE_COLORS[seg.type] || "bg-muted"} transition-opacity cursor-default`} title={seg.label} />
                        ))}
                      </div>
                    )}
                    <div className="space-y-2">
                      {(result.timeline || []).map((seg: any, i: number) => {
                        const segId = seg.id ?? i;
                        const done = appliedEdits.has(segId);
                        return (
                          <div key={i} data-testid={`timeline-seg-${i}`} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${done ? "bg-green-500/5 border-green-500/20 opacity-60" : "bg-muted/10 border-muted/20"}`}>
                            <button onClick={() => toggleApplied(segId)} className="flex-shrink-0 mt-0.5">
                              {done ? <CheckSquare className="w-4 h-4 text-green-400" /> : <Square className="w-4 h-4 text-muted-foreground hover:text-foreground" />}
                            </button>
                            <div className="flex-shrink-0 text-center w-20">
                              <p className="text-[10px] font-mono text-primary">{seg.startLabel}–{seg.endLabel}</p>
                              <div className={`w-full mt-1 h-1 rounded-full ${TYPE_COLORS[seg.type] || "bg-muted"} opacity-60`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className={`text-xs font-bold text-foreground ${done ? "line-through opacity-60" : ""}`}>{seg.label}</p>
                                <Badge className={`text-[9px] px-1.5 py-0 border ${ACTION_COLORS[seg.action] || "bg-muted text-muted-foreground border-muted"}`}>{seg.action}</Badge>
                                {seg.energyLevel && <span className="text-[10px] text-muted-foreground">⚡ {seg.energyLevel}/10</span>}
                              </div>
                              <p className="text-xs text-muted-foreground">{seg.note}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {result.cuts?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-2"><Scissors className="w-3.5 h-3.5 text-red-400" />Cut Suggestions</p>
                        <div className="space-y-2">
                          {result.cuts.map((c: any, i: number) => (
                            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${c.severity === "high" ? "bg-red-500/10 border-red-500/20" : c.severity === "medium" ? "bg-yellow-500/10 border-yellow-500/20" : "bg-muted/10 border-muted/20"}`}>
                              <div className="flex-shrink-0 w-16 text-center">
                                <p className="text-[10px] font-mono text-foreground">{c.timestamp}</p>
                                <Badge className={`mt-1 text-[9px] px-1.5 py-0 border-0 ${c.severity === "high" ? "bg-red-500/20 text-red-400" : c.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-muted text-muted-foreground"}`}>{c.severity}</Badge>
                              </div>
                              <div className="flex-1"><p className="text-xs text-foreground font-medium">{c.reason}</p><p className="text-xs text-muted-foreground mt-0.5">→ {c.fix}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Captions */}
                {activeTab === "captions" && (() => {
                  const youtubeId = (inputType === "url" && inputValue) ? getYouTubeEmbedId(inputValue) : null;
                  const activeStyle = CAPTION_STYLES.find(s => s.id === captionStyle) || CAPTION_STYLES[0];
                  const currentSeg = captionSegments[previewCapIdx];
                  const previewText = currentSeg ? (currentSeg[captionVariation] || currentSeg.original || "") : (result.captions?.onScreen?.[0] || result.summary?.slice(0, 60) || "Your caption will appear here");
                  const posClass = captionPosition === "top" ? "items-start pt-8" : captionPosition === "center" ? "items-center" : "items-end pb-8";
                  return (
                  <div className="space-y-6">
                    <SectionHeader icon={Hash} title="Caption Studio" desc="AI-timed captions with 5 visual styles & 4 text variations" color="from-purple-500/20 to-purple-500/5 border-purple-500/30" />

                    {/* ── Video Preview Panel ────────────────────────────────── */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-foreground flex items-center gap-2"><Play className="w-3.5 h-3.5 text-primary" />Video Preview</p>
                      <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ aspectRatio: "16/9" }}>
                        {youtubeId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0&cc_load_policy=0`}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Video preview"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
                            <div className="text-center space-y-2 opacity-30">
                              <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center mx-auto">
                                <Play className="w-7 h-7 text-white fill-white" />
                              </div>
                              <p className="text-white/60 text-xs font-medium">{result.title || "Video Preview"}</p>
                            </div>
                          </div>
                        )}
                        {!youtubeId && (
                          <div className={`absolute inset-0 flex flex-col justify-end ${posClass} px-4 pointer-events-none`}>
                            <div className={`${activeStyle.boxClass} max-w-[90%] mx-auto`}>
                              {activeStyle.id === "highlight"
                                ? <p className={activeStyle.textClass}>{renderHighlightCaption(previewText)}</p>
                                : activeStyle.id === "tiktok"
                                ? <p className={activeStyle.textClass} style={{ textShadow: "0 2px 12px #000, 0 0 4px #000" }}>{previewText}</p>
                                : <p className={activeStyle.textClass}>{previewText}</p>
                              }
                            </div>
                          </div>
                        )}
                        {captionSegments.length > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2">
                            <input
                              type="range" min={0} max={captionSegments.length - 1} value={previewCapIdx}
                              onChange={e => setPreviewCapIdx(Number(e.target.value))}
                              className="w-full h-1 accent-primary cursor-pointer"
                              data-testid="caption-timeline-scrubber"
                            />
                            <div className="flex justify-between mt-1">
                              <span className="text-[9px] text-white/50 font-mono">{currentSeg?.startSec ?? 0}s</span>
                              <span className="text-[9px] text-white/50 font-mono">{currentSeg?.endSec ?? 0}s</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Position + caption text */}
                      {captionSegments.length > 0 && !youtubeId && (
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex-shrink-0">Position:</p>
                          {(["top","center","bottom"] as const).map(pos => (
                            <button key={pos} onClick={() => setCaptionPosition(pos)}
                              className={`text-[10px] px-2.5 py-1 rounded-full border capitalize font-medium transition-all ${captionPosition === pos ? "bg-primary/20 border-primary/50 text-primary" : "border-muted/30 text-muted-foreground hover:border-muted/50"}`}
                              data-testid={`btn-caption-pos-${pos}`}>
                              {pos}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Style Selector ────────────────────────────────────── */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-foreground">Caption Style</p>
                      <div className="grid grid-cols-5 gap-2">
                        {CAPTION_STYLES.map(style => (
                          <button key={style.id} onClick={() => setCaptionStyle(style.id)}
                            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all ${captionStyle === style.id ? "bg-primary/15 border-primary/50 shadow-[0_0_12px_rgba(212,180,97,0.2)]" : "bg-muted/5 border-muted/20 hover:border-muted/40"}`}
                            data-testid={`btn-caption-style-${style.id}`}>
                            <span className="text-lg">{style.emoji}</span>
                            <span className={`text-[10px] font-bold leading-none ${captionStyle === style.id ? "text-primary" : "text-foreground"}`}>{style.name}</span>
                            <span className="text-[9px] text-muted-foreground leading-tight hidden sm:block">{style.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Variation Tabs ────────────────────────────────────── */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-foreground">Text Variation</p>
                      <div className="grid grid-cols-4 gap-2">
                        {CAPTION_VARIATIONS.map(v => (
                          <button key={v.id} onClick={() => setCaptionVariation(v.id as any)}
                            className={`py-2 px-2 rounded-xl text-[10px] font-semibold border transition-all ${captionVariation === v.id ? "bg-primary/15 border-primary/50 text-primary" : "bg-muted/5 border-muted/20 text-muted-foreground hover:border-muted/40"}`}
                            data-testid={`btn-caption-var-${v.id}`}>
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Generate Button ───────────────────────────────────── */}
                    <Button onClick={generateCaptions} disabled={generatingCaptions} className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold h-11 rounded-2xl gap-2" data-testid="btn-generate-captions">
                      {generatingCaptions ? <><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />Generating Caption Segments…</> : <><Hash className="w-4 h-4" />{captionSegments.length > 0 ? "Regenerate Captions" : "Generate AI Captions"}</>}
                    </Button>

                    {/* ── Caption Segments List ─────────────────────────────── */}
                    {captionSegments.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground">{captionSegments.length} Caption Segments</p>
                          <CopyButton text={captionSegments.map(s => `[${s.startSec}s-${s.endSec}s] ${s[captionVariation] || s.original}`).join("\n")} />
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {captionSegments.map((seg: any, i: number) => (
                            <div key={seg.id || i}
                              onClick={() => setPreviewCapIdx(i)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${previewCapIdx === i ? "bg-primary/10 border-primary/40" : "bg-muted/5 border-muted/20 hover:border-muted/40"}`}
                              data-testid={`caption-segment-${i}`}>
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 text-center">
                                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center ${previewCapIdx === i ? "bg-primary/20 border-primary/40" : "border-muted/30"}`}>
                                    <span className="text-[9px] font-black text-primary">{i + 1}</span>
                                  </div>
                                  <p className="text-[8px] text-muted-foreground mt-0.5 font-mono">{seg.startSec}s</p>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold leading-snug ${CAPTION_VARIATIONS.find(v => v.id === captionVariation)?.color || "text-foreground"}`}>
                                    {seg[captionVariation] || seg.original}
                                  </p>
                                  {captionVariation !== "original" && seg.original && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 italic line-clamp-1">{seg.original}</p>
                                  )}
                                </div>
                                <CopyButton text={seg[captionVariation] || seg.original} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Post Captions (from AI result) ───────────────────── */}
                    <div className="pt-2 border-t border-muted/20 space-y-4">
                      <p className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">Post Copy</p>
                      {result.captions?.onScreen?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-foreground mb-2">On-Screen Text Ideas</p>
                          <div className="space-y-1.5">
                            {result.captions.onScreen.map((c: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 p-2.5 bg-muted/10 rounded-lg border border-muted/20">
                                <span className="text-[10px] text-muted-foreground w-4 text-center font-mono">{i + 1}</span>
                                <p className="text-xs text-foreground flex-1 font-medium">{c}</p>
                                <CopyButton text={c} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.captions?.postCaption && (
                        <div>
                          <div className="flex items-center justify-between mb-2"><p className="text-xs font-bold text-foreground">Post Caption</p><CopyButton text={result.captions.postCaption} /></div>
                          <div className="p-4 bg-muted/10 rounded-xl border border-muted/20"><p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.captions.postCaption}</p></div>
                        </div>
                      )}
                      {result.captions?.hashtags?.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2"><p className="text-xs font-bold text-foreground">Hashtags</p><CopyButton text={result.captions.hashtags.join(" ")} /></div>
                          <div className="flex flex-wrap gap-1.5">{result.captions.hashtags.map((h: string, i: number) => <span key={i} className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 font-medium">{h}</span>)}</div>
                        </div>
                      )}
                      {result.ctas?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-foreground mb-2">CTA Options</p>
                          <div className="space-y-2">
                            {result.ctas.map((c: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/15 rounded-xl">
                                <Target className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                <p className="text-xs text-foreground flex-1">{c}</p>
                                <CopyButton text={c} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}

                {/* Hooks */}
                {activeTab === "hooks" && (
                  <div className="space-y-5">
                    <SectionHeader icon={Zap} title="Hook Optimizer" desc="Upgraded opening hooks + audio recommendations" color="from-yellow-500/20 to-yellow-500/5 border-yellow-500/30" />
                    {result.hook && (
                      <>
                        <div className="p-4 bg-muted/10 rounded-xl border border-muted/20">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{isIdeaResult ? "Generated Hook" : "Current Hook"}</p>
                            <Badge variant="outline" className="text-xs border-muted-foreground/30">Score: {result.hook.score}/10</Badge>
                          </div>
                          <p className="text-sm text-foreground italic mb-2">"{result.hook.current}"</p>
                          {result.hook.analysis && <p className="text-xs text-muted-foreground">{result.hook.analysis}</p>}
                        </div>
                        {result.hook.improved?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2"><Star className="w-3.5 h-3.5 text-primary" />Upgraded Hooks</p>
                            <div className="space-y-2">
                              {result.hook.improved.map((h: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl">
                                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-[10px] font-black text-primary">{i + 1}</span></div>
                                  <p className="text-sm text-foreground flex-1 font-medium leading-relaxed">"{h}"</p>
                                  <CopyButton text={h} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {result.audio?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-2"><Music className="w-3.5 h-3.5 text-blue-400" />Audio Recommendations</p>
                        <div className="space-y-2">
                          {result.audio.map((a: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                              <Volume2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-foreground">{a.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{a.mood}{a.bpm ? ` · ${a.bpm} BPM` : ""} · {a.why}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio */}
                {activeTab === "audio" && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <SectionHeader icon={Radio} title="Audio Strategy" desc="Trending sounds and music that will amplify this video's performance" color="from-green-500/20 to-green-500/5 border-green-500/30" />
                      <Button size="sm" variant="outline" onClick={generateAudioSuggestions} disabled={generatingAudio}
                        className="flex-shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs gap-1.5 h-8 mt-0.5" data-testid="btn-suggest-audio">
                        {generatingAudio ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing…</> : <><Sparkles className="w-3 h-3" />{audioSuggestions.length > 0 ? "Refresh" : "Get Audio Picks"}</>}
                      </Button>
                    </div>
                    {audioSuggestions.length === 0 && !generatingAudio && (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                          <Music className="w-6 h-6 text-green-400" />
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">Audio Makes or Breaks Virality</p>
                        <p className="text-xs text-muted-foreground max-w-xs">Get AI-curated audio picks based on your video's mood, goal and platform — chosen to maximize reach.</p>
                      </div>
                    )}
                    {audioTip && (
                      <div className="flex items-start gap-2 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                        <Lightbulb className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground"><span className="font-semibold text-green-400">Pro tip: </span>{audioTip}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {audioSuggestions.map((a: any, i: number) => (
                        <div key={i} data-testid={`audio-suggestion-${i}`} className="bg-muted/10 border border-muted/20 rounded-xl p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-sm font-bold text-foreground">{a.name}</p>
                                <span className="text-xs text-muted-foreground">by {a.artist}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`text-[9px] px-1.5 py-0 border capitalize ${MOOD_COLORS[a.mood] || "text-muted-foreground bg-muted/20 border-muted"}`}>{a.mood}</Badge>
                                <span className="text-[10px] text-muted-foreground">{a.genre}</span>
                                {a.bpm && <span className="text-[10px] text-muted-foreground font-mono">{a.bpm} BPM</span>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${(a.trendScore || 0) > 75 ? "bg-red-400" : (a.trendScore || 0) > 50 ? "bg-yellow-400" : "bg-muted"}`} />
                                <span className="text-[10px] text-muted-foreground">{a.trendScore || 0}% trending</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{a.why}</p>
                          {a.bestFor && (
                            <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />Best for: {a.bestFor}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visuals */}
                {activeTab === "visuals" && (
                  <div className="space-y-4">
                    <SectionHeader icon={Eye} title="Visual Enhancements" desc="Timestamped zoom, B-roll, text overlays and effects" color="from-cyan-500/20 to-cyan-500/5 border-cyan-500/30" />
                    <div className="space-y-2">
                      {(result.visuals || []).map((v: any, i: number) => {
                        const typeColor: Record<string, string> = { zoom: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", broll: "text-purple-400 bg-purple-500/10 border-purple-500/20", "text-overlay": "text-blue-400 bg-blue-500/10 border-blue-500/20", transition: "text-green-400 bg-green-500/10 border-green-500/20", effect: "text-primary bg-primary/10 border-primary/20" };
                        return (
                          <div key={i} className="flex items-start gap-3 p-3 bg-muted/10 rounded-xl border border-muted/20">
                            <div className="flex-shrink-0 text-center w-14">
                              <p className="text-[10px] font-mono text-primary">{v.timestamp}</p>
                              <span className={`mt-1 inline-flex px-1.5 py-0.5 rounded border text-[9px] font-semibold ${typeColor[v.type] || "text-muted-foreground bg-muted border-muted"}`}>{v.type}</span>
                            </div>
                            <p className="text-xs text-foreground flex-1 mt-1">{v.description}</p>
                          </div>
                        );
                      })}
                      {!result.visuals?.length && <p className="text-xs text-muted-foreground text-center py-4">No visual suggestions generated.</p>}
                    </div>
                  </div>
                )}

                {/* Checklist */}
                {activeTab === "checklist" && (
                  <div className="space-y-4">
                    <SectionHeader icon={ListChecks} title="Editing Checklist" desc="Step-by-step guide — tick off as you edit" color="from-green-500/20 to-green-500/5 border-green-500/30" />
                    <div className="space-y-2">
                      {(result.checklist || []).map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted/10 rounded-xl border border-muted/20">
                          <div className="w-5 h-5 rounded border border-muted-foreground/30 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 border-muted-foreground/20 text-muted-foreground text-xs gap-2" onClick={() => navigator.clipboard.writeText((result.checklist || []).join("\n"))}>
                        <Copy className="w-3.5 h-3.5" />Copy Checklist
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 border-primary/30 text-primary hover:bg-primary/10 text-xs gap-2" onClick={exportPlan} data-testid="btn-export">
                        <Download className="w-3.5 h-3.5" />Export Full Plan
                      </Button>
                    </div>
                  </div>
                )}

                {/* Variations */}
                {activeTab === "variations" && (
                  <div className="space-y-4">
                    <SectionHeader icon={Shuffle} title="Content Variations" desc="3 different versions — A/B test your content" color="from-orange-500/20 to-orange-500/5 border-orange-500/30" />
                    <div className="space-y-3">
                      {(result.variations || []).map((v: any, i: number) => (
                        <div key={i} className="bg-card border border-card-border rounded-2xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-xs font-black text-primary">V{i + 1}</span></div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{v.name}</p>
                              {v.targetPlatform && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground mt-0.5">{v.targetPlatform}</Badge>}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{v.description}</p>
                          {v.changes?.map((c: string, j: number) => <div key={j} className="flex items-start gap-2 mt-1"><span className="text-primary text-xs mt-0.5 flex-shrink-0">→</span><p className="text-xs text-foreground">{c}</p></div>)}
                        </div>
                      ))}
                      {!result.variations?.length && <p className="text-xs text-muted-foreground text-center py-4">No variations generated.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── AI Chat Editor ──────────────────────────────────────────────── */}
            <div className="bg-card border border-primary/25 rounded-2xl overflow-hidden shadow-[0_0_32px_rgba(212,180,97,0.08)]">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black ${isChatPending ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground tracking-wide">AI Creative Director</p>
                  <p className="text-[10px] text-muted-foreground">Chat-powered editing — hooks, script, style, captions, structure…</p>
                </div>
                {isChatPending ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full">
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                    <span className="text-[10px] text-primary font-semibold">Thinking…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[10px] text-green-400 font-semibold">Ready</span>
                  </div>
                )}
              </div>

              {/* Chat history */}
              {chatHistory.length > 0 && (
                <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "ai" && (
                        <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.role === "user" ? "bg-primary text-black font-medium rounded-tr-sm" : "bg-muted/20 text-foreground rounded-tl-sm"}`}>
                          {msg.content}
                        </div>
                        {msg.suggestion && (
                          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2 w-full">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                              {msg.suggestionType ? `✦ ${msg.suggestionType.charAt(0).toUpperCase() + msg.suggestionType.slice(1)} Suggestion` : "✦ Suggestion"}
                            </p>
                            <p className="text-xs text-foreground leading-relaxed italic">"{msg.suggestion}"</p>
                            {msg.actionLabel && (
                              <button onClick={() => { navigator.clipboard.writeText(msg.suggestion!); toast({ title: `${msg.actionLabel} — copied!` }); }}
                                className="text-[10px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                                <Copy className="w-3 h-3" />{msg.actionLabel}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatPending && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="bg-muted/20 rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
                        {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Starter prompts */}
              {chatHistory.length === 0 && (
                <div className="p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Quick actions</p>
                  <div className="flex flex-wrap gap-2">
                    {["Make the hook more powerful", "Rewrite the opening line", "Make it more emotional", "Give me a better title", "How do I make this go viral?"].map(prompt => (
                      <button key={prompt} onClick={() => { setChatInput(prompt); }}
                        className="text-[11px] px-2.5 py-1.5 bg-muted/15 hover:bg-primary/10 hover:text-primary border border-muted/20 hover:border-primary/30 rounded-lg transition-colors text-muted-foreground">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2 p-3 border-t border-card-border">
                <input
                  data-testid="input-chat"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  placeholder="e.g. make the hook punchier, rewrite the opening, change the style…"
                  className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                  disabled={isChatPending}
                />
                <Button size="sm" onClick={sendChatMessage} disabled={isChatPending || !chatInput.trim()}
                  className="bg-primary text-black hover:bg-primary/90 h-auto px-3 rounded-xl" data-testid="btn-chat-send">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportPlan} className="flex-1 border-primary/30 text-primary hover:bg-primary/10 text-xs gap-2" data-testid="btn-export">
                <Download className="w-3.5 h-3.5" />Export Edit Plan
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setResult(null); setActiveTab("timeline"); setAppliedEdits(new Set()); setConcept(""); setInputValue(""); setInputType("idea"); setCompetitorUrls(["", "", ""]); setCompetitorInput(""); setShowCompetitor(false); setThumbnails([]); setShotImages({}); setChatHistory([]); setAudioSuggestions([]); setCaptionSegments([]); }} className="flex-1 border-muted-foreground/20 text-muted-foreground text-xs gap-2" data-testid="btn-reset">
                <RotateCcw className="w-3.5 h-3.5" />Start Over
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
