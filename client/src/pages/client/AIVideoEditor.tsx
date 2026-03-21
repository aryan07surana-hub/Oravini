import { useState } from "react";
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
  ArrowRight
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
      return await apiRequest("POST", "/api/video/analyze", payload);
    },
    onSuccess: (data) => { setResult(data); setIsIdeaResult(false); setActiveTab("timeline"); setAppliedEdits(new Set()); },
    onError: (err: any) => toast({ title: "Analysis failed", description: err.message, variant: "destructive" }),
  });

  const ideaMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/video/idea-builder", {
        concept, mode, goal, audience, style, platform, duration: targetDuration,
        competitorUrls: activeCompUrls,
      });
    },
    onSuccess: (data) => { setResult(data); setIsIdeaResult(true); setActiveTab(data.fullScript ? "script" : "timeline"); setAppliedEdits(new Set()); },
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

  const TABS = [
    ...(isIdeaResult && result?.fullScript   ? [{ id: "script",   label: "Script",    icon: FileText  }] : []),
    ...(isIdeaResult && result?.shotList?.length ? [{ id: "shotlist", label: "Shot List", icon: Camera  }] : []),
    { id: "timeline",  label: `Edit Plan${appliedEdits.size > 0 ? ` (${appliedEdits.size}/${result?.timeline?.length || 0})` : ""}`, icon: Scissors },
    { id: "captions",  label: "Captions",  icon: Hash       },
    { id: "hooks",     label: "Hooks",     icon: Zap        },
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
              <p className="text-sm text-muted-foreground mt-0.5">Powered by Google Gemini — create from idea or optimize existing content</p>
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
            {inputType === "url" && (
              <div>
                <Input data-testid="input-url" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="https://www.instagram.com/reel/... or https://youtu.be/..." className="bg-background border-border text-sm" />
                <p className="text-[11px] text-muted-foreground mt-2">YouTube URLs: Gemini watches the actual video. Instagram: extracts engagement data via Apify.</p>
              </div>
            )}
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
            ? <><Loader2 className="w-4 h-4 animate-spin" />{inputType === "idea" ? "Gemini is building your video..." : "Gemini is analyzing your content..."}</>
            : <><Wand2 className="w-4 h-4" />{inputType === "idea" ? "Build My Video — Generate Full Plan" : "Analyze & Generate Edit Plan"}{activeCompUrls.length > 0 ? ` (+ ${activeCompUrls.length} competitor${activeCompUrls.length > 1 ? "s" : ""})` : ""}</>
          }
        </Button>

        {/* ── Loading state ────────────────────────────────────────────────────── */}
        {isPending && (
          <div className="bg-card border border-card-border rounded-2xl p-6 space-y-3">
            {(inputType === "idea"
              ? ["Understanding your video concept...", "Analyzing competitor style patterns...", "Writing your word-for-word script...", "Building timeline, shot list and captions..."]
              : ["Analyzing your content with Google Gemini...", "Identifying cut points and weak spots...", "Scraping competitor style data...", "Building timestamped edit plan..."]
            ).map((step, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><div className="w-2 h-2 rounded-full bg-primary" /></div>
                <p className="text-xs text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        )}

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
                    <SectionHeader icon={Camera} title="Shot List" desc="Exactly what to film — shot by shot, in order" color="from-cyan-500/20 to-cyan-500/5 border-cyan-500/30" />
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
                {activeTab === "captions" && (
                  <div className="space-y-5">
                    <SectionHeader icon={Hash} title="Caption Generator" desc="On-screen text, post caption, hashtags & CTAs" color="from-purple-500/20 to-purple-500/5 border-purple-500/30" />
                    {result.captions?.onScreen?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2">On-Screen Captions</p>
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
                )}

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

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportPlan} className="flex-1 border-primary/30 text-primary hover:bg-primary/10 text-xs gap-2" data-testid="btn-export">
                <Download className="w-3.5 h-3.5" />Export Edit Plan
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setResult(null); setActiveTab("timeline"); setAppliedEdits(new Set()); setConcept(""); setInputValue(""); setInputType("idea"); setCompetitorUrls(["", "", ""]); setCompetitorInput(""); setShowCompetitor(false); }} className="flex-1 border-muted-foreground/20 text-muted-foreground text-xs gap-2" data-testid="btn-reset">
                <RotateCcw className="w-3.5 h-3.5" />Start Over
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
